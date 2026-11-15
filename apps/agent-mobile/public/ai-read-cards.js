// Lazy-loaded Phase 1 read result cards. All user/customer content uses textContent.
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const label=(x,lang)=>lang==="zh"?x[0]:x[1];
const safe=(x)=>String(x??"—").slice(0,180);
const button=(name,fn)=>{const b=el("button","btn btn-secondary btn-small",name);b.type="button";b.addEventListener("click",fn);return b};
export function renderReadCards({cards,container,onAsk,lang="zh"}){
  const root=el("section","ai-read-results");root.setAttribute("aria-label",label(["查询结果","Read results"],lang));
  for(const c of Array.isArray(cards)?cards.slice(0,10):[]){
    if(!c||typeof c!=="object")continue;
    const card=el("article","ai-read-card");
    if(c.type==="customer"){
      card.append(el("strong","",safe(c.customer_label||c.lead_id||"客户")));
      const details=[c.occasion,c.sales_category,c.status,c.delivery_date,c.next_followup_at].filter(Boolean).map(safe).join(" · ");
      card.append(el("p","ai-read-subtitle",details));
      card.append(button(label(["帮我写跟进消息","Draft a follow-up"],lang),()=>onAsk?.(lang==="zh"?"帮我为这个客户写一条礼貌的跟进消息，不能自行承诺价格。":"Draft a compliant customer follow-up message.")));
    }else if(c.type==="occasion"){
      card.append(el("strong","",safe(lang==="zh"?c.name_zh||c.name_en:c.name_en||c.name_zh)));
      card.append(el("p","ai-read-subtitle",(c.date_status==="confirmed"?"✓ "+safe(c.date):label(["约（往年推算）","Approx. (past-year pattern)"],lang)+" "+safe(c.date)+" · "+label(["需核实","Verify first"],lang))));
    }else if(c.type==="commission"){
      card.append(el("strong","",label(["我的佣金与等级","Commission and tier"],lang)));
      const info=c.commission||{};
      const money=info.my_money||{};
      card.append(el("p","ai-read-subtitle",label(["等级","Tier"],lang)+": "+safe(info.my_tier)+" · "+label(["可领取","Payable"],lang)+": RM"+safe(money.ready_to_withdraw_rm??0)));
      card.append(el("p","ai-read-subtitle",label(["近30天升级还差","Rolling 30-day orders to next tier"],lang)+": "+safe(c.tier_progress?.orders_remaining??"—")));
    }else if(c.type==="order_summary"){
      card.append(el("strong","",label(["报价与订单","Quotes and orders"],lang)));
      card.append(el("p","ai-read-subtitle",label(["报价请求","Quote requests"],lang)+": "+(c.quote_requests||[]).length+" · "+label(["订单","Orders"],lang)+": "+(c.orders||[]).length));
      for(const o of (c.orders||[]).slice(0,3))card.append(el("p","ai-read-subtitle",safe(o.order_code||o.id)+" · "+safe(o.status)));
    }else if(c.type==="example"){
      card.append(el("strong","",label(["真实成交案例","Verified completed order"],lang)));
      card.append(el("p","ai-read-subtitle",[c.sales_category,c.occasion,c.sale_price_band,c.successful_channel].filter(Boolean).join(" · ")));
    }else if(c.type==="knowledge"){
      card.append(el("strong","",label(["已批准销售资料","Approved sales material"],lang)));
      const groups=[...(c.handbook||[]),...(c.selling_kits||[]),...(c.channel_playbooks||[])].slice(0,6);
      for(const k of groups)card.append(el("p","ai-read-subtitle",safe(lang==="zh"?k.title_zh||k.title_en:k.title_en||k.title_zh)));
    }else continue;
    root.append(card);
  }
  if(root.childNodes.length)container.append(root);
}
export function renderCopyCard({text,container,lang="zh",onFeedback}){
  const card=el("article","ai-read-card ai-copy-card");
  card.append(el("strong","",label(["可复制文案","Copy-ready draft"],lang)));
  card.append(el("p","ai-read-copy",String(text||"").slice(0,3500)));
  card.append(button(label(["复制文案","Copy text"],lang),async()=>{try{await navigator.clipboard.writeText(String(text||""));onFeedback?.("copied")}catch{}}));
  container.append(card);
}
