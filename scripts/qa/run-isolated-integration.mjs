import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const required=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_QA_SECRET_KEY'];
const missing=required.filter(k=>!process.env[k]);
if(missing.length)throw new Error('QA_CONFIG_MISSING: '+missing.join(',')+'; no integration test performed');
const url=process.env.SUPABASE_URL.replace(/\/$/,'');
const pub=process.env.SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_QA_SECRET_KEY;
assert.match(url,/^https:\/\/[a-z0-9-]+\.supabase\.co$/);
assert.ok(!url.includes('localhost'));
const runTag=(process.env.GITHUB_RUN_ID||Date.now().toString()).replace(/[^0-9]/g,'').slice(-12);
const runId=randomBytes(5).toString('hex');
const marker='QA-P0-'+runTag+'-'+runId;
const created={auth_users:[],agents:[],agent_auth_invites:[],owner_auth_invites:[],leads:[],lead_events:[]};
const deleted={auth_users:[],agents:[],agent_auth_invites:[],leads:[],lead_events:[]};
const results=[];const errors=[];
const timeout=15000;
function headers(admin=false,token=''){
 return {apikey:admin?secret:pub,authorization:'Bearer '+(admin?secret:token),'content-type':'application/json'};
}
async function http(uri,{admin=false,token='',method='GET',data,prefer}={}){
 const res=await fetch(url+uri,{method,headers:{...headers(admin,token),...(prefer?{prefer}:{})},
  signal:AbortSignal.timeout(timeout),...(data===undefined?{}:{body:JSON.stringify(data)})});
 let result=null;
 const body=await res.text();
 try{result=JSON.parse(body)}catch{}
 return {status:res.status,data:result,bodyLength:body.length};
}
async function expectHttp(uri,opts,success=[200,201]){
 const r=await http(uri,opts);
 assert.ok(success.includes(r.status),'HTTP '+r.status+' at '+uri.split('?')[0]);
 return r.data;
}
const sha=s=>createHash('sha256').update(s).digest('hex');
function test(name,fn){return async()=>{
 try{await fn();results.push({name,status:'PASS'});console.log('PASS '+name);}
 catch(e){results.push({name,status:'FAIL',reason:String(e.message).slice(0,260)});errors.push(name+': '+e.message);console.error('FAIL '+name+': '+String(e.message).slice(0,260));}
}}
const tests=[];
async function makeIdentity(label){
 const email='qa-'+label+'-'+runId+'@example.com';
 const code=randomBytes(32).toString('hex');
 const hash=sha(code);
 const invite=await expectHttp('/rest/v1/agent_auth_invites?select=id',{admin:true,method:'POST',
  prefer:'return=representation',data:{email,code_hash:hash,expires_at:new Date(Date.now()+10*60*1000).toISOString()}},[201]);
 assert.equal(invite.length,1);
 created.agent_auth_invites.push(invite[0].id);
 const r=await expectHttp('/functions/v1/agent-auth',{method:'POST',data:{action:'invite_session',email,code}},[200]);
 assert.ok(r.access_token&&r.user_id,'invite session missing access token or user ID');
 created.auth_users.push(r.user_id);
 const replay=await http('/functions/v1/agent-auth',{method:'POST',data:{action:'invite_session',email,code}});
 assert.equal(replay.status,400,'replayed invite was accepted');
 assert.ok(!replay.data?.access_token,'replayed invite returned token');
 return {label,email,userId:r.user_id,token:r.access_token};
}
async function agent(name){
 const a=await makeIdentity(name);
 const id=randomUUID(),code='QA'+runTag.slice(-6)+runId.slice(0,4)+(name==='agent-a'?'A':'B');
 // Direct service-key insert guarantees is_demo=true atomically.
 await expectHttp('/rest/v1/agents',{admin:true,method:'POST',prefer:'return=minimal',
  data:{id,user_id:a.userId,agent_code:code,display_name:'qa-'+name,
   status:'active',tier:'starter',is_demo:true,preferred_language:'en'}},[201]);
 created.agents.push(id);a.agentId=id;
 const row=await expectHttp('/rest/v1/agents?select=id,is_demo,status&id=eq.'+id,{admin:true});
 assert.equal(row.length,1);assert.equal(row[0].is_demo,true);
 return a;
}
let a,b,n,o;
try{
 a=await agent('agent-a');b=await agent('agent-b');n=await makeIdentity('no-role');
 o=await makeIdentity('owner');
 await expectHttp('/rest/v1/rpc/assign_owner_internal',{admin:true,method:'POST',
   data:{p_user_id:o.userId,p_role:'owner'}},[200,204]);
 const ownerProbe=await http('/functions/v1/owner-session',{token:o.token,method:'POST',data:{action:'dashboard'}});
 assert.equal(ownerProbe.status,200,'Dedicated QA Owner role setup failed');
 const recovery=await expectHttp('/functions/v1/owner-session',{token:o.token,method:'POST',
  data:{action:'create_owner_recovery_link'}},[200]);
 const ownerCode=new URL(recovery.recovery_url).hash.split('owner_invite=')[1];
 assert.match(ownerCode,/^[a-f0-9]{64}$/);
 const pending=await expectHttp('/rest/v1/owner_auth_invites?select=id&user_id=eq.'+o.userId,{admin:true});
 created.owner_auth_invites.push(...pending.map(x=>x.id));
 const ownerFirst=await http('/functions/v1/owner-auth',{method:'POST',data:{action:'invite_session',code:ownerCode}});
 assert.equal(ownerFirst.status,200,'Owner first invite redemption failed');
 assert.ok(ownerFirst.data?.access_token,'Owner first invite lacked token');
 const ownerReplay=await http('/functions/v1/owner-auth',{method:'POST',data:{action:'invite_session',code:ownerCode}});
 assert.equal(ownerReplay.status,400,'Owner invite replay must fail');
 tests.push(test('Owner invite first use succeeds and replay fails',()=>assert.ok(ownerFirst.data?.access_token)));
 tests.push(test('Agent invite first use succeeds and replay fails',()=>assert.ok(a.token&&b.token)));
 const actions=['dashboard','exceptions','decide_exception','add_opex','update_setting','refresh_profit','quote_queue','review_quote','set_reference_baseline','create_agent_invite','create_owner_recovery_link'];
 for(const who of [a,b,n])for(const action of actions)tests.push(test(who.label+' forbidden Owner '+action,async()=>{
  const r=await http('/functions/v1/owner-session',{method:'POST',token:who.token,data:{action}});
  assert.equal(r.status,403,who.label+' '+action+' returned '+r.status);
 }));
 for(const who of [a,b]){
  tests.push(test(who.label+' own dashboard identity',async()=>{
   const r=await http('/functions/v1/agent-session',{method:'POST',token:who.token,data:{action:'dashboard'}});
   assert.equal(r.status,200);assert.equal(r.data?.agent?.id,who.agentId);
  }));
  tests.push(test(who.label+' own AI profile privacy',async()=>{
   const r=await http('/functions/v1/agent-ai',{method:'POST',token:who.token,data:{action:'my_profile'}});
   assert.equal(r.status,200);
   assert.ok(!JSON.stringify(r.data).includes((who===a?b:a).agentId),'cross agent profile id');
  }));
  tests.push(test(who.label+' training does not reveal answer keys',async()=>{
   const r=await http('/functions/v1/agent-training',{method:'POST',token:who.token,data:{action:'today',start:false}});
   assert.equal(r.status,200);
   assert.doesNotMatch(JSON.stringify(r.data),/"(?:correct_index|question_id|option_order)":/);
  }));
 }
 tests.push(test('Demo daily MCQ: one formal attempt, no pre-answer explanation, replay rejected',async()=>{
  const start=await http('/functions/v1/agent-training',{token:b.token,method:'POST',data:{action:'today',start:true}});
  assert.equal(start.status,200,'Demo daily question bank not ready: '+start.status);
  const before=JSON.stringify(start.data);
  assert.doesNotMatch(before,/"(?:correct_index|option_order|question_id|explanation_en|explanation_zh)":/);
  const attemptRows=await expectHttp('/rest/v1/training_daily_attempts?select=id&agent_id=eq.'+b.agentId,{admin:true});
  assert.equal(attemptRows.length,1,'Daily attempt must start exactly once');
  const answer=await http('/functions/v1/agent-training',{token:b.token,method:'POST',
    data:{action:'answer',position:1,selected_index:0}});
  assert.equal(answer.status,200,'First demo training answer');
  assert.doesNotMatch(JSON.stringify(answer.data),/"(?:correct_index|option_order|question_id)":/);
  const duplicate=await http('/functions/v1/agent-training',{token:b.token,method:'POST',
    data:{action:'answer',position:1,selected_index:0}});
  assert.equal(duplicate.status,409,'Duplicate MCQ answer must be rejected');
  const again=await http('/functions/v1/agent-training',{token:b.token,method:'POST',
    data:{action:'today',start:true}});
  assert.equal(again.status,200,'Restart must resume existing attempt');
  const secondRows=await expectHttp('/rest/v1/training_daily_attempts?select=id&agent_id=eq.'+b.agentId,{admin:true});
  assert.equal(secondRows.length,1,'Starting twice created multiple formal attempts');
 }));
 tests.push(test('Demo MCQ expired deadline counts as wrong',async()=>{
  const attempts=await expectHttp('/rest/v1/training_daily_attempts?select=id&agent_id=eq.'+b.agentId,{admin:true});
  assert.equal(attempts.length,1);
  const items=await expectHttp('/rest/v1/training_daily_items?select=id,position,served_at&attempt_id=eq.'+attempts[0].id+'&position=eq.2',{admin:true});
  assert.equal(items.length,1,'Second training item missing');
  assert.ok(items[0].served_at,'Second item not served');
  const patch=await http('/rest/v1/training_daily_items?id=eq.'+items[0].id,
    {admin:true,method:'PATCH',data:{deadline_at:new Date(Date.now()-60000).toISOString()}});
  assert.equal(patch.status,204);
  const answer=await http('/functions/v1/agent-training',{token:b.token,method:'POST',
   data:{action:'answer',position:2,selected_index:0}});
  assert.equal(answer.status,200);
  assert.equal(answer.data?.answer?.timed_out,true,'Timed-out question not marked timed_out');
  assert.equal(answer.data?.answer?.correct,false,'Timed-out question counted correct');
 }));
 const lead=await expectHttp('/rest/v1/leads?select=id',{admin:true,method:'POST',
  prefer:'return=representation',data:{agent_id:b.agentId,source:'referral',
   customer_label:marker+'-fixture',status:'new'}},[201]);
 created.leads.push(lead[0].id);
 for(const table of ['leads','quote_requests','training_daily_answers','training_daily_attempts',
  'training_exam_answers','training_exam_attempts','commissions','ai_chat_messages','agent_ai_profile']){
  tests.push(test('Agent A cannot read Agent B '+table,async()=>{
   const r=await http('/rest/v1/'+table+'?select=*&agent_id=eq.'+b.agentId,{token:a.token});
   // The policy-less RLS tables intentionally have zero direct grants.
   if(['ai_chat_messages','agent_ai_profile'].includes(table)){
     assert.ok([401,403,404].includes(r.status)||(r.status===200&&Array.isArray(r.data)&&r.data.length===0),
      'Protected table '+table+' exposed B records or unexpected status '+r.status);
   }else{
     assert.equal(r.status,200,'RLS query '+table+' returned '+r.status);
     assert.deepEqual(r.data,[],'RLS leaked Agent B '+table);
   }
  }));
 }
 for(const status of ['trainee','restricted','recovery','dormant','suspended']){
  tests.push(test('Locked '+status+' denies new lead, followup and quote',async()=>{
   const q=await http('/rest/v1/agents?id=eq.'+a.agentId,{admin:true,method:'PATCH',
    data:{status}});
   assert.equal(q.status,204,'QA status fixture update '+status);
   for(const [fn,action] of [['agent-session','create_lead'],['agent-session','qualify_lead'],
     ['agent-session','schedule_followup'],['agent-session','complete_followup'],['quote-intake','create']]){
    const r=await http('/functions/v1/'+fn,{token:a.token,method:'POST',
     data:{action,source:'referral',lead_id:lead[0].id,customer_budget:150}});
    assert.equal(r.status,403,status+' '+fn+'/'+action+' returned '+r.status);
   }
  }));
 }
 for(const fn of tests)await fn();
} catch(e){errors.push('setup: '+String(e.message).slice(0,260));console.error('SETUP_FAILURE: '+String(e.message).slice(0,260));}
finally{
 // Must restore status before deleting, even on partial errors.
 if(a?.agentId){
  const r=await http('/rest/v1/agents?id=eq.'+a.agentId,{admin:true,method:'PATCH',data:{status:'active'}});
  if(r.status!==204)errors.push('RESTORE_STATE_FAILURE agent-a status '+r.status);
 }
 for(const [table,key] of [['leads','leads'],['agent_auth_invites','agent_auth_invites'],['owner_auth_invites','owner_auth_invites'],['agents','agents']]){
  for(const id of [...created[key]].reverse()){
   try{const r=await http('/rest/v1/'+table+'?id=eq.'+id,{admin:true,method:'DELETE'});
    if(r.status!==204)throw Error('HTTP '+r.status);
    deleted[key].push(id);
   }catch(e){errors.push('CLEANUP_FAILURE '+table+' '+id+' '+e.message);}
  }
 }
 for(const userId of [...created.auth_users].reverse()){
  try{
   const r=await http('/auth/v1/admin/users/'+userId,{admin:true,method:'DELETE'});
   if(![200,204].includes(r.status))throw Error('HTTP '+r.status);
   deleted.auth_users.push(userId);
  }catch(e){errors.push('CLEANUP_FAILURE auth user '+userId+' '+e.message);}
 }
 for(const [table,key] of [['leads','leads'],['agent_auth_invites','agent_auth_invites'],['agents','agents']]){
  for(const id of created[key])try{
   const r=await http('/rest/v1/'+table+'?select=id&id=eq.'+id,{admin:true});
   if(r.status!==200||r.data?.length!==0)errors.push('RESIDUAL_FIXTURE '+table+' '+id);
  }catch(e){errors.push('VERIFY_CLEANUP '+table+' '+e.message);}
 }
 for(const userId of created.auth_users)try{
  const r=await http('/auth/v1/admin/users/'+userId,{admin:true});
  if(r.status!==404)errors.push('RESIDUAL_AUTH_USER '+userId);
 }catch(e){errors.push('VERIFY_AUTH_CLEANUP '+e.message);}
 const report={run:marker,tests:results,created,deleted,errors,cleanup_complete:
  errors.every(e=>!e.startsWith('CLEANUP_')&&!e.startsWith('RESIDUAL_')&&!e.startsWith('VERIFY_'))};
 const dir='qa-results';fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'fixture-manifest.json'),JSON.stringify(report,null,2)+'\n');
 console.log('QA_FIXTURE_SUMMARY '+JSON.stringify({created:Object.fromEntries(Object.entries(created).map(([k,v])=>[k,v.length])),
  deleted:Object.fromEntries(Object.entries(deleted).map(([k,v])=>[k,v.length])),passed:results.filter(x=>x.status==='PASS').length,
  failed:results.filter(x=>x.status==='FAIL').length,cleanup_complete:report.cleanup_complete}));
}
if(errors.length)process.exitCode=1;
