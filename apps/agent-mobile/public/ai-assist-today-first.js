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
  host.append(run,out);return host;
}
