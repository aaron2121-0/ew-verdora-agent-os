// Approved vendor runtime: no ai-demos, no demo business copy.
import "./ew-verdora-content/motion/i18n.js";
import "./ew-verdora-content/motion/home-today.js";
import "./ew-verdora-content/motion/cards.js";
import "./ew-verdora-content/motion/ai-orb.js";
const instances=new Map();
export const vendorMotion=()=>window.VerdoraMotion||null;
export function trackMotion(name,instance){if(instance&&typeof instance.setLang==="function")instances.set(name,instance);else instances.delete(name);return instance}
export function removeMotion(name){instances.delete(name)}
export function clearMotion(){instances.clear()}
export function setMotionLanguage(lang){for(const instance of instances.values())instance?.setLang?.(lang==="zh"?"zh":"en")}
export function applyReviewedMotionCopy(ui){
 const v=vendorMotion(),hint=ui?.coach_marks?.find(x=>x?.code==="CM-HOME-1");
 if(!v?.i18n)return;
 for(const lang of ["en","zh"]){
  const words=v.i18n[lang];if(!words)continue;
  words.homeTitle=lang==="zh"?"今天赚钱 3 件事":"3 Money-Making Actions Today";
  words.homeEyebrow=String(hint?.["target_"+lang]||"");
  words.homeSubtitle=String(hint?.["tip_"+lang]||"");
  words.homeStart=lang==="zh"?"标记完成":"Mark complete";
  words.homeDone=lang==="zh"?"已完成 · 撤销":"Completed · Undo";
  words.homeAllDoneBanner=lang==="zh"?"今天 3 件事已全部完成":"All 3 actions completed";
  words.homeReset=lang==="zh"?"重置今日完成状态":"Reset today's checks";
 }
}
// Heavy visual modules load only when their screen needs them.
const lazyMotion={
  celebrate:()=>import("./ew-verdora-content/motion/celebrate.js"),
  transitions:()=>import("./ew-verdora-content/motion/transitions.js"),
  feedback:()=>import("./ew-verdora-content/motion/feedback.js")
};
const lazyPromises=new Map();
export function loadVendorMotion(name){
  if(!Object.hasOwn(lazyMotion,name))return Promise.reject(new Error("invalid_motion_module"));
  if(!lazyPromises.has(name)){
    const pending=lazyMotion[name]().then(()=>vendorMotion()).catch(error=>{lazyPromises.delete(name);throw error});
    lazyPromises.set(name,pending);
  }
  return lazyPromises.get(name);
}
