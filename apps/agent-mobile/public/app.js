import {I18N,getStoredLanguage,setStoredLanguage,translate} from "./i18n.js";
import {clear,element,emptyState,setButtonLoading,setupBottomSheet,stagger,toast,vibrate} from "./components.js";

let sb=null;
let CFG=null;
let session=null;
let D=null;
let lang=getStoredLanguage();
let activeLead=null;
let activeRequest=null;
let scenario="";
let activeModule="QUALIFY";
const $=id=>document.getElementById(id);
const tr=(key,vars={})=>translate(lang,key,vars);

const SOURCES=[
  ["instagram","sourceInstagram"],["facebook","sourceFacebook"],["threads","sourceThreads"],
  ["xiaohongshu","sourceXiaohongshu"],["whatsapp","sourceWhatsapp"],
  ["personal_network","sourcePersonal"],["corporate_outreach","sourceCorporate"]
];
const CATEGORIES=[
  ["birthday","categoryBirthday"],["anniversary","categoryAnniversary"],["condolence","categoryCondolence"],
  ["opening","categoryOpening"],["proposal","categoryProposal"],["graduation","categoryGraduation"],
  ["corporate","categoryCorporate"],["wedding","categoryWedding"],["general","categoryGeneral"]
];
const COMMITMENTS=[
  ["adapted","commitmentAdapted"],["reference","commitmentReference"],["exact","commitmentExact"]
];

function friendlyError(code){
  const c=String(code||"").toLowerCase();
  if(c.includes("invalid_session")||c.includes("authentication_required")||c.includes("jwt"))return tr("errorSession");
  if(c.includes("selling_access_locked"))return tr("errorLocked");
  if(c.includes("lead_not_found"))return tr("errorLeadNotFound");
  if(c.includes("invalid_budget"))return tr("errorInvalidBudget");
  if(c.includes("upload"))return tr("errorUpload");
  if(c.includes("rate limit")||c.includes("over_email"))return tr("emailRateLimited");
  return tr("errorRequestFailed");
}

function statusLabel(value){
  const key={
    new:"statusNew",qualified:"statusQualified",follow_up:"statusFollowUp",quoted:"statusQuoted",
    won:"statusWon",lost:"statusLost",trainee:"statusTrainee",active:"statusActive",
    restricted:"statusRestricted",recovery:"statusRecovery",dormant:"statusDormant",suspended:"statusSuspended"
  }[String(value||"").toLowerCase()];
  return key?tr(key):String(value||"");
}

function applyI18n(){
  document.documentElement.lang=lang==="zh"?"zh-Hans":"en";
  document.querySelectorAll("[data-i18n]").forEach(node=>{
    const key=node.dataset.i18n;
    if(key)node.textContent=tr(key);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach(node=>{
    const key=node.dataset.i18nAria;
    if(key)node.setAttribute("aria-label",tr(key));
  });
  $("lang").textContent=tr("languageName");
  populateSelects();
  setStoredLanguage(lang);
  if(D)render();
}

function option(select,value,label){
  const o=document.createElement("option");
  o.value=value;o.textContent=label;select.appendChild(o);
}
function populateSelects(){
  const source=$("source"),category=$("category"),commit=$("commit");
  const sourceValue=source?.value,catValue=category?.value,commitValue=commit?.value;
  if(source){clear(source);SOURCES.forEach(([v,k])=>option(source,v,tr(k)));if(sourceValue)source.value=sourceValue}
  if(category){clear(category);CATEGORIES.forEach(([v,k])=>option(category,v,tr(k)));if(catValue)category.value=catValue}
  if(commit){clear(commit);COMMITMENTS.forEach(([v,k])=>option(commit,v,tr(k)));if(commitValue)commit.value=commitValue}
}

function view(name){
  $("login").classList.toggle("hidden",name!=="login");
  $("register").classList.toggle("hidden",name!=="register");
  $("app").classList.toggle("hidden",name!=="app");
  $("nav").classList.toggle("hidden",name!=="app");
  $("logout").classList.toggle("hidden",name==="login");
}

async function fn(path,body){
  if(!session)throw new Error("authentication_required");
  let response;
  try{
    response=await fetch(CFG.url+"/functions/v1/"+path,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer "+session.access_token,
        "apikey":CFG.key
      },
      body:JSON.stringify(body||{})
    });
  }catch{
    throw new Error("network_error");
  }
  let data={};
  try{data=await response.json()}catch{}
  if(!response.ok)throw new Error(String(data?.error||"request_failed"));
  return data;
}

