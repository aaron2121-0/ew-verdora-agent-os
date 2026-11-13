import {element,clear,toast,stagger} from "./components.js";
import {createIcon} from "./icons.js";
import {celebrate} from "./motion.js";
import {REQUIRED_COURSE_CODES} from "./unlock.js";

export const HANDBOOK_LINES=Object.freeze([
  {id:"condolence",en:"Condolence Wreaths",zh:"慰问花圈",icon:"flower2"},
  {id:"opening",en:"Opening Flowers",zh:"开张花礼",icon:"sparkles"},
  {id:"bouquet",en:"Bouquets",zh:"花束",icon:"flower2"},
  {id:"wedding_event",en:"Weddings & Events",zh:"婚礼与活动花艺",icon:"calendarDays"},
  {id:"wholesale",en:"Flower Wholesale",zh:"鲜切花批发",icon:"users"}
]);
const DEFAULT_SECTIONS=Object.freeze({
  "CORE-BRAND":"bouquet","LEAD-FINDING":"wholesale","QUALIFY":"opening",
  "REFERENCE":"wedding_event","OBJECTION":"condolence","CLOSING":"bouquet","PAYMENT":"wholesale"
});
const t=(getLang,en,zh)=>getLang()==="zh"?zh:en;
const lineById=id=>HANDBOOK_LINES.find(x=>x.id===id);
const reduce=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
function safeStore(key,value){
  try{if(value===undefined)return localStorage.getItem(key);localStorage.setItem(key,value)}catch{}
  return null;
}
function btn(label,fn,cls="btn btn-primary"){
  const b=element("button",{className:cls,text:label,attrs:{type:"button"}});
  b.addEventListener("click",fn);return b;
}
function isReadOnlyRow(row){
  return row&&row.active===true&&row.visible_to_agent===true&&row.needs_owner_confirm===false;
}
function rowLine(row){
  const direct=String(row?.product_line||row?.handbook_section||"").toLowerCase();
  if(lineById(direct))return direct;
  const header=String(row?.title_en||"")+" "+String(row?.title_zh||"");
  const m=header.match(/^\s*(condolence|opening|bouquet|wedding_event|wholesale)\s*[:：|\-]/i);
  return m?m[1].toLowerCase():null;
}
function cardsFromBody(value){
  if(Array.isArray(value))return value.map(String);
  if(value&&typeof value==="object"&&Array.isArray(value.cards))return value.cards.map(String);
  if(typeof value!=="string")return [];
  try{const p=JSON.parse(value);if(Array.isArray(p))return p.map(String);if(p&&Array.isArray(p.cards))return p.cards.map(String)}catch{}
  return value.trim()?[value.trim()]:[];
}
function iconAsset(line){
  const outer=element("span",{className:"handbook-line-icon"});
  const fallback=createIcon(line.icon,{size:28});
  outer.append(fallback);
  const asset=element("img",{attrs:{
    src:"/ew-verdora-content/motion/icons/"+line.id+".svg",
    alt:"",loading:"lazy",decoding:"async"
  }});
  asset.addEventListener("load",()=>{fallback.classList.add("hidden");asset.classList.add("is-ready")});
  asset.addEventListener("error",()=>asset.remove(),{once:true});
  outer.append(asset);
  return outer;
}
function simpleModal(className){
  const backdrop=element("div",{className:"handbook-overlay "+className,attrs:{role:"dialog","aria-modal":"true",tabindex:"-1"}});
  document.body.append(backdrop);backdrop.focus();
  const close=()=>{backdrop.remove();document.removeEventListener("keydown",onKey)};
  const onKey=e=>{if(e.key==="Escape")close()};
  backdrop.addEventListener("click",e=>{if(e.target===backdrop)close()});
  document.addEventListener("keydown",onKey);
  return {backdrop,close};
}

