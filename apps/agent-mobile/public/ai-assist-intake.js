export function renderAIIntake({element,createAICard,api,getLang,money,setButtonLoading,aiStart,aiEnd,onRefresh,toast}){
  const zh=getLang()==="zh";
  const t=(en,cn)=>zh?cn:en;
  const wrap=element("section",{className:"section-block ai-coach-panel ai-assist-surface",attrs:{"data-ai-assist":"lead-intake"}});
  wrap.append(element("h2",{className:"section-title",text:t("Paste customer chat","贴客人的聊天")}),
    element("p",{className:"screen-subtitle",text:t("Paste the WhatsApp conversation. I’ll pull out the useful details so you don’t have to retype them.","把 WhatsApp 对话贴进来，我帮你抓重点，不用重新打一次。")}));
  const input=element("textarea",{className:"ai-intake-input",attrs:{rows:"5",maxlength:"4000","aria-label":t("Paste what the customer said here…","把客人说的话贴在这里…")}});
  input.placeholder=t("Paste what the customer said here…","把客人说的话贴在这里…");
  const read=element("button",{className:"btn btn-primary btn-large",text:t("Read this chat","帮我整理"),attrs:{type:"button"}});
  const out=element("div",{});
  read.addEventListener("click",async()=>{
    const text=input.value.trim();if(!text)return;
    setButtonLoading(read,true,t("Reading…","整理中…"));aiStart();let ok=false;
    try{
      const j=await api.ai({action:"lead_intake_parse",customer_text:text});ok=true;
      const c=j.card||{};out.replaceChildren();
      const card=createAICard({title:t("Customer details found","找到的客人资料"),text:c.summary||"",provider:j.provider||"template",cached:false,tr:(k)=>k});
      const details=element("div",{className:"detail-grid"});
      [[t("Customer","客人"),c.customer_label||t("Not mentioned yet","还没提到")],
       [t("Occasion","场合"),c.occasion||t("Not mentioned yet","还没提到")],
       [t("Budget","预算"),c.budget==null?t("Not mentioned yet","还没提到"):money(c.budget)],
       [t("Delivery date","送货日期"),c.delivery_date||t("Not mentioned yet","还没提到")],
       [t("Area","地区"),c.area||t("Not mentioned yet","还没提到")]]
      .forEach(([k,v])=>{const row=element("div");row.append(element("span",{text:k}),element("strong",{text:String(v)}));details.append(row)});
      const create=element("button",{className:"btn btn-primary btn-large",text:t("Create customer","保存这个客人"),attrs:{type:"button"}});
      create.addEventListener("click",async()=>{
        setButtonLoading(create,true,t("Saving…","保存中…"));
        try{
          await api.agent({action:"create_lead",source:"whatsapp",customer_label:c.customer_label||"",occasion:c.occasion||"general",budget:c.budget,delivery_date:c.delivery_date||null});
          toast(t("Customer created.","客人已经保存。"),{tone:"success"});input.value="";out.replaceChildren();await onRefresh();
        }catch(e){toast(api.friendlyError(e?.message),{tone:"danger"})}
        finally{setButtonLoading(create,false,t("Create customer","保存这个客人"))}
      });
      card.card.append(details,create);out.append(card.card);
    }catch(e){out.replaceChildren(element("p",{className:"notice",text:api.friendlyError(e?.message)}))}
    finally{setButtonLoading(read,false,t("Read this chat","帮我整理"));aiEnd(ok)}
  });
  wrap.append(input,read,out);return wrap;
}
