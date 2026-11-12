import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {createServer} from "node:http";
import {randomBytes,randomUUID,createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {createClient} from "@supabase/supabase-js";
import {chromium} from "playwright";

const required=["SUPABASE_URL","SUPABASE_PUBLISHABLE_KEY","SUPABASE_QA_SECRET_KEY"];
const missing=required.filter(x=>!process.env[x]);
if(missing.length){console.error("QA_CONFIG_MISSING: "+missing.join(","));process.exit(1)}
const url=process.env.SUPABASE_URL.replace(/\/+$/,"");
const pub=process.env.SUPABASE_PUBLISHABLE_KEY;
const secret=process.env.SUPABASE_QA_SECRET_KEY;
assert.equal(url,"https://vuibesuahnhlafsfraeo.supabase.co","Refusing an unexpected Supabase project");
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..","..","..");
const PUBLIC=path.join(ROOT,"apps","agent-mobile","public");
const DIST=path.join(ROOT,"apps","agent-mobile","dist");
const manifestPath=path.join(ROOT,"apps","agent-mobile","artifacts","ui-motion","live-supabase-qa.json");
const nonce=randomBytes(10).toString("hex"),email="qa-motion-"+nonce+"@example.com";
const agentCode="QAM"+nonce.toUpperCase();
const codeLink=randomBytes(32).toString("hex");
const sha=createHash("sha256").update(codeLink).digest("hex");
const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const record={run:"qa-motion-"+nonce,results:{},created:{auth_user:null,agent:null,invite:null},deleted:{auth_user:false,agent:false,invite:false},cleanup_verified:false};
let stage="setup",server=null,browser=null,session=null,failed=false,agentId=null,userId=null,inviteId=null;
const safe=(s)=>{record.results[s]="PASS";console.log("PASS "+s)};
function failedStep(s,e){failed=true;record.results[s]="FAIL";console.error("FAIL "+s+" ["+String(e?.status||e?.code||"assertion").replace(/[^A-Za-z0-9_-]/g,"").slice(0,32)+"]");}
async function adminAssert(result,name){if(result.error)throw Object.assign(new Error(name),{code:result.error.code||"admin_failure"});return result.data;}
async function edge(fn,body,token,origin){
 const r=await fetch(url+"/functions/v1/"+fn,{method:"POST",headers:{
 "content-type":"application/json","apikey":pub,...(token?{"authorization":"Bearer "+token}:{}),
 ...(origin?{origin}:{})
 },body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
 const data=await r.json().catch(()=>({}));
 return {status:r.status,data};
}
function once(type,handler){return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error("timeout")),25000);handler(resolve,reject,()=>clearTimeout(timeout))})}
const test=async(name,fn)=>{stage=name;try{await fn();safe(name)}catch(e){failedStep(name,e);throw e}};
try{
 await test("create QA-only Auth identity",async()=>{
  const created=await adminAssert(await admin.auth.admin.createUser({email,email_confirm:true}),"create QA user");
  userId=created.user?.id;assert.match(userId||"",/^[0-9a-f-]{36}$/);
  record.created.auth_user=userId;
 });
 await test("create Agent with is_demo=true",async()=>{
  agentId=randomUUID();
  const created=await admin.from("agents").insert({id:agentId,user_id:userId,agent_code:agentCode,
   display_name:"QA Motion Test",status:"active",tier:"starter",preferred_language:"en",is_demo:true})
   .select("id,is_demo,user_id").single();
  const a=await adminAssert(created,"insert QA Agent");
  assert.equal(a.is_demo,true);assert.equal(a.user_id,userId);
  record.created.agent=agentId;
 });
 await test("create one-use #invite for QA only",async()=>{
  const inserted=await admin.from("agent_auth_invites").insert({email,code_hash:sha,
    expires_at:new Date(Date.now()+15*60*1000).toISOString()}).select("id").single();
  inviteId=(await adminAssert(inserted,"invite insert")).id;
  record.created.invite=inviteId;
 });
 await test("real browser #invite login",async()=>{
  const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".woff2":"font/woff2"};
  server=createServer(async(req,res)=>{
   const send=(status,body,type)=>{res.writeHead(status,{"content-type":type||"text/plain","cache-control":"no-store"});res.end(body)};
   const target=new URL(req.url,"http://localhost");
   if(target.pathname==="/config")return send(200,JSON.stringify({url,key:pub}),"application/json");
   let rel=decodeURIComponent(target.pathname).replace(/^\/+/,"");
   if(!rel)rel="index.html";
   if(rel.includes(".."))return send(404,"Not found");
   let filepath=rel==="styles.css"?path.join(DIST,"styles.test.css"):
    rel==="vendor/supabase-2.119.0.js"?path.join(ROOT,"node_modules","@supabase","supabase-js","dist","umd","supabase.js"):
    path.join(PUBLIC,rel);
   try{const b=await fs.readFile(filepath);return send(200,b,mime[path.extname(rel)]||"application/octet-stream")}
   catch{return send(404,"Not found")}
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:["--no-sandbox"]});
  const ctx=await browser.newContext({viewport:{width:390,height:844},locale:"en-US"});
  const page=await ctx.newPage();
  let issued=null;
  await page.route("**/functions/v1/agent-auth",async route=>{
   if(route.request().method()==="OPTIONS"){
    await route.fulfill({status:204,headers:{"access-control-allow-origin":"*",
      "access-control-allow-headers":"apikey,content-type,authorization","access-control-allow-methods":"POST,OPTIONS"}});return;
   }
   // Real Supabase Edge Function; production Origin is used because this QA page
   // is served on localhost. No mock auth result and no tokens in logs.
   const r=await edge("agent-auth",JSON.parse(route.request().postData()||"{}"),null,
    "https://agent-mobile-production.up.railway.app");
   if(r.status===200)issued=r.data;
   await route.fulfill({status:r.status,contentType:"application/json",
     headers:{"access-control-allow-origin":"*"},body:JSON.stringify(r.data)});
  });
  await page.goto("http://127.0.0.1:"+server.address().port+"/#invite="+codeLink+"&email="+encodeURIComponent(email),{waitUntil:"domcontentloaded"});
  await page.locator("#app:not(.hidden)").waitFor({timeout:25000});
  assert.equal(await page.evaluate(()=>location.hash),"","Invite fragment was not removed");
  assert.ok(issued?.access_token&&issued?.refresh_token,"Browser invite did not provide a real session");
  assert.equal(issued.user_id,userId);
  session={access_token:issued.access_token,refresh_token:issued.refresh_token};
  await ctx.close();
 });
 await test("one-use invite rejects replay",async()=>{
  const second=await edge("agent-auth",{action:"invite_session",email,code:codeLink},null,
   "https://agent-mobile-production.up.railway.app");
  assert.equal(second.status,400,"Replay must return HTTP 400");
  assert.ok(!second.data?.access_token);
 });
 await test("real agent dashboard and today briefing",async()=>{
  const d=await edge("agent-session",{action:"dashboard"},session.access_token);
  assert.equal(d.status,200,"Dashboard denied test Agent");
  assert.equal(d.data?.agent?.id,agentId,"Dashboard belonged to another Agent");
  const brief=await edge("agent-ai",{action:"daily_greeting",language:"en"},session.access_token);
  assert.equal(brief.status,200,"Daily briefing request failed");
  assert.ok(typeof brief.data?.greeting?.text==="string"&&brief.data.greeting.text.length>0);
  assert.ok(["gemini","fallback"].includes(brief.data.greeting.provider));
 });
 await test("real AI chat and own chat history",async()=>{
  const c=await edge("agent-ai",{action:"chat",message:"Give a short, policy-compliant way to follow up on a flower enquiry.",language:"en"},session.access_token);
  assert.equal(c.status,200,"AI chat failed");
  assert.ok(typeof c.data?.reply==="string"&&c.data.reply.trim().length>0);
  assert.ok(["gemini","fallback"].includes(c.data.provider));
  const h=await edge("agent-ai",{action:"chat_history"},session.access_token);
  assert.equal(h.status,200,"Chat history failed");
  assert.ok(Array.isArray(h.data?.messages)&&h.data.messages.some(x=>String(x.content||"").includes("flower enquiry")));
 });
 await test("real Supabase Auth session refresh",async()=>{
  const auth=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}});
  const set=await auth.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});
  if(set.error)throw Object.assign(Error("set session failed"),{code:set.error.code||"set_session"});
  const refreshed=await auth.auth.refreshSession();
  if(refreshed.error)throw Object.assign(Error("refresh failed"),{code:refreshed.error.code||"refresh_session"});
  assert.ok(refreshed.data.session?.access_token&&refreshed.data.session?.refresh_token);
  const dashboard=await edge("agent-session",{action:"dashboard"},refreshed.data.session.access_token);
  assert.equal(dashboard.status,200,"Refreshed token cannot read own dashboard");
 });
}catch(e){if(!record.results[stage])failedStep(stage,e)}
finally{
 if(browser)try{await browser.close()}catch{failedStep("browser shutdown",{code:"browser"})}
 if(server)try{await new Promise(resolve=>server.close(resolve))}catch{failedStep("local server shutdown",{code:"server"})}
 // Check exact ownership before delete; no broad/prefix deletion.
 if(agentId)try{
  const row=await admin.from("agents").select("id,is_demo,user_id,agent_code").eq("id",agentId).maybeSingle();
  if(row.error)throw Object.assign(Error("read"),{code:row.error.code});
  if(row.data){
   assert.equal(row.data.is_demo,true);assert.equal(row.data.user_id,userId);assert.equal(row.data.agent_code,agentCode);
   const del=await admin.from("agents").delete().eq("id",agentId).eq("user_id",userId).eq("is_demo",true);
   if(del.error)throw Object.assign(Error("delete agent"),{code:del.error.code});
  }
  record.deleted.agent=true;
 }catch(e){failedStep("cleanup agent",{code:e.code||"agent"})}
 if(inviteId)try{
  const row=await admin.from("agent_auth_invites").select("id,email").eq("id",inviteId).maybeSingle();
  if(row.error)throw Object.assign(Error("read"),{code:row.error.code});
  if(row.data){assert.equal(row.data.email,email);
   const del=await admin.from("agent_auth_invites").delete().eq("id",inviteId).eq("email",email);
   if(del.error)throw Object.assign(Error("delete"),{code:del.error.code});
  }
  record.deleted.invite=true;
 }catch(e){failedStep("cleanup invite",{code:e.code||"invite"})}
 if(userId)try{
  const lookup=await admin.auth.admin.getUserById(userId);
  if(!lookup.error&&lookup.data?.user){
   assert.equal(lookup.data.user.email?.toLowerCase(),email);
   await adminAssert(await admin.auth.admin.deleteUser(userId),"delete QA Auth user");
  }
  record.deleted.auth_user=true;
 }catch(e){failedStep("cleanup Auth user",{code:e.code||"auth_user"})}
 try{
  const [agent,invite,user]=await Promise.all([
   agentId?admin.from("agents").select("id").eq("id",agentId):Promise.resolve({data:[]}),
   inviteId?admin.from("agent_auth_invites").select("id").eq("id",inviteId):Promise.resolve({data:[]}),
   userId?admin.auth.admin.getUserById(userId):Promise.resolve({error:{status:404}})
  ]);
  if(agent.error||invite.error||agent.data?.length||invite.data?.length||(!user.error&&user.data?.user))
   throw Error("residual");
  record.cleanup_verified=true;safe("zero-residual QA cleanup");
 }catch(e){failedStep("zero-residual QA cleanup",{code:"residual"})}
 await fs.mkdir(path.dirname(manifestPath),{recursive:true});
 await fs.writeFile(manifestPath,JSON.stringify(record,null,2)+"\n");
 console.log("QA_RESULT "+JSON.stringify({checks:Object.keys(record.results).length,passed:Object.values(record.results).filter(x=>x==="PASS").length,
  failed:Object.values(record.results).filter(x=>x==="FAIL").length,cleanup_verified:record.cleanup_verified}));
}
if(failed||!record.cleanup_verified)process.exitCode=1;
