
let sb,session=null,D=null,lang=localStorage.getItem("ew_lang")||"en",activeLead=null,activeRequest=null,scenario="",activeModule="QUALIFY";
const T={en:{login:"Agent Login",loginD:"Open the one-time Agent Access Link issued by EW VERDORA Owner. Email magic-link login is disabled to avoid redirect and rate-limit failures.",send:"Send sign-in link",register:"Create Agent Profile",registerD:"No manager approval. Training is assigned automatically.",start:"Start training",today:"TODAY",orders:"Orders",leads:"Qualified Leads",quotes:"Quotes",follow:"Follow-ups",training:"Required Training",practice:"AI Practice",coach:"AI Sales Coach",ask:"Ask AI Coach",newLead:"New Lead",save:"Save Lead",recent:"Recent Leads",kits:"Selling Kit",channels:"Channel Strategy",wallet:"Wallet",tierL:"Tier",score:"Score",comm:"Commission History",home:"Home",leadsTab:"Leads",kitsTab:"Selling Kit",role:"AI Roleplay",submit:"Submit",quote:"Reference Quote",analyze:"Upload & Analyze"},zh:{login:"代理安全登录",loginD:"请使用 Owner 发出的一次性安全登录链接。Email Magic Link 已停用，避免跳转错误和邮件限流。",send:"发送登录链接",register:"建立代理账号",registerD:"不需要经理审核，系统会自动分配培训。",start:"开始培训",today:"今天",orders:"订单",leads:"有效 Leads",quotes:"报价",follow:"跟进",training:"必修培训",practice:"AI 练习",coach:"AI 销售教练",ask:"问 AI Coach",newLead:"新 Lead",save:"保存 Lead",recent:"最近 Leads",kits:"Selling Kit",channels:"渠道策略",wallet:"佣金钱包",tierL:"等级",score:"评分",comm:"佣金记录",home:"首页",leadsTab:"Leads",kitsTab:"Selling Kit",role:"AI 情境训练",submit:"提交",quote:"参考图报价",analyze:"上传并分析"}};
const $=id=>document.getElementById(id);
function applyLang(){document.querySelectorAll("[data-t]").forEach(e=>{let k=e.dataset.t;if(T[lang][k])e.textContent=T[lang][k]});$("lang").textContent=lang==="en"?"中文":"EN";localStorage.setItem("ew_lang",lang);if(D)render()}
$("lang").onclick=()=>{lang=lang==="en"?"zh":"en";applyLang()};
function view(x){$("login").classList.toggle("hidden",x!=="login");$("register").classList.toggle("hidden",x!=="register");$("app").classList.toggle("hidden",x!=="app");$("nav").classList.toggle("hidden",x!=="app");$("logout").classList.toggle("hidden",x==="login")}
async function fn(path,body){if(!session)throw Error("Not signed in");let r=await fetch(CFG.url+"/functions/v1/"+path,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token,"apikey":CFG.key},body:JSON.stringify(body||{})});let j=await r.json();if(!r.ok)throw Error(j.error||"Request failed");return j}
async function refresh(){let j=await fn("agent-session",{action:"dashboard"});if(j.needs_registration){view("register");return}D=j;view("app");render()}
function render(){let a=D.agent,m=D.mission||{};$("hello").textContent=(lang==="zh"?"你好，":"Hi, ")+(a.display_name||a.agent_code);$("tier").textContent=String(a.tier).toUpperCase()+" · "+(Number(a.commission_rate)*100).toFixed(1).replace(".0","")+"%";let p=D.today_progress||{};$("orders").textContent=(p.orders??0)+" / "+(m.target_orders??0);$("leadsN").textContent=(p.qualified_leads??0)+" / "+(m.target_qualified_leads??0);$("quotes").textContent=(p.quotes??0)+" / "+(m.target_quotes??0);$("follow").textContent=(p.followups??0)+" / "+(m.target_followups??0);$("mission").textContent=(lang==="zh"?"系统诊断：":"System diagnosis: ")+(m.ai_diagnosis||"baseline")+" · "+(lang==="zh"?"建议渠道：":"Recommended: ")+((m.recommended_channels||[]).join(", ")||"—")+(Number(m.expected_order_probability)>0?" · "+(lang==="zh"?"至少一单概率目标约 ":"Target ≥1-order probability ")+(Number(m.expected_order_probability)*100).toFixed(0)+"%":"");$("walletTier").textContent=String(a.tier).toUpperCase();$("walletScore").textContent=String(a.performance_score||0);
let cps=D.campaigns||[];$("campaignCard").classList.toggle("hidden",!cps.length);$("campaignList").innerHTML=cps.map(x=>{let ct=lang==="zh"?x.content_zh:x.content_en;return "<div class=item><b>"+(lang==="zh"?x.title_zh:x.title_en)+"</b><div class=muted>"+(x.recommended_channels||[]).join(" · ")+" · "+x.completed_orders+"/"+x.target_orders+" orders · Bonus RM "+Number(x.fixed_bonus||0).toFixed(0)+"</div><div style='font-size:13px;margin-top:6px'>"+(ct&&ct.message||"")+"</div></div>"}).join("");let tr=D.training||[];$("trainingList").innerHTML=tr.length?tr.map(x=>{let tm=x.training_modules||{},ct=lang==="zh"?tm.content_zh:tm.content_en,less=(ct&&ct.lesson||[]).join(" · ");return "<div class=item><div class=row style='justify-content:space-between'><div><b>"+(lang==="zh"?tm.title_zh:tm.title_en)+"</b><div class=muted>"+x.status+" · "+(x.best_score||0)+"/100</div></div>"+(x.status==="passed"?"<span class=pill>✓</span>":"<button class='btn small train-practice' data-code='"+tm.code+"'>Practice</button>")+"</div><div class=muted style='margin-top:6px'>"+less+"</div></div>"}).join(""):"<div class='item muted'>—</div>";document.querySelectorAll(".train-practice").forEach(b=>b.onclick=()=>openPractice(b.dataset.code));
const salesLocked=["trainee","restricted","dormant","suspended"].includes(a.status);document.querySelectorAll("#nav button[data-tab=leads]").forEach(b=>{b.disabled=salesLocked;b.style.opacity=salesLocked?".35":"1"});let ls=D.recent_leads||[],qrs=D.quote_requests||[],qmap={};qrs.forEach(q=>{if(!qmap[q.lead_id])qmap[q.lead_id]=q});$("leadList").innerHTML=ls.length?ls.map(x=>{let qr=qmap[x.id],label="Quote",disabled="",rid="";if(qr){rid=qr.id;if(qr.status==="manual_review") {label="Review Pending";disabled="disabled";} else if(qr.status==="underwritten"){label="Quote Ready";} else if(qr.status==="quote_created"){label="Quoted";disabled="disabled";}}return "<div class=item><div class=row style='justify-content:space-between'><div><b>"+(x.sales_category||"general")+" · "+x.source+"</b><div class=muted>RM "+(x.budget||"—")+" · "+x.status+"</div></div><button class='btn small qopen' "+disabled+" data-id='"+x.id+"' data-request='"+rid+"' data-budget='"+(x.budget||"")+"'>"+label+"</button></div></div>"}).join(""):"<div class='item muted'>—</div>";document.querySelectorAll(".qopen:not([disabled])").forEach(b=>b.onclick=()=>{activeLead=b.dataset.id;activeRequest=b.dataset.request||null;let qr=activeRequest?qrs.find(x=>x.id===activeRequest):null;$("quoteOut").classList.add("hidden");if(qr&&qr.status==="underwritten"){$("uploadQuoteForm").classList.add("hidden");$("readyQuoteForm").classList.remove("hidden");$("readyQuoteText").textContent=(lang==="zh"?qr.customer_note_zh:qr.customer_note_en)+"\nBudget: RM "+Number(qr.budget_version_price||0).toFixed(0)+"\nRecommended: RM "+Number(qr.recommended_price||0).toFixed(0);$("budgetQuoteBtn").textContent="Budget RM "+Number(qr.budget_version_price||0).toFixed(0);$("recommendedQuoteBtn").textContent="Recommended RM "+Number(qr.recommended_price||0).toFixed(0)}else{$("uploadQuoteForm").classList.remove("hidden");$("readyQuoteForm").classList.add("hidden");$("qBudget").value=b.dataset.budget||""}$("quoteSheet").classList.remove("hidden")});
$("kitList").innerHTML=(D.selling_kits||[]).map(k=>{let ct=lang==="zh"?k.content_zh:k.content_en;let ch=((m.recommended_channels||[]).find(x=>(k.recommended_channels||[]).includes(x)))||(k.recommended_channels||[])[0]||"personal_network";return "<div class=kit><div class=row style='justify-content:space-between'><div><b>"+(lang==="zh"?k.title_zh:k.title_en)+"</b><div class=muted>"+(k.recommended_channels||[]).join(" · ")+"</div></div><button class='btn small make-content' data-code='"+k.code+"' data-channel='"+ch+"'>"+(lang==="zh"?"今日打法":"Today\'s Action")+"</button></div><div style='font-size:13px;margin-top:6px'>"+(ct&&ct.opening||"")+"</div></div>"}).join("");document.querySelectorAll(".make-content").forEach(b=>b.onclick=async()=>{let o=$("dailyContent");o.classList.remove("hidden");o.textContent="...";try{let j=await fn("agent-ai",{action:"daily_content",kit_code:b.dataset.code,channel:b.dataset.channel});let x=j.content||{};o.textContent=(lang==="zh"?"平台：":"Channel: ")+b.dataset.channel+"\n\n"+(x.post_copy||"")+"\n\nDM: "+(x.outreach_copy||"")+"\n\nFollow-up: "+(x.followup_copy||"")+"\n\n"+((x.actions||[]).map((v,i)=>(i+1)+". "+v).join("\n"))}catch(e){o.textContent=e.message}});
$("playList").innerHTML=(D.channel_playbooks||[]).map(p=>{let c=lang==="zh"?p.content_zh:p.content_en;return "<div class=kit><b>"+(lang==="zh"?p.title_zh:p.title_en)+"</b><div class=muted>"+(c&&c.goal||"")+"</div></div>"}).join("");
let cs=D.commissions||[];$("commList").innerHTML=cs.length?cs.map(c=>"<div class=item><b>RM "+Number(c.amount).toFixed(2)+"</b><div class=muted>"+c.status+"</div></div>").join(""):"<div class='item muted'>—</div>"}
let loginPending=false;
$("loginBtn").onclick=async()=>{
  if(loginPending)return;
  const em=$("email").value.trim();
  if(!em){$("loginMsg").textContent=lang==="zh"?"请输入 Email。":"Enter your email.";return}
  loginPending=true;
  const btn=$("loginBtn");
  btn.disabled=true;
  btn.textContent=lang==="zh"?"发送中...":"Sending...";
  $("loginMsg").textContent="";
  try{
    const {error}=await sb.auth.signInWithOtp({
      email:em,
      options:{
        shouldCreateUser:true,
        emailRedirectTo:"https://owner-mobile-production.up.railway.app"
      }
    });
    if(error)throw error;
    $("loginMsg").textContent=lang==="zh"?"登录链接已发送，请检查邮箱。":"Sign-in link sent. Check your email.";
    btn.textContent=lang==="zh"?"已发送":"Link sent";
  }catch(e){
    const m=String(e?.message||"");
    if(/rate limit|security purposes/i.test(m)){
      $("loginMsg").textContent=lang==="zh"
        ?"邮件登录服务暂时限流。请不要重复点击，稍后再试。"
        :"Email sign-in is temporarily rate-limited. Please do not keep tapping; try again shortly.";
      let left=60;
      btn.disabled=true;
      const timer=setInterval(()=>{
        left--;
        btn.textContent=(lang==="zh"?"稍后重试 ":"Retry in ")+left+"s";
        if(left<=0){
          clearInterval(timer);
          btn.disabled=false;
          btn.textContent=lang==="zh"?"发送登录链接":"Send sign-in link";
          loginPending=false;
        }
      },1000);
    }else{
      $("loginMsg").textContent=m||"Unable to send sign-in link.";
      btn.disabled=false;
      btn.textContent=lang==="zh"?"发送登录链接":"Send sign-in link";
      loginPending=false;
    }
  }
};
$("regBtn").onclick=async()=>{try{let j=await fn("agent-session",{action:"register",display_name:$("name").value,language:lang});$("regMsg").textContent="✓ "+(j.agent_code||"");await refresh()}catch(e){$("regMsg").textContent=e.message}};
$("saveLead").onclick=async()=>{try{await fn("agent-session",{action:"create_lead",source:$("source").value,sales_category:$("category").value,customer_label:$("leadName").value,occasion:$("occasion").value,budget:$("budget").value});$("leadMsg").textContent="✓";await refresh()}catch(e){$("leadMsg").textContent=e.message}};
$("coachBtn").onclick=async()=>{let o=$("coachOut");o.classList.remove("hidden");o.textContent="...";try{let j=await fn("agent-ai",{action:"coach",customer_message:$("coachInput").value});o.textContent=j.suggestion+(j.provider==="fallback"?"\n\n[Fallback mode]":"")}catch(e){o.textContent=e.message}};
async function openPractice(code){activeModule=code||((D.training||[]).find(x=>x.status!=="passed")?.training_modules?.code)||"QUALIFY";$("roleSheet").classList.remove("hidden");$("scenario").textContent="...";$("roleResult").classList.add("hidden");try{let j=await fn("agent-ai",{action:"roleplay_generate",weakness:activeModule});scenario=j.scenario;$("scenario").textContent=scenario}catch(e){$("scenario").textContent=e.message}}$("practice").onclick=()=>openPractice();
$("scoreRole").onclick=async()=>{let o=$("roleResult");o.classList.remove("hidden");o.textContent="...";try{let j=await fn("agent-ai",{action:"roleplay_score",scenario:scenario,answer:$("roleAnswer").value,module_code:activeModule});if(j.certification_pending_ai){o.textContent=(lang==="zh"?"练习模式 · 尚未正式认证\n":"PRACTICE ONLY · Certification pending\n")+"Score "+j.score.score+"/100\n"+(j.message||j.score.feedback||"");}else{let finalPass=(j.training&&typeof j.training.passed==="boolean")?j.training.passed:j.pass;o.textContent=(finalPass?"PASS ✓":"RETRAIN · ")+"Score "+j.score.score+"/100\n"+(j.score.feedback||"");}await refresh()}catch(e){o.textContent=e.message}};
$("closeRole").onclick=()=>$("roleSheet").classList.add("hidden");$("closeQuote").onclick=()=>$("quoteSheet").classList.add("hidden");
async function acceptQuote(option){let o=$("quoteOut");o.classList.remove("hidden");o.textContent="...";try{let j=await fn("quote-intake",{action:"accept_option",request_id:activeRequest,option});o.textContent="Quote created ✓ RM "+Number(j.quote.selling_price).toFixed(0)+" · "+(j.quote.commission_rate_locked*100).toFixed(1).replace(".0","")+"% locked";await refresh();$("readyQuoteForm").classList.add("hidden")}catch(e){o.textContent=e.message}}
$("budgetQuoteBtn").onclick=()=>acceptQuote("budget");$("recommendedQuoteBtn").onclick=()=>acceptQuote("recommended");
$("quoteBtn").onclick=async()=>{let o=$("quoteOut");o.classList.remove("hidden");o.textContent="...";try{let file=$("refFile").files[0];if(!file)throw Error("Reference image required");let c=await fn("quote-intake",{action:"create",lead_id:activeLead,customer_budget:Number($("qBudget").value),design_commitment:$("commit").value,content_type:file.type});let up=await sb.storage.from(c.bucket).uploadToSignedUrl(c.path,c.upload_token,file,{contentType:file.type});if(up.error)throw up.error;let j=await fn("quote-intake",{action:"analyze",request_id:c.request_id});let q=j.quote_request;o.textContent=(q.classification||"RED")+"\n"+(lang==="zh"?q.customer_note_zh:q.customer_note_en)+(q.recommended_price?"\nRecommended: RM "+q.recommended_price:"")}catch(e){o.textContent=e.message}};
$("logout").onclick=async()=>{await sb.auth.signOut();session=null;D=null;view("login")};
document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>{document.querySelectorAll("#nav button").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".section").forEach(s=>s.classList.toggle("active",s.dataset.page===b.dataset.tab))});
(async()=>{
  let c=await fetch("/config").then(r=>r.json());
  window.CFG=c;
  sb=window.supabase.createClient(c.url,c.key);
  const hp=new URLSearchParams((location.hash||"").replace(/^#/,""));
  const inviteCode=hp.get("invite");
  const inviteEmail=hp.get("email");
  if(inviteCode&&inviteEmail){
    view("login");
    $("email").value=inviteEmail;
    $("loginMsg").textContent=lang==="zh"?"正在使用一次性安全链接登录...":"Signing in with one-time secure access...";
    try{
      const r=await fetch(c.url+"/functions/v1/agent-auth",{
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":c.key},
        body:JSON.stringify({action:"invite_session",email:inviteEmail,code:inviteCode})
      });
      const j=await r.json();
      if(!r.ok)throw Error(j.error||"Access link failed");
      const {error}=await sb.auth.setSession({access_token:j.access_token,refresh_token:j.refresh_token});
      if(error)throw error;
      history.replaceState({},document.title,location.pathname||"/");
      $("loginMsg").textContent="";
    }catch(e){
      history.replaceState({},document.title,location.pathname||"/");
      $("loginMsg").textContent=(lang==="zh"?"登录链接无效或已使用。":"Access link is invalid, expired, or already used.");
    }
  }else{
    const accessToken=hp.get("access_token");
    const refreshToken=hp.get("refresh_token");
    if(accessToken&&refreshToken){
      const {error}=await sb.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
      history.replaceState({},document.title,location.pathname||"/");
      if(error){
        $("loginMsg").textContent=error.message||"Secure sign-in session could not be restored.";
        view("login");
      }
    }
  }
  sb.auth.onAuthStateChange(async(_e,s)=>{
    session=s;
    if(s){try{await refresh()}catch(e){console.error(e);view("login")}}
    else view("login");
  });
  let g=await sb.auth.getSession();
  session=g.data.session;
  if(session){try{await refresh()}catch(e){view("login")}}
  else view("login");
  applyLang()
})();
