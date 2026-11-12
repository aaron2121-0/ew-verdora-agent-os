import {clear,element,setButtonLoading,toast,vibrate} from "./components.js";
import {createIcon} from "./icons.js";
import {kuchingDateKey,deliveryDateChoices,kuchingLocalToIso,formatKuchingDateTime} from "./date.js";
import {loadOrderDraft,saveOrderDraft,saveOrderReference,loadOrderReference,clearOrderDraft} from "./draft.js";

const SOURCE_OPTIONS=[
  ["whatsapp","sourceWhatsapp"],
  ["instagram","sourceInstagram"],
  ["facebook","sourceFacebook"],
  ["xiaohongshu","sourceXiaohongshu"],
  ["personal_network","sourcePersonal"],
  ["corporate_outreach","sourceCorporate"]
];
const OCCASIONS=[
  ["birthday","categoryBirthday"],
  ["anniversary","categoryAnniversary"],
  ["condolence","categoryCondolence"],
  ["opening","categoryOpening"],
  ["proposal","categoryProposal"],
  ["graduation","categoryGraduation"],
  ["corporate","categoryCorporate"],
  ["wedding","categoryWedding"],
  ["general","categoryGeneral"]
];
const BUDGETS=[150,200,300,500,800];
const TIMES=["10:00","14:00","18:00"];
const TIME_LABELS={"10:00":"10:00–13:00","14:00":"14:00–17:00","18:00":"18:00–20:30"};

function buttonWithIcon(icon,label,className="btn btn-secondary",attrs={}){
  const b=element("button",{className,attrs:{type:"button",...attrs}});
  b.append(createIcon(icon,{size:20}),element("span",{text:label}));
  return b;
}

function chip(label,active=false){
  const b=element("button",{className:"choice-chip"+(active?" active":""),text:label,attrs:{type:"button"}});
  return b;
}

