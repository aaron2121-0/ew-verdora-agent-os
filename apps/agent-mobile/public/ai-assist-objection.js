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
 coach.append(quick);
}
