import test from 'node:test';
import assert from 'node:assert/strict';
const host=process.env.QA_SUPABASE_URL||'https://vuibesuahnhlafsfraeo.supabase.co';
const tokens={
 agentA:process.env.QA_AGENT_A_TOKEN, agentB:process.env.QA_AGENT_B_TOKEN,
 owner:process.env.QA_OWNER_TOKEN, noRole:process.env.QA_NO_ROLE_TOKEN
};
const ready=Object.values(tokens).every(Boolean)&&process.env.QA_DEMO_FIXTURES_VERIFIED==='true';
async function call(fn,action,token,extra={}){
 const response=await fetch(host+'/functions/v1/'+fn,{
  method:'POST',signal:AbortSignal.timeout(12000),
  headers:{'content-type':'application/json',authorization:'Bearer '+token},
  body:JSON.stringify({action,...extra})
 });
 const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{data={raw:raw.slice(0,200)}}
 return {status:response.status,data};
}
const ownerActions=['dashboard','exceptions','decide_exception','add_opex','update_setting','refresh_profit','quote_queue','review_quote','set_reference_baseline','create_agent_invite','create_owner_recovery_link'];
for(const role of ['agentA','agentB','noRole']){
 for(const action of ownerActions){
  test('P0 RBAC: '+role+' denied Owner action '+action,{skip:!ready},async()=>{
   // A malformed/no-target payload must not bypass the top-level role gate.
   const r=await call('owner-session',action,tokens[role]);
   assert.equal(r.status,403,role+' '+action+' expected role 403, got '+r.status+' '+JSON.stringify(r.data));
  });
 }
}
for(const [name,token] of Object.entries({agentA:tokens.agentA,agentB:tokens.agentB})){
 test('P0 demo isolation: '+name+' can only read own AI profile',{skip:!ready},async()=>{
  const r=await call('agent-ai','my_profile',token);
  assert.equal(r.status,200,name+' own AI profile inaccessible: '+JSON.stringify(r.data));
  const otherId=process.env[name==='agentA'?'QA_AGENT_B_ID':'QA_AGENT_A_ID'];
  assert.ok(!JSON.stringify(r.data).includes(otherId),name+' returned other Agent identifier');
 });
 test('P0 demo isolation: '+name+' receives own dashboard',{skip:!ready},async()=>{
  const r=await call('agent-session','dashboard',token);
  assert.equal(r.status,200,name+' dashboard: '+JSON.stringify(r.data));
  const own=process.env[name==='agentA'?'QA_AGENT_A_ID':'QA_AGENT_B_ID'];
  assert.equal(r.data.agent?.id,own,name+' dashboard identity mismatch');
 });
 test('P0 demo isolation: '+name+' training today is read-only',{skip:!ready},async()=>{
  const r=await call('agent-training','today',token,{start:false});
  assert.equal(r.status,200,name+' training summary failed: '+JSON.stringify(r.data));
  const serialized=JSON.stringify(r.data);
  for(const key of ['correct_index','question_id','option_order']){
    assert.ok(!serialized.includes('"'+key+'"'),name+' training leaked '+key);
  }
 });
}
test('P0 isolated AI read: history scoped to requesting Agent',{skip:!ready},async()=>{
 const [a,b]=await Promise.all([call('agent-ai','chat_history',tokens.agentA),call('agent-ai','chat_history',tokens.agentB)]);
 assert.equal(a.status,200);assert.equal(b.status,200);
 const aIds=(a.data.messages||a.data.history||[]).map(x=>x.id);
 const bIds=(b.data.messages||b.data.history||[]).map(x=>x.id);
 assert.equal(aIds.filter(x=>bIds.includes(x)).length,0,'AI history returned identical message IDs across test Agent accounts');
});
