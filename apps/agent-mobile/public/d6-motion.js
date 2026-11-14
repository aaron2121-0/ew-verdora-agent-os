// D6 live-data adapters. Vendor prototype defaults are intentionally never mounted.
import {vendorMotion,trackMotion,loadVendorMotion} from "./motion-vendor.js";
const isReduced=()=>Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
export function loadD6Css(name){
  if(!["coach","gallery","kyc","feedback","celebrate","transitions","d6"].includes(name))return;
  const href=name==="d6"?"/d6-motion.css":"/ew-verdora-content/motion/"+name+".css";
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
  loadD6Css("d6");
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
export function styleD6AIMessage(card){card?.classList.add("d6-coach-live","vc-draft-card");return card}
// Signed URLs originate only from authenticated D2 portfolio_list.
function photoUrl(value){
  if(typeof value!=="string"||!value.trim())return "";
  try{
    const url=new URL(value);
    if(url.protocol!=="https:"||!url.hostname.endsWith(".supabase.co"))return "";
    if(!url.pathname.startsWith("/storage/v1/object/sign/portfolio/"))return "";
    if(!url.searchParams.has("token"))return "";
    return url.href;
  }catch{return ""}
}
// D2's {photos} are already filtered to status="approved" on the server.
const portfolioRows=response=>Array.isArray(response?.photos)?response.photos:[];
export function mountD6Gallery(items,{lang="en"}={}){
  const rows=portfolioRows(items);
  const records=rows.filter(x=>x&&typeof x==="object")
    .map(x=>({
      id:String(x.id||""),
      product_line:String(x.product_line||""),
      caption_zh:String(x.caption_zh||""),
      caption_en:String(x.caption_en||""),
      d6Photo:photoUrl(x.image_url)
    })).filter(x=>x.d6Photo);
  const section=node("section","","d6-gallery-real");
  section.append(node("h2",lang==="zh"?"作品图库":"Portfolio","section-title"));
  if(!records.length){
    section.append(node("p",lang==="zh"?"还没有作品照片，老板上传后就会出现在这里":"No portfolio photos yet. Photos will appear here after the owner uploads them.","d6-gallery-empty"));
    return section;
  }
  loadD6Css("gallery");
  const slides=node("div","","d6-gallery-track");
  slides.setAttribute("aria-label",lang==="zh"?"已核准作品照片":"Approved portfolio photos");
  slides.setAttribute("role","region");
  slides.setAttribute("aria-roledescription","carousel");
  const cards=[];
  let index=0;
  let lightbox=null;
  const label=x=>String((lang==="zh"?x.caption_zh:x.caption_en)||x.caption_zh||x.caption_en||"");
  const line=x=>String(x.product_line||"").replace(/_/g," ");
  const closeLightbox=()=>{if(!lightbox)return;document.removeEventListener("keydown",onKey);lightbox.remove();lightbox=null;};
  const onKey=e=>{if(e.key==="Escape")closeLightbox();};
  const openLightbox=x=>{
    closeLightbox();
    lightbox=node("div","","d6-photo-dialog");
    lightbox.setAttribute("role","dialog");lightbox.setAttribute("aria-modal","true");
    lightbox.setAttribute("aria-label",label(x)||line(x)||"Portfolio photo");
    const panel=node("div","","d6-photo-dialog-panel");
    const close=node("button",lang==="zh"?"关闭":"Close","d6-photo-close");
    close.type="button";close.setAttribute("aria-label",lang==="zh"?"关闭照片":"Close photo");
    close.addEventListener("click",closeLightbox);
    const img=document.createElement("img");img.src=x.d6Photo;img.alt=label(x)||line(x)||"Portfolio photo";img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";
    panel.append(close,img,node("p",label(x),"d6-photo-caption"));
    lightbox.append(panel);lightbox.addEventListener("click",e=>{if(e.target===lightbox)closeLightbox();});
    document.body.append(lightbox);document.addEventListener("keydown",onKey);close.focus();
  };
  records.forEach((x,i)=>{
    const card=node("button","","d6-gallery-card");
    card.type="button";card.setAttribute("aria-label",(lang==="zh"?"查看照片 ":"View photo ")+(i+1)+": "+(label(x)||line(x)));
    const img=document.createElement("img");img.src=x.d6Photo;img.alt=label(x)||line(x)||"EW VERDORA portfolio";img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";
    card.append(img,node("span",line(x),"d6-gallery-line"),node("span",label(x),"d6-gallery-caption"));
    card.addEventListener("click",()=>openLightbox(x));slides.append(card);cards.push(card);
  });
  const nav=node("div","","d6-gallery-nav");
  const prev=node("button","‹","d6-gallery-arrow"),next=node("button","›","d6-gallery-arrow");
  [prev,next].forEach((b,i)=>{b.type="button";b.setAttribute("aria-label",i?(lang==="zh"?"下一张":"Next photo"):(lang==="zh"?"上一张":"Previous photo"));});
  const count=node("span","","d6-gallery-count");
  const show=i=>{index=(i+cards.length)%cards.length;count.textContent=(index+1)+" / "+cards.length;cards[index].scrollIntoView({behavior:isReduced()?"instant":"smooth",block:"nearest",inline:"center"});};
  prev.addEventListener("click",()=>show(index-1));next.addEventListener("click",()=>show(index+1));
  nav.append(prev,count,next);section.append(slides,nav);count.textContent="1 / "+cards.length;
  return section;
}
export function decorateD6KycCard(card){loadD6Css("d6");loadD6Css("kyc");card?.classList.add("vk-card","d6-kyc-card");return card}
export function decorateD6KycStep(host,step,lang="en"){
  if(!host)return;
  loadD6Css("d6");
  loadD6Css("kyc");
  loadD6Css("feedback");
  void loadVendorMotion("feedback").catch(()=>{}); // Never load simulated KYC UI.
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
  loadD6Css("celebrate");
  void loadVendorMotion("celebrate").then(vm=>vm?.celebrate?.({type:type==="sale"?"exam":"course",originEl:originEl||document.body})).catch(()=>{});
  return true;
}
// D2's authenticated API is the only entrypoint for approved photos.
