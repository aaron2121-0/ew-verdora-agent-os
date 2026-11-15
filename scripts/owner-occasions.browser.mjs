/** Offline browser verification: node --import tsx scripts/owner-occasions.browser.mjs
 * Requires Playwright and Chromium. Optional PLAYWRIGHT_MODULE/CHROMIUM_PATH point
 * to existing installations; no install or credentials are needed. All browser
 * requests are intercepted. Fixture dates/names are fictional test data only.
 * Optional OWNER_OCCASIONS_SCREENSHOT writes a screenshot to the supplied path.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import app from '../apps/owner-mobile/index.ts';
const html=await (await app.fetch(new Request('https://owner.test/'))).text();
const js=await (await app.fetch(new Request('https://owner.test/owner.js'))).text();
new Function(js);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()),headless:true,args:['--no-sandbox']});
const fixture={id:'00000000-0000-4000-8000-000000000001',name_zh:'测试场合 <img src=x onerror=alert(1)>',name_en:'Fictional test occasion',category:'event',flower_demand:'high',recurrence:'fixed',date_status:'pattern',confidence:'medium',estimated_date:'2026-12-01',date_start:null,date_end:null,location_or_audience:'Test only',typical_products:['Rose'],order_lead_days:21,past_2024:null,past_2025:null,source_url:'https://example.com/proof',evidence:'Test evidence'};
const verification={id:'00000000-0000-4000-8000-000000000002',occasion_id:fixture.id,status:'pending',proposed_date_start:'2026-12-03',proposed_date_end:'2026-12-04',note:'<script>bad()</script>',proof_url:'https://example.com/proof'};
const pages=[];
try {
for(const role of ['owner','operator']){
 const page=await browser.newPage({viewport:{width:390,height:844}});pages.push(page);const errors=[],calls=[];let verifications=[verification];
 page.on('pageerror',e=>errors.push(e.stack));page.on('dialog',d=>d.accept());
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:{access_token:"fictional-token",user:{id:"test-owner"}}}}),onAuthStateChange(){},signOut:async()=>({})}}}};'});
  if(url.hostname==='owner.test')return route.fulfill({contentType:url.pathname==='/owner.js'?'application/javascript':url.pathname==='/config'?'application/json':'text/html',body:url.pathname==='/owner.js'?js:url.pathname==='/config'?JSON.stringify({url:'https://fictional.supabase.co',key:'fictional-public-key'}):html});
  if(url.hostname==='fictional.supabase.co'){
   const body=request.postDataJSON();calls.push(body);let response={};
   if(body.action==='dashboard')response={role,dashboard:{}};
   if(body.action==='owner_daily_brief')response={pending:true};
   if(body.action==='quote_queue')response={queue:[]};
   if(body.action==='profit_floor_overview')response={profit_floor:{}};
   if(body.action==='occasion_list')response={occasions:[fixture],verifications};
   if(body.action==='occasion_verification_review'){verifications=[];response={verification:{...verification,status:body.decision}};}
   if(body.action==='occasion_upsert')response={occasion:{...fixture,...body.occasion}};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(response)});
  }
  return route.abort();
 });
 await page.goto('https://owner.test/');
 await page.locator('#app').waitFor({state:'visible'});
 if(role==='operator'){
  await page.waitForFunction(()=>document.getElementById('signupToggleCard').classList.contains('hidden')&&document.getElementById('launchProgressCard').classList.contains('hidden'));
  assert.equal(await page.locator('#ownerOccasionsCard').isVisible(),false);
  assert.equal(calls.some(c=>c.action==='occasion_list'),false);
 }else{
  await page.locator('#occasionList article').waitFor();
  assert.equal(await page.locator('#occasionList img').count(),0);
  await page.locator('#occasionSearch').fill('no-match');assert.match(await page.locator('#occasionList').innerText(),/没有符合/);
  await page.locator('#occasionSearch').fill('');
  await page.locator('#occasionVerificationQueue button').filter({hasText:'核准'}).click();assert.equal(calls.some(c=>c.action==='occasion_verification_review'),false);
  await page.locator('#occasionVerificationQueue input[type=checkbox]').check();
  await page.locator('#occasionVerificationQueue button').filter({hasText:'核准'}).click();
  await page.waitForFunction(()=>document.getElementById('occasionPendingCount').textContent==='0');
  await page.locator('#occasionList button').click();
  await page.locator('[name=date_status]').selectOption('confirmed');
  await page.locator('[name=date_start]').fill('2026-12-05');
  await page.locator('#occasionFormHost button[type=submit]').click();assert.equal(calls.some(c=>c.action==='occasion_upsert'),false);
  await page.locator('[name=confirm]').check();
  await page.locator('#occasionFormHost button[type=submit]').click();
  await page.locator('#occasionFormHost form').waitFor({state:'detached'});
  assert.equal(calls.find(c=>c.action==='occasion_upsert').confirm,true);
  if(process.env.OWNER_OCCASIONS_SCREENSHOT)await page.locator('#ownerOccasionsCard').screenshot({path:process.env.OWNER_OCCASIONS_SCREENSHOT});
  const overflowing=await page.locator('#ownerOccasionsCard').evaluate(el=>el.scrollWidth>el.clientWidth+1);assert.equal(overflowing,false);
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({role,passed:true,occasion_calls:calls.filter(c=>c.action.startsWith('occasion_')).length}));
 await page.close();
}
}finally{await browser.close()}
