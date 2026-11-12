import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const ai=read('supabase/functions/agent-ai/index.ts');
const owner=read('supabase/functions/owner-session/index.ts');
const quote=read('supabase/functions/quote-intake/index.ts');

// Feature gates detect implementation in the HEAD under test. A branch merge
// activates tests automatically; absent features never trigger live mutations.
const has=(src,action)=>src.includes('action==="'+action+'"')||src.includes('action === "'+action+'"')||src.includes("action==='"+action+"'")||src.includes("action === '"+action+"'");
for(const action of ['platform_post','weekly_plan','profile_setup','lost_review']){
  test('P0 AI partner contract: '+action+' (activates after merge)',{skip:!has(ai,action)},()=>{
    assert.match(ai,/agent_ai_profile/,'AI actions must read per-Agent profile');
    assert.match(ai,/auth\.getUser/,'AI actions must authenticate');
  });
}
test('P0 quote Gemini vision retains manual review fallback',()=>{
  assert.match(quote,/GEMINI_API_KEY/);
  assert.match(quote,/manual_fallback/);
  assert.match(quote,/action===["']analyze["']/);
});
test('P0 Owner review states needs_info / rejected (activates after owner-v2 merge)',{
  skip:!owner.includes('needs_info')&&!owner.includes('rejected')
},()=>{
  assert.match(owner,/needs_info/);
  assert.match(owner,/rejected/);
  assert.match(owner,/review_quote/);
});
test('P0 future public quote/tracking links enforce 404, expiry, no internal fields',{
  skip:!fs.existsSync('supabase/functions/customer-quote/index.ts')&&!fs.existsSync('supabase/functions/order-tracking/index.ts')
},()=>{
  for(const f of ['supabase/functions/customer-quote/index.ts','supabase/functions/order-tracking/index.ts']){
    if(!fs.existsSync(f))continue;
    const src=read(f);
    assert.match(src,/404/,'Invalid token must appear as 404: '+f);
    assert.match(src,/expir|expires_at/,'Expiry required: '+f);
    assert.doesNotMatch(src,/service_role.*return|return.*commission_rate/,'Internal values must not return: '+f);
  }
});
