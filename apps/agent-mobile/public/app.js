import {getStoredLanguage,setStoredLanguage,translate} from "./i18n.js";
import {createIcon} from "./icons.js";
import {setupBottomSheet,setButtonLoading,toast,vibrate} from "./components.js";
import {createPhase1UI} from "./phase1.js";
import {clearOrderDraft,prepareOrderDraftForUser} from "./draft.js";
import {initMotion} from "./motion.js";
import {setMotionLanguage,vendorMotion,clearMotion} from "./motion-vendor.js";
import {initAIOrb,resetAIOrb,refreshAIOrb,createAIProfile,aiStart,aiEnd} from "./ai-ui.js";
import {createAIChat} from "./ai-chat.js";

let CFG=null,sb=null,session=null,D=null,UI=null;
let lang=getStoredLanguage();
let scenario="",activeModule="";
let refreshBusy=null,aiChat=null,aiProfile=null,kyc=null;
const $=id=>document.getElementById(id);
const tr=(key,vars={})=>translate(lang,key,vars);

function friendlyError(code){
  const c=String(code||"").toLowerCase();
  if(c.includes("daily_limit"))return tr("aiLimit");
  if(c.includes("invalid_session")||c.includes("authentication_required")||c.includes("jwt"))return tr("errorSession");
  if(c.includes("selling_access_locked")||c.includes("quote_access_locked"))return tr("errorQuoteLocked");
  if(c.includes("lead_not_found"))return tr("errorLeadNotFound");
  if(c.includes("invalid_loss_reason"))return tr("errorInvalidLossReason");
  if(c.includes("lead_cannot_be_lost"))return tr("errorLeadCannotBeLost");
  if(c.includes("lead_not_lost"))return tr("errorLeadNotLost");
  if(c.includes("invalid_budget"))return tr("errorInvalidBudget");
  if(c.includes("reference")&&c.includes("missing"))return tr("errorReferenceRequired");
  if(c.includes("upload"))return tr("errorUpload");
  if(c.includes("network"))return tr("errorOfflineDraft");
  if(c.includes("exam_prerequisites_incomplete"))return tr("examPrerequisitesError");
  if(c.includes("question_bank_not_ready")||c.includes("exam_bank_not_ready"))return tr("trainingBankNotReady");
  if(c.includes("duplicate_answer")||c.includes("question_not_current"))return tr("answerAlreadySubmitted");
  if(c.includes("questions_remaining"))return tr("trainingQuestionsRemaining");
    if(c.includes("rate limit")||c.includes("over_email"))return tr("emailRateLimited");
  return tr("errorRequestFailed");
}

