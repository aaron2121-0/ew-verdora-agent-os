import {chromium} from "playwright";
import fs from "node:fs";
import path from "node:path";

const AGENT=process.env.AGENT_URL;
if(!AGENT)throw new Error("Missing AGENT_URL");
const out=path.resolve("docs/phase1");
fs.mkdirSync(out,{recursive:true});
const payload='<img src=x onerror=alert(1)>';

const supabaseStub=String.raw`
(()=>{
  let currentSession=null;
  try{currentSession=JSON.parse(localStorage.getItem("__phase1_test_session")||"null")}catch{}
  const auth={
    async setSession(tokens){currentSession={access_token:tokens.access_token,refresh_token:tokens.refresh_token,user:{id:"u-test"}};try{localStorage.setItem("__phase1_test_session",JSON.stringify(currentSession))}catch{};return {data:{session:currentSession},error:null}},
    async getSession(){return {data:{session:currentSession},error:null}},
    onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},
    async signOut(){currentSession=null;try{localStorage.removeItem("__phase1_test_session")}catch{};return {error:null}},
    async signInWithOtp(){return {error:null}}
  };
  window.supabase={createClient(){return {auth,storage:{from(){return {async uploadToSignedUrl(){return {error:null}}}}}}}};
})();
`;

function dashboard(status="active"){
  const locked=["trainee","restricted","recovery","dormant","suspended"].includes(status);
  return {
    ok:true,needs_registration:false,
    agent:{id:"a1",agent_code:"AG-TEST",display_name:"Test Agent",status,tier:"active",commission_rate:.07,performance_score:76},
    mission:{target_orders:1,target_qualified_leads:3,target_quotes:2,target_followups:2,recommended_channels:["instagram"]},
    today_progress:{orders:0,qualified_leads:1,quotes:0,followups:0},
    phase1:{
      kuching_date:"2026-11-13",can_sell:!locked,
      money:{today_earned:32,pending:184,month_earned:620},
      tier_progress:{current_tier:"active",commission_rate:.07,orders_30d:21,performance_score:76,next_tier:"pro",next_orders_required:30,next_score_required:80,orders_remaining:9,score_remaining:4},
      due_followups:[
        {id:"l1",customer_label:payload,source:"instagram",occasion:"birthday",sales_category:"birthday",budget:220,next_followup_at:"2026-11-13T01:00:00Z",status:"follow_up"},
        {id:"l2",customer_label:"Madam Lee",source:"whatsapp",occasion:"anniversary",sales_category:"anniversary",budget:320,next_followup_at:"2026-11-13T02:00:00Z",status:"follow_up"}
      ],
      recent_leads:[
        {id:"l1",customer_label:payload,source:"instagram",occasion:"birthday",sales_category:"birthday",budget:220,status:"follow_up",created_at:"2026-11-12T10:00:00Z"},
        {id:"l3",customer_label:"Mr Tan",source:"whatsapp",occasion:"opening",sales_category:"opening",budget:500,status:"quoted",quote_id:"q3",quote_status:"sent",quote_price:500,order_id:"o3",order_status:"producing",payment_status:"paid",created_at:"2026-11-11T10:00:00Z"}
      ],
      training_pending:true
    },
    campaigns:[{id:"c1",title_en:"November Sales Sprint",title_zh:"十一月销售冲刺",completed_orders:2,target_orders:5,fixed_bonus:50,recommended_channels:["instagram"]}],
    training:[{status:"assigned",best_score:60,training_modules:{code:"QUALIFY",title_en:"Qualification practice",title_zh:"资格确认练习",required:true,active:true}}],
    selling_kits:[{code:"birthday",title_en:"Birthday outreach",title_zh:"生日卖货文案",content_en:{opening:"A clear birthday opening."},content_zh:{opening:"清楚的生日开场。"},recommended_channels:["instagram"]}],
    channel_playbooks:[{code:"instagram",title_en:"Instagram",title_zh:"Instagram",content_en:{goal:"Post once and follow up."},content_zh:{goal:"发一次并完成跟进。"}}],
    commissions:[{amount:32,status:"earned"},{amount:50,status:"payable"}],
    recent_leads:[],
    quote_requests:[]
  };
}

