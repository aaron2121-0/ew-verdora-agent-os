import {createIcon} from "./icons.js";

export function escapeHtml(value){
  return String(value??"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

export function safeText(node,value){
  if(node)node.textContent=String(value??"");
  return node;
}

export function clear(node){
  while(node?.firstChild)node.removeChild(node.firstChild);
  return node;
}

export function element(tag,{className="",text="",attrs={},dataset={}}={}){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined&&text!==null)node.textContent=String(text);
  for(const [k,v] of Object.entries(attrs)){
    if(v===false||v===null||v===undefined)continue;
    if(k==="disabled")node.disabled=Boolean(v);
    else node.setAttribute(k,String(v));
  }
  for(const [k,v] of Object.entries(dataset)){
    if(v!==undefined&&v!==null)node.dataset[k]=String(v);
  }
  return node;
}

export function iconLabel(name,label,{size=20,className=""}={}){
  const wrap=element("span",{className:"row"});
  wrap.append(createIcon(name,{size,className}),element("span",{text:label}));
  return wrap;
}

export function setButtonLoading(button,loading,label){
  if(!button)return;
  button.disabled=Boolean(loading);
  button.classList.toggle("is-loading",Boolean(loading));
  if(label!==undefined){
    const labelNode=button.querySelector(":scope > span:last-child");
    if(labelNode)labelNode.textContent=String(label);
    else button.textContent=String(label);
  }
}

export function badge(text,tone="default"){
  const node=element("span",{className:"badge",text});
  if(tone!=="default")node.classList.add("badge-"+tone);
  return node;
}

export function progress(value,{label=null}={}){
  const wrap=element("div");
  if(label)wrap.append(element("div",{className:"muted",text:label}));
  const track=element("div",{className:"progress",attrs:{role:"progressbar","aria-valuemin":"0","aria-valuemax":"100","aria-valuenow":Math.round(Math.max(0,Math.min(1,Number(value)||0))*100)}});
  const fill=element("div",{className:"progress-fill"});
  fill.style.setProperty("--progress",String(Math.max(0,Math.min(1,Number(value)||0))));
  track.append(fill);
  wrap.append(track);
  return wrap;
}

export function stepper(total,current){
  const wrap=element("div",{className:"stepper",attrs:{"aria-label":`Step ${current} of ${total}`}});
  for(let i=1;i<=total;i++){
    const dot=element("span",{className:"stepper-dot"+(i<=current?" active":"")});
    wrap.append(dot);
    if(i<total)wrap.append(element("span",{className:"stepper-line"}));
  }
  return wrap;
}

export function skeleton({lines=3,card=false}={}){
  const wrap=element("div",{className:card?"skeleton skeleton-card":""});
  if(card)return wrap;
  for(let i=0;i<lines;i++)wrap.append(element("div",{className:"skeleton skeleton-line"+(i===lines-1?" short":"")}));
  return wrap;
}

export function emptyState({icon="circleHelp",title="",message=""}={}){
  const wrap=element("div",{className:"empty-state"});
  wrap.append(createIcon(icon,{size:24}));
  if(title)wrap.append(element("strong",{text:title}));
  if(message)wrap.append(element("div",{className:"muted",text:message}));
  return wrap;
}

export function countTo(node,to,{duration=600,formatter=(v)=>String(Math.round(v))}={}){
  if(!node)return;
  const target=Number(to)||0;
  const reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if(reduce||duration<=0){node.textContent=formatter(target);return}
  const start=performance.now();
  const from=Number(node.dataset.value||0)||0;
  node.dataset.value=String(target);
  function frame(now){
    const p=Math.min(1,(now-start)/duration);
    const eased=1-Math.pow(1-p,3);
    node.textContent=formatter(from+(target-from)*eased);
    if(p<1)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function vibrate(pattern=12){
  try{if(typeof navigator.vibrate==="function")navigator.vibrate(pattern)}catch{}
}

export function stagger(nodes,{step=35,max=8}={}){
  const reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  [...nodes].forEach((node,i)=>{
    if(reduce||i>=max)return;
    node.animate(
      [{opacity:0,transform:"translateY(7px)"},{opacity:1,transform:"translateY(0)"}],
      {duration:220,delay:i*step,easing:"cubic-bezier(.2,.8,.2,1)",fill:"both"}
    );
  });
}

export function toast(message,{actionLabel=null,onAction=null,duration=3000,tone="default"}={}){
  const region=document.getElementById("toastRegion");
  if(!region)return;
  const node=element("div",{className:"toast",attrs:{role:"status"}});
  const msg=element("span",{text:message});
  node.append(msg);
  if(tone!=="default")node.dataset.tone=tone;
  if(actionLabel&&typeof onAction==="function"){
    const action=element("button",{className:"btn btn-text btn-small",text:actionLabel,attrs:{type:"button"}});
    action.addEventListener("click",async()=>{
      action.disabled=true;
      try{await onAction()}finally{remove()}
    });
    node.append(action);
  }
  let startX=null,currentX=0;
  node.addEventListener("pointerdown",e=>{startX=e.clientX;node.setPointerCapture?.(e.pointerId)});
  node.addEventListener("pointermove",e=>{
    if(startX===null)return;
    currentX=e.clientX-startX;
    node.style.transform=`translateX(${currentX}px)`;
    node.style.opacity=String(Math.max(.3,1-Math.abs(currentX)/240));
  });
  node.addEventListener("pointerup",()=>{
    if(Math.abs(currentX)>90)remove();
    else{node.style.transform="";node.style.opacity=""}
    startX=null;currentX=0;
  });
  function remove(){
    if(!node.isConnected)return;
    node.classList.add("is-leaving");
    setTimeout(()=>node.remove(),220);
  }
  region.append(node);
  const timer=setTimeout(remove,duration);
  node.addEventListener("pointerdown",()=>clearTimeout(timer),{once:true});
  return {remove};
}

export function confirmDialog({title,message,confirmLabel,cancelLabel}){
  const layer=document.getElementById("confirmDialog");
  const titleNode=document.getElementById("confirmTitle");
  const msgNode=document.getElementById("confirmMessage");
  const cancel=document.getElementById("confirmCancel");
  const ok=document.getElementById("confirmOk");
  if(!layer||!titleNode||!msgNode||!cancel||!ok)return Promise.resolve(false);
  titleNode.textContent=title;
  msgNode.textContent=message;
  cancel.textContent=cancelLabel;
  ok.textContent=confirmLabel;
  layer.classList.remove("hidden");
  ok.focus();
  return new Promise(resolve=>{
    const finish=value=>{
      layer.classList.add("hidden");
      cancel.removeEventListener("click",onCancel);
      ok.removeEventListener("click",onOk);
      layer.removeEventListener("click",onLayer);
      resolve(value);
    };
    const onCancel=()=>finish(false);
    const onOk=()=>finish(true);
    const onLayer=e=>{if(e.target===layer)finish(false)};
    cancel.addEventListener("click",onCancel);
    ok.addEventListener("click",onOk);
    layer.addEventListener("click",onLayer);
  });
}

export function setupBottomSheet(sheet,{onClose=null}={}){
  if(!sheet)return;
  const body=sheet.querySelector(".sheet-body");
  if(!body)return;
  let startY=null,dy=0;
  const close=()=>{
    body.animate([{opacity:1,transform:"translateY(0)"},{opacity:.6,transform:"translateY(28px)"}],{duration:180,easing:"cubic-bezier(.4,0,1,1)"});
    setTimeout(()=>{sheet.classList.add("hidden");body.style.transform="";body.style.opacity="";onClose?.()},170);
  };
  sheet.addEventListener("click",e=>{if(e.target===sheet)close()});
  body.addEventListener("pointerdown",e=>{
    if(e.target instanceof Element && e.target.closest("button,a,input,select,textarea"))return;
    if(body.scrollTop>0||e.clientY>body.getBoundingClientRect().top+72)return;
    startY=e.clientY;dy=0;body.setPointerCapture?.(e.pointerId);
  });
  body.addEventListener("pointermove",e=>{
    if(startY===null)return;
    dy=Math.max(0,e.clientY-startY);
    body.style.transform=`translateY(${dy}px)`;
    sheet.style.background=`rgba(13,30,25,${Math.max(.08,.38-dy/700)})`;
  });
  body.addEventListener("pointerup",()=>{
    if(startY===null)return;
    if(dy>90)close();
    else{
      body.style.transform="";
      sheet.style.background="";
    }
    startY=null;dy=0;
  });
  return {close};
}

export function safeHttpsUrl(value,{allowedHosts=null}={}){
  try{
    const u=new URL(String(value));
    if(u.protocol!=="https:")return null;
    if(Array.isArray(allowedHosts)&&allowedHosts.length&&!allowedHosts.some(h=>u.hostname===h||u.hostname.endsWith("."+h)))return null;
    return u.href;
  }catch{return null}
}
