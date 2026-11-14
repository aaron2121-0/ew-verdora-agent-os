// Offline browser acceptance: every dashboard/AI response is a labelled fixture.
// Run after build-railway-function.mjs. No key, login, production or live AI is used.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROME_PATH=/usr/bin/chromium node this-file
import assert from "node:assert/strict";
import {createServer} from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||"playwright");
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
const root=path.join(repo,"apps/agent-mobile"),publicDir=path.join(root,"public");
const screenshots=path.join(repo,"docs/today-coach");
await fs.mkdir(screenshots,{recursive:true});
const leadId="11111111-1111-4111-8111-111111111111";
const sdkMock=`window.supabase={createClient:()=>({auth:{onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},async getSession(){return {data:{session:{access_token:"offline-test-token",refresh_token:"offline-test-refresh",user:{id:"offline-agent"}}}}},async signOut(){return {error:null}}},storage:{from(){return {uploadToSignedUrl:async()=>({error:null})}}}})};`;
let mode="empty",provider="gemini",malicious=false,actualFollowups=1,requests=[],events=[];
const forbidden=/Demo Agent|6\s*天连胜|6\s*天连赢|6.day streak|做得很好.*继续保持/i;
function dashboard(){
 const empty=mode==="empty";
 return {agent:{id:"offline-agent",display_name:"",agent_code:"",status:"active",tier:"starter"},
  mission:empty?null:{target_qualified_leads:2,target_quotes:1,target_followups:2,target_orders:1},
  today_progress:empty?null:{orders:0,qualified_leads:1,quotes:0,followups:actualFollowups},
  phase1:{can_sell:true,due_followups:empty?[]:[{id:leadId,customer_label:"离线验收客户",status:"follow_up",next_followup_at:"2026-11-14T08:00:00+08:00"}],recent_leads:empty?[]:[{id:leadId,customer_label:"离线验收客户",status:"follow_up"}],tier_progress:{commission_rate:0.1},money:{today_earned:0,pending:0,month_earned:0},training_pending:false},
  selling_kits:[],campaigns:[],channel_playbooks:[],training:[]};
}
function ai(body){
 const sentinel=provider!=="gemini"?"FALLBACK_SENTINEL_MUST_NOT_RENDER":malicious?'<img src=x onerror="window.__unsafeToday=true">':"离线测试 AI：请确认客户的送达日期。";
 const base={ok:true,provider};
 switch(body.action){
  case "today_priority":return {...base,customers:mode==="empty"?[]:[{lead_id:leadId,customer_label:"离线验收客户",why:"离线测试 AI：这位客户有到期跟进。",message:sentinel}]};
  case "next_message":return {...base,lead_id:leadId,content:{message:sentinel,why:"离线测试 AI：先确认需求。",next_followup_hours:24}};
  case "objection_replies":return {...base,replies:[sentinel,"离线测试 AI：可以补充使用场合吗？","离线测试 AI：想先了解哪一部分？"]};
  case "translate_reply":return {...base,text:sentinel,translated:provider==="gemini"};
  case "lost_review":return {...base,review:{summary:sentinel,next_time:sentinel,model_message:sentinel,avoid:sentinel}};
  case "roleplay_generate":return {...base,scenario:sentinel};
  case "roleplay_score":return {...base,practice_only:true,score:{score:80},feedback:{strengths:[sentinel],improvements:[sentinel]},model_answer:sentinel};
  case "weekly_plan":{
   const date=new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Kuching"}));
   const monday=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()-((date.getDay()+6)%7)));
   return {...base,plan:{week_start:monday.toISOString().slice(0,10),days:Array.from({length:7},(_,i)=>({day:i+1,focus:sentinel,actions:[sentinel]}))}};
  }
  case "daily_greeting":return {...base,greeting:{text:"",focus:"",provider}};
  case "chat_history":return {messages:[]};
  default:return {...base};
 }
}
const mime={".html":"text/html",".css":"text/css",".js":"text/javascript",".json":"application/json",".woff2":"font/woff2",".svg":"image/svg+xml",".png":"image/png"};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,"http://localhost");
  const json=data=>{res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify(data))};
  if(url.pathname==="/config")return json({url:"http://127.0.0.1:"+server.address().port,key:"offline-test-publishable"});
  if(url.pathname.startsWith("/functions/v1/")){
   const body=JSON.parse(await new Promise(resolve=>{let text="";req.on("data",chunk=>text+=chunk);req.on("end",()=>resolve(text||"{}"))}));
   requests.push(body);
   if(url.pathname.endsWith("/agent-ai")){
    if(["roleplay_generate","roleplay_score"].includes(body.action))await new Promise(resolve=>setTimeout(resolve,350));
    return json(ai(body));
   }
   if(body.action==="dashboard"){events.push("dashboard");return json(dashboard())}
   if(body.action==="complete_followup"){
    await new Promise(resolve=>setTimeout(resolve,350));
    actualFollowups=2;events.push("followup-saved");
   }
   return json({ok:true,entries:[],items:[],server_now:new Date().toISOString()});
  }
  if(url.pathname==="/vendor/supabase-2.119.0.js"){res.writeHead(200,{"content-type":"text/javascript"});res.end(sdkMock);return}
  let pathname=decodeURIComponent(url.pathname);if(pathname==="/")pathname="/index.html";
  if(pathname.includes("..")){res.writeHead(404);res.end();return}
  const filename=pathname==="/styles.css"?path.join(root,"dist/styles.test.css"):
   pathname.startsWith("/content/")?path.join(repo,pathname.slice(1)):
   pathname.startsWith("/vendor/motion-pack-v1/")?path.join(root,pathname.slice(1)):path.join(publicDir,pathname.slice(1));
  res.writeHead(200,{"content-type":mime[path.extname(pathname)]||"application/octet-stream",
   "content-security-policy":"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'"});
  res.end(await fs.readFile(filename));
 }catch{if(!res.headersSent)res.writeHead(404);res.end("Not found")}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--no-sandbox"],executablePath:process.env.CHROME_PATH||undefined});
