import {chromium} from "playwright";
import fs from "node:fs";
import path from "node:path";

const AGENT=process.env.AGENT_URL;
const OWNER=process.env.OWNER_URL;
if(!AGENT||!OWNER)throw new Error("Missing live URLs");

const out=path.resolve("docs/phase0");
fs.mkdirSync(out,{recursive:true});
const payload='<img src=x onerror=alert(1)>';

const supabaseStub=String.raw`
(()=>{
  let currentSession=null;
  const auth={
    async setSession(tokens){currentSession={access_token:tokens.access_token,refresh_token:tokens.refresh_token,user:{id:"u-test"}};return {data:{session:currentSession},error:null}},
    async getSession(){return {data:{session:currentSession},error:null}},
    onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},
    async signOut(){currentSession=null;return {error:null}},
    async signInWithOtp(){return {error:null}},
    async verifyOtp(){currentSession={access_token:"access",refresh_token:"refresh",user:{id:"u-test"}};return {data:{session:currentSession},error:null}}
  };
  window.supabase={createClient(){return {auth,storage:{from(){return {async uploadToSignedUrl(){return {error:null}}}}}}}};
})();
`;

function agentDashboard(){
  return {
    ok:true,needs_registration:false,
    agent:{id:"a1",agent_code:"AG-TEST",display_name:"Test Agent",status:"active",tier:"starter",commission_rate:0.05,performance_score:72},
    mission:{target_orders:1,target_qualified_leads:5,target_quotes:3,target_followups:8,ai_diagnosis:"baseline",recommended_channels:["instagram"],expected_order_probability:.8},
    today_progress:{orders:0,qualified_leads:1,quotes:0,followups:2},
    campaigns:[{title_en:payload,title_zh:payload,recommended_channels:["instagram"],completed_orders:0,target_orders:3,fixed_bonus:30,content_en:{message:payload},content_zh:{message:payload}}],
    training:[{status:"assigned",best_score:0,training_modules:{code:"QUALIFY",title_en:payload,title_zh:payload,content_en:{lesson:[payload]},content_zh:{lesson:[payload]}}}],
    selling_kits:[{code:"birthday",title_en:payload,title_zh:payload,content_en:{opening:payload},content_zh:{opening:payload},recommended_channels:["instagram"]}],
    channel_playbooks:[{code:"instagram",title_en:payload,title_zh:payload,content_en:{goal:payload},content_zh:{goal:payload}}],
    commissions:[{amount:12.5,status:"earned"}],
    recent_leads:[{id:"l1",status:"new",source:"instagram",sales_category:"birthday",budget:120,created_at:new Date().toISOString()}],
    quote_requests:[]
  };
}

async function setupAgent(page,requestBodies){
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",r=>r.fulfill({status:200,contentType:"application/javascript",body:supabaseStub}));
  await page.route("**/config",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({url:"https://test.supabase.co",key:"pk_test"})}));
  await page.route("https://test.supabase.co/**",async route=>{
    const req=route.request();
    let body={};try{body=JSON.parse(req.postData()||"{}")}catch{}
    requestBodies.push(body);
    if(req.url().includes("/agent-auth"))return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,access_token:"access",refresh_token:"refresh"})});
    if(req.url().includes("/agent-session")){
      if(body.action==="dashboard")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(agentDashboard())});
      if(body.action==="create_lead")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,lead:{id:"new"}})});
      if(body.action==="register")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,agent_code:"AG-NEW"})});
      return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true})});
    }
    if(req.url().includes("/agent-ai")){
      if(body.action==="coach")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({suggestion:"Safe coach response",provider:"fallback"})});
      if(body.action==="roleplay_generate")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({scenario:"Customer asks a question"})});
      if(body.action==="roleplay_score")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({score:{score:85,feedback:"Good"},pass:true,training:{passed:true}})});
      if(body.action==="daily_content")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({provider:"fallback",content:{post_copy:"Safe daily content",outreach_copy:"Safe DM",followup_copy:"Safe follow-up",actions:["Post once"]}})});
      return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true})});
    }
    if(req.url().includes("/quote-intake")){
      if(body.action==="create")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({bucket:"agent-references",path:"test.webp",upload_token:"upload",request_id:"qr-new"})});
      if(body.action==="analyze")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({quote_request:{classification:"AMBER",customer_note_en:"Safe quote note",customer_note_zh:"安全报价说明",recommended_price:220}})});
      if(body.action==="accept_option")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({quote:{selling_price:220,commission_rate_locked:.05}})});
      return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true})});
    }
    return route.fulfill({status:404,body:"{}"});
  });
}

