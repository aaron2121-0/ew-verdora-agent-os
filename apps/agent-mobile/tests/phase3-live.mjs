import {chromium} from "playwright";
import fs from "node:fs";
import path from "node:path";

const AGENT=process.env.AGENT_URL||"https://agent-mobile-production.up.railway.app";
const out=path.resolve("docs/phase3");
fs.mkdirSync(out,{recursive:true});
const XSS='<img src=x onerror=alert(1)>';

const supabaseStub=String.raw`
(()=>{
  let currentSession=null;
  const auth={
    async setSession(tokens){currentSession={access_token:tokens.access_token,refresh_token:tokens.refresh_token,user:{id:"u-phase3"}};return {data:{session:currentSession},error:null}},
    async getSession(){return {data:{session:currentSession},error:null}},
    onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},
    async signOut(){currentSession=null;return {error:null}},
    async signInWithOtp(){return {error:null}}
  };
  window.supabase={createClient(){return {auth,storage:{from(){return {async uploadToSignedUrl(){return {error:null}}}}}}}};
})();
`;

const skills=["LEAD-FINDING","QUALIFY","REFERENCE","OBJECTION","CLOSING","PAYMENT"];
function dashboard(){
  const modules=[
    ["CORE-BRAND","Core Brand","品牌规则"],["LEAD-FINDING","Lead Finding","寻找客户"],
    ["QUALIFY","Qualify","需求确认"],["REFERENCE","Reference","参考图规则"],
    ["OBJECTION","Objection","价格异议"],["CLOSING","Closing","成交跟进"],["PAYMENT","Payment","付款规则"]
  ];
  return {
    ok:true,needs_registration:false,
    agent:{id:"agent-p3",agent_code:"AG-P3",display_name:"Training Agent",status:"trainee",tier:"starter",commission_rate:.05,performance_score:0},
    mission:{target_orders:1,target_qualified_leads:2,target_quotes:1,target_followups:1,recommended_channels:["whatsapp"]},
    today_progress:{orders:0,qualified_leads:0,quotes:0,followups:0},
    phase1:{kuching_date:"2026-11-13",can_sell:false,money:{today_earned:0,pending:0,month_earned:0},
      tier_progress:{current_tier:"starter",commission_rate:.05,orders_30d:0,performance_score:0,next_tier:"active",next_orders_required:15,next_score_required:70,orders_remaining:15,score_remaining:70},
      due_followups:[],recent_leads:[],training_pending:true},
    training:modules.map(([code,title_en,title_zh],i)=>({status:"passed",attempts:1,best_score:90+i,completed_at:"2026-11-10T00:00:00Z",training_modules:{code,title_en,title_zh,category:"core",pass_score:80,content_en:{},content_zh:{}}})),
    campaigns:[],selling_kits:[],channel_playbooks:[],commissions:[],recent_leads:[],quote_requests:[]
  };
}

function summary(){
  return {
    date:"2026-11-13",status:"not_started",score:null,passed:null,streak:2,answered:0,total:5,
    skills:skills.map((skill,i)=>({skill,answers:6+i,accuracy:[.83,.75,.92,.67,.88,1][i]})),
    exam_passed:false,remaining_required:0,question:null
  };
}
function question(position,total=5){
  return {
    position,skill:skills[(position-1)%skills.length],
    question_en:position===1?"Which option safely follows EW VERDORA rules? "+XSS:"Training question "+position,
    question_zh:position===1?"哪一个选项符合 EW VERDORA 规则？ "+XSS:"训练题 "+position,
    options_en:position===1?[XSS,"Use official approved flow","Bypass the system","Use private payment"]:["Option A","Option B","Option C","Option D"],
    options_zh:position===1?[XSS,"使用官方批准流程","绕过系统","使用私人付款"]:["选项 A","选项 B","选项 C","选项 D"],
    served_at:new Date().toISOString(),
    deadline_at:new Date(Date.now()+45000).toISOString()
  };
}

