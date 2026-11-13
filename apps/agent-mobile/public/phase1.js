import {createAICard,prioritizeCards,aiStart,aiEnd} from "./ai-ui.js";
import {clear,element,emptyState,countTo,stagger,toast,vibrate,setupBottomSheet,setButtonLoading,progress} from "./components.js";
import {createIcon} from "./icons.js";
import {greetingPeriod,kuchingDateKey,formatKuchingDateTime} from "./date.js";
import {createOrderWizard} from "./order.js";
import {createPerformanceDashboard} from "./performance.js";
import {createTrainingUI} from "./training.js";
import {buildUnlockChecklist,getUnlockProgress} from "./unlock.js";
import {createHandbookExperience} from "./handbook.js";

const NAV=[
  ["today","house","navToday"],
  ["customers","users","navCustomers"],
  ["order","plus","navOrder"],
  ["training","graduationCap","navTraining"],
  ["performance","trendingUp","navPerformance"]
];
const LOCKED=new Set(["trainee","restricted","recovery","dormant","suspended"]);

function iconButton(icon,label,className="btn btn-secondary",attrs={}){
  const b=element("button",{className,attrs:{type:"button",...attrs}});
  b.append(createIcon(icon,{size:20}),element("span",{text:label}));
  return b;
}
function money(v){return "RM "+Number(v||0).toLocaleString("en-MY",{minimumFractionDigits:0,maximumFractionDigits:2})}
function pct(v){return (Number(v||0)*100).toFixed(Number(v||0)*100%1?1:0)}
function statusTone(status){
  if(["active","certified"].includes(status))return "success";
  if(["trainee","recovery","dormant"].includes(status))return "warning";
  return "danger";
}
function tierKey(tier){
  return {starter:"tierStarter",active:"tierActive",pro:"tierPro",elite:"tierElite"}[tier]||"tierStarter";
}
function sourceLabel(value,tr){
  const key={
    instagram:"sourceInstagram",facebook:"sourceFacebook",threads:"sourceThreads",
    xiaohongshu:"sourceXiaohongshu",whatsapp:"sourceWhatsapp",personal_network:"sourcePersonal",
    corporate_outreach:"sourceCorporate",referral:"sourceReferral",previous_customer:"sourcePrevious",other:"sourceOther"
  }[String(value||"").toLowerCase()];
  return key?tr(key):String(value||"—");
}
function trainingStatusLabel(value,tr){
  const key={assigned:"trainingAssigned",in_progress:"trainingInProgress",failed:"trainingFailed",waived:"trainingWaived",passed:"passed"}[String(value||"").toLowerCase()];
  return key?tr(key):String(value||"—");
}
function commissionStatusLabel(value,tr){
  const key={pending:"commissionPending",earned:"commissionEarned",payable:"commissionPayable",held:"commissionHeld",paid:"commissionPaid",reversed:"commissionReversed"}[String(value||"").toLowerCase()];
  return key?tr(key):String(value||"—");
}
function categoryKey(value){
  return {
    birthday:"categoryBirthday",anniversary:"categoryAnniversary",condolence:"categoryCondolence",
    opening:"categoryOpening",proposal:"categoryProposal",graduation:"categoryGraduation",
    corporate:"categoryCorporate",wedding:"categoryWedding",general:"categoryGeneral"
  }[value]||null;
}

