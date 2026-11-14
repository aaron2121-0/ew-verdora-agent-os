import {element,setButtonLoading} from "./components.js";
import {createIcon} from "./icons.js";

export const CONSENT_VERSION="v1.0-2026-11";
export const KYC_AREAS=["Kuching","Matang","Batu Kawa","Tabuan Jaya","Petra Jaya","Satok","Padawan","Siburan","Samarahan","Other"];

export function formatIc(value){
  const d=String(value||"").replace(/\D/g,"").slice(0,12);
  return [d.slice(0,6),d.slice(6,8),d.slice(8,12)].filter(Boolean).join("-");
}

function bilingual(zh,en){const w=element("span",{className:"kyc-bi"});w.append(element("span",{text:zh}),element("small",{text:en}));return w}
function fieldBlock(labelZh,labelEn,input,helpZh="",helpEn=""){
  const wrap=element("label",{className:"kyc-field"});
  wrap.append(bilingual(labelZh,labelEn),input);
  if(helpZh||helpEn)wrap.append(bilingual(helpZh,helpEn));
  return wrap;
}
function friendly(code){
  const map={
    kyc_consent_required:["请先勾选同意书，再继续。","Please agree to the data notice before continuing."],
    kyc_invalid_consent_version:["同意书版本已更新，请重新打开这一页。","The data notice was updated. Please reopen this page."],
    kyc_invalid_name:["姓名或称呼需要至少 2 个字。","Name and preferred name need at least 2 characters."],
    kyc_invalid_ic_format:["身份证号码要有 12 个数字。","Please enter all 12 IC digits."],
    kyc_invalid_ic_date:["身份证里的出生日期看起来不对，请检查。","The birth date in the IC looks incorrect. Please check it."],
    kyc_underage:["目前只开放给 18 岁或以上的 Agent。","Agent registration is currently for age 18 and above."],
    kyc_invalid_phone:["WhatsApp 电话格式不对，请用马来西亚手机号码。","Please use a valid Malaysian mobile number."],
    kyc_invalid_area:["请选择你主要活动的地区。","Please choose your main area."],
    kyc_duplicate_ic:["这张身份证已经登记过，请联络负责人帮你检查。","This IC is already registered. Please contact the owner for help."],
    kyc_already_registered:["资料已经登记，可以继续下一步。","Your details are already saved. You can continue."],
    upload_failed:["照片没有传上去。请检查网络后再试一次。","The photo did not go through. Check your connection and try again."],
    request_failed:["刚才没有完成。请再试一次；如果还是不行，联络负责人。","That did not complete. Try once more, then contact the owner if it still fails."]
  };
  return map[code]||map.request_failed;
}
async function canvasCompress(file){
  const img=await createImageBitmap(file);
  const max=1600,scale=Math.min(1,max/Math.max(img.width,img.height));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
  const ctx=canvas.getContext("2d",{alpha:false});ctx.drawImage(img,0,0,canvas.width,canvas.height);img.close?.();
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("upload_failed")),"image/jpeg",0.86));
  return new File([blob],"ic-front.jpg",{type:"image/jpeg",lastModified:Date.now()});
}
export function createKycUI({getData,getLang,api,onRefresh}){
  let copy=null,status=null,overlay=null,dialog=null,step=1,consented=false;
  let sensitive={legal_name:"",preferred_name:"",ic_number:"",phone_whatsapp:"",area:""};
  let photo=null,previewUrl="",objectPath="";
  let settingsButton=null,focusBefore=null;
  const t=(obj,key)=>String(obj?.[key+"_"+(getLang()==="zh"?"zh":"en")]||obj?.[key+"_zh"]||obj?.[key+"_en"]||"");
  const cleanupSensitive=()=>{sensitive={legal_name:"",preferred_name:"",ic_number:"",phone_whatsapp:"",area:""};photo=null;objectPath="";if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=""};
  async function loadCopy(){
    if(copy)return copy;
    const r=await fetch("/content/onboarding/kyc_copy.json",{cache:"no-store"});if(!r.ok)throw new Error("request_failed");
    copy=await r.json();return copy;
  }
  async function refreshStatus(){
    try{const j=await api.agent({action:"kyc_status"});status=j||null}catch{status=null}
    updateSettingsButton();return status;
  }
  function statusCard(){
    const s=String(status?.status||"");
    if(!s)return null;
    const card=element("section",{className:"kyc-status-card"});
    const icon=element("div",{className:"kyc-status-icon"});icon.append(createIcon(s==="approved"?"circleCheck":s==="rejected"?"shieldAlert":"clock",{size:24}));
    const body=element("div",{className:"kyc-status-copy"});
    if(s==="approved")body.append(bilingual("身份已验证 ✓","Identity verified"),bilingual("这部分已经完成。","This part is complete."));
    else if(s==="submitted")body.append(bilingual("审核中","Under review"),bilingual("资料已经送出，负责人看完后会更新这里。","Your details were sent. The owner will update this after review."));
    else if(s==="rejected"){
      body.append(bilingual("需要补资料","Please update your details"));
      if(status?.reject_reason)body.append(element("p",{className:"kyc-reason",text:String(status.reject_reason)}));
      const b=element("button",{className:"btn btn-primary btn-large",text:"重新拍 / 修改 · Update"});b.type="button";b.addEventListener("click",()=>open(2));body.append(b);
    }
    card.append(icon,body);return card;
  }
  function banner(){
    if(!getData()?.kyc_required)return null;
    const existing=statusCard();if(existing)return existing;
    const card=element("button",{className:"kyc-banner",attrs:{type:"button"}});
    const icon=element("span",{className:"kyc-banner-icon"});icon.append(createIcon("user",{size:24}));
    const text=element("span",{className:"kyc-banner-copy"});text.append(element("strong",{text:"完成身份验证，就能开始接单"}),element("small",{text:"Verify your identity to start taking orders · 约 2 分钟 / about 2 minutes"}));
    const arrow=createIcon("arrowRight",{size:20});card.append(icon,text,arrow);card.addEventListener("click",()=>open(1));return card;
  }
  function updateSettingsButton(){
    if(!settingsButton)return;
    settingsButton.classList.toggle("hidden",!status?.status);
  }
  function ensureSettings(){
    if(settingsButton)return;
    const host=document.querySelector(".top-actions");if(!host)return;
    settingsButton=element("button",{className:"btn btn-text btn-small kyc-settings hidden",attrs:{type:"button","aria-label":"设定 / Settings"}});
    settingsButton.append(createIcon("settings",{size:20}),element("span",{text:"设定"}));
    settingsButton.addEventListener("click",openSettings);
    host.insertBefore(settingsButton,document.getElementById("logout"));
  }
  function shell(titleZh,titleEn){
    const box=element("div",{className:"kyc-shell"});
    const head=element("div",{className:"kyc-head"});
    const close=element("button",{className:"btn btn-text kyc-close",attrs:{type:"button","aria-label":"关闭 / Close"},text:"×"});close.addEventListener("click",dismiss);
    head.append(bilingual(titleZh,titleEn),close);box.append(head);return box;
  }
  function stepLabel(n){return bilingual("第 "+n+" 步，共 4 步","Step "+n+" of 4")}
  function nextButton(label,fn){const b=element("button",{className:"btn btn-primary btn-large kyc-next",attrs:{type:"button"},text:label});b.addEventListener("click",fn);return b}
  function showMessage(pair,tone="danger"){
    const n=element("div",{className:"kyc-message "+tone});n.append(bilingual(pair[0],pair[1]));dialog?.querySelector(".kyc-message")?.remove();dialog?.append(n);
  }
  function render(){
    if(!dialog)return;dialog.replaceChildren();
    const c=copy||{};const box=shell("身份验证","Identity verification");box.append(stepLabel(step));
    if(step===1){
      const why=element("section",{className:"kyc-info"});why.append(bilingual(c.why_ic?.title_zh||"为什么需要身份证",c.why_ic?.title_en||"Why we need your IC"),bilingual(c.why_ic?.body_zh||"",c.why_ic?.body_en||""));box.append(why);
      const consent=element("section",{className:"kyc-consent"});consent.append(bilingual(c.consent_draft?.title_zh||"资料使用同意书",c.consent_draft?.title_en||"Data use consent"),bilingual(c.consent_draft?.body_zh||"",c.consent_draft?.body_en||""));
      const row=element("label",{className:"kyc-check"}),cb=element("input",{attrs:{type:"checkbox"}});cb.checked=consented;cb.addEventListener("change",()=>{consented=cb.checked});row.append(cb,bilingual("我已看过并同意以上资料用途","I have read and agree to the data use above"));consent.append(row);box.append(consent);
      box.append(nextButton("同意并继续 · Agree & continue",()=>{if(!consented){showMessage(["请先勾选同意书。","Please tick the consent box first."]);return}step=2;render()}));
    }else if(step===2){
      box.append(bilingual("先填基本资料","Tell us who you are"),bilingual("资料只用来确认身份和发放佣金。","These details are used for identity checks and commission payments."));
      const mk=(name,type="text")=>{const inp=element("input",{attrs:{type,autocomplete:name==="legal_name"?"name":name==="phone_whatsapp"?"tel":"off"}});inp.value=sensitive[name]||"";inp.addEventListener("input",()=>{sensitive[name]=name==="ic_number"?formatIc(inp.value):inp.value;if(name==="ic_number")inp.value=sensitive[name]});return inp};
      box.append(fieldBlock("法定姓名","Full legal name",mk("legal_name"),"照身份证上的名字填写","Enter it exactly as shown on your IC"));
      box.append(fieldBlock("称呼","Preferred name",mk("preferred_name"),"平时希望怎样称呼你","How you would like us to address you"));
      box.append(fieldBlock("身份证号码","IC number",mk("ic_number"),"12 个数字，横线会自动加上","12 digits; dashes are added automatically"));
      box.append(fieldBlock("WhatsApp 电话","WhatsApp number",mk("phone_whatsapp"),"用马来西亚手机号码","Use a Malaysian mobile number"));
      const area=element("div",{className:"kyc-area"});area.append(bilingual("所在地区","Your main area"));
      const grid=element("div",{className:"kyc-area-grid"});for(const a of KYC_AREAS){const b=element("button",{className:"kyc-area-btn"+(sensitive.area===a?" selected":""),attrs:{type:"button"},text:a==="Other"?"其他 / Other":a});b.addEventListener("click",()=>{sensitive.area=a;render()});grid.append(b)}area.append(grid);box.append(area);
      const save=nextButton("保存资料，下一步 · Save & continue",async()=>{setButtonLoading(save,true,"正在保存 · Saving…");try{const j=await api.agent({action:"register",legal_name:sensitive.legal_name,preferred_name:sensitive.preferred_name,ic_number:sensitive.ic_number,phone_whatsapp:sensitive.phone_whatsapp,area:sensitive.area,consent:true,consent_version:CONSENT_VERSION,language:getLang()});if(!j?.ok)throw new Error(j?.error||"request_failed");step=3;render()}catch(e){showMessage(friendly(e?.message));setButtonLoading(save,false,"保存资料，下一步 · Save & continue")}});box.append(save);
    }else if(step===3){
      box.append(bilingual("拍身份证正面","Take a photo of the front of your IC"),bilingual("把整张卡放进框里，四个角都看得到。","Fit the whole card in the frame with all four corners visible."));
      const frame=element("div",{className:"kyc-photo-frame"});if(previewUrl){const img=element("img",{attrs:{src:previewUrl,alt:"身份证照片预览 / IC photo preview"}});frame.append(img)}else frame.append(bilingual("把身份证放在这里","Place the IC here"));
      box.append(frame);
      const input=element("input",{className:"kyc-file",attrs:{type:"file",accept:"image/jpeg,image/png,image/webp"}});input.addEventListener("change",async()=>{const f=input.files?.[0];if(!f)return;try{const compressed=await canvasCompress(f);if(previewUrl)URL.revokeObjectURL(previewUrl);photo=compressed;previewUrl=URL.createObjectURL(compressed);render()}catch{showMessage(friendly("upload_failed"))}});
      const choose=element("label",{className:"btn btn-secondary btn-large kyc-file-label",text:previewUrl?"重新拍 / 重新选 · Retake / choose again":"拍照或从相册选择 · Camera or photos"});choose.append(input);box.append(choose);
      const upload=nextButton("照片清楚，继续 · Photo is clear, continue",async()=>{if(!photo){showMessage(["请先拍或选择身份证照片。","Please take or choose the IC photo first."]);return}setButtonLoading(upload,true,"正在安全传送 · Sending securely…");try{let grant=await api.agent({action:"kyc_upload_url",content_type:"image/jpeg"});let sent=await api.uploadKyc(grant,photo);if(sent?.grant)grant=sent.grant;objectPath=grant.object_path;step=4;render()}catch(e){showMessage(friendly(e?.message));setButtonLoading(upload,false,"照片清楚，继续 · Photo is clear, continue")}});box.append(upload);
    }else{
      box.append(bilingual("最后确认一次","One last check"),bilingual("身份证号码这里只显示最后 4 位。","Only the last 4 IC digits are shown here."));
      const list=element("div",{className:"kyc-review"});for(const [z,e,v] of [["称呼","Preferred name",sensitive.preferred_name],["地区","Area",sensitive.area],["身份证","IC","•••• "+String(sensitive.ic_number).replace(/\D/g,"").slice(-4)]]){const row=element("div",{className:"kyc-review-row"});row.append(bilingual(z,e),element("strong",{text:v||"—"}));list.append(row)}box.append(list);
      const submit=nextButton("送出审核 · Send for review",async()=>{setButtonLoading(submit,true,"正在送出 · Sending…");try{const j=await api.agent({action:"kyc_submit",object_path:objectPath});if(!j?.ok&&j?.status!=="submitted")throw new Error(j?.error||"request_failed");cleanupSensitive();status={status:"submitted",ic_last4:j?.ic_last4||null};dismiss();await onRefresh();await refreshStatus()}catch(e){showMessage(friendly(e?.message));setButtonLoading(submit,false,"送出审核 · Send for review")}});box.append(submit);
    }
    dialog.append(box);
  }
  async function open(start=1){
    focusBefore=document.activeElement;step=start;await loadCopy();if(!overlay){overlay=element("div",{className:"kyc-overlay"});dialog=element("section",{className:"kyc-dialog",attrs:{role:"dialog","aria-modal":"true","aria-label":"身份验证 / Identity verification"}});overlay.append(dialog);overlay.addEventListener("click",e=>{if(e.target===overlay)dismiss()});document.body.append(overlay)}overlay.classList.remove("hidden");render();
  }
  function dismiss(){overlay?.classList.add("hidden");focusBefore?.focus?.()}
  async function openSettings(){
    focusBefore=document.activeElement;
    if(!overlay){await open(1);overlay.classList.add("hidden")}
    overlay.classList.remove("hidden");dialog.replaceChildren();const box=shell("设定","Settings");
    box.append(bilingual("身份资料","Identity details"));
    if(status?.status)box.append(statusCard()||element("span"));
    const explain=element("p",{className:"kyc-muted",text:"删除后，身份验证会失效，也可能暂时不能接单。 / Deleting this may remove your verification and temporarily stop order access."});box.append(explain);
    const del=element("button",{className:"btn btn-danger btn-large",attrs:{type:"button"},text:"删除我的身份资料 · Delete my identity data"});
    del.addEventListener("click",()=>confirmDelete(box));box.append(del);dialog.append(box);
  }
  function confirmDelete(box){
    box.querySelector(".kyc-delete-confirm")?.remove();const c=element("div",{className:"kyc-delete-confirm"});
    c.append(bilingual("确定要申请删除？","Request deletion?"),bilingual("负责人完成删除后，这些身份资料会被清除；你之后若要接单，需要重新验证。","After the owner completes deletion, these identity details are removed. You will need to verify again before taking orders."));
    const yes=element("button",{className:"btn btn-danger btn-large",attrs:{type:"button"},text:"确定申请删除 · Yes, request deletion"});
    yes.addEventListener("click",async()=>{setButtonLoading(yes,true,"正在处理 · Working…");try{await api.agent({action:"kyc_request_delete",confirm:true});dismiss();await refreshStatus()}catch(e){showMessage(friendly(e?.message));setButtonLoading(yes,false,"确定申请删除 · Yes, request deletion")}});c.append(yes);box.append(c);
  }
  async function init(){ensureSettings();await refreshStatus()}
  function onLanguageChange(){updateSettingsButton()}
  function destroy(){cleanupSensitive();overlay?.remove();settingsButton?.remove();overlay=null;dialog=null;settingsButton=null}
  return {init,banner,refreshStatus,onLanguageChange,destroy,open};
}
