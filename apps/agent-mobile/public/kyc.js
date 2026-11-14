import {element,clear,setButtonLoading,toast,vibrate} from "./components.js";
import {createIcon} from "./icons.js";

const CONSENT_VERSION="v1.0-2026-11";
const AREAS=["Kuching","Matang","Batu Kawa","Tabuan Jaya","Petra Jaya","Satok","Padawan","Siburan","Samarahan","Other"];
const MAX_SIDE=1600;
const MAX_BYTES=5*1024*1024;
const MIME_TYPES=new Set(["image/jpeg","image/png","image/webp"]);

function formatIc(value){
  const digits=String(value||"").replace(/\D/g,"").slice(0,12);
  if(digits.length<=6)return digits;
  if(digits.length<=8)return digits.slice(0,6)+"-"+digits.slice(6);
  return digits.slice(0,6)+"-"+digits.slice(6,8)+"-"+digits.slice(8);
}
function onlyDigits(value){return String(value||"").replace(/\D/g,"").slice(0,12)}
function validPhone(value){
  const raw=String(value||"").replace(/[\s()+-]/g,"");
  const phone=raw.startsWith("0")?"6"+raw:raw;
  return /^601[0-9]{8,9}$/.test(phone);
}
function safeStatus(value){
  return ["draft","submitted","approved","rejected"].includes(String(value||""))?String(value):"";
}
async function fileToBitmap(file){
  if(typeof createImageBitmap==="function")return createImageBitmap(file);
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("image_read_failed"))};
    img.src=url;
  });
}
async function compressImage(file){
  if(!file||!MIME_TYPES.has(String(file.type||"").toLowerCase()))throw new Error("photo_format");
  const image=await fileToBitmap(file);
  const width=Number(image.width||image.naturalWidth||0);
  const height=Number(image.height||image.naturalHeight||0);
  if(!width||!height)throw new Error("photo_read");
  const scale=Math.min(1,MAX_SIDE/Math.max(width,height));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(width*scale));
  canvas.height=Math.max(1,Math.round(height*scale));
  const ctx=canvas.getContext("2d",{alpha:false});
  if(!ctx)throw new Error("photo_read");
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  image.close?.();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",0.86));
  canvas.width=1;canvas.height=1;
  if(!blob)throw new Error("photo_read");
  if(blob.size>MAX_BYTES)throw new Error("photo_too_large");
  return blob;
}

