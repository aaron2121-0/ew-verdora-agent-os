// Keep the floral mark in a bounded image paint layer. In particular, do not
// animate SVG <use>, filters or overflow-visible paths over the application.
// This is a defensive Safari renderer; it does not establish the incident's cause.
export function mountSafeAIOrb(host,{lang="zh",size=52,state="idle"}={}){
  const el=document.createElement("span");
  el.className="vd-orb-wrap ai-orb-safe";
  el.style.setProperty("--orb-size",Math.min(58,Math.max(24,Number(size)||52))+"px");
  el.setAttribute("aria-hidden","true");
  const image=document.createElement("img");
  image.className="ai-orb-mark";image.src="/icons/brand-192.png";
  image.alt="";image.width=52;image.height=52;image.decoding="async";
  // The button's original core remains available if the static mark fails.
  image.addEventListener("error",()=>el.remove(),{once:true});
  el.append(image);host.append(el);
  const setState=value=>{el.dataset.state=["thinking","replying"].includes(value)?value:"idle"};
  setState(state);
  return {el,setState,setLang(value){lang=value},destroy(){el.remove()}};
}
