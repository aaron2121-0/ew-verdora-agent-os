import {chromium} from "playwright";
import fs from "node:fs";
import path from "node:path";

const AGENT=process.env.AGENT_URL;
if(!AGENT)throw new Error("Missing AGENT_URL");
const out=path.resolve("docs/phase2");
fs.mkdirSync(out,{recursive:true});
const payload='<img src=x onerror=alert(1)>';

const supabaseStub=String.raw`
(()=>{
  let currentSession=null;
  const auth={
    async setSession(tokens){currentSession={access_token:tokens.access_token,refresh_token:tokens.refresh_token,user:{id:"u-p2"}};return {data:{session:currentSession},error:null}},
    async getSession(){return {data:{session:currentSession},error:null}},
    onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},
    async signOut(){currentSession=null;return {error:null}},
    async signInWithOtp(){return {error:null}}
  };
  window.supabase={createClient(){return {auth,storage:{from(){return {async uploadToSignedUrl(){return {error:null}}}}}}}};
})();
`;

function baseDashboard(){
  return {
    ok:true,needs_registration:false,
    agent:{id:"a1",agent_code:"AG-ME",display_name:"Me",status:"active",tier:"active",commission_rate:.07,performance_score:78},
    mission:{target_orders:1,target_qualified_leads:3,target_quotes:2,target_followups:2,recommended_channels:["instagram"]},
    today_progress:{orders:0,qualified_leads:1,quotes:0,followups:0},
    phase1:{
      kuching_date:"2026-11-13",can_sell:true,
      money:{today_earned:20,pending:70,month_earned:320},
      tier_progress:{current_tier:"active",commission_rate:.07,orders_30d:21,performance_score:78,next_tier:"pro",next_orders_required:30,next_score_required:80,orders_remaining:9,score_remaining:2},
      due_followups:[],recent_leads:[],training_pending:false
    },
    campaigns:[],training:[],selling_kits:[],channel_playbooks:[],commissions:[],recent_leads:[],quote_requests:[]
  };
}
function salesDashboard(){
  const top=[];
  for(let i=1;i<=10;i++){
    top.push({
      rank:i,label:i===2?payload:"AG-"+String(i).padStart(2,"0"),
      tier:i<4?"pro":"active",revenue:1200-i*50,orders:12-i,is_me:i===4
    });
  }
  return {
    ok:true,cache_ttl_seconds:300,
    sales_dashboard:{
      month:"2026-11",as_of:"2026-11-13T01:00:00",
      sales:{revenue:2680,orders:8,aov:335,quote_conversion:.5,quotes:16,converted_quotes:8},
      previous:{revenue:2000,orders:5,aov:400,quote_conversion:.4,quotes:15,converted_quotes:6},
      changes:{revenue_pct:34,orders_pct:60,aov_pct:-16.3,quote_conversion_pct:25},
      daily:[
        {date:"2026-11-01",day:1,revenue:200,orders:1},
        {date:"2026-11-02",day:2,revenue:0,orders:0},
        {date:"2026-11-03",day:3,revenue:450,orders:1},
        {date:"2026-11-04",day:4,revenue:320,orders:1},
        {date:"2026-11-05",day:5,revenue:600,orders:2},
        {date:"2026-11-06",day:6,revenue:0,orders:0},
        {date:"2026-11-07",day:7,revenue:250,orders:1},
        {date:"2026-11-08",day:8,revenue:0,orders:0},
        {date:"2026-11-09",day:9,revenue:410,orders:1},
        {date:"2026-11-10",day:10,revenue:0,orders:0},
        {date:"2026-11-11",day:11,revenue:450,orders:1},
        {date:"2026-11-12",day:12,revenue:0,orders:0},
        {date:"2026-11-13",day:13,revenue:0,orders:0}
      ],
      tier_progress:{current_tier:"active",orders_30d:21,performance_score:78,next_tier:"pro",next_orders_required:30,next_score_required:80,orders_remaining:9,score_remaining:2},
      kpis:{quote_conversion:.5,followup_completion:.8,training_score:86,performance_score:78},
      team:{total_agents:18,active_agents:12},
      wallet:{pending:20,earned:120,payable:80,held:10,paid:650,reversed:0,refund_adjustments_pending:-7,refund_adjustments_applied:0},
      wallet_ledger:[
        {occurred_at:"2026-11-12T01:00:00Z",kind:"commission",status:"payable",amount:42,subtype:null},
        {occurred_at:"2026-11-11T01:00:00Z",kind:"adjustment",status:"pending",amount:-7,subtype:"refund_clawback"}
      ],
      leaderboard:{
        month:"2026-11",display_mode:"agent_code",top,
        me:{rank:4,label:"AG-ME",tier:"active",revenue:2680,orders:8,gap_to_next:170,is_me:true},
        team_count:18
      }
    }
  };
}

