// Run after build:function. --compare-releases also loads the exact release blobs
// from Git; no rebuilding old releases or contacting production/API services.
import assert from "node:assert/strict";
import {createServer} from "node:https";
import os from "node:os";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
const tlsDir=mkdtempSync(path.join(os.tmpdir(),"ios-today-tls-"));
execFileSync("openssl",["req","-x509","-newkey","rsa:2048","-nodes","-keyout",path.join(tlsDir,"key"),"-out",path.join(tlsDir,"cert"),"-days","1","-subj","/CN=localhost","-addext","subjectAltName=IP:127.0.0.1,DNS:localhost"],{stdio:"ignore"});
import {execFileSync} from "node:child_process";
import {gunzipSync} from "node:zlib";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {sdkMock,motionDashboard} from "./motion-fixtures.mjs";
import {assertTodayUsable} from "./today-visible.mjs";
const {webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE||"playwright");
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
const out=process.env.IOS_REPORT_DIR||path.join(repo,"docs/ios-green-screen");
await fs.mkdir(out,{recursive:true});
function unpack(bundle){
 const constant=name=>JSON.parse(bundle.split("\n").find(l=>l.startsWith("const "+name+"=")).slice(name.length+7).replace(/;\s*$/,""));
 return {assets:new Map(Object.entries(constant("ASSETS")).map(([p,b])=>[p,gunzipSync(Buffer.from(b,"base64"))])),types:constant("TYPES"),csp:constant("CSP")};
}
const releases=new Map();
if(process.argv.includes("--compare-releases"))for(const [label,ref] of [["1.1.0","e13005c"],["1.1.1","ab076ed"],["1.1.2","606e069"]]){
 const sha=execFileSync("git",["rev-parse",ref],{cwd:repo,encoding:"utf8"}).trim();
 releases.set(label,{...unpack(execFileSync("git",["show",sha+":apps/agent-mobile/dist/railway-function.ts"],{cwd:repo,encoding:"utf8",maxBuffer:4e6})),sha});
}
releases.set("fixed",unpack(await fs.readFile(path.join(repo,"apps/agent-mobile/dist/railway-function.ts"),"utf8")));
let active="fixed",networkFault=false;const requests=[],reports=[];
const server=createServer({key:readFileSync(path.join(tlsDir,"key")),cert:readFileSync(path.join(tlsDir,"cert"))},async(req,res)=>{
 const url=new URL(req.url,"http://localhost"),pack=releases.get(active);
 if(networkFault&&["/brand-mark.svg","/config"].includes(url.pathname)){req.socket.destroy();return}
 const send=(status,type,body)=>{res.writeHead(status,{"content-type":type,"cache-control":"no-store","content-security-policy":pack.csp});res.end(body);requests.push({release:active,path:url.pathname,status})};
 const json=data=>send(200,"application/json",JSON.stringify(data));
 if(url.pathname==="/config")return json({url:"https://127.0.0.1:"+server.address().port,key:"e2e-key"});
 if(url.pathname.startsWith("/functions/v1/")){
  const body=JSON.parse(await new Promise(resolve=>{let s="";req.on("data",b=>s+=b);req.on("end",()=>resolve(s||"{}"))}));
  if(body.action==="dashboard")return json(motionDashboard());
  if(body.action==="daily_greeting")return json({greeting:{text:"离线测试：今日跟进客户",focus:"离线测试资料",provider:"gemini"},cached:true});
  if(body.action==="chat_history")return json({messages:[]});
  return json({ok:true,entries:[],items:[],server_now:new Date().toISOString()});
 }
 if(url.pathname==="/vendor/supabase-2.119.0.js")return send(200,"text/javascript",sdkMock);
 const content=pack.assets.get(url.pathname);
 if(content)return send(200,pack.types[url.pathname]||"application/octet-stream",content);
 send(404,"text/plain","Not found");
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin="https://127.0.0.1:"+server.address().port,browser=await webkit.launch({headless:true});
async function context(){
 const c=await browser.newContext({...devices["iPhone 13"],viewport:{width:390,height:844},locale:"zh-CN",colorScheme:"light",ignoreHTTPSErrors:true});
 await c.addInitScript(()=>{localStorage.setItem("ew_lang","zh");localStorage.setItem("ew_theme","light");localStorage.setItem("ew-agent-home-guide-dismissed","1");localStorage.setItem("ew_onboarding_v1_e2e-agent","1");for(const p of ["today","customers","training","handbook","order","performance"])localStorage.setItem("ew_page_tip_v1_e2e-agent_"+p,"1")});return c;
}
async function capture(c,label,suffix=""){
 const page=await c.newPage(),errors=[],consoleMessages=[];
 page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(["warning","error"].includes(m.type()))consoleMessages.push({type:m.type(),message:m.text()})});
 await page.goto(origin,{waitUntil:"networkidle"});try{await page.locator("#app:not(.hidden)").waitFor({timeout:10000})}catch(e){console.log(JSON.stringify({label,errors,console:consoleMessages,body:await page.locator("body").innerText()}));throw e}
 await page.locator("#todayPage .earning-actions").waitFor();
 const close=page.locator(".ai-orb-tip > button");if(await close.count())await close.click();
 await page.waitForTimeout(400);
 let failure=null;try{await assertTodayUsable(page)}catch(e){failure=e.message}
 const stateChecks=[];
 for(const aiState of ["thinking","speaking","idle"]){
  await page.evaluate(async value=>(await import("/ai-ui.js")).setAIState(value),aiState);
  await page.waitForTimeout(350);
  let stateFailure=null;try{await assertTodayUsable(page)}catch(e){stateFailure=e.message}
  stateChecks.push({state:aiState,assertionFailure:stateFailure});
  if(stateFailure)await page.screenshot({path:path.join(out,label+suffix+"-"+aiState+".png"),scale:"css"});
  if(label==="fixed")assert.equal(stateFailure,null);
 }
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:path.join(out,label+suffix+".png"),scale:"css"});
 const state=await page.evaluate(()=>({url:location.pathname,serviceWorkerControlled:Boolean(navigator.serviceWorker.controller),floralImage:Boolean(document.querySelector(".ai-orb-mark")),svgOrb:Boolean(document.querySelector(".ai-orb .vd-orb-svg")),orb:document.querySelector(".ai-orb")?.getBoundingClientRect().toJSON()}));
 const report={release:label,sha:releases.get(label)?.sha||null,scenario:suffix||"fresh",viewport:"390x844",engine:await browser.version(),errors:[...errors],console:[...consoleMessages],assertionFailure:failure,state,stateChecks};reports.push(report);
 if(label==="fixed"){
  assert.equal(failure,null);assert.deepEqual(errors,[]);
  const mark=page.locator(".ai-orb-mark");await mark.waitFor();assert.ok(await mark.evaluate(el=>el.complete&&el.naturalWidth>0),"floral logo must load");
  const bounds=await mark.boundingBox(),orbBounds=await page.locator(".ai-orb").boundingBox();
  assert.ok(bounds.x>=orbBounds.x&&bounds.y>=orbBounds.y&&bounds.x+bounds.width<=orbBounds.x+orbBounds.width+1&&bounds.y+bounds.height<=orbBounds.y+orbBounds.height+1,"the complete floral mark must fit in its button, not be clipped by a fallback row");
  assert.equal(await page.locator(".ai-orb svg").count(),0,"Safari-safe orb must not use animated SVG paint layers");
  // Fault injection: an over-sized decorative child cannot cover the page.
  await mark.evaluate(el=>{el.style.width="5000px";el.style.height="5000px";el.style.position="fixed";el.style.inset="0"});
  await assertTodayUsable(page);
  await page.reload({waitUntil:"networkidle"});
  // Verify the existing network-first policy under a real controlled WebKit page.
  await page.evaluate(async()=>{await navigator.serviceWorker.ready});
  const original=releases.get("fixed").assets.get("/brand-mark.svg");
  await page.evaluate(()=>fetch("/brand-mark.svg").then(r=>r.text()));
  releases.get("fixed").assets.set("/brand-mark.svg",Buffer.concat([original,Buffer.from("\n<!-- network-first-proof -->")]));
  const latest=await page.evaluate(()=>fetch("/brand-mark.svg").then(r=>r.text()));
  assert.ok(latest.includes("network-first-proof"),"SW must prefer changed network data over a cached asset");
  networkFault=true;
  assert.ok((await page.evaluate(()=>fetch("/brand-mark.svg").then(r=>r.text()))).includes("network-first-proof"),"public assets retain offline fallback");
  assert.equal(await page.evaluate(()=>fetch("/config").then(()=>true,()=>false)),false,"configuration/API must never be cached");
  networkFault=false;releases.get("fixed").assets.set("/brand-mark.svg",original);
  report.checks={boundedPaint:true,networkFirst:true,offlineAssetFallback:true,apiNotCached:true};
 }
 await page.close();return report;
}
try{
 for(const label of releases.keys()){active=label;const c=await context();console.log(JSON.stringify(await capture(c,label)));await c.close()}
 if(releases.has("1.1.0")){
  const c=await context();for(const label of releases.keys()){active=label;console.log(JSON.stringify(await capture(c,label,"-upgrade")))}await c.close();
 }
 // A deliberately occluded heading must fail the exact regression assertion.
 active="fixed";const c=await context(),page=await c.newPage();await page.goto(origin,{waitUntil:"networkidle"});
 await page.locator(".vd-ht-title").waitFor();
 const dismiss=page.locator(".ai-orb-tip > button");if(await dismiss.count())await dismiss.click();
 await page.locator(".vd-ht-title").evaluate(el=>{el.style.color="#163d32";el.style.background="#163d32"});
 await assert.rejects(()=>assertTodayUsable(page,{timeout:200}),/contrast|readable/);
 await page.locator(".vd-ht-title").evaluate(el=>el.style.visibility="hidden");
 await assert.rejects(()=>assertTodayUsable(page,{timeout:200}),/visible|timeout/i);await c.close();
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));rmSync(tlsDir,{recursive:true,force:true});await fs.writeFile(path.join(out,"webkit-results.json"),JSON.stringify({mockedBackend:true,reports,requestCount:requests.length,failedRequests:requests.filter(r=>r.status>=400)},null,2))}
