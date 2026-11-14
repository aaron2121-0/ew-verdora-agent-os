import {element} from "./components.js";
import {createIcon} from "./icons.js";

// Installation is optional. This guide never reads/saves a user profile.
const KEY="ew-agent-home-guide-dismissed";
const mobile=/android|iphone|ipad|ipod/i.test(navigator.userAgent||"");
const ios=/iphone|ipad|ipod/i.test(navigator.userAgent||"");
const standalone=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
let installPrompt=null;
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();installPrompt=event});
function readDismissed(){try{return localStorage.getItem(KEY)==="1"}catch{return false}}
function markDismissed(){try{localStorage.setItem(KEY,"1")}catch{}}
async function setup(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("/service-worker.js",{scope:"/"}).catch(()=>{});
  }
  if(!mobile||standalone||readDismissed())return;
  const card=element("aside",{className:"pwa-install-guide",attrs:{"aria-label":"加到手机主屏幕 / Add to Home Screen"}});
  const heading=element("strong",{text:"把 EW VERDORA 放到手机首页"});
  const desc=element("p",{text:ios
    ?"iPhone：用 Safari 打开，按「分享」→「加入主屏幕」。 / In Safari, tap Share, then Add to Home Screen."
    :"Android：在 Chrome 按「⋮」→「加到主屏幕」。 / Chrome menu → Add to Home Screen."});
  const buttons=element("div",{className:"pwa-install-actions"});
  const okay=element("button",{className:"btn btn-primary",text:ios?"知道了 / Got it":"安装到主屏幕 / Add to Home Screen",attrs:{type:"button"}});
  const close=element("button",{className:"btn btn-secondary",text:"不再提醒 / Don't show again",attrs:{type:"button"}});
  const dismiss=()=>{markDismissed();card.remove()};
  okay.addEventListener("click",async()=>{
    if(installPrompt){
      try{await installPrompt.prompt();await installPrompt.userChoice}catch{}
      installPrompt=null;
    }
    dismiss();
  });
  close.addEventListener("click",dismiss);
  const icon=element("span",{className:"pwa-install-icon"});icon.append(createIcon("house",{size:22}));
  heading.prepend(icon);buttons.append(okay,close);card.append(heading,desc,buttons);
  document.body.append(card);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});
else setup();