export function createOrderWizard({getData,getLang,tr,api,onNavigate,onLocked,onSent}){
  const root=()=>document.getElementById("orderPage");
  let referenceFile=null;
  let previewUrl="";
  let pollTimer=null;
  let restoredNoticeShown=false;

  const fresh=()=>({
    step:1,
    customerMode:"new",
    selectedLeadId:"",
    customerName:"",
    source:"whatsapp",
    occasion:"birthday",
    budget:300,
    deliveryDate:kuchingDateKey(),
    deliveryTime:"14:00",
    referenceName:"",
    leadId:null,
    quoteRequestId:null,
    quoteStatus:null,
    quoteData:null,
    selectedOption:null,
    quote:null,
    sent:false
  });
  let state={...fresh(),...(loadOrderDraft()||{})};
  state.step=Math.min(4,Math.max(1,Number(state.step)||1));
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(state.deliveryDate||"")))state.deliveryDate=kuchingDateKey();

  function serializable(){
    return {
      step:state.step,customerMode:state.customerMode,selectedLeadId:state.selectedLeadId,
      customerName:state.customerName,source:state.source,occasion:state.occasion,budget:state.budget,
      deliveryDate:state.deliveryDate,deliveryTime:state.deliveryTime,referenceName:state.referenceName,
      leadId:state.leadId,quoteRequestId:state.quoteRequestId,quoteStatus:state.quoteStatus,
      quoteData:state.quoteData,selectedOption:state.selectedOption,quote:state.quote,sent:state.sent
    };
  }

  function save(){
    if(!state.sent)saveOrderDraft(serializable());
  }

  function setState(patch,{persist=true,draw=true}={}){
    state={...state,...patch};
    if(persist)save();
    if(draw)render();
  }

  async function init(){
    referenceFile=await loadOrderReference();
    if(referenceFile&&!state.referenceName)state.referenceName=referenceFile.name||"reference";
    if(loadOrderDraft()&&!restoredNoticeShown){
      restoredNoticeShown=true;
      setTimeout(()=>toast(tr("draftRestored"),{tone:"success"}),180);
    }
    if(state.quoteRequestId&&state.step>=3&&!state.quote&&navigator.onLine!==false){
      await checkQuoteStatus({silent:true});
    }else render();
  }

  function resetPoll(){
    if(pollTimer){clearTimeout(pollTimer);pollTimer=null}
    if(state.step===3&&state.quoteRequestId&&state.quoteStatus!=="underwritten"&&state.quoteStatus!=="quote_created"){
      pollTimer=setTimeout(()=>checkQuoteStatus({silent:true}),10000);
    }
  }

  function getLeads(){
    const rows=getData()?.phase1?.recent_leads||[];
    const seen=new Set();
    return rows.filter(x=>{
      const key=String(x.customer_label||"").trim().toLowerCase();
      if(!key||seen.has(key))return false;
      seen.add(key);return true;
    }).slice(0,30);
  }

  function fieldTitle(text,optional=""){
    const row=element("div",{className:"field-title-row"});
    row.append(element("span",{className:"field-title",text}));
    if(optional)row.append(element("span",{className:"field-optional",text:optional}));
    return row;
  }

  function renderHeader(host){
    const top=element("div",{className:"wizard-top"});
    const back=buttonWithIcon("arrowLeft",state.step===1?tr("closeWizard"):tr("back"),"btn btn-text wizard-back");
    back.addEventListener("click",()=>{
      if(state.step===1)onNavigate("today");
      else setState({step:state.step-1});
    });
    const titles=element("div",{className:"wizard-heading"});
    titles.append(element("h1",{className:"screen-title",text:tr("wizardTitle")}),element("div",{className:"screen-subtitle",text:tr("draftSaved")}));
    top.append(back,titles,element("span",{className:"step-count",text:String(state.step)+" / 4"}));
    host.append(top);
    const labels=["stepCustomer","stepNeeds","stepQuote","stepSend"];
    const prog=element("div",{className:"wizard-progress",attrs:{role:"progressbar","aria-valuemin":"1","aria-valuemax":"4","aria-valuenow":state.step}});
    labels.forEach((key,i)=>{
      const item=element("div",{className:"wizard-progress-item"+(i+1<=state.step?" active":"")});
      item.append(element("span",{className:"wizard-progress-bar"}),element("span",{className:"wizard-progress-label",text:tr(key)}));
      prog.append(item);
    });
    host.append(prog);
  }

  function renderStep1(host){
    const card=element("section",{className:"wizard-card page-enter"});
    card.append(element("h2",{className:"card-title",text:tr("stepCustomer")}));
    const modes=element("div",{className:"segmented"});
    [["new","newCustomer"],["existing","existingCustomer"]].forEach(([value,key])=>{
      const b=element("button",{className:"segment"+(state.customerMode===value?" active":""),text:tr(key),attrs:{type:"button"}});
      b.addEventListener("click",()=>setState({customerMode:value}));
      modes.append(b);
    });
    card.append(modes);

    if(state.customerMode==="existing"){
      const list=element("div",{className:"customer-picker"});
      const leads=getLeads();
      if(!leads.length)list.append(element("div",{className:"empty-mini",text:tr("noCustomers")}));
      leads.forEach(ld=>{
        const b=element("button",{className:"customer-pick"+(state.selectedLeadId===ld.id?" active":""),attrs:{type:"button"}});
        const left=element("span",{className:"customer-pick-main"});
        left.append(element("strong",{text:ld.customer_label||"—"}),element("small",{text:tr("sourceTitle")+" · "+String(ld.source||"").toUpperCase()}));
        b.append(left,createIcon(state.selectedLeadId===ld.id?"circleCheck":"user",{size:20}));
        b.addEventListener("click",()=>setState({
          selectedLeadId:ld.id,customerName:ld.customer_label||"",source:ld.source||"whatsapp",
          occasion:OCCASIONS.some(x=>x[0]===ld.occasion)?ld.occasion:state.occasion
        }));
        list.append(b);
      });
      card.append(list);
    }else{
      card.append(fieldTitle(tr("customerNameTitle")));
      const wrap=element("div",{className:"input-icon-wrap"});
      wrap.append(createIcon("user",{size:20}));
      const input=element("input",{attrs:{type:"text",placeholder:tr("customerNamePlaceholder"),autocomplete:"off",maxlength:"120"}});
      input.value=state.customerName||"";
      input.addEventListener("input",e=>{state.customerName=e.target.value;save()});
      wrap.append(input);
      card.append(wrap);
    }

    card.append(fieldTitle(tr("sourceTitle")));
    const sourceGrid=element("div",{className:"choice-grid choice-grid-3"});
    SOURCE_OPTIONS.forEach(([value,key])=>{
      const b=chip(tr(key),state.source===value);
      b.addEventListener("click",()=>setState({source:value}));
      sourceGrid.append(b);
    });
    card.append(sourceGrid);

    const next=buttonWithIcon("arrowRight",tr("nextStep"),"btn btn-primary btn-large wizard-primary");
    next.addEventListener("click",()=>{
      if(!String(state.customerName||"").trim()){
        toast(tr("errorCustomerRequired"),{tone:"danger"});return;
      }
      vibrate(10);
      setState({step:2});
    });
    card.append(next);
    host.append(card);
  }

  function renderStep2(host){
    const card=element("section",{className:"wizard-card page-enter"});
    card.append(element("h2",{className:"card-title",text:tr("stepNeeds")}));

    card.append(fieldTitle(tr("occasionTitle")));
    const occGrid=element("div",{className:"choice-grid choice-grid-2"});
    OCCASIONS.forEach(([value,key])=>{
      const b=chip(tr(key),state.occasion===value);
      b.addEventListener("click",()=>setState({occasion:value}));
      occGrid.append(b);
    });
    card.append(occGrid);

    card.append(fieldTitle(tr("budgetTitle")));
    const budgets=element("div",{className:"budget-row"});
    BUDGETS.forEach(value=>{
      const b=chip("RM "+value,state.budget===value);
      b.addEventListener("click",()=>setState({budget:value}));
      budgets.append(b);
    });
    card.append(budgets);

    card.append(fieldTitle(tr("deliveryDateTitle")));
    const dates=element("div",{className:"choice-grid choice-grid-3"});
    const dateKeys=["todayDate","tomorrowDate","dayAfterTomorrow"];
    deliveryDateChoices().forEach((x,i)=>{
      const b=chip(tr(dateKeys[i]),state.deliveryDate===x.value);
      b.append(element("small",{text:x.value.slice(5)}));
      b.addEventListener("click",()=>setState({deliveryDate:x.value}));
      dates.append(b);
    });
    card.append(dates);

    card.append(fieldTitle(tr("deliveryTimeTitle")));
    const times=element("div",{className:"choice-grid choice-grid-3"});
    TIMES.forEach(value=>{
      const b=chip(TIME_LABELS[value],state.deliveryTime===value);
      b.addEventListener("click",()=>setState({deliveryTime:value}));
      times.append(b);
    });
    card.append(times);

    card.append(fieldTitle(tr("referenceTitle"),tr("referenceOptional")));
    const ref=element("div",{className:"reference-picker"+(referenceFile?" has-file":"")});
    const icon=element("div",{className:"reference-icon"});
    icon.append(createIcon(referenceFile?"circleCheck":"imagePlus",{size:24}));
    const info=element("div",{className:"reference-copy"});
    info.append(element("strong",{text:referenceFile?tr("referenceSelected",{name:state.referenceName||"reference"}):tr("referenceTitle")}),
      element("span",{text:tr("referenceHint")}));
    const choose=buttonWithIcon("imagePlus",referenceFile?tr("reselectReference"):tr("referenceTitle"),"btn btn-secondary btn-small");
    const input=element("input",{className:"visually-hidden",attrs:{type:"file",accept:"image/jpeg,image/png,image/webp"}});
    input.addEventListener("change",async e=>{
      const file=e.target.files?.[0];
      if(!file)return;
      referenceFile=file;
      state.referenceName=file.name||"reference";
      await saveOrderReference(file);
      save();
      vibrate(10);
      render();
    });
    choose.addEventListener("click",()=>input.click());
    ref.append(icon,info,choose,input);
    card.append(ref);

    const actions=element("div",{className:"wizard-actions"});
    const saveBtn=buttonWithIcon("check",tr("saveNeedBtn"),"btn btn-secondary btn-large");
    saveBtn.addEventListener("click",()=>{
      save();
      toast(tr("draftSaved"),{tone:"success"});
      onNavigate("today");
    });
    const quoteBtn=buttonWithIcon("receipt",tr("uploadQuoteBtn"),"btn btn-primary btn-large");
    quoteBtn.disabled=!referenceFile;
    quoteBtn.addEventListener("click",()=>requestQuote(quoteBtn));
    actions.append(saveBtn,quoteBtn);
    card.append(actions);
    if(!referenceFile)card.append(element("div",{className:"inline-hint",text:tr("needReferenceAuto")}));
    host.append(card);
  }

  async function ensureLead(){
    if(state.leadId)return state.leadId;
    const j=await api.agent({
      action:"create_lead",source:state.source,customer_label:String(state.customerName||"").trim(),
      occasion:state.occasion,budget:Number(state.budget),
      delivery_date:state.deliveryDate,delivery_time:state.deliveryTime+":00"
    });
    state.leadId=j.lead?.id||null;
    save();
    if(!state.leadId)throw new Error("lead_not_found");
    return state.leadId;
  }

  async function requestQuote(button){
    if(getData()?.phase1?.can_sell===false){onLocked();return}
    if(!referenceFile){toast(tr("errorReferenceRequired"),{tone:"danger"});return}
    if(navigator.onLine===false){toast(tr("errorOfflineDraft"),{tone:"warning"});save();return}
    setButtonLoading(button,true,tr("loading"));
    try{
      const leadId=await ensureLead();
      let requestId=state.quoteRequestId;
      if(!requestId){
        const created=await api.quote({
          action:"create",lead_id:leadId,customer_budget:Number(state.budget),
          design_commitment:"adapted",
          needed_at:kuchingLocalToIso(state.deliveryDate,state.deliveryTime),
          content_type:referenceFile.type||"image/jpeg"
        });
        requestId=created.request_id;
        state.quoteRequestId=requestId;
        save();
        await api.upload(created,referenceFile);
      }
      const analyzed=await api.quote({action:"analyze",request_id:requestId});
      const q=analyzed.quote_request||{};
      setState({step:3,quoteStatus:q.status||"manual_review",quoteData:q});
      vibrate(12);
    }catch(e){
      if(String(e?.message||"").includes("locked"))onLocked();
      else toast(api.friendlyError(e?.message),{tone:"danger"});
    }finally{
      setButtonLoading(button,false,tr("uploadQuoteBtn"));
    }
  }

  async function checkQuoteStatus({silent=false}={}){
    if(!state.quoteRequestId){render();return}
    try{
      const j=await api.quote({action:"status",request_id:state.quoteRequestId});
      const q=j.quote_request||{};
      state.quoteStatus=q.status||state.quoteStatus;
      state.quoteData=q;
      save();
      render();
      if(q.status==="underwritten"&&!silent)toast(tr("quoteReadyLong"),{tone:"success"});
    }catch(e){
      if(!silent)toast(api.friendlyError(e?.message),{tone:"danger"});
      render();
    }
  }

  function quoteOption(choice,titleKey,descKey,amount){
    const selected=state.selectedOption===choice;
    const card=element("div",{className:"quote-option"+(selected?" selected":"")});
    const top=element("div",{className:"quote-option-top"});
    top.append(element("div",{className:"quote-option-icon"}));
    top.firstChild.append(createIcon(choice==="recommended"?"sparkles":"wallet",{size:20}));
    top.append(element("span",{className:"quote-option-tag",text:tr(titleKey)}));
    card.append(top,element("div",{className:"quote-price",text:"RM "+Number(amount||0).toFixed(0)}),
      element("p",{className:"quote-desc",text:tr(descKey)}));
    const use=buttonWithIcon("check",tr("useThisPrice"),selected?"btn btn-primary btn-large":"btn btn-secondary btn-large");
    use.addEventListener("click",()=>acceptChoice(choice,use));
    card.append(use);
    return card;
  }

  async function acceptChoice(choice,button){
    if(!state.quoteRequestId)return;
    setButtonLoading(button,true,tr("loading"));
    try{
      const j=await api.quote({action:"accept_option",request_id:state.quoteRequestId,option:choice});
      setState({selectedOption:choice,quote:j.quote||null,quoteStatus:"quote_created",step:4});
      vibrate(12);
    }catch(e){
      toast(api.friendlyError(e?.message),{tone:"danger"});
    }finally{
      setButtonLoading(button,false,tr("useThisPrice"));
    }
  }

  function renderStep3(host){
    const card=element("section",{className:"wizard-card page-enter"});
    card.append(element("h2",{className:"card-title",text:tr("stepQuote")}));
    const q=state.quoteData||{};
    if(state.quoteStatus==="underwritten"&&q.budget_version_price&&q.recommended_price){
      const grid=element("div",{className:"quote-compare"});
      grid.append(
        quoteOption("budget","budgetVersion","budgetVersionDesc",q.budget_version_price),
        quoteOption("recommended","recommendedVersion","recommendedVersionDesc",q.recommended_price)
      );
      card.append(grid);
      if(q.customer_note_en||q.customer_note_zh){
        card.append(element("div",{className:"quote-note",text:getLang()==="zh"?(q.customer_note_zh||""):(q.customer_note_en||"")}));
      }
    }else{
      const waiting=element("div",{className:"review-state"});
      const icon=element("div",{className:"review-icon"});icon.append(createIcon("clock",{size:28}));
      waiting.append(icon,element("span",{className:"badge badge-warning",text:tr("manualReviewTag")}),
        element("h3",{text:tr("quoteWaitingTitle")}),element("p",{text:tr("quoteWaitingDesc")}));
      const refresh=buttonWithIcon("refreshCw",tr("refreshQuote"),"btn btn-primary btn-large");
      refresh.addEventListener("click",async()=>{
        setButtonLoading(refresh,true,tr("loading"));
        await checkQuoteStatus();
        setButtonLoading(refresh,false,tr("refreshQuote"));
      });
      waiting.append(refresh);
      card.append(waiting);
    }
    host.append(card);
    resetPoll();
  }

  function occasionLabel(){
    const item=OCCASIONS.find(x=>x[0]===state.occasion);
    return item?tr(item[1]):state.occasion;
  }

  function quoteMessage(){
    return tr("quoteMessageTemplate",{
      name:state.customerName||"",
      occasion:occasionLabel(),
      price:"RM "+Number(state.quote?.selling_price||0).toFixed(0),
      date:state.deliveryDate,
      time:TIME_LABELS[state.deliveryTime]||state.deliveryTime
    });
  }

  async function copyMessage(message){
    try{
      await navigator.clipboard.writeText(message);
      toast(tr("copied"),{tone:"success"});
      vibrate(8);
    }catch{
      toast(tr("errorRequestFailed"),{tone:"danger"});
    }
  }

  async function sendMessage(message){
    const url="https://wa.me/?text="+encodeURIComponent(message);
    const opened=window.open(url,"_blank","noopener,noreferrer");
    if(!opened)location.href=url;
    state.sent=true;
    await clearOrderDraft();
    referenceFile=null;
    if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=""}
    toast(tr("orderDraftCleared"),{tone:"success"});
    vibrate(14);
    onSent?.();
    setTimeout(()=>onNavigate("today"),180);
  }

  function renderStep4(host){
    const card=element("section",{className:"wizard-card page-enter"});
    card.append(element("h2",{className:"card-title",text:tr("sendTitle")}),
      element("p",{className:"card-subtitle",text:tr("sendDesc")}));
    const summary=element("div",{className:"final-quote-summary"});
    summary.append(element("span",{text:tr("quotePriceLabel")}),
      element("strong",{text:"RM "+Number(state.quote?.selling_price||0).toFixed(0)}));
    card.append(summary);
    if(state.quote?.valid_until){
      card.append(element("div",{className:"valid-until",text:tr("quoteExpires",{time:formatKuchingDateTime(state.quote.valid_until,getLang())})}));
    }
    const msg=quoteMessage();
    const preview=element("div",{className:"message-preview"});
    preview.append(element("div",{className:"message-preview-title",text:tr("whatsappPreview")}),
      element("div",{className:"message-preview-body",text:msg}));
    card.append(preview);
    const notice=element("div",{className:"payment-notice"});
    notice.append(createIcon("shieldAlert",{size:20}),element("span",{text:tr("autoOrderNotice")}));
    card.append(notice);
    const actions=element("div",{className:"wizard-actions"});
    const copy=buttonWithIcon("copy",tr("copyMessage"),"btn btn-secondary btn-large");
    copy.addEventListener("click",()=>copyMessage(msg));
    const send=buttonWithIcon("messageCircle",tr("sendWhatsApp"),"btn btn-whatsapp btn-large");
    send.addEventListener("click",()=>sendMessage(msg));
    actions.append(copy,send);
    card.append(actions);
    host.append(card);
  }

  function render(){
    const host=root();
    if(!host)return;
    if(pollTimer){clearTimeout(pollTimer);pollTimer=null}
    clear(host);
    const shell=element("div",{className:"page-shell order-shell"});
    renderHeader(shell);
    if(state.step===1)renderStep1(shell);
    else if(state.step===2)renderStep2(shell);
    else if(state.step===3)renderStep3(shell);
    else renderStep4(shell);
    host.append(shell);
  }

  async function open({restart=false}={}){
    if(restart){
      state=fresh();
      referenceFile=null;
      await clearOrderDraft();
    }
    render();
    if(state.quoteRequestId&&state.step===3)checkQuoteStatus({silent:true});
  }

  function onLanguageChange(){render()}
  function destroy(){if(pollTimer)clearTimeout(pollTimer);if(previewUrl)URL.revokeObjectURL(previewUrl)}

  return {init,render,open,onLanguageChange,destroy,getState:()=>({...state})};
}
