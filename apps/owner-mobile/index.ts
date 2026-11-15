
const OCCASIONS_HTML=String.raw`
<style>.occasion-filters,.occasion-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:12px}.occasion-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.occasion-text{white-space:pre-wrap;overflow-wrap:anywhere}.occasion-link{display:block;color:#8cdbb1;overflow-wrap:anywhere;margin:8px 0}.occasion-form{border:1px solid #385548;border-radius:14px;padding:12px;margin-top:12px}.occasion-form textarea{min-height:90px}.occasion-confirm{display:flex;gap:10px;align-items:flex-start;margin:12px 0;line-height:1.5}.occasion-confirm input{width:24px;height:24px;min-height:24px;flex-shrink:0;accent-color:#67dca8}.occasion-heading{margin:0;font-size:18px}.occasion-help{margin-top:8px}</style>
<section id="ownerOccasionsCard" class="card hidden" aria-labelledby="ownerOccasionsTitle">
<div class="row" style="justify-content:space-between;flex-wrap:wrap"><h2 id="ownerOccasionsTitle" class="occasion-heading">场合日历 / Occasion calendar</h2><span id="occasionTotal" class="pill"></span></div>
<p class="muted">预计日期只用于预热；核对来源并亲自确认后才能开放锁货。 / Estimated dates are for promotion planning; confirm actual dates before stock locking.</p>
<div class="occasion-actions"><button id="occasionRefresh" type="button" class="btn">刷新场合 / Refresh</button><button id="occasionAdd" type="button" class="btn primary">新增场合 / Add occasion</button></div>
<div class="occasion-filters"><label class="muted">搜索名称或地区 / Search<input id="occasionSearch" type="search" maxlength="240"></label><label class="muted">月份 / Month<input id="occasionMonthFilter" type="month"></label><label class="muted">类别 / Category<select id="occasionCategoryFilter"><option value="">全部类别 / All categories</option><option value="graduation">毕业季 / Graduation</option><option value="festival">大众节日 / Festival</option><option value="cultural">文化节日 / Cultural</option><option value="business">商务致意 / Business</option><option value="wedding">婚礼 / Wedding</option><option value="event">活动 / Event</option></select></label><label class="muted">日期状态 / Date status<select id="occasionStatusFilter"><option value="">全部状态 / All statuses</option><option value="confirmed">已确认 / Confirmed</option><option value="pattern">预计 / Estimated</option><option value="not_found">未找到 / Not found</option></select></label><label class="muted">用花需求 / Flower demand<select id="occasionDemandFilter"><option value="">全部需求 / All demand</option><option value="high">高 / High</option><option value="medium">中 / Medium</option><option value="low">低 / Low</option></select></label></div>
<div id="occasionMessage" class="muted occasion-help" role="status" aria-live="polite"></div>
<div id="occasionFormHost"></div>
<h3 class="title">待核实日期 / Date verification queue <span id="occasionPendingCount" class="pill">0</span></h3><div id="occasionVerificationQueue"></div>
<h3 class="title">场合列表 / Occasions</h3><div id="occasionList"></div>
</section>`;
const HTML=[
'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EW VERDORA Owner</title><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
'<style>*{box-sizing:border-box}body{margin:0;background:#0E1111;color:#ecf3ee;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}.shell{max-width:760px;margin:auto;padding:18px 14px 60px}.top,.row{display:flex;gap:8px;align-items:center}.top{justify-content:space-between}.brand{font-size:21px;font-weight:850}.muted{font-size:16px;color:#a6b6ae;line-height:1.5}.card{background:#161A1A;border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:15px;margin-top:12px}.title{font-weight:800;font-size:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.metric{font-size:22px;font-weight:850}.btn{min-height:48px;border:1px solid #384741;border-radius:13px;background:#1d2924;color:#eaf7ee;padding:0 13px;font-weight:700}.primary{background:#2E7D5B;color:white;border-color:#2E7D5B}input,select,textarea{width:100%;background:#101816;color:#ecf3ee;border:1px solid #384741;border-radius:13px;padding:10px 12px;min-height:48px;font-size:16px}.form{display:grid;gap:8px}.hidden{display:none!important}.item{padding:11px 0;border-top:1px solid rgba(255,255,255,0.08)}.item:first-child{border-top:0}.pill{display:inline-block;border:1px solid #385548;border-radius:999px;padding:4px 8px;font-size:16px}.danger{color:#ff9186}.ok{color:#67dca8}@media(min-width:640px){.grid{grid-template-columns:repeat(4,1fr)}}@media(min-width:1100px){.shell{max-width:1200px}.grid{grid-template-columns:repeat(4,1fr)}}@media(prefers-reduced-motion:no-preference){.card{animation:rise .45s ease both}@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}}.kyc-mode > :not(#kycPage){display:none!important}.kyc-photo{display:block;width:100%;max-width:100%;height:auto;max-height:650px;object-fit:contain;border:1px solid #384741;border-radius:12px;margin-top:8px;touch-action:pan-y;-webkit-user-select:none;user-select:none}.kyc-photo:not([width]){display:none}.kyc-field{overflow-wrap:anywhere;padding:6px 0;border-bottom:1px solid #384741}.kyc-item{display:block;text-align:left;width:100%;margin-top:8px}.danger-btn{background:#341d1d;border-color:#814441;color:#ffb3ad}.payout-line{display:flex;align-items:center;gap:10px;margin-top:12px;font-size:16px;line-height:1.5}.payout-tick{width:24px;height:24px;min-height:24px;flex-shrink:0;accent-color:#67dca8}.portfolio-thumb{width:100%;max-height:300px;object-fit:contain;background:#101816;border-radius:12px}.portfolio-form{display:grid;gap:9px;margin-top:10px}.portfolio-form textarea{min-height:96px}.portfolio-actions{display:flex;flex-wrap:wrap;gap:9px}.portfolio-actions button{flex:1;min-width:130px}..owner-daily-line{font-size:16px;line-height:1.6;margin:0 0 10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.09)}#launchAgentProgress .item .pill{margin-left:8px}#launchAgentProgress .row button{font-size:16px;min-height:48px}#launchAgentProgress textarea{font-size:16px;line-height:1.6;min-height:120px}.kyc-field strong{display:block;font-size:12px;color:#a6b6ae;margin-bottom:3px}</style></head><body><main class="shell">',
'<div class="top"><div><div class="brand">EW VERDORA</div><div class="muted">Owner Command · Quote Review & Security</div></div><button id="logout" class="btn hidden">Sign out</button></div>',
'<div id="login" class="card"><div class="title">Owner Secure Access</div><div class="muted">Open your one-time Owner Recovery Link. Email magic-link login is disabled to avoid redirect and rate-limit failures.</div><div class="form" style="margin-top:12px"><input id="email" class="hidden" type="email" placeholder="owner@email.com"><button id="loginBtn" class="btn primary hidden">Send sign-in link</button><div id="msg" class="muted"></div></div></div>',
'<div id="app" class="hidden"><div class="row" style="margin-top:12px"><button id="kycOpen" type="button" class="btn primary hidden">身份审核（读取中） / Identity check</button></div><section id="kycPage" class="hidden" aria-label="身份审核"><div class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><button id="kycBack" type="button" class="btn">← 返回 Owner 首页</button><div class="title">身份审核 / Identity check</div></div><div class="muted">仅显示称呼、地区、提交时间及 IC 后四位。敏感资料仅在查看时读取，60 秒自动遮盖。 / Sensitive details expire after 60 seconds.</div><div class="row" style="margin-top:12px"><button id="kycReload" class="btn" type="button">刷新列表 / Refresh</button><span id="kycCount" class="pill"></span></div><div id="kycMessage" class="muted" role="status" aria-live="polite"></div><div id="kycQueue"></div></div><section id="kycDetail" class="card hidden" aria-label="限时查看身份资料"><div class="row" style="justify-content:space-between"><div class="title">身份资料（限时查看）</div><button id="kycClose" class="btn" type="button">立即遮盖 / Hide</button></div><div id="kycClock" class="muted"></div><div id="kycFields" class="form" style="margin-top:10px"></div><div class="muted" style="margin-top:10px">IC 正面 / IC front (temporary view)</div><canvas id="kycCanvas" class="kyc-photo" role="img" aria-label="IC front photo"></canvas><div id="kycPhotoMessage" class="muted"></div><div id="kycActions" class="form" style="margin-top:12px"><div class="row" style="flex-wrap:wrap"><button id="kycApprove" type="button" class="btn primary">一键核准 / Approve</button><button id="kycReject" type="button" class="btn">退回 / Reject</button></div><label class="muted" for="kycRejectCode">退回原因（必填） / Rejection reason<select id="kycRejectCode"><option value="">请选择原因 / Choose a reason</option><option value="身份证照片有点模糊，请重新拍一张清楚、四个角都看得到的照片。 / IC photo is unclear. Please retake a clear photo with all four corners visible.">照片有点模糊，请重新拍清楚 / Photo is blurry</option><option value="你填写的资料和身份证对不上，请检查姓名和身份证号码后再送出。 / The details do not match the IC. Please check the name and IC number, then send again.">资料和身份证对不上 / Details do not match</option><option value="身份证照片没有拍完整，请重新拍整张正面，四个角都要看得到。 / The IC photo is incomplete. Please retake the full front with all four corners visible.">照片没有拍完整 / Photo is incomplete</option><option value="other">其他 / Other</option></select></label><label class="muted" for="kycRejectNote">说明 / Explanation<textarea id="kycRejectNote" rows="2" maxlength="500" placeholder="选择其他时必须填写 / Required when Other is selected"></textarea></label></div><button id="kycDelete" type="button" class="btn danger-btn">删除身份资料 / Delete identity details</button><div id="kycDecisionMessage" class="muted" role="status" aria-live="polite"></div></section><div id="kycMasked" class="card muted hidden" role="status" aria-live="polite"></div></section><section id="ownerDailyBriefCard" class="card hidden" aria-label="老板日报"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><div class="title">今天生意怎样 / Today at a glance</div><button id="dailyBriefLang" type="button" class="btn">English / 英文</button></div><div class="muted">数据来自今天的生意记录，建议由 AI 辅助。 / Numbers come from business records; suggestions are AI-assisted.</div><div id="dailyBriefContent" aria-live="polite" style="margin-top:12px"></div><button id="dailyBriefRefresh" type="button" class="btn">刷新日报 / Refresh</button></section><div class="card"><div class="row" style="justify-content:space-between"><div class="title">公司情况 / Company Health</div><span id="mode" class="pill"></span></div><div class="grid" style="margin-top:13px"><div><div class="muted">30 天净利润率 / 30D Net Margin</div><div id="margin" class="metric"></div></div><div><div class="muted">今天订单 / Orders Today</div><div id="orders" class="metric"></div></div><div><div class="muted">今天营业额 / Revenue Today</div><div id="revenue" class="metric"></div></div><div><div class="muted">每位活跃代理平均单数 / Orders per Active Agent</div><div id="avg" class="metric"></div></div></div></div>',
'<div class="card"><div class="grid"><div><div class="muted">活跃代理 / Active Agents</div><div id="active" class="metric"></div></div><div><div class="muted">很久没动的代理 / Dormant Agents</div><div id="dormant" class="metric"></div></div><div><div class="muted">待付佣金 / Commission Liability</div><div id="comm" class="metric"></div></div><div><div class="muted">待付奖金 / Bonus Liability</div><div id="bonus" class="metric"></div></div></div></div>',
'<div class="card"><div class="row" style="justify-content:space-between"><div class="title">需要你处理的问题 / Serious Exceptions</div><span id="exCount" class="pill"></span></div><div id="exceptions"></div></div>',
'<div class="card" id="profitFloorCard"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><div class="title">利润底线 / Contribution Margin Floor</div><span id="profitFloorValue" class="pill">—</span></div><div class="muted">自动报价继续使用更严格的动态目标；这里是任何新订单都不能低于的硬底线。 / Auto quotes keep the stricter dynamic target; this is the absolute floor for new orders.</div><div class="grid" style="margin-top:12px"><div><div class="muted">硬底线 / Hard floor</div><div id="profitFloorMetric" class="metric">—</div></div><div><div class="muted">自动报价目标 / Auto quote target</div><div id="profitAutoTarget" class="metric">—</div></div></div><div class="form" style="margin-top:12px"><label class="muted">调整底线（50%–80%） / Adjust floor<input id="profitFloorInput" type="number" min="50" max="80" step="1" value="50"></label><button id="profitFloorSave" class="btn" type="button">保存利润底线 / Save floor</button><div id="profitFloorMsg" class="muted" role="status"></div></div><div class="title" style="margin-top:16px">低于底线的报价 / Quotes needing review</div><div id="profitFloorQuotes"></div><div class="title" style="margin-top:16px">低于底线的已完成订单 / Completed orders below floor</div><div id="profitFloorOrders"></div></div>',
'<div class="card"><div class="row" style="justify-content:space-between"><div class="title">等你确认的报价 / Manual Quote Review</div><span id="quoteCount" class="pill"></span></div><div class="muted">确认分类后由官方函数计算报价，不能在审核时更改全局成本基准。</div><div id="quoteQueue"></div></div>',
'<div class="card hidden" id="commissionPayCard"><div class="title">待付佣金 / Commissions ready to pay</div><div class="muted">先在银行完成转账，再勾选这笔佣金和填写银行参考号。这里只记录已付，不会自动汇款。 / Transfer through your bank first. This records the payment only.</div><button id="commissionPayRefresh" type="button" class="btn" style="margin-top:12px">刷新待付佣金 / Refresh payouts</button><div id="commissionPayList" role="region" aria-label="待付佣金列表"></div><div id="commissionPayMsg" role="status" aria-live="polite" class="muted"></div></div>',
'<section id="portfolioCard" class="card hidden"><div class="title">真实作品图库 / Real work gallery</div><div class="muted">照片先让 AI 帮你写说明，自己检查后按核准，Agent 才看得到。 / Agents only see approved work.</div><div class="form" style="margin-top:12px"><input id="portfolioFiles" type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="选择作品照片"><button id="portfolioUploadBtn" type="button" class="btn primary">上传照片并准备说明 / Upload and prepare captions</button><button id="portfolioRefreshBtn" type="button" class="btn">刷新作品 / Refresh gallery</button><div id="portfolioMsg" role="status" aria-live="polite" class="muted"></div></div><div id="portfolioQueue"></div></section>',
OCCASIONS_HTML,
'<div class="card hidden" id="launchOrdersCard"><div class="title">Order & Payment / 订单与收款</div><div class="muted">Only create an order after the Agent has accepted a formal quote. Confirm payment only after checking actual bank evidence. 仅确认真实收到的款项。</div><div id="launchQuoteOrders"></div><div class="title" style="margin-top:15px">Orders / 订单</div><div id="launchPayments"></div></div>',
'<div class="card hidden" id="launchProgressCard"><div class="title">Agent Progress / 代理上手进度</div><div class="muted">Required courses, certification and order access / 必修课、认证及接单权限</div><div id="launchAgentProgress"></div></div>',
'<div class="card hidden" id="handbookCard"><div class="title">Grok Product Handbook / 产品手册导入</div><div class="muted">Upload Claude-reviewed handbook_content.json. Review by batch and product line, edit drafts, then approve the batch. / 上传已审核 JSON，依批次与业务线检查、编辑草稿，然后整批核准。</div><div class="form" style="margin-top:10px"><input type="file" id="handbookFile" accept=".json,application/json" aria-label="Grok handbook JSON"><button id="handbookImportBtn" class="btn primary">Import draft / 导入待审核</button><div id="handbookMsg" class="muted"></div></div><div class="title" style="margin-top:16px">Pending Owner review / 待核准内容</div><div id="handbookPending"></div></div>',
'<div class="card" id="baselineCard"><div class="title">标准成本设定（会影响以后所有报价，小心改） / Global Reference Cost Baseline</div><div class="muted" style="color:#D4B47A">会影响之后所有同类报价。此操作与单笔报价审核完全分开，必须二次确认。</div><div class="form" style="margin-top:10px"><select id="bSize"><option>small</option><option selected>medium</option><option>large</option><option>xl</option><option>structure</option></select><select id="bDensity"><option>light</option><option selected>medium</option><option>full</option><option>very_full</option></select><select id="bPremium"><option>low</option><option selected>medium</option><option>high</option><option>very_high</option></select><select id="bComplexity"><option>low</option><option selected>medium</option><option>high</option><option>special</option></select><input id="bCost" type="number" min="0" step="0.01" placeholder="安全生产成本 RM"><button id="baselineBtn" class="btn">修改全局基准 / Change global baseline</button><div id="baselineMsg" class="muted"></div></div></div>',
'<div class="card hidden" id="signupToggleCard"><div class="title">开放新 Agent 自己用 Google 注册 / Google self-registration</div><div id="signupSettingNote" class="muted">正在读取目前设定… / Checking current setting…</div><div class="row" style="margin-top:11px"><button id="signupToggleBtn" type="button" class="btn primary">读取中… / Loading…</button><span id="signupSettingState" class="pill"></span></div><div id="signupSettingMsg" class="muted" role="status" aria-live="polite"></div></div>',
'<div class="card"><div class="title">Agent Access Link</div><div class="muted">Create a one-time login link valid for 24 hours. Use this when email delivery is delayed or rate-limited.</div><div class="form" style="margin-top:11px"><input id="inviteEmail" type="email" placeholder="agent@email.com"><button id="inviteBtn" class="btn primary">Create one-time Agent link</button><div id="inviteOut" class="muted"></div><button id="copyInvite" class="btn hidden">Copy link</button></div></div>',
'<div class="card"><div class="title">Owner Recovery Link</div><div class="muted">Create a one-time Owner recovery link valid for 24 hours. Save it securely in case email sign-in is unavailable.</div><div class="form" style="margin-top:11px"><button id="recoveryBtn" class="btn primary">Create Owner recovery link</button><div id="recoveryOut" class="muted"></div><button id="copyRecovery" class="btn hidden">Copy recovery link</button></div></div>',
'<div class="card"><div class="title">记录日常开销（如租金、运费、材料） / Add OPEX</div><div class="form" style="margin-top:11px"><input id="date" type="date"><input id="category" placeholder="Category"><input id="amount" type="number" step="0.01" placeholder="Amount RM"><input id="note" placeholder="Note"><button id="opexBtn" class="btn primary">Save OPEX & Recalculate</button><div id="opexMsg" class="muted"></div></div></div></div>',
'<script src="/owner.js"></script></main></body></html>'
].join("\n");
const JS=String.raw`
let sb,session=null;
const $=x=>document.getElementById(x);
const escapeHtml=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const safeImageUrl=v=>{try{const u=new URL(String(v||""));return u.protocol==="https:"&&u.hostname.endsWith(".supabase.co")?u.href:""}catch{return""}};
const KUCHING_TZ="Asia/Kuching";
const kuchingDate=(value=new Date())=>{const parts=new Intl.DateTimeFormat("en-GB",{timeZone:KUCHING_TZ,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(value instanceof Date?value:new Date(value));const get=t=>parts.find(p=>p.type===t)?.value||"";return get("year")+"-"+get("month")+"-"+get("day")};
const kuchingDateTime=value=>new Intl.DateTimeFormat("en-GB",{timeZone:KUCHING_TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value))+" MYT";
const friendlyError=code=>{
  const c=String(code||"").toLowerCase();
  if(c.includes("owner_required")||c.includes("forbidden"))return "Owner access required. / 需要 Owner 权限。";
  if(c.includes("order_profit_floor_failed"))return "这张订单按预计送货成本计算会低于利润底线，请提高花价或运费，或降低成本。 / This order would fall below the contribution floor; raise price/delivery fee or reduce cost.";
  if(c.includes("invalid_profit_floor"))return "利润底线只能设在 50%–80%。 / Profit floor must be 50%–80%.";
  if(c.includes("invalid")||c.includes("expired"))return "This secure link is invalid or expired. / 安全链接无效或已过期。";
  if(c.includes("rate"))return "Service is temporarily busy. Please try again later. / 服务暂时繁忙，请稍后再试。";
  return "Unable to complete this action. Please try again. / 暂时无法完成，请再试一次。";
};
async function call(body,options={}){let r=await fetch(CFG.url+"/functions/v1/owner-session",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token,"apikey":CFG.key},body:JSON.stringify(body||{}),signal:options.signal,cache:"no-store",referrerPolicy:"no-referrer"});let j=await r.json();if(!r.ok)throw Error(j.error||"Request failed");return j}
function show(x){if(x!=="app"){closeKycPage();clearOwnerOccasions()} $("login").classList.toggle("hidden",x!=="login");$("app").classList.toggle("hidden",x!=="app");$("logout").classList.toggle("hidden",x==="login")}
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

// BEGIN OWNER OCCASIONS
let ownerOccasionRole=false,ownerOccasionRows=[],ownerOccasionVerifications=[],occasionLoadSeq=0,occasionMutationBusy=false;
const occasionCategories={graduation:"毕业季 / Graduation",festival:"大众节日 / Festival",cultural:"文化节日 / Cultural",business:"商务致意 / Business",wedding:"婚礼 / Wedding",event:"活动 / Event"};
const occasionStatuses={confirmed:"已确认 / Confirmed",pattern:"预计 / Estimated",not_found:"未找到 / Not found"};
const occasionLevels={high:"高 / High",medium:"中 / Medium",low:"低 / Low"};
const occasionRecurrences={fixed:"固定日期 / Fixed",lunar:"农历或宗教历 / Lunar",variable:"每年变化 / Variable"};
const occasionUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function occasionNode(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(className)n.className=className;return n}
function occasionError(error){
  const code=String(error?.message||error||"");
  if(/owner_required|forbidden|unauthorized|jwt|session/i.test(code))return "需要 Owner 权限或登入已过期，请重新登入。 / Owner access or a fresh sign-in is required.";
  if(/confirmation_required|confirm_required/i.test(code))return "请先核对日期并勾选亲自确认。 / Check the dates and tick the confirmation.";
  if(/already_reviewed|not_pending|verification_not_found/i.test(code))return "这项申请已处理或已不存在，请刷新列表。 / This request changed; refresh the queue.";
  if(/invalid|date|validation|too_long|too_many/i.test(code))return "资料格式有误，请检查日期、链接和必填项目。 / Check dates, links and required fields.";
  return "暂时无法处理，请刷新后重试。 / Unable to complete the request; refresh and try again.";
}
function occasionSafeURL(value){
  if(typeof value!=="string"||value.length>2048||/\s/.test(value))return "";
  try{const u=new URL(value);return ["http:","https:"].includes(u.protocol)&&!u.username&&!u.password?u.href:""}catch{return ""}
}
function occasionAppendLink(root,value,label){
  if(!value)return;
  const url=occasionSafeURL(value);
  if(!url){root.append(occasionNode("div","来源链接格式无效，未开放链接。 / Invalid source link.","muted"));return}
  const link=occasionNode("a",label+": "+value,"occasion-link");link.href=url;link.target="_blank";link.rel="noopener noreferrer";link.referrerPolicy="no-referrer";root.append(link);
}
function occasionDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||"")||value<"0001-01-01")return false;
  const d=new Date(value+"T00:00:00Z");return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===value;
}
function occasionDisplayDate(row){return row.date_status==="confirmed"?row.date_start:row.estimated_date}
function clearOwnerOccasions(){
  ownerOccasionRole=false;ownerOccasionRows=[];ownerOccasionVerifications=[];occasionLoadSeq++;occasionMutationBusy=false;
  $("ownerOccasionsCard").classList.add("hidden");
  for(const id of ["occasionList","occasionVerificationQueue","occasionFormHost"])$(id).replaceChildren();
  for(const id of ["occasionMessage","occasionTotal","occasionPendingCount"])$(id).textContent="";
  $("occasionRefresh").disabled=false;
}
async function refreshOwnerOccasions(){
  if(!ownerOccasionRole||!session){clearOwnerOccasions();throw Error("owner_required")}
  const seq=++occasionLoadSeq,token=session.access_token;
  $("occasionMessage").textContent="读取场合中… / Loading occasions…";$("occasionRefresh").disabled=true;
  try{
    const response=await call({action:"occasion_list"});
    if(seq!==occasionLoadSeq||!ownerOccasionRole||session?.access_token!==token)return;
    if(!Array.isArray(response.occasions)||!Array.isArray(response.verifications))throw Error("invalid_occasion_response");
    ownerOccasionRows=response.occasions;ownerOccasionVerifications=response.verifications;
    $("ownerOccasionsCard").classList.remove("hidden");$("occasionMessage").textContent="";
    renderOwnerOccasions();renderOwnerOccasionQueue();
  }catch(error){
    if(seq===occasionLoadSeq){ownerOccasionRows=[];ownerOccasionVerifications=[];$("occasionList").replaceChildren();$("occasionVerificationQueue").replaceChildren();$("occasionMessage").textContent=occasionError(error)}
    throw error;
  }finally{if(seq===occasionLoadSeq)$("occasionRefresh").disabled=false}
}
function renderOwnerOccasions(){
  const root=$("occasionList");root.replaceChildren();
  if(!ownerOccasionRole)return;
  const query=$("occasionSearch").value.trim().toLocaleLowerCase(),category=$("occasionCategoryFilter").value,status=$("occasionStatusFilter").value,demand=$("occasionDemandFilter").value,month=$("occasionMonthFilter").value;
  const rows=ownerOccasionRows.filter(row=>{
    if(category&&row.category!==category||status&&row.date_status!==status||demand&&row.flower_demand!==demand)return false;
    if(query&&![row.name_zh,row.name_en,row.location_or_audience].some(value=>String(value||"").toLocaleLowerCase().includes(query)))return false;
    const start=occasionDisplayDate(row),end=row.date_status==="confirmed"?(row.date_end||start):start;
    return !month||(start&&end&&String(start).slice(0,7)<=month&&String(end).slice(0,7)>=month);
  }).sort((a,b)=>String(occasionDisplayDate(a)||"9999").localeCompare(String(occasionDisplayDate(b)||"9999"))||String(a.name_zh).localeCompare(String(b.name_zh)));
  $("occasionTotal").textContent=rows.length+" / "+ownerOccasionRows.length;
  if(!rows.length){root.append(occasionNode("p",ownerOccasionRows.length?"没有符合筛选条件的场合。 / No matching occasions.":"还没有场合资料，请新增或先用 CSV 试运行检查。 / No occasions yet; add one or validate a CSV import.","muted"));return}
  for(const row of rows){
    const item=occasionNode("article",undefined,"item");
    item.append(occasionNode("h4",row.name_zh||row.name_en,"title"),occasionNode("div",row.name_en||"","muted"));
    const start=occasionDisplayDate(row),end=row.date_status==="confirmed"?row.date_end:null;
    item.append(occasionNode("div",(occasionStatuses[row.date_status]||"未知状态 / Unknown status")+" · "+(start||"日期待核实 / Date needed")+(end&&end!==start?" → "+end:""),"pill"));
    item.append(occasionNode("div",(occasionCategories[row.category]||"未知类别")+" · 用花需求 "+(occasionLevels[row.flower_demand]||"—")+" · 提前 "+String(row.order_lead_days??0)+" 天 / lead days","muted"));
    if(row.location_or_audience)item.append(occasionNode("p",row.location_or_audience,"muted occasion-text"));
    if(Array.isArray(row.typical_products)&&row.typical_products.length)item.append(occasionNode("div","常用花礼 / Products: "+row.typical_products.join("、"),"muted occasion-text"));
    if(row.evidence)item.append(occasionNode("p","日期依据 / Evidence: "+row.evidence,"muted occasion-text"));
    occasionAppendLink(item,row.source_url,"来源 / Source");
    if(row.verified_at)item.append(occasionNode("div","Owner 确认时间 / Confirmed at: "+String(row.verified_at),"muted"));
    const edit=occasionNode("button","编辑或确认日期 / Edit or confirm","btn");edit.type="button";
    edit.addEventListener("click",()=>openOwnerOccasionForm(row));item.append(edit);root.append(item);
  }
}
function renderOwnerOccasionQueue(){
  const root=$("occasionVerificationQueue");root.replaceChildren();if(!ownerOccasionRole)return;
  const pending=ownerOccasionVerifications.filter(row=>row.status==="pending");$("occasionPendingCount").textContent=String(pending.length);
  if(!pending.length){root.append(occasionNode("p","目前没有待核实申请。 / No pending date verifications.","muted"));return}
  for(const verification of pending){
    const occasion=ownerOccasionRows.find(row=>row.id===verification.occasion_id),item=occasionNode("article",undefined,"item");
    item.append(occasionNode("h4",occasion?.name_zh||occasion?.name_en||"场合资料待刷新 / Refresh occasion details","title"));
    item.append(occasionNode("div","提议日期 / Proposed dates: "+String(verification.proposed_date_start||"—")+(verification.proposed_date_end?" → "+verification.proposed_date_end:""),"pill"));
    if(occasion)item.append(occasionNode("div","目前日期 / Current date: "+(occasionDisplayDate(occasion)||"未找到 / Not found")+" · "+(occasionStatuses[occasion.date_status]||""),"muted"));
    if(verification.note)item.append(occasionNode("p",verification.note,"muted occasion-text"));
    occasionAppendLink(item,verification.proof_url,"查看证明 / Proof");
    if(verification.created_at)item.append(occasionNode("div","提交时间 / Submitted: "+String(verification.created_at),"muted"));
    const checked=occasionNode("input");checked.type="checkbox";
    const checkLabel=occasionNode("label",undefined,"occasion-confirm");checkLabel.append(checked,occasionNode("span","我已核对提议日期及证明，亲自确认日期正确。 / I checked the proposed dates and evidence."));
    const message=occasionNode("div",undefined,"muted");message.setAttribute("role","status");
    const actions=occasionNode("div",undefined,"occasion-actions"),buttons=[];
    for(const [decision,label] of [["approved","核准日期 / Approve dates"],["rejected","退回申请 / Reject"]]){
      const button=occasionNode("button",label,"btn"+(decision==="approved"?" primary":""));button.type="button";buttons.push(button);
      button.addEventListener("click",async()=>{
        if(!ownerOccasionRole||!session){message.textContent=occasionError("owner_required");return}
        if(occasionMutationBusy){message.textContent="另一项操作正在保存，请稍候。 / Another change is saving.";return}
        if(!occasionUuid.test(String(verification.id||""))||!occasionDate(verification.proposed_date_start)||(verification.proposed_date_end&&(!occasionDate(verification.proposed_date_end)||verification.proposed_date_end<verification.proposed_date_start))){message.textContent="申请日期或编号无效，请刷新。 / Invalid request; refresh the queue.";return}
        if(decision==="approved"&&!checked.checked){message.textContent="请先核对证明并勾选亲自确认日期。 / Check the evidence and tick the date confirmation.";return}
        if(!window.confirm(decision==="approved"?"确认采用以上提议日期并标记已确认？ / Approve these dates?":"确认退回这项核实申请？ / Reject this verification?"))return;
        const token=session.access_token;occasionMutationBusy=true;buttons.forEach(node=>node.disabled=true);message.textContent="正在保存… / Saving…";
        try{await call({action:"occasion_verification_review",verification_id:verification.id,decision});if(ownerOccasionRole&&session?.access_token===token){await refreshOwnerOccasions();$("occasionMessage").textContent=decision==="approved"?"已核准日期。 / Dates approved.":"申请已退回，原日期不变。 / Verification rejected."}}
        catch(error){message.textContent=occasionError(error)}finally{occasionMutationBusy=false;buttons.forEach(node=>node.disabled=false)}
      });actions.append(button);
    }
    item.append(checkLabel,actions,message);root.append(item);
  }
}
function openOwnerOccasionForm(initial=null){
  if(!ownerOccasionRole||!session)return;
  const host=$("occasionFormHost");host.replaceChildren();
  const form=occasionNode("form",undefined,"occasion-form");form.noValidate=true;
  const title=occasionNode("h3",initial?"编辑场合 / Edit occasion":"新增场合 / Add occasion","title");form.append(title);
  const fields={},grid=occasionNode("div",undefined,"occasion-fields");
  function field(key,label,type="text",options=null,max=240){
    const wrap=occasionNode("label",label,"muted"),input=occasionNode(options?"select":type==="textarea"?"textarea":"input");
    input.name=key;if(!options&&type!=="textarea")input.type=type;
    if(options)for(const [value,name] of Object.entries(options)){const option=occasionNode("option",name);option.value=value;input.append(option)}
    if(type==="text"||type==="textarea"||type==="url")input.maxLength=max;
    input.value=String(initial?.[key]??({category:"festival",flower_demand:"high",order_lead_days:21,recurrence:"fixed",date_status:"pattern",confidence:"medium"}[key]??""));
    fields[key]=input;wrap.append(input);grid.append(wrap);return input;
  }
  field("name_zh","中文名称 * / Chinese name");field("name_en","英文名称 * / English name");
  field("category","类别 / Category","text",occasionCategories);field("flower_demand","用花需求 / Flower demand","text",occasionLevels);
  const lead=field("order_lead_days","提前准备天数（0–365） / Lead days","number");lead.min="0";lead.max="365";lead.step="1";
  field("recurrence","日期规律 / Recurrence","text",occasionRecurrences);field("date_status","日期状态 / Date status","text",occasionStatuses);
  field("confidence","把握程度 / Confidence","text",occasionLevels);
  field("date_start","确认开始日期 / Actual start","date");field("date_end","确认结束日期 / Actual end","date");field("estimated_date","预计日期（未确认时使用） / Estimate","date");
  field("location_or_audience","地区或对象 / Area or audience","text",null,500);
  const products=field("typical_products","常用花礼（每行一项） / One product per line","textarea",null,5000);products.value=Array.isArray(initial?.typical_products)?initial.typical_products.join("\n"):"";
  field("past_2024","2024 年资料 / 2024 history","textarea",null,1000);field("past_2025","2025 年资料 / 2025 history","textarea",null,1000);
  field("source_url","日期来源链接（http/https） / Source URL","url",null,2048);field("evidence","日期依据或备注 / Date evidence","textarea",null,10000);
  const checked=occasionNode("input");checked.type="checkbox";checked.name="confirm";fields.confirm=checked;
  const checkLabel=occasionNode("label",undefined,"occasion-confirm");checkLabel.append(checked,occasionNode("span","我已核对来源，亲自确认以上实际日期正确。 / I checked the source and confirm these actual dates."));
  const syncStatus=()=>{checkLabel.classList.toggle("hidden",fields.date_status.value!=="confirmed");checked.checked=false};
  fields.date_status.addEventListener("change",syncStatus);syncStatus();
  for(const key of ["date_start","date_end","source_url","evidence"])fields[key].addEventListener("input",()=>{checked.checked=false});
  const help=occasionNode("p","选择「已确认」须填写实际开始日期并重新勾选亲自确认。预计或未找到状态只用于预热。 / Confirmed dates require your explicit check.","muted");
  const message=occasionNode("div",undefined,"muted");message.setAttribute("role","status");message.setAttribute("aria-live","polite");
  const actions=occasionNode("div",undefined,"occasion-actions"),save=occasionNode("button","保存场合 / Save occasion","btn primary"),cancel=occasionNode("button","取消 / Cancel","btn");save.type="submit";cancel.type="button";
  cancel.addEventListener("click",()=>{if(!save.disabled)host.replaceChildren()});actions.append(save,cancel);form.append(grid,help,checkLabel,message,actions);host.append(form);fields.name_zh.focus();
  form.addEventListener("submit",async event=>{
    event.preventDefault();if(!ownerOccasionRole||!session){message.textContent=occasionError("owner_required");return}
    if(occasionMutationBusy){message.textContent="另一项操作正在保存，请稍候。 / Another change is saving.";return}
    const value=key=>fields[key].value.trim(),nullable=key=>value(key)||null;
    const input={name_zh:value("name_zh"),name_en:value("name_en"),category:value("category"),flower_demand:value("flower_demand"),order_lead_days:Number(value("order_lead_days")),recurrence:value("recurrence"),date_status:value("date_status"),confidence:value("confidence"),date_start:nullable("date_start"),date_end:nullable("date_end"),estimated_date:nullable("estimated_date"),location_or_audience:value("location_or_audience"),typical_products:value("typical_products").split(/\r?\n/).map(v=>v.trim()).filter(Boolean),past_2024:nullable("past_2024"),past_2025:nullable("past_2025"),source_url:nullable("source_url"),evidence:nullable("evidence")};
    const invalid=reason=>{message.textContent=reason};
    if(!input.name_zh||!input.name_en||input.name_zh.length>240||input.name_en.length>240)return invalid("中英文名称都必填，各限 240 字。 / Both names are required, up to 240 characters.");
    if(!Object.hasOwn(occasionCategories,input.category)||!Object.hasOwn(occasionStatuses,input.date_status)||!Object.hasOwn(occasionLevels,input.flower_demand)||!Object.hasOwn(occasionLevels,input.confidence)||!Object.hasOwn(occasionRecurrences,input.recurrence))return invalid("请选择有效的类别、状态及把握程度。 / Choose valid categories and statuses.");
    if(!/^\d+$/.test(value("order_lead_days"))||!Number.isInteger(input.order_lead_days)||input.order_lead_days>365)return invalid("提前准备天数必须是 0–365 的整数。 / Lead days must be an integer from 0 to 365.");
    if([input.date_start,input.date_end,input.estimated_date].some(v=>v&&!occasionDate(v)))return invalid("日期无效，请使用真实的年-月-日。 / Enter real dates as YYYY-MM-DD.");
    if(input.date_end&&(!input.date_start||input.date_end<input.date_start))return invalid("结束日期不能早于开始日期，且须先填写开始日期。 / End date requires a start date and cannot precede it.");
    if(input.date_status==="confirmed"&&(!input.date_start||!checked.checked))return invalid("请填写实际开始日期，并勾选亲自确认日期。 / Enter the actual start and tick the date confirmation.");
    if(input.date_status==="pattern"&&!input.estimated_date)return invalid("预计状态须填写预计日期。 / Estimated status needs an estimated date.");
    if(input.source_url&&!occasionSafeURL(input.source_url))return invalid("来源链接必须是 http/https，不能含登入资料或空格。 / Use an http(s) source without credentials or spaces.");
    if(input.typical_products.length>40||input.typical_products.some(v=>v.length>120))return invalid("常用花礼最多 40 项，每项限 120 字。 / Up to 40 products, 120 characters each.");
    if(input.location_or_audience.length>500||String(input.past_2024||"").length>1000||String(input.past_2025||"").length>1000||String(input.evidence||"").length>10000)return invalid("地区、往年资料或依据过长，请缩短后保存。 / Shorten the area, history or evidence.");
    if(initial&&!occasionUuid.test(String(initial.id||"")))return invalid("场合编号无效，请刷新。 / Invalid occasion ID; refresh.");
    if(input.date_status!=="confirmed"){input.date_start=null;input.date_end=null}
    if(input.date_status==="not_found")input.estimated_date=null;
    const payload={action:"occasion_upsert",occasion:input,confirm:input.date_status==="confirmed"&&checked.checked};if(initial)payload.id=initial.id;
    const token=session.access_token;occasionMutationBusy=true;save.disabled=true;cancel.disabled=true;message.textContent="正在保存… / Saving…";
    try{await call(payload);if(ownerOccasionRole&&session?.access_token===token){host.replaceChildren();await refreshOwnerOccasions();$("occasionMessage").textContent="场合已保存。 / Occasion saved."}}
    catch(error){message.textContent=occasionError(error)}finally{occasionMutationBusy=false;save.disabled=false;cancel.disabled=false}
  });
}
$("ownerOccasionsCard").classList.add("hidden");
$("occasionAdd").addEventListener("click",()=>openOwnerOccasionForm());
$("occasionRefresh").addEventListener("click",()=>refreshOwnerOccasions().catch(error=>{$("occasionMessage").textContent=occasionError(error)}));
for(const id of ["occasionSearch","occasionMonthFilter","occasionCategoryFilter","occasionStatusFilter","occasionDemandFilter"])$(id).addEventListener(id==="occasionSearch"?"input":"change",renderOwnerOccasions);
// END OWNER OCCASIONS

// D1 payout controls are constructed with DOM nodes, never user-data HTML.
function element(tag,options={}){
  const n=document.createElement(tag);
  if(options.className)n.className=options.className;
  if(options.text!==undefined)n.textContent=String(options.text);
  return n;
}
async function refreshCommissionPayouts(){
  const root=$("commissionPayList"),msg=$("commissionPayMsg");
  root.replaceChildren();msg.textContent="读取中… / Loading…";
  const response=await call({action:"commission_payable_list"});
  const rows=Array.isArray(response.commissions)?response.commissions:[];
  msg.textContent="";
  if(rows.length===0){root.append(element("div",{className:"item muted",text:"目前没有需要转账的佣金。 / Nothing to pay right now."}));return}
  const byAgent=new Map();
  for(const row of rows){
    if(!byAgent.has(row.agent_id))byAgent.set(row.agent_id,[]);
    byAgent.get(row.agent_id).push(row);
  }
  const amount=items=>items.reduce((sum,i)=>sum+Math.round(Number(i.amount||0)*100),0);
  const fmt=cents=>"RM "+(cents/100).toFixed(2);
  for(const [agentId,items] of byAgent){
    const group=element("section",{className:"item"});
    const agentName=String(items[0].agent_name||items[0].agent_code||"Agent");
    group.append(element("strong",{text:agentName+" · "+fmt(amount(items))}),
      element("div",{className:"muted",text:items.length+" 笔可以转账 / payable payments"}));
    const checked=new Map();
    for(const item of items){
      const line=element("label",{className:"payout-line"});
      const tick=element("input");tick.type="checkbox";tick.className="payout-tick";tick.setAttribute("aria-label","选择 "+String(item.order_code||"") );
      checked.set(item.id,tick);
      const words=element("span",{text:String(item.order_code||"—")+" · "+fmt(Math.round(Number(item.amount||0)*100))+" · "+(item.payable_at?kuchingDateTime(item.payable_at):"可付 / Ready")});
      line.append(tick,words);group.append(line);
    }
    const ref=element("input");ref.type="text";ref.maxLength=80;ref.placeholder="银行转账参考号 / Bank transfer reference";ref.setAttribute("aria-label","Bank transfer reference");
    const verifyLabel=element("label",{className:"payout-line"});
    const verified=element("input");verified.type="checkbox";verified.className="payout-tick";
    verifyLabel.append(verified,element("span",{text:"我已在银行完成转账并核对收款人 / I checked the real bank transfer"}));
    const submit=element("button",{className:"btn primary",text:"核对并标记已付 / Confirm as paid"});
    submit.type="button";
    const feedback=element("div",{className:"muted"});feedback.setAttribute("role","status");
    submit.addEventListener("click",async()=>{
      const selected=items.filter(x=>checked.get(x.id)?.checked);
      if(!selected.length){feedback.textContent="先选至少一笔佣金。 / Select payments first.";return}
      if(!verified.checked){feedback.textContent="请先核对真实的银行转账。 / Verify the actual bank transfer first.";return}
      const reference=ref.value.trim().toUpperCase();
      if(!/^[A-Z0-9][A-Z0-9_/-]{4,79}$/.test(reference)){
        feedback.textContent="转账参考号要有 5–80 个字母或数字。 / Enter a valid bank reference.";return
      }
      const total=fmt(amount(selected));
      if(!window.confirm("确认已经转 "+total+" 给 "+agentName+"？\\nConfirm bank transfer before marking as paid."))return;
      submit.disabled=true;feedback.textContent="正在记录付款… / Saving payment…";
      try{
        await call({action:"commission_mark_paid",commission_ids:selected.map(x=>x.id),
          payment_reference:reference,transfer_checked:true,confirm:true});
        feedback.textContent="已记录转账。 / Payment recorded.";
        await refreshCommissionPayouts();
      }catch(e){
        const code=String(e?.message||"");
        feedback.textContent=code.includes("commission_not_payable")
          ?"这笔佣金已经不是可付状态，请刷新。 / This payment is no longer available."
          :code.includes("mixed_agent_selection")?"只能一次转给一个 Agent。 / One agent per transfer."
          :friendlyError(code);
      }finally{submit.disabled=false}
    });
    group.append(ref,verifyLabel,submit,feedback);root.append(group);
  }
}
$("commissionPayRefresh").addEventListener("click",()=>refreshCommissionPayouts().catch(e=>{
  $("commissionPayMsg").textContent=friendlyError(e?.message);
}));

// [D2] Real photos are rendered as DOM nodes. Captions never become HTML.
async function refreshPortfolio(){
  const root=$("portfolioQueue"),msg=$("portfolioMsg");
  root.replaceChildren();msg.textContent="读取作品… / Loading…";
  const {photos=[]}=await call({action:"portfolio_list"});
  msg.textContent="";
  const el=(tag,text,cls)=>{
    const node=document.createElement(tag);
    if(text!==undefined)node.textContent=String(text);
    if(cls)node.className=cls;
    return node;
  };
  if(!photos.length){root.append(el("p","还没有作品。先选择照片上传。 / No work yet. Upload photos first.","muted"));return}
  const lineNames={condolence:"帛事花圈",opening:"开张花篮",bouquet:"花束",wedding_event:"婚礼活动",wholesale:"批发",unknown:"未分类"};
  for(const row of photos){
    const card=el("section",undefined,"item");
    if(row.image_url&&safeImageUrl(row.image_url)){
      const image=el("img");image.src=safeImageUrl(row.image_url);
      image.className="portfolio-thumb";image.alt="EW VERDORA 作品照片";
      image.loading="lazy";image.referrerPolicy="no-referrer";card.append(image);
    }
    card.append(el("div",String(row.status==="approved"?"已核准 / Approved":row.status==="hidden"?"已隐藏 / Hidden":"等你核准 / Waiting for approval")+" · "+String(row.created_at?kuchingDateTime(row.created_at):""),"muted"));
    const form=el("div",undefined,"portfolio-form");
    const type=el("select");type.setAttribute("aria-label","作品类型 / Product line");
    for(const [key,label] of Object.entries(lineNames)){
      const opt=el("option",label);opt.value=key;type.append(opt);
    }
    type.value=row.product_line||"unknown";
    const zh=el("textarea");zh.maxLength=130;zh.value=row.caption_zh||"";zh.placeholder="中文说明 / Chinese caption";zh.setAttribute("aria-label","中文说明");
    const en=el("textarea");en.maxLength=240;en.value=row.caption_en||"";en.placeholder="English caption";en.setAttribute("aria-label","English caption");
    form.append(type,zh,en);
    const actions=el("div",undefined,"portfolio-actions");
    const save=el("button","保存说明 / Save edits","btn");
    const approve=el("button","核准给 Agent 看 / Approve for Agents","btn primary");
    const reject=el("button","不展示 / Hide photo","btn");
    const note=el("div",undefined,"muted");note.setAttribute("role","status");
    for(const [btn,decision] of [[save,"edit"],[approve,"approve"],[reject,"reject"]]){
      btn.type="button";btn.addEventListener("click",async()=>{
        if(decision==="reject"&&!window.confirm("确定不让 Agent 看这张作品？ / Hide this photo?"))return;
        btn.disabled=true;note.textContent="正在保存… / Saving…";
        try{
          await call({action:"portfolio_review",id:row.id,decision,
            caption_zh:zh.value,caption_en:en.value,product_line:type.value});
          note.textContent="已保存 / Saved";await refreshPortfolio();
        }catch(e){note.textContent=friendlyError(e?.message)}
        finally{btn.disabled=false}
      });
      actions.append(btn);
    }
    form.append(actions,note);card.append(form);root.append(card);
  }
}
$("portfolioRefreshBtn").addEventListener("click",()=>refreshPortfolio().catch(e=>{
  $("portfolioMsg").textContent=friendlyError(e?.message);
}));
$("portfolioUploadBtn").addEventListener("click",async()=>{
  const files=[...($("portfolioFiles").files||[])],msg=$("portfolioMsg"),btn=$("portfolioUploadBtn");
  if(!files.length){msg.textContent="先选择照片。 / Choose photos first.";return}
  if(files.length>12){msg.textContent="每次最多 12 张。 / Maximum 12 photos per batch.";return}
  btn.disabled=true;
  let done=0;
  try{
    for(const file of files){
      if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size<1||file.size>5242880)
        throw new Error("invalid_portfolio_file");
      msg.textContent="正在处理 "+(done+1)+"/"+files.length+"… / Preparing photos…";
      const created=await call({action:"portfolio_upload_url",mime_type:file.type,file_size:file.size});
      const uploaded=await sb.storage.from("portfolio").uploadToSignedUrl(
        created.path,created.upload_token,file,{contentType:file.type});
      if(uploaded.error)throw new Error("portfolio_upload_failed");
      await call({action:"portfolio_review",id:created.id,decision:"analyse"});
      done++;
    }
    msg.textContent="已上传 "+done+" 张，记得核准后 Agent 才看得到。 / "+done+" ready for approval.";
    $("portfolioFiles").value="";
    await refreshPortfolio();
  }catch(e){msg.textContent="已处理 "+done+" 张。 "+friendlyError(e?.message)}
  finally{btn.disabled=false}
});

// [D4] Show only backend-verified counts; AI writes action advice, never quantities.
let dailyBrief=null,dailyBriefEnglish=false;
function renderDailyBrief(){
  const root=$("dailyBriefContent");root.replaceChildren();
  const lines=dailyBriefEnglish?dailyBrief?.summary_en:dailyBrief?.summary_zh;
  if(!Array.isArray(lines)){root.textContent="今天的报告还没准备好。 / Today's brief is not ready.";return}
  for(const line of lines){
    const p=document.createElement("p");p.className="owner-daily-line";p.textContent=String(line||"");root.append(p);
  }
  $("dailyBriefLang").textContent=dailyBriefEnglish?"切换中文 / Chinese":"English / 英文";
}
async function refreshDailyBrief(){
  const root=$("dailyBriefContent");
  root.textContent="正在整理今天的生意… / Checking today's business…";
  const result=await call({action:"owner_daily_brief"});
  if(result.pending){root.textContent=result.message_zh||"请按刷新。 / Refresh to try again.";return}
  dailyBrief=result;renderDailyBrief();
}
$("dailyBriefLang").addEventListener("click",()=>{dailyBriefEnglish=!dailyBriefEnglish;renderDailyBrief()});
$("dailyBriefRefresh").addEventListener("click",()=>refreshDailyBrief().catch(e=>{
  $("dailyBriefContent").textContent=friendlyError(e?.message);
}));

async function refreshLaunchPanels(){
  const [p,o]=await Promise.all([
    call({action:"launch_agent_progress"}),
    call({action:"launch_orders"})
  ]);
  const es=escapeHtml;
  // [D5] Plain, touch-friendly reminder card. No Agent name ever enters innerHTML.
  const progressRoot=$("launchAgentProgress");
  progressRoot.replaceChildren();
  const make=(tag,value,cls)=>{
    const node=document.createElement(tag);
    if(value!==undefined)node.textContent=String(value);
    if(cls)node.className=cls;
    return node;
  };
  const allAgents=p.agents||[],requiredCount=Number(p.required_count||7);
  if(!allAgents.length)progressRoot.append(make("div","还没有代理 / No registered Agents.","muted item"));
  for(const a of allAgents){
    const item=make("div",undefined,"item");
    item.append(make("strong",a.display_name||a.agent_code||"Agent"),
      make("span",String(a.status||"")+" / "+String(a.agent_code||""),"pill"),
      make("div","必修课 "+Number(a.passed_modules||0)+"/"+requiredCount+
        " · "+(a.exam_passed?"考试已通过 / Exam passed":"考试未完成 / Exam not finished"),"muted"));
    if(a.id&&Number(a.passed_modules||0)<requiredCount){
      const button=make("button","提醒他开始上课 / Prepare reminder","btn primary");
      button.type="button";button.style.marginTop="8px";
      const output=make("div",undefined,"form");
      output.style.marginTop="10px";
      const status=make("div",undefined,"muted");status.setAttribute("role","status");
      button.addEventListener("click",async()=>{
        button.disabled=true;status.textContent="正在准备提醒文字… / Preparing message…";
        try{
          const result=await call({action:"owner_agent_reminder",agent_id:a.id});
          output.replaceChildren();
          const text=make("textarea");text.value=result.reminder_zh||"";
          text.rows=4;text.readOnly=true;text.setAttribute("aria-label","提醒文字 / Reminder text");
          const row=make("div",undefined,"row");row.style.flexWrap="wrap";
          const language=make("button","English / 英文","btn");
          const copy=make("button","复制提醒 / Copy reminder","btn");
          const whatsapp=make("button","打开 WhatsApp 自己发送 / Open WhatsApp","btn primary");
          for(const btn of [language,copy,whatsapp])btn.type="button";
          let english=false;
          language.addEventListener("click",()=>{
            english=!english;text.value=english?result.reminder_en:result.reminder_zh;
            language.textContent=english?"切换中文 / Chinese":"English / 英文";
          });
          copy.addEventListener("click",async()=>{
            try{await navigator.clipboard.writeText(text.value);status.textContent="已经复制，自己贴给代理就可以。 / Copied."}
            catch{status.textContent="无法自动复制，长按上面的文字就能复制。 / Long-press to copy."}
          });
          whatsapp.addEventListener("click",()=>{
            window.open("https://wa.me/?text="+encodeURIComponent(text.value),"_blank","noopener,noreferrer");
            status.textContent="请自己选联系人再发送，系统不会自动发。 / Choose a recipient and send manually.";
          });
          row.append(language,copy,whatsapp);output.append(text,row);
          status.textContent="文字准备好了，按复制或 WhatsApp。 / Reminder ready.";
        }catch(e){status.textContent=friendlyError(e?.message)}
        finally{button.disabled=false}
      });
      item.append(button,output,status);
    }
    progressRoot.append(item);
  }
  const eligible=o.eligible_quotes||[],orders=o.orders||[];
  $("launchQuoteOrders").innerHTML=eligible.length?eligible.map(q=>{
    const id=es(q.id);
    return "<div class='item launch-quote' data-quote='"+id+"'><b>"+es(q.customer_label)+
      "</b> <span class='pill'>"+es(q.agent_name)+"</span>"+
      "<div class='muted'>Approved flower amount RM "+Number(q.selling_price||0).toFixed(2)+" · "+es(q.status)+"</div>"+
      "<div class='form'><input class='launch-code' maxlength='60' placeholder='Order code / 订单编号 (e.g. EV-2026-0001)' aria-label='Order code'>"+
      "<input class='launch-fee' type='number' min='0' max='10000' step='0.01' aria-label='Customer delivery fee RM' placeholder='Customer delivery fee / 客人付运费（自取填 0）'>"+
      "<input class='launch-delivery-cost' type='number' min='0' max='10000' step='0.01' aria-label='Expected delivery cost RM' placeholder='Expected delivery cost / 预计送货成本（自取填 0）'>"+
      "<button class='btn primary launch-create-order' type='button'>Create order / 建立订单</button>"+
      "<div class='muted launch-qmsg'></div></div></div>";
  }).join(""):"<div class='muted item'>No eligible accepted quotes / 暂无可建立订单的报价。</div>";
  const byId=new Map(eligible.map(q=>[q.id,q]));
  document.querySelectorAll(".launch-create-order").forEach(btn=>btn.onclick=async()=>{
    const wrap=btn.closest(".launch-quote"),id=wrap.dataset.quote,q=byId.get(id);
    const code=wrap.querySelector(".launch-code").value.trim();
    const feeRaw=wrap.querySelector(".launch-fee").value.trim();
    const deliveryCostRaw=wrap.querySelector(".launch-delivery-cost").value.trim();
    const fee=Number(feeRaw);
    const deliveryCost=Number(deliveryCostRaw);
    const msg=wrap.querySelector(".launch-qmsg");
    if(!q||!code||feeRaw===""||deliveryCostRaw===""||!Number.isFinite(fee)||fee<0||!Number.isFinite(deliveryCost)||deliveryCost<0){msg.textContent="Enter the delivery fee and expected delivery cost explicitly; enter 0 for pickup/no cost. / 请明确填写客人付运费及预计送货成本，自取或无成本也要填 0。";return}
    const total=Number(q.selling_price)+fee;
    if(!confirm("Create order "+code+"?\nFlower RM "+Number(q.selling_price).toFixed(2)+" + Delivery RM "+fee.toFixed(2)+" = RM "+total.toFixed(2)+"\nExpected delivery cost RM "+deliveryCost.toFixed(2)+"\n确认建立订单？"))return;
    btn.disabled=true;
    try{
      await call({action:"launch_create_order",quote_id:id,order_code:code,delivery_fee:fee,delivery_cost_estimate:deliveryCost,confirm:true});
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
      (o.status==="completed"?"<div class='muted'>Commission accrued / 已入账佣金：RM "+(o.commission_amount==null?"—":Number(o.commission_amount).toFixed(2))+(o.commission_status?" · "+es(o.commission_status):"")+"</div>":"")+
      (o.payment_status==="paid"&&o.status!=="completed"?
        "<div class='form launch-completion' style='margin-top:10px'>"+
        "<label class='muted'>制作成本 / Production cost (RM)<input class='completion-production_cost' type='number' min='0' max='100000' step='0.01' value='0'></label>"+
        "<label class='muted'>送货成本 / Delivery cost (RM)<input class='completion-delivery_cost' type='number' min='0' max='100000' step='0.01' value='0'></label>"+
        "<label class='muted'><input type='checkbox' class='completion-qc' style='width:auto;min-height:48px'> 品质检查通过（必须） / Quality check passed</label>"+
        "<details class='completion-more'><summary>更多选项 / More options</summary><div class='form' style='margin-top:8px'>"+
        [["payment_cost","支付手续费 / Payment cost"],["refund_cost","退款成本 / Refund cost"],["risk_cost","风险成本 / Risk cost"]].map(([key,label])=>
          "<label class='muted'>"+es(label)+" (RM)<input class='completion-"+key+"' type='number' min='0' max='100000' step='0.01' value='0'></label>").join("")+
        "<label class='muted'>制作方式 / Fulfilment<select class='completion-type'><option value='internal'>内部制作 / Internal</option><option value='external'>外部制作 / External</option></select></label>"+
        "<label class='muted'><input type='checkbox' class='completion-rework' style='width:auto;min-height:48px'> 返工 / Rework</label></div></details>"+
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
    if(!payload.qc_pass){msg.textContent="QC must pass before completion. / 品质检查通过后才能完成订单。";return}
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

const KYC_VIEW_MS=60000;
const kycUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let kycSeq=0,kycTimer=null,kycAbort=null,kycActive=null,kycListBusy=false,kycListSeq=0,kycListAbort=null;
function maskKyc(message="身份资料已遮盖。请重新点开查看。 / Details hidden. Open again to view."){
  ++kycSeq;
  if(kycTimer!==null){clearTimeout(kycTimer);kycTimer=null}
  if(kycAbort){kycAbort.abort();kycAbort=null}
  kycActive=null;
  const canvas=$("kycCanvas");
  if(canvas){canvas.width=0;canvas.height=0;canvas.removeAttribute("width");canvas.removeAttribute("height")}
  if($("kycFields"))$("kycFields").replaceChildren();
  if($("kycRejectNote"))$("kycRejectNote").value="";
  if($("kycRejectCode"))$("kycRejectCode").value="";
  if($("kycClock"))$("kycClock").textContent="";
  if($("kycPhotoMessage"))$("kycPhotoMessage").textContent="";
  if($("kycDecisionMessage"))$("kycDecisionMessage").textContent="";
  if($("kycDetail"))$("kycDetail").classList.add("hidden");
  if($("kycMasked")){$("kycMasked").textContent=message;$("kycMasked").classList.remove("hidden")}
}
function closeKycPage(){
  if(kycListAbort){kycListAbort.abort();kycListAbort=null}
  ++kycListSeq;kycListBusy=false;$("kycReload").disabled=false;
  maskKyc();
  $("app").classList.remove("kyc-mode");
  $("kycPage").classList.add("hidden");
  $("kycQueue").replaceChildren();
  $("kycCount").textContent="";
  $("kycMessage").textContent="";
}
function kycTextField(label,value){
  const node=document.createElement("div"),name=document.createElement("strong"),body=document.createElement("span");
  node.className="kyc-field";name.textContent=label;body.textContent=String(value??"—");
  node.append(name,body);return node;
}
function kycTime(v){if(!v)return "—";const d=new Date(v);return Number.isNaN(d.valueOf())?"—":kuchingDateTime(d)}
function kycStatusOrder(s){return s==="submitted"?0:s==="rejected"?1:s==="approved"?2:3}
async function refreshKycList(){
  if(kycListBusy||$("kycPage").classList.contains("hidden"))return;
  kycListBusy=true;
  const listSeq=++kycListSeq,controller=new AbortController();
  kycListAbort=controller;
  $("kycReload").disabled=true;
  $("kycMessage").textContent="读取审核列表中… / Loading review queue…";
  $("kycQueue").replaceChildren();
  try{
    // GPT 1 currently returns {entries:[{agent_id,preferred_name,area,submitted_at,ic_last4,status}]} (other backend fields ignored).
    // Fetch the submitted queue independently: a recent approved record must not push older pending cases out of the capped list.
    const [pendingJ,allJ]=await Promise.all([
      call({action:"kyc_list",status:"submitted",limit:100},{signal:controller.signal}),
      call({action:"kyc_list",status:"all",limit:100},{signal:controller.signal})
    ]);
    const pending=pendingJ.items??pendingJ.entries??pendingJ.records;
    const all=allJ.items??allJ.entries??allJ.records;
    if(listSeq!==kycListSeq||controller.signal.aborted||$("kycPage").classList.contains("hidden"))return;
    if(!Array.isArray(pending)||!Array.isArray(all))throw Error("kyc_contract_error");
    const dedup=new Map();
    for(const row of [...all,...pending])if(row&&kycUuid.test(String(row.agent_id||"")))dedup.set(String(row.agent_id),row);
    const safe=[...dedup.values()].filter(r=>r.status!=="draft");
    safe.sort((a,b)=>kycStatusOrder(a.status)-kycStatusOrder(b.status)||(Date.parse(b.submitted_at)||0)-(Date.parse(a.submitted_at)||0));
    const pendingCount=safe.filter(r=>r.status==="submitted").length;
    $("kycCount").textContent=pendingCount+" 人等你看 / waiting";
    $("kycOpen").textContent="身份审核（"+pendingCount+" 人等你看） / Identity check ("+pendingCount+")";
    $("kycMessage").textContent=safe.length?"":"暂无已提交的身份资料 / No submitted applications.";
    const fragment=document.createDocumentFragment();
    for(const row of safe){
      const button=document.createElement("button");
      button.type="button";button.className="btn kyc-item";
      const name=document.createElement("strong"),subtitle=document.createElement("div");
      const last4=/^\d{4}$/.test(String(row.ic_last4||""))?String(row.ic_last4):"••••";
      name.textContent=String(row.preferred_name||"—");
      subtitle.className="muted";
      subtitle.textContent=String(row.area||"—")+" · "+kycTime(row.submitted_at)+" · IC •••• "+last4;
      button.append(name,subtitle);
      button.addEventListener("click",()=>openKycView(String(row.agent_id)));
      fragment.append(button);
    }
    $("kycQueue").append(fragment);
  }catch{
    if(listSeq!==kycListSeq||controller.signal.aborted)return;
    $("kycCount").textContent="";
    $("kycMessage").textContent="暂时读不到身份资料，请稍后再按刷新。 / Identity details are temporarily unavailable. Please refresh again.";
  }finally{if(listSeq===kycListSeq){kycListBusy=false;kycListAbort=null;$("kycReload").disabled=false}}
}
function kycSignedPhotoUrl(value){
  if(typeof value!=="string"||!value)return null;
  try{
    const u=new URL(value),base=new URL(CFG.url);
    // Only short-lived signed URLs for the private agent-kyc bucket, never public links.
    if(u.protocol!=="https:"||u.origin!==base.origin||!u.pathname.startsWith("/storage/v1/object/sign/agent-kyc/")||!u.searchParams.has("token"))return null;
    return u.href;
  }catch{return null}
}
async function drawKycPhoto(rawUrl,seq,signal){
  const url=kycSignedPhotoUrl(rawUrl);
  if(!url){$("kycPhotoMessage").textContent="照片暂时无法安全显示 / Secure photo link unavailable.";return false}
  try{
    const response=await fetch(url,{cache:"no-store",credentials:"omit",referrerPolicy:"no-referrer",signal});
    if(!response.ok)throw Error("photo_response");
    const mime=(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
    if(!["image/jpeg","image/png","image/webp"].includes(mime))throw Error("photo_type");
    const blob=await response.blob();
    if(blob.size>5*1024*1024||blob.size===0)throw Error("photo_size");
    if(seq!==kycSeq||signal.aborted)return false;
    if(typeof createImageBitmap!=="function")throw Error("image_bitmap_unsupported");
    const bitmap=await createImageBitmap(blob);
    try{
      if(seq!==kycSeq||signal.aborted)return false;
      const canvas=$("kycCanvas"),ctx=canvas.getContext("2d");
      if(!ctx)throw Error("canvas_unavailable");
      const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));
      canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      $("kycPhotoMessage").textContent="仅供核验，请勿保存或截图。 / Review only. Do not copy.";
      return true;
    }finally{bitmap.close()}
  }catch{
    if(seq===kycSeq&&!signal.aborted)$("kycPhotoMessage").textContent="照片读取失败，请核实访问权限或图片格式。 / Photo unavailable.";
  }
  return false;
}
async function openKycView(agentId){
  if(!kycUuid.test(agentId))return;
  maskKyc("读取中… / Loading protected details…");
  const seq=kycSeq,controller=new AbortController();
  kycAbort=controller;
  $("kycMasked").classList.add("hidden");
  $("kycDetail").classList.remove("hidden");
  $("kycApprove").disabled=true;
  $("kycClock").textContent="限时 60 秒 / Auto-hide after 60 seconds";
  $("kycFields").append(kycTextField("资料读取中 / Loading","…"));
  kycTimer=setTimeout(()=>maskKyc("已超过 60 秒，敏感资料自动遮盖。 / 60-second viewing limit reached."),KYC_VIEW_MS);
  try{
    // GPT 1 returns {kyc:{agent_id,...,photo_signed_url:"https://...",delete_requested_at}}.
    const j=await call({action:"kyc_view",agent_id:agentId},{signal:controller.signal});
    if(seq!==kycSeq||controller.signal.aborted)return;
    const record=j.kyc??j.record??j.entry;
    if(!record||record.agent_id!==agentId)throw Error("kyc_contract_error");
    kycActive={agentId,status:String(record.status||""),deleteRequested:Boolean(record.delete_requested_at),photoShown:false};
    const values=[
      ["法定姓名 / Legal name",record.legal_name],
      ["称呼 / Preferred name",record.preferred_name],
      ["IC 号码 / IC number",record.ic_number],
      ["出生日期 / Date of birth",record.date_of_birth],
      ["WhatsApp / Phone",record.phone_whatsapp],
      ["地区 / Area",record.area],
      ["状态 / Status",record.status],
      ["提交时间 / Submitted",kycTime(record.submitted_at)],
      ["同意版本 / Consent version",record.consent_version],
      ["同意时间 / Consent at",kycTime(record.consent_at)],
      ["审核时间 / Reviewed",kycTime(record.reviewed_at)],
      ["退回理由 / Reject reason",record.reject_reason]
    ];
    $("kycFields").replaceChildren(...values.map(([label,value])=>kycTextField(label,value)));
    const submitted=record.status==="submitted";
    $("kycActions").classList.toggle("hidden",!submitted);
    $("kycDelete").classList.toggle("hidden",!record.delete_requested_at);
    // Never publish signed URLs in DOM attributes, logs or durable browser data.
    const photoShown=await drawKycPhoto(record.photo_signed_url,seq,controller.signal);
    if(seq!==kycSeq||controller.signal.aborted)return;
    if(kycActive?.agentId===agentId)kycActive.photoShown=photoShown;
    $("kycApprove").disabled=!photoShown;
  }catch{
    if(seq===kycSeq)maskKyc("无法读取该身份资料。请确认权限及 GPT 1 接口格式。 / Unable to view identity record.");
  }
}
async function reviewKyc(decision){
  const selected=kycActive;
  if(!selected||selected.status!=="submitted")return;
  if(decision==="approve"&&!selected.photoShown){
    $("kycDecisionMessage").textContent="必须先成功显示 IC 照片才能核准。 / View the IC photo before approval.";return;
  }
  const code=$("kycRejectCode").value,note=$("kycRejectNote").value.trim();
  let reason=null;
  if(decision==="reject"){
    if((!code&&!note)||(code==="other"&&!note)){
      $("kycDecisionMessage").textContent="请选择或填写退回理由；选择「其他」必须填写说明。 / Select or enter a rejection reason.";return;
    }
    reason=(code==="other"?note:(code?(code+(note?" — "+note:"")):note)).slice(0,500);
    if(reason.trim().length<3){$("kycDecisionMessage").textContent="请至少填写 3 个字符的原因 / Reason must be at least 3 characters.";return}
  }
  const buttons=[$("kycApprove"),$("kycReject"),$("kycDelete")];
  buttons.forEach(b=>b.disabled=true);
  $("kycDecisionMessage").textContent="处理中… / Processing…";
  try{
    await call({action:"kyc_review",agent_id:selected.agentId,decision,reason},{signal:kycAbort?.signal});
    maskKyc(decision==="approve"?"身份已核准 / Identity approved.":"已退回并记录原因 / Rejected with reason.");
    await refreshKycList();
  }catch{
    if(kycActive?.agentId===selected.agentId)$("kycDecisionMessage").textContent="审核失败，未确认状态变更。请刷新列表后再试。 / Review failed; verify status before retry.";
  }finally{buttons.forEach(b=>b.disabled=false)}
}
async function deleteKyc(){
  const selected=kycActive;
  if(!selected||!selected.deleteRequested)return;
  if(!confirm("永久删除此 Agent 的身份审核资料与 IC 照片？此操作不可恢复。\nPermanently delete this Agent's KYC record and photo?"))return;
  if(prompt("输入 DELETE 确认永久删除 / Type DELETE to confirm")!=="DELETE")return;
  $("kycDelete").disabled=true;
  try{
    await call({action:"kyc_delete",agent_id:selected.agentId,confirm:true},{signal:kycAbort?.signal});
    maskKyc("已提交永久删除 / Deletion completed.");
    await refreshKycList();
  }catch{
    if(kycActive?.agentId===selected.agentId)$("kycDecisionMessage").textContent="删除失败，未确认记录已移除。 / Delete failed; record may remain.";
  }finally{$("kycDelete").disabled=false}
}
$("kycOpen").onclick=()=>{$("app").classList.add("kyc-mode");$("kycPage").classList.remove("hidden");maskKyc("点击列表项目查看完整身份资料。 / Select an applicant to view.");refreshKycList()};
$("kycBack").onclick=closeKycPage;
$("kycReload").onclick=()=>{maskKyc("列表已刷新。 / List refreshed.");refreshKycList()};
$("kycClose").onclick=()=>maskKyc();
$("kycApprove").onclick=()=>reviewKyc("approve");
$("kycReject").onclick=()=>reviewKyc("reject");
$("kycDelete").onclick=deleteKyc;
$("kycCanvas").addEventListener("contextmenu",event=>event.preventDefault());
document.addEventListener("visibilitychange",()=>{if(document.hidden)maskKyc("已切换页面，身份资料自动遮盖。 / Hidden when tab is not visible.")});
window.addEventListener("blur",()=>{if(kycActive)maskKyc("窗口失去焦点，身份资料自动遮盖。 / Hidden on focus loss.")});
window.addEventListener("pagehide",()=>maskKyc());

async function refresh(){try{let [j,qj,pfj]=await Promise.all([call({action:"dashboard"}),call({action:"quote_queue"}),call({action:"profit_floor_overview"})]),d=j.dashboard||{};show("app");$("mode").textContent=String(d.profit_mode||"normal").toUpperCase();$("margin").textContent=(Number(d.net_margin_30d||0)*100).toFixed(1)+"%";$("orders").textContent=d.orders_today||0;$("revenue").textContent="RM "+Number(d.revenue_today||0).toFixed(0);$("avg").textContent=Number(d.avg_orders_per_active_agent||0).toFixed(2);$("active").textContent=d.active_agents||0;$("dormant").textContent=d.dormant_agents||0;$("comm").textContent="RM "+Number(d.commission_liability||0).toFixed(0);$("bonus").textContent="RM "+Number(d.bonus_liability||0).toFixed(0);$("exCount").textContent=(d.serious_exceptions||0)+" open";let ex=j.exceptions||[];$("exceptions").innerHTML=ex.length?ex.map(e=>"<div class=item><div class=row style='justify-content:space-between'><div><b class=damage>"+escapeHtml(String(e.severity||"").toUpperCase())+" · "+escapeHtml(e.type)+"</b><div class=muted>"+escapeHtml(e.summary)+"</div></div><div class=row><button class='btn ex' data-id='"+escapeHtml(e.id)+"' data-a='freeze'>Freeze</button><button class='btn ex' data-id='"+escapeHtml(e.id)+"' data-a='dismiss'>Dismiss</button></div></div></div>").join(""):"<div class='item muted'>No serious exceptions.</div>";document.querySelectorAll(".ex").forEach(b=>b.onclick=async()=>{await call({action:"decide_exception",exception_id:b.dataset.id,decision:b.dataset.a});await refresh()});
let pf=pfj.profit_floor||{},floor=Number(pf.min_contribution_margin||0),autoTarget=Number(pf.auto_quote_target||0);
$("profitFloorValue").textContent=(floor*100).toFixed(0)+"%";
$("profitFloorMetric").textContent=(floor*100).toFixed(1)+"%";
$("profitAutoTarget").textContent=(autoTarget*100).toFixed(1)+"%";
$("profitFloorInput").value=String(Math.round(floor*100)||50);
const pfQuotes=pf.quotes||[],pfOrders=pf.orders||[];
$("profitFloorQuotes").innerHTML=pfQuotes.length?pfQuotes.map(q=>"<div class='item'><b>"+escapeHtml(q.customer_label||"Customer")+" · "+escapeHtml(q.agent_name||q.agent_code||"Agent")+"</b><div class='muted'>RM "+Number(q.selling_price||0).toFixed(2)+" · Margin "+(Number(q.contribution_margin||0)*100).toFixed(1)+"% · "+escapeHtml(q.manual_review_reason||"manual_review")+"</div><div class='muted'>Hard-floor minimum RM "+Number(q.hard_floor_min_selling_price||0).toFixed(2)+" · Auto-approval minimum RM "+Number(q.auto_approval_min_selling_price||0).toFixed(2)+"</div></div>").join(""):"<div class='item muted'>No quotes below the floor / 没有低于底线的报价。</div>";
$("profitFloorOrders").innerHTML=pfOrders.length?pfOrders.map(o=>"<div class='item'><b>"+escapeHtml(o.order_code||"Order")+" · "+escapeHtml(o.agent_name||o.agent_code||"Agent")+"</b><div class='muted'>Actual contribution margin "+(Number(o.contribution_margin||0)*100).toFixed(1)+"%</div></div>").join(""):"<div class='item muted'>No completed orders below the floor / 没有低于底线的已完成订单。</div>";
$("profitFloorSave").onclick=async()=>{
  const pct=Number($("profitFloorInput").value),msg=$("profitFloorMsg"),btn=$("profitFloorSave");
  if(!Number.isFinite(pct)||pct<50||pct>80){msg.textContent="请输入 50–80%。 / Enter 50–80%.";return}
  if(!confirm("把利润硬底线改成 "+pct.toFixed(0)+"%？这只影响之后的新报价和新订单，不会改历史成交单。\nChange the hard floor to "+pct.toFixed(0)+"% for future quotes/orders?"))return;
  btn.disabled=true;msg.textContent="Saving / 保存中…";
  try{await call({action:"set_profit_floor",min_contribution_margin:pct/100,confirm:true});msg.textContent="✓ Saved / 已保存";await refresh()}
  catch(e){msg.textContent=friendlyError(e?.message)}
  finally{btn.disabled=false}
};
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
$("profitFloorSave").classList.toggle("hidden",j.role!=="owner");$("profitFloorInput").disabled=j.role!=="owner";
$("baselineCard").classList.toggle("hidden",j.role!=="owner");
ownerOccasionRole=j.role==="owner";
$("ownerOccasionsCard").classList.toggle("hidden",!ownerOccasionRole);
if(ownerOccasionRole){try{await refreshOwnerOccasions()}catch(error){$("occasionMessage").textContent=occasionError(error)}}else clearOwnerOccasions();
$("handbookCard").classList.toggle("hidden",j.role!=="owner");
$("signupToggleCard").classList.toggle("hidden",j.role!=="owner");
if(j.role==="owner")await refreshSignupSetting();
    $("kycOpen").classList.toggle("hidden",j.role!=="owner");
if(j.role!=="owner"&&!$("kycPage").classList.contains("hidden"))closeKycPage();
if(j.role==="owner"){try{await refreshHandbook()}catch(e){$("handbookMsg").textContent=friendlyError(e?.message)}}
$("recoveryBtn").closest(".card").classList.toggle("hidden",j.role!=="owner");
 $("ownerDailyBriefCard").classList.toggle("hidden",j.role!=="owner");
 if(j.role==="owner")try{await refreshDailyBrief()}catch(e){$("dailyBriefContent").textContent=friendlyError(e?.message)}
 $("portfolioCard").classList.toggle("hidden",j.role!=="owner");
 if(j.role==="owner")try{await refreshPortfolio()}catch(e){$("portfolioMsg").textContent=friendlyError(e?.message)}
 $("commissionPayCard").classList.toggle("hidden",j.role!=="owner");
$("launchOrdersCard").classList.toggle("hidden",j.role!=="owner");
 $("launchProgressCard").classList.toggle("hidden",j.role!=="owner");
 if(j.role==="owner")try{await refreshCommissionPayouts()}catch(e){$("commissionPayMsg").textContent=friendlyError(e?.message)}
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
let signupOpen=null;
function renderSignupSetting(){
  const on=signupOpen===true;
  $("signupSettingState").textContent=signupOpen===null?"—":(on?"开 / On":"关 / Off");
  $("signupSettingNote").textContent=signupOpen===null
    ?"正在读取目前设定… / Checking current setting…"
    :(on?"新 Agent 现在可以自己用 Google 注册。 / New Agents can register with Google."
        :"只能用邀请链接加入 / Invitation link only");
  $("signupToggleBtn").textContent=signupOpen===null
    ?"读取中… / Loading…"
    :(on?"关闭自己注册 · 改用邀请 / Close self-registration":"开放 Google 自己注册 / Open Google registration");
  $("signupToggleBtn").disabled=signupOpen===null;
}
async function refreshSignupSetting(){
  $("signupSettingMsg").textContent="";
  try{
    const j=await call({action:"signup_setting_get"});
    signupOpen=Boolean(j.open);renderSignupSetting();
  }catch(e){
    signupOpen=null;renderSignupSetting();
    $("signupSettingMsg").textContent=friendlyError(e?.message);
  }
}
$("signupToggleBtn").onclick=async()=>{
  if(signupOpen===null)return;
  const next=!signupOpen;
  const promptText=next
    ?"开放后，新 Agent 可以自己用 Google 注册。确定开放？\nOpen Google self-registration?"
    :"关闭后，只能用邀请链接加入。确定关闭？\nInvitation link only after closing. Continue?";
  if(!confirm(promptText))return;
  $("signupToggleBtn").disabled=true;
  $("signupSettingMsg").textContent="正在保存… / Saving…";
  try{
    const j=await call({action:"signup_setting_set",open:next});
    signupOpen=Boolean(j.open);renderSignupSetting();
    $("signupSettingMsg").textContent="已保存 ✓ / Saved ✓";
  }catch(e){
    $("signupSettingMsg").textContent=friendlyError(e?.message);
    renderSignupSetting();
  }
};
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
sb.auth.onAuthStateChange(async(_e,s)=>{if(s?.user?.id!==session?.user?.id)clearOwnerOccasions();session=s;if(s)await refresh();else show("login")});
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
    if(u.pathname==="/health")return Response.json({ok:true,service:"EW VERDORA Owner Mobile",version:"1.1.0"},{headers:securityHeaders({"cache-control":"no-store"})});
    return new Response(HTML,{headers:securityHeaders({"content-type":"text/html; charset=utf-8","cache-control":"no-store"})});
  }
};
