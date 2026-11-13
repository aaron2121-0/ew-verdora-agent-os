import {typeText,flipReorder,motionBudget} from "./motion.js";
import {kuchingHour,kuchingDateKey} from "./date.js";
let state="idle",pending=0,orb=null,promptUsed=false,agentProfile=null;
export function setAgentProfile(value){agentProfile=value&&typeof value==="object"?value:null}
const states=new Set(["idle","listening","thinking","speaking","done","error"]);
export function setAIState(next){
 if(!states.has(next))next="idle";state=next;if(orb){orb.dataset.aiState=next;orb.setAttribute("aria-busy",String(next==="thinking"||next==="speaking"))}
}
export function aiStart(){pending++;setAIState("thinking")}
export function aiEnd(ok=true){pending=Math.max(0,pending-1);setAIState(pending?"thinking":ok?"done":"error");if(!pending)setTimeout(()=>{if(state==="done"||state==="error")setAIState("idle")},1300)}
export function contextTips(data={},now=Date.now(),tr=k=>k){
 const hour=kuchingHour(now),p=data.phase1||{},due=(p.due_followups||[]).length;
 const style=adaptToProfile(agentProfile||data.ai_profile||{}).style;
 const tips=[];if(due)tips.push({key:style==="formal"?"aiTipDueFormal":"aiTipDue",params:{count:due},prompt:"aiPromptFollowup"});
 if(hour>=0&&hour<6)tips.push({key:"aiTipNight",prompt:"aiPromptPlan"});
 else if(hour<12)tips.push({key:"aiTipMorning",prompt:"aiPromptPlan"});
 else if(hour<14)tips.push({key:"aiTipLunch",prompt:"aiPromptPlan"});
 else tips.push({key:"aiTipEvening",prompt:"aiPromptPlan"});
 if(p.training_pending)tips.push({key:"aiTipTraining",prompt:"aiPromptPlan"});
 return tips;
}
function canShowTipNow(profile,now){
 const hours=profile?.active_hours;
 if(!hours||typeof hours!=="object"||!hours.start||!hours.end)return true;
 const parse=v=>{const m=String(v).match(/^(\d{1,2}):([0-5]\d)$/);return m?Number(m[1])+Number(m[2])/60:null};
 const from=parse(hours.start),to=parse(hours.end);if(from===null||to===null)return true;
 const h=kuchingHour(now);return from<=to?h>=from&&h<to:h>=from||h<to;
}
export function adaptToProfile(profile){
 const style=String(profile?.writing_style||"").toLowerCase();
 const hours=profile?.active_hours;
 return {style:style.includes("formal")?"formal":style.includes("warm")?"warm":"casual",activeHours:hours,emoji:profile?.emoji_preference!=="none"};
}
export function prioritizeCards(data,container,tr){
 if(!container)return;
 const due=(data?.phase1?.due_followups||[]).length;
 const training=!!data?.phase1?.training_pending;
 const cards=[...container.children].filter(n=>n.dataset.priorityCard);
 const rank=n=>n.dataset.priorityCard==="followup"?(due?0:5):n.dataset.priorityCard==="training"?(training?1:6):n.dataset.priorityCard==="brief"?2:3;
 const ordered=cards.slice().sort((a,b)=>rank(a)-rank(b));
 flipReorder(container,()=>ordered.forEach(n=>container.append(n)));
 for(const node of ordered){const why=node.querySelector("[data-priority-why]");if(why)why.textContent=tr(node.dataset.priorityCard==="followup"&&due?"aiWhyFollowup":node.dataset.priorityCard==="training"&&training?"aiWhyTraining":"aiWhyToday")}
}
export function createAICard({title,text="",provider="gemini",cached=false,tr,actions=null}){
 const card=document.createElement("section");card.className="ai-output-card "+(provider==="gemini"?"ai-live":"ai-template");
 const header=document.createElement("div");header.className="ai-card-head";
 const h=document.createElement("strong");h.textContent=title;
 const label=document.createElement("span");label.className="ai-provider";label.textContent=provider==="gemini"?tr("aiProvider"):tr("aiTemplate");
 header.append(h,label);const body=document.createElement("p");body.className="ai-card-text";body.setAttribute("aria-live","polite");
 card.append(header,body);if(actions)card.append(actions);
 if(cached||provider!=="gemini")body.textContent=String(text||"");else typeText(body,text,{duration:16});
 return {card,body};
}
export function initAIOrb({onClick,tr,getData}){
 if(orb)return orb;
 orb=document.createElement("button");orb.type="button";orb.className="ai-orb";orb.dataset.aiState=state;orb.setAttribute("aria-label",tr("aiOpenChat"));
 const ring=document.createElement("span");ring.className="ai-orb-core";ring.setAttribute("aria-hidden","true");
 const label=document.createElement("span");label.className="sr-only";label.textContent=tr("aiOpenChat");
 orb.append(ring,label);orb.addEventListener("click",onClick);document.body.append(orb);
 motionBudget();
 const tips=contextTips(getData(),Date.now(),tr);
 if(!promptUsed&&tips.length&&canShowTipNow(agentProfile,Date.now())){promptUsed=true;
  const tip=document.createElement("div");tip.className="ai-orb-tip";
  const msg=document.createElement("span");msg.textContent=tr(tips[0].key,tips[0].params||{});
  const close=document.createElement("button");close.type="button";close.textContent="×";close.setAttribute("aria-label",tr("close"));close.addEventListener("click",()=>tip.remove());
  tip.append(msg,close);
  const questions=tr("languageName")==="EN"?[
    "开张花篮适合推荐给谁？","客户还没确定预算时，我应该先问什么？","客户要慰问花圈，我该怎么开始沟通？"
  ]:[
    "Who should I recommend opening flower stands to?",
    "What should I ask when a customer has no budget?",
    "How do I start a condolence wreath enquiry?"
  ];
  const suggestions=document.createElement("div");suggestions.className="ai-orb-suggestions";
  for(const prompt of questions){
    const b=document.createElement("button");b.type="button";b.textContent=prompt;
    b.addEventListener("click",()=>{
      document.dispatchEvent(new CustomEvent("ew-open-ai-question",{detail:{text:prompt}}));
      tip.remove();
    });
    suggestions.append(b);
  }
  tip.append(suggestions);orb.before(tip);
  orb.addEventListener("click",()=>tip.remove(),{once:true});
 }
 return orb;
}
export function refreshAIOrb(tr){if(orb){orb.setAttribute("aria-label",tr("aiOpenChat"));orb.querySelector(".sr-only").textContent=tr("aiOpenChat")}}
export function resetAIOrb(){agentProfile=null;orb?.remove();orb=null;document.querySelector(".ai-orb-tip")?.remove();pending=0;state="idle"}