async function setup(page,{status="active"}={}){
  const bodies=[];
  await page.addInitScript(()=>{window.__wa=[];window.open=(url)=>{window.__wa.push(url);return {closed:false}}});
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",r=>r.fulfill({status:200,contentType:"application/javascript",body:supabaseStub}));
  await page.route("**/config",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({url:"https://test.supabase.co",key:"pk_test"})}));
  await page.route("https://test.supabase.co/**",async route=>{
    const req=route.request();let body={};try{body=JSON.parse(req.postData()||"{}")}catch{}
    bodies.push(body);
    if(req.url().includes("/agent-auth"))return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,access_token:"access",refresh_token:"refresh"})});
    if(req.url().includes("/agent-session")){
      if(body.action==="dashboard")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(dashboard(status))});
      if(body.action==="create_lead")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,lead:{id:"new-lead"}})});
      if(body.action==="complete_followup")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true})});
      if(body.action==="register")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,agent_code:"AG-NEW"})});
      return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true})});
    }
    if(req.url().includes("/quote-intake")){
      if(body.action==="create")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,request_id:"qr1",bucket:"agent-references",path:"u/qr1/ref.webp",upload_token:"upload"})});
      if(body.action==="analyze"||body.action==="status")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,quote_request:{id:"qr1",status:"underwritten",classification:"GREEN",budget_version_price:280,recommended_price:330,customer_note_en:"Approved quote.",customer_note_zh:"正式报价已准备。"}})});
      if(body.action==="accept_option")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,quote:{id:"q1",lead_id:"new-lead",quote_version:1,selling_price:body.option==="recommended"?330:280,status:"approved",valid_until:"2026-11-13T08:00:00Z",commission_rate_locked:.07}})});
    }
    if(req.url().includes("/agent-ai")){
      if(body.action==="roleplay_generate")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({scenario:"Customer says the price is high. What do you do?"})});
      if(body.action==="roleplay_score")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({score:{score:85,feedback:"Good"},pass:true,training:{passed:true}})});
      if(body.action==="daily_content")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({provider:"fallback",content:{post_copy:"Safe selling post",outreach_copy:"Safe outreach",followup_copy:"Safe follow-up"}})});
    }
    return route.fulfill({status:200,contentType:"application/json",body:"{}"});
  });
  return bodies;
}

async function openAgent(page){
  await page.goto(AGENT+"/#invite=testcode&email=test%40example.com",{waitUntil:"networkidle"});
  await page.locator("#app").waitFor({state:"visible"});
  await page.locator('#nav [data-tab="today"]').waitFor({state:"visible"});
}

async function noOverflow(page,width,label){
  const m=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth,blank:[...document.querySelectorAll("[data-i18n]")].filter(n=>!n.textContent.trim()).length}));
  if(m.scroll>width+1)throw new Error(label+" overflow "+m.scroll+" > "+width);
  if(m.blank)throw new Error(label+" blank i18n "+m.blank);
}

async function testNavAndToday(browser,width,height){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();let dialog=false;page.on("dialog",async d=>{dialog=true;await d.dismiss()});
  await setup(page);const started=Date.now();await openAgent(page);
  const labels=await page.locator("#nav .nav-label").allTextContents();
  for(const expected of ["Today","Customers","New Order","Training","Performance"])if(!labels.includes(expected))throw new Error("missing nav "+expected);
  const findMs=Date.now()-started;if(findMs>10000)throw new Error("primary navigation exceeded 10s");
  await page.waitForFunction(()=>{
    const text=document.querySelector(".money-card")?.textContent||"";
    return text.includes("RM 32")&&text.includes("RM 184")&&text.includes("RM 620");
  },null,{timeout:2500});
  const money=await page.locator(".money-card").textContent();
  if(!money.includes("9 orders left")||!money.includes("4 score points left"))throw new Error("tier progress missing real requirements");
  const injected=await page.evaluate(p=>({text:document.body.textContent.includes(p),evil:[...document.images].some(i=>i.getAttribute("src")==="x")}),payload);
  if(!injected.text||injected.evil||dialog)throw new Error("XSS payload executed or disappeared");
  await noOverflow(page,width,"phase1-"+width+"-en");
  await page.locator("#lang").click();await page.waitForTimeout(30);
  if(!await page.locator("html").evaluate(n=>n.lang==="zh-CN"))throw new Error("Chinese switch failed");
  await noOverflow(page,width,"phase1-"+width+"-zh");
  await page.locator("#lang").click();
  if(width===430)await page.screenshot({path:path.join(out,"gif-01-today.png"),fullPage:false});
  const motion=await page.evaluate(async()=>{
    const samples=[];let last=performance.now(),start=last;
    return await new Promise(resolve=>{const tick=now=>{samples.push(now-last);last=now;if(now-start>520)return resolve(samples);requestAnimationFrame(tick)};requestAnimationFrame(tick);document.querySelector('[data-tab="customers"]')?.click()});
  });
  const sorted=[...motion].sort((a,b)=>a-b),p95=sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]||0;
  fs.writeFileSync(path.join(out,"motion-"+width+".json"),JSON.stringify({viewport:width,p95FrameMs:p95,maxFrameMs:Math.max(...motion),frames:motion.length},null,2));
  if(p95>34)throw new Error("motion p95 exceeds 34ms: "+p95);
  await context.close();
}

