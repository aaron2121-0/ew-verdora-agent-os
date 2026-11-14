import fs from 'node:fs';
import {strict as assert} from 'node:assert';
const filename='qa-results/fixture-manifest.json';
if(!fs.existsSync(filename)){console.log('QA_CLEANUP: no persisted fixture manifest');process.exit(0);}
const m=JSON.parse(fs.readFileSync(filename,'utf8'));
const names=['SUPABASE_URL','SUPABASE_QA_SECRET_KEY'];
const missing=names.filter(k=>!process.env[k]);
if(missing.length)throw Error('QA_CLEANUP_CONFIG_MISSING: '+missing.join(','));
assert.match(m.run||'',/^QA-P0-[0-9]+-[a-f0-9]{10}$/);
const base=process.env.SUPABASE_URL.replace(/\/$/,'');
const secret=process.env.SUPABASE_QA_SECRET_KEY;
const intended=new Set(m.intendedEmails||[]);
assert.ok([...intended].every(s=>/^qa-(agent-a|agent-b|no-role|owner)-[a-f0-9]{10}@example\.com$/.test(s)),
 'Unexpected email outside exact QA run scope');
const errors=[];
const saved=(k,id)=>{m.deleted[k]||=[];if(!m.deleted[k].includes(id))m.deleted[k].push(id)};
async function req(path,method='GET',data){
 const res=await fetch(base+path,{method,headers:{
  'apikey':secret,'content-type':'application/json'},signal:AbortSignal.timeout(15000),
  ...(data===undefined?{}:{body:JSON.stringify(data)})});
 const body=await res.text();let json=null;try{json=JSON.parse(body)}catch{}
 return {status:res.status,data:json};
}
async function rows(table,column,id,select='*'){
 const r=await req('/rest/v1/'+table+'?select='+select+'&'+column+'=eq.'+encodeURIComponent(id));
 if(r.status!==200)throw Error('READ '+table+' '+r.status);
 return r.data;
}
async function del(table,column,id){
 const r=await req('/rest/v1/'+table+'?'+column+'=eq.'+encodeURIComponent(id),'DELETE');
 if(r.status!==204)throw Error('DELETE '+table+' '+r.status);
}
const agentIds=new Set(m.created.agents||[]);const authIds=new Set(m.created.auth_users||[]);
async function removeChild(table,ids){
 for(const id of ids||[]){
  try{
   const found=await rows(table,'id',id,'id,agent_id');
   if(found.length){
    assert.ok(agentIds.has(found[0].agent_id),'Refusing non-QA child '+table);
    await del(table,'id',id);
   }
   saved(table,id);
  }catch(e){errors.push('FAILED '+table+' '+id+' '+e.message);}
 }
}
async function recoverAuth(){
 for(let page=1;page<=10;page++){
  const r=await req('/auth/v1/admin/users?page='+page+'&per_page=1000');
  if(r.status!==200)throw Error('AUTH_LIST '+r.status);
  const users=r.data?.users||[];
  for(const u of users)if(intended.has(String(u.email||'').toLowerCase())){
   authIds.add(u.id);
   if(!m.created.auth_users.includes(u.id))m.created.auth_users.push(u.id);
  }
  if(users.length<1000)return;
 }
 throw Error('AUTH_ENUMERATION_TRUNCATED');
}
try{await recoverAuth()}catch(e){errors.push(e.message)}
// Confirm every remaining Agent is truly disposable and was created by the QA runner.
for(const id of agentIds){
 try{
  const got=await rows('agents','id',id,'id,is_demo,agent_code,status');
  if(got.length){
   assert.equal(got[0].is_demo,true,'Refusing non-demo Agent');
   assert.match(got[0].agent_code,/^QA[0-9]{1,6}[a-f0-9]{4}[AB]$/,'Refusing non-QA agent_code');
   const r=await req('/rest/v1/agents?id=eq.'+id,'PATCH',{status:'active'});
   if(r.status!==204)throw Error('RESTORE_STATUS '+r.status);
  }
 }catch(e){errors.push('AGENT_VALIDATION '+id+' '+e.message)}
}
for(const table of ['ai_chat_messages','quote_requests','leads'])
 await removeChild(table,m.created[table]);
