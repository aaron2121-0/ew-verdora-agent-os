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
    if(req.url().includes("/agent-ai"))return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({suggestion:"Safe coach response",provider:"fallback",scenario:"Customer asks a question",score:{score:85,feedback:"Good"},pass:true})});
    if(req.url().includes("/quote-intake"))return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true})});
    return route.fulfill({status:404,body:"{}"});
  });
}

async function assertNoOverflow(page,width,label){
  const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:window.innerWidth,blank:[...document.querySelectorAll("[data-i18n]")].filter(n=>!n.textContent.trim()).length}));
  if(metrics.scroll>width+1)throw new Error(`${label}: horizontal overflow ${metrics.scroll} > ${width}`);
  if(metrics.blank>0)throw new Error(`${label}: ${metrics.blank} untranslated/blank i18n nodes`);
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
    await page.locator('#nav button[data-tab="home"]').click();
    await page.screenshot({path:path.join(out,"gif-01-home-en.png"),fullPage:false});
    await page.locator("#lang").click();
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
  await testAgent(browser,360,800);
  await testAgent(browser,430,932);
  await testOwner(browser);
  console.log("PHASE0_BROWSER_E2E_PASS");
}finally{
  await browser.close();
}