async function refresh(){
  const result=await fn("agent-session",{action:"dashboard"});
  if(result.needs_registration){view("register");return}
  D=result;
  view("app");
  render();
}

function renderCampaigns(){
  const list=$("campaignList");
  const rows=D.campaigns||[];
  $("campaignCard").classList.toggle("hidden",rows.length===0);
  clear(list);
  if(!rows.length)return;
  rows.forEach(x=>{
    const content=lang==="zh"?x.content_zh:x.content_en;
    const item=element("div",{className:"item"});
    const title=element("strong",{text:lang==="zh"?x.title_zh:x.title_en});
    const meta=element("div",{className:"muted",text:[
      ...(x.recommended_channels||[]),
      (Number(x.completed_orders)||0)+"/"+(Number(x.target_orders)||0)+" "+tr("ordersWord"),
      tr("bonusRm",{amount:Number(x.fixed_bonus||0).toFixed(0)})
    ].join(" · ")});
    item.append(title,meta);
    if(content?.message)item.append(element("div",{className:"section-gap",text:content.message}));
    list.append(item);
  });
  stagger(list.children);
}

function renderTraining(){
  const list=$("trainingList");
  const rows=D.training||[];
  clear(list);
  if(!rows.length){list.append(emptyState({title:tr("noTraining")}));return}
  rows.forEach(x=>{
    const module=x.training_modules||{};
    const content=lang==="zh"?module.content_zh:module.content_en;
    const item=element("div",{className:"item"});
    const row=element("div",{className:"row row-between"});
    const left=element("div");
    left.append(
      element("strong",{text:lang==="zh"?module.title_zh:module.title_en}),
      element("div",{className:"muted",text:statusLabel(x.status)+" · "+Number(x.best_score||0)+"/100"})
    );
    row.append(left);
    if(x.status==="passed"){
      row.append(element("span",{className:"badge badge-success",text:"✓ "+tr("passed")}));
    }else{
      const b=element("button",{className:"btn btn-secondary btn-small",text:tr("practice"),attrs:{type:"button"}});
      b.addEventListener("click",()=>openPractice(module.code));
      row.append(b);
    }
    item.append(row);
    if(Array.isArray(content?.lesson)&&content.lesson.length){
      item.append(element("div",{className:"muted section-gap",text:content.lesson.join(" · ")}));
    }
    list.append(item);
  });
  stagger(list.children);
}