for(const id of m.created.agent_auth_invites||[]){
 try{
  const got=await rows('agent_auth_invites','id',id,'id,email');
  if(got.length){
   assert.ok(intended.has(String(got[0].email||'').toLowerCase()),'Refusing foreign agent invitation');
   await del('agent_auth_invites','id',id);
  }saved('agent_auth_invites',id);
 }catch(e){errors.push('AGENT_INVITE '+id+' '+e.message)}
}
for(const email of intended){
 try{
  const r=await rows('agent_auth_invites','email',email,'id,email');
  for(const inv of r){
   await del('agent_auth_invites','id',inv.id);
   if(!m.created.agent_auth_invites.includes(inv.id))m.created.agent_auth_invites.push(inv.id);
   saved('agent_auth_invites',inv.id);
  }
 }catch(e){errors.push('INVITE_EMAIL '+e.message)}
}
for(const uid of authIds){
 try{
  const r=await rows('owner_auth_invites','user_id',uid,'id,user_id');
  for(const inv of r){
   await del('owner_auth_invites','id',inv.id);
   if(!m.created.owner_auth_invites.includes(inv.id))m.created.owner_auth_invites.push(inv.id);
   saved('owner_auth_invites',inv.id);
  }
 }catch(e){errors.push('OWNER_INVITE '+uid+' '+e.message)}
}
if(errors.length===0){
 for(const id of agentIds){
  try{
   const found=await rows('agents','id',id,'id,is_demo,agent_code');
   if(found.length){
    assert.equal(found[0].is_demo,true);
    assert.match(found[0].agent_code,/^QA[0-9]{1,6}[a-f0-9]{4}[AB]$/);
    await del('agents','id',id);
   }saved('agents',id);
  }catch(e){errors.push('AGENT_DELETE '+id+' '+e.message)}
 }
}
if(errors.length===0){
 for(const uid of authIds){
  try{
   const r=await req('/auth/v1/admin/users/'+uid);
   if(r.status===200){
    assert.ok(intended.has(String(r.data?.email||r.data?.user?.email||'').toLowerCase()),
      'Refusing real Auth identity deletion');
    const d=await req('/auth/v1/admin/users/'+uid,'DELETE');
    if(![200,204].includes(d.status))throw Error('AUTH_DELETE '+d.status);
   }else if(r.status!==404)throw Error('AUTH_READ '+r.status);
   saved('auth_users',uid);
  }catch(e){errors.push('AUTH_DELETE '+uid+' '+e.message)}
 }
}
for(const [table,ids] of Object.entries(m.created)){
 if(table==='auth_users')continue;
 for(const id of ids){
  try{const r=await rows(table,'id',id,'id');if(r.length)errors.push('RESIDUAL '+table+' '+id)}
  catch(e){errors.push('VERIFY '+table+' '+id+' '+e.message)}
 }
}
for(const id of authIds){
 try{const r=await req('/auth/v1/admin/users/'+id);if(r.status!==404)errors.push('RESIDUAL_AUTH '+id)}
 catch(e){errors.push('VERIFY_AUTH '+id+' '+e.message)}
}
m.cleanup_errors=errors;
m.cleanup_complete=errors.length===0;
fs.writeFileSync(filename,JSON.stringify(m,null,2)+'\n');
console.log('QA_CLEANUP_RESULT '+JSON.stringify({complete:m.cleanup_complete,
 created:Object.fromEntries(Object.entries(m.created).map(([k,v])=>[k,v.length])),
 deleted:Object.fromEntries(Object.entries(m.deleted).map(([k,v])=>[k,v.length])),
 errors:errors.map(e=>e.split(' ')[0])}));
if(errors.length)process.exitCode=1;
