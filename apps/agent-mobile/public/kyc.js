import {element,clear,setButtonLoading,toast,vibrate} from "./components.js";
import {createIcon} from "./icons.js";

const CONSENT_VERSION="v1.0-2026-11";
const AREAS=["Kuching","Matang","Batu Kawa","Tabuan Jaya","Petra Jaya","Satok","Padawan","Siburan","Samarahan","Other"];
const MAX_SIDE=1600;
const MAX_BYTES=5*1024*1024;
const MIME_TYPES=new Set(["image/jpeg","image/png","image/webp"]);
const FLOW_COPY={
  en:{
    identityStep:"Step {step} of 4",identityWhyTitle:"Why we need this",identityWhyBody:"To protect you and customers, and to make sure commission is paid to the right person, we need to confirm your identity.",
    identityProtectBody:"Your details are encrypted and only the Owner can view them.",identityConsentText:"I agree to EW VERDORA using these details to confirm my identity and pay my commission.",identityConsentError:"Please tick the box first, then continue.",identityAgreeContinue:"I understand · Continue",
    identityDetailsTitle:"Your details",identityDetailsBody:"Fill in one section at a time. You can go back and change it.",identityLegalName:"Legal name",identityLegalHint:"Use the same name shown on your IC.",identityPreferredName:"What should we call you?",identityIcNumber:"IC number",identityIcHint:"Type 12 digits. The dashes will appear automatically.",identityWhatsapp:"WhatsApp number",identityArea:"Your area",identityAreaOther:"Other",
    identityNameError:"Please enter the name shown on your IC.",identityPreferredError:"Please tell us what you would like to be called.",identityIcLengthError:"Your IC number is missing a digit. Please check all 12 digits.",identityIcDateError:"The birth date in the IC number does not look right. Please check the number again.",identityAgeError:"Registration is only available from age 18.",identityIcUsedError:"This IC has already been used. Please contact the Owner if this is your IC.",identityPhoneError:"Please check your WhatsApp number, for example 012-345 6789.",identityAreaError:"Please tap your area before continuing.",identitySaveContinue:"Save details · Continue",identityDetailsSaved:"Done! Just the photo and final check left 👍",
    identityPhotoTitle:"Take the front of your IC",identityPhotoBody:"Place the whole IC inside the guide. You can check the photo before using it.",identityPhotoTipLight:"Enough light",identityPhotoTipGlare:"No glare",identityPhotoTipCorners:"All 4 corners visible",identityTakePhoto:"Take IC front photo",identityPhotoPreview:"Preview of your IC photo",identityRetake:"Retake",identityUsePhoto:"Use this photo",identityPreparingPhoto:"Preparing photo…",identitySendingPhoto:"Securing photo…",identityPhotoReady:"Photo ready. Last step 👍",identityPhotoSizeError:"The photo is still too large. Please take it again a little closer.",identityPhotoFormatError:"This photo cannot be used. Please take a new photo with your phone camera.",identityPhotoMissingError:"Please take a clear IC photo first.",identityNetworkError:"The network is unstable. Your details are still here — please press again.",identityTryAgain:"Something did not go through. Your details are still here — please try again.",
    identityReviewTitle:"Check before sending",identityReviewBody:"We will only show the last 4 IC digits here.",identityIcEnding:"IC ending",identityReviewPrivacy:"Your full IC number and photo are not kept in this browser after you send them.",identitySendReview:"Send for review",identitySendingReview:"Sending securely…",identitySubmittedPraise:"All done! The Owner will usually review it within 1 day 👍",
    identitySettingsBody:"You can ask for your identity details to be deleted here.",identityDeleteAction:"Delete my identity details",identityDeleteConfirmTitle:"Delete these identity details?",identityDeleteConsequence:"After deletion, you will need to verify your identity again before taking orders.",identityKeepData:"Keep my details",identityDeleteConfirmAction:"Yes, request deletion",identityDeleting:"Sending request…",identityDeleteRequested:"Deletion request sent."
  },
  zh:{
    identityStep:"第 {step} 步，共 4 步",identityWhyTitle:"为什么需要",identityWhyBody:"为了保护你和客人，也确保佣金付给本人，我们需要确认你的身份。",identityProtectBody:"资料会加密保存，只有老板看得到。",identityConsentText:"我同意 EW VERDORA 使用这些资料确认我的身份和发放佣金。",identityConsentError:"先打勾同意，就可以继续。",identityAgreeContinue:"我明白了 · 继续",
    identityDetailsTitle:"你的资料",identityDetailsBody:"一项一项填就好，之后也可以按返回修改。",identityLegalName:"法定姓名",identityLegalHint:"跟 IC 上的名字一样。",identityPreferredName:"平时要怎么称呼你？",identityIcNumber:"IC 号码",identityIcHint:"输入 12 个数字，横线会自动出现。",identityWhatsapp:"WhatsApp 号码",identityArea:"你住哪一区",identityAreaOther:"其他",
    identityNameError:"请填 IC 上的姓名。",identityPreferredError:"请填平时要怎么称呼你。",identityIcLengthError:"IC 号码少了一位，请再检查，应该有 12 个数字。",identityIcDateError:"IC 号码里的出生日期好像不对，请再检查一次。",identityAgeError:"需要满 18 岁才可以注册。",identityIcUsedError:"这个 IC 已经登记过。如果是你的 IC，请联系老板处理。",identityPhoneError:"WhatsApp 号码好像不对，例如 012-345 6789。",identityAreaError:"先按一下你所在的地区。",identitySaveContinue:"保存资料 · 继续",identityDetailsSaved:"好了！只剩拍照和最后确认 👍",
    identityPhotoTitle:"拍 IC 正面",identityPhotoBody:"把整张 IC 放进框里。拍完可以先看，不满意就重拍。",identityPhotoTipLight:"光线够",identityPhotoTipGlare:"不要反光",identityPhotoTipCorners:"4 个角都拍进去",identityTakePhoto:"拍 IC 正面",identityPhotoPreview:"IC 照片预览",identityRetake:"重拍",identityUsePhoto:"用这张",identityPreparingPhoto:"正在准备照片…",identitySendingPhoto:"正在安全保存照片…",identityPhotoReady:"照片好了！只剩最后一步 👍",identityPhotoSizeError:"照片还是太大，请靠近一点再拍一次。",identityPhotoFormatError:"这张照片不能使用，请直接用手机相机重拍。",identityPhotoMissingError:"请先拍一张清楚的 IC 正面。",identityNetworkError:"网络不稳，资料还在，请再按一次。",identityTryAgain:"刚才没有成功，资料还在，请再试一次。",
    identityReviewTitle:"送出前确认",identityReviewBody:"这里不会再显示完整 IC，只会显示最后 4 位。",identityIcEnding:"IC 最后 4 位",identityReviewPrivacy:"送出后，完整 IC 号码和照片不会留在这个浏览器。",identitySendReview:"送出审核",identitySendingReview:"正在安全送出…",identitySubmittedPraise:"好了！老板通常 1 天内会看完 👍",
    identitySettingsBody:"这里可以申请删除你的身份资料。",identityDeleteAction:"删除我的身份资料",identityDeleteConfirmTitle:"确定要删除身份资料？",identityDeleteConsequence:"删除后，要重新完成身份验证才可以接单。",identityKeepData:"保留资料",identityDeleteConfirmAction:"确定，申请删除",identityDeleting:"正在送出申请…",identityDeleteRequested:"删除申请已送出。"
  }
};

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
  const t=(key,vars={})=>{
    const local=FLOW_COPY[getLang()==="zh"?"zh":"en"]?.[key];
    const raw=local||tr(key,vars);
    return String(raw).replace(/\{(\w+)\}/g,(_,name)=>String(vars[name]??""));
  };

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
    if(value.includes("invalid_ic_format"))return t("identityIcLengthError");
    if(value.includes("invalid_ic_date"))return t("identityIcDateError");
    if(value.includes("underage"))return t("identityAgeError");
    if(value.includes("duplicate_ic"))return t("identityIcUsedError");
    if(value.includes("invalid_phone"))return t("identityPhoneError");
    if(value.includes("consent"))return t("identityConsentError");
    if(value.includes("file_too_large")||value.includes("too_large"))return t("identityPhotoSizeError");
    if(value.includes("invalid_image")||value.includes("invalid_upload")||value.includes("photo_format"))return t("identityPhotoFormatError");
    if(value.includes("network"))return t("identityNetworkError");
    if(value.includes("photo_missing"))return t("identityPhotoMissingError");
    return t("identityTryAgain");
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
    button.setAttribute("aria-label",t("identitySettings"));
    button.title=t("identitySettings");
  }
  function statusCardContent(card,status){
    const body=element("div",{className:"identity-card-copy"});
    const title=element("strong",{className:"identity-card-title"});
    const text=element("p",{className:"identity-card-text"});
    body.append(title,text);
    if(status==="submitted"){
      title.textContent=t("identityWaitingTitle");
      text.textContent=t("identityWaitingBody");
    }else if(status==="approved"){
      title.textContent=t("identityVerifiedTitle");
      text.textContent=t("identityVerifiedBody");
    }else if(status==="rejected"){
      title.textContent=t("identityFixTitle");
      text.textContent=detail?.reject_reason?t("identityOwnerReason",{reason:detail.reject_reason}):t("identityFixBody");
      const action=element("button",{className:"btn btn-primary identity-card-action",text:t("identityFixAction"),attrs:{type:"button"}});
      action.addEventListener("click",()=>open({startStep:1}));
      body.append(action);
    }else{
      title.textContent=t("identityStartTitle");
      text.textContent=t("identityStartBody");
      const action=element("button",{className:"btn btn-primary identity-card-action",text:t("identityStart"),attrs:{type:"button"}});
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
    icon.append(createIcon(status==="approved"?"circleCheck":"user",{size:24}));
    card.append(icon);
    statusCardContent(card,status);
    return card;
  }
  function ensureFlow(){
    if(flow)return flow;
    flow=element("div",{className:"identity-flow hidden",attrs:{role:"dialog","aria-modal":"true","aria-labelledby":"identityFlowTitle"}});
    const panel=element("div",{className:"identity-flow-panel"});
    const head=element("div",{className:"identity-flow-head"});
    const back=element("button",{className:"btn btn-text identity-back",attrs:{type:"button","aria-label":t("back")}});
    back.append(createIcon("arrowLeft",{size:22}),document.createTextNode(t("back")));
    back.addEventListener("click",()=>{
      if(busy)return;
      if(step>1){step-=1;renderStep()}else close();
    });
    const closeBtn=element("button",{className:"btn btn-text identity-close",text:"×",attrs:{type:"button","aria-label":t("close")}});
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
      element("div",{className:"identity-step-count",text:t("identityStep",{step})}),
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
    const reason=localized(copy?.why_ic,"body")||t("identityWhyBody");
    heading(body,t("identityWhyTitle"),reason);
    const protect=element("div",{className:"identity-protect"});
    protect.append(createIcon("lock",{size:20}),element("p",{text:t("identityProtectBody")}));
    body.append(protect);
    const consentRow=element("label",{className:"identity-consent"});
    const checkbox=element("input",{attrs:{type:"checkbox"}});
    checkbox.checked=consent;
    checkbox.addEventListener("change",()=>{consent=checkbox.checked});
    consentRow.append(checkbox,element("span",{text:t("identityConsentText")}));
    const message=element("p",{className:"identity-inline-message",attrs:{role:"status"}});
    const button=nextButton(t("identityAgreeContinue"),()=>{
      if(!checkbox.checked){message.textContent=t("identityConsentError");return}
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
    body.append(element("span",{className:"identity-field-label",text:t("identityArea")}));
    const grid=element("div",{className:"identity-area-grid",attrs:{role:"group","aria-label":t("identityArea")}});
    AREAS.forEach(area=>{
      const b=element("button",{className:"identity-area-btn"+(form.area===area?" active":""),text:area==="Other"?t("identityAreaOther"):area,attrs:{type:"button","aria-pressed":form.area===area?"true":"false"}});
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
    if(form.legal_name.trim().length<2){message.textContent=t("identityNameError");return false}
    if(form.preferred_name.trim().length<2){message.textContent=t("identityPreferredError");return false}
    if(digits.length!==12){message.textContent=t("identityIcLengthError");return false}
    if(!validPhone(form.phone_whatsapp)){message.textContent=t("identityPhoneError");return false}
    if(!AREAS.includes(form.area)){message.textContent=t("identityAreaError");return false}
    return true;
  }
  function renderStep2(body){
    heading(body,t("identityDetailsTitle"),t("identityDetailsBody"));
    const legal=element("input",{attrs:{type:"text",autocomplete:"name",maxlength:"120",value:form.legal_name}});
    legal.addEventListener("input",()=>{form.legal_name=legal.value});
    const preferred=element("input",{attrs:{type:"text",autocomplete:"nickname",maxlength:"120",value:form.preferred_name}});
    preferred.addEventListener("input",()=>{form.preferred_name=preferred.value});
    const ic=element("input",{attrs:{type:"text",inputmode:"numeric",autocomplete:"off",maxlength:"14",value:formatIc(form.ic_number),"aria-describedby":"identityIcHint"}});
    ic.addEventListener("input",()=>{form.ic_number=onlyDigits(ic.value);ic.value=formatIc(form.ic_number)});
    const phone=element("input",{attrs:{type:"tel",inputmode:"tel",autocomplete:"tel",maxlength:"18",value:form.phone_whatsapp}});
    phone.addEventListener("input",()=>{form.phone_whatsapp=phone.value});
    body.append(
      field(t("identityLegalName"),legal),
      element("small",{className:"identity-hint",text:t("identityLegalHint")}),
      field(t("identityPreferredName"),preferred),
      field(t("identityIcNumber"),ic),
      element("small",{id:"identityIcHint",className:"identity-hint",text:t("identityIcHint")}),
      field(t("identityWhatsapp"),phone)
    );
    renderAreas(body);
    const message=element("p",{className:"identity-inline-message",attrs:{role:"status"}});
    const button=nextButton(t("identitySaveContinue"),async()=>{
      if(busy||!validateDetails(message))return;
      busy=true;setButtonLoading(button,true,t("saving"));
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
        vibrate(10);toast(t("identityDetailsSaved"),{tone:"success"});
        step=3;renderStep();
      }catch(error){message.textContent=humanError(error?.message)}
      finally{busy=false;setButtonLoading(button,false,t("identitySaveContinue"))}
    });
    body.append(message,button);
  }
  function photoGuide(){
    const guide=element("div",{className:"identity-photo-guide"});
    const frame=element("div",{className:"identity-card-frame",attrs:{"aria-hidden":"true"}});
    frame.append(element("span",{text:"MYKAD"}));
    const tips=element("ul",{className:"identity-photo-tips"});
    [t("identityPhotoTipLight"),t("identityPhotoTipGlare"),t("identityPhotoTipCorners")].forEach(value=>tips.append(element("li",{text:value})));
    guide.append(frame,tips);
    return guide;
  }
  function renderStep3(body){
    heading(body,t("identityPhotoTitle"),t("identityPhotoBody"));
    body.append(photoGuide());
    const input=element("input",{className:"identity-file-input",attrs:{type:"file",accept:"image/jpeg,image/png,image/webp",capture:"environment"}});
    const pick=element("label",{className:"btn btn-primary identity-photo-pick"});
    pick.append(createIcon("imagePlus",{size:20}),document.createTextNode(t("identityTakePhoto")),input);
    const message=element("p",{className:"identity-inline-message",attrs:{role:"status"}});
    const preview=element("div",{className:"identity-preview hidden"});
    const image=element("img",{attrs:{alt:t("identityPhotoPreview")}});
    const actions=element("div",{className:"identity-preview-actions"});
    const retake=element("button",{className:"btn btn-secondary",text:t("identityRetake"),attrs:{type:"button"}});
    const use=element("button",{className:"btn btn-primary",text:t("identityUsePhoto"),attrs:{type:"button"}});
    actions.append(retake,use);preview.append(image,actions);
    input.addEventListener("change",async()=>{
      const file=input.files?.[0];
      if(!file)return;
      setButtonLoading(pick,true,t("identityPreparingPhoto"));
      message.textContent="";
      try{
        photoBlob=await compressImage(file);
        releasePreview();previewUrl=URL.createObjectURL(photoBlob);
        image.src=previewUrl;preview.classList.remove("hidden");pick.classList.add("hidden");
      }catch(error){photoBlob=null;message.textContent=humanError(error?.message)}
      finally{setButtonLoading(pick,false,t("identityTakePhoto"));input.value=""}
    });
    retake.addEventListener("click",()=>{
      photoBlob=null;releasePreview();image.removeAttribute("src");preview.classList.add("hidden");pick.classList.remove("hidden");input.click();
    });
    use.addEventListener("click",async()=>{
      if(busy||!photoBlob){message.textContent=t("identityPhotoMissingError");return}
      busy=true;setButtonLoading(use,true,t("identitySendingPhoto"));
      try{
        objectPath="";
        let lastStatus=0;
        for(let attempt=0;attempt<2&&!objectPath;attempt+=1){
          const grant=await api({action:"kyc_upload_url",content_type:"image/jpeg"});
          const response=await rawUpload(grant.upload_url,photoBlob,"image/jpeg");
          lastStatus=response?.status||0;
          if(response?.ok)objectPath=String(grant.object_path||"");
        }
        if(!objectPath)throw new Error(lastStatus===0?"network_error":"photo_upload_failed");
        photoBlob=null;releasePreview();image.removeAttribute("src");
        toast(t("identityPhotoReady"),{tone:"success"});vibrate(10);
        step=4;renderStep();
      }catch(error){message.textContent=humanError(error?.message)}
      finally{busy=false;setButtonLoading(use,false,t("identityUsePhoto"))}
    });
    body.append(pick,preview,message);
  }
  function renderStep4(body){
    heading(body,t("identityReviewTitle"),t("identityReviewBody"));
    const check=element("div",{className:"identity-review-box"});
    check.append(
      element("span",{text:t("identityIcEnding")}),
      element("strong",{text:"•••• "+icLast4}),
      element("p",{text:t("identityReviewPrivacy")})
    );
    const message=element("p",{className:"identity-inline-message",attrs:{role:"status"}});
    const button=nextButton(t("identitySendReview"),async()=>{
      if(busy||!objectPath)return;
      busy=true;setButtonLoading(button,true,t("identitySendingReview"));
      try{
        await api({action:"kyc_submit",object_path:objectPath});
        clearSensitive();
        detail={status:"submitted",reject_reason:"",ic_last4:"",delete_requested:false};
        close();
        await onRefresh();
        toast(t("identitySubmittedPraise"),{tone:"success"});vibrate([12,35,12]);
      }catch(error){message.textContent=humanError(error?.message)}
      finally{busy=false;setButtonLoading(button,false,t("identitySendReview"))}
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
    const closeBtn=element("button",{className:"btn btn-text identity-settings-close",text:"×",attrs:{type:"button","aria-label":t("close")}});
    closeBtn.addEventListener("click",()=>host.classList.add("hidden"));
    panel.append(closeBtn,element("h2",{id:"identitySettingsTitle",text:t("identitySettings")}));
    const status=safeStatus(detail?.status||getData()?.kyc_status);
    panel.append(element("p",{text:status==="approved"?t("identityVerifiedTitle"):t("identitySettingsBody")}));
    if(confirming){
      const warn=element("div",{className:"identity-delete-warning"});
      warn.append(element("strong",{text:t("identityDeleteConfirmTitle")}),element("p",{text:t("identityDeleteConsequence")}));
      const cancel=element("button",{className:"btn btn-secondary",text:t("identityKeepData"),attrs:{type:"button"}});
      const confirm=element("button",{className:"btn btn-danger",text:t("identityDeleteConfirmAction"),attrs:{type:"button"}});
      cancel.addEventListener("click",()=>renderSettings(false));
      confirm.addEventListener("click",async()=>{
        if(busy)return;
        busy=true;setButtonLoading(confirm,true,t("identityDeleting"));
        try{
          await api({action:"kyc_request_delete",confirm:true});
          host.classList.add("hidden");
          detail={...(detail||{}),delete_requested:true};
          toast(t("identityDeleteRequested"),{tone:"success"});
        }catch(error){toast(humanError(error?.message),{tone:"danger"})}
        finally{busy=false;setButtonLoading(confirm,false,t("identityDeleteConfirmAction"))}
      });
      warn.append(cancel,confirm);panel.append(warn);
    }else{
      panel.append(element("p",{className:"identity-settings-note",text:t("identityDeleteConsequence")}));
      const remove=element("button",{className:"btn btn-danger identity-delete-start",text:t("identityDeleteAction"),attrs:{type:"button"}});
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