let assertions=0;
const press=async target=>{await target.evaluate(el=>el.scrollIntoView({block:"center",behavior:"instant"}));await target.click()};
async function openPage({reducedMotion="no-preference"}={}){
 const context=await browser.newContext({viewport:{width:390,height:844},locale:"zh-CN",colorScheme:"light",reducedMotion});
 await context.addInitScript(()=>{
  Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async value=>{window.__copiedCoachText=value}}});
  localStorage.setItem("ew_lang","zh");localStorage.setItem("ew_theme","light");
  window.__coachCelebrations=0;
  document.addEventListener("DOMContentLoaded",()=>new MutationObserver(records=>{
   for(const record of records)for(const node of record.addedNodes)
    if(node.nodeType===1&&node.classList.contains("vd-celebrate-layer"))window.__coachCelebrations++;
  }).observe(document.documentElement,{childList:true,subtree:true}),{once:true});
  localStorage.setItem("ew_onboarding_v1_offline-agent","1");
  for(const name of ["today","customers","training","handbook","order","performance"])localStorage.setItem("ew_page_tip_v1_offline-agent_"+name,"1");
 });
 const page=await context.newPage(),errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 await page.goto(origin,{waitUntil:"domcontentloaded"});
 await page.locator("#app:not(.hidden)").waitFor({timeout:15000});
 await page.locator(".today-coach .tc-hero").waitFor({timeout:15000});
 await page.evaluate(()=>document.fonts.ready);
 const dismiss=page.locator(".ai-orb-tip > button");if(await dismiss.count())await dismiss.click();
 return {page,context,errors};
}
async function verifyPage(page){
 assert.equal(await page.locator(".tc-tab").count(),5);assertions++;
 assert.doesNotMatch(await page.locator(".today-coach").innerText(),forbidden);assertions++;
 assert.equal(await page.locator(".today-coach img[onerror], .today-coach script").count(),0);assertions++;
 const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));
 assert.ok(size.scroll<=size.view+1,"390px horizontal overflow: "+JSON.stringify(size));assertions++;
}
try{
 // Screenshots show actual app integration with EMPTY mocked dashboard, never demo copy.
 mode="empty";
 let {page,context,errors}=await openPage();
 await verifyPage(page);
 assert.equal(await page.locator(".today-coach").getByText(/连续.*天/).count(),0);assertions++;
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:path.join(screenshots,"390x844-empty.png"),animations:"disabled"});
 for(const label of ["今日计划","任务话术","结果回填","2 分钟对练","晚上复盘"]){
  await page.locator(".tc-tab").filter({hasText:label}).click();
  assert.equal(await page.locator('.tc-tab[aria-selected="true"]').count(),1);assertions++;
  await verifyPage(page);
 }
 const tabs=page.locator(".tc-tab");
 await tabs.first().focus();await tabs.first().press("End");
 assert.equal(await tabs.last().getAttribute("aria-selected"),"true");assertions++;
 await tabs.last().press("ArrowRight");
 assert.equal(await tabs.first().getAttribute("aria-selected"),"true");assertions++;
 assert.equal(await page.locator("#"+await tabs.first().getAttribute("aria-controls")).count(),1);assertions++;
 assert.deepEqual(errors,[]);await context.close();
 // The populated fixture is clearly marked as offline test input, not a real account.
 mode="fixture";
 ({page,context,errors}=await openPage());
 await verifyPage(page);
 const coach=page.locator(".today-coach");
 await press(coach.getByRole("button",{name:"生成今日带单计划",exact:true}));
 await coach.getByText("AI 根据你的客户资料整理",{exact:true}).waitFor();
 assert.equal(requests.at(-1).action,"today_priority");assertions++;
 assert.match(await coach.innerText(),/离线验收客户/);assertions++;
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:path.join(screenshots,"390x844-fixture.png"),animations:"disabled"});
 const tab=async label=>coach.locator(".tc-tab").filter({hasText:label}).click();
 const generated=async()=>coach.locator(".tc-result").getByText("AI 实时生成 · 请核对后再发送",{exact:true}).waitFor();
 await tab("任务话术");
 await coach.getByLabel("客户最近说了什么？（选填）").fill("离线测试客户原话");
 await press(coach.getByRole("button",{name:"请 AI 帮我准备",exact:true}));await generated();
 assert.ok(requests.some(x=>x.action==="next_message"&&x.lead_id===leadId&&x.customer_said==="离线测试客户原话"));assertions++;
 await press(coach.getByRole("button",{name:"复制话术",exact:true}));
 const copied=await page.evaluate(()=>window.__copiedCoachText);
 assert.equal(copied,"离线测试 AI：请确认客户的送达日期。");assertions++;
 assert.doesNotMatch(copied,/先确认需求/);assertions++;
 // A backend fallback must not masquerade as a real AI answer.
 provider="fallback";
 await press(coach.getByRole("button",{name:"请 AI 帮我准备",exact:true}));
 await coach.getByText(/AI 暂时无法生成/).waitFor();
 assert.doesNotMatch(await coach.innerText(),/FALLBACK_SENTINEL_MUST_NOT_RENDER/);assertions++;
 provider="gemini";malicious=true;
 await press(coach.getByRole("button",{name:"请 AI 帮我准备",exact:true}));await generated();
 assert.match(await coach.locator(".tc-result").innerText(),/<img src=x/);assertions++;
 assert.equal(await coach.locator("img[onerror],script").count(),0);assertions++;
 assert.equal(await page.evaluate(()=>Boolean(window.__unsafeToday)),false);assertions++;
 malicious=false;
 await coach.getByLabel("你现在需要什么？").selectOption("objection");
 await press(coach.getByRole("button",{name:"请 AI 帮我准备",exact:true}));await generated();
 assert.ok(requests.some(x=>x.action==="objection_replies"&&x.objection==="expensive"));assertions++;
 assert.equal(await coach.getByRole("button",{name:"复制话术",exact:true}).count(),3);assertions++;
 await coach.getByLabel("你现在需要什么？").selectOption("translate");
 await coach.getByLabel("贴上要翻译的内容").fill("离线测试翻译原文");
 await press(coach.getByRole("button",{name:"请 AI 帮我准备",exact:true}));await generated();
 assert.ok(requests.some(x=>x.action==="translate_reply"&&x.text==="离线测试翻译原文"));assertions++;
 await tab("结果回填");
 for(const [outcome,label] of [["no_reply","没回覆"],["replied","有回覆"],["interested","有兴趣"],["wants_quote","要报价"],["won","成交了"]]){
  const before=requests.length;
  await press(coach.getByRole("button",{name:label,exact:true}));await generated();
  const recent=requests.slice(before);
  assert.ok(recent.some(x=>x.action==="complete_followup"&&x.lead_id===leadId));assertions++;
  assert.ok(recent.some(x=>x.action==="next_message"&&x.outcome===(outcome==="won"?"replied":outcome)));assertions++;
  if(outcome==="no_reply"){
   await page.waitForFunction(()=>window.__coachCelebrations>0);
   assert.equal(await page.locator(".tc-ring strong").textContent(),"3 / 6");assertions++;
  }
 }
 await coach.getByLabel("如果丢单，主要原因是？").selectOption("think_about_it");
 await press(coach.getByRole("button",{name:"丢单",exact:true}));await generated();
 assert.ok(requests.some(x=>x.action==="set_lead_loss"&&x.loss_reason==="think_about_it"));assertions++;
 assert.ok(requests.some(x=>x.action==="lost_review"&&x.lead_id===leadId));assertions++;
 await tab("2 分钟对练");
 await press(coach.getByRole("button",{name:"生成对练情境",exact:true}));
 await coach.locator(".tc-scenario").getByText("AI 实时生成 · 请核对后再发送",{exact:true}).waitFor();
 await coach.getByLabel("你会怎么回复客户？").fill("离线测试练习回答");
 await press(coach.getByRole("button",{name:"提交回复，请 AI 点评",exact:true}));
 assert.equal(await coach.getByRole("button",{name:"生成对练情境",exact:true}).isDisabled(),true);assertions++;
 assert.equal(await coach.getByLabel("你会怎么回复客户？").isDisabled(),true);assertions++;
 await generated();
 assert.ok(requests.some(x=>x.action==="roleplay_score"&&x.answer==="离线测试练习回答"&&x.scenario.includes("离线测试 AI")));assertions++;
 await press(coach.getByRole("button",{name:"生成对练情境",exact:true}));
 assert.equal(await coach.getByRole("button",{name:"提交回复，请 AI 点评",exact:true}).isDisabled(),true);assertions++;
 assert.equal(await coach.getByLabel("你会怎么回复客户？").inputValue(),"");assertions++;
 assert.equal(await coach.locator(".tc-result").innerText(),"");assertions++;
 await coach.locator(".tc-scenario").getByText("AI 实时生成 · 请核对后再发送",{exact:true}).waitFor();
 await tab("晚上复盘");
 await press(coach.getByRole("button",{name:"请 AI 整理明天重点",exact:true}));
 await coach.locator(".tc-result").getByText(/AI 实时生成|AI 目前还没有明天的计划/).first().waitFor();
 assert.ok(requests.some(x=>x.action==="weekly_plan"));assertions++;
 await verifyPage(page);
 assert.deepEqual(errors,[]);await context.close();
 actualFollowups=1;
 ({page,context,errors}=await openPage({reducedMotion:"reduce"}));
 assert.equal(await page.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches),true);assertions++;
 const motion=await page.locator(".today-coach").evaluate(el=>[el,...el.querySelectorAll("*")].filter(node=>getComputedStyle(node).animationName!=="none"&&getComputedStyle(node).animationDuration!=="0s").map(node=>node.className));
 assert.deepEqual(motion,[],"Reduced motion must disable coach animations");assertions++;
 await page.locator(".tc-tab").filter({hasText:"结果回填"}).click();
 await press(page.locator(".today-coach").getByRole("button",{name:"没回覆",exact:true}));
 await page.locator(".tc-ring strong").filter({hasText:"3 / 6"}).waitFor();
 assert.equal(await page.evaluate(()=>window.__coachCelebrations),0);assertions++;
 assert.deepEqual(errors,[]);await context.close();
 // Persisted results must refresh server dashboard even after a tab switch.
 actualFollowups=1;
 ({page,context,errors}=await openPage());
 await page.locator(".tc-tab").filter({hasText:"结果回填"}).click();
 const eventStart=events.length,requestStart=requests.length;
 await press(page.locator(".today-coach").getByRole("button",{name:"没回覆",exact:true}));
 await page.locator(".tc-tab").filter({hasText:"任务话术"}).click();
 await page.locator(".tc-ring strong").filter({hasText:"3 / 6"}).waitFor();
 const recentEvents=events.slice(eventStart),recentRequests=requests.slice(requestStart);
 assert.ok(recentEvents.indexOf("followup-saved")>=0);assertions++;
 assert.ok(recentEvents.lastIndexOf("dashboard")>recentEvents.indexOf("followup-saved"));assertions++;
 assert.ok(!recentRequests.some(x=>x.action==="next_message"));assertions++;
 assert.equal(await page.locator('.tc-tab[aria-selected="true"]').innerText(),"任务话术");assertions++;
 assert.doesNotMatch(await page.locator(".tc-pane").innerText(),/已保存这次跟进|AI 下一步建议/);assertions++;
 assert.deepEqual(errors,[]);await context.close();
 console.log(JSON.stringify({ok:true,assertions,viewport:"390x844",screenshots,mode:"Offline mocked API only — not a live AI acceptance test",requestedActions:[...new Set(requests.map(x=>x.action))]}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
