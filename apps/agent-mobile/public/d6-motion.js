// D6 live-data adapters. Vendor prototype defaults are intentionally never mounted.
import {vendorMotion,trackMotion,loadVendorMotion} from "./motion-vendor.js";
const isReduced=()=>Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
export function loadD6Css(name){
  if(!["coach","gallery","kyc"].includes(name))return;
  const href="/ew-verdora-content/motion/"+name+".css";
  if(document.querySelector('link[data-d6-css="'+name+'"]'))return;
  const link=document.createElement("link");
  link.rel="stylesheet";link.href=href;link.dataset.d6Css=name;
  document.head.append(link);
}
const loc=(lang,zh,en)=>lang==="zh"?"zh"===lang?zh:en:en;
function node(tag,content,cls){
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  el.textContent=String(content??"");
  return el;
}
export function mountD6TodayCoach({phase1={},getLang,onMessage,onOpenLead}={}){
  loadD6Css("coach");
  const rows=Array.isArray(phase1?.due_followups)?phase1.due_followups.filter(x=>x&&x.id):[];
  if(!rows.length)return null;
  const lang=getLang?.()==="zh"?"zh":"en";
  const priority=rows.slice().sort((a,b)=>{
    const t=x=>{const n=Date.parse(x.next_followup_at||"");return Number.isFinite(n)?n:Number.MAX_SAFE_INTEGER};
    return t(a)-t(b)||(Number(b.lead_score)||0)-(Number(a.lead_score)||0);
  }).slice(0,3);
  const shell=node("section","","vc-shell d6-coach-today");
  shell.setAttribute("aria-label",loc(lang,"今天先联系谁","Who to contact first"));
  shell.dataset.source="phase1-due-followups";
  shell.append(node("span",loc(lang,"真实待跟进客户","Due follow-ups"),"vc-eyebrow"),
               node("h2",loc(lang,"今天先联系谁","Who to contact first"),"vc-title"));
  const list=node("div","","vc-plan-list");
  for(const lead of priority){
    const item=node("article","","vc-item d6-coach-lead");
    const top=node("div","","vc-item-top");
    top.append(node("strong",lead.customer_label||loc(lang,"未命名客户","Unnamed customer")));
    if(lead.lead_score!=null&&Number.isFinite(Number(lead.lead_score)))
      top.append(node("small",loc(lang,"客户评分 ","Lead score ")+Math.round(Number(lead.lead_score)),"d6-coach-score"));
    item.append(top);
    const d=new Date(lead.next_followup_at||"");
    if(!Number.isNaN(d.getTime()))item.append(node("small",new Intl.DateTimeFormat(lang==="zh"?"zh-MY":"en-MY",{timeZone:"Asia/Kuching",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(d),"vc-sub"));
    const actions=node("div","","vc-acts");
    const ask=node("button",loc(lang,"AI 写下一句","AI: next message"),"btn btn-primary btn-small");
    ask.type="button";
    ask.addEventListener("click",async()=>{
      if(typeof onMessage!=="function")return;
      ask.disabled=true;
      try{await onMessage(lead,item)}finally{ask.disabled=false}
    });
    const open=node("button",loc(lang,"查看客户","View customer"),"btn btn-secondary btn-small");
    open.type="button";
    open.addEventListener("click",()=>onOpenLead?.(lead));
    actions.append(ask,open);item.append(actions);list.append(item);
  }
  shell.append(list);
  return shell;
}
export function styleD6AIMessage(card){card?.classList.add("d6-coach-live","vc-draft-card");void loadVendorMotion("coach").catch(()=>{});return card}
function photoUrl(value){
  if(typeof value!=="string"||!value.trim())return "";
  try{
    const u=new URL(value,window.location.origin);
    if(u.origin!==window.location.origin&&!(u.protocol==="https:"&&u.hostname.endsWith(".supabase.co")))return "";
    return u.href;
  }catch{return ""}
}
export function mountD6Gallery(items,{lang="en"}={}){
  const source=Array.isArray(items)?items:[];
  const records=source.filter(x=>x&&(x.approved===true||x.is_approved===true||["approved","published"].includes(String(x.status||"").toLowerCase())))
    .map(x=>({...x,d6Photo:photoUrl(x.approved_photo_url||x.photo_url||x.image_url||x.imageUrl||"")})).filter(x=>x.d6Photo);
  if(!records.length)return null; // Never show demo images or unapproved work.
  loadD6Css("gallery");
  const section=node("section","","d6-gallery-real");
  section.append(node("h2",loc(lang,"作品图库","Approved portfolio"),"section-title"));
  const host=node("div","");section.append(host);
  const iconsBase="/ew-verdora-content/motion/icons";
  const svg='<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 6v36M6 24h36" stroke="currentColor" stroke-width="2"/></svg>';
  const data=records.map((x,i)=>({
    id:String(x.id||"portfolio-"+i).replace(/[^a-z0-9_-]/gi,""),line:"bouquet",icon:"bouquet.svg",
    kicker:String(x.category||"EW VERDORA"),
    title_zh:String(x.title_zh||x.title||x.name||""),
    title_en:String(x.title_en||x.title||x.name||""),
    subtitle_zh:String(x.caption_zh||x.caption||""),
    subtitle_en:String(x.caption_en||x.caption||"")
  }));
  void loadVendorMotion("gallery").then(vm=>{
    if(!section.isConnected)return;
    const instance=vm.mountGallery(host,data,{lang,autoplayMs:0,iconsBase,svgCache:{[iconsBase+"/bouquet.svg"]:svg}});
  host.querySelectorAll(".vd-gallery-slide").forEach((slide,i)=>{
    const placeholder=slide.querySelector(".vd-gallery-placeholder");
    if(!placeholder)return;
    const img=document.createElement("img");
    img.src=records[i].d6Photo;img.alt=String(records[i].title_en||records[i].title||"EW VERDORA portfolio");
    img.loading=i===0?"eager":"lazy";img.decoding="async";img.className="d6-gallery-photo";
    placeholder.prepend(img);
  });
  host.querySelector("[d-zm]")?.remove(); // Vendor's zoom still displays a demo placeholder.
    trackMotion("d6-approved-gallery",instance);
  }).catch(()=>section.remove());
  return section;
}
export function decorateD6KycCard(card){loadD6Css("kyc");card?.classList.add("vk-card","d6-kyc-card");return card}
export function decorateD6KycStep(host,step,lang="en"){
  if(!host)return;
  loadD6Css("kyc");
  void Promise.all([loadVendorMotion("feedback"),loadVendorMotion("kyc")]).catch(()=>{});
  // Real consent/details/photo/submit steps differ from the vendor's 3-step demo.
  const bar=node("div","","vk-stp d6-kyc-steps");
  bar.setAttribute("aria-label",loc(lang,"身份验证进度","Identity verification progress"));
  for(let i=1;i<=4;i++){
    const item=node("span","","vk-step"+(i===step?" is-active":i<step?" is-done":""));
    if(i===step)item.setAttribute("aria-current","step");
    item.append(node("span",String(i),"vk-dot"));bar.append(item);
  }
  host.prepend(bar);
}
export function triggerD6Celebration(type="course",originEl){
  if(isReduced())return false;
  void loadVendorMotion("celebrate").then(vm=>vm?.celebrate?.({type:type==="sale"?"exam":"course",originEl:originEl||document.body})).catch(()=>{});
  return true;
}
// D2 can use this only with approved photo records; no prototype data fallback.
window.EWVerdoraMotionD6={mountApprovedGallery:mountD6Gallery};