export function createPhase1UI({getData,getLang,getUserId,tr,api,onRefresh}){
  let active="today";
  let previousNavIndex=0;
  let lockController=null;
  let detailController=null;
  let generatedKit=null;
  let generatedKitCode=null;
  let aiGreeting=null,aiGreetingLoading=false,generatedProvider="template";
  let lastAllDone=false;
  let customerSegment="all";
  let unlockSummary=null,unlockLoading=false;

  const order=createOrderWizard({
    getData,getLang,getUserId,tr,api,
    onNavigate:navigate,
    onLocked:showLock,
    onSent:()=>{markLocalTask("kit",true);renderNavBadges()}
  });

  const performance=createPerformanceDashboard({
    getUserId,getLang,tr,api
  });
  const training=createTrainingUI({getData,getLang,tr,api,onHandbook:code=>handbook.openForCourse(code),onSummary:today=>{
    unlockSummary=today;
    if(!document.getElementById("lockSheet")?.classList.contains("hidden"))renderLockChecklist();
  }});

  const handbook=createHandbookExperience({getData,getLang,getUserId,api,onRefresh,onNavigate:navigate});

  function langText(value){
    const key=categoryKey(value);
    return key?tr(key):String(value||"—");
  }

  function segmentsForLead(lead){
    if(Array.isArray(lead?.customer_segments))return lead.customer_segments;
    const status=String(lead?.status||"");
    if(status==="quoted"||lead?.quote_id||["approved","sent","accepted"].includes(String(lead?.quote_status||"")))return ["quoted"];
    if(status==="follow_up"||lead?.next_followup_at)return ["follow_up"];
    if(["new","qualified"].includes(status))return ["new"];
    return [];
  }
  function lossReasonLabel(value){
    const key={
      too_expensive:"lossTooExpensive",think_about_it:"lossThinkAboutIt",no_reply:"lossNoReply",
      chose_other:"lossChoseOther",other:"lossOther"
    }[String(value||"")];
    return key?tr(key):String(value||"—");
  }
  function nextBestActionLabel(value){
    const key={
      qualify_lead:"nbaQualify",request_quote:"nbaRequestQuote",follow_up:"nbaFollowUp",
      follow_up_quote:"nbaFollowUpQuote",schedule_quote_followup:"nbaScheduleQuoteFollowUp",
      lost_review:"nbaLostReview",none:"nbaNone"
    }[String(value||"")];
    return key?tr(key):String(value||"—");
  }
  function intelligenceReason(lead){
    const reason=lead?.lead_score_reason;
    if(!reason||typeof reason!=="object")return "";
    return String(getLang()==="zh"?reason.zh||"":reason.en||"");
  }

  function isLocked(){
    return LOCKED.has(String(getData()?.agent?.status||"").toLowerCase())||getData()?.phase1?.can_sell===false;
  }

  function setupNav(){
    const nav=document.getElementById("nav");
    if(!nav)return;
    clear(nav);
    const inner=element("div",{className:"nav-inner"});
    const indicator=element("span",{className:"nav-indicator",attrs:{"aria-hidden":"true"}});
    inner.append(indicator);
    NAV.forEach(([tab,icon,key],index)=>{
      const b=element("button",{className:"nav-item"+(tab==="order"?" nav-order":"")+(tab===active?" active":""),attrs:{type:"button","data-tab":tab,"aria-label":tr(key)}});
      const iconWrap=element("span",{className:"nav-icon-wrap"});
      iconWrap.append(createIcon(icon,{size:24}));
      const label=element("span",{className:"nav-label",text:tr(key)});
      iconWrap.append(element("span",{className:"nav-badge hidden","data-badge":tab}));
      b.append(iconWrap,label);
      b.addEventListener("click",()=>{
        if(tab==="order"&&isLocked()){showLock();return}
        navigate(tab);
      });
      inner.append(b);
    });
    nav.append(inner);
    renderNavBadges();
    updateNavIndicator();
  }

  function updateNavIndicator(){
    const nav=document.getElementById("nav");
    if(!nav)return;
    const index=Math.max(0,NAV.findIndex(x=>x[0]===active));
    const indicator=nav.querySelector(".nav-indicator");
    if(indicator)indicator.style.setProperty("--nav-index",String(index));
    nav.querySelectorAll(".nav-item").forEach(b=>{
      const isActive=b.dataset.tab===active;
      b.classList.toggle("active",isActive);
      b.setAttribute("aria-current",isActive?"page":"false");
    });
  }

  function renderNavBadges(){
    const nav=document.getElementById("nav");
    if(!nav)return;
    const p=getData()?.phase1||{};
    const due=(p.due_followups||[]).length;
    const customerBadge=nav.querySelector('[data-badge="customers"]');
    if(customerBadge){
      customerBadge.textContent=due>99?"99+":String(due);
      customerBadge.classList.toggle("hidden",due===0);
    }
    const trainingBadge=nav.querySelector('[data-badge="training"]');
    if(trainingBadge){
      trainingBadge.textContent="";
      trainingBadge.classList.toggle("hidden",!p.training_pending);
      trainingBadge.classList.toggle("dot",Boolean(p.training_pending));
    }
  }

  function pageSwap(next){
    const old=document.querySelector(".section.active");
    const target=document.querySelector('.section[data-page="'+next+'"]');
    if(!target)return;
    const nextIndex=NAV.findIndex(x=>x[0]===next);
    const direction=nextIndex>=0&&previousNavIndex>=0&&nextIndex<previousNavIndex?-1:1;
    const swap=()=>{
      document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
      target.classList.add("active");
    };
    const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if(document.startViewTransition&&!reduced){
      document.startViewTransition(swap);
    }else{
      swap();
      if(!reduced)target.animate(
        [{opacity:0,transform:"translateX("+(direction*14)+"px)"},{opacity:1,transform:"translateX(0)"}],
        {duration:220,easing:"cubic-bezier(.2,.8,.2,1)"}
      );
    }
    if(nextIndex>=0)previousNavIndex=nextIndex;
  }

  function navigate(next,{scrollTo=null,focusModule=null,focusExam=false}={}){
    if(next==="order"&&isLocked()){showLock();return}
    active=next;
    pageSwap(next);
    updateNavIndicator();
    if(next==="today")renderToday();
    else if(next==="customers")renderCustomers();
    else if(next==="order")order.open();
    else if(next==="training")renderTraining({focusModule,focusExam});
    else if(next==="performance")renderPerformance();
    else if(next==="selling")renderSelling();
    else if(next==="handbook")handbook.reRender();
    requestAnimationFrame(()=>{
      if(next!=="today"||document.querySelector(".onboarding-layer")===null)handbook.spotlight(next);
      if(scrollTo)document.getElementById(scrollTo)?.scrollIntoView({behavior:"smooth",block:"start"});
      else if(!focusModule&&!focusExam)window.scrollTo({top:0,behavior:"instant"});
    });
  }

  async function refreshUnlockSummary(){
    if(unlockLoading)return;
    unlockLoading=true;
    try{
      const result=await api.training({action:"today",start:false});
      unlockSummary=result?.today||null;
      if(!document.getElementById("lockSheet")?.classList.contains("hidden"))renderLockChecklist();
    }catch{
      // Training data is optional here. Never show an exam as ready before its state is confirmed.
    }finally{unlockLoading=false}
  }

  function renderLockChecklist(){
    const checklist=document.getElementById("lockChecklist");
    if(!checklist)return;
    const state=getUnlockProgress(getData(),unlockSummary);
    checklist.replaceChildren(buildUnlockChecklist({
      data:getData(),summary:unlockSummary,tr,
      onCourse:code=>{lockController?.close();navigate("training",{focusModule:code})},
      onExam:()=>{lockController?.close();navigate("training",{focusExam:true})}
    }));
    const action=document.getElementById("lockAction");
    if(action)action.textContent=state.firstIncompleteCode?tr("unlockOpenNextCourse"):state.examStatus==="ready"?tr("unlockStartExam"):tr("unlockAction");
  }

  function showLock(){
    const sheet=document.getElementById("lockSheet");
    if(!sheet)return;
    const status=String(getData()?.agent?.status||"").toLowerCase();
    document.getElementById("lockStatus").textContent=status.toUpperCase();
    document.getElementById("lockTitle").textContent=tr("lockTitle");
    document.getElementById("lockDesc").textContent=status==="trainee"?tr("lockDescTrainee"):tr("lockDescRestricted");
    const details=document.getElementById("lockHow");
    if(details)details.open=false;
    document.getElementById("lockHowSummary").textContent=tr("unlockHow");
    renderLockChecklist();
    sheet.classList.remove("hidden");
    if(!unlockSummary)refreshUnlockSummary();
    vibrate([12,35,12]);
  }

  function setupSheets(){
    lockController=setupBottomSheet(document.getElementById("lockSheet"));
    detailController=setupBottomSheet(document.getElementById("leadDetailSheet"));
    document.getElementById("closeLock")?.addEventListener("click",()=>lockController?.close());
    document.getElementById("lockAction")?.addEventListener("click",()=>{
      const state=getUnlockProgress(getData(),unlockSummary);
      lockController?.close();
      navigate("training",{focusModule:state.firstIncompleteCode,focusExam:!state.firstIncompleteCode&&state.examStatus==="ready"});
    });
    document.getElementById("closeLeadDetail")?.addEventListener("click",()=>detailController?.close());
  }

  function localTaskState(){
    const key="ew_phase1_tasks_"+(getData()?.phase1?.kuching_date||kuchingDateKey());
    try{return {key,data:JSON.parse(localStorage.getItem(key)||"{}")}}catch{return {key,data:{}}}
  }
  function markLocalTask(name,value){
    const x=localTaskState();
    x.data[name]=Boolean(value);
    try{localStorage.setItem(x.key,JSON.stringify(x.data))}catch{}
    renderToday();
  }

  function taskFacts(){
    const p=getData()?.phase1||{};
    const local=localTaskState().data;
    return {
      followup:(p.due_followups||[]).length===0,
      kit:Boolean(local.kit),
      training:!p.training_pending
    };
  }

  function celebrateIfNeeded(){
    const facts=taskFacts();
    const all=facts.followup&&facts.kit&&facts.training;
    if(all&&!lastAllDone){
      const date=getData()?.phase1?.kuching_date||kuchingDateKey();
      const key="ew_phase1_celebrated_"+date;
      let done=false;try{done=localStorage.getItem(key)==="1"}catch{}
      if(!done){
        try{localStorage.setItem(key,"1")}catch{}
        const layer=document.getElementById("celebrationLayer");
        if(layer){
          clear(layer);layer.classList.remove("hidden");
          for(let i=0;i<14;i++){
            const p=element("span",{className:"celebration-particle"});
            p.style.setProperty("--x",String((i%7-3)*18)+"px");
            p.style.setProperty("--r",String((i*47)%180)+"deg");
            p.style.setProperty("--d",String((i%5)*35)+"ms");
            layer.append(p);
          }
          setTimeout(()=>{layer.classList.add("hidden");clear(layer)},900);
        }
        vibrate([12,25,12]);
      }
    }
    lastAllDone=all;
  }

  function statusLabel(status){
    const key={
      trainee:"statusTrainee",active:"statusActive",certified:"statusCertified",
      restricted:"statusRestricted",recovery:"statusRecovery",dormant:"statusDormant",suspended:"statusSuspended"
    }[String(status||"").toLowerCase()];
    return key?tr(key):String(status||"—");
  }

  function screenHeader(title,subtitle,{back=false}={}){
    const row=element("div",{className:"screen-header"});
    const left=element("div");
    if(back){
      const b=iconButton("arrowLeft",tr("back"),"btn btn-text screen-back");
      b.addEventListener("click",()=>navigate("today"));
      row.append(b);
    }
    left.append(element("h1",{className:"screen-title",text:title}),element("p",{className:"screen-subtitle",text:subtitle}));
    row.append(left);
    return row;
  }

  function renderToday(){
    const host=document.getElementById("todayPage");if(!host)return;
    clear(host);
    const D=getData()||{},a=D.agent||{},p=D.phase1||{},tp=p.tier_progress||{},m=p.money||{};
    const page=element("div",{className:"page-shell today-shell"});

    const live=element("div",{className:"today-live"});
    const left=element("span",{className:"live-chip"});
    left.append(element("i"),element("span",{text:tr("kuchingLive")}));
    const refresh=iconButton("refreshCw",tr("refreshNow"),"btn btn-text btn-small");
    refresh.addEventListener("click",async()=>{
      refresh.classList.add("spinning");
      try{await onRefresh()}finally{refresh.classList.remove("spinning")}
    });
    live.append(left,refresh);
    page.append(live);

    const greet=element("div",{className:"greeting-row"});
    const greetingKey={morning:"greetingMorning",afternoon:"greetingAfternoon",evening:"greetingEvening",night:"greetingNight"}[greetingPeriod()];
    const gLeft=element("div");
    gLeft.append(element("h1",{className:"greeting",text:tr(greetingKey)+", "+(a.display_name||a.agent_code||"")}),
      element("div",{className:"status-line",text:statusLabel(a.status)}));
    const badges=element("div",{className:"greeting-badges"});
    badges.append(element("span",{className:"badge badge-gold",text:tr(tierKey(a.tier))}),
      element("span",{className:"badge badge-"+statusTone(a.status),text:statusLabel(a.status)}));
    greet.append(gLeft,badges);
    page.append(greet);

    if(isLocked()){
      const lock=element("div",{className:"lock-banner"});
      const ico=element("div",{className:"lock-banner-icon"});ico.append(createIcon("lock",{size:22}));
      const copy=element("div",{className:"lock-banner-copy"});
      copy.append(element("strong",{text:tr("lockTitle")}),
        element("span",{text:String(a.status).toLowerCase()==="trainee"?tr("lockDescTrainee"):tr("lockDescRestricted")}));
      const action=iconButton("graduationCap",tr("unlockHow"),"btn btn-warning btn-small");
      action.addEventListener("click",showLock);
      lock.append(ico,copy,action);
      page.append(lock);
    }

    page.append(handbook.journey());

    const moneyCard=element("section",{className:"money-card"});
    const moneyHead=element("div",{className:"money-head"});
    const moneyTitle=element("div");
    moneyTitle.append(element("span",{className:"money-kicker",text:tr("moneyCardTitle")}),
      element("span",{className:"money-rate",text:tr("commissionRate",{rate:pct(tp.commission_rate??a.commission_rate)})}));
    const walletIcon=element("div",{className:"money-wallet"});walletIcon.append(createIcon("wallet",{size:24}));
    moneyHead.append(moneyTitle,walletIcon);
    const grid=element("div",{className:"money-grid"});
    [["todayEarned",m.today_earned,"success"],["pendingCommission",m.pending,"gold"],["monthEarned",m.month_earned,"light"]].forEach(([key,value,tone])=>{
      const cell=element("div",{className:"money-cell"});
      cell.append(element("span",{className:"money-label",text:tr(key)}));
      const n=element("strong",{className:"money-number "+tone,text:"RM 0"});
      cell.append(n);grid.append(cell);
      requestAnimationFrame(()=>countTo(n,Number(value||0),{duration:650,formatter:x=>"RM "+Math.round(x).toLocaleString("en-MY")}));
    });
    moneyCard.append(moneyHead,grid);

    const tierWrap=element("div",{className:"tier-progress"});
    const tierTop=element("div",{className:"tier-progress-top"});
    if(tp.next_tier){
      tierTop.append(element("span",{text:tr("nextTierLine",{tier:tr(tierKey(tp.next_tier))})}),
        element("strong",{text:tr("nextTierNeeds",{orders:Number(tp.orders_remaining||0),score:Number(tp.score_remaining||0).toFixed(0)})}));
      const orderRatio=tp.next_orders_required?Math.min(1,Number(tp.orders_30d||0)/Number(tp.next_orders_required)):1;
      const scoreRatio=tp.next_score_required?Math.min(1,Number(tp.performance_score||0)/Number(tp.next_score_required)):1;
      tierWrap.append(tierTop,progress(Math.min(orderRatio,scoreRatio)).lastChild,
        element("div",{className:"tier-progress-foot",text:tr("orders30d",{count:Number(tp.orders_30d||0)})}));
    }else{
      tierTop.append(element("span",{text:tr("maxTier")}),element("strong",{text:tr(tierKey(tp.current_tier||a.tier))}));
      tierWrap.append(tierTop);
    }
    moneyCard.append(tierWrap);
    page.append(moneyCard);

    const daily=document.createElement("div");daily.id="aiDailyBrief";daily.dataset.priorityCard="brief";page.append(daily);
    if(aiGreeting){daily.append(renderDailyBrief(aiGreeting))}
    else if(!aiGreetingLoading){const placeholder=element("p",{className:"ai-chat-thinking",text:tr("aiDailyLoading")});daily.append(placeholder);loadDailyGreeting()}
    page.append(renderQuickActions());
    const priorities=element("div",{className:"ai-priority-list"});
    for(const [name,card] of [["training",renderTodayTasks()],["followup",renderDueFollowups()],["campaign",renderCampaigns()]]){
      card.dataset.priorityCard=name;
      const why=element("p",{className:"ai-priority-why",attrs:{"data-priority-why":""}});
      card.prepend(why);priorities.append(card);
    }
    page.append(priorities);
    host.append(page);
    prioritizeCards(D,priorities,tr);
    stagger(page.querySelectorAll(".quick-tile,.task-row,.follow-card,.campaign-banner"),{step:34,max:8});
    celebrateIfNeeded();
  }

  function renderDailyBrief(response){
    const g=response?.greeting||{};
    const card=createAICard({title:tr("aiDailyTitle"),text:g.text||"",provider:g.provider||"template",cached:!!response.cached,tr}).card;
    if(g.focus){
      const focus=Array.isArray(g.focus)?g.focus.join(" · "):typeof g.focus==="string"?g.focus:JSON.stringify(g.focus);
      card.append(element("p",{className:"ai-priority-why",text:tr("aiDailyFocus")+": "+focus}));
    }
    const due=(getData()?.phase1?.due_followups||[]).length;
    const action=element("button",{className:"btn btn-primary btn-small",text:due?tr("aiDailyFollowup"):tr("aiDailyViewTasks"),attrs:{type:"button"}});
    action.addEventListener("click",()=>navigate("today",{scrollTo:due?"dueFollowups":null}));
    card.append(action);return card;
  }

  async function loadDailyGreeting(){
    if(aiGreetingLoading||aiGreeting)return;
    aiGreetingLoading=true;aiStart();let aiOk=false;
    try{aiGreeting=await api.ai({action:"daily_greeting"});aiOk=true;const host=document.getElementById("aiDailyBrief");if(host){host.replaceChildren();host.append(renderDailyBrief(aiGreeting))}}
    catch{document.getElementById("aiDailyBrief")?.replaceChildren(element("p",{className:"ai-chat-thinking",text:tr("aiDailyUnavailable")}))}
    finally{aiGreetingLoading=false;aiEnd(aiOk)}
  }

  function renderQuickActions(){
    const p=getData()?.phase1||{},m=p.money||{};
    const section=element("section",{className:"section-block"});
    section.append(element("h2",{className:"section-title",text:tr("quickActions")}));
    const grid=element("div",{className:"quick-grid"});
    const items=[
      {icon:"plus",title:"tileOrder",sub:"tileOrderSub",tone:"primary",action:()=>isLocked()?showLock():navigate("order"),status:tr("readyBadge"),locked:isLocked()},
      {icon:"phoneCall",title:"tileFollowup",sub:"tileFollowupSub",tone:"amber",action:()=>navigate("today",{scrollTo:"dueFollowups"}),status:tr("dueBadge",{count:(p.due_followups||[]).length})},
      {icon:"megaphone",title:"tileSelling",sub:"tileSellingSub",tone:"blue",action:()=>isLocked()?showLock():navigate("selling"),status:taskFacts().kit?tr("completedBadge"):tr("readyBadge"),locked:isLocked()},
      {icon:"graduationCap",title:"tileTraining",sub:"tileTrainingSub",tone:"green",action:()=>navigate("training"),status:p.training_pending?tr("trainingPendingBadge"):tr("completedBadge")},
      {icon:"flower2",title:"handbookTitle",sub:"handbookSubtitle",tone:"green",action:()=>handbook.open(),status:tr("readyBadge")},
      {icon:"trendingUp",title:"tilePerformance",sub:"tilePerformanceSub",tone:"indigo",action:()=>navigate("performance"),status:tr(tierKey(p.tier_progress?.current_tier||getData()?.agent?.tier))},
      {icon:"wallet",title:"tileWallet",sub:"tileWalletSub",tone:"gold",action:()=>navigate("performance",{scrollTo:"commissionPreview"}),status:money(m.pending)}
    ];
    items.forEach(item=>{
      const b=element("button",{className:"quick-tile tone-"+item.tone+(item.locked?" is-locked":""),attrs:{type:"button","aria-disabled":item.locked?"true":"false"}});
      const top=element("div",{className:"quick-top"});
      const ico=element("span",{className:"quick-icon"});ico.append(createIcon(item.icon,{size:20}));
      top.append(ico,element("span",{className:"quick-status",text:item.status}));
      b.append(top,element("strong",{text:tr(item.title)}),element("small",{text:tr(item.sub)}));
      b.addEventListener("click",item.action);
      grid.append(b);
    });
    section.append(grid);
    return section;
  }

  function renderTodayTasks(){
    const section=element("section",{className:"task-card"});
    const facts=taskFacts();
    const doneCount=Object.values(facts).filter(Boolean).length;
    const head=element("div",{className:"card-head"});
    const title=element("div",{className:"card-head-title"});title.append(createIcon("listChecks",{size:20}),element("h2",{text:tr("todayThreeTitle")}));
    head.append(title,element("span",{className:"task-count",text:doneCount+" / 3"}));
    section.append(head);
    const tasks=[
      {id:"followup",title:"taskFollowupTitle",desc:"taskFollowupDesc",done:facts.followup,go:()=>navigate("today",{scrollTo:"dueFollowups"})},
      {id:"kit",title:"taskKitTitle",desc:"taskKitDesc",done:facts.kit,go:()=>isLocked()?showLock():navigate("selling")},
      {id:"training",title:"taskTrainingTitle",desc:"taskTrainingDesc",done:facts.training,go:()=>navigate("training")}
    ].sort((a,b)=>Number(a.done)-Number(b.done));
    if(doneCount===3){
      const all=element("div",{className:"all-done"});
      all.append(createIcon("sparkles",{size:18}),element("span",{text:tr("allDoneText")}));
      section.append(all);
    }
    const list=element("div",{className:"task-list"});
    tasks.forEach(task=>{
      const row=element("button",{className:"task-row"+(task.done?" done":""),attrs:{type:"button"}});
      const check=element("span",{className:"task-check"});
      if(task.done)check.append(createIcon("check",{size:17}));
      const copy=element("span",{className:"task-copy"});
      copy.append(element("strong",{text:tr(task.title)}),element("small",{text:tr(task.desc)}));
      row.append(check,copy,element("span",{className:"task-go",text:task.done?tr("completedBadge"):tr("goNow")}));
      row.addEventListener("click",task.go);
      list.append(row);
    });
    section.append(list);
    return section;
  }

  function renderDueFollowups(){
    const p=getData()?.phase1||{},rows=p.due_followups||[];
    const section=element("section",{className:"section-block",attrs:{id:"dueFollowups"}});
    const h=element("div",{className:"section-heading-row"});
    const title=element("div",{className:"section-heading-left"});title.append(createIcon("clock",{size:20}),element("h2",{className:"section-title",text:tr("dueFollowupsTitle")}));
    h.append(title,element("span",{className:"count-badge",text:String(rows.length)}));section.append(h);
    if(!rows.length){
      section.append(emptyState({icon:"circleCheck",title:tr("noDueFollowups")}));
      return section;
    }
    const list=element("div",{className:"follow-list"});
    rows.forEach(lead=>{
      const card=element("article",{className:"follow-card"});
      const top=element("div",{className:"follow-card-top"});
      const who=element("div",{className:"follow-person"});
      const avatar=element("span",{className:"follow-avatar"});avatar.append(createIcon("user",{size:18}));
      const name=element("div");
      name.append(element("strong",{text:lead.customer_label||"—"}),element("small",{text:formatKuchingDateTime(lead.next_followup_at,getLang())+" · "+sourceLabel(lead.source,tr)}));
      who.append(avatar,name);
      top.append(who,element("span",{className:"badge badge-danger",text:tr("dueBadge",{count:1})}));
      const meta=element("div",{className:"follow-meta"});
      meta.append(element("span",{text:tr("customerOccasionLabel")+" · "+langText(lead.occasion||lead.sales_category)}),
        element("strong",{text:money(lead.budget)}));
      const actions=element("div",{className:"follow-actions"});
      const wa=iconButton("messageCircle",tr("whatsappFollowup"),"btn btn-whatsapp");
      wa.addEventListener("click",()=>{
        if(isLocked()){showLock();return}
        const msg=tr("followupMessage",{name:lead.customer_label||"",occasion:langText(lead.occasion||lead.sales_category)});
        window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank","noopener,noreferrer");
        vibrate(10);
      });
      const done=iconButton("check",tr("markComplete"),"btn btn-secondary");
      done.addEventListener("click",async()=>{
        if(isLocked()){showLock();return}
        setButtonLoading(done,true,tr("loading"));
        try{
          await api.agent({action:"complete_followup",lead_id:lead.id});
          toast(tr("completedBadge"),{tone:"success"});
          vibrate(12);await onRefresh();
        }catch(e){toast(api.friendlyError(e?.message),{tone:"danger"})}
        finally{setButtonLoading(done,false,tr("markComplete"))}
      });
      actions.append(wa,done);
      card.append(top,meta,actions);list.append(card);
    });
    section.append(list);
    return section;
  }

  function renderCampaigns(){
    const rows=getData()?.campaigns||[];
    const section=element("section",{className:"section-block"});
    const h=element("div",{className:"section-heading-row"});
    const left=element("div",{className:"section-heading-left"});left.append(createIcon("target",{size:20}),element("h2",{className:"section-title",text:tr("campaignsTitle")}));
    h.append(left);section.append(h);
    if(!rows.length){
      section.append(emptyState({icon:"target",title:tr("noCampaigns")}));
      return section;
    }
    const strip=element("div",{className:"campaign-strip"});
    rows.forEach(c=>{
      const done=Number(c.completed_orders||0),target=Math.max(1,Number(c.target_orders||0));
      const card=element("article",{className:"campaign-banner"});
      card.append(element("strong",{text:getLang()==="zh"?c.title_zh:c.title_en}),
        element("span",{text:tr("campaignProgress",{done,target})}));
      const track=element("div",{className:"campaign-progress"});
      const fill=element("span");fill.style.transform="scaleX("+Math.min(1,done/target)+")";track.append(fill);
      card.append(track,element("small",{text:tr("campaignBonus",{amount:Number(c.fixed_bonus||0).toFixed(0)})}));
      strip.append(card);
    });
    section.append(strip);return section;
  }

  function renderCustomers(){
    const host=document.getElementById("customersPage");if(!host)return;
    clear(host);
    const page=element("div",{className:"page-shell"});
    page.append(screenHeader(tr("customersTitle"),tr("customersSubtitle")));
    const allRows=getData()?.phase1?.recent_leads||[];
    if(!allRows.length){
      page.append(emptyState({icon:"users",title:tr("noCustomers"),message:getLang()==="zh"?"还没有客户？先看手册学习如何介绍业务，再从接单流程记录第一位客户。":"No customers yet? Read the handbook, then use the order flow to record your first enquiry."}));
      const guide=iconButton("flower2",tr("handbookTitle"),"btn btn-primary");
      guide.addEventListener("click",()=>handbook.open());page.append(guide);
      const ask=element("button",{className:"btn btn-secondary",text:tr("aiEmptyCustomerAction"),attrs:{type:"button"}});
      ask.addEventListener("click",()=>document.dispatchEvent(new Event("ew-open-ai")));page.append(ask);
      host.append(page);return
    }

    const filters=element("div",{className:"follow-actions",attrs:{"data-phase4-hook":"customer-segments"}});
    [
      ["all","segmentAll"],["new","segmentNew"],["follow_up","segmentFollowUp"],["quoted","segmentQuoted"]
    ].forEach(([segment,key])=>{
      const count=segment==="all"?allRows.length:allRows.filter(x=>segmentsForLead(x).includes(segment)).length;
      const btn=element("button",{
        className:"btn btn-secondary btn-small",
        text:tr(key)+" · "+count,
        attrs:{type:"button","data-customer-segment":segment,"aria-pressed":String(customerSegment===segment)}
      });
      btn.disabled=customerSegment===segment;
      btn.addEventListener("click",()=>{customerSegment=segment;renderCustomers()});
      filters.append(btn);
    });
    page.append(filters);

    const rows=customerSegment==="all"?allRows:allRows.filter(x=>segmentsForLead(x).includes(customerSegment));
    if(!rows.length){
      page.append(emptyState({icon:"users",title:tr("noCustomersInSegment")}));
      host.append(page);return;
    }

    const list=element("div",{className:"customer-list"});
    rows.forEach(lead=>{
      const card=element("button",{className:"customer-card",attrs:{type:"button","data-lead-id":String(lead.id||"")}});
      const top=element("div",{className:"customer-card-top"});
      const who=element("div");
      who.append(element("strong",{text:lead.customer_label||"—"}),element("small",{text:langText(lead.occasion||lead.sales_category)+" · "+sourceLabel(lead.source,tr)}));
      top.append(who,element("span",{className:"badge",text:customerStageLabel(lead)}));
      const pipeline=renderPipeline(lead,{compact:true});
      const foot=element("div",{className:"customer-card-foot"});
      foot.append(element("span",{text:tr("customerBudgetLabel")}),element("strong",{text:money(lead.budget)}));
      card.append(top,pipeline,foot);
      if(lead.lead_score!==undefined&&lead.lead_score!==null){
        const score=Math.max(0,Math.min(100,Number(lead.lead_score)||0));
        const level=score>=70?"aiChanceHigh":score>=40?"aiChanceMedium":"aiChanceLow";
        card.append(element("span",{className:"badge",text:tr(level)}));
        if(intelligenceReason(lead))card.append(element("p",{className:"ai-priority-why",text:intelligenceReason(lead)}));
      }
      if(lead.best_followup_time)card.append(element("p",{className:"ai-priority-why",text:tr("aiBestFollowup")+": "+formatKuchingDateTime(lead.best_followup_time,getLang())}));
      if(lead.next_best_action)card.append(element("p",{className:"ai-priority-why",text:tr("aiNextAction")+": "+nextBestActionLabel(lead.next_best_action)}));
      card.addEventListener("click",()=>openLeadDetail(lead));
      list.append(card);
    });
    page.append(list);host.append(page);stagger(list.children);
  }

  function stageIndex(lead){
    const os=String(lead.order_status||"");
    const ps=String(lead.payment_status||"");
    if(os==="completed")return 4;
    if(["producing","qc_pending","qc_pass","delivering"].includes(os))return 3;
    if(ps==="paid"||os==="paid")return 2;
    if(lead.quote_id||["approved","sent","accepted"].includes(String(lead.quote_status||"")))return 1;
    return 0;
  }
  function customerStageLabel(lead){
    return tr(["stageNeed","stageQuoted","stagePaid","stageProducing","stageDelivered"][stageIndex(lead)]);
  }
  function renderPipeline(lead,{compact=false}={}){
    const current=stageIndex(lead),wrap=element("div",{className:"pipeline"+(compact?" compact":"")});
    const keys=["stageNeed","stageQuoted","stagePaid","stageProducing","stageDelivered"];
    keys.forEach((key,i)=>{
      const item=element("div",{className:"pipeline-step"+(i<=current?" complete":"")+(i===current?" current":"")});
      const dot=element("span",{className:"pipeline-dot"});if(i<current)dot.append(createIcon("check",{size:12}));
      item.append(dot,element("span",{text:tr(key)}));wrap.append(item);
    });
    return wrap;
  }
  function openLeadDetail(lead){
    const sheet=document.getElementById("leadDetailSheet");if(!sheet)return;
    const body=document.getElementById("leadDetailBody");clear(body);
    body.append(element("h2",{className:"sheet-title",text:lead.customer_label||tr("customerDetails")}),
      element("p",{className:"sheet-subtitle",text:tr("customerDetails")}));
    const meta=element("div",{className:"detail-grid"});
    const metaRows=[
      [tr("customerSourceLabel"),sourceLabel(lead.source,tr)],
      [tr("customerOccasionLabel"),langText(lead.occasion||lead.sales_category)],
      [tr("customerBudgetLabel"),money(lead.budget)],
      [tr("currentStatus"),customerStageLabel(lead)]
    ];
    if(lead.loss_reason)metaRows.push([tr("lossReason"),lossReasonLabel(lead.loss_reason)]);
    metaRows.forEach(([k,v])=>{
      const x=element("div");x.append(element("span",{text:k}),element("strong",{text:v}));meta.append(x);
    });
    body.append(meta,element("h3",{className:"detail-section-title",text:tr("statusProgress")}),renderPipeline(lead));

    if(lead.lead_score!=null||lead.next_best_action||lead.best_followup_time){
      const smart=element("div",{className:"detail-grid",attrs:{"data-phase4-hook":"lead-intelligence"}});
      const rows=[];
      if(lead.lead_score!=null)rows.push([tr("leadScore"),String(Math.round(Number(lead.lead_score)))+"/100"]);
      const reason=intelligenceReason(lead);if(reason)rows.push([tr("leadScoreReason"),reason]);
      if(lead.next_best_action)rows.push([tr("nextBestAction"),nextBestActionLabel(lead.next_best_action)]);
      if(lead.best_followup_time)rows.push([tr("bestFollowupTime"),formatKuchingDateTime(lead.best_followup_time,getLang())]);
      rows.forEach(([k,v])=>{const x=element("div");x.append(element("span",{text:k}),element("strong",{text:v}));smart.append(x)});
      body.append(element("h3",{className:"detail-section-title",text:tr("smartCustomerGuide")}),smart);
    }

    if(!["won","archived"].includes(String(lead.status||""))){
      const loss=element("div",{attrs:{"data-phase4-hook":"loss-reason"}});
      loss.append(element("h3",{className:"detail-section-title",text:tr("markLost")}));
      const select=element("select",{attrs:{"aria-label":tr("lossReason")}});
      [
        ["too_expensive","lossTooExpensive"],["think_about_it","lossThinkAboutIt"],["no_reply","lossNoReply"],
        ["chose_other","lossChoseOther"],["other","lossOther"]
      ].forEach(([value,key])=>{
        const opt=element("option",{text:tr(key),attrs:{value}});
        if(value===lead.loss_reason)opt.selected=true;
        select.append(opt);
      });
      const save=element("button",{className:"btn btn-secondary btn-wide",text:tr("saveLossReason"),attrs:{type:"button"}});
      save.addEventListener("click",async()=>{
        if(isLocked()){showLock();return}
        setButtonLoading(save,true,tr("loading"));
        try{
          await api.agent({action:"set_lead_loss",lead_id:lead.id,loss_reason:select.value});
          toast(tr("lossReasonSaved"),{tone:"success"});
          sheet.classList.add("hidden");
          await onRefresh();
        }catch(e){toast(api.friendlyError(e?.message),{tone:"danger"})}
        finally{setButtonLoading(save,false,tr("saveLossReason"))}
      });
      loss.append(select,save);body.append(loss);
    }

    const coach=element("section",{className:"ai-coach-panel"});
    coach.append(element("h3",{text:tr("aiCoachTitle")}));
    const input=element("textarea",{className:"ai-chat-input",attrs:{rows:"3",maxlength:"2000","aria-label":tr("aiCoachInput")}});
    input.placeholder=tr("aiCoachInput");coach.append(input);
    const ask=element("button",{className:"btn btn-secondary",text:tr("aiCoachAsk"),attrs:{type:"button"}});
    coach.append(ask);
    ask.addEventListener("click",async()=>{
      const customerMessage=input.value.trim();if(!customerMessage)return;
      ask.disabled=true;aiStart();let coachOk=false;
      const waiting=element("p",{className:"ai-chat-thinking",text:tr("aiThinking2")});coach.append(waiting);
      try{
        const j=await api.ai({action:"coach",customer_message:customerMessage});coachOk=true;
        waiting.remove();
        const suggestion=typeof j.suggestion==="string"?j.suggestion:JSON.stringify(j.suggestion||{});
        const actions=element("div",{className:"ai-message-actions"});
        for(const [label,signal] of [[tr("aiHelpful"),"thumbs_up"],[tr("aiNotHelpful"),"thumbs_down"],[tr("copyText"),"copied"]]){
          const b=element("button",{className:"btn btn-secondary btn-small",text:label,attrs:{type:"button"}});
          b.addEventListener("click",async()=>{
            if(signal==="copied")try{await navigator.clipboard.writeText(suggestion)}catch{}
            api.ai({action:"feedback",ai_action:"coach",output_ref:null,signal}).catch(()=>{});
          });actions.append(b);
        }
        const old=coach.querySelector(".ai-output-card");old?.remove();
        const out=createAICard({title:tr("aiCoachTitle"),text:suggestion,provider:j.provider||"template",cached:false,tr,actions});coach.append(out.card);
      }catch(e){waiting.textContent=api.friendlyError(e?.message)}
      finally{ask.disabled=false;aiEnd(coachOk)}
    });
    body.append(coach);
    sheet.classList.remove("hidden");
  }

  function renderTraining(options={}){
    const host=document.getElementById("trainingPage");
    if(!host)return;
    training.open(host,options);
  }

  function renderPerformance(){
    const host=document.getElementById("performancePage");
    if(!host)return;
    performance.open(host);
  }

  function renderSelling(){
    const host=document.getElementById("sellingPage");if(!host)return;
    clear(host);
    const page=element("div",{className:"page-shell"});
    page.append(screenHeader(tr("sellingTitle"),tr("sellingSubtitle"),{back:true}));
    const kits=getData()?.selling_kits||[];
    if(!kits.length){page.append(emptyState({icon:"megaphone",title:tr("noItems")}));host.append(page);return}
    const list=element("div",{className:"kit-list"});
    kits.forEach(k=>{
      const card=element("article",{className:"selling-card"});
      const title=getLang()==="zh"?k.title_zh:k.title_en;
      const content=getLang()==="zh"?k.content_zh:k.content_en;
      const channels=k.recommended_channels||[];
      const missionChannels=getData()?.mission?.recommended_channels||[];
      const chosen=missionChannels.find(x=>channels.includes(x))||channels[0]||"personal_network";
      const top=element("div",{className:"selling-card-top"});
      const ico=element("span",{className:"selling-icon"});ico.append(createIcon("megaphone",{size:20}));
      const copy=element("div");copy.append(element("strong",{text:title}),element("small",{text:channels.join(" · ")}));
      top.append(ico,copy);card.append(top);
      if(content?.opening)card.append(element("p",{className:"selling-opening",text:content.opening}));
      const gen=iconButton("sparkles",tr("generateTodayCopy"),"btn btn-primary");
      gen.addEventListener("click",async()=>{
        if(isLocked()){showLock();return}
        setButtonLoading(gen,true,tr("loading"));
        try{
          const j=await api.ai({action:"daily_content",kit_code:k.code,channel:chosen});
          generatedKit=j.content||{};generatedKitCode=k.code;generatedProvider=j.provider||"template";
          renderSelling();
        }catch(e){toast(api.friendlyError(e?.message),{tone:"danger"})}
        finally{setButtonLoading(gen,false,tr("generateTodayCopy"))}
      });
      card.append(gen);
      if(generatedKit&&generatedKitCode===k.code){
        const out=element("div",{className:"generated-copy "+(generatedProvider==="gemini"?"ai-output-card ai-live":"ai-output-card ai-template")});
        const body=[
          tr("generatedFor",{channel:chosen}),
          generatedKit.post_copy||"",
          generatedKit.outreach_copy||"",
          generatedKit.followup_copy||""
        ].filter(Boolean).join("\n\n");
        out.append(element("pre",{text:body}));
        const actions=element("div",{className:"generated-actions"});
        const copyBtn=iconButton("copy",tr("copyText"),"btn btn-secondary");
        copyBtn.addEventListener("click",async()=>{
          try{await navigator.clipboard.writeText(body);toast(tr("copied"),{tone:"success"})}
          catch{toast(tr("errorRequestFailed"),{tone:"danger"})}
        });
        const wa=iconButton("messageCircle",tr("sendWhatsAppKit"),"btn btn-whatsapp");
        wa.addEventListener("click",()=>{
          if(isLocked()){showLock();return}
          window.open("https://wa.me/?text="+encodeURIComponent(body),"_blank","noopener,noreferrer");
          markLocalTask("kit",true);vibrate(10);
        });
        const feedback=(signal)=>{api.ai({action:"feedback",ai_action:"daily_content",output_ref:null,signal}).catch(()=>{})};
        const up=iconButton("check",tr("aiHelpful"),"btn btn-secondary btn-small");up.addEventListener("click",()=>feedback("thumbs_up"));
        const down=element("button",{className:"btn btn-secondary btn-small",text:tr("aiNotHelpful")});down.type="button";down.addEventListener("click",()=>feedback("thumbs_down"));
        copyBtn.addEventListener("click",()=>feedback("copied"));
        wa.addEventListener("click",()=>feedback("sent_whatsapp"));
        actions.append(copyBtn,wa,up,down);out.append(actions);card.append(out);
      }
      list.append(card);
    });
    page.append(list);
    const details=element("details",{className:"playbook-details"});
    details.append(element("summary",{text:tr("channelStrategy")}));
    const inside=element("div",{className:"playbook-list"});
    (getData()?.channel_playbooks||[]).forEach(p=>{
      const content=getLang()==="zh"?p.content_zh:p.content_en;
      const x=element("div",{className:"playbook-item"});
      x.append(element("strong",{text:getLang()==="zh"?p.title_zh:p.title_en}),element("span",{text:content?.goal||""}));
      inside.append(x);
    });
    details.append(inside);page.append(details);host.append(page);
  }

  function renderAll(){
    setupNav();
    renderToday();renderCustomers();if(active==="training")renderTraining();if(active==="performance")renderPerformance();if(active==="handbook")handbook.reRender();renderSelling();order.render();
    renderNavBadges();
  }

  function onLanguageChange(){
    renderAll();
    order.onLanguageChange();
    performance.onLanguageChange();
    training.onLanguageChange();
    if(active==="handbook")handbook.reRender();
  }

  function onForeground(){
    performance.onForeground();
    training.onForeground();
  }

  async function init(){
    setupSheets();
    setupNav();
    await order.init();
    renderAll();
    handbook.showWelcome();
    navigate("today");
    refreshUnlockSummary();
  }

  return {init,renderAll,onLanguageChange,onForeground,navigate,showLock,renderNavBadges,order,performance,training};
}
