import assert from "node:assert/strict";
import {createServer} from "node:http";
import {gzipSync} from "node:zlib";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const publicDir=path.join(root,"public");
const screenshots=path.join(root,"artifacts","ui-motion");
await fs.mkdir(screenshots,{recursive:true});
const sdkMock="window.supabase={createClient:()=>{let session={access_token:\"e2e-token\",refresh_token:\"e2e-refresh\",user:{id:\"e2e-agent\"}};return {auth:{onAuthStateChange(cb){window.__testAuthChange=cb;return {data:{subscription:{unsubscribe(){}}}}},async getSession(){return {data:{session}}},async setSession(value){session={...value,user:{id:\"e2e-agent\"}};return {error:null}},async signInWithOtp(){return {error:null}},async signOut(){session=null;return {error:null}}},storage:{from(){return {uploadToSignedUrl:async()=>({error:null})}}}}}};";
const dashboard={agent:{id:"e2e-agent",display_name:"Test Agent",agent_code:"T001",status:"active",tier:"starter"},phase1:{can_sell:true,due_followups:[],recent_leads:[{id:"mock-lead",customer_label:"𠮷野 · 龘龖",status:"new",budget:200,source:"instagram",lead_score:78,lead_score_reason:{zh:"今天可以优先联系",en:"Prioritize today"},next_best_action:"follow_up",best_followup_time:"2026-11-13T02:00:00+08:00"}],tier_progress:{commission_rate:0.1},money:{today_earned:0,pending:0,month_earned:0},training_pending:false},selling_kits:[],campaigns:[],channel_playbooks:[],training:[]};
const mockReads=new Map();
const requiredBouquet=["BOUQ-1","BOUQ-2","BOUQ-3","BOUQ-4"];
const requiredStory=["SEED-story-fixture-1","SEED-story-fixture-2","SEED-story-fixture-3","SEED-story-fixture-4"];
const courseRequired=code=>code==="CORE-BRAND"?requiredStory:requiredBouquet;
const mime={".html":"text/html",".css":"text/css",".js":"text/javascript",".woff2":"font/woff2",".svg":"image/svg+xml"};
const server=createServer(async(req,res)=>{
 const u=new URL(req.url,"http://localhost");
 const json=(value)=>{res.writeHead(200,{"content-type":"application/json","access-control-allow-origin":"*","access-control-allow-headers":"*"});res.end(JSON.stringify(value))};
 if(req.method==="OPTIONS"){res.writeHead(204,{"access-control-allow-origin":"*","access-control-allow-headers":"*"});res.end();return}
 if(u.pathname==="/config")return json({url:"http://127.0.0.1:"+server.address().port,key:"e2e-key"});
 if(u.pathname==="/functions/v1/agent-auth")return json({access_token:"e2e-token",refresh_token:"e2e-refresh"});
 if(u.pathname.startsWith("/functions/v1/")){
  let body={};try{body=JSON.parse(await new Promise(resolve=>{let b="";req.on("data",v=>b+=v);req.on("end",()=>resolve(b))}))}catch{}
  if(u.pathname.endsWith("/agent-ai")){
   if(body.action==="daily_greeting")return json({greeting:{text:"今天先跟进客户 𠮷野 · 龘龖",focus:"跟进客户",provider:"gemini"},cached:true});
   if(body.action==="chat_history")return json({messages:[]});
   if(body.action==="chat")return json({reply:"好的，我帮你想想。𠮷野 · 龘龖 🌸",provider:"gemini",message_id:"e2e-message"});
   if(body.action==="my_profile")return json({profile:{summary_zh:"你很擅长跟进",summary_en:"You are good at follow-ups",strengths:["客户沟通"],weaknesses:["跟进时间"],writing_style:"warm",agent_notes:"",stats:{score:70}}});
   return json({ok:true});
  }
  if(body.action==="handbook"){
    const section=body.section;
    const product=requiredBouquet.map((code,index)=>({
      id:"h-"+code,code,kind:"card",product_line:"bouquet",section:"product_line",
      title_en:"Approved test card "+(index+1),title_zh:"核准测试卡 "+(index+1),
      body_en:"Fixture content for "+code,body_zh:"测试资料 "+code,
      key_points_en:["Test example"],key_points_zh:["测试内容"],
      active:true,visible_to_agent:true,needs_owner_confirm:false,sort:index+1
    }));
    const story=requiredStory.map((code,index)=>({
      id:code.slice(5),code:null,kind:"seed",product_line:null,section:"story",
      title_en:"Story fixture "+(index+1),title_zh:"品牌故事测试卡 "+(index+1),
      body_en:"Owner approved story fixture",body_zh:"核准品牌故事测试资料",
      active:true,visible_to_agent:true,needs_owner_confirm:false,sort:index+1
    }));
    const extras=[
      {id:"h-script",code:"S-1",kind:"script",product_line:"bouquet",section:"script",
        title_en:"Test script",title_zh:"测试话术",body_en:"Example script",body_zh:"仅作测试的话术",
        active:true,visible_to_agent:true,needs_owner_confirm:false,sort:5},
      {id:"h-faq",code:"F-1",kind:"faq",product_line:"bouquet",section:"faq",
        title_en:"Is stock guaranteed?",title_zh:"保证有现货吗？",
        body_en:"No, confirm with Owner.",body_zh:"不保证，请先向 Owner 确认。",
        active:true,visible_to_agent:true,needs_owner_confirm:false,sort:6}
    ];
    return json({ok:true,entries:([...story,...product,...extras]).filter(x=>x.section===section)});
  }
  if(body.action==="handbook_portfolio")return json({ok:true,photos:[]});
  if(body.action==="module_read"){
    const code=String(body.module_code||""),read=mockReads.get(code)||new Set();
    const required=courseRequired(code),incoming=body.card_codes||[];
    if(incoming.some(x=>!required.includes(x))){
      res.writeHead(400,{"content-type":"application/json","access-control-allow-origin":"*"});
      res.end(JSON.stringify({error:"invalid_card_codes"}));return;
    }
    incoming.forEach(x=>read.add(x));mockReads.set(code,read);
    return json({ok:true,module_code:code,required_card_codes:required,
      read_card_codes:required.filter(x=>read.has(x)),remaining_card_codes:required.filter(x=>!read.has(x)),
      ready_for_quiz:required.every(x=>read.has(x))});
  }
  if(body.action==="module_quiz_start"){
    const read=mockReads.get(String(body.module_code||""))||new Set();
    if(!courseRequired(String(body.module_code||"")).every(x=>read.has(x))){
      res.writeHead(403,{"content-type":"application/json","access-control-allow-origin":"*"});
      res.end(JSON.stringify({error:"must_read_handbook_first"}));return;
    }
    return json({ok:true,quiz:{attempt_id:"e2e-attempt",module_code:body.module_code,completed:false,question:{
      position:1,question_en:"Fixture: which card explains occasions?",question_zh:"测试：哪一张说明适用场合？",
      options_en:["One","Two","Three","Four"],options_zh:["一","二","三","四"]}}});
  }
  if(body.action==="module_quiz_answer")return json({ok:true,correct:false,
    explanation_en:"Check the approved occasions card.",explanation_zh:"请查阅核准的适用场合卡片。",
    related_card_code:"BOUQ-2",quiz:{attempt_id:"e2e-attempt",completed:false,question:{
      position:2,question_en:"Fixture question two",question_zh:"测试第二题",
      options_en:["One","Two","Three","Four"],options_zh:["一","二","三","四"]}}});
 if(body.action==="dashboard")return json(dashboard);
  return json({ok:true,server_now:new Date().toISOString()});
 }
 let pathname=decodeURIComponent(u.pathname);if(pathname==="/")pathname="/index.html";
 if(pathname==="/vendor/supabase-2.119.0.js"){res.writeHead(200,{"content-type":"text/javascript"});if(u.searchParams.get("real")==="1"){const sdkPath=path.join(root,"..","..","node_modules","@supabase","supabase-js","dist","umd","supabase.js");res.end(await fs.readFile(sdkPath))}else res.end(sdkMock);return}
 if(pathname.includes("..")){res.writeHead(404);res.end();return}
 try{const filename=pathname==="/styles.css"?path.join(root,"dist","styles.test.css"):path.join(publicDir,pathname.slice(1));const file=await fs.readFile(filename);const compressed=/\bgzip\b/.test(req.headers["accept-encoding"]||"");res.writeHead(200,{"content-type":mime[path.extname(pathname)]||"application/octet-stream","vary":"Accept-Encoding",...(compressed?{"content-encoding":"gzip"}:{})});res.end(compressed?gzipSync(file):file)}
 catch{res.writeHead(404);res.end("Not found")}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--no-sandbox"],executablePath:process.env.CHROME_PATH||undefined});
try{
 for(const width of [360,430])for(const lang of ["en","zh"])for(const theme of ["dark","light"]){
  const ctx=await browser.newContext({viewport:{width,height:850},locale:lang==="zh"?"zh-CN":"en-US",colorScheme:theme});
  await ctx.addInitScript(()=>{
    localStorage.setItem("ew_onboarding_v1_e2e-agent","1");
    for(const p of ["today","customers","training","handbook","order","performance"])
      localStorage.setItem("ew_page_tip_v1_e2e-agent_"+p,"1");
  });
  const page=await ctx.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.locator("#app:not(.hidden)").waitFor({timeout:15000});
  await page.locator("#todayPage .page-shell").waitFor({timeout:15000});
  if(lang==="zh")await page.locator("#lang").click();
  assert.equal(await page.locator("html").getAttribute("lang"),lang==="zh"?"zh-CN":"en");
  assert.equal(await page.locator("html").getAttribute("data-theme"),theme);
  const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));
  assert.ok(dims.scroll<=dims.view+1,"horizontal overflow "+width+" "+lang+" "+theme+": "+JSON.stringify(dims));
  await page.screenshot({path:path.join(screenshots,width+"-"+lang+"-"+theme+".png"),fullPage:true});
  if(width===360&&lang==="zh"&&theme==="dark"){
   await page.locator(".ai-orb").click();
   await page.locator(".ai-chat-input").fill("怎么跟进客户？");
   await page.locator(".ai-chat-form button[type=submit]").click();
   await page.locator(".ai-message-assistant").last().waitFor({timeout:15000});
   await page.locator(".ai-message-actions:not(.hidden)").last().waitFor({timeout:15000});
   await page.locator(".ai-chat-close").click();
   await page.locator("#aiProfileOpen").click();
   await page.locator(".ai-profile-sheet:not(.hidden)").waitFor({timeout:15000});
   await page.screenshot({path:path.join(screenshots,"ai-profile.png")});
   await page.evaluate(()=>window.__testAuthChange?.("TOKEN_REFRESHED",{access_token:"renewed-token",refresh_token:"renewed-refresh",user:{id:"e2e-agent"}}));
   await page.locator("#app:not(.hidden)").waitFor({timeout:15000});
  }
  assert.deepEqual(errors,[],"page errors "+width+" "+lang+" "+theme);
  await ctx.close();
 }

 // TRAINEE unlock checklist must work at both mobile widths with actual course content.
 dashboard.agent.status="trainee";
 dashboard.phase1.can_sell=false;
 dashboard.phase1.training_pending=true;
 dashboard.training=[
  "CORE-BRAND","LEAD-FINDING","QUALIFY","REFERENCE","OBJECTION","CLOSING","PAYMENT"
 ].map(code=>({status:"assigned",best_score:0,training_modules:{code,title_en:code,title_zh:code==="CORE-BRAND"?"品牌与代理规则":code,
   content_en:{lesson:["Read and follow EW VERDORA approved pricing and payment rules."]},
   content_zh:{lesson:["请遵守 EW VERDORA 核准的定价与收款规定。"]}}}));
 for(const width of [360,430])for(const lang of ["en","zh"]){
  const ctx=await browser.newContext({viewport:{width,height:850},locale:lang==="zh"?"zh-CN":"en-US",colorScheme:"light"});
  await ctx.addInitScript(()=>{
    localStorage.setItem("ew_onboarding_v1_e2e-agent","1");
    for(const p of ["today","customers","training","handbook","order","performance"])
      localStorage.setItem("ew_page_tip_v1_e2e-agent_"+p,"1");
  });
  const page=await ctx.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.locator(".lock-banner").waitFor({timeout:15000});
  if(lang==="zh")await page.locator("#lang").click();
  await page.locator(".lock-banner button").click();
  await page.locator("#lockSheet:not(.hidden)").waitFor({timeout:15000});
  await page.locator("#lockHowSummary").click();
  await page.locator("#lockChecklist .unlock-progress-count").waitFor();
  assert.equal(await page.locator("#lockChecklist .unlock-progress-count").textContent(),"0/7");
  assert.ok(await page.locator("#lockChecklist .unlock-step").count()>=2,"module and exam rows");
  assert.ok(await page.locator("#lockChecklist .unlock-progress-logo").evaluate(el=>el.complete&&el.naturalWidth>0),"company logo loads");
  await page.screenshot({path:path.join(screenshots,`unlock-${width}-${lang}-sheet.png`),fullPage:true});
  await page.locator("#lockChecklist .unlock-step-action").first().click();
  await page.locator("#trainingPage.section.active").waitFor({timeout:15000});
  await page.locator("#lockSheet").waitFor({state:"hidden",timeout:5000});
  await page.locator('[data-course="CORE-BRAND"] .training3-course-content').waitFor({timeout:15000});
  assert.match(await page.locator(".training3-daily-note").textContent(),lang==="zh"?/不计入解锁/:/does not count toward unlocking/);
  assert.equal(await page.locator("#trainingPage .unlock-progress-count").textContent(),"0/7");
  const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));
  assert.ok(size.scroll<=size.view+1,"TRAINEE unlock horizontal overflow "+width+"/"+lang+" "+JSON.stringify(size));
  await page.screenshot({path:path.join(screenshots,`unlock-${width}-${lang}-course.png`),fullPage:true});
  assert.deepEqual(errors,[],"TRAINEE page errors "+width+" "+lang);
  await ctx.close();
 }

 // New-agent 4-slide tour, bilingual and full responsive handbook.
 for(const width of [360,430])for(const lang of ["en","zh"])for(const theme of ["dark","light"]){
  const ctx=await browser.newContext({viewport:{width,height:850},colorScheme:theme});
  await ctx.addInitScript(({lang,theme})=>{
    localStorage.setItem("ew_lang",lang);
    localStorage.setItem("ew_theme",theme);
    for(const p of ["today","customers","training","handbook","order","performance"])
      localStorage.setItem("ew_page_tip_v1_e2e-agent_"+p,"1");
  },{lang,theme});
  const page=await ctx.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(origin);
  await page.locator(".onboarding-layer").waitFor({timeout:15000});
  await page.screenshot({path:path.join(screenshots,"onboarding-"+width+"-"+lang+"-"+theme+".png")});
  for(let i=0;i<4;i++)await page.locator(".onboarding-panel > .btn-primary").click();
  assert.equal(await page.locator(".onboarding-layer").count(),0,"tour closed");
  assert.equal(await page.evaluate(()=>localStorage.getItem("ew_onboarding_v1_e2e-agent")),"1");
  await page.locator(".journey-card").waitFor();
  assert.match(await page.locator(".journey-ring").innerText(),/0\/7/);
  await page.locator(".quick-tile").filter({hasText:lang==="zh"?"产品手册":"Product handbook"}).click();
  await page.locator(".handbook-line-card").first().waitFor();
  await page.screenshot({path:path.join(screenshots,"handbook-overview-"+width+"-"+lang+"-"+theme+".png"),fullPage:true});
  await page.locator('[data-handbook-line="bouquet"]').click();
  await page.locator(".handbook-slide-body h2").waitFor({timeout:15000});
  assert.match(await page.locator(".handbook-slide-body").innerText(),/1 \/ 4/);
  await page.screenshot({path:path.join(screenshots,"handbook-detail-"+width+"-"+lang+"-"+theme+".png"),fullPage:true});
  await page.locator(".handbook-slide-controls button").last().click();
  assert.match(await page.locator(".handbook-slide-body").innerText(),/2 \/ 4/);
  await page.locator(".handbook-head button").click();
  await page.locator(".handbook-head button").click();
  await page.locator(".journey-day.current button").click();
  await page.locator(".handbook-slide-body h2").waitFor();
  assert.equal(await page.locator('[data-reading-complete="true"]').count(),0);
  await page.screenshot({path:path.join(screenshots,"course-reading-"+width+"-"+lang+"-"+theme+".png"),fullPage:true});
  const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));
  assert.ok(size.scroll<=size.view+1,"handbook horizontal overflow "+width+"/"+lang+"/"+theme);
  assert.deepEqual(errors,[],"onboarding/handbook page errors "+width+"/"+lang+"/"+theme);
  await ctx.close();
 }

 // Reading must be persisted server-side and block early quiz requests.
 mockReads.clear();
 const lessonCtx=await browser.newContext({viewport:{width:360,height:850}});
 await lessonCtx.addInitScript(()=>{
  localStorage.setItem("ew_onboarding_v1_e2e-agent","1");
  for(const p of ["today","customers","training","handbook","order","performance"])
    localStorage.setItem("ew_page_tip_v1_e2e-agent_"+p,"1");
 });
 const lesson=await lessonCtx.newPage();
 await lesson.goto(origin);
 await lesson.locator(".journey-day.current button").click();
 await lesson.locator(".handbook-slide-body h2").waitFor();
 const early=await lesson.evaluate(async()=>{
  const response=await fetch("/functions/v1/agent-training",{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({action:"module_quiz_start",module_code:"CORE-BRAND"})});
  return {status:response.status,body:await response.json()};
 });
 assert.equal(early.status,403);
 assert.equal(early.body.error,"must_read_handbook_first");
 assert.equal(await lesson.locator('[data-reading-complete="true"]').count(),0);
 assert.ok(await lesson.locator(".handbook-slide-controls button").last().isDisabled(),"fast swipe blocked");
 for(let i=0;i<4;i++){
  await lesson.locator(".handbook-read-status").filter({hasText:/saved to your learning progress/}).waitFor({timeout:7500});
  if(i<3)await lesson.locator(".handbook-slide-controls button").last().click();
 }
 assert.equal((mockReads.get("CORE-BRAND")||new Set()).size,4);
 await lesson.locator('[data-reading-complete="true"]').waitFor();
 await lesson.screenshot({path:path.join(screenshots,"course-read-complete-360-en.png"),fullPage:true});
 await lesson.reload();
 await lesson.locator(".journey-current-status").filter({hasText:/Quiz ready/}).waitFor({timeout:15000});
 await lesson.locator(".journey-day.current button").click();
 await lesson.locator(".handbook-slide-body h2").waitFor();
 for(let i=0;i<3;i++)await lesson.locator(".handbook-slide-controls button").last().click();
 await lesson.locator('[data-reading-complete="true"]').click();
 await lesson.locator(".handbook-quiz-option").first().click();
 await lesson.locator(".handbook-quiz-feedback").filter({hasText:/Check the approved occasions card/}).waitFor();
 await lesson.locator(".handbook-quiz-options button").filter({hasText:"Review this handbook card"}).click();
 await lesson.locator(".handbook-slide-body").filter({hasText:/2 \/ 4/}).waitFor();
 await lesson.screenshot({path:path.join(screenshots,"wrong-answer-related-card.png"),fullPage:true});
 await lessonCtx.close();

 dashboard.agent.status="active";
 dashboard.phase1.can_sell=true;
 dashboard.phase1.training_pending=false;
 dashboard.training=[];
 const sdkContext=await browser.newContext();
 const sdkPage=await sdkContext.newPage();
 await sdkPage.goto(origin);
 await sdkPage.addScriptTag({url:origin+"/vendor/supabase-2.119.0.js?real=1"});
 assert.equal(await sdkPage.evaluate(()=>typeof window.supabase?.createClient),"function","self-hosted Supabase SDK loads in real Chromium");
 await sdkContext.close();
 const ctx=await browser.newContext({viewport:{width:360,height:850}});
 const page=await ctx.newPage();
 await page.goto(origin+"/#invite=E2E&email=test%40example.com");
 await page.locator("#app:not(.hidden)").waitFor({timeout:15000});
 assert.equal(new URL(page.url()).hash,"","invite hash consumed");
 await ctx.close();
 const {default:lighthouse}=await import("lighthouse");
 const {launch:launchChrome}=await import("chrome-launcher");
 const lhChrome=await launchChrome({chromePath:process.env.CHROME_PATH,chromeFlags:["--headless","--no-sandbox","--disable-gpu"]});
 try{
  const lh=await lighthouse(origin,{port:lhChrome.port,output:"json",logLevel:"error",onlyCategories:["performance","accessibility","best-practices"],settings:{formFactor:"mobile",screenEmulation:{mobile:true,width:360,height:800,deviceScaleFactor:2,disabled:false},throttlingMethod:"simulate"}});
  const scores=Object.fromEntries(Object.entries(lh.lhr.categories).map(([k,v])=>[k,Math.round(v.score*100)]));
  const cls=lh.lhr.audits["cumulative-layout-shift"]?.numericValue??null;
  const report={scores,cls,requested:{performance:90,accessibility:95,"best-practices":95,cls:0.05},mockedBackend:true};
  await fs.writeFile(path.join(screenshots,"lighthouse-mobile.json"),JSON.stringify(report,null,2));
  await fs.writeFile(path.join(screenshots,"lighthouse-details.json"),JSON.stringify(lh.lhr,null,2));
  console.log("LIGHTHOUSE_MOBILE "+JSON.stringify(report));
  assert.ok(scores.performance>=90,"Lighthouse Performance must be >=90; got "+scores.performance);
  assert.ok(cls!==null&&cls<0.05,"Lighthouse CLS must be <0.05; got "+cls);
 }finally{await lhChrome.kill()}
 console.log("PASS: 360/430 EN/ZH light/dark, mocked AI chat, profile, invite");
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