export function createAIProfile({api,tr,getLang}){
 const backdrop=document.createElement("div");backdrop.className="ai-profile-overlay hidden";
 const dialog=document.createElement("section");dialog.className="ai-profile-sheet hidden";dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-label",tr("aiProfileTitle"));
 const head=document.createElement("div");head.className="ai-profile-row";
 const title=document.createElement("h2");title.textContent=tr("aiProfileTitle");
 const close=document.createElement("button");close.type="button";close.className="ai-profile-button";close.textContent=tr("close");head.append(title,close);
 const sub=document.createElement("p");sub.textContent=tr("aiProfileSubtitle");
 const content=document.createElement("div");content.setAttribute("aria-live","polite");
 dialog.append(head,sub,content);document.body.append(backdrop,dialog);
 let focusBefore=null;
 const dismiss=()=>{dialog.classList.add("hidden");backdrop.classList.add("hidden");focusBefore?.focus?.()};
 close.addEventListener("click",dismiss);backdrop.addEventListener("click",dismiss);
 dialog.addEventListener("keydown",e=>{
  if(e.key==="Escape"){dismiss();return}
  if(e.key==="Tab"){
   const nodes=[...dialog.querySelectorAll("button:not([disabled]),textarea")].filter(n=>n.offsetParent!==null);
   if(!nodes.length)return;const i=nodes.indexOf(document.activeElement);
   if(e.shiftKey&&i===0){e.preventDefault();nodes.at(-1).focus()}
   if(!e.shiftKey&&i===nodes.length-1){e.preventDefault();nodes[0].focus()}
  }
 });
 const element=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text||"";if(cls)n.className=cls;return n};
 async function open(){
  focusBefore=document.activeElement;dialog.classList.remove("hidden");backdrop.classList.remove("hidden");content.replaceChildren(element("p",tr("loading")));close.focus();
  aiStart();
  try{
   const j=await api({action:"my_profile"});const p=j.profile||{};setAgentProfile(p);
   content.replaceChildren(element("p",String(getLang()==="zh"?(p.summary_zh||p.summary_en||""):(p.summary_en||p.summary_zh||""))));
   const tags=element("div","","ai-profile-tags");
   for(const [key,items] of [["aiStrengths",p.strengths],["aiWeaknesses",p.weaknesses]]){
    content.append(element("h3",tr(key)));
    const list=Array.isArray(items)?items:typeof items==="string"?[items]:[];
    const wrap=element("div","","ai-profile-tags");
    for(const item of list)wrap.append(element("span",typeof item==="string"?item:JSON.stringify(item)));
    content.append(wrap);
   }
   content.append(element("h3",tr("aiWritingStyle")),element("p",typeof p.writing_style==="string"?p.writing_style:JSON.stringify(p.writing_style||{})));
   if(p.stats&&typeof p.stats==="object"){
    content.append(element("h3",tr("aiStatsTitle")));
    for(const [name,raw] of Object.entries(p.stats).slice(0,8)){
     const numeric=typeof raw==="number"&&Number.isFinite(raw);
     const row=element("div","","ai-profile-stat");
     const title=element("div","","ai-profile-row");
     title.append(element("span",name.replaceAll("_"," ")),element("strong",numeric?String(raw):String(raw??"—")));
     row.append(title);
     if(numeric&&raw>=0&&raw<=100){
      const track=element("div","","ai-profile-progress");
      const fill=element("div","","ai-profile-progress-fill");fill.style.width=String(raw)+"%";
      track.append(fill);row.append(track);
     }content.append(row);
    }
   }
   content.append(element("label",tr("aiNotesLabel")));
   const notes=document.createElement("textarea");notes.maxLength=500;notes.value=p.agent_notes||"";notes.setAttribute("aria-label",tr("aiNotesLabel"));
   const status=element("p","");status.setAttribute("role","status");
   const save=element("button",tr("aiSaveNotes"),"btn btn-primary");save.type="button";
   save.addEventListener("click",async()=>{save.disabled=true;try{await api({action:"update_notes",notes:notes.value.slice(0,500)});status.textContent=tr("aiNotesSaved")}catch{status.textContent=tr("errorRequestFailed")}finally{save.disabled=false}});
   content.append(notes,save,status);
  }catch{content.replaceChildren(element("p",tr("errorRequestFailed")))}
  finally{aiEnd()}
 }
 return {open,close:dismiss,destroy(){dismiss();dialog.remove();backdrop.remove()}};
}