function applyI18n(){
  document.documentElement.lang=lang==="zh"?"zh-CN":"en";
  document.querySelectorAll("[data-i18n]").forEach(node=>{
    const key=node.dataset.i18n;if(key)node.textContent=tr(key);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach(node=>{
    const key=node.dataset.i18nAria;if(key)node.setAttribute("aria-label",tr(key));
  });
  const langBtn=$("lang");
  if(langBtn){
    langBtn.textContent="";
    langBtn.append(createIcon("languages",{size:18}),document.createTextNode(tr("languageName")));
  }
  const vm=vendorMotion();
  if(vm?.i18n?.[lang])vm.i18n[lang].orbLabel=tr("aiOpenChat");
  setMotionLanguage(lang);
  UI?.onLanguageChange();
  refreshAIOrb(tr);
  kyc?.onLanguageChange?.();
  const themeBtn=$("themeToggle");
  if(themeBtn){const dark=document.documentElement.dataset.theme==="dark";themeBtn.textContent=dark?"☀ "+tr("themeLight"):"☾ "+tr("themeDark");themeBtn.setAttribute("aria-label",tr("themeToggle"))}
}

let brandBgImport=null;
function mountBrandBg(target,options){
  if(!target)return;
  const ready=window.VerdoraMotion?.mountBrandBg?Promise.resolve():brandBgImport??=import("/vendor/motion-pack-v1/brand-bg.js");
  ready.then(()=>{if(target.isConnected)window.VerdoraMotion?.mountBrandBg?.(target,options)}).catch(()=>{});
}
window.__verdoraMountBrandBg=mountBrandBg;

function view(name){
  $("login").classList.toggle("hidden",name!=="login");
  $("register").classList.toggle("hidden",name!=="register");
  $("app").classList.toggle("hidden",name!=="app");
  $("nav").classList.toggle("hidden",name!=="app");
  $("logout").classList.toggle("hidden",name!=="app");
  $("topbar").classList.toggle("app-active",name==="app");
  $("aiProfileOpen")?.classList.toggle("hidden",name!=="app");
  $("identitySettingsBtn")?.classList.toggle("hidden",name!=="app"||!D?.kyc_status);\n  window.VerdoraMotion?.brandBg?.destroy?.();\n  if(name==="login")mountBrandBg($("login"),{placement:"tr",seed:20261114});
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
  let data={};try{data=await response.json()}catch{}
  if(!response.ok)throw new Error(String(data?.error||"request_failed"));
  return data;
}

async function ensureKyc(){
  if(kyc)return kyc;
  const {createKycExperience}=await import("./kyc.js");
  kyc=createKycExperience({
    getData:()=>D,
    getLang:()=>lang,
    tr,
    api:body=>fn("agent-session",body),
    rawUpload:async(uploadUrl,blob,contentType)=>{
      try{
        return await fetch(uploadUrl,{
          method:"POST",
          headers:{
            "Content-Type":contentType,
            "Authorization":"Bearer "+session.access_token,
            "apikey":CFG.key
          },
          body:blob,
          cache:"no-store"
        });
      }catch{throw new Error("network_error")}
    },
    onRefresh:refresh
  });
  kyc.bind();
  return kyc;
}

async function refresh(){
  if(refreshBusy)return refreshBusy;
  refreshBusy=(async()=>{
    const result=await fn("agent-session",{action:"dashboard"});
    D=result;
    const identity=await ensureKyc();
    if(result.needs_registration){
      view("register");
      if(result.kyc_required){await identity.sync();await identity.open({startStep:1})}
      return result;
    }
    view("app");
    await identity.sync();
    if(!UI){
      UI=createPhase1UI({
        getData:()=>D,
        getLang:()=>lang,
        getUserId:()=>session?.user?.id||"",
        tr,
        api:{
          agent:body=>fn("agent-session",body),
          quote:body=>fn("quote-intake",body),
          ai:body=>fn("agent-ai",body),
          training:body=>fn("agent-training",body),
          upload:async(created,file)=>{
            const uploaded=await sb.storage.from(created.bucket).uploadToSignedUrl(created.path,created.upload_token,file,{contentType:file.type||"image/jpeg"});
            if(uploaded.error)throw new Error("upload_failed");
            return uploaded;
          },
          friendlyError,
          openPractice
        },
        onRefresh:refresh,
        renderTodayTop:()=>identity.renderTodayCard()
      });
      await UI.init();
    }else UI.renderAll();
    if(!aiChat){
      const aiCall=body=>fn("agent-ai",body);
      aiChat=createAIChat({api:aiCall,tr,getData:()=>D,getLang:()=>lang});
      aiProfile=createAIProfile({api:aiCall,tr,getLang:()=>lang});
      initAIOrb({onClick:()=>aiChat?.open(),tr,getData:()=>D,getLang:()=>lang});
    }
    return result;
  })();
  try{return await refreshBusy}finally{refreshBusy=null}
}

async function openPractice(code){
  activeModule=code||((D?.training||[]).find(x=>x.status!=="passed")?.training_modules?.code)||"QUALIFY";
  $("roleSheet").classList.remove("hidden");
  $("scenario").textContent=tr("loading");
  $("roleResult").classList.add("hidden");
  $("roleAnswer").value="";
  $("scoreRole").classList.remove("hidden");
  $("roleResult").classList.remove("roleplay-practice-result");
  aiStart();
  try{
    const j=await fn("agent-ai",{action:"roleplay_generate",weakness:activeModule});
    scenario=j.scenario||"";
    $("scenario").textContent=scenario;
  }catch(e){$("scenario").textContent=friendlyError(e.message)}
  finally{aiEnd()}
}

function setupAppearance(){
  const stored=localStorage.getItem("ew_theme");
  const apply=()=>{const theme=localStorage.getItem("ew_theme")||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=theme;const b=$("themeToggle");if(b){b.textContent=theme==="dark"?"☀ "+tr("themeLight"):"☾ "+tr("themeDark");b.setAttribute("aria-label",tr("themeToggle"))}};
  if(stored&&stored!=="light"&&stored!=="dark")localStorage.removeItem("ew_theme");
  apply();matchMedia("(prefers-color-scheme: light)").addEventListener?.("change",()=>{if(!localStorage.getItem("ew_theme"))apply()});
  $("themeToggle")?.addEventListener("click",()=>{localStorage.setItem("ew_theme",document.documentElement.dataset.theme==="dark"?"light":"dark");apply()});
  $("aiProfileOpen")?.addEventListener("click",()=>aiProfile?.open());
  document.addEventListener("ew-open-ai",()=>aiChat?.open());
  document.addEventListener("ew-open-ai-question",event=>aiChat?.open(event.detail?.text||""));
}

function setupHandlers(){
  $("lang").addEventListener("click",()=>{
    lang=lang==="en"?"zh":"en";
    setStoredLanguage(lang);
    applyI18n();
  });
  $("googleBtn").addEventListener("click",async()=>{
    if(!sb){$("loginMsg").textContent=tr("genericError");return}
    setButtonLoading($("googleBtn"),true,tr("loading"));
    try{
      const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+"/"}});
      if(error)throw error;
    }catch(e){
      $("loginMsg").textContent=tr("googleFailed");
      setButtonLoading($("googleBtn"),false,tr("googleSignIn"));
    }
  });
  $("loginBtn").addEventListener("click",async()=>{
    const email=$("email").value.trim();
    if(!email){$("loginMsg").textContent=tr("enterEmail");return}
    setButtonLoading($("loginBtn"),true,tr("loading"));
    try{
      const {error}=await sb.auth.signInWithOtp({
        email,options:{shouldCreateUser:true,emailRedirectTo:location.origin}
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
  $("scoreRole").addEventListener("click",async()=>{
    const out=$("roleResult");out.classList.remove("hidden");out.textContent=tr("loading");
    setButtonLoading($("scoreRole"),true,tr("loading"));
    aiStart();
    try{
      const j=await fn("agent-ai",{action:"roleplay_score",scenario,answer:$("roleAnswer").value,module_code:activeModule});
      const score=j.score||{};
      const fb=j.feedback||score.feedback||{};
      const strengths=Array.isArray(fb.strengths)?fb.strengths:[];
      const improvements=Array.isArray(fb.improvements)?fb.improvements:[];
      const zh=lang==="zh";
      const line=(s)=>{const p=document.createElement("p");p.textContent=s;out.append(p)};
      const heading=(s)=>{const h=document.createElement("h3");h.textContent=s;out.append(h)};
      const points=(items)=>{const ul=document.createElement("ul");items.forEach(s=>{const li=document.createElement("li");li.textContent=String(s);ul.append(li)});out.append(ul)};
      out.replaceChildren();
      out.classList.add("roleplay-practice-result");
      heading((zh?"练习分数":"Practice score")+" · "+String(score.score??0)+"/100");
      line((j.provider==="gemini"?"Gemini":"Rule-based")+" · "+(zh?"仅供练习，不影响训练通过或认证":"Practice only · does not affect module or certification status"));
      const dims=[["requirement_discovery",zh?"需求了解":"Needs"],["customer_handling",zh?"客户沟通":"Customer handling"],["closing_ability",zh?"成交能力":"Closing"],["pricing_discipline",zh?"价格纪律":"Pricing"],["policy_compliance",zh?"规则遵守":"Policy"]];
      const grid=document.createElement("div");grid.className="roleplay-dimensions";
      dims.forEach(([key,label])=>{const r=document.createElement("div");r.textContent=label+" · "+String(score[key]??0)+"/20";grid.append(r)});
      out.append(grid);
      heading(zh?"做得好的":"What went well");points(strengths);
      heading(zh?"需要改进的":"What to improve");points(improvements);
      heading(zh?"示范回答":"Model answer");line(String(j.model_answer||score.model_answer||""));
      const again=document.createElement("button");
      again.type="button";again.className="btn btn-secondary btn-wide";again.textContent=zh?"再练一次":"Practice again";
      again.addEventListener("click",()=>openPractice(activeModule));
      out.append(again);
      $("scoreRole").classList.add("hidden");
      vibrate(12);
      await refresh();
    }catch(e){out.textContent=friendlyError(e.message)}
    finally{aiEnd();setButtonLoading($("scoreRole"),false,tr("submit"))}
  });
  $("logout").addEventListener("click",async()=>{
    const uid=session?.user?.id||"";
    if(uid)await clearOrderDraft(uid);
    UI?.training?.destroy?.();
    aiChat?.destroy();aiChat=null;aiProfile?.destroy();aiProfile=null;resetAIOrb();
    kyc?.destroy();kyc=null;
    await sb.auth.signOut();session=null;D=null;UI?.order?.destroy?.();UI=null;view("login");
  });
  const role=setupBottomSheet($("roleSheet"));
  $("closeRole").addEventListener("click",()=>role?.close());
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible"&&session&&UI){
      refresh().then(()=>UI?.onForeground?.()).catch(()=>{});
    }
  });
}

async function waitForSupabase(){
  if(window.supabase)return;
  await new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src="/vendor/supabase-2.119.0.js";
    script.async=true;script.crossOrigin="anonymous";
    const timer=setTimeout(()=>{script.remove();reject(new Error("supabase_sdk_unavailable"))},7000);
    script.addEventListener("load",()=>{clearTimeout(timer);resolve()},{once:true});
    script.addEventListener("error",()=>{clearTimeout(timer);reject(new Error("supabase_sdk_unavailable"))},{once:true});
    document.head.appendChild(script);
  });
  if(!window.supabase)throw new Error("supabase_sdk_unavailable");
}

