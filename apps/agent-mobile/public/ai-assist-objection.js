
function watchTranslations({coach,element,createAICard,api,getLang,aiStart,aiEnd,toast}){
 let timer,last="";
 const render=()=>{
  const body=coach.querySelector(":scope > .ai-output-card .ai-card-text"),source=String(body?.textContent||"").trim();
  if(!source||source===last)return;last=source;
  coach.querySelector(".ai-translate-row")?.remove();
  const zh=getLang()==="zh",t=(en,cn)=>zh?cn:en,row=element("div",{className:"ai-outcome-row ai-translate-row ai-assist-surface"});
  row.append(element("small",{className:"muted",text:t("Translate this reply to","把这句换成")}));
  [["zh","中文"],["en","English"],["ms","BM"]].forEach(([target,label])=>{const b=element("button",{className:"btn btn-secondary",text:label,attrs:{type:"button"}});b.addEventListener("click",async()=>{row.querySelectorAll("button").forEach(x=>x.disabled=true);aiStart();let ok=false;try{const j=await api.ai({action:"translate_reply",target,text:source});ok=true;coach.querySelector(".ai-translation-card")?.remove();const msg=String(j.text||""),actions=element("div",{className:"ai-message-actions"}),copy=element("button",{className:"btn btn-secondary",text:t("Copy","复制"),attrs:{type:"button"}}),wa=element("button",{className:"btn btn-whatsapp",text:t("Open WhatsApp","打开 WhatsApp"),attrs:{type:"button"}});copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(msg);toast(t("Copied","已复制"),{tone:"success"})}catch{}});wa.addEventListener("click",()=>window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank","noopener,noreferrer"));actions.append(copy,wa);const card=createAICard({title:t("Translated reply","翻译后的回复"),text:msg,provider:j.provider||"template",cached:false,tr:k=>k,actions}).card;card.classList.add("ai-translation-card");coach.append(card)}catch(e){toast(api.friendlyError(e?.message),{tone:"danger"})}finally{row.querySelectorAll("button").forEach(x=>x.disabled=false);aiEnd(ok)}});row.append(b)});
  body.closest(".ai-output-card")?.after(row);
 };
 new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(render,90)}).observe(coach,{subtree:true,childList:true,characterData:true});
}
export function mountObjectionHelper({coach,input,element,createAICard,api,getLang,aiStart,aiEnd,toast}){
 const zh=getLang()==="zh",t=(en,cn)=>zh?cn:en;
 const quick=element("div",{className:"ai-outcome-row ai-assist-surface"});
 [["expensive",t("Too expensive","太贵")],["think",t("Needs time","再想想")],["exact",t("Wants same design","要一样的")]].forEach(([value,label])=>{
  const b=element("button",{className:"btn btn-secondary btn-small",text:label,attrs:{type:"button"}});
  b.addEventListener("click",async()=>{
   quick.querySelectorAll("button").forEach(x=>x.disabled=true);aiStart();let ok=false;
   try{
    const j=await api.ai({action:"objection_replies",objection:value,customer_message:input.value.trim()});ok=true;
    coach.querySelector(".ai-objection-results")?.remove();
    const results=element("div",{className:"ai-objection-results"});
    (j.replies||[]).slice(0,3).forEach((replyText,index)=>{
     const actions=element("div",{className:"ai-message-actions"});
     const copy=element("button",{className:"btn btn-secondary",text:t("Copy","复制"),attrs:{type:"button"}});
     copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(String(replyText));toast(t("Copied","已复制"),{tone:"success"})}catch{}});
     const wa=element("button",{className:"btn btn-whatsapp",text:t("Open WhatsApp","打开 WhatsApp"),attrs:{type:"button"}});
     wa.addEventListener("click",()=>window.open("https://wa.me/?text="+encodeURIComponent(String(replyText)),"_blank","noopener,noreferrer"));
     actions.append(copy,wa);
     const card=createAICard({title:t("Reply ","回法 ")+(index+1),text:String(replyText),provider:j.provider||"template",cached:false,tr:k=>k,actions});
     results.append(card.card);
    });
    coach.append(results);
   }catch(e){toast(api.friendlyError(e?.message),{tone:"danger"})}
   finally{quick.querySelectorAll("button").forEach(x=>x.disabled=false);aiEnd(ok)}
  });quick.append(b);
 });
 coach.append(quick);watchTranslations({coach,element,createAICard,api,getLang,aiStart,aiEnd,toast});
}

export async function t(box,api,getLang,createAICard){
 try{
  const j=await api.ai({action:"micro_tip",context:"customer_reply"});if(!j?.tip)return;
  const title=getLang()==="zh"?"发出去前提醒一句":"One reminder before you send";
  const card=createAICard({title,text:String(j.tip),provider:j.provider||"template",cached:false,tr:k=>k}).card;
  card.classList.add("ai-micro-tip","ai-assist-surface");box.append(card);
 }catch{}
}