export function createKycExperience({getData,getLang,tr,api,rawUpload,onRefresh}){
  let copy=null;
  let detail=null;
  let step=1;
  let flow=null;
  let settings=null;
  let photoBlob=null;
  let previewUrl="";
  let objectPath="";
  let busy=false;
  let consent=false;
  let icLast4="";
  const form={legal_name:"",preferred_name:"",ic_number:"",phone_whatsapp:"",area:""};

  function localized(obj,key){
    return String(obj?.[key+"_"+(getLang()==="zh"?"zh":"en")]||"");
  }
  async function ensureCopy(){
    if(copy)return copy;
    try{
      const response=await fetch("/content/onboarding/kyc_copy.json",{cache:"no-store"});
      if(response.ok)copy=await response.json();
    }catch{}
    copy=copy||{};
    return copy;
  }
  function releasePreview(){
    if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=""}
  }
  function clearSensitive(){
    form.legal_name="";
    form.preferred_name="";
    form.ic_number="";
    form.phone_whatsapp="";
    form.area="";
    icLast4="";
    consent=false;
    photoBlob=null;
    objectPath="";
    releasePreview();
  }
  function humanError(code){
    const value=String(code||"").toLowerCase();
    if(value.includes("invalid_ic_format"))return tr("identityIcLengthError");
    if(value.includes("invalid_ic_date"))return tr("identityIcDateError");
    if(value.includes("underage"))return tr("identityAgeError");
    if(value.includes("duplicate_ic"))return tr("identityIcUsedError");
    if(value.includes("invalid_phone"))return tr("identityPhoneError");
    if(value.includes("consent"))return tr("identityConsentError");
    if(value.includes("file_too_large")||value.includes("too_large"))return tr("identityPhotoSizeError");
    if(value.includes("invalid_image")||value.includes("invalid_upload")||value.includes("photo_format"))return tr("identityPhotoFormatError");
    if(value.includes("network"))return tr("identityNetworkError");
    if(value.includes("photo_missing"))return tr("identityPhotoMissingError");
    return tr("identityTryAgain");
  }
  async function loadStatus(){
    const d=getData()||{};
    if(!d.kyc_required&&!d.kyc_status){detail=null;syncSettingsButton();return null}
    try{
      const result=await api({action:"kyc_status"});
      detail={
        status:safeStatus(result?.status||d.kyc_status),
        reject_reason:String(result?.reject_reason||""),
        ic_last4:String(result?.ic_last4||"").replace(/\D/g,"").slice(-4),
        delete_requested:Boolean(result?.delete_requested)
      };
    }catch{
      detail={status:safeStatus(d.kyc_status),reject_reason:"",ic_last4:"",delete_requested:false};
    }
    syncSettingsButton();
    return detail;
  }
  async function sync(){
    await loadStatus();
    return detail;
  }
  function syncSettingsButton(){
    const button=document.getElementById("identitySettingsBtn");
    if(!button)return;
    const d=getData()||{};
    button.classList.toggle("hidden",!d.kyc_status);
    button.setAttribute("aria-label",tr("identitySettings"));
    button.title=tr("identitySettings");
  }
  function statusCardContent(card,status){
    const body=element("div",{className:"identity-card-copy"});
    const title=element("strong",{className:"identity-card-title"});
    const text=element("p",{className:"identity-card-text"});
    body.append(title,text);
    if(status==="submitted"){
      title.textContent=tr("identityWaitingTitle");
      text.textContent=tr("identityWaitingBody");
    }else if(status==="approved"){
      title.textContent=tr("identityVerifiedTitle");
      text.textContent=tr("identityVerifiedBody");
    }else if(status==="rejected"){
      title.textContent=tr("identityFixTitle");
      text.textContent=detail?.reject_reason?tr("identityOwnerReason",{reason:detail.reject_reason}):tr("identityFixBody");
      const action=element("button",{className:"btn btn-primary identity-card-action",text:tr("identityFixAction"),attrs:{type:"button"}});
      action.addEventListener("click",()=>open({startStep:1}));
      body.append(action);
    }else{
      title.textContent=tr("identityStartTitle");
      text.textContent=tr("identityStartBody");
      const action=element("button",{className:"btn btn-primary identity-card-action",text:tr("identityStart"),attrs:{type:"button"}});
      action.addEventListener("click",()=>open({startStep:1}));
      body.append(action);
    }
    card.append(body);
  }
  function renderTodayCard(){
    const d=getData()||{};
    const status=safeStatus(detail?.status||d.kyc_status);
    if(!d.kyc_required&&!status)return null;
    const card=element("section",{className:"identity-card","data-identity-status":status||"needed"});
    const icon=element("div",{className:"identity-card-icon"});
    icon.append(createIcon(status==="approved"?"checkCircle":"shieldCheck",{size:24}));
    card.append(icon);
    statusCardContent(card,status);
    return card;
  }
  function ensureFlow(){
    if(flow)return flow;
    flow=element("div",{className:"identity-flow hidden",attrs:{role:"dialog","aria-modal":"true","aria-labelledby":"identityFlowTitle"}});
    const panel=element("div",{className:"identity-flow-panel"});
    const head=element("div",{className:"identity-flow-head"});
    const back=element("button",{className:"btn btn-text identity-back",attrs:{type:"button","aria-label":tr("back")}});
    back.append(createIcon("arrowLeft",{size:22}),document.createTextNode(tr("back")));
    back.addEventListener("click",()=>{
      if(busy)return;
      if(step>1){step-=1;renderStep()}else close();
    });
    const closeBtn=element("button",{className:"btn btn-text identity-close",text:"×",attrs:{type:"button","aria-label":tr("close")}});
    closeBtn.addEventListener("click",()=>{if(!busy)close()});
    head.append(back,closeBtn);
    const progress=element("div",{className:"identity-progress"});
    const bar=element("span",{className:"identity-progress-bar"});
    progress.append(bar);
    const body=element("div",{className:"identity-flow-body"});
    panel.append(head,progress,body);
    flow.append(panel);
    document.body.append(flow);
    return flow;
  }
  function heading(body,title,copyText){
    body.append(
      element("div",{className:"identity-step-count",text:tr("identityStep",{step})}),
      element("h2",{id:"identityFlowTitle",className:"identity-flow-title",text:title})
    );
    if(copyText)body.append(element("p",{className:"identity-flow-copy",text:copyText}));
  }
  function nextButton(label,handler){
    const button=element("button",{className:"btn btn-primary identity-next",text:label,attrs:{type:"button"}});
    button.addEventListener("click",handler);
    return button;
  }
  function renderStep1(body){
    const reason=localized(copy?.why_ic,"body")||tr("identityWhyBody");
    heading(body,tr("identityWhyTitle"),reason);
    const protect=element("div",{className:"identity-protect"});
    protect.append(createIcon("lock",{size:20}),element("p",{text:tr("identityProtectBody")}));
    body.append(protect);
    const consentRow=element("label",{className:"identity-consent"});
    const checkbox=element("input",{attrs:{type:"checkbox"}});
    checkbox.checked=consent;
    checkbox.addEventListener("change",()=>{consent=checkbox.checked});
    consentRow.append(checkbox,element("span",{text:tr("identityConsentText")}));
    const message=element("p",{className:"identity-inline-message",attrs:{role:"status"}});
    const button=nextButton(tr("identityAgreeContinue"),()=>{
      if(!checkbox.checked){message.textContent=tr("identityConsentError");return}
      consent=true;step=2;renderStep();
    });
    body.append(consentRow,message,button);
  }
  function field(labelText,input){
    const wrap=element("label",{className:"identity-field"});
    wrap.append(element("span",{text:labelText}),input);
    return wrap;
  }
  function renderAreas(body){
    body.append(element("span",{className:"identity-field-label",text:tr("identityArea")}));
    const grid=element("div",{className:"identity-area-grid",attrs:{role:"group","aria-label":tr("identityArea")}});
    AREAS.forEach(area=>{
      const b=element("button",{className:"identity-area-btn"+(form.area===area?" active":""),text:area==="Other"?tr("identityAreaOther"):area,attrs:{type:"button","aria-pressed":form.area===area?"true":"false"}});
      b.addEventListener("click",()=>{
        form.area=area;
        grid.querySelectorAll("button").forEach(x=>{const active=x===b;x.classList.toggle("active",active);x.setAttribute("aria-pressed",active?"true":"false")});
      });
      grid.append(b);
    });
    body.append(grid);
  }
  function validateDetails(message){
    const digits=onlyDigits(form.ic_number);
    if(form.legal_name.trim().length<2){message.textContent=tr("identityNameError");return false}
    if(form.preferred_name.trim().length<2){message.textContent=tr("identityPreferredError");return false}
    if(digits.length!==12){message.textContent=tr("identityIcLengthError");return false}
    if(!validPhone(form.phone_whatsapp)){message.textContent=tr("identityPhoneError");return false}
    if(!AREAS.includes(form.area)){message.textContent=tr("identityAreaError");return false}
    return true;
  }
  function renderStep2(body){
    heading(body,tr("identityDetailsTitle"),tr("identityDetailsBody"));
    const legal=element("input",{attrs:{type:"text",autocomplete:"name",maxlength:"120",value:form.legal_name}});
    legal.addEventListener("input",()=>{form.legal_name=legal.value});
    const preferred=element("input",{attrs:{type:"text",autocomplete:"nickname",maxlength:"120",value:form.preferred_name}});
    preferred.addEventListener("input",()=>{form.preferred_name=preferred.value});
    const ic=element("input",{attrs:{type:"text",inputmode:"numeric",autocomplete:"off",maxlength:"14",value:formatIc(form.ic_number),"aria-describedby":"identityIcHint"}});
    ic.addEventListener("input",()=>{form.ic_number=onlyDigits(ic.value);ic.value=formatIc(form.ic_number)});
    const phone=element("input",{attrs:{type:"tel",inputmode:"tel",autocomplete:"tel",maxlength:"18",value:form.phone_whatsapp}});
    phone.addEventListener("input",()=>{form.phone_whatsapp=phone.value});
    body.append(
      field(tr("identityLegalName"),legal),
      element("small",{className:"identity-hint",text:tr("identityLegalHint")}),
      field(tr("identityPreferredName"),preferred),
      field(tr("identityIcNumber"),ic),
      element("small",{id:"identityIcHint",className:"identity-hint",text:tr("identityIcHint")}),
      field(tr("identityWhatsapp"),phone)
    );
    renderAreas(body);
    const message=element("p",{className:"identity-inline-message",attrs:{role:"status"}});
    const button=nextButton(tr("identitySaveContinue"),async()=>{
      if(busy||!validateDetails(message))return;
      busy=true;setButtonLoading(button,true,tr("saving"));
      try{
        const digits=onlyDigits(form.ic_number);
        icLast4=digits.slice(-4);
        await api({
          action:"register",
          legal_name:form.legal_name.trim(),
          preferred_name:form.preferred_name.trim(),
          ic_number:digits,
          phone_whatsapp:form.phone_whatsapp.trim(),
          area:form.area,
          consent:true,
          consent_version:CONSENT_VERSION,
          language:getLang()
        });
        vibrate(10);toast(tr("identityDetailsSaved"),{tone:"success"});
        step=3;renderStep();
      }catch(error){message.textContent=humanError(error?.message)}
      finally{busy=false;setButtonLoading(button,false,tr("identitySaveContinue"))}
    });
    body.append(message,button);
  }
  function photoGuide(){
    const guide=element("div",{className:"identity-photo-guide"});
    const frame=element("div",{className:"identity-card-frame",attrs:{"aria-hidden":"true"}});
    frame.append(element("span",{text:"MYKAD"}));
    const tips=element("ul",{className:"identity-photo-tips"});
    [tr("identityPhotoTipLight"),tr("identityPhotoTipGlare"),tr("identityPhotoTipCorners")].forEach(value=>tips.append(element("li",{text:value})));
    guide.append(frame,tips);
    return guide;
  }
  function renderStep3(body){
    heading(body,tr("identityPhotoTitle"),tr("identityPhotoBody"));
    body.append(photoGuide());
    const input=element("input",{className:"identity-file-input",attrs:{type:"file",accept:"image/jpeg,image/png,image/webp",capture:"environment"}});
    const pick=element("label",{className:"btn btn-primary identity-photo-pick"});
    pick.append(createIcon("camera",{size:20}),document.createTextNode(tr("identityTakePhoto")),input);
    const message=element("p",{className:"identity-inline-message",attrs:{role:"status"}});
    const preview=element("div",{className:"identity-preview hidden"});
    const image=element("img",{attrs:{alt:tr("identityPhotoPreview")}});
    const actions=element("div",{className:"identity-preview-actions"});
    const retake=element("button",{className:"btn btn-secondary",text:tr("identityRetake"),attrs:{type:"button"}});
    const use=element("button",{className:"btn btn-primary",text:tr("identityUsePhoto"),attrs:{type:"button"}});
    actions.append(retake,use);preview.append(image,actions);
    input.addEventListener("change",async()=>{
      const file=input.files?.[0];
      if(!file)return;
      setButtonLoading(pick,true,tr("identityPreparingPhoto"));
      message.textContent="";
      try{
        photoBlob=await compressImage(file);
        releasePreview();previewUrl=URL.createObjectURL(photoBlob);
        image.src=previewUrl;preview.classList.remove("hidden");pick.classList.add("hidden");
      }catch(error){photoBlob=null;message.textContent=humanError(error?.message)}
      finally{setButtonLoading(pick,false,tr("identityTakePhoto"));input.value=""}
    });
    retake.addEventListener("click",()=>{
      photoBlob=null;releasePreview();image.removeAttribute("src");preview.classList.add("hidden");pick.classList.remove("hidden");input.click();
    });
    use.addEventListener("click",async()=>{
      if(busy||!photoBlob){message.textContent=tr("identityPhotoMissingError");return}
      busy=true;setButtonLoading(use,true,tr("identitySendingPhoto"));
      try{
        let sent=false,lastStatus=0;
        for(let attempt=0;attempt<2&&!sent;attempt+=1){
          const grant=await api({action:"kyc_upload_url",content_type:"image/jpeg"});
          const response=await rawUpload(grant.upload_url,photoBlob,"image/jpeg");
          lastStatus=response?.status||0;
          sent=Boolean(response?.ok);
          if(!sent&&attempt===0)continue;
        }
        if(!sent)throw new Error(lastStatus===0?"network_error":"photo_upload_failed");
        const grant=await api({action:"kyc_upload_url",content_type:"image/jpeg"});
        const response=await rawUpload(grant.upload_url,photoBlob,"image/jpeg");
        if(!response?.ok){
          const fresh=await api({action:"kyc_upload_url",content_type:"image/jpeg"});
          const retry=await rawUpload(fresh.upload_url,photoBlob,"image/jpeg");
          if(!retry?.ok)throw new Error("photo_upload_failed");
          objectPath=String(fresh.object_path||"");
        }else objectPath=String(grant.object_path||"");
        photoBlob=null;releasePreview();image.removeAttribute("src");
        toast(tr("identityPhotoReady"),{tone:"success"});vibrate(10);
        step=4;renderStep();
      }catch(error){message.textContent=humanError(error?.message)}
      finally{busy=false;setButtonLoading(use,false,tr("identityUsePhoto"))}
    });
    body.append(pick,preview,message);
  }
  function renderStep4(body){
    heading(body,tr("identityReviewTitle"),tr("identityReviewBody"));
    const check=element("div",{className:"identity-review-box"});
    check.append(
      element("span",{text:tr("identityIcEnding")}),
      element("strong",{text:"•••• "+icLast4}),
      element("p",{text:tr("identityReviewPrivacy")})
    );
    const message=element("p",{className:"identity-inline-message",attrs:{role:"status"}});
    const button=nextButton(tr("identitySendReview"),async()=>{
      if(busy||!objectPath)return;
      busy=true;setButtonLoading(button,true,tr("identitySendingReview"));
      try{
        await api({action:"kyc_submit",object_path:objectPath});
        clearSensitive();
        detail={status:"submitted",reject_reason:"",ic_last4:"",delete_requested:false};
        close();
        await onRefresh();
        toast(tr("identitySubmittedPraise"),{tone:"success"});vibrate([12,35,12]);
      }catch(error){message.textContent=humanError(error?.message)}
      finally{busy=false;setButtonLoading(button,false,tr("identitySendReview"))}
    });
    body.append(check,message,button);
  }
  function renderStep(){
    ensureFlow();
    const body=flow.querySelector(".identity-flow-body");
    clear(body);
    flow.querySelector(".identity-progress-bar").style.width=String(step*25)+"%";
    const back=flow.querySelector(".identity-back");
    back.classList.toggle("hidden",step===1);
    if(step===1)renderStep1(body);
    else if(step===2)renderStep2(body);
    else if(step===3)renderStep3(body);
    else renderStep4(body);
    body.querySelector("input,button")?.focus({preventScroll:true});
  }
  async function open({startStep=1}={}){
    await ensureCopy();
    step=Math.min(4,Math.max(1,Number(startStep)||1));
    ensureFlow().classList.remove("hidden");
    document.body.classList.add("identity-open");
    renderStep();
  }
  function close(){
    flow?.classList.add("hidden");
    document.body.classList.remove("identity-open");
  }
  function ensureSettings(){
    if(settings)return settings;
    settings=element("div",{className:"identity-settings hidden",attrs:{role:"dialog","aria-modal":"true","aria-labelledby":"identitySettingsTitle"}});
    document.body.append(settings);
    return settings;
  }
  function renderSettings(confirming=false){
    const host=ensureSettings();clear(host);
    const panel=element("div",{className:"identity-settings-panel"});
    const closeBtn=element("button",{className:"btn btn-text identity-settings-close",text:"×",attrs:{type:"button","aria-label":tr("close")}});
    closeBtn.addEventListener("click",()=>host.classList.add("hidden"));
    panel.append(closeBtn,element("h2",{id:"identitySettingsTitle",text:tr("identitySettings")}));
    const status=safeStatus(detail?.status||getData()?.kyc_status);
    panel.append(element("p",{text:status==="approved"?tr("identityVerifiedTitle"):tr("identitySettingsBody")}));
    if(confirming){
      const warn=element("div",{className:"identity-delete-warning"});
      warn.append(element("strong",{text:tr("identityDeleteConfirmTitle")}),element("p",{text:tr("identityDeleteConsequence")}));
      const cancel=element("button",{className:"btn btn-secondary",text:tr("identityKeepData"),attrs:{type:"button"}});
      const confirm=element("button",{className:"btn btn-danger",text:tr("identityDeleteConfirmAction"),attrs:{type:"button"}});
      cancel.addEventListener("click",()=>renderSettings(false));
      confirm.addEventListener("click",async()=>{
        if(busy)return;
        busy=true;setButtonLoading(confirm,true,tr("identityDeleting"));
        try{
          await api({action:"kyc_request_delete",confirm:true});
          host.classList.add("hidden");
          detail={...(detail||{}),delete_requested:true};
          toast(tr("identityDeleteRequested"),{tone:"success"});
        }catch(error){toast(humanError(error?.message),{tone:"danger"})}
        finally{busy=false;setButtonLoading(confirm,false,tr("identityDeleteConfirmAction"))}
      });
      warn.append(cancel,confirm);panel.append(warn);
    }else{
      panel.append(element("p",{className:"identity-settings-note",text:tr("identityDeleteConsequence")}));
      const remove=element("button",{className:"btn btn-danger identity-delete-start",text:tr("identityDeleteAction"),attrs:{type:"button"}});
      remove.addEventListener("click",()=>renderSettings(true));
      panel.append(remove);
    }
    host.append(panel);
  }
  async function openSettings(){
    await loadStatus();
    renderSettings(false);
    ensureSettings().classList.remove("hidden");
  }
  function bind(){
    document.getElementById("identitySettingsBtn")?.addEventListener("click",openSettings);
    syncSettingsButton();
  }
  function onLanguageChange(){
    syncSettingsButton();
    if(flow&&!flow.classList.contains("hidden"))renderStep();
    if(settings&&!settings.classList.contains("hidden"))renderSettings(false);
  }
  function destroy(){
    clearSensitive();
    flow?.remove();flow=null;
    settings?.remove();settings=null;
  }
  return {sync,bind,renderTodayCard,open,openSettings,onLanguageChange,destroy};
}