async function assertNoOverflow(page,width,label){
  const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:window.innerWidth,blank:[...document.querySelectorAll("[data-i18n]")].filter(n=>!n.textContent.trim()).length}));
  if(metrics.scroll>width+1)throw new Error(`${label}: horizontal overflow ${metrics.scroll} > ${width}`);
  if(metrics.blank>0)throw new Error(`${label}: ${metrics.blank} untranslated/blank i18n nodes`);
}

async function testFirstInteractive(browser){
  const context=await browser.newContext({viewport:{width:360,height:800}});
  const page=await context.newPage();
  const client=await context.newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions",{
    offline:false,
    latency:40,
    downloadThroughput:4*1024*1024/8,
    uploadThroughput:750*1024/8,
    connectionType:"cellular4g"
  });
  const started=Date.now();
  await page.goto(AGENT,{waitUntil:"domcontentloaded",timeout:30000});
  await page.locator("#lang").waitFor({state:"visible"});
  await page.waitForFunction(()=>document.querySelector("#lang")?.textContent?.trim().length>0);
  const before=await page.locator("#lang").textContent();
  await page.locator("#lang").click();
  await page.waitForFunction(prev=>document.querySelector("#lang")?.textContent!==prev,before);
  const interactiveMs=Date.now()-started;
  fs.writeFileSync(path.join(out,"interactive-4g.json"),JSON.stringify({interactiveMs,viewport:360,network:"simulated-4g"},null,2));
  if(interactiveMs>2500)throw new Error(`First interactive time ${interactiveMs}ms exceeds 2500ms`);
  await context.close();
}