function renderLeads(){
  const list=$("leadList");
  const leads=D.recent_leads||[];
  const requests=D.quote_requests||[];
  const qmap=new Map();
  requests.forEach(q=>{if(!qmap.has(q.lead_id))qmap.set(q.lead_id,q)});
  clear(list);
  if(!leads.length){list.append(emptyState({title:tr("noLeads")}));return}

  leads.forEach(lead=>{
    const qr=qmap.get(lead.id);
    let label=tr("quote"),disabled=false;
    if(qr?.status==="manual_review"){label=tr("reviewPending");disabled=true}
    else if(qr?.status==="underwritten")label=tr("quoteReady");
    else if(qr?.status==="quote_created"){label=tr("quoted");disabled=true}

    const item=element("div",{className:"item"});
    const row=element("div",{className:"row row-between"});
    const left=element("div");
    left.append(
      element("strong",{text:(lead.sales_category||"general")+" · "+(lead.source||"")}),
      element("div",{className:"muted",text:"RM "+(lead.budget??"—")+" · "+statusLabel(lead.status)})
    );
    const button=element("button",{className:"btn btn-secondary btn-small",text:label,attrs:{type:"button",disabled}});
    if(!disabled){
      button.addEventListener("click",()=>{
        activeLead=lead.id;
        activeRequest=qr?.id||null;
        $("quoteOut").classList.add("hidden");
        if(qr?.status==="underwritten"){
          $("uploadQuoteForm").classList.add("hidden");
          $("readyQuoteForm").classList.remove("hidden");
          $("readyQuoteText").textContent=[
            lang==="zh"?qr.customer_note_zh:qr.customer_note_en,
            tr("budgetLabel",{amount:Number(qr.budget_version_price||0).toFixed(0)}),
            tr("recommendedLabel",{amount:Number(qr.recommended_price||0).toFixed(0)})
          ].filter(Boolean).join("\n");
          $("budgetQuoteBtn").textContent=tr("budgetButton",{amount:Number(qr.budget_version_price||0).toFixed(0)});
          $("recommendedQuoteBtn").textContent=tr("recommendedButton",{amount:Number(qr.recommended_price||0).toFixed(0)});
        }else{
          $("uploadQuoteForm").classList.remove("hidden");
          $("readyQuoteForm").classList.add("hidden");
          $("qBudget").value=lead.budget||"";
        }
        $("quoteSheet").classList.remove("hidden");
      });
    }
    row.append(left,button);
    item.append(row);
    list.append(item);
  });
  stagger(list.children);
}

function renderKits(){
  const list=$("kitList");
  clear(list);
  const mission=D.mission||{};
  (D.selling_kits||[]).forEach(k=>{
    const content=lang==="zh"?k.content_zh:k.content_en;
    const channels=k.recommended_channels||[];
    const chosen=(mission.recommended_channels||[]).find(x=>channels.includes(x))||channels[0]||"personal_network";
    const card=element("div",{className:"kit"});
    const row=element("div",{className:"row row-between"});
    const left=element("div");
    left.append(
      element("strong",{text:lang==="zh"?k.title_zh:k.title_en}),
      element("div",{className:"muted",text:channels.join(" · ")})
    );
    const b=element("button",{className:"btn btn-secondary btn-small",text:tr("todaysAction"),attrs:{type:"button"}});
    b.addEventListener("click",async()=>{
      const out=$("dailyContent");
      out.classList.remove("hidden");
      out.textContent=tr("loading");
      setButtonLoading(b,true,tr("loading"));
      try{
        const j=await fn("agent-ai",{action:"daily_content",kit_code:k.code,channel:chosen});
        const x=j.content||{};
        out.textContent=[
          tr("channelLine",{channel:chosen}),
          x.post_copy||"",
          "DM: "+(x.outreach_copy||""),
          "Follow-up: "+(x.followup_copy||""),
          (x.actions||[]).map((v,i)=>(i+1)+". "+v).join("\n")
        ].filter(Boolean).join("\n\n");
      }catch(e){out.textContent=friendlyError(e.message)}
      finally{setButtonLoading(b,false,tr("todaysAction"))}
    });
    row.append(left,b);
    card.append(row);
    if(content?.opening)card.append(element("div",{className:"section-gap",text:content.opening}));
    list.append(card);
  });
  stagger(list.children);
}

function renderPlaybooks(){
  const list=$("playList");
  clear(list);
  (D.channel_playbooks||[]).forEach(p=>{
    const content=lang==="zh"?p.content_zh:p.content_en;
    const card=element("div",{className:"kit"});
    card.append(
      element("strong",{text:lang==="zh"?p.title_zh:p.title_en}),
      element("div",{className:"muted",text:content?.goal||""})
    );
    list.append(card);
  });
  stagger(list.children);
}

function renderCommissions(){
  const list=$("commList");
  const rows=D.commissions||[];
  clear(list);
  if(!rows.length){list.append(emptyState({title:tr("noCommissions")}));return}
  rows.forEach(c=>{
    const item=element("div",{className:"item"});
    item.append(
      element("strong",{text:"RM "+Number(c.amount||0).toFixed(2)}),
      element("div",{className:"muted",text:statusLabel(c.status)})
    );
    list.append(item);
  });
  stagger(list.children);
}

