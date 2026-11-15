// Lazy-loaded read-only briefing; occasion calendar owns the Upcoming event strip.
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const safe=x=>String(x??"—").slice(0,160);
export async function mountDailyBrief({host,api,getLang,onAsk}){
  if(!host?.isConnected)return;
  const zh=()=>getLang()==="zh";
  host.replaceChildren(el("p","ai-chat-thinking",zh()?"正在整理今天的客户…":"Checking today's customers…"));
  try{
    const response=await api({action:"assistant_brief"});
    if(!response?.ok)throw new Error("brief_unavailable");
    if(!host.isConnected)return;
    const d=response.brief||{},due=Array.isArray(d.due_followups)?d.due_followups:[],
      upcoming=Array.isArray(d.upcoming_customer_events)?d.upcoming_customer_events:[];
    host.replaceChildren();
    const head=el("div","ai-partner-head");
    head.append(el("h2","",zh()?"你的 AI 伙伴 · 今日简报":"Your AI partner · Today"));
    head.append(el("small","",safe(d.date)));
    host.append(head);
    const summary=el("p","ai-read-subtitle",zh()
      ?due.length+" 位需要跟进 · "+upcoming.length+" 位客户的场合快到了"
      :due.length+" follow-ups · "+upcoming.length+" customers with upcoming dates");
    host.append(summary);
    if(!due.length&&!upcoming.length)host.append(el("p","ai-read-subtitle",zh()?"今天没有已登记的紧急客户跟进。":"No urgent customer follow-ups are recorded today."));
    for(const x of due.slice(0,3)){
      const card=el("article","ai-read-card");
      card.append(el("strong","",safe(x.customer_label||"客户")));
      card.append(el("p","ai-read-subtitle",(zh()?"跟进到期":"Follow-up due")+" · "+safe(x.next_followup_at)));
      const b=el("button","btn btn-secondary btn-small",zh()?"帮我准备跟进":"Draft follow-up");
      b.type="button";b.addEventListener("click",()=>onAsk?.(zh()?"今天我该跟进谁？请根据系统记录准备一条简短跟进文案。":"Who should I follow up today? Help draft a message."));
      card.append(b);host.append(card);
    }
    for(const x of upcoming.slice(0,2)){
      const card=el("article","ai-read-card");
      card.append(el("strong","",safe(x.customer_label||"客户")));
      card.append(el("p","ai-read-subtitle",(zh()?"客户的送花日期":"Customer delivery date")+" · "+safe(x.delivery_date)));
      const b=el("button","btn btn-secondary btn-small",zh()?"准备确认问题":"Prepare questions");
      b.type="button";b.addEventListener("click",()=>onAsk?.(zh()?"帮我写一条确认客户送花日期、时间及需求的消息。":"Draft a message to confirm delivery date, time, and requirements."));card.append(b);host.append(card);
    }
    if(d.tier_progress?.orders_remaining!=null)host.append(el("p","ai-read-subtitle",zh()
      ?"距离下一等级近30天订单要求还差 "+safe(d.tier_progress.orders_remaining)+" 单（不是本月销售目标）"
      :"Rolling 30-day tier progress: "+safe(d.tier_progress.orders_remaining)+" orders remaining (not monthly target)."));
    // Never insert public calendar occasions here: the existing Upcoming strip already owns them.
  }catch{
    if(host.isConnected)host.replaceChildren(el("p","ai-read-subtitle",zh()?"今日简报暂时无法读取，可继续使用上方场合日历及客户页。":"Brief unavailable; the calendar and customer page still work."));
  }
}