async function testAgent(browser,width,height){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();
  const bodies=[];
  let dialogTriggered=false;
  page.on("dialog",async d=>{dialogTriggered=true;await d.dismiss()});
  await setupAgent(page,bodies);
  await page.goto(AGENT+"/#invite=testcode&email=test%40example.com",{waitUntil:"networkidle"});
  await page.locator("#app").waitFor({state:"visible"});
  await page.locator("#hello").waitFor({state:"visible"});
  await assertNoOverflow(page,width,`agent-${width}-en`);
  if(dialogTriggered)throw new Error("Agent XSS dialog executed");
  const injected=await page.evaluate(p=>({text:document.body.textContent.includes(p),img:[...document.images].some(i=>i.getAttribute("src")==="x")}),payload);
  if(!injected.text||injected.img)throw new Error("Agent DB text was not safely rendered");

  for(const tab of ["home","leads","kits","wallet"]){
    await page.locator(`#nav button[data-tab="${tab}"]`).click();
    const active=await page.locator(`.section[data-page="${tab}"]`).evaluate(n=>n.classList.contains("active"));
    if(!active)throw new Error(`Agent tab ${tab} failed`);
  }

  // Existing Phase-0 behavior parity: coach, roleplay, Selling Kit and quote intake still work after the split.
  await page.locator('#nav button[data-tab="home"]').click();
  await page.locator("#coachInput").fill("Customer asks for a bouquet");
  await page.locator("#coachBtn").click();
  await page.waitForFunction(()=>document.querySelector("#coachOut")?.textContent?.includes("Safe coach response"));
  await page.locator(".train-practice").first().click();
  await page.waitForFunction(()=>document.querySelector("#scenario")?.textContent?.includes("Customer asks a question"));
  await page.locator("#roleAnswer").fill("A safe sales reply");
  await page.locator("#scoreRole").click();
  await page.waitForFunction(()=>document.querySelector("#roleResult")?.textContent?.includes("85"));
  await page.locator("#closeRole").click();

  await page.locator('#nav button[data-tab="kits"]').click();
  await page.locator(".btn").filter({hasText:"Today's Action"}).first().click();
  await page.waitForFunction(()=>document.querySelector("#dailyContent")?.textContent?.includes("Safe"));
  if(!bodies.some(b=>b.action==="daily_content"))throw new Error("Selling Kit daily_content was not requested");

  await page.locator('#nav button[data-tab="leads"]').click();
  await page.locator("#leadList .btn").first().click();
  await page.locator("#qBudget").fill("200");
  await page.locator("#refFile").setInputFiles({name:"reference.webp",mimeType:"image/webp",buffer:Buffer.from("test")});
  await page.locator("#quoteBtn").click();
  await page.waitForFunction(()=>document.querySelector("#quoteOut")?.textContent?.includes("AMBER"));
  if(!bodies.some(b=>b.action==="create")||!bodies.some(b=>b.action==="analyze"))throw new Error("Quote create/analyze path was not exercised");

  // Motion frame timing: section transition uses only transform/opacity; fail on sustained jank.
  const motion=await page.evaluate(async()=>{
    const samples=[];
    let last=performance.now();
    const started=last;
    return await new Promise(resolve=>{
      const step=now=>{
        samples.push(now-last);last=now;
        if(now-started>=550)return resolve(samples);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      document.querySelector('#nav button[data-tab="wallet"]')?.click();
    });
  });
  const sorted=[...motion].sort((a,b)=>a-b);
  const p95=sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]||0;
  const max=Math.max(...motion);
  fs.writeFileSync(path.join(out,`motion-${width}.json`),JSON.stringify({viewport:width,frames:motion.length,p95FrameMs:p95,maxFrameMs:max,thresholdMs:34},null,2));
  if(p95>34)throw new Error(`Motion p95 frame interval ${p95.toFixed(1)}ms exceeds 34ms at ${width}px`);

  await page.locator('#nav button[data-tab="leads"]').click();
  await page.locator("#leadName").fill(payload);
  await page.locator("#saveLead").click();
  await page.waitForTimeout(50);
  const created=bodies.find(b=>b.action==="create_lead");
  if(!created||created.customer_label!==payload)throw new Error("Agent lead payload did not round-trip safely");
  if(dialogTriggered)throw new Error("Agent input XSS dialog executed");

  await page.locator("#lang").click();
  await page.waitForTimeout(30);
  if(!await page.locator("html").evaluate(n=>n.lang.startsWith("zh")))throw new Error("Agent language did not switch to Chinese");
  await assertNoOverflow(page,width,`agent-${width}-zh`);

  if(width===430){
    // We are in zh after the bilingual layout assertion above. Toggle back to EN for the first two GIF frames.
    await page.locator("#lang").click();
    await page.locator('#nav button[data-tab="home"]').click();
    await page.screenshot({path:path.join(out,"gif-01-home-en.png"),fullPage:false});
    await page.locator('#nav button[data-tab="leads"]').click();
    await page.screenshot({path:path.join(out,"gif-02-leads-en.png"),fullPage:false});
    await page.locator("#lang").click();
    await page.locator('#nav button[data-tab="home"]').click();
    await page.screenshot({path:path.join(out,"gif-03-home-zh.png"),fullPage:false});
    await page.locator('#nav button[data-tab="wallet"]').click();
    await page.screenshot({path:path.join(out,"gif-04-wallet-zh.png"),fullPage:false});
  }else{
    await page.screenshot({path:path.join(out,`agent-${width}.png`),fullPage:true});
  }
  await context.close();
}