async function setup(page,state){
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",r=>r.fulfill({status:200,contentType:"application/javascript",body:supabaseStub}));
  await page.route("**/config",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({url:"https://test.supabase.co",key:"pk_test"})}));
  await page.route("https://test.supabase.co/**",async route=>{
    let body={};try{body=JSON.parse(route.request().postData()||"{}")}catch{}
    const url=route.request().url();
    if(url.includes("/agent-auth"))return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,access_token:"access",refresh_token:"refresh"})});
    if(url.includes("/agent-session")&&body.action==="dashboard")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(dashboard())});
    if(url.includes("/agent-training")){
      state.calls.push(body);
      const now=new Date().toISOString();
      if(body.action==="today"&&body.start!==true){
        return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,today:state.dailyDone?{...summary(),status:"completed",score:100,passed:true,streak:3,answered:5}:summary(),server_date:"2026-11-13",server_now:now})});
      }
      if(body.action==="today"&&body.start===true){
        const pos=Math.min(5,state.dailyAnswered+1);
        const t={...summary(),status:"active",answered:state.dailyAnswered,question:question(pos)};
        return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,today:t,server_date:"2026-11-13",server_now:now})});
      }
      if(body.action==="answer"){
        state.dailyAnswered++;
        return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,answer:{correct:true,timed_out:false,explanation_en:"Approved flow keeps pricing and payment controlled.",explanation_zh:"批准流程能确保定价和付款受控。",answered:state.dailyAnswered,total:5},server_date:"2026-11-13",server_now:now})});
      }
      if(body.action==="finish"){
        state.dailyDone=true;
        return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,result:{score:100,passed:true,streak:3,weak_skills:[],micro_training_audit_written:false},server_date:"2026-11-13",server_now:now})});
      }
      if(body.action==="exam_start"){
        state.examStarted=true;
        return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,exam:{attempt_id:"11111111-1111-4111-8111-111111111111",attempt_no:1,status:"active",total:20,question:question(1,20)},server_date:"2026-11-13",server_now:now})});
      }
      if(body.action==="exam_answer"){
        return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,answer:{correct:false,timed_out:false,explanation_en:"Review the approved workflow before trying again.",explanation_zh:"请复习批准流程后再尝试。",answered:20,total:20},server_date:"2026-11-13",server_now:now})});
      }
      if(body.action==="exam_finish"){
        return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,result:{score:80,passed:false,agent_status_before:"trainee",agent_status_after:"trainee",certification:null},server_date:"2026-11-13",server_now:now})});
      }
    }
    return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true})});
  });
}

async function openAgent(page){
  await page.goto(AGENT+"/#invite=phase3&email=p3%40example.com",{waitUntil:"networkidle"});
  await page.locator("#app").waitFor({state:"visible"});
}
async function noOverflow(page,width,label){
  const m=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));
  if(m.scroll>width+1)throw new Error(label+" overflow "+m.scroll+" > "+width);
}

