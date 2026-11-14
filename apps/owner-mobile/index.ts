
const HTML=[
'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EW VERDORA Owner</title><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
'<style>*{box-sizing:border-box}body{margin:0;background:#0E1111;color:#ecf3ee;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}.shell{max-width:760px;margin:auto;padding:18px 14px 60px}.top,.row{display:flex;gap:8px;align-items:center}.top{justify-content:space-between}.brand{font-size:21px;font-weight:850}.muted{font-size:12px;color:#a6b6ae;line-height:1.5}.card{background:#161A1A;border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:15px;margin-top:12px}.title{font-weight:800;font-size:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.metric{font-size:22px;font-weight:850}.btn{min-height:42px;border:1px solid #384741;border-radius:13px;background:#1d2924;color:#eaf7ee;padding:0 13px;font-weight:700}.primary{background:#2E7D5B;color:white;border-color:#2E7D5B}input,select,textarea{width:100%;background:#101816;color:#ecf3ee;border:1px solid #384741;border-radius:13px;padding:10px 12px;min-height:45px}.form{display:grid;gap:8px}.hidden{display:none!important}.item{padding:11px 0;border-top:1px solid rgba(255,255,255,0.08)}.item:first-child{border-top:0}.pill{display:inline-block;border:1px solid #385548;border-radius:999px;padding:4px 8px;font-size:11px}.danger{color:#ff9186}.ok{color:#67dca8}@media(min-width:640px){.grid{grid-template-columns:repeat(4,1fr)}}@media(min-width:1100px){.shell{max-width:1200px}.grid{grid-template-columns:repeat(4,1fr)}}@media(prefers-reduced-motion:no-preference){.card{animation:rise .45s ease both}@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}}</style></head><body><main class="shell">',
'<div class="top"><div><div class="brand">EW VERDORA</div><div class="muted">Owner Command · Quote Review & Security</div></div><button id="logout" class="btn hidden">Sign out</button></div>',
'<div id="login" class="card"><div class="title">Owner Secure Access</div><div class="muted">Open your one-time Owner Recovery Link. Email magic-link login is disabled to avoid redirect and rate-limit failures.</div><div class="form" style="margin-top:12px"><input id="email" class="hidden" type="email" placeholder="owner@email.com"><button id="loginBtn" class="btn primary hidden">Send sign-in link</button><div id="msg" class="muted"></div></div></div>',
'<div id="app" class="hidden"><div class="card"><div class="row" style="justify-content:space-between"><div class="title">Company Health</div><span id="mode" class="pill"></span></div><div class="grid" style="margin-top:13px"><div><div class="muted">30D Net Margin</div><div id="margin" class="metric"></div></div><div><div class="muted">Orders Today</div><div id="orders" class="metric"></div></div><div><div class="muted">Revenue Today</div><div id="revenue" class="metric"></div></div><div><div class="muted">Orders / Active Agent</div><div id="avg" class="metric"></div></div></div></div>',
'<div class="card"><div class="grid"><div><div class="muted">Active Agents</div><div id="active" class="metric"></div></div><div><div class="muted">Dormant</div><div id="dormant" class="metric"></div></div><div><div class="muted">Commission Liability</div><div id="comm" class="metric"></div></div><div><div class="muted">Bonus Liability</div><div id="bonus" class="metric"></div></div></div></div>',
'<div class="card"><div class="row" style="justify-content:space-between"><div class="title">Serious Exceptions</div><span id="exCount" class="pill"></span></div><div id="exceptions"></div></div>',
'<div class="card"><div class="row" style="justify-content:space-between"><div class="title">Manual Quote Review</div><span id="quoteCount" class="pill"></span></div><div class="muted">确认分类后由官方函数计算报价，不能在审核时更改全局成本基准。</div><div id="quoteQueue"></div></div>',
'<div class="card hidden" id="launchOrdersCard"><div class="title">Order & Payment / 订单与收款</div><div class="muted">Only create an order after the Agent has accepted a formal quote. Confirm payment only after checking actual bank evidence. 仅确认真实收到的款项。</div><div id="launchQuoteOrders"></div><div class="title" style="margin-top:15px">Orders / 订单</div><div id="launchPayments"></div></div>',
'<div class="card hidden" id="launchProgressCard"><div class="title">Agent Progress / 代理上手进度</div><div class="muted">Required courses, certification and order access / 必修课、认证及接单权限</div><div id="launchAgentProgress"></div></div>',
'<div class="card hidden" id="handbookCard"><div class="title">Grok Product Handbook / 产品手册导入</div><div class="muted">Upload Claude-reviewed handbook_content.json. Review by batch and product line, edit drafts, then approve the batch. / 上传已审核 JSON，依批次与业务线检查、编辑草稿，然后整批核准。</div><div class="form" style="margin-top:10px"><input type="file" id="handbookFile" accept=".json,application/json" aria-label="Grok handbook JSON"><button id="handbookImportBtn" class="btn primary">Import draft / 导入待审核</button><div id="handbookMsg" class="muted"></div></div><div class="title" style="margin-top:16px">Pending Owner review / 待核准内容</div><div id="handbookPending"></div></div>',
'<div class="card" id="baselineCard"><div class="title">Global Reference Cost Baseline / 全局成本基准</div><div class="muted" style="color:#D4B47A">会影响之后所有同类报价。此操作与单笔报价审核完全分开，必须二次确认。</div><div class="form" style="margin-top:10px"><select id="bSize"><option>small</option><option selected>medium</option><option>large</option><option>xl</option><option>structure</option></select><select id="bDensity"><option>light</option><option selected>medium</option><option>full</option><option>very_full</option></select><select id="bPremium"><option>low</option><option selected>medium</option><option>high</option><option>very_high</option></select><select id="bComplexity"><option>low</option><option selected>medium</option><option>high</option><option>special</option></select><input id="bCost" type="number" min="0" step="0.01" placeholder="安全生产成本 RM"><button id="baselineBtn" class="btn">修改全局基准 / Change global baseline</button><div id="baselineMsg" class="muted"></div></div></div>',
'<div class="card"><div class="title">Agent Access Link</div><div class="muted">Create a one-time login link valid for 24 hours. Use this when email delivery is delayed or rate-limited.</div><div class="form" style="margin-top:11px"><input id="inviteEmail" type="email" placeholder="agent@email.com"><button id="inviteBtn" class="btn primary">Create one-time Agent link</button><div id="inviteOut" class="muted"></div><button id="copyInvite" class="btn hidden">Copy link</button></div></div>',
'<div class="card"><div class="title">Owner Recovery Link</div><div class="muted">Create a one-time Owner recovery link valid for 24 hours. Save it securely in case email sign-in is unavailable.</div><div class="form" style="margin-top:11px"><button id="recoveryBtn" class="btn primary">Create Owner recovery link</button><div id="recoveryOut" class="muted"></div><button id="copyRecovery" class="btn hidden">Copy recovery link</button></div></div>',
'<div class="card"><div class="title">Add OPEX</div><div class="form" style="margin-top:11px"><input id="date" type="date"><input id="category" placeholder="Category"><input id="amount" type="number" step="0.01" placeholder="Amount RM"><input id="note" placeholder="Note"><button id="opexBtn" class="btn primary">Save OPEX & Recalculate</button><div id="opexMsg" class="muted"></div></div></div></div>',
'<script src="/owner.js"></script></main></body></html>'
].join("\n");
const JS=String.raw`
let sb,session=null;
const $=x=>document.getElementById(x);
const escapeHtml=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const safeImageUrl=v=>{try{const u=new URL(String(v||""));return u.protocol==="https:"&&u.hostname.endsWith(".supabase.co")?u.href:""}catch{return""}};
const KUCHING_TZ="Asia/Kuching";
const kuchingDate=value=>{const parts=new Intl.DateTimeFormat("en-GB",{timeZone:KUCHING_TZ,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(value instanceof Date?value:new Date(value));const get=t=>parts.find(p=>p.type===t)?.value||"";return get("year")+"-"+get("month")+"-"+get("day")};
const kuchingDateTime=value=>new Intl.DateTimeFormat("en-GB",{timeZone:KUCHING_TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value))+" MYT";
const friendlyError=code=>{
  const c=String(code||"").toLowerCase();
  if(c.includes("owner_required")||c.includes("forbidden"))return "Owner access required. / 需要 Owner 权限。";
  if(c.includes("invalid")||c.includes("expired"))return "This secure link is invalid or expired. / 安全链接无效或已过期。";
  if(c.includes("rate"))return "Service is temporarily busy. Please try again later. / 服务暂时繁忙，请稍后再试。";
  return "Unable to complete this action. Please try again. / 暂时无法完成，请再试一次。";
};
async function call(body){let r=await fetch(CFG.url+"/functions/v1/owner-session",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token,"apikey":CFG.key},body:JSON.stringify(body||{})});let j=await r.json();if(!r.ok)throw Error(j.error||"Request failed");return j}
function show(x){$("login").classList.toggle("hidden",x!=="login");$("app").classList.toggle("hidden",x!=="app");$("logout").classList.toggle("hidden",x==="login")}
async function refreshHandbook(){
  const j=await call({action:"handbook_pending"});
  const entries=j.entries||[],batchById=new Map((j.batches||[]).map(b=>[b.id,b]));
  const group=new Map();
  for(const row of entries){
    const batch=row.import_batch_id||"legacy";
    if(!group.has(batch))group.set(batch,[]);
    group.get(batch).push(row);
  }
  const lineNames={
    condolence:"Condolence / 帛事花圈",opening:"Grand Opening / 开张",
    bouquet:"Bouquet / 花束",wedding_event:"Wedding & Event / 婚礼活动",
    wholesale:"Wholesale / 批发",general:"FAQ & General / FAQ 与通用"
  };
  $("handbookPending").innerHTML=entries.length?[...group].map(([batchId,items])=>{
    const batch=batchById.get(batchId);
    const byLine=new Map();
    for(const row of items){
      const key=row.product_line||"general";
      if(!byLine.has(key))byLine.set(key,[]);
      byLine.get(key).push(row);
    }
    const lineGroups=[...byLine].map(([line,rows])=>
      "<details class='hb-line' open><summary><b>"+escapeHtml(lineNames[line]||line)+"</b> · "+rows.length+" pending</summary>"
      +rows.sort((a,b)=>Number(a.sort||0)-Number(b.sort||0)).map(row=>{
        const id=escapeHtml(row.id);
        return "<div class='item hb-item' data-id='"+id+"'>"
          +"<div class='muted'>"+escapeHtml(row.kind)+" · "+escapeHtml(row.code||"Seed")+"</div>"
          +"<label class='muted'>English title<input class='hb-title-en' maxlength='120' value='"+escapeHtml(row.title_en)+"'></label>"
          +"<label class='muted'>中文标题<input class='hb-title-zh' maxlength='120' value='"+escapeHtml(row.title_zh)+"'></label>"
          +"<label class='muted'>English content<textarea class='hb-body-en' rows='3' maxlength='10000'>"+escapeHtml(row.body_en)+"</textarea></label>"
          +"<label class='muted'>中文内文<textarea class='hb-body-zh' rows='3' maxlength='10000'>"+escapeHtml(row.body_zh)+"</textarea></label>"
          +"<div class='row' style='flex-wrap:wrap'>"
          +"<button class='btn hb-save' data-id='"+id+"'>Save edit / 保存修改</button>"
          +"<button class='btn primary hb-review' data-id='"+id+"' data-decision='approve'>Approve / 核准</button>"
          +"<button class='btn hb-review' data-id='"+id+"' data-decision='reject'>Reject / 拒绝</button>"
          +"</div></div>";
      }).join("")+"</details>"
    ).join("");
    const batchTitle=batch
      ?escapeHtml(batch.source_version)+" · "+escapeHtml(kuchingDateTime(batch.created_at))
      :"Legacy pending entries / 旧版待确认";
    return "<section class='card hb-batch' style='margin-top:12px;padding:12px'>"
      +"<div class='title'>Import batch / 导入批次</div>"
      +"<div class='muted'>"+batchTitle+" · "+items.length+" pending</div>"
      +(batch?"<button class='btn primary hb-bulk' style='margin-top:8px' data-batch='"+escapeHtml(batchId)+"' data-count='"+items.length+"'>Approve entire batch / 整批核准 ("+items.length+")</button>":"")
      +lineGroups+"</section>";
  }).join(""):"<div class='item muted'>No pending handbook entries. / 目前没有待审核内容。</div>";
  document.querySelectorAll(".hb-bulk").forEach(btn=>btn.onclick=async()=>{
    const n=Number(btn.dataset.count||0);
    // One tap + explicit second confirmation: do not publish silently.
    if(!confirm("Publish ALL "+n+" pending entries in this batch to Agents?\n确认将该批次所有 "+n+" 项内容发布给 Agent？"))return;
    btn.disabled=true;
    try{
      const j=await call({action:"handbook_bulk_approve",batch_id:btn.dataset.batch,confirm:true});
      $("handbookMsg").textContent=String(j.approved)+" entries approved / 已整批核准并发布。";
      await refreshHandbook();
    }catch(e){$("handbookMsg").textContent=friendlyError(e?.message)}
    finally{btn.disabled=false}
  });
  document.querySelectorAll(".hb-save").forEach(btn=>btn.onclick=async()=>{
    const wrap=btn.closest(".hb-item");
    const fields={
      title_en:wrap.querySelector(".hb-title-en").value,
      title_zh:wrap.querySelector(".hb-title-zh").value,
      body_en:wrap.querySelector(".hb-body-en").value,
      body_zh:wrap.querySelector(".hb-body-zh").value
    };
    if(Object.values(fields).some(x=>!x.trim())){
      $("handbookMsg").textContent="All bilingual fields required / 中英文标题及内文均必填";return;
    }
    btn.disabled=true;
    try{
      await call({action:"handbook_update",id:btn.dataset.id,...fields});
      $("handbookMsg").textContent="Draft saved (still pending Owner approval) / 草稿已更新，尚未发布。";
      await refreshHandbook();
    }catch(e){$("handbookMsg").textContent=friendlyError(e?.message)}
    finally{btn.disabled=false}
  });
  document.querySelectorAll(".hb-review").forEach(btn=>btn.onclick=async()=>{
    const approved=btn.dataset.decision==="approve";
    if(!confirm(approved?"Publish this entry to Agents? / 确认发布此条？":"Reject this pending entry? / 确认拒绝此条？"))return;
    btn.disabled=true;
    try{
      await call({action:"handbook_review",id:btn.dataset.id,decision:btn.dataset.decision});
      $("handbookMsg").textContent=approved?"Approved / 已核准":"Rejected / 已拒绝";
      await refreshHandbook();
    }catch(e){$("handbookMsg").textContent=friendlyError(e?.message)}
    finally{btn.disabled=false}
  });
}

async function refreshLaunchPanels(){
  const [p,o]=await Promise.all([
    call({action:"launch_agent_progress"}),
    call({action:"launch_orders"})
  ]);
  const es=escapeHtml;
  $("launchAgentProgress").innerHTML=(p.agents||[]).length?(p.agents||[]).map(a=>
    "<div class='item'><b>"+es(a.display_name||a.agent_code)+"</b> <span class='pill'>"+es(a.status)+"</span>"+
    "<div class='muted'>"+es(a.agent_code)+" · Courses "+Number(a.passed_modules||0)+"/"+Number(p.required_count||7)+
    " · Exam "+(a.exam_passed?"Passed / 已通过":es(a.exam_status||"Not started"))+"</div></div>"
  ).join(""):"<div class='muted item'>No registered agents / 暂无代理。</div>";
  const eligible=o.eligible_quotes||[],orders=o.orders||[];
  $("launchQuoteOrders").innerHTML=eligible.length?eligible.map(q=>{
    const id=es(q.id);
    return "<div class='item launch-quote' data-quote='"+id+"'><b>"+es(q.customer_label)+
      "</b> <span class='pill'>"+es(q.agent_name)+"</span>"+
      "<div class='muted'>Approved flower amount RM "+Number(q.selling_price||0).toFixed(2)+" · "+es(q.status)+"</div>"+
      "<div class='form'><input class='launch-code' maxlength='60' placeholder='Order code / 订单编号 (e.g. EV-2026-0001)' aria-label='Order code'>"+
      "<input class='launch-fee' type='number' min='0' max='10000' step='0.01' value='0' aria-label='Customer delivery fee RM'>"+
      "<button class='btn primary launch-create-order' type='button'>Create order / 建立订单</button>"+
      "<div class='muted launch-qmsg'></div></div></div>";
  }).join(""):"<div class='muted item'>No eligible accepted quotes / 暂无可建立订单的报价。</div>";
  const byId=new Map(eligible.map(q=>[q.id,q]));
  document.querySelectorAll(".launch-create-order").forEach(btn=>btn.onclick=async()=>{
    const wrap=btn.closest(".launch-quote"),id=wrap.dataset.quote,q=byId.get(id);
    const code=wrap.querySelector(".launch-code").value.trim();
    const fee=Number(wrap.querySelector(".launch-fee").value);
    const msg=wrap.querySelector(".launch-qmsg");
    if(!q||!code||!Number.isFinite(fee)||fee<0){msg.textContent="Enter a valid order code and delivery fee. / 请填写订单编号及送货费。";return}
    const total=Number(q.selling_price)+fee;
    if(!confirm("Create order "+code+"?\nFlower RM "+Number(q.selling_price).toFixed(2)+" + Delivery RM "+fee.toFixed(2)+" = RM "+total.toFixed(2)+"\n确认建立订单？"))return;
    btn.disabled=true;
    try{
      await call({action:"launch_create_order",quote_id:id,order_code:code,delivery_fee:fee,confirm:true});
      await refresh();
    }catch(e){msg.textContent=friendlyError(e.message)}
    finally{btn.disabled=false}
  });
  $("launchPayments").innerHTML=orders.length?orders.map(o=>{
    const total=Number(o.commissionable_revenue||0)+Number(o.delivery_fee||0),id=es(o.id);
    return "<div class='item launch-pay' data-order='"+id+"'><b>"+es(o.order_code)+"</b> <span class='pill'>"+es(o.status)+" / "+es(o.payment_status)+"</span>"+
      "<div class='muted'>"+es(o.agent_name)+" · Flower RM "+Number(o.commissionable_revenue||0).toFixed(2)+
      " + Delivery RM "+Number(o.delivery_fee||0).toFixed(2)+" = <b>RM "+total.toFixed(2)+"</b></div>"+
      (o.payment_status==="pending"?"<div class='form' style='margin-top:10px'>"+
      "<input class='launch-payment-ref' maxlength='80' placeholder='Bank transaction reference / 银行交易参考号' aria-label='Bank reference'>"+
      "<label class='muted'><input class='launch-bank-checked' type='checkbox' style='width:auto;min-height:auto'> 我已在银行记录核对真实收款及金额 / I checked bank evidence</label>"+
      "<button type='button' class='btn primary launch-confirm-payment'>Confirm payment / 确认已收款</button>"+
      "<div class='muted launch-pmsg'></div></div>":"")+
      (o.status==="completed"?"<div class='muted'>Commission accrued / 已入账佣金：RM "+es(o.commission_amount??o.commission_accrued??"—")+"</div>":"")+
      (o.payment_status==="paid"&&o.status!=="completed"?
        "<div class='form launch-completion' style='margin-top:10px'>"+
        [["production_cost","Production cost / 制作成本"],["delivery_cost","Delivery cost / 配送成本"],["payment_cost","Payment cost / 支付手续费"],["refund_cost","Refund cost / 退款成本"],["risk_cost","Risk cost / 风险成本"]].map(([key,label])=>
          "<label class='muted'>"+es(label)+" (RM)<input class='completion-"+key+"' type='number' min='0' max='100000' step='0.01' value='0'></label>").join("")+
        "<label class='muted'>Fulfilment / 制作方式<select class='completion-type'><option value='internal'>Internal / 内部制作</option><option value='external'>External / 外部制作</option></select></label>"+
        "<label class='muted'><input type='checkbox' class='completion-qc' style='width:auto;min-height:auto'> QC passed / 品质检查通过</label>"+
        "<label class='muted'><input type='checkbox' class='completion-rework' style='width:auto;min-height:auto'> Rework / 返工</label>"+
        "<button type='button' class='btn primary launch-complete-order'>Complete order / 完成订单</button>"+
        "<div class='muted launch-cmsg'></div></div>":"")+"</div>";
  }).join(""):"<div class='muted item'>No orders / 暂无订单。</div>";
  document.querySelectorAll(".launch-complete-order").forEach(btn=>btn.onclick=async()=>{
    const wrap=btn.closest(".launch-pay"),id=wrap.dataset.order,form=wrap.querySelector(".launch-completion");
    const msg=wrap.querySelector(".launch-cmsg");
    const payload={action:"launch_complete_order",order_id:id,fulfilment_type:form.querySelector(".completion-type").value,
      qc_pass:form.querySelector(".completion-qc").checked,rework:form.querySelector(".completion-rework").checked};
    for(const key of ["production_cost","delivery_cost","payment_cost","refund_cost","risk_cost"]){
      const raw=form.querySelector(".completion-"+key).value;
      const value=Number(raw);
      if(raw.trim()===""||!Number.isFinite(value)||value<0||value>100000){
        msg.textContent="Enter valid costs between RM 0 and RM 100,000. / 请输入有效成本。";return;
      }
      payload[key]=value;
    }
    if(!confirm("Complete this paid order and accrue commission? / 确认完成已付款订单并入账佣金？"))return;
    btn.disabled=true;
    try{await call({...payload,confirm:true});await refresh()}
    catch(e){msg.textContent=friendlyError(e.message)}
    finally{btn.disabled=false}
  });
  const orderMap=new Map(orders.map(o=>[o.id,o]));
  document.querySelectorAll(".launch-confirm-payment").forEach(btn=>btn.onclick=async()=>{
    const wrap=btn.closest(".launch-pay"),id=wrap.dataset.order,o=orderMap.get(id);
    const ref=wrap.querySelector(".launch-payment-ref").value.trim();
    const checked=wrap.querySelector(".launch-bank-checked").checked;
    const msg=wrap.querySelector(".launch-pmsg");
    if(!o||!checked||ref.length<5){msg.textContent="Check actual bank evidence and enter the reference first. / 请先核实实际收款和参考号。";return}
    const total=Number(o.commissionable_revenue)+Number(o.delivery_fee);
    if(!confirm("BANK VERIFIED? Confirm RM "+total.toFixed(2)+" received for "+o.order_code+"?\n请再次核对银行交易后确认。"))return;
    btn.disabled=true;
    try{
      await call({action:"launch_confirm_payment",order_id:id,bank_reference:ref,bank_evidence_checked:true,confirm:true});
      await refresh();
    }catch(e){msg.textContent=friendlyError(e.message)}
    finally{btn.disabled=false}
  });
}

async function refresh(){try{let [j,qj]=await Promise.all([call({action:"dashboard"}),call({action:"quote_queue"})]),d=j.dashboard||{};show("app");$("mode").textContent=String(d.profit_mode||"normal").toUpperCase();$("margin").textContent=(Number(d.net_margin_30d||0)*100).toFixed(1)+"%";$("orders").textContent=d.orders_today||0;$("revenue").textContent="RM "+Number(d.revenue_today||0).toFixed(0);$("avg").textContent=Number(d.avg_orders_per_active_agent||0).toFixed(2);$("active").textContent=d.active_agents||0;$("dormant").textContent=d.dormant_agents||0;$("comm").textContent="RM "+Number(d.commission_liability||0).toFixed(0);$("bonus").textContent="RM "+Number(d.bonus_liability||0).toFixed(0);$("exCount").textContent=(d.serious_exceptions||0)+" open";let ex=j.exceptions||[];$("exceptions").innerHTML=ex.length?ex.map(e=>"<div class=item><div class=row style='justify-content:space-between'><div><b class=damage>"+escapeHtml(String(e.severity||"").toUpperCase())+" · "+escapeHtml(e.type)+"</b><div class=muted>"+escapeHtml(e.summary)+"</div></div><div class=row><button class='btn ex' data-id='"+escapeHtml(e.id)+"' data-a='freeze'>Freeze</button><button class='btn ex' data-id='"+escapeHtml(e.id)+"' data-a='dismiss'>Dismiss</button></div></div></div>").join(""):"<div class='item muted'>No serious exceptions.</div>";document.querySelectorAll(".ex").forEach(b=>b.onclick=async()=>{await call({action:"decide_exception",exception_id:b.dataset.id,decision:b.dataset.a});await refresh()});
let qq=qj.queue||[];
$("quoteCount").textContent=qq.length+" pending";
$("quoteQueue").innerHTML=qq.length?qq.map(q=>{
  const esc=escapeHtml, id=escapeHtml(q.id);
  const label=esc(q.customer_label||"Customer"), agent=esc(q.agent_name||q.agent_code||q.agent_id||"Agent");
  const dims=[["size","small,medium,large,xl,structure",q.size_band||"medium"],["density","light,medium,full,very_full",q.density_band||"medium"],["premium","low,medium,high,very_high",q.premium_intensity||"medium"],["complexity","low,medium,high,special",q.complexity_band||"medium"]];
  const choices=dims.map(([k,options,selected])=>"<label class='muted'>"+esc(k)+"<select class='q-"+k+"' data-id='"+id+"'>"+options.split(",").map(v=>"<option value='"+esc(v)+"' "+(v===selected?"selected":"")+">"+esc(v)+"</option>").join("")+"</select></label>").join("");
  const image=safeImageUrl(q.image_url);
  return "<div class='item'><b>RM "+Number(q.customer_budget||0).toFixed(0)+" · "+escapeHtml(q.design_commitment)+"</b>"
  +"<div class='muted'>"+agent+" · "+label+" · "+escapeHtml(q.status)+"</div>"
  +"<div class='muted'>AI: "+esc(q.analysis_provider||"—")+" · Confidence: "+esc(q.confidence==null?"—":Math.round(Number(q.confidence)*100)+"%")+" · Reason: "+esc(q.review_reason||"—")+"</div>"
  +(image?"<img src='"+esc(image)+"' alt='Quote reference' style='width:100%;max-height:260px;object-fit:contain;border-radius:12px;margin-top:8px'>":"")
  +"<div class='form' style='margin-top:9px'>"+choices+"<textarea class='q-note' data-id='"+id+"' placeholder='备注 / Note (optional)' maxlength='500'></textarea>"
  +"<div class='row'><button class='btn primary q-act' data-id='"+id+"' data-decision='approve'>确认分类 / Quote</button>"+(CFG.quoteStatusActionsEnabled===true?"<button class='btn q-act' data-id='"+id+"' data-decision='request_info'>补资料</button><button class='btn q-act' data-id='"+id+"' data-decision='reject'>拒绝</button>":"")+"</div>"
  +"<div class='muted q-msg' data-id='"+id+"'></div></div></div>";
}).join(""):"<div class='item muted'>No manual quote reviews.</div>";
document.querySelectorAll(".q-act").forEach(b=>b.addEventListener("click",async()=>{
  const wrap=b.closest(".item"), msg=wrap.querySelector(".q-msg"), decision=b.dataset.decision;
  if(!confirm(decision==="approve"?"确认分类并使用官方报价规则？":"确认"+(decision==="reject"?"拒绝":"请求补资料")+"这笔报价？"))return;
  const selectors=k=>wrap.querySelector(".q-"+k).value;
  try{
    b.disabled=true;msg.textContent="Processing / 处理中…";
    const result=await call({action:"review_quote",request_id:b.dataset.id,decision,
      size:selectors("size"),density:selectors("density"),premium:selectors("premium"),
      complexity:selectors("complexity"),note:wrap.querySelector(".q-note").value});
    msg.textContent="✓ "+(result.quote_request.status||"")+" · "+(result.quote_request.customer_note_zh||"");
    await refresh();
  }catch(e){msg.textContent=friendlyError(e?.message)}
  finally{b.disabled=false}
}));
$("baselineCard").classList.toggle("hidden",j.role!=="owner");
$("handbookCard").classList.toggle("hidden",j.role!=="owner");
if(j.role==="owner"){try{await refreshHandbook()}catch(e){$("handbookMsg").textContent=friendlyError(e?.message)}}
$("recoveryBtn").closest(".card").classList.toggle("hidden",j.role!=="owner");
 $("launchOrdersCard").classList.toggle("hidden",j.role!=="owner");
 $("launchProgressCard").classList.toggle("hidden",j.role!=="owner");
 if(j.role==="owner")try{await refreshLaunchPanels()}catch(e){
   $("launchPayments").textContent="Unable to load orders. / 订单读取失败。";
   $("launchAgentProgress").textContent="Unable to load Agent progress. / 代理进度读取失败。";
 }


}catch(e){
  const m=String(e?.message||e||"");
  if(session&&/owner_required|forbidden/i.test(m)){
    session=null;
    await sb.auth.signOut();
    show("login");
    $("msg").textContent="Owner access required. / 需要 Owner 权限。";
    return;
  }
  show("login");
  $("msg").textContent=friendlyError(m);
}}
let loginPending=false;
$("loginBtn").onclick=async()=>{
  if(loginPending)return;
  const email=$("email").value.trim();
  if(!email){$("msg").textContent="Please enter your Owner email. / 请输入 Owner Email。";return}
  loginPending=true;
  const btn=$("loginBtn");
  btn.disabled=true;
  btn.textContent="Sending...";
  $("msg").textContent="";
  try{
    const {error}=await sb.auth.signInWithOtp({
      email,
      options:{
        shouldCreateUser:false,
        emailRedirectTo:"https://owner-mobile-production.up.railway.app"
      }
    });
    if(error)throw error;
    $("msg").textContent="Sign-in link sent. Check your email.";
    btn.textContent="Link sent";
  }catch(e){
    $("msg").textContent=friendlyError(e?.message);
    btn.disabled=false;
    btn.textContent="Send sign-in link";
    loginPending=false;
  }
};
$("logout").onclick=async()=>{await sb.auth.signOut();session=null;show("login")};
let latestInvite="";
$("inviteBtn").onclick=async()=>{
  const email=$("inviteEmail").value.trim();
  $("inviteOut").textContent="";
  $("copyInvite").classList.add("hidden");
  if(!email){$("inviteOut").textContent="Please enter the Agent email. / 请输入 Agent Email。";return}
  try{
    $("inviteBtn").disabled=true;
    $("inviteBtn").textContent="Creating...";
    const j=await call({action:"create_agent_invite",email});
    latestInvite=j.invite_url||"";
    $("inviteOut").textContent="Ready · valid until "+kuchingDateTime(j.expires_at)+" / 已建立 · 有效至古晋时间 "+kuchingDateTime(j.expires_at);
    if(latestInvite)$("copyInvite").classList.remove("hidden");
  }catch(e){
    $("inviteOut").textContent=friendlyError(e?.message);
  }finally{
    $("inviteBtn").disabled=false;
    $("inviteBtn").textContent="Create one-time Agent link";
  }
};
$("baselineBtn").onclick=async()=>{
  const val=Number($("bCost").value);
  if(!$("bCost").value||!Number.isFinite(val)||val<0||val>100000){
    $("baselineMsg").textContent="请输入有效成本 / Enter a valid cost.";return;
  }
  if(!confirm("会影响之后所有同类报价。确定修改全局成本基准吗？\nThis changes all future quotes in the same category. Confirm?"))return;
  const body={action:"set_reference_baseline",size:$("bSize").value,density:$("bDensity").value,
    premium:$("bPremium").value,complexity:$("bComplexity").value,
    safe_cost:val,confirm_global:true};
  try{$("baselineBtn").disabled=true;await call(body);$("baselineMsg").textContent="Saved and audited / 已保存并审计 ✓"}
  catch(e){$("baselineMsg").textContent=friendlyError(e?.message)}
  finally{$("baselineBtn").disabled=false}
};
$("copyInvite").onclick=async()=>{
  if(!latestInvite)return;
  try{await navigator.clipboard.writeText(latestInvite);$("inviteOut").textContent="Copied ✓ · send this link to the agent via WhatsApp."}
  catch{$("inviteOut").textContent=latestInvite}
};
let latestRecovery="";
$("recoveryBtn").onclick=async()=>{
  $("recoveryOut").textContent="";
  $("copyRecovery").classList.add("hidden");
  try{
    $("recoveryBtn").disabled=true;
    $("recoveryBtn").textContent="Creating...";
    const j=await call({action:"create_owner_recovery_link"});
    latestRecovery=j.recovery_url||"";
    $("recoveryOut").textContent="Ready · valid until "+kuchingDateTime(j.expires_at)+". Save this link securely. / 已建立 · 有效至古晋时间 "+kuchingDateTime(j.expires_at)+"，请安全保存。";
    if(latestRecovery)$("copyRecovery").classList.remove("hidden");
  }catch(e){
    $("recoveryOut").textContent=friendlyError(e?.message);
  }finally{
    $("recoveryBtn").disabled=false;
    $("recoveryBtn").textContent="Create Owner recovery link";
  }
};
$("copyRecovery").onclick=async()=>{
  if(!latestRecovery)return;
  try{await navigator.clipboard.writeText(latestRecovery);$("recoveryOut").textContent="Copied ✓ · keep this recovery link private."}
  catch{$("recoveryOut").textContent=latestRecovery}
};
$("handbookImportBtn").onclick=async()=>{
  const btn=$("handbookImportBtn"),file=$("handbookFile").files?.[0],msg=$("handbookMsg");
  if(!file){msg.textContent="Choose handbook_content.json first. / 请先选择 JSON 文件。";return}
  if(file.size>262144){msg.textContent="File exceeds 256 KiB. / 文件超过大小限制。";return}
  btn.disabled=true;msg.textContent="Validating and importing… / 验证与导入中…";
  try{
    const content=JSON.parse(await file.text());
    const j=await call({action:"handbook_import",content});
    msg.textContent="Added "+Number(j.inserted||0)+" · updated "+Number(j.updated||0)+" · unchanged "+Number(j.unchanged||0)+". "+(j.pending_owner_review?"Owner approval required / 需要 Owner 核准":"No changes / 内容未变，未产生新批次");
    $("handbookFile").value="";
    await refreshHandbook();
  }catch(e){msg.textContent="Import failed: "+String(e?.message||"invalid_json").slice(0,140)}
  finally{btn.disabled=false}
};
$("opexBtn").onclick=async()=>{try{await call({action:"add_opex",date:$("date").value||kuchingDate(),category:$("category").value||"Other",amount:Number($("amount").value),note:$("note").value});$("opexMsg").textContent="Saved ✓";await refresh()}catch(e){$("opexMsg").textContent=friendlyError(e?.message)}};
(async()=>{
CFG=await fetch("/config").then(r=>r.json());
sb=window.supabase.createClient(CFG.url,CFG.key);
const hp=new URLSearchParams((location.hash||"").replace(/^#/,""));
const ownerInvite=hp.get("owner_invite");
if(ownerInvite){
  show("login");
  $("msg").textContent="Verifying secure Owner recovery link...";
  try{
    const r=await fetch(CFG.url+"/functions/v1/owner-auth",{
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":CFG.key},
      body:JSON.stringify({action:"invite_session",code:ownerInvite})
    });
    const j=await r.json();
    if(!r.ok)throw Error(j.error||"Owner recovery link failed");
    const {error}=await sb.auth.setSession({access_token:j.access_token,refresh_token:j.refresh_token});
    if(error)throw error;
    history.replaceState({},document.title,"/");
    $("msg").textContent="";
  }catch(e){
    history.replaceState({},document.title,"/");
    $("msg").textContent="Owner recovery link is invalid, expired, or already used.";
  }
}
const qs=new URLSearchParams(location.search);
const tokenHash=qs.get("token_hash");
if(tokenHash){
  show("login");
  $("msg").textContent="Verifying secure Owner sign-in...";
  const {error}=await sb.auth.verifyOtp({token_hash:tokenHash,type:"email"});
  if(error){
    history.replaceState({},document.title,"/");
    $("msg").textContent=friendlyError(error?.message||"invalid_or_expired");
  }else{
    history.replaceState({},document.title,"/");
  }
}
let g=await sb.auth.getSession();
session=g.data.session;
if(session)await refresh();else show("login");
sb.auth.onAuthStateChange(async(_e,s)=>{session=s;if(s)await refresh();else show("login")});
$("date").value=kuchingDate()
})();
`;
const CSP=[
  "default-src 'self'",
  "script-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "upgrade-insecure-requests"
].join("; ");
const securityHeaders=(extra={})=>({
  "Content-Security-Policy":CSP,
  "X-Content-Type-Options":"nosniff",
  "Referrer-Policy":"strict-origin-when-cross-origin",
  "Permissions-Policy":"camera=(), microphone=(), geolocation=()",
  ...extra
});
export default {
  async fetch(req){
    const u=new URL(req.url);
    if(u.pathname==="/config")return Response.json({url:Bun.env.SUPABASE_URL||"",key:Bun.env.SUPABASE_PUBLISHABLE_KEY||"",quoteStatusActionsEnabled:Bun.env.OWNER_QUOTE_STATUS_ACTIONS_ENABLED==="true"},{headers:securityHeaders({"cache-control":"no-store"})});
    if(u.pathname==="/owner.js")return new Response(JS,{headers:securityHeaders({"content-type":"application/javascript; charset=utf-8","cache-control":"no-store"})});
    if(u.pathname==="/health")return Response.json({ok:true,service:"EW VERDORA Owner Mobile",version:"0.2.1-phase0"},{headers:securityHeaders({"cache-control":"no-store"})});
    return new Response(HTML,{headers:securityHeaders({"content-type":"text/html; charset=utf-8","cache-control":"no-store"})});
  }
};