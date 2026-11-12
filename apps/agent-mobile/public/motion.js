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
 // Segment by displayed grapheme, not UTF-16 code units: names and emoji stay intact.
 const units=typeof Intl.Segmenter==="function"
  ?[...new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(text)].map(part=>part.segment)
  :Array.from(text);
 let index=0,raf=0,last=0,settled=false,resolvePromise;
 const promise=new Promise(resolve=>{resolvePromise=resolve});
 const complete=()=>{
  if(settled)return;settled=true;cancelAnimationFrame(raf);
  node.textContent=text;node.removeEventListener("click",complete);resolvePromise();
 };
 const tick=t=>{
  if(settled)return;
  if(!last)last=t;
  if(t-last>=duration){
   index=Math.min(units.length,index+Math.max(1,Math.floor((t-last)/duration)));
   node.textContent=units.slice(0,index).join("");last=t;
  }
  if(index<units.length)raf=requestAnimationFrame(tick);
  else complete();
 };
 node.addEventListener("click",complete,{once:true});
 raf=requestAnimationFrame(tick);
 return promise;
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
