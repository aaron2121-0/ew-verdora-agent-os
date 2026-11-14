
const HTML=[
'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EW VERDORA Owner</title><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
'<style>*{box-sizing:border-box}body{margin:0;background:#0E1111;color:#ecf3ee;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}.shell{max-width:760px;margin:auto;padding:18px 14px 60px}.top,.row{display:flex;gap:8px;align-items:center}.top{justify-content:space-between}.brand{font-size:21px;font-weight:850}.muted{font-size:12px;color:#a6b6ae;line-height:1.5}.card{background:#161A1A;border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:15px;margin-top:12px}.title{font-weight:800;font-size:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.metric{font-size:22px;font-weight:850}.btn{min-height:42px;border:1px solid #384741;border-radius:13px;background:#1d2924;color:#eaf7ee;padding:0 13px;font-weight:700}.primary{background:#2E7D5B;color:white;border-color:#2E7D5B}input,select,textarea{width:100%;background:#101816;color:#ecf3ee;border:1px solid #384741;border-radius:13px;padding:10px 12px;min-height:45px}.form{display:grid;gap:8px}.hidden{display:none!important}.item{padding:11px 0;border-top:1px solid rgba(255,255,255,0.08)}.item:first-child{border-top:0}.pill{display:inline-block;border:1px solid #385548;border-radius:999px;padding:4px 8px;font-size:11px}.danger{color:#ff9186}.ok{color:#67dca8}@media(min-width:640px){.grid{grid-template-columns:repeat(4,1fr)}}@media(min-width:1100px){.shell{max-width:1200px}.grid{grid-template-columns:repeat(4,1fr)}}@media(prefers-reduced-motion:no-preference){.card{animation:rise .45s ease both}@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}}.kyc-mode > :not(#kycPage){display:none!important}.kyc-photo{display:block;width:100%;max-width:100%;height:auto;max-height:650px;object-fit:contain;border:1px solid #384741;border-radius:12px;margin-top:8px;touch-action:pan-y;-webkit-user-select:none;user-select:none}.kyc-photo:not([width]){display:none}.kyc-field{overflow-wrap:anywhere;padding:6px 0;border-bottom:1px solid #384741}.kyc-item{display:block;text-align:left;width:100%;margin-top:8px}.danger-btn{background:#341d1d;border-color:#814441;color:#ffb3ad}.kyc-field strong{display:block;font-size:12px;color:#a6b6ae;margin-bottom:3px}</style></head><body><main class="shell">',
'<div class="top"><div><div class="brand">EW VERDORA</div><div class="muted">Owner Command · Quote Review & Security</div></div><button id="logout" class="btn hidden">Sign out</button></div>',
'<div id="login" class="card"><div class="title">Owner Secure Access</div><div class="muted">Open your one-time Owner Recovery Link. Email magic-link login is disabled to avoid redirect and rate-limit failures.</div><div class="form" style="margin-top:12px"><input id="email" class="hidden" type="email" placeholder="owner@email.com"><button id="loginBtn" class="btn primary hidden">Send sign-in link</button><div id="msg" class="muted"></div></div></div>',
'<div id="app" class="hidden"><div class="row" style="margin-top:12px"><button id="kycOpen" type="button" class="btn primary hidden">身份审核 / Identity Review</button></div><section id="kycPage" class="hidden" aria-label="身份审核"><div class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><button id="kycBack" type="button" class="btn">← 返回 Owner 首页</button><div class="title">身份审核 / Identity Review</div></div><div class="muted">仅显示称呼、地区、提交时间及 IC 后四位。敏感资料仅在查看时读取，60 秒自动遮盖。 / Sensitive details expire after 60 seconds.</div><div class="row" style="margin-top:12px"><button id="kycReload" class="btn" type="button">刷新列表 / Refresh</button><span id="kycCount" class="pill"></span></div><div id="kycMessage" class="muted" role="status" aria-live="polite"></div><div id="kycQueue"></div></div><section id="kycDetail" class="card hidden" aria-label="KYC sensitive review"><div class="row" style="justify-content:space-between"><div class="title">身份资料（限时查看）</div><button id="kycClose" class="btn" type="button">立即遮盖 / Hide</button></div><div id="kycClock" class="muted"></div><div id="kycFields" class="form" style="margin-top:10px"></div><div class="muted" style="margin-top:10px">IC 正面 / IC front (temporary view)</div><canvas id="kycCanvas" class="kyc-photo" role="img" aria-label="IC front photo"></canvas><div id="kycPhotoMessage" class="muted"></div><div id="kycActions" class="form" style="margin-top:12px"><div class="row" style="flex-wrap:wrap"><button id="kycApprove" type="button" class="btn primary">一键核准 / Approve</button><button id="kycReject" type="button" class="btn">退回 / Reject</button></div><label class="muted" for="kycRejectCode">退回原因（必填） / Rejection reason<select id="kycRejectCode"><option value="">请选择原因 / Choose a reason</option><option value="IC photo is unclear / IC 照片不清晰">IC 照片不清晰 / Blurry photo</option><option value="IC information does not match / 身份资料不一致">身份资料不一致 / Data mismatch</option><option value="IC photo is incomplete / IC 照片不完整">IC 照片不完整 / Incomplete photo</option><option value="other">其他 / Other</option></select></label><label class="muted" for="kycRejectNote">说明 / Explanation<textarea id="kycRejectNote" rows="2" maxlength="500" placeholder="选择其他时必须填写 / Required when Other is selected"></textarea></label></div><button id="kycDelete" type="button" class="btn danger-btn">永久删除 KYC / Delete KYC record</button><div id="kycDecisionMessage" class="muted" role="status" aria-live="polite"></div></section><div id="kycMasked" class="card muted hidden" role="status" aria-live="polite"></div></section><div class="card"><div class="row" style="justify-content:space-between"><div class="title">Company Health</div><span id="mode" class="pill"></span></div><div class="grid" style="margin-top:13px"><div><div class="muted">30D Net Margin</div><div id="margin" class="metric"></div></div><div><div class="muted">Orders Today</div><div id="orders" class="metric"></div></div><div><div class="muted">Revenue Today</div><div id="revenue" class="metric"></div></div><div><div class="muted">Orders / Active Agent</div><div id="avg" class="metric"></div></div></div></div>',
'<div class="card"><div class="grid"><div><div class="muted">Active Agents</div><div id="active" class="metric"></div></div><div><div class="muted">Dormant</div><div id="dormant" class="metric"></div></div><div><div class="muted">Commission Liability</div><div id="comm" class="metric"></div></div><div><div class="muted">Bonus Liability</div><div id="bonus" class="metric"></div></div></div></div>',
'<div class="card"><div class="row" style="justify-content:space-between"><div class="title">Serious Exceptions</div><span id="exCount" class="pill"></span></div><div id="exceptions"></div></div>',
'<div class="card"><div class="row" style="justify-content:space-between"><div class="title">Manual Quote Review</div><span id="quoteCount" class="pill"></span></div><div class="muted">确认分类后由官方函数计算报价，不能在审核时更改全局成本基准。</div><div id="quoteQueue"></div></div>',
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
async function call(body,options={}){let r=await fetch(CFG.url+"/functions/v1/owner-session",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token,"apikey":CFG.key},body:JSON.stringify(body||{}),signal:options.signal,cache:"no-store",referrerPolicy:"no-referrer"});let j=await r.json();if(!r.ok)throw Error(j.error||"Request failed");return j}
function show(x){if(x!=="app"){maskKyc("身份资料已遮盖 / Sensitive details hidden.");$("app").classList.remove("kyc-mode")} $("login").classList.toggle("hidden",x!=="login");$("app").classList.toggle("hidden",x!=="app");$("logout").classList.toggle("hidden",x==="login")}
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

