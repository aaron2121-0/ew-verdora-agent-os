import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getKuchingTodayIso,addDaysIso,getDailyAlertStorageKey} from '../public/occasion-rules.js';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),repo=path.resolve(root,'../..');
const engine=process.env.BROWSER||'chromium',screenshots=path.join(repo,'docs/occasion-calendar');await fs.mkdir(screenshots,{recursive:true});
const today=getKuchingTodayIso(),date=addDaysIso(today,3);
const fixture={id:'22222222-2222-4222-8222-222222222222',date_start:date,date_end:null,estimated_date:null,name_zh:'核实测试 · 毕业典礼',name_en:'Verified test graduation',category:'graduation',location_or_audience:'仅本地测试资料',flower_demand:'high',typical_products:['毕业花束'],order_lead_days:21,recurrence:'variable',date_status:'confirmed',confidence:'high',past_2024:null,past_2025:null,source_url:'https://example.org/official-date',evidence:'本地测试用，未连接线上',verified_by:'owner',verified_at:new Date().toISOString(),created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
let occasions=[fixture,{...fixture,id:'33333333-3333-4333-8333-333333333333',name_zh:'待核实测试 · 社区活动',name_en:'Unconfirmed test',category:'event',date_status:'pattern',verified_by:null,verified_at:null},{...fixture,id:'44444444-4444-4444-8444-444444444444',name_zh:'尚无日期测试',name_en:'Missing date test',date_status:'not_found',date_start:null,verified_by:null,verified_at:null}];
let verifications=[],calls=[],failList=false;
const dashboard={agent:{id:'fixture-agent',display_name:'测试伙伴',agent_code:'LOCAL',status:'active',tier:'starter'},phase1:{can_sell:true,due_followups:[],recent_leads:[],tier_progress:{commission_rate:.1},money:{today_earned:0,pending:0,month_earned:0},training_pending:false},training:[],selling_kits:[],campaigns:[],channel_playbooks:[]};
const sdk='window.supabase={createClient:()=>({auth:{onAuthStateChange(cb){window.__testAuthChange=cb},async getSession(){return {data:{session:{access_token:"offline-fixture",user:{id:"fixture-agent"}}}}},async signOut(){window.__testAuthChange("SIGNED_OUT",null)}},storage:{from:()=>({})}})};';
const csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');const json=(value,status=200)=>{res.writeHead(status,{'content-type':'application/json','content-security-policy':csp});res.end(JSON.stringify(value))};
 if(url.pathname==='/config')return json({url:origin,key:'offline-public-placeholder'});
 if(url.pathname==='/vendor/supabase-2.119.0.js'){res.writeHead(200,{'content-type':'text/javascript'});res.end(sdk);return}
 if(url.pathname.startsWith('/functions/v1/')){
  let text='';for await(const part of req)text+=part;const body=JSON.parse(text||'{}');calls.push(body);
  if(body.action==='dashboard')return json(dashboard);
  if(body.action==='occasion_list')return failList?json({error:'unavailable'},503):json({ok:true,occasions,verifications});
  if(body.action==='occasion_stock_eligibility')return json({allowed:occasions.find(o=>o.id===body.occasion_id)?.date_status==='confirmed'});
  if(body.action==='occasion_verification_submit'){verifications.push({...body.submission,id:'local-verification',status:'pending'});return json({verification:verifications.at(-1)})}
  if(body.action==='handbook')return json({ok:true,entries:[]});
  if(body.action==='chat_history')return json({messages:[]});
  return json({ok:true});
 }
 let name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));if(name.split('/').includes('..')){res.writeHead(404);res.end();return}
 try{const target=name==='styles.css'?path.join(root,'dist/styles.test.css'):name.startsWith('content/')?path.join(repo,name):name.startsWith('vendor/motion-pack-v1/')?path.join(root,name):path.join(root,'public',name);const data=await fs.readFile(target);res.writeHead(200,{'content-type':mime[path.extname(name)]||'application/octet-stream','content-security-policy':csp});res.end(data)}catch{res.writeHead(404);res.end()}
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),args:['--no-sandbox']}:{} )});
const report={engine,viewport:'390x844',checks:[],errors:[],requests:[]};
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'zh-CN',colorScheme:'dark',reducedMotion:'reduce'});
 await ctx.addInitScript(({key,ids})=>{localStorage.setItem('ew_lang','zh');sessionStorage.setItem('ewv.welcome.seen','1');localStorage.setItem('ew_onboarding_v1_fixture-agent','1');localStorage.setItem('ew_page_tip_v1_fixture-agent_today','1');localStorage.setItem(key,JSON.stringify(ids))},{key:getDailyAlertStorageKey(today)+'_fixture-agent',ids:occasions.map(o=>o.id)});
 const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>report.requests.push(new URL(r.url()).pathname));
 await page.goto(origin);await page.locator('.occasion-upcoming-item').first().waitFor();
 // Language defaults differ by existing app; calendar uses Chinese first.
 await page.locator('.vw-root').waitFor({state:'hidden',timeout:10000}).catch(()=>{});
 const tip=page.locator('.ai-orb-tip button[aria-label]');if(await tip.count())await tip.click();await page.screenshot({path:path.join(screenshots,engine+'-home-upcoming.png')});
 assert.equal(await page.locator('.occasion-upcoming-item').count(),2);assert.equal(await page.locator('.occasion-overlay').count(),0);
 assert.ok(!report.requests.some(p=>p.includes('occasion-scene-')),'scene artwork must remain unloaded until needed');report.checks.push('authenticated homepage strip with real-field offline fixtures; scene artwork lazy');
 await page.getByRole('button',{name:/播放提醒/}).click();await page.locator('.occasion-fullscreen .occasion-scene').waitFor();await page.screenshot({path:path.join(screenshots,engine+'-fullscreen-reminder.png')});
 assert.equal(await page.locator('.occasion-scene-clock').count(),0,'reduced-motion must not start logo clock');await page.locator('.occasion-overlay').getByRole('button',{name:'关闭',exact:true}).click();report.checks.push('fullscreen reminder; reduced-motion; close removes scene');
 await page.getByRole('button',{name:'场合日历',exact:true}).click();await page.locator('.occasion-grid').waitFor();await page.screenshot({path:path.join(screenshots,engine+'-calendar.png')});
 assert.equal(await page.locator('.occasion-day').count(),42);await page.getByRole('button',{name:date+' · 2 个场合',exact:true}).click();await page.locator('.occasion-dialog .occasion-row').first().waitFor();await page.screenshot({path:path.join(screenshots,engine+'-date-detail.png')});report.checks.push('42-day month grid; selected-day details');
 await page.locator('.occasion-dialog .occasion-row').nth(1).click();await page.getByRole('button',{name:'检查备货资格'}).click();await page.getByText('日期尚未核实，请先提交核实资料。',{exact:true}).waitFor();await page.getByRole('button',{name:'帮忙核实日期',exact:true}).click();
 await page.getByLabel('开始日期').fill(date);await page.getByLabel('核实说明').fill('本地测试：核对学校正式公告');await page.getByRole('button',{name:'提交给 Owner 审核'}).click();await page.getByText('已提交，等待 Owner 审核。',{exact:true}).waitFor();assert.equal(verifications[0].status,'pending');assert.equal(occasions[1].date_status,'pattern');report.checks.push('pattern blocks stock; Agent submission stays pending');
 await page.locator('.occasion-overlay').getByRole('button',{name:'关闭',exact:true}).click();await page.getByRole('button',{name:'动态场景',exact:true}).click();await page.locator('select[aria-label="选择动态场景"] option').nth(99).waitFor({state:'attached'});await page.locator('.occasion-scene').waitFor();assert.equal(await page.locator('.occasion-scene').count(),1);await page.getByRole('button',{name:'← 今天'}).click();assert.equal(await page.locator('.occasion-scene').count(),0);report.checks.push('100 enabled scenes in library, one mounted; leaving destroys scene');
 // Unknown/empty backend responses never substitute demonstration records.
 occasions=[];await page.getByRole('button',{name:'场合日历',exact:true}).click();await page.getByRole('button',{name:'刷新',exact:true}).click();await page.getByRole('button',{name:'月历',exact:true}).click();await page.getByText('目前没有真实场合资料。请 Owner 从审核页新增或导入 CSV。',{exact:true}).waitFor();report.checks.push('empty data renders friendly empty state');
 failList=true;await page.getByRole('button',{name:'刷新',exact:true}).click();await page.locator('#occasionsPage').getByText('场合资料暂时无法读取，请稍后重试。',{exact:true}).waitFor();report.checks.push('API failure renders retry without seed fallback');
 await page.getByRole('button',{name:'← 今天'}).click();const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));assert.ok(dims.scroll<=dims.view+1,JSON.stringify(dims));
 assert.deepEqual(report.errors,[]);await ctx.close();
 // A separate login exercises automatic reminders, the three-item cap and
 // actor-scoped dedupe. Unshown alerts must remain unacknowledged.
 failList=false;occasions=Array.from({length:5},(_,i)=>({...fixture,id:'auto-'+i,name_zh:'自动提醒测试 '+i,name_en:'Auto test '+i}));
 const auto=await browser.newContext({viewport:{width:390,height:844},isMobile:true,reducedMotion:'reduce'});
 await auto.addInitScript(()=>{sessionStorage.setItem('ewv.welcome.seen','1');localStorage.setItem('ew_page_tip_v1_fixture-agent_today','1')});
 const autoPage=await auto.newPage();autoPage.on('pageerror',e=>report.errors.push(e.message));await autoPage.goto(origin);await autoPage.locator('.onboarding-layer').waitFor();await autoPage.locator('.vw-root').waitFor({state:'hidden'});assert.equal(await autoPage.locator('.occasion-fullscreen').count(),0);await autoPage.locator('.onboarding-layer').getByRole('button',{name:/Skip|跳过/,exact:true}).click();await autoPage.locator('.occasion-fullscreen').waitFor();
 const storageKey=getDailyAlertStorageKey(today)+'_fixture-agent';
 assert.equal(await autoPage.evaluate(k=>JSON.parse(localStorage.getItem(k)).length,storageKey),1);
 await autoPage.getByRole('button',{name:'下一个提醒',exact:true}).click();await autoPage.getByRole('button',{name:'下一个提醒',exact:true}).click();
 assert.equal(await autoPage.evaluate(k=>JSON.parse(localStorage.getItem(k)).length,storageKey),3);
 await autoPage.getByRole('button',{name:'完成，回到今天',exact:true}).waitFor();await autoPage.evaluate(()=>window.__testAuthChange('SIGNED_OUT',null));await autoPage.locator('#login:not(.hidden)').waitFor();
 assert.equal(await autoPage.locator('.occasion-overlay,.occasion-scene').count(),0);assert.deepEqual(report.errors,[]);await auto.close();
 report.checks.push('automatic reminders after first-login tour, max three, mark only shown; sign-out removes dialog and scene');
 // Re-authentication after a calendar was open must have an active page.
 const relogin=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await relogin.addInitScript(({key,ids})=>{sessionStorage.setItem('ewv.welcome.seen','1');localStorage.setItem('ew_onboarding_v1_fixture-agent','1');localStorage.setItem('ew_page_tip_v1_fixture-agent_today','1');localStorage.setItem(key,JSON.stringify(ids))},{key:storageKey,ids:occasions.map(o=>o.id)});
 const reloginPage=await relogin.newPage();reloginPage.on('pageerror',e=>report.errors.push(e.message));await reloginPage.goto(origin);await reloginPage.getByRole('button',{name:'场合日历',exact:true}).waitFor();await reloginPage.locator('.vw-root').waitFor({state:'hidden'});
 const tip2=reloginPage.locator('.ai-orb-tip button[aria-label]');if(await tip2.count())await tip2.click();await reloginPage.getByRole('button',{name:'场合日历',exact:true}).click();await reloginPage.locator('#occasionsPage.active').waitFor();
 await reloginPage.evaluate(()=>window.__testAuthChange('SIGNED_OUT',null));await reloginPage.locator('#login:not(.hidden)').waitFor();await reloginPage.evaluate(()=>window.__testAuthChange('SIGNED_IN',{access_token:'offline-renewed',user:{id:'fixture-agent'}}));await reloginPage.locator('#app:not(.hidden) #todayPage.active .occasion-upcoming-item').first().waitFor();assert.deepEqual(report.errors,[]);await relogin.close();report.checks.push('calendar session expiry and re-login restore active Today page');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await fs.writeFile(path.join(screenshots,engine+'-test-report.json'),JSON.stringify(report,null,2)+'\n')}
console.log(JSON.stringify({engine,checks:report.checks,errors:report.errors}));
