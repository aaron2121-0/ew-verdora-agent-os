
function repeatSection({element,createAICard,api,getLang,setButtonLoading,aiStart,aiEnd,toast}){
 const zh=getLang()==="zh",t=(en,cn)=>zh?cn:en;
 const host=element("section",{className:"section-block ai-coach-panel ai-assist-surface",attrs:{"data-ai-assist":"repeat-customer"}});
 host.append(element("h2",{className:"section-title",text:t("Previous customers worth checking in with","旧客可以再问一问")}),element("p",{className:"screen-subtitle",text:t("Real customers who bought before — use a light check-in only when appropriate.","这些都是真的买过的客人，适合才轻轻问候。")}));
 const run=element("button",{className:"btn btn-secondary btn-large",text:t("Show previous customers","看看可以联系的旧客"),attrs:{type:"button"}}),out=element("div",{className:"follow-list"});
 run.addEventListener("click",async()=>{setButtonLoading(run,true,t("Checking…","整理中…"));aiStart();let ok=false;try{const j=await api.ai({action:"repeat_customer"});ok=true;out.replaceChildren();const rows=Array.isArray(j.customers)?j.customers:[];if(!rows.length){out.append(element("p",{className:"ai-priority-why",text:t("No previous customer is ready for a check-in yet.","现在还没有适合重新联系的旧客。")}));return}rows.forEach(x=>{const msg=String(x.message||""),card=createAICard({title:String(x.customer_label||t("Customer","客人")),text:msg,provider:j.provider||"template",cached:false,tr:k=>k}).card;if(x.why)card.append(element("p",{className:"ai-priority-why",text:String(x.why)}));const actions=element("div",{className:"follow-actions"}),copy=element("button",{className:"btn btn-secondary",text:t("Copy","复制"),attrs:{type:"button"}}),wa=element("button",{className:"btn btn-whatsapp",text:t("Open WhatsApp","打开 WhatsApp"),attrs:{type:"button"}});copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(msg);toast(t("Copied","已复制"),{tone:"success"})}catch{}});wa.addEventListener("click",()=>window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank","noopener,noreferrer"));actions.append(copy,wa);card.append(actions);out.append(card)})}catch(e){toast(api.friendlyError(e?.message),{tone:"danger"})}finally{setButtonLoading(run,false,t("Show previous customers","看看可以联系的旧客"));aiEnd(ok)}});
 host.append(run,out);return host;
}
export function renderTodayFirst({element,createAICard,api,getLang,setButtonLoading,aiStart,aiEnd,toast}){
  const zh=getLang()==="zh",t=(en,cn)=>zh?cn:en;
  const host=element("section",{className:"section-block ai-coach-panel ai-assist-surface",attrs:{"data-ai-assist":"today-priority"}});
  host.append(element("h2",{className:"section-title",text:t("Who should I contact first?","今天先联系谁？")}),
    element("p",{className:"screen-subtitle",text:t("I’ll pick up to 3 customers worth contacting first and prepare the message.","我先帮你挑最多 3 个值得先联系的客人，连要发的话都准备好。")}));
  const run=element("button",{className:"btn btn-primary btn-large",text:t("Show me who to contact","告诉我先找谁"),attrs:{type:"button"}});
  const out=element("div",{className:"follow-list"});
  run.addEventListener("click",async()=>{
    setButtonLoading(run,true,t("Checking…","整理中…"));aiStart();let ok=false;
    try{
      const j=await api.ai({action:"today_priority"});ok=true;out.replaceChildren();
      const rows=Array.isArray(j.customers)?j.customers:[];
      if(!rows.length){out.append(element("p",{className:"ai-priority-why",text:t("No customer needs priority follow-up right now.","现在没有需要优先跟进的客人。")}));return}
      rows.forEach((x,index)=>{
        const card=createAICard({title:(index+1)+". "+(x.customer_label||t("Customer","客人")),text:x.message||"",provider:j.provider||"template",cached:false,tr:k=>k}).card;
        if(x.why)card.append(element("p",{className:"ai-priority-why",text:String(x.why)}));
        const actions=element("div",{className:"follow-actions"});
        const copy=element("button",{className:"btn btn-secondary",text:t("Copy","复制"),attrs:{type:"button"}});
        copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(String(x.message||""));toast(t("Copied","已复制"),{tone:"success"})}catch{}});
        const wa=element("button",{className:"btn btn-whatsapp",text:t("Open WhatsApp","打开 WhatsApp"),attrs:{type:"button"}});
        wa.addEventListener("click",()=>window.open("https://wa.me/?text="+encodeURIComponent(String(x.message||"")),"_blank","noopener,noreferrer"));
        actions.append(copy,wa);card.append(actions);out.append(card);
      });
    }catch(e){toast(api.friendlyError(e?.message),{tone:"danger"})}
    finally{setButtonLoading(run,false,t("Show me who to contact","告诉我先找谁"));aiEnd(ok)}
  });
  host.append(run,out,repeatSection({element,createAICard,api,getLang,setButtonLoading,aiStart,aiEnd,toast}));return host;
}