function render(){
  const a=D.agent||{};
  const mission=D.mission||{};
  $("hello").textContent=tr("hello",{name:a.display_name||a.agent_code||""});
  $("tier").textContent=String(a.tier||"").toUpperCase()+" · "+(Number(a.commission_rate||0)*100).toFixed(1).replace(".0","")+"%";
  const p=D.today_progress||{};
  $("orders").textContent=(p.orders??0)+" / "+(mission.target_orders??0);
  $("leadsN").textContent=(p.qualified_leads??0)+" / "+(mission.target_qualified_leads??0);
  $("quotes").textContent=(p.quotes??0)+" / "+(mission.target_quotes??0);
  $("follow").textContent=(p.followups??0)+" / "+(mission.target_followups??0);

  const missionParts=[
    tr("systemDiagnosis",{diagnosis:mission.ai_diagnosis||"baseline"}),
    tr("recommended",{channels:(mission.recommended_channels||[]).join(", ")||"—"})
  ];
  if(Number(mission.expected_order_probability)>0){
    missionParts.push(tr("probability",{pct:(Number(mission.expected_order_probability)*100).toFixed(0)}));
  }
  $("mission").textContent=missionParts.join(" · ");
  $("walletTier").textContent=String(a.tier||"").toUpperCase();
  $("walletScore").textContent=String(a.performance_score||0);

  const locked=["trainee","restricted","recovery","dormant","suspended"].includes(String(a.status||"").toLowerCase());
  document.querySelectorAll('#nav button[data-tab="leads"]').forEach(b=>{
    b.disabled=locked;
    b.setAttribute("aria-disabled",String(locked));
  });

  renderCampaigns();
  renderTraining();
  renderLeads();
  renderKits();
  renderPlaybooks();
  renderCommissions();
}

async function openPractice(code){
  activeModule=code||((D.training||[]).find(x=>x.status!=="passed")?.training_modules?.code)||"QUALIFY";
  $("roleSheet").classList.remove("hidden");
  $("scenario").textContent=tr("loading");
  $("roleResult").classList.add("hidden");
  $("roleAnswer").value="";
  try{
    const j=await fn("agent-ai",{action:"roleplay_generate",weakness:activeModule});
    scenario=j.scenario||"";
    $("scenario").textContent=scenario;
  }catch(e){$("scenario").textContent=friendlyError(e.message)}
}

async function acceptQuote(choice){
  const out=$("quoteOut");
  out.classList.remove("hidden");
  out.textContent=tr("loading");
  const button=choice==="budget"?$("budgetQuoteBtn"):$("recommendedQuoteBtn");
  const original=button.textContent;
  setButtonLoading(button,true,tr("loading"));
  try{
    const j=await fn("quote-intake",{action:"accept_option",request_id:activeRequest,option:choice});
    out.textContent=tr("quoteCreated",{
      price:Number(j.quote.selling_price).toFixed(0),
      rate:(Number(j.quote.commission_rate_locked)*100).toFixed(1).replace(".0","")
    });
    vibrate(12);
    await refresh();
    $("readyQuoteForm").classList.add("hidden");
  }catch(e){out.textContent=friendlyError(e.message)}
  finally{setButtonLoading(button,false,original)}
}