async function bootstrap(){
  initMotion();
  setupAppearance();
  applyI18n();
  setupHandlers();
  try{
    await waitForSupabase();
    CFG=await fetch("/config",{cache:"no-store"}).then(r=>r.json());
    sb=window.supabase.createClient(CFG.url,CFG.key);

    const hash=new URLSearchParams((location.hash||"").replace(/^#/,""));
    const query=new URLSearchParams(location.search||"");
    if(hash.get("error")||query.get("error")){
      history.replaceState({},document.title,location.pathname||"/");
      $("loginMsg").textContent=tr("googleFailed");
    }
    const inviteCode=hash.get("invite");
    const inviteEmail=hash.get("email");
    if(inviteCode&&inviteEmail){
      view("login");$("email").value=inviteEmail;$("loginMsg").textContent=tr("secureSignIn");
      try{
        const r=await fetch(CFG.url+"/functions/v1/agent-auth",{
          method:"POST",headers:{"Content-Type":"application/json","apikey":CFG.key},
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
      if(session){try{await prepareOrderDraftForUser(session.user?.id||"");await refresh()}catch(e){view("login");$("loginMsg").textContent=friendlyError(e.message)}}
      else view("login");
    });

    const current=await sb.auth.getSession();
    session=current.data.session;
    if(session){try{await prepareOrderDraftForUser(session.user?.id||"");await refresh()}catch(e){view("login");$("loginMsg").textContent=friendlyError(e.message)}}
    else view("login");
  }catch{
    view("login");$("loginMsg").textContent=tr("genericError");
  }
}
bootstrap();
