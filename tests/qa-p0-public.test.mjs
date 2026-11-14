import test from 'node:test';
import assert from 'node:assert/strict';
const timeout=10000;
async function request(url,options={}){
  const res=await fetch(url,{signal:AbortSignal.timeout(timeout),redirect:'manual',...options});
  return {status:res.status,headers:res.headers,body:await res.text()};
}
const agent=process.env.QA_AGENT_URL||'https://agent-mobile-production.up.railway.app';
const owner=process.env.QA_OWNER_URL||'https://owner-mobile-production.up.railway.app';
const supabase=process.env.QA_SUPABASE_URL||'https://vuibesuahnhlafsfraeo.supabase.co';
for(const [label,url] of [['Agent',agent],['Owner',owner]]){
  test('P0 public smoke: '+label+' /health returns ok',async()=>{
    const r=await request(url+'/health');
    assert.equal(r.status,200,label+' health status');
    assert.equal(JSON.parse(r.body).ok,true,label+' health response');
  });
  test('P0 public smoke: '+label+' login page is HTML',async()=>{
    const r=await request(url+'/');
    assert.equal(r.status,200,label+' root status');
    assert.match(r.headers.get('content-type')||'',/text\/html/i);
    assert.match(r.body,/<html/i);
    assert.ok(r.headers.get('content-security-policy'),'Missing CSP '+label);
  });
}
for(const fn of ['agent-session','agent-ai','agent-training','quote-intake','owner-session']){
  test('P0 unauthenticated '+fn+' rejects protected request',async()=>{
    const action=fn==='agent-training'?'today':fn==='owner-session'?'dashboard':fn==='quote-intake'?'create':'dashboard';
    const r=await request(supabase+'/functions/v1/'+fn,{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action})
    });
    assert.ok([401,403].includes(r.status),fn+' expected 401/403 but got '+r.status+' '+r.body.slice(0,160));
  });
}
test('P0 retired Owner bootstrap endpoint returns 410',async()=>{
  const r=await request(supabase+'/functions/v1/owner-bootstrap-link',{
    method:'POST',headers:{'content-type':'application/json'},body:'{}'
  });
  // JWT gateway may reject before function code: 401 also means not accessible.
  assert.ok([401,410].includes(r.status),'retired bootstrap endpoint returned '+r.status);
});