async function run(browser,width,height,full=false){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();
  const state={calls:[],dailyAnswered:0,dailyDone:false,examStarted:false};
  let dialog=false;
  page.on("dialog",async d=>{dialog=true;await d.dismiss()});
  await setup(page,state);await openAgent(page);
  await page.locator('[data-tab="training"]').click();
  await page.locator(".training3-hero").waitFor({state:"visible"});
  const initial=await page.locator("#trainingPage").textContent();
  for(const x of ["5 questions for today","Skill accuracy","Certification exam","85%"]){
    if(!initial.includes(x))throw new Error("Phase3 home missing "+x);
  }
  if(await page.locator(".training3-timer").count())throw new Error("timer started before explicit daily start");
  if(!state.calls.some(x=>x.action==="today"&&x.start===false))throw new Error("summary today request missing");
  if(state.calls.some(x=>x.action==="today"&&x.start===true))throw new Error("daily attempt started on page entry");
  await noOverflow(page,width,"phase3-home-"+width);

  await page.getByRole("button",{name:"Start today’s MCQ"}).click();
  await page.locator(".training3-question-card").waitFor({state:"visible"});
  const qText=await page.locator(".training3-question-card").textContent();
  if(!qText.includes(XSS))throw new Error("XSS payload not rendered as literal text");
  if(dialog)throw new Error("XSS dialog executed");
  if(await page.locator('img[src="x"]').count())throw new Error("XSS image node created");
  const sec=Number(await page.locator(".training3-timer-ring strong").textContent());
  if(!(sec>=43&&sec<=45))throw new Error("server-calibrated timer not near 45: "+sec);
  const startCall=state.calls.find(x=>x.action==="today"&&x.start===true);
  if("date" in startCall)throw new Error("client sent trusted date to training API");
  if(full)await page.screenshot({path:path.join(out,"gif-01-question.png"),fullPage:false});

  // Complete five daily questions.
  for(let p=1;p<=5;p++){
    await page.locator(".training3-option").nth(1).click();
    await page.locator(".training3-feedback").waitFor({state:"visible"});
    const fb=await page.locator(".training3-feedback").textContent();
    if(!fb.includes("Approved flow")&&!fb.includes("批准流程"))throw new Error("post-answer explanation missing");
    if(p<5){
      await page.getByRole("button",{name:"Next question"}).click();
      await page.locator(".training3-question-card").waitFor({state:"visible"});
    }else{
      await page.getByRole("button",{name:"Finish today’s training"}).click();
    }
  }
  await page.locator(".training3-result").waitFor({state:"visible"});
  if(!(await page.locator(".training3-result").textContent()).includes("100%"))throw new Error("daily result missing");
  await page.getByRole("button",{name:"Back to training"}).click();
  await page.locator(".training3-daily-done").waitFor({state:"visible"});
  if(full)await page.screenshot({path:path.join(out,"gif-02-daily-done.png"),fullPage:false});

  // Exam fail at 80% must visibly preserve status semantics.
  await page.getByRole("button",{name:"Start certification exam"}).click();
  await page.locator(".training3-question-card").waitFor({state:"visible"});
  await page.locator(".training3-option").nth(0).click();
  await page.getByRole("button",{name:"Finish exam"}).click();
  await page.locator(".training3-result").waitFor({state:"visible"});
  const examResult=await page.locator(".training3-result").textContent();
  if(!examResult.includes("80%")||!examResult.includes("status stays unchanged"))throw new Error("80% exam fail/status message missing");
  if(full)await page.screenshot({path:path.join(out,"gif-03-exam-fail.png"),fullPage:false});

  // Chinese parity and mobile overflow.
  await page.getByRole("button",{name:"Back to training"}).click();
  await page.locator(".training3-hero").waitFor({state:"visible"});
  await page.locator("#lang").click();await page.waitForTimeout(40);
  const zh=await page.locator("#trainingPage").textContent();
  if(!zh.includes("每日训练")||!zh.includes("技能正确率")||!zh.includes("认证考试"))throw new Error("Chinese training UI missing");
  await noOverflow(page,width,"phase3-zh-"+width);

  // No request payload may contain an answer key or client clock/date override.
  const bodies=JSON.stringify(state.calls);
  if(/correct_index|option_order|question_id/.test(bodies))throw new Error("training request leaked answer-bearing field");
  if(state.calls.some(x=>Object.hasOwn(x,"date")||Object.hasOwn(x,"server_now")||Object.hasOwn(x,"deadline_at")))throw new Error("client attempted to control server timing/date");

  const motion=await page.evaluate(async()=>{
    const samples=[];let last=performance.now(),start=last;
    return await new Promise(resolve=>{
      const tick=now=>{samples.push(now-last);last=now;if(now-start>520)return resolve(samples);requestAnimationFrame(tick)};
      requestAnimationFrame(tick);
      document.querySelector('[data-tab="today"]')?.click();
      setTimeout(()=>document.querySelector('[data-tab="training"]')?.click(),100);
    });
  });
  const sorted=[...motion].sort((a,b)=>a-b),p95=sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]||0;
  fs.writeFileSync(path.join(out,"motion-"+width+".json"),JSON.stringify({viewport:width,p95FrameMs:p95,maxFrameMs:Math.max(...motion),frames:motion.length},null,2));
  if(p95>34)throw new Error("Phase3 motion p95 "+p95);

  await context.close();
}

const browser=await chromium.launch({headless:true});
try{
  await run(browser,360,800,false);
  await run(browser,430,932,true);
  console.log("PHASE3_BROWSER_E2E_PASS");
}finally{
  await browser.close();
}