async function testRegistration(browser){
  const context=await browser.newContext({viewport:{width:360,height:800}});
  const page=await context.newPage();
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",r=>r.fulfill({status:200,contentType:"application/javascript",body:supabaseStub}));
  await page.route("**/config",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({url:"https://test.supabase.co",key:"pk_test"})}));
  let registered=false;
  let dashboardCalls=0;
  await page.route("https://test.supabase.co/**",async route=>{
    let body={};try{body=JSON.parse(route.request().postData()||"{}")}catch{}
    if(route.request().url().includes("/agent-auth"))return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,access_token:"access",refresh_token:"refresh"})});
    if(route.request().url().includes("/agent-session")){
      if(body.action==="register"){registered=true;return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,agent_code:"AG-NEW"})})}
      if(body.action==="dashboard"){
        dashboardCalls++;
        if(!registered)return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,needs_registration:true,user:{email:"new@example.com"}})});
        return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(agentDashboard())});
      }
    }
    return route.fulfill({status:200,contentType:"application/json",body:"{}"});
  });
  await page.goto(AGENT+"/#invite=testcode&email=new%40example.com",{waitUntil:"networkidle"});
  await page.locator("#register").waitFor({state:"visible"});
  await page.locator("#name").fill("New Agent");
  await page.locator("#regBtn").click();
  await page.locator("#app").waitFor({state:"visible"});
  if(!registered||dashboardCalls<2)throw new Error("Registration flow did not complete");
  await context.close();
}

async function testOwner(browser){
  const context=await browser.newContext({viewport:{width:430,height:932}});
  const page=await context.newPage();
  let dialogTriggered=false;
  page.on("dialog",async d=>{dialogTriggered=true;await d.dismiss()});
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",r=>r.fulfill({status:200,contentType:"application/javascript",body:supabaseStub}));
  await page.route("**/config",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({url:"https://test.supabase.co",key:"pk_test"})}));
  await page.route("https://test.supabase.co/**",async route=>{
    let body={};try{body=JSON.parse(route.request().postData()||"{}")}catch{}
    if(route.request().url().includes("/owner-auth"))return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,access_token:"access",refresh_token:"refresh"})});
    if(route.request().url().includes("/owner-session")){
      if(body.action==="dashboard")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
        dashboard:{profit_mode:"normal",net_margin_30d:.55,orders_today:1,revenue_today:200,avg_orders_per_active_agent:1,active_agents:2,dormant_agents:0,commission_liability:10,bonus_liability:0,serious_exceptions:1},
        exceptions:[{id:"e1",severity:"high",type:payload,summary:payload}]
      })});
      if(body.action==="quote_queue")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({queue:[{id:"q1",customer_budget:200,design_commitment:payload,status:payload,image_url:"javascript:alert(1)"}]})});
      return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true})});
    }
    return route.fulfill({status:404,body:"{}"});
  });
  await page.goto(OWNER+"/#owner_invite=testcode",{waitUntil:"networkidle"});
  await page.locator("#app").waitFor({state:"visible"});
  if(dialogTriggered)throw new Error("Owner XSS dialog executed");
  const state=await page.evaluate(p=>({
    exceptions:document.querySelector("#exceptions")?.textContent||"",
    quotes:document.querySelector("#quoteQueue")?.textContent||"",
    evilImages:[...document.images].filter(i=>i.getAttribute("src")==="x"||i.getAttribute("src")?.startsWith("javascript:")).length
  }),payload);
  if(!state.exceptions.includes(payload)||!state.quotes.includes(payload)||state.evilImages)throw new Error("Owner DB text/image URL was not safely rendered");
  await context.close();
}

const browser=await chromium.launch({headless:true});
try{
  await testFirstInteractive(browser);
  await testAgent(browser,360,800);
  await testAgent(browser,430,932);
  await testRegistration(browser);
  await testOwner(browser);
  console.log("PHASE0_BROWSER_E2E_PASS");
}finally{
  await browser.close();
}
