import {chromium} from "playwright";

const AGENT=process.env.AGENT_URL||"https://agent-mobile-production.up.railway.app";

const supabaseStub=String.raw`
(()=>{
  let currentSession=null;
  try{currentSession=JSON.parse(localStorage.getItem("__draft_test_session")||"null")}catch{}
  const auth={
    async setSession(tokens){
      const id=String(tokens.access_token||"").includes("user-b")?"user-b":"user-a";
      currentSession={access_token:tokens.access_token,refresh_token:tokens.refresh_token,user:{id}};
      try{localStorage.setItem("__draft_test_session",JSON.stringify(currentSession))}catch{}
      return {data:{session:currentSession},error:null}
    },
    async getSession(){return {data:{session:currentSession},error:null}},
    onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},
    async signOut(){currentSession=null;try{localStorage.removeItem("__draft_test_session")}catch{};return {error:null}},
    async signInWithOtp(){return {error:null}}
  };
  window.supabase={createClient(){return {auth,storage:{from(){return {async uploadToSignedUrl(){return {error:null}}}}}}}};
})();
`;

function dashboard(){
  return {
    ok:true,needs_registration:false,
    agent:{id:"agent-test",agent_code:"AG-TEST",display_name:"Test Agent",status:"active",tier:"starter",commission_rate:.05,performance_score:55},
    mission:{target_orders:1,target_qualified_leads:2,target_quotes:1,target_followups:1,recommended_channels:["whatsapp"]},
    today_progress:{orders:0,qualified_leads:0,quotes:0,followups:0},
    phase1:{
      kuching_date:"2026-11-13",can_sell:true,
      money:{today_earned:0,pending:0,month_earned:0},
      tier_progress:{current_tier:"starter",commission_rate:.05,orders_30d:0,performance_score:55,next_tier:"active",next_orders_required:15,next_score_required:70,orders_remaining:15,score_remaining:15},
      due_followups:[],recent_leads:[],training_pending:false
    },
    campaigns:[],training:[],selling_kits:[],channel_playbooks:[],commissions:[],recent_leads:[],quote_requests:[]
  }
}

async function setup(page){
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",r=>r.fulfill({status:200,contentType:"application/javascript",body:supabaseStub}));
  await page.route("**/config",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({url:"https://test.supabase.co",key:"pk_test"})}));
  await page.route("https://test.supabase.co/**",async route=>{
    let body={};try{body=JSON.parse(route.request().postData()||"{}")}catch{}
    const url=route.request().url();
    if(url.includes("/agent-auth")){
      const email=String(body.email||"");
      const suffix=email.startsWith("b@")?"user-b":"user-a";
      return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,access_token:"access-"+suffix,refresh_token:"refresh-"+suffix})});
    }
    if(url.includes("/agent-session")&&body.action==="dashboard"){
      return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(dashboard())});
    }
    return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true})});
  });
}

async function login(page,email,code){
  await page.goto(AGENT+"/#invite="+encodeURIComponent(code)+"&email="+encodeURIComponent(email),{waitUntil:"networkidle"});
  await page.locator("#app").waitFor({state:"visible"});
}

async function idbKeys(page){
  return await page.evaluate(async()=>{
    const db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open("ew-verdora-agent-mobile",1);
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    const keys=await new Promise((resolve,reject)=>{
      const tx=db.transaction("draft_files","readonly");
      const req=tx.objectStore("draft_files").getAllKeys();
      req.onsuccess=()=>resolve(req.result.map(String));req.onerror=()=>reject(req.error);
    });
    db.close();return keys;
  });
}

const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  await setup(page);

  // A logs in and stores both text + reference-image draft.
  await login(page,"a@example.com","a-code");
  await page.locator('[data-tab="order"]').click();
  await page.locator('input[placeholder="e.g. Madam Wong"]').fill("Agent A Secret Customer");
  await page.getByRole("button",{name:"Next",exact:true}).click();
  await page.locator('input[type="file"]').setInputFiles({name:"a.webp",mimeType:"image/webp",buffer:Buffer.from("agent-a-private-reference")});
  await page.waitForTimeout(120);

  const aState=await page.evaluate(()=>({
    key:localStorage.getItem("ew_phase1_order_draft_v2:user-a"),
    legacy:localStorage.getItem("ew_phase1_order_draft_v1")
  }));
  if(!aState.key||!aState.key.includes("Agent A Secret Customer"))throw new Error("A user-scoped text draft missing");
  if(aState.legacy!==null)throw new Error("legacy unscoped draft key still present");
  if(!(await idbKeys(page)).includes("order-reference:user-a"))throw new Error("A user-scoped IndexedDB reference missing");

  // Explicit logout must clear A's current-user draft.
  await page.locator("#logout").click();
  await page.locator("#login").waitFor({state:"visible"});
  const afterLogout=await page.evaluate(()=>localStorage.getItem("ew_phase1_order_draft_v2:user-a"));
  if(afterLogout!==null)throw new Error("A localStorage draft survived logout");
  if((await idbKeys(page)).includes("order-reference:user-a"))throw new Error("A IndexedDB reference survived logout");

  // Simulate an abnormal prior session leaving a foreign A draft behind.
  await page.evaluate(async()=>{
    localStorage.setItem("ew_phase1_order_draft_v2:user-a",JSON.stringify({customerName:"STALE A SECRET",step:2,__user_id:"user-a"}));
    const db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open("ew-verdora-agent-mobile",1);
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    await new Promise((resolve,reject)=>{
      const tx=db.transaction("draft_files","readwrite");
      tx.objectStore("draft_files").put(new Blob(["stale-a"],{type:"image/webp"}),"order-reference:user-a");
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
    });
    db.close();
  });

  // B logs in: foreign A draft must be discarded before B's order wizard initializes.
  await login(page,"b@example.com","b-code");
  await page.locator('[data-tab="order"]').click();
  const input=page.locator('input[placeholder="e.g. Madam Wong"]');
  if((await input.inputValue())!=="")throw new Error("B can see A customer draft");
  if(await page.locator(".reference-picker.has-file").count())throw new Error("B can see A reference image");
  const bPrivacy=await page.evaluate(()=>({
    a:localStorage.getItem("ew_phase1_order_draft_v2:user-a"),
    b:localStorage.getItem("ew_phase1_order_draft_v2:user-b")
  }));
  if(bPrivacy.a!==null)throw new Error("foreign A localStorage draft not purged on B login");
  if((await idbKeys(page)).includes("order-reference:user-a"))throw new Error("foreign A IndexedDB draft not purged on B login");

  await context.close();
  console.log("DRAFT_USER_ISOLATION_PASS");
}finally{
  await browser.close();
}