function setupHandlers(){
  $("lang").addEventListener("click",()=>{lang=lang==="en"?"zh":"en";applyI18n()});

  $("loginBtn").addEventListener("click",async()=>{
    const email=$("email").value.trim();
    if(!email){$("loginMsg").textContent=tr("enterEmail");return}
    setButtonLoading($("loginBtn"),true,tr("loading"));
    try{
      const {error}=await sb.auth.signInWithOtp({
        email,
        options:{shouldCreateUser:true,emailRedirectTo:"https://owner-mobile-production.up.railway.app"}
      });
      if(error)throw error;
      $("loginMsg").textContent=tr("linkSent");
    }catch(e){$("loginMsg").textContent=friendlyError(e?.message)}
    finally{setButtonLoading($("loginBtn"),false,tr("sendSignIn"))}
  });

  $("regBtn").addEventListener("click",async()=>{
    setButtonLoading($("regBtn"),true,tr("saving"));
    try{
      const j=await fn("agent-session",{action:"register",display_name:$("name").value,language:lang});
      $("regMsg").textContent=tr("savedAgent",{code:j.agent_code||""});
      vibrate(12);
      await refresh();
    }catch(e){$("regMsg").textContent=friendlyError(e.message)}
    finally{setButtonLoading($("regBtn"),false,tr("startTraining"))}
  });

  $("saveLead").addEventListener("click",async()=>{
    setButtonLoading($("saveLead"),true,tr("saving"));
    try{
      await fn("agent-session",{
        action:"create_lead",source:$("source").value,sales_category:$("category").value,
        customer_label:$("leadName").value,occasion:$("occasion").value,budget:$("budget").value
      });
      $("leadMsg").textContent=tr("leadSaved");
      toast(tr("leadSaved"));
      vibrate(12);
      await refresh();
    }catch(e){$("leadMsg").textContent=friendlyError(e.message)}
    finally{setButtonLoading($("saveLead"),false,tr("saveLead"))}
  });

  $("coachBtn").addEventListener("click",async()=>{
    const out=$("coachOut");
    out.classList.remove("hidden");out.textContent=tr("loading");
    setButtonLoading($("coachBtn"),true,tr("loading"));
    try{
      const j=await fn("agent-ai",{action:"coach",customer_message:$("coachInput").value});
      out.textContent=String(j.suggestion||"")+(j.provider==="fallback"?"\n\n["+tr("fallbackMode")+"]":"");
    }catch(e){out.textContent=friendlyError(e.message)}
    finally{setButtonLoading($("coachBtn"),false,tr("askCoach"))}
  });

  $("practice").addEventListener("click",()=>openPractice());
  $("scoreRole").addEventListener("click",async()=>{
    const out=$("roleResult");out.classList.remove("hidden");out.textContent=tr("loading");
    setButtonLoading($("scoreRole"),true,tr("loading"));
    try{
      const j=await fn("agent-ai",{action:"roleplay_score",scenario,answer:$("roleAnswer").value,module_code:activeModule});
      if(j.certification_pending_ai){
        out.textContent=tr("practiceOnly")+"\n"+tr("scoreLine",{score:j.score.score})+"\n"+String(j.message||j.score.feedback||"");
      }else{
        const pass=(j.training&&typeof j.training.passed==="boolean")?j.training.passed:j.pass;
        out.textContent=(pass?tr("pass"):tr("retrain"))+" · "+tr("scoreLine",{score:j.score.score})+"\n"+String(j.score.feedback||"");
      }
      vibrate(j.pass?12:[20,40,20]);
      await refresh();
    }catch(e){out.textContent=friendlyError(e.message)}
    finally{setButtonLoading($("scoreRole"),false,tr("submit"))}
  });

  $("closeRole").addEventListener("click",()=>$("roleSheet").classList.add("hidden"));
  $("closeQuote").addEventListener("click",()=>$("quoteSheet").classList.add("hidden"));
  $("budgetQuoteBtn").addEventListener("click",()=>acceptQuote("budget"));
  $("recommendedQuoteBtn").addEventListener("click",()=>acceptQuote("recommended"));

  $("quoteBtn").addEventListener("click",async()=>{
    const out=$("quoteOut");out.classList.remove("hidden");out.textContent=tr("loading");
    setButtonLoading($("quoteBtn"),true,tr("loading"));
    try{
      const file=$("refFile").files[0];
      if(!file)throw new Error("reference_required");
      const created=await fn("quote-intake",{
        action:"create",lead_id:activeLead,customer_budget:Number($("qBudget").value),
        design_commitment:$("commit").value,content_type:file.type
      });
      const uploaded=await sb.storage.from(created.bucket).uploadToSignedUrl(created.path,created.upload_token,file,{contentType:file.type});
      if(uploaded.error)throw new Error("upload_failed");
      const j=await fn("quote-intake",{action:"analyze",request_id:created.request_id});
      const q=j.quote_request||{};
      out.textContent=tr("quoteAnalysis",{
        classification:q.classification||"RED",
        note:lang==="zh"?(q.customer_note_zh||""):(q.customer_note_en||""),
        recommended:q.recommended_price?tr("quoteRecommendedSuffix",{amount:q.recommended_price}):""
      });
    }catch(e){
      out.textContent=e.message==="reference_required"?tr("referenceRequired"):friendlyError(e.message);
    }finally{setButtonLoading($("quoteBtn"),false,tr("uploadAnalyze"))}
  });

  $("logout").addEventListener("click",async()=>{await sb.auth.signOut();session=null;D=null;view("login")});

  document.querySelectorAll("#nav button").forEach(button=>button.addEventListener("click",()=>{
    if(button.disabled)return;
    document.querySelectorAll("#nav button").forEach(x=>x.classList.toggle("active",x===button));
    document.querySelectorAll(".section").forEach(section=>section.classList.toggle("active",section.dataset.page===button.dataset.tab));
  }));

  setupBottomSheet($("roleSheet"));
  setupBottomSheet($("quoteSheet"));
}

