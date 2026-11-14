import {element,clear,toast,stagger} from "./components.js";
import {createIcon} from "./icons.js";
import {celebrate as fallbackCelebrate} from "./motion.js";
import {vendorMotion,trackMotion} from "./motion-vendor.js";
import {REQUIRED_COURSE_CODES} from "./unlock.js";
import {loadReviewedContent,reviewed,dayForCode,localized,marks,sectionFromFocus,emptyCopy} from "./approved-content.js";

export const HANDBOOK_LINES=Object.freeze([
  {id:"condolence",en:"Condolence Wreaths",zh:"慰问花圈",icon:"flower2"},
  {id:"opening",en:"Opening Flowers",zh:"开张花礼",icon:"sparkles"},
  {id:"bouquet",en:"Bouquets",zh:"花束",icon:"flower2"},
  {id:"wedding_event",en:"Weddings & Events",zh:"婚礼与活动花艺",icon:"calendarDays"},
  {id:"wholesale",en:"Flower Wholesale",zh:"鲜切花批发",icon:"users"}
]);
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
  const direct=String(row?.product_line||"").toLowerCase();
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
  let slideTimer=null,slideToken=0,welcomeRedraw=null;
  const readStates=new Map(),readRequests=new Map();
  const userKey=()=>String(getUserId()||"unknown");
  const clearSlideTimer=()=>{slideToken++;if(slideTimer!==null){clearTimeout(slideTimer);slideTimer=null}};
  const readStatus=code=>readStates.get(code)||null;
  async function syncReadState(code){
    if(readRequests.has(code))return readRequests.get(code);
    const promise=api.training({action:"module_read",module_code:code,phase:"status"})
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

  function sectionForCourse(code){return dayForCode(code)?.handbook_focus||null;}
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
    // PR #10 owns the authenticated handbook action. Its contract is filtered
    // section -> entries; do not duplicate the backend endpoint here.
    const sections=["story","product_line","service_rule","script","faq"];
    fetching=Promise.all(sections.map(section=>api.agent({action:"handbook",section})))
      .then(all=>{
        handbookData={knowledge:all.flatMap(x=>Array.isArray(x.entries)?x.entries:[])
          .filter(row=>row&&typeof row.code==="string"&&typeof row.section==="string"),photos:[],unavailable:false};
        return handbookData;
      }).catch(()=>{
        handbookData={knowledge:[],photos:[],unavailable:true};
        return handbookData;
      }).finally(()=>{fetching=null});
    return fetching;
  }
  async function initContent(){try{await loadReviewedContent()}catch{return null}return reviewed()}
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
    const filter=sectionFromFocus(line);
    if(!filter)return [];
    return (handbookData?.knowledge||[]).filter(x=>x.section===filter.section&&x.kind==="card"&&
      (!filter.product_line||x.product_line===filter.product_line))
      .filter(x=>typeof x.code==="string"&&x.code.length>0)
      .slice(0,4).map(x=>({
        code:x.code,title:title(x),body:content(x),
        points:(getLang()==="zh"?x.key_points_zh:x.key_points_en)||[]
      }));
  }
  function businessCards(grid){
    // Only Owner-approved handbook entries feed the Gemini visual card.
    // Static labels come from the existing five official business categories.
    const lines=HANDBOOK_LINES.map(line=>{
      const first=(handbookData?.knowledge||[]).find(row=>
        row.kind==="card"&&row.section==="product_line"&&row.product_line===line.id);
      return {
        id:line.id==="wedding_event"?"wedding":line.id,
        product_line:line.id,
        icon:(line.id==="wedding_event"?"wedding":line.id)+".svg",
        kicker:line.id.replaceAll("_"," ").toUpperCase(),
        title_en:line.en,title_zh:line.zh,
        subtitle_en:String(first?.key_points_en?.[0]||""),
        subtitle_zh:String(first?.key_points_zh?.[0]||"")
      };
    });
    const vm=vendorMotion();
    if(vm?.mountCards){
      trackMotion("business-cards",vm.mountCards(grid,lines,{
        lang:getLang(),iconsBase:"/ew-verdora-content/motion/icons",
        onSelect:line=>{
          currentCourse=null;currentLine=line.product_line;slideIndex=0;renderPage();
        }
      }));
      // Known, static enum data only; no server-provided id/key is interpolated.
      grid.querySelectorAll(".vd-hero-card").forEach((node,i)=>{
        node.setAttribute("data-handbook-line",HANDBOOK_LINES[i].id);
      });
    }else{
      HANDBOOK_LINES.forEach(line=>{
        const card=element("button",{className:"handbook-line-card",
          attrs:{type:"button","data-handbook-line":line.id}});
        card.append(iconAsset(line),element("strong",{text:getLang()==="zh"?line.zh:line.en}));
        card.addEventListener("click",()=>{currentCourse=null;currentLine=line.id;slideIndex=0;renderPage()});
        grid.append(card);
      });
    }
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
    if(currentCourse)head.append(element("p",{className:"screen-subtitle",text:t(getLang,"Read approved cards before the five-question quiz. If none are approved, the quiz opens directly.","先读完核准卡片，再做 5 题。若没有核准卡片，可直接测验。")}));
    page.append(head);
    if(!currentLine){
      page.append(element("p",{className:"screen-subtitle",text:t(getLang,"Only Owner-approved material is shown.","仅显示 Owner 已核准的资料。")}));
      const grid=element("div",{className:"handbook-line-grid"});
      businessCards(grid);page.append(grid);
      if(!handbookData.knowledge.length){
        const copy=emptyCopy("handbook");
        if(copy){
          const empty=element("div",{className:"handbook-empty-orders"});
          empty.append(element("strong",{text:localized(copy,"title",getLang())}),element("p",{text:localized(copy,"body",getLang())}));
          empty.append(btn(localized(copy,"cta",getLang()),async()=>{handbookData=null;await load();renderPage()},"btn btn-secondary"));
          page.append(empty);
        }
      }
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
        progress.textContent=course&&readStatus(course)?.ready_for_quiz===true?
          t(getLang,"No approved cards — the quiz is ready.","本课没有核准卡片，可直接测验。"):
          t(getLang,"Checking reading status…","正在核对阅读状态…");
        if(course&&readStatus(course)?.ready_for_quiz===true&&courseRow(course)?.status!=="passed"){
          action.append(btn(t(getLang,"Start five-question quiz","开始 5 题测验"),()=>openQuiz(course),"btn btn-primary btn-large"));
        }
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
        // Server verifies time between read start and completion.
        void api.training({action:"module_read",module_code:course,phase:"start",card_code:current.code})
        .then(()=>{if(slideToken!==token)return;slideTimer=setTimeout(async()=>{
          if(slideToken!==token||currentCourse!==course||slideIndex!==atIndex)return;
          if(document.visibilityState==="hidden"){
            const resume=()=>{if(document.visibilityState==="visible"){document.removeEventListener("visibilitychange",resume);if(currentCourse===course&&slideIndex===atIndex)draw()}};
            document.addEventListener("visibilitychange",resume,{once:false});
            return;
          }
          progress.textContent=t(getLang,"Saving reading progress…","正在保存阅读进度…");
          try{
            const result=await api.training({action:"module_read",module_code:course,phase:"complete",card_code:current.code});
            if(currentCourse!==course||slideIndex!==atIndex)return;
            readStates.set(course,result);onJourneyChange?.();draw();
          }catch{
            progress.textContent=t(getLang,"Couldn't save. Select Retry after reading.","无法保存，请重试记录本张卡。");
            action.replaceChildren(btn(t(getLang,"Retry saving","重试保存"),()=>draw(),"btn btn-secondary btn-small"));
          }
        },4050);}).catch(()=>{if(slideToken===token){
          progress.textContent=t(getLang,"Could not start reading verification. Retry.","无法开始阅读验证，请重试。");
          action.replaceChildren(btn(t(getLang,"Retry","重试"),()=>draw(),"btn btn-secondary btn-small"));
        }});
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
    clearSlideTimer();currentCourse=null;currentLine=lineById(line)?line:null;slideIndex=0;
    onNavigate("handbook");
    await load();if(currentCourse===null)renderPage();
  }
  async function openForCourse(code,targetCardCode=null){
    if(!REQUIRED_COURSE_CODES.includes(code))return;
    clearSlideTimer();
    currentCourse=code;currentLine=sectionForCourse(code);slideIndex=0;
    onNavigate("handbook");
    await load();
    await syncReadState(code);
    if(currentCourse!==code)return;
    const cards=approvedSlides(currentLine);
    const target=cards.findIndex(x=>x.code===targetCardCode);
    slideIndex=target>=0?target:0;
    renderPage();
  }
  async function reviewQuestionCard(code,cardCode){
    await load();
    const row=cardCode?(handbookData?.knowledge||[]).find(x=>
      x.code===cardCode&&x.kind==="card"&&x.section==="product_line"):null;
    const line=row?rowLine(row):null;
    if(line&&line!==sectionForCourse(code)){
      clearSlideTimer();currentCourse=null;currentLine=line;slideIndex=0;
      const cards=approvedSlides(line);
      slideIndex=Math.max(0,cards.findIndex(x=>x.code===cardCode));
      onNavigate("handbook");renderPage();
      return;
    }
    await openForCourse(code,cardCode||null);
  }

  function journey(){
    const state=moduleState();
    hydrateJourney();
    const wrap=element("section",{className:"journey-card",attrs:{"aria-label":t(getLang,"My onboarding progress","我的上手进度")}});
    const header=element("div",{className:"journey-header"});
    const ring=element("div",{className:"journey-ring",attrs:{role:"progressbar","aria-valuemin":"0","aria-valuemax":"7","aria-valuenow":String(state.done)}});
    ring.style.setProperty("--progress",String(state.done/7));ring.append(element("strong",{text:state.done+"/7"}));
    const heading=element("div");
    heading.append(element("h2",{text:t(getLang,"My onboarding progress","我的上手进度")}));
    const day=dayForCode(state.next);
    if(day){
      heading.append(element("strong",{className:"journey-next-label",text:localized(day,"title",getLang())}),
        element("p",{text:localized(day,"goal",getLang())}));
    }else{
      const last=dayForCode("PAYMENT");
      heading.append(element("p",{text:localized(last,"done_message",getLang())}));
    }
    header.append(ring,heading);wrap.append(header);
    if(state.next){
      const stage=readStatus(state.next);
      const label=stage?.ready_for_quiz===true?t(getLang,"Start quiz","开始测验"):t(getLang,"Read approved cards","读核准卡片");
      wrap.append(btn(label,()=>openForCourse(state.next),"btn btn-secondary btn-wide"));
    }
    // Full seven-day detail stays expandable: never pushes earning actions below
    // the fold and always uses Owner-reviewed day titles, goals and tasks.
    const details=element("details",{className:"journey-details"});
    details.append(element("summary",{text:t(getLang,"View all 7 days","查看全部 7 天")}));
    const list=element("div",{className:"journey-days"});
    REQUIRED_COURSE_CODES.forEach((code,i)=>{
      const item=element("article",{className:"journey-day"+(courseRow(code)?.status==="passed"?" completed":code===state.next?" current":" locked")});
      const words=element("div",{className:"journey-day-copy"});
      const day=dayForCode(code);
      words.append(element("strong",{text:localized(day,"title",getLang())||courseLabel(code)}),
        element("small",{text:localized(day,"goal",getLang())}));
      const desc=element("ul",{className:"journey-day-tasks"});
      (day?.tasks||[]).forEach(task=>desc.append(element("li",{text:localized(task,"text",getLang())})));
      words.append(desc);
      item.append(element("span",{className:"journey-day-num",text:String(i+1)}),words);
      if(courseRow(code)?.status==="passed")item.append(element("span",{className:"journey-done",text:localized(day,"done_message",getLang())}));
      else if(code===state.next)item.append(btn(t(getLang,"Continue","继续"),()=>openForCourse(code),"btn btn-secondary btn-small"));
      list.append(item);
    });
    details.append(list);wrap.append(details);
    if(state.done===7){
      const milestone="ew_motion_7_courses_"+userKey().replace(/[^a-zA-Z0-9-]/g,"");
      if(safeStore(milestone)!=="1"){
        safeStore(milestone,"1");
        if(vendorMotion()?.celebrate)vendorMotion().celebrate({type:"course",originEl:ring});
        else fallbackCelebrate(ring,t(getLang,"Courses completed","课程已完成"));
      }
    }
    return wrap;
  }
  function showWelcome(){
    const key="ew_onboarding_v1_"+userKey();
    if(safeStore(key)==="1")return;
    const {backdrop,close}=simpleModal("onboarding-layer");
    let index=0;
    const steps=(reviewed()?.ui?.tour||[]).slice(0,4);
    if(steps.length!==4){close();return}
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
    function finish(){safeStore(key,"1");welcomeRedraw=null;close();requestAnimationFrame(()=>spotlight("today"))}
    function draw(){
      const s=steps[index];title.textContent=localized(s,"title",getLang());sub.textContent=localized(s,"body",getLang());
      img.classList.remove("is-ready");fallback.classList.remove("hidden");
      img.src=["/ew-verdora-content/motion/onboarding/01-company.svg",
        "/ew-verdora-content/motion/onboarding/02-business-lines.svg",
        "/ew-verdora-content/motion/onboarding/03-commission.svg",
        "/ew-verdora-content/motion/onboarding/04-unlock.svg"][index];
      back.disabled=index===0;
      next.textContent=index===3?t(getLang,"Get started","开始上手"):t(getLang,"Next","下一张");
      dots.replaceChildren();for(let i=0;i<4;i++)dots.append(element("span",{className:i===index?"active":""}));
    }
    panel.append(top,artwork,title,sub,dots,next);backdrop.append(panel);welcomeRedraw=draw;draw();
  }
  function spotlight(page){
    if(safeStore(seenKey(page))==="1"||document.querySelector(".onboarding-layer"))return;
    const screen=page==="today"?"home":page==="order"?"quote":page;
    const selectors={
      "CM-HOME-1":"#todayPage .earning-actions","CM-HOME-2":".ai-orb",
      "CM-TRAIN-1":"#trainingPage .training3-modules","CM-TRAIN-2":"#training-exam-entry",
      "CM-HAND-1":"#handbookPage .handbook-slides, #handbookPage .handbook-line-card",
      "CM-HAND-2":"#handbookPage .handbook-script",
      "CM-QUOTE-1":"#orderPage button","CM-QUOTE-2":"#orderPage .page-shell",
      "CM-AI-1":".ai-chat-suggestions","CM-AI-2":".ai-chat-input"
    };
    const entries=marks(screen).map(row=>({row,node:document.querySelector(selectors[row.code]||"[data-no-target]")}))
      .filter(x=>x.node&&x.node.getBoundingClientRect().width>0).slice(0,3);
    if(!entries.length)return;
    let index=0;
    const layer=element("div",{className:"spotlight-layer"});
    const bubble=element("div",{className:"spotlight-bubble",attrs:{role:"status"}});
    const message=element("p");
    const next=btn(t(getLang,"Got it","知道了"),step,"btn btn-primary btn-small");
    const skip=btn(t(getLang,"Skip","跳过"),finish,"btn btn-text btn-small");
    bubble.append(message,next,skip);layer.append(bubble);document.body.append(layer);
    function finish(){entries.forEach(x=>x.node.classList.remove("spotlight-target"));layer.remove();safeStore(seenKey(page),"1")}
    function step(){entries[index]?.node?.classList.remove("spotlight-target");index++;if(index>=entries.length)finish();else draw()}
    function draw(){
      const {node,row}=entries[index];node.classList.add("spotlight-target");
      message.textContent=localized(row,"tip",getLang());
      node.scrollIntoView({block:"nearest",behavior:"instant"});
      const rect=node.getBoundingClientRect();
      bubble.style.top=Math.max(12,Math.min(innerHeight-150,rect.bottom+10))+"px";
      bubble.style.left=Math.max(12,Math.min(innerWidth-250,rect.left))+"px";
      next.textContent=index===entries.length-1?t(getLang,"Done","完成"):t(getLang,"Next","下一个");
    }
    layer.addEventListener("click",e=>{if(e.target===layer)finish()});draw();
  }
  async function openQuiz(code){
    const s=moduleState();
    if(code!==currentCourse||readStatus(code)?.ready_for_quiz!==true){
      toast(t(getLang,"Read all approved cards before the quiz.","请先读完这门课所有核准卡片。"));
      void openForCourse(code);return;
    }
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
        if(String(e?.message||"").includes("must_read_handbook_first")){close();void openForCourse(code);return}
        question.textContent=t(getLang,"The five-question quiz is unavailable. Progress remains unchanged.","5 题测验暂不可用，课程进度不会变更。");
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
          if(vendorMotion()?.celebrate)vendorMotion().celebrate({type:"course",originEl:panel});
          else fallbackCelebrate(panel,t(getLang,"Course passed","课程通过"));
          toast(t(getLang,"Course passed! Next day unlocked.","课程通过！已解锁下一天。"),{tone:"success"});
        }else options.append(btn(t(getLang,"Try again","重新作答"),()=>{current=null;start()}));
        onRefresh().finally(()=>{});
        return;
      }
      const q=current.question;
      progress.textContent=String(q.position)+" / 5";
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
        if(!r.correct&&approvedSlides(currentLine).length){
          const back=btn(t(getLang,"Review this handbook card","回去看这张卡"),()=>{
            close();void reviewQuestionCard(code,r.related_card_code||null);
          },"btn btn-secondary");
          options.append(back);
        }
      }catch(e){toast(t(getLang,"Could not submit answer","提交失败"),{tone:"danger"});options.querySelectorAll("button").forEach(b=>b.disabled=false)}
      finally{busy=false}
    }
    start();
  }
  return {initContent,journey,open,openQuiz,spotlight,showWelcome,openForCourse,
    onLanguageChange:()=>{welcomeRedraw?.();if(currentLine)renderPage()},
    reRender:renderPage,refresh:()=>{handbookData=null},destroy:clearSlideTimer};
}