export function createHandbookExperience({getData,getLang,getUserId,api,onRefresh,onNavigate,onJourneyChange}){
  let handbookData=null,fetching=null,currentLine=null,currentCourse=null,slideIndex=0;
  let slideTimer=null,slideToken=0;
  const readStates=new Map(),readRequests=new Map();
  const userKey=()=>String(getUserId()||"unknown");
  const clearSlideTimer=()=>{slideToken++;if(slideTimer!==null){clearTimeout(slideTimer);slideTimer=null}};
  const readStatus=code=>readStates.get(code)||null;
  async function syncReadState(code){
    if(readRequests.has(code))return readRequests.get(code);
    const promise=api.training({action:"module_read",module_code:code,card_codes:[]})
      .then(r=>{readStates.set(code,r);onJourneyChange?.();return r})
      .catch(()=>{const cached=readStates.get(code);if(!cached)readStates.set(code,{required_card_codes:[],read_card_codes:[],ready_for_quiz:false,unavailable:true});return readStates.get(code)})
      .finally(()=>readRequests.delete(code));
    readRequests.set(code,promise);return promise;
  }
  function hydrateJourney(){
    const next=firstOpenCode();
    if(next&&!readStates.has(next)&&!readRequests.has(next))void syncReadState(next);
  }
  const seenKey=page=>"ew_page_tip_v1_"+userKey()+"_"+page;

  function sectionForCourse(code){
    const row=(getData()?.training||[]).find(x=>x.training_modules?.code===code);
    const section=row?.training_modules?.handbook_section;
    return lineById(section)?section:DEFAULT_SECTIONS[code];
  }
  function courseRow(code){return (getData()?.training||[]).find(x=>x.training_modules?.code===code)}
  function firstOpenCode(){
    return REQUIRED_COURSE_CODES.find(code=>courseRow(code)?.status!=="passed");
  }
  function courseLabel(code){
    const row=courseRow(code)?.training_modules;
    return getLang()==="zh"?(row?.title_zh||code):(row?.title_en||code);
  }
  function moduleState(){
    const next=firstOpenCode(),done=REQUIRED_COURSE_CODES.filter(c=>courseRow(c)?.status==="passed").length;
    return {next,done,total:REQUIRED_COURSE_CODES.length};
  }
  async function load(){
    if(handbookData)return handbookData;
    if(fetching)return fetching;
    fetching=api.agent({action:"handbook"}).then(r=>{
      handbookData={knowledge:(r.knowledge||[]).filter(isReadOnlyRow),photos:(r.photos||[]).filter(p=>p.status==="approved"&&lineById(p.product_line))};
      return handbookData;
    }).catch(()=>{
      handbookData={knowledge:[],photos:[]};
      return handbookData;
    }).finally(()=>{fetching=null});
    return fetching;
  }
  function rows(line,section){
    return (handbookData?.knowledge||[]).filter(x=>rowLine(x)===line&&x.section===section).sort((a,b)=>Number(a.sort||0)-Number(b.sort||0));
  }
  function content(row){
    return getLang()==="zh"?(row?.body_zh||row?.body_en||""):(row?.body_en||row?.body_zh||"");
  }
  function title(row){
    return getLang()==="zh"?(row?.title_zh||row?.title_en||""):(row?.title_en||row?.title_zh||"");
  }
  function approvedSlides(line){
    return rows(line,"product_line")
      .filter(x=>x.kind==="card"&&typeof x.code==="string"&&x.code.length>0)
      .slice(0,4).map(x=>({
        code:x.code,title:title(x),body:content(x),
        points:(getLang()==="zh"?x.key_points_zh:x.key_points_en)||[]
      }));
  }
  function handbookCard(line){
    const card=element("button",{className:"handbook-line-card",attrs:{type:"button","data-handbook-line":line.id}});
    card.append(iconAsset(line),element("strong",{text:getLang()==="zh"?line.zh:line.en}),
      element("span",{text:t(getLang,"Open the approved handbook","查看已核准手册")}));
    card.addEventListener("click",()=>{currentCourse=null;currentLine=line.id;slideIndex=0;renderPage()});
    return card;
  }
  function renderPage(){
    const host=document.getElementById("handbookPage");if(!host)return;
    clearSlideTimer();
    clear(host);
    if(!handbookData){host.append(element("p",{text:t(getLang,"Loading approved handbook…","正在载入核准手册…")}));return}
    const page=element("div",{className:"page-shell handbook-shell"});
    const head=element("div",{className:"handbook-head"});
    if(currentCourse)head.append(btn(t(getLang,"Back to required courses","返回必修课"),()=>{currentCourse=null;currentLine=null;clearSlideTimer();onNavigate("training")},"btn btn-text btn-small"));
    else if(currentLine)head.append(btn(t(getLang,"All product lines","全部业务线"),()=>{currentLine=null;clearSlideTimer();renderPage()},"btn btn-text btn-small"));
    else head.append(btn(t(getLang,"Back to home","返回首页"),()=>onNavigate("today"),"btn btn-text btn-small"));
    head.append(element("h1",{className:"screen-title",text:currentCourse?courseLabel(currentCourse):currentLine?(getLang()==="zh"?lineById(currentLine)?.zh:lineById(currentLine)?.en):t(getLang,"Product handbook","产品手册")}));
    if(currentCourse)head.append(element("p",{className:"screen-subtitle",text:t(getLang,"Read every card for at least 4 seconds, then take the course quiz.","每张卡至少阅读 4 秒，全部完成后才可参加课程测验。")}));
    page.append(head);
    if(!currentLine){
      page.append(element("p",{className:"screen-subtitle",text:t(getLang,"Only Owner-approved material is shown.","仅显示 Owner 已核准的资料。")}));
      const grid=element("div",{className:"handbook-line-grid"});
      HANDBOOK_LINES.forEach(x=>grid.append(handbookCard(x)));page.append(grid);
      host.append(page);stagger(grid.children);return;
    }
    const line=currentLine;
    const slides=approvedSlides(line);
    const course=currentCourse;
    const panel=element("section",{className:"handbook-slides",attrs:{"aria-label":t(getLang,"Getting started cards","上手卡")}});
    const body=element("div",{className:"handbook-slide-body"});
    const progress=element("p",{className:"handbook-read-status",attrs:{"role":"status","aria-live":"polite"}});
    const action=element("div",{className:"handbook-lesson-action"});
    const prev=btn("‹",()=>move(-1),"btn btn-secondary btn-small");
    const next=btn("›",()=>move(1),"btn btn-secondary btn-small");
    prev.setAttribute("aria-label",t(getLang,"Previous card","上一张"));
    next.setAttribute("aria-label",t(getLang,"Next card","下一张"));

    function move(direction){
      if(direction>0&&next.disabled)return;
      if(direction<0&&prev.disabled)return;
      slideIndex=Math.max(0,Math.min(slides.length-1,slideIndex+direction));
      draw();
    }
    function draw(){
      clearSlideTimer();
      body.replaceChildren();action.replaceChildren();
      if(!slides.length){
        body.append(element("p",{text:t(getLang,"The four starter cards are awaiting Owner approval.","四张上手卡正在等待 Owner 核准。")}));
        progress.textContent=t(getLang,"Quiz unavailable until handbook approval.","手册核准前暂不开放小测验。");
        prev.disabled=true;next.disabled=true;return;
      }
      const current=slides[slideIndex];
      body.append(element("span",{className:"handbook-count",text:(slideIndex+1)+" / "+slides.length}),
        element("h2",{text:current.title}),element("p",{text:current.body}));
      if(Array.isArray(current.points)&&current.points.length){
        const ul=element("ul",{className:"handbook-key-points"});
        current.points.forEach(point=>ul.append(element("li",{text:String(point)})));
        body.append(ul);
      }
      prev.disabled=slideIndex===0;
      const state=course?readStatus(course):null;
      const expected=state?.required_card_codes||[];
      const read=new Set(state?.read_card_codes||[]);
      const validCards=expected.length===slides.length&&slides.every(x=>expected.includes(x.code));
      const isRead=read.has(current.code);
      const complete=Boolean(course&&validCards&&state?.ready_for_quiz&&slides.every(x=>read.has(x.code)));
      next.disabled=slideIndex===slides.length-1||(!!course&&!isRead);
      if(!course){progress.textContent="";return}
      if(courseRow(course)?.status==="passed"){
        progress.textContent=t(getLang,"Course passed — review cards anytime.","课程已通过，可随时复习。");
        next.disabled=slideIndex===slides.length-1;return;
      }
      if(!validCards){
        progress.textContent=t(getLang,"Waiting for approved course cards and reading status.","正在等待核准的课程卡片与阅读记录。");
        next.disabled=true;return;
      }
      if(isRead)progress.textContent=t(getLang,"Card saved to your learning progress.","本张卡片已保存至服务器阅读记录。");
      else{
        progress.textContent=t(getLang,"Reading this card · 4 seconds","正在阅读本张卡 · 4 秒");
        const token=slideToken,atIndex=slideIndex;
        slideTimer=setTimeout(async()=>{
          if(slideToken!==token||currentCourse!==course||slideIndex!==atIndex)return;
          if(document.visibilityState==="hidden"){
            const resume=()=>{if(document.visibilityState==="visible"){document.removeEventListener("visibilitychange",resume);if(currentCourse===course&&slideIndex===atIndex)draw()}};
            document.addEventListener("visibilitychange",resume,{once:false});
            return;
          }
          progress.textContent=t(getLang,"Saving reading progress…","正在保存阅读进度…");
          try{
            const result=await api.training({action:"module_read",module_code:course,card_codes:[current.code]});
            if(currentCourse!==course||slideIndex!==atIndex)return;
            readStates.set(course,result);onJourneyChange?.();draw();
          }catch{
            progress.textContent=t(getLang,"Couldn't save. Select Retry after reading.","无法保存，请重试记录本张卡。");
            action.replaceChildren(btn(t(getLang,"Retry saving","重试保存"),()=>draw(),"btn btn-secondary btn-small"));
          }
        },4000);
      }
      if(slideIndex===slides.length-1&&complete){
        const start=btn(t(getLang,"I've finished reading — start quiz","我看完了，开始小测验"),()=>openQuiz(course),"btn btn-primary btn-large");
        start.dataset.readingComplete="true";action.replaceChildren(start);
      }
    }
    let startX=null;
    body.addEventListener("touchstart",e=>{startX=e.changedTouches[0]?.clientX??null},{passive:true});
    body.addEventListener("touchend",e=>{
      if(startX===null)return;const dx=(e.changedTouches[0]?.clientX??startX)-startX;startX=null;
      if(Math.abs(dx)>45)move(dx<0?1:-1);
    },{passive:true});
    const controls=element("div",{className:"handbook-slide-controls"});controls.append(prev,next);
    panel.append(body,progress,controls,action);page.append(panel);draw();

    const gallery=element("section",{className:"handbook-group"});
    gallery.append(element("h2",{text:t(getLang,"Approved portfolio","已核准作品")}));
    const photos=(handbookData?.photos||[]).filter(x=>x.product_line===line&&x.signed_url);
    if(!photos.length)gallery.append(element("p",{className:"handbook-muted",text:t(getLang,"No approved photos available yet.","暂时没有已核准的作品图。")}));
    else{
      const strip=element("div",{className:"handbook-photo-strip"});
      photos.forEach(p=>{
        const b=element("button",{className:"handbook-photo",attrs:{type:"button","aria-label":t(getLang,"View photo full screen","全屏查看作品")}});
        b.append(element("img",{attrs:{src:p.signed_url,alt:getLang()==="zh"?(p.caption_zh||p.caption_en||"Portfolio"):(p.caption_en||p.caption_zh||"Portfolio"),loading:"lazy",decoding:"async"}}));
        b.addEventListener("click",()=>showPhoto(p));strip.append(b);
      });gallery.append(strip);
    }page.append(gallery);

    const scripts=element("section",{className:"handbook-group"});
    scripts.append(element("h2",{text:t(getLang,"Three customer scripts","3 句话术")}));
    const s=rows(line,"script").flatMap(r=>cardsFromBody(content(r))).slice(0,3);
    if(!s.length)scripts.append(element("p",{className:"handbook-muted",text:t(getLang,"Owner-approved scripts are not available yet.","话术尚待 Owner 核准。")}));
    s.forEach((txt,i)=>{
      const article=element("article",{className:"handbook-script"});
      article.append(element("p",{text:txt}),btn(t(getLang,"Copy","复制"),async()=>{
        try{await navigator.clipboard.writeText(txt);toast(t(getLang,"Copied","已复制"),{tone:"success"})}
        catch{toast(t(getLang,"Copy unavailable","无法复制"),{tone:"danger"})}
      },"btn btn-secondary btn-small"));scripts.append(article);
    });page.append(scripts);

    const faq=element("section",{className:"handbook-group"});
    faq.append(element("h2",{text:"FAQ"}));
    const faqs=rows(line,"faq").map(r=>({q:title(r),a:content(r)}));
    if(!faqs.length)faq.append(element("p",{className:"handbook-muted",text:t(getLang,"FAQ pending Owner approval.","FAQ 尚待 Owner 核准。")}));
    faqs.forEach(x=>{
      const d=element("details",{className:"handbook-faq"});
      d.append(element("summary",{text:x.q}),element("p",{text:x.a}));faq.append(d);
    });page.append(faq);

    host.append(page);
  }
  async function showPhoto(p){
    const {backdrop,close}=simpleModal("handbook-lightbox");
    const img=element("img",{attrs:{src:p.signed_url,alt:p.caption_en||p.caption_zh||"Portfolio"}});
    const bar=element("div",{className:"handbook-photo-actions"});
    bar.append(btn(t(getLang,"Close","关闭"),close,"btn btn-secondary"),
      btn(t(getLang,"Share photo","分享照片"),async()=>{
        try{
          const response=await fetch(p.signed_url,{mode:"cors"});if(!response.ok)throw Error("download");
          const blob=await response.blob();
          const ext=blob.type.includes("png")?"png":blob.type.includes("webp")?"webp":"jpg";
          const file=new File([blob],"ew-verdora-portfolio."+ext,{type:blob.type||"image/jpeg"});
          if(navigator.canShare?.({files:[file]})&&navigator.share)await navigator.share({files:[file]});
          else{
            const u=URL.createObjectURL(blob);
            const link=document.createElement("a");link.href=u;link.download=file.name;link.click();
            setTimeout(()=>URL.revokeObjectURL(u),1200);
            toast(t(getLang,"Photo saved. Send the file to your customer.","已保存图片，可作为文件发送给客户。"));
          }
        }catch(e){if(e?.name!=="AbortError")toast(t(getLang,"Photo sharing unavailable","暂时无法分享照片"),{tone:"danger"})}
      },"btn btn-primary"));
    backdrop.append(img,bar);
  }
  async function open(line=null){
    currentLine=lineById(line)?line:null;slideIndex=0;onNavigate("handbook");
    const host=document.getElementById("handbookPage");
    if(host)host.replaceChildren(element("p",{text:t(getLang,"Loading approved content…","正在载入核准资料…")}));
    await load();renderPage();
  }
  function journey(){
    const s=moduleState();
    const wrap=element("section",{className:"journey-card",attrs:{"aria-label":t(getLang,"My seven-day learning path","我的 7 天上手路线")}});
    const header=element("div",{className:"journey-header"});
    const ring=element("div",{className:"journey-ring",attrs:{role:"progressbar","aria-valuemin":"0","aria-valuemax":"7","aria-valuenow":String(s.done)}});
    ring.style.setProperty("--progress",String(s.done/7));
    ring.append(element("strong",{text:s.done+"/7"}));
    const head=element("div");
    head.append(element("h2",{text:t(getLang,"My 7-day starter path","我的 7 天上手路线")}),
      element("p",{text:t(getLang,"Real course progress, not daily practice scores","以现有必修课程成绩解锁，每日练习不计入")}));
    header.append(ring,head);wrap.append(header);
    const list=element("div",{className:"journey-days"});
    REQUIRED_COURSE_CODES.forEach((code,i)=>{
      const passed=courseRow(code)?.status==="passed";
      const unlocked=passed||code===s.next;
      const line=sectionForCourse(code);
      const hasRead=safeStore(readKey(line))==="1";
      const item=element("article",{className:"journey-day"+(passed?" completed":unlocked?" current":" locked")});
      const left=element("span",{className:"journey-day-num",text:passed?"✓":String(i+1)});
      const words=element("div",{className:"journey-day-copy"});
      words.append(element("strong",{text:t(getLang,"Day ","第 ")+(i+1)+(getLang()==="zh"?" 天":" · ")+courseLabel(code)}));
      if(getLang()==="zh")words.append(element("small",{text:courseLabel(code)+" · "+(lineById(line)?.zh||"")}));
      else words.append(element("small",{text:lineById(line)?.en||code}));
      item.append(left,words);
      if(passed)item.append(element("span",{className:"journey-done",text:t(getLang,"Passed","已通过")}));
      else if(unlocked){
        item.append(btn(hasRead?t(getLang,"Take 3 MCQs","做 3 题"):t(getLang,"Read handbook","看手册"),()=>hasRead?openQuiz(code):open(line),"btn btn-secondary btn-small"));
      }else item.append(element("span",{className:"journey-done",text:t(getLang,"Locked","未解锁")}));
      list.append(item);
    });
    wrap.append(list);
    if(s.done===7){const banner=element("p",{className:"journey-complete",text:t(getLang,"All seven courses passed!","7 门课程已全部通过！")});wrap.append(banner);celebrate(banner,t(getLang,"All modules passed","已完成必修课程"))}
    return wrap;
  }
  function showWelcome(){
    const key="ew_onboarding_v1_"+userKey();
    if(safeStore(key)==="1")return;
    const {backdrop,close}=simpleModal("onboarding-layer");
    let index=0;
    const steps=[
      {en:"Welcome to EW VERDORA",zh:"欢迎加入 EW VERDORA",subEn:"Your first seven days start with the handbook.",subZh:"从产品手册开始你的 7 天上手路线。"},
      {en:"Know your product lines",zh:"先了解五大业务线",subEn:"Only Owner-approved information and photos are shown.",subZh:"只使用 Owner 已核准的资料与作品。"},
      {en:"Learn and answer three",zh:"看手册 再做 3 题",subEn:"Your existing required courses decide when the next day opens.",subZh:"由现有必修课程的成绩决定能否解锁下一天。"},
      {en:"Start serving customers",zh:"开始学习服务客户",subEn:"Use scripts, portfolio photos, and your AI coach.",subZh:"使用核准话术 作品图与 AI 伙伴。"}
    ];
    const panel=element("div",{className:"onboarding-panel"});
    const top=element("div",{className:"onboarding-top"});
    const back=btn("‹",()=>{index=Math.max(0,index-1);draw()},"btn btn-text");
    const skip=btn(t(getLang,"Skip","跳过"),finish,"btn btn-text");
    top.append(back,skip);
    const artwork=element("div",{className:"onboarding-art"});
    const img=element("img",{attrs:{alt:"",decoding:"async"}});
    const fallback=createIcon("flower2",{size:24});fallback.classList.add("onboarding-fallback");
    artwork.append(img,fallback);
    img.addEventListener("load",()=>{fallback.classList.add("hidden");img.classList.add("is-ready")});
    img.addEventListener("error",()=>{img.classList.remove("is-ready");fallback.classList.remove("hidden")});
    const title=element("h2");const sub=element("p");
    const dots=element("div",{className:"onboarding-dots"});
    const next=btn("",()=>{if(index===3)finish();else{index++;draw()}},"btn btn-primary btn-large");
    let startX=null;
    panel.addEventListener("touchstart",e=>{startX=e.changedTouches[0]?.clientX??null},{passive:true});
    panel.addEventListener("touchend",e=>{if(startX===null)return;const d=(e.changedTouches[0]?.clientX??startX)-startX;startX=null;if(Math.abs(d)>55){index=Math.max(0,Math.min(3,index+(d<0?1:-1)));draw()}},{passive:true});
    function finish(){safeStore(key,"1");close();requestAnimationFrame(()=>spotlight("today"))}
    function draw(){
      const s=steps[index];title.textContent=t(getLang,s.en,s.zh);sub.textContent=t(getLang,s.subEn,s.subZh);
      img.classList.remove("is-ready");fallback.classList.remove("hidden");
      img.src="/ew-verdora-content/motion/onboarding/"+String(index+1).padStart(2,"0")+".svg";
      back.disabled=index===0;
      next.textContent=index===3?t(getLang,"Get started","开始上手"):t(getLang,"Next","下一张");
      dots.replaceChildren();for(let i=0;i<4;i++)dots.append(element("span",{className:i===index?"active":""}));
    }
    panel.append(top,artwork,title,sub,dots,next);backdrop.append(panel);draw();
  }
  function spotlight(page){
    if(safeStore(seenKey(page))==="1"||document.querySelector(".onboarding-layer"))return;
    const targets={
      today:[".journey-card .journey-day.current button",".quick-tile"],
      customers:["#customersPage .btn","#nav [data-tab='order']"],
      training:["#trainingPage .training3-course-item button","#trainingPage .training3-start button"],
      handbook:["#handbookPage .handbook-line-card"],
      order:["#orderPage button"],
      performance:["#performancePage button"]
    }[page]||[];
    const nodes=targets.map(x=>document.querySelector(x)).filter(Boolean).slice(0,3);
    if(!nodes.length)return;
    let i=0;
    const layer=element("div",{className:"spotlight-layer"});
    const bubble=element("div",{className:"spotlight-bubble",attrs:{role:"status"}});
    const message=element("p");
    const next=btn(t(getLang,"Got it","知道了"),step,"btn btn-primary btn-small");
    const skip=btn(t(getLang,"Skip","跳过"),finish,"btn btn-text btn-small");
    bubble.append(message,next,skip);layer.append(bubble);document.body.append(layer);
    function finish(){nodes.forEach(n=>n.classList.remove("spotlight-target"));layer.remove();safeStore(seenKey(page),"1")}
    function step(){nodes[i]?.classList.remove("spotlight-target");i++;if(i>=nodes.length)finish();else draw()}
    function draw(){
      const node=nodes[i];node.classList.add("spotlight-target");
      message.textContent=t(getLang,"Start here · "+(i+1)+"/"+nodes.length,"从这里开始 · "+(i+1)+"/"+nodes.length);
      node.scrollIntoView({block:"nearest",behavior:"instant"});
      const rect=node.getBoundingClientRect();
      const y=Math.min(window.innerHeight-150,Math.max(12,rect.bottom+10));
      bubble.style.top=Math.max(12,y)+"px";
      bubble.style.left=Math.min(window.innerWidth-250,Math.max(12,rect.left))+"px";
      next.textContent=i===nodes.length-1?t(getLang,"Done","完成"):t(getLang,"Next","下一个");
    }
    layer.addEventListener("click",e=>{if(e.target===layer)finish()});
    draw();
  }
  async function openQuiz(code){
    const s=moduleState();
    if(code!==s.next){toast(t(getLang,"Complete the previous course first.","请先完成前一门课程。"));return}
    const {backdrop,close}=simpleModal("handbook-quiz-layer");
    const panel=element("div",{className:"handbook-quiz-panel"});
    const closeButton=btn(t(getLang,"Close","关闭"),close,"btn btn-text");
    const title=element("h2",{text:courseLabel(code)});
    const progress=element("small");
    const question=element("p");
    const options=element("div",{className:"handbook-quiz-options"});
    const feedback=element("p",{className:"handbook-quiz-feedback",attrs:{role:"status"}});
    panel.append(closeButton,title,progress,question,options,feedback);backdrop.append(panel);
    let current=null,busy=false;
    async function start(){
      progress.textContent=t(getLang,"Loading approved question bank…","正在载入课程题库…");
      try{
        const r=await api.training({action:"module_quiz_start",module_code:code});
        if(r.passed){question.textContent=t(getLang,"Course already passed.","此课程已通过。");return}
        current=r.quiz||null;draw();
      }catch(e){
        question.textContent=t(getLang,"The three-question course quiz is not available yet. Your progress is unchanged.","课程 3 题测验暂不可用，进度不会被修改。");
        progress.textContent="";
      }
    }
    function draw(){
      if(!current)return;
      if(current.completed){
        progress.textContent=t(getLang,"Quiz complete","测验完成");
        question.textContent=t(getLang,"Score: ","分数：")+Number(current.score||0)+"/100";
        options.replaceChildren();
        if(current.passed){
          celebrate(panel,t(getLang,"Course passed","课程通过"));
          toast(t(getLang,"Course passed! Next day unlocked.","课程通过！已解锁下一天。"),{tone:"success"});
        }else options.append(btn(t(getLang,"Try again","重新作答"),()=>{current=null;start()}));
        onRefresh().finally(()=>{});
        return;
      }
      const q=current.question;
      progress.textContent=String(q.position)+" / 3";
      question.textContent=getLang()==="zh"?q.question_zh:q.question_en;
      options.replaceChildren();feedback.textContent="";
      const choices=getLang()==="zh"?q.options_zh:q.options_en;
      choices.forEach((value,i)=>options.append(btn(String(value),()=>answer(i),"btn btn-secondary handbook-quiz-option")));
    }
    async function answer(selected_index){
      if(busy||!current?.question)return;busy=true;
      options.querySelectorAll("button").forEach(b=>b.disabled=true);
      try{
        const r=await api.training({action:"module_quiz_answer",attempt_id:current.attempt_id,position:current.question.position,selected_index});
        feedback.textContent=r.correct?t(getLang,"Correct","回答正确"):t(getLang,"Review the explanation","请查看解析");
        const explanation=getLang()==="zh"?r.explanation_zh:r.explanation_en;
        if(explanation)feedback.textContent+=" · "+explanation;
        current=r.quiz;
        const next=btn(t(getLang,"Continue","继续"),draw,"btn btn-primary");
        options.replaceChildren(next);
      }catch(e){toast(t(getLang,"Could not submit answer","提交失败"),{tone:"danger"});options.querySelectorAll("button").forEach(b=>b.disabled=false)}
      finally{busy=false}
    }
    start();
  }
  return {journey,open,openQuiz,spotlight,showWelcome,openForCourse:code=>open(sectionForCourse(code)),reRender:renderPage,refresh:()=>{handbookData=null}};
}