async function waitForSupabase(){
  if(window.supabase)return;
  await new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async=true;
    script.crossOrigin="anonymous";
    const timer=setTimeout(()=>{script.remove();reject(new Error("supabase_sdk_unavailable"))},7000);
    script.addEventListener("load",()=>{clearTimeout(timer);resolve()},{once:true});
    script.addEventListener("error",()=>{clearTimeout(timer);reject(new Error("supabase_sdk_unavailable"))},{once:true});
    document.head.appendChild(script);
  });
  if(!window.supabase)throw new Error("supabase_sdk_unavailable");
}

async function bootstrap(){
  applyI18n();
  setupHandlers();
  try{
    await waitForSupabase();
    const config=await fetch("/config",{cache:"no-store"}).then(r=>r.json());
    CFG=config;
    window.CFG=config;
    sb=window.supabase.createClient(config.url,config.key);

    const hash=new URLSearchParams((location.hash||"").replace(/^#/,""));
    const inviteCode=hash.get("invite");
    const inviteEmail=hash.get("email");

    if(inviteCode&&inviteEmail){
      view("login");
      $("email").value=inviteEmail;
      $("loginMsg").textContent=tr("secureSignIn");
      try{
        const r=await fetch(config.url+"/functions/v1/agent-auth",{
          method:"POST",
          headers:{"Content-Type":"application/json","apikey":config.key},
          body:JSON.stringify({action:"invite_session",email:inviteEmail,code:inviteCode})
        });
        let j={};try{j=await r.json()}catch{}
        if(!r.ok||!j.access_token||!j.refresh_token)throw new Error("access_link_failed");
        const {error}=await sb.auth.setSession({access_token:j.access_token,refresh_token:j.refresh_token});
        if(error)throw new Error("session_failed");
        history.replaceState({},document.title,location.pathname||"/");
        $("loginMsg").textContent="";
      }catch{
        history.replaceState({},document.title,location.pathname||"/");
        $("loginMsg").textContent=tr("accessLinkInvalid");
      }
    }

    sb.auth.onAuthStateChange(async(_event,next)=>{
      session=next;
      if(session){
        try{await refresh()}catch(e){console.error("refresh_failed");view("login");$("loginMsg").textContent=friendlyError(e.message)}
      }else view("login");
    });

    const current=await sb.auth.getSession();
    session=current.data.session;
    if(session){
      try{await refresh()}catch(e){view("login");$("loginMsg").textContent=friendlyError(e.message)}
    }else view("login");
  }catch{
    view("login");
    $("loginMsg").textContent=tr("genericError");
  }
}

bootstrap();