async function setup(page,counters){
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",r=>r.fulfill({status:200,contentType:"application/javascript",body:supabaseStub}));
  await page.route("**/config",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({url:"https://test.supabase.co",key:"pk_test"})}));
  await page.route("https://test.supabase.co/**",async route=>{
    let body={};try{body=JSON.parse(route.request().postData()||"{}")}catch{}
    const url=route.request().url();
    if(url.includes("/agent-auth"))return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,access_token:"access",refresh_token:"refresh"})});
    if(url.includes("/agent-session")){
      if(body.action==="dashboard"){
        counters.dashboard++;
        return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(baseDashboard())});
      }
      if(body.action==="sales_dashboard"){
        counters.sales++;
        return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(salesDashboard())});
      }
      return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true})});
    }
    return route.fulfill({status:200,contentType:"application/json",body:"{}"});
  });
}

async function noOverflow(page,width,label){
  const m=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));
  if(m.scroll>width+1)throw new Error(label+" overflow "+m.scroll+" > "+width);
}

async function runViewport(browser,width,height){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();
  const counters={dashboard:0,sales:0};
  let dialog=false;
  page.on("dialog",async d=>{dialog=true;await d.dismiss()});
  await setup(page,counters);
  await page.goto(AGENT+"/#invite=p2&email=p2%40example.com",{waitUntil:"networkidle"});
  await page.locator("#app").waitFor({state:"visible"});
  await page.locator('[data-tab="performance"]').click();
  await page.locator(".perf-metric-grid").waitFor({state:"visible"});
  await page.waitForFunction(()=>document.querySelector(".perf-metric-grid")?.textContent?.includes("2,680"));
  if(counters.sales!==1)throw new Error("initial sales_dashboard call count "+counters.sales);

  const body=await page.locator("#performancePage").textContent();
  for(const expected of ["2,680","8","335","50%","80%","86/100","78/100","Top Sales","AG-ME","650"]){
    if(!body.includes(expected))throw new Error("missing performance value "+expected);
  }
  if(!body.includes(payload)||dialog)throw new Error("leaderboard XSS text missing or executed");
  const evil=await page.evaluate(()=>[...document.images].some(i=>i.getAttribute("src")==="x"));
  if(evil)throw new Error("leaderboard XSS created image");
  if(await page.locator(".rank-gold").count()!==1||await page.locator(".rank-silver").count()!==1||await page.locator(".rank-bronze").count()!==1)throw new Error("top3 rank styling missing");
  if(!(await page.locator(".leaderboard-me").textContent()).includes("RM 170"))throw new Error("my rank gap missing");
  if(!(await page.locator(".wallet-card").textContent()).includes("RM -7"))throw new Error("refund clawback not visible");
  await noOverflow(page,width,"phase2-"+width+"-en");

  // Leave and return inside the 5-minute TTL: no additional sales_dashboard call.
  await page.locator('[data-tab="today"]').click();
  await page.locator('[data-tab="performance"]').click();
  await page.waitForTimeout(80);
  if(counters.sales!==1)throw new Error("5-minute cache missed, calls="+counters.sales);

  // App foreground forces refresh.
  await page.evaluate(()=>document.dispatchEvent(new Event("visibilitychange")));
  await page.waitForFunction(()=>window.performance.now()>0);
  for(let i=0;i<30&&counters.sales<2;i++)await page.waitForTimeout(50);
  if(counters.sales<2)throw new Error("foreground refresh did not fetch sales_dashboard");

  await page.locator("#lang").click();
  await page.waitForTimeout(40);
  if(!await page.locator("html").evaluate(n=>n.lang==="zh-CN"))throw new Error("Phase2 Chinese switch failed");
  const zh=await page.locator("#performancePage").textContent();
  if(!zh.includes("销售排行榜")||!zh.includes("佣金钱包")||!zh.includes("业绩 KPI"))throw new Error("Phase2 Chinese UI missing");
  await noOverflow(page,width,"phase2-"+width+"-zh");

  if(width===430){
    await page.locator("#lang").click();
    await page.screenshot({path:path.join(out,"gif-01-performance.png"),fullPage:false});
    await page.locator(".leaderboard-card").scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,"gif-02-leaderboard.png"),fullPage:false});
    await page.locator(".wallet-card").scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,"gif-03-wallet.png"),fullPage:false});
  }

  const motion=await page.evaluate(async()=>{
    const samples=[];let last=performance.now(),start=last;
    return await new Promise(resolve=>{
      const tick=now=>{samples.push(now-last);last=now;if(now-start>520)return resolve(samples);requestAnimationFrame(tick)};
      requestAnimationFrame(tick);
      document.querySelector('[data-tab="today"]')?.click();
      setTimeout(()=>document.querySelector('[data-tab="performance"]')?.click(),100);
    });
  });
  const sorted=[...motion].sort((a,b)=>a-b),p95=sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]||0;
  fs.writeFileSync(path.join(out,"motion-"+width+".json"),JSON.stringify({viewport:width,p95FrameMs:p95,maxFrameMs:Math.max(...motion),frames:motion.length},null,2));
  if(p95>34)throw new Error("Phase2 motion p95 "+p95);

  await context.close();
}

const browser=await chromium.launch({headless:true});
try{
  await runViewport(browser,360,800);
  await runViewport(browser,430,932);
  console.log("PHASE2_BROWSER_E2E_PASS");
}finally{
  await browser.close();
}
