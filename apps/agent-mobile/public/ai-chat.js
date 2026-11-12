import {aiStart,aiEnd,setAIState,contextTips,createAICard} from "./ai-ui.js";
import {typeText} from "./motion.js";
let instance=null;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
export function createAIChat({api,tr,getData,getLang}){
 if(instance)return instance;
 const overlay=el("div","ai-chat-overlay hidden");
 const sheet=el("section","ai-chat-sheet hidden");sheet.setAttribute("role","dialog");sheet.setAttribute("aria-modal","true");
 sheet.setAttribute("aria-label",tr("aiChatTitle"));
 const handle=el("div","ai-chat-handle");handle.setAttribute("aria-hidden","true");
 const head=el("div","ai-chat-header");head.append(el("strong","",tr("aiChatTitle")));
 const close=el("button","ai-chat-close","×");close.type="button";close.setAttribute("aria-label",tr("close"));head.append(close);
 const history=el("div","ai-chat-history");history.setAttribute("role","log");history.setAttribute("aria-live","polite");
 const suggestions=el("div","ai-chat-suggestions");
 const form=el("form","ai-chat-form");
 const input=el("textarea","ai-chat-input");input.rows=2;input.maxLength=3000;input.placeholder=tr("aiChatPlaceholder");
 const send=el("button","btn btn-primary",tr("aiSend"));send.type="submit";form.append(input,send);
 sheet.append(handle,head,history,suggestions,form);document.body.append(overlay,sheet);
 let busy=false,opened=false,previousFocus=null,dragStart=null,historyLoaded=false;
 function message(role,content,provider,id,animate=false){
  const row=el("article","ai-message "+(role==="user"?"ai-message-user":"ai-message-assistant"));
  const body=el("div","ai-message-body");
  row.append(body);history.append(row);
  if(animate){setAIState("speaking");typeText(body,content,{duration:14}).then(()=>{if(!busy)setAIState("done")})}
  else body.textContent=String(content||"");
  if(role==="assistant"){
   const actions=el("div","ai-message-actions");
   for(const [label,signal] of [[ "👍","thumbs_up"],["👎","thumbs_down"],[tr("copyText"),"copied"],[tr("aiWhatsApp"),"sent_whatsapp"]]){
    const btn=el("button","btn btn-text btn-small",label);btn.type="button";btn.addEventListener("click",async()=>{
     if(signal==="copied"){try{await navigator.clipboard.writeText(String(content||""))}catch{return}}
     if(signal==="sent_whatsapp")window.open("https://wa.me/?text="+encodeURIComponent(String(content||"")),"_blank","noopener,noreferrer");
     try{await api({action:"feedback",ai_action:"chat",output_ref:id||null,signal})}catch{}
     btn.classList.add("ai-action-ack");});
    actions.append(btn);
   }row.append(actions);
  }
  history.scrollTop=history.scrollHeight;
 }
 async function loadHistory(){
  if(historyLoaded)return;historyLoaded=true;
  aiStart();try{const j=await api({action:"chat_history"});for(const m of j.messages||[])message(m.role,m.content,m.provider,m.id)}catch{history.append(el("p","ai-muted",tr("aiHistoryUnavailable")))}finally{aiEnd()}
 }
 function renderSuggestions(){
  suggestions.replaceChildren();const tips=contextTips(getData(),Date.now(),tr);
  const prompts=[...new Set([tips[0]?.prompt,"aiPromptPlan","aiPromptObjection","aiPromptFestival","aiPromptFollowup"].filter(Boolean))].slice(0,4);
  for(const key of prompts){const btn=el("button","ai-suggest",tr(key));btn.type="button";btn.addEventListener("click",()=>sendText(tr(key)));suggestions.append(btn)}
 }
 async function sendText(text){
  const value=String(text||"").trim();if(!value||busy)return;
  busy=true;send.disabled=true;input.value="";message("user",value);aiStart();
  const loading=el("div","ai-chat-thinking",tr("aiThinking1"));history.append(loading);
  let cycle=0;const timer=setInterval(()=>{loading.textContent=tr(++cycle%2?"aiThinking2":"aiThinking1")},2400);
  try{
   const j=await api({action:"chat",message:value});loading.remove();message("assistant",j.reply||"",j.provider,j.message_id,true);aiEnd(true)
  }catch(e){loading.remove();message("system",String(e?.message||"")==="daily_limit"?tr("aiLimit"):tr("errorRequestFailed"),"template",null);aiEnd(false)}
  finally{clearInterval(timer);busy=false;send.disabled=false;input.focus()}
 }
 function open(){if(opened)return;opened=true;previousFocus=document.activeElement;overlay.classList.remove("hidden");sheet.classList.remove("hidden");document.body.classList.add("ai-chat-open");renderSuggestions();loadHistory();input.focus()}
 function closeChat(){if(!opened)return;opened=false;overlay.classList.add("hidden");sheet.classList.add("hidden");document.body.classList.remove("ai-chat-open");previousFocus?.focus?.()}
 close.addEventListener("click",closeChat);overlay.addEventListener("click",closeChat);
 sheet.addEventListener("keydown",e=>{if(e.key==="Escape")closeChat();if(e.key==="Tab"){const focusables=[...sheet.querySelectorAll("button:not([disabled]),textarea")];const i=focusables.indexOf(document.activeElement);if(e.shiftKey&&i===0){e.preventDefault();focusables.at(-1)?.focus()}else if(!e.shiftKey&&i===focusables.length-1){e.preventDefault();focusables[0]?.focus()}}});
 handle.addEventListener("pointerdown",e=>{dragStart=e.clientY;handle.setPointerCapture(e.pointerId)});
 handle.addEventListener("pointerup",e=>{if(dragStart!==null&&e.clientY-dragStart>70)closeChat();dragStart=null});
 input.addEventListener("focus",()=>setAIState("listening"));input.addEventListener("blur",()=>{if(!busy)setAIState("idle")});
 form.addEventListener("submit",e=>{e.preventDefault();sendText(input.value)});
 input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendText(input.value)}});
 instance={open,close:closeChat,destroy(){closeChat();overlay.remove();sheet.remove();instance=null},send:sendText};
 return instance;
}