const KYC_VIEW_MS=60000;
const kycUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let kycSeq=0,kycTimer=null,kycAbort=null,kycActive=null,kycListBusy=false;
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
  $("kycReload").disabled=true;
  $("kycMessage").textContent="读取审核列表中… / Loading review queue…";
  $("kycQueue").replaceChildren();
  try{
    // GPT 1 currently returns {entries:[{agent_id,preferred_name,area,submitted_at,ic_last4,status}]} (other backend fields ignored).
    // Fetch the submitted queue independently: a recent approved record must not push older pending cases out of the capped list.
    const [pendingJ,allJ]=await Promise.all([
      call({action:"kyc_list",status:"submitted",limit:100}),
      call({action:"kyc_list",status:"all",limit:100})
    ]);
    const pending=pendingJ.items??pendingJ.entries??pendingJ.records;
    const all=allJ.items??allJ.entries??allJ.records;
    if(!Array.isArray(pending)||!Array.isArray(all))throw Error("kyc_contract_error");
    const dedup=new Map();
    for(const row of [...all,...pending])if(row&&kycUuid.test(String(row.agent_id||"")))dedup.set(String(row.agent_id),row);
    const safe=[...dedup.values()].filter(r=>r.status!=="draft");
    safe.sort((a,b)=>kycStatusOrder(a.status)-kycStatusOrder(b.status)||(Date.parse(b.submitted_at)||0)-(Date.parse(a.submitted_at)||0));
    $("kycCount").textContent=safe.filter(r=>r.status==="submitted").length+" 待审核 / pending";
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
    $("kycCount").textContent="";
    $("kycMessage").textContent="身份审核接口未就绪或读取失败。请确认 GPT 1 的 kyc_list 已上线并授权 Owner。 / KYC service unavailable.";
  }finally{kycListBusy=false;$("kycReload").disabled=false}
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
  if(!url){$("kycPhotoMessage").textContent="照片暂时无法安全显示 / Secure photo link unavailable.";return}
  try{
    const response=await fetch(url,{cache:"no-store",credentials:"omit",referrerPolicy:"no-referrer",signal});
    if(!response.ok)throw Error("photo_response");
    const mime=(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
    if(!["image/jpeg","image/png","image/webp"].includes(mime))throw Error("photo_type");
    const blob=await response.blob();
    if(blob.size>5*1024*1024||blob.size===0)throw Error("photo_size");
    if(seq!==kycSeq||signal.aborted)return;
    if(typeof createImageBitmap!=="function")throw Error("image_bitmap_unsupported");
    const bitmap=await createImageBitmap(blob);
    try{
      if(seq!==kycSeq||signal.aborted)return;
      const canvas=$("kycCanvas"),ctx=canvas.getContext("2d");
      if(!ctx)throw Error("canvas_unavailable");
      const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));
      canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      $("kycPhotoMessage").textContent="仅供核验，请勿保存或截图。 / Review only. Do not copy.";
    }finally{bitmap.close()}
  }catch{
    if(seq===kycSeq&&!signal.aborted)$("kycPhotoMessage").textContent="照片读取失败，请核实访问权限或图片格式。 / Photo unavailable.";
  }
}
async function openKycView(agentId){
  if(!kycUuid.test(agentId))return;
  maskKyc("读取中… / Loading protected details…");
  const seq=kycSeq,controller=new AbortController();
  kycAbort=controller;
  $("kycMasked").classList.add("hidden");
  $("kycDetail").classList.remove("hidden");
  $("kycClock").textContent="限时 60 秒 / Auto-hide after 60 seconds";
  $("kycFields").append(kycTextField("资料读取中 / Loading","…"));
  kycTimer=setTimeout(()=>maskKyc("已超过 60 秒，敏感资料自动遮盖。 / 60-second viewing limit reached."),KYC_VIEW_MS);
  try{
    // GPT 1 returns {kyc:{agent_id,...,photo_signed_url:"https://...",delete_requested_at}}.
    const j=await call({action:"kyc_view",agent_id:agentId},{signal:controller.signal});
    if(seq!==kycSeq||controller.signal.aborted)return;
    const record=j.kyc??j.record??j.entry;
    if(!record||record.agent_id!==agentId)throw Error("kyc_contract_error");
    kycActive={agentId,status:String(record.status||""),deleteRequested:Boolean(record.delete_requested_at)};
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
    // Do not put a signed URL into img/src, href, logs, localStorage or IndexedDB.
    await drawKycPhoto(record.photo_signed_url,seq,controller.signal);
  }catch{
    if(seq===kycSeq)maskKyc("无法读取该身份资料。请确认权限及 GPT 1 接口格式。 / Unable to view identity record.");
  }
}
async function reviewKyc(decision){
  const selected=kycActive;
  if(!selected||selected.status!=="submitted")return;
  const code=$("kycRejectCode").value,note=$("kycRejectNote").value.trim();
  let reason=null;
  if(decision==="reject"){
    if(!code||(code==="other"&&!note)){
      $("kycDecisionMessage").textContent="退回必须选择原因；选择「其他」必须填写说明。 / Rejection reason required.";return;
    }
    reason=(code==="other"?note:(code+(note?" — "+note:""))).slice(0,500);
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
$("kycOpen").classList.toggle("hidden",j.role!=="owner");
if(j.role!=="owner"&&!$("kycPage").classList.contains("hidden"))closeKycPage();
if(j.role==="owner"){try{await refreshHandbook()}catch(e){$("handbookMsg").textContent=friendlyError(e?.message)}}
$("recoveryBtn").closest(".card").classList.toggle("hidden",j.role!=="owner");

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