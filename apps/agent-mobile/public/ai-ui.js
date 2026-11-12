import {typeText,flipReorder,motionBudget} from "./motion.js";
import {kuchingHour,kuchingDateKey} from "./date.js";
let state="idle",pending=0,orb=null,promptUsed=false;
const states=new Set(["idle","listening","thinking","speaking","done","error"]);
export function setAIState(next){
 if(!states.has(next))next="idle";state=next;if(orb){orb.dataset.aiState=next;orb.setAttribute("aria-busy",String(next==="thinking"||next==="speaking"))}
}
export function aiStart(){pending++;setAIState("thinking")}
export function aiEnd(ok=true){pending=Math.max(0,pending-1);setAIState(pending?"thinking":ok?"done":"error");if(!pending)setTimeout(()=>{if(state==="done"||state==="error")setAIState("idle")},1300)}
export function contextTips(data={},now=Date.now(),tr=k=>k){
 const hour=kuchingHour(now),p=data.phase1||{},due=(p.due_followups||[]).length;
 const tips=[];if(due)tips.push({key:"aiTipDue",params:{count:due},prompt:"aiPromptFollowup"});
 if(hour>=0&&hour<6)tips.push({key:"aiTipNight",prompt:"aiPromptPlan"});
 else if(hour<12)tips.push({key:"aiTipMorning",prompt:"aiPromptPlan"});
 else if(hour<14)tips.push({key:"aiTipLunch",prompt:"aiPromptPlan"});
 else tips.push({key:"aiTipEvening",prompt:"aiPromptPlan"});
 if(p.training_pending)tips.push({key:"aiTipTraining",prompt:"aiPromptPlan"});
 return tips;
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
 if(!promptUsed&&tips.length){promptUsed=true;
  const tip=document.createElement("div");tip.className="ai-orb-tip";
  const msg=document.createElement("span");msg.textContent=tr(tips[0].key,tips[0].params||{});
  const close=document.createElement("button");close.type="button";close.textContent="×";close.setAttribute("aria-label",tr("close"));close.addEventListener("click",()=>tip.remove());
  tip.append(msg,close);orb.before(tip);
  orb.addEventListener("click",()=>tip.remove(),{once:true});
 }
 return orb;
}
export function refreshAIOrb(tr){if(orb){orb.setAttribute("aria-label",tr("aiOpenChat"));orb.querySelector(".sr-only").textContent=tr("aiOpenChat")}}
export function resetAIOrb(){orb?.remove();orb=null;document.querySelector(".ai-orb-tip")?.remove();pending=0;state="idle"}
