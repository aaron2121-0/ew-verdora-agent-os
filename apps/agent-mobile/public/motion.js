const reduced=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
export function motionBudget(){
 const c=navigator.connection||navigator.mozConnection;
 const low=reduced()||!!c?.saveData||(navigator.hardwareConcurrency||8)<=4;
 document.documentElement.dataset.motion=low?"limited":"full";
 return {low,reduced:reduced()};
}
export function typeText(node,value,{duration=18,skip=false}={}){
 const text=String(value??"");node.textContent="";
 if(skip||reduced()||!text){node.textContent=text;return Promise.resolve()}
 let index=0,raf=0,stopped=false,last=0;
 const promise=new Promise(resolve=>{
  const tick=t=>{if(stopped){resolve();return}if(t-last>=duration){index=Math.min(text.length,index+Math.max(1,Math.ceil((t-last)/duration)));node.textContent=text.slice(0,index);last=t}
   if(index<text.length)raf=requestAnimationFrame(tick);else resolve()};
  raf=requestAnimationFrame(tick);
 });
 const finish=()=>{stopped=true;cancelAnimationFrame(raf);node.textContent=text};
 node.addEventListener("click",finish,{once:true});
 return promise.finally(()=>node.removeEventListener("click",finish));
}
export function flipReorder(container,mutate){
 if(!container){mutate();return}
 const before=new Map([...container.children].map(n=>[n,n.getBoundingClientRect()]));
 mutate();if(reduced())return;
 for(const n of container.children){
  const old=before.get(n);if(!old)continue;const after=n.getBoundingClientRect();
  const dx=old.left-after.left,dy=old.top-after.top;
  if(dx||dy)n.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:"translate(0,0)"}],{duration:320,easing:"cubic-bezier(.2,.8,.2,1)"});
 }
}
export function celebrate(node,label){
 if(!node)return;node.setAttribute("aria-label",label||"");
 if(!reduced())node.animate([{transform:"scale(.98)",opacity:.7},{transform:"scale(1.03)",opacity:1},{transform:"scale(1)"}],{duration:700,easing:"cubic-bezier(.2,.8,.2,1)"});
 if(/Android/i.test(navigator.userAgent)&&navigator.vibrate)navigator.vibrate(12);
}
export function initMotion(){motionBudget();matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change",motionBudget)}