async function testOrder(browser){
  const context=await browser.newContext({viewport:{width:430,height:932}});
  const page=await context.newPage();const bodies=await setup(page);await openAgent(page);
  await page.locator('[data-tab="order"]').click();
  await page.locator('input[placeholder="e.g. Madam Wong"]').fill("Madam Wong");
  await page.getByRole("button",{name:"Next",exact:true}).click();
  await page.locator('input[type="file"]').setInputFiles({name:"reference.webp",mimeType:"image/webp",buffer:Buffer.from("test")});
  await page.getByRole("button",{name:/Upload reference & get quote/}).click();
  await page.locator(".quote-compare").waitFor({state:"visible"});
  if(!bodies.some(x=>x.action==="create")||!bodies.some(x=>x.action==="analyze"))throw new Error("official quote create/analyze not called");
  await page.screenshot({path:path.join(out,"gif-02-quote.png"),fullPage:false});
  await page.locator(".quote-option").nth(1).getByRole("button",{name:"Use this price"}).click();
  await page.getByRole("button",{name:"Send to customer"}).waitFor({state:"visible"});
  await page.screenshot({path:path.join(out,"gif-03-send.png"),fullPage:false});
  await page.getByRole("button",{name:"Send to customer"}).click();
  await page.waitForTimeout(220);
  const wa=await page.evaluate(()=>window.__wa);
  if(!wa.length||!wa[0].startsWith("https://wa.me/?text="))throw new Error("WhatsApp send missing");
  const draft=await page.evaluate(()=>localStorage.getItem("ew_phase1_order_draft_v1"));
  if(draft!==null)throw new Error("draft was not cleared after send");
  if(!bodies.some(x=>x.action==="accept_option"&&x.option==="recommended"))throw new Error("server quote option not accepted");
  await page.screenshot({path:path.join(out,"gif-04-after-send.png"),fullPage:false});
  await context.close();
}

async function testDraftRestore(browser){
  const context=await browser.newContext({viewport:{width:360,height:800}});
  const page=await context.newPage();await setup(page);await openAgent(page);
  await page.locator('[data-tab="order"]').click();
  await page.locator('input[placeholder="e.g. Madam Wong"]').fill("Draft Customer");
  await page.getByRole("button",{name:"Next",exact:true}).click();
  await page.locator('input[type="file"]').setInputFiles({name:"draft.webp",mimeType:"image/webp",buffer:Buffer.from("draft")});
  await page.waitForTimeout(120);
  await page.reload({waitUntil:"networkidle"});
  await page.locator("#app").waitFor({state:"visible"});
  await page.locator('[data-tab="order"]').click();
  await page.locator(".reference-picker.has-file").waitFor({state:"visible"});
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem("ew_phase1_order_draft_v1")||"{}"));
  if(restored.customerName!=="Draft Customer"||restored.step!==2)throw new Error("text draft not restored");
  await context.close();
}

async function testLocked(browser){
  const context=await browser.newContext({viewport:{width:360,height:800}});
  const page=await context.newPage();await setup(page,{status:"recovery"});await openAgent(page);
  await page.locator('[data-tab="order"]').click();
  await page.locator("#lockSheet").waitFor({state:"visible"});
  const text=await page.locator("#lockSheet").textContent();
  if(!text.includes("Selling access is locked"))throw new Error("recovery lock explanation missing");
  await context.close();
}

const browser=await chromium.launch({headless:true});
try{
  await testNavAndToday(browser,360,800);
  await testNavAndToday(browser,430,932);
  await testOrder(browser);
  await testDraftRestore(browser);
  await testLocked(browser);
  console.log("PHASE1_BROWSER_E2E_PASS");
}finally{await browser.close()}
