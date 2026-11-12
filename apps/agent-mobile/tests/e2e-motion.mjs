import assert from "node:assert/strict";
import {createServer} from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const publicDir=path.join(root,"public");
const screenshots=path.join(root,"artifacts","ui-motion");
await fs.mkdir(screenshots,{recursive:true});
const sdkMock="window.supabase={createClient:()=>{let session={access_token:\"e2e-token\",refresh_token:\"e2e-refresh\",user:{id:\"e2e-agent\"}};return {auth:{onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},async getSession(){return {data:{session}}},async setSession(value){session={...value,user:{id:\"e2e-agent\"}};return {error:null}},async signInWithOtp(){return {error:null}},async signOut(){session=null;return {error:null}}},storage:{from(){return {uploadToSignedUrl:async()=>({error:null})}}}}}};";
const dashboard={agent:{id:"e2e-agent",display_name:"Test Agent",agent_code:"T001",status:"active",tier:"starter"},phase1:{can_sell:true,due_followups:[],recent_leads:[{id:"mock-lead",customer_label:"𠮷野 · 龘龖",status:"new",budget:200,source:"instagram",lead_score:78,lead_score_reason:{zh:"今天可以优先联系",en:"Prioritize today"},next_best_action:"follow_up",best_followup_time:"2026-11-13T02:00:00+08:00"}],tier_progress:{commission_rate:0.1},money:{today_earned:0,pending:0,month_earned:0},training_pending:false},selling_kits:[],campaigns:[],channel_playbooks:[],training:[]};
const mime={".html":"text/html",".css":"text/css",".js":"text/javascript",".woff2":"font/woff2"};
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
  if(body.action==="dashboard")return json(dashboard);
  return json({ok:true,server_now:new Date().toISOString()});
 }
 let pathname=decodeURIComponent(u.pathname);if(pathname==="/")pathname="/index.html";
 if(pathname==="/vendor/supabase-2.119.0.js"){res.writeHead(200,{"content-type":"text/javascript"});res.end(sdkMock);return}
 if(pathname.includes("..")){res.writeHead(404);res.end();return}
 try{const filename=pathname==="/styles.css"?path.join(root,"dist","styles.test.css"):path.join(publicDir,pathname.slice(1));const file=await fs.readFile(filename);res.writeHead(200,{"content-type":mime[path.extname(pathname)]||"application/octet-stream"});res.end(file)}
 catch{res.writeHead(404);res.end("Not found")}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--no-sandbox"],executablePath:process.env.CHROME_PATH||undefined});
try{
 for(const width of [360,430])for(const lang of ["en","zh"])for(const theme of ["dark","light"]){
  const ctx=await browser.newContext({viewport:{width,height:850},locale:lang==="zh"?"zh-CN":"en-US",colorScheme:theme});
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
  }
  assert.deepEqual(errors,[],"page errors "+width+" "+lang+" "+theme);
  await ctx.close();
 }
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
  console.log("LIGHTHOUSE_MOBILE "+JSON.stringify(report));
 }finally{await lhChrome.kill()}
 console.log("PASS: 360/430 EN/ZH light/dark, mocked AI chat, profile, invite");
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
