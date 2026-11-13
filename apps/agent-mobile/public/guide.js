import {element,clear,toast,stagger} from "./components.js";
import {createIcon} from "./icons.js";
import {REQUIRED_COURSE_CODES,getUnlockProgress} from "./unlock.js";
import {celebrate} from "./motion.js";

export const PRODUCT_LINES=["condolence","opening","bouquet","wedding_event","wholesale"];
export const COURSE_TO_LINE=Object.freeze({
  "CORE-BRAND":"wholesale","LEAD-FINDING":"bouquet","QUALIFY":"opening",
  "REFERENCE":"wedding_event","OBJECTION":"condolence","CLOSING":"bouquet","PAYMENT":"wholesale"
});
const WORDS={
  en:{
    guide:"My 7-day selling roadmap",guideSub:"Learn the business, check your knowledge, then complete your existing required course.",
    day:"Day",done:"Completed",current:"Start here",locked:"Complete the previous course first",
    course:"Required course",learn:"Read the handbook",quiz:"Try 3 questions",official:"Open required course",
    progress:"required courses passed",handbook:"Product handbook",handbookSub:"Only Owner-approved information is shown to agents.",
    approvedPending:"This section is waiting for Owner-approved material.",cards:"Getting started",work:"Approved work",scripts:"Customer-ready scripts",faqs:"Frequently asked questions",
    copy:"Copy",copied:"Copied",share:"Share photo",photoUnavailable:"The approved photo is not yet available for sharing.",
    next:"Next",previous:"Back",skip:"Skip",finish:"Start learning",intro0:"Welcome to EW VERDORA",intro1:"Know what you can offer",intro2:"Turn conversations into enquiries",intro3:"Finish your training, then start selling",
    introText0:"Seven existing required courses, one clear starting point.",introText1:"Use the approved product handbook. Never guess prices or availability.",
    introText2:"Learn what to ask, how to follow up and when to request an approved quote.",introText3:"Training and certification are verified by the system, not by your phone.",
    tourNext:"Next tip",tourDone:"Got it",tourSkip:"Skip tips",tourToday:"This is your learning roadmap.",tourCustomers:"Start here when you have a new customer.",tourOrder:"Use the approved order process.",tourTraining:"Your seven required courses are here.",tourPerformance:"Review your results here.",tourHandbook:"Open an approved product line here.",
    hintsTitle:"Ask your AI partner",hint1:"Who should I recommend an opening flower stand to?",hint2:"What should I ask before offering a quote?",hint3:"How do I follow up without pressuring a customer?",
    noCustomers:"No customers yet? Start by finding a real occasion, then add the enquiry.",noOrders:"No orders yet? Learn the product lines and start with your first qualified enquiry.",
    startHandbook:"Browse product handbook",startTraining:"Learn how to qualify a lead",
    viewed:"Handbook reviewed",notViewed:"Read a handbook card first",practice:"3-question review",practiceNote:"Review only. Your required course status comes from the secure training system.",
    answer:"Check answer",practicePassed:"Review complete. Continue to the required course to unlock the next day.",
    practiceRetry:"Review again",questionMissing:"Owner-approved review questions are not available yet. Continue with your existing required course.",
    questionCount:"Question {n} of 3",correct:"Correct",tryAgain:"Please revisit this handbook card before continuing.",
    imgAlt:"EW VERDORA onboarding illustration",close:"Close",noFaq:"Related FAQs will appear after approval.",
    noPhotos:"Approved portfolio photos will appear here once available.",noScripts:"Approved customer scripts will appear here once available.",
    openPhoto:"View full screen",closePhoto:"Close photo",readFirst:"First review a handbook card.",
    noMedia:"Illustration is being prepared",lesson:"Course material",nextDay:"Next day",
    line_condolence:"Condolence wreaths",line_opening:"Opening flowers",line_bouquet:"Bouquets",line_wedding_event:"Weddings & events",line_wholesale:"Wholesale flowers"
  },
  zh:{
    guide:"我的 7 天上手路线",guideSub:"先了解业务、做知识检查，再完成系统现有的必修课程。",
    day:"第",done:"已完成",current:"从这里开始",locked:"先完成上一门课程",
    course:"必修课程",learn:"先看产品手册",quiz:"做 3 题",official:"进入现有必修课程",
    progress:"门必修课程已通过",handbook:"产品手册",handbookSub:"Agent 只能看到 Owner 已批准的资料。",
    approvedPending:"此业务线仍在等待 Owner 核准内容。",cards:"4 张上手卡",work:"已批准的作品",scripts:"可复制的客户话术",faqs:"常见问题",
    copy:"复制",copied:"已复制",share:"分享作品图",photoUnavailable:"这张已批准的作品目前无法分享。",
    next:"下一张",previous:"上一张",skip:"跳过",finish:"开始学习",intro0:"欢迎加入 EW VERDORA",intro1:"先认识我们能卖什么",intro2:"把聊天变成真实询盘",intro3:"完成课程再正式开始销售",
    introText0:"沿用系统原有 7 门必修课程，每天都有清楚的起点。",introText1:"只使用已批准的产品手册，不猜价格或库存。",
    introText2:"学会询问需求、安排跟进和提交系统报价。",introText3:"课程通过与认证状态由后端核对，不靠手机本地记录。",
    tourNext:"下一个提示",tourDone:"明白了",tourSkip:"跳过提示",tourToday:"这里是你的 7 天学习路线。",tourCustomers:"收到新客户时从这里开始。",tourOrder:"使用公司批准的订单流程。",tourTraining:"现有 7 门必修课程在这里。",tourPerformance:"在这里查看自己的表现。",tourHandbook:"点这里打开已批准的产品线。",
    hintsTitle:"问问你的 AI 伙伴",hint1:"开张花篮适合推荐给谁？",hint2:"报价前要先确认什么资料？",hint3:"怎么跟进客户才不会造成压力？",
    noCustomers:"还没有客户？先找有真实用花需求的场合，再记录客户询盘。",noOrders:"还没有订单？先熟悉业务线，再从第一个合格询盘开始。",
    startHandbook:"查看产品手册",startTraining:"学习如何确认客户需求",
    viewed:"手册已看",notViewed:"先看一张上手卡",practice:"3 题知识检查",practiceNote:"仅供复习，正式课程通过状态以安全训练系统为准。",
    answer:"检查答案",practicePassed:"知识检查完成。请继续完成现有必修课程，才会解锁下一天。",
    practiceRetry:"重新复习",questionMissing:"尚未提供 Owner 核准的 3 道题；请先完成现有必修课程。",
    questionCount:"第 {n} / 3 题",correct:"回答正确",tryAgain:"请先重看这张手册卡，再继续答题。",
    imgAlt:"EW VERDORA 入门插画",close:"关闭",noFaq:"相关 FAQ 核准后会显示。",
    noPhotos:"Owner 核准作品图后会在这里显示。",noScripts:"Owner 核准客户话术后会在这里显示。",
    openPhoto:"全屏查看",closePhoto:"关闭图片",readFirst:"请先看一张手册卡。",
    noMedia:"插画准备中",lesson:"课程内容",nextDay:"下一天",
    line_condolence:"慰问花圈",line_opening:"开张花礼",line_bouquet:"花束",line_wedding_event:"婚礼与活动花艺",line_wholesale:"鲜切花批发"
  }
};
const text=(lang,key,vars={})=>String((WORDS[lang==="zh"?"zh":"en"][key]||key)).replace(/\{(\w+)\}/g,(_,k)=>String(vars[k]??""));
const safeStorage=(key,value)=>{try{if(value===undefined)return localStorage.getItem(key);localStorage.setItem(key,value)}catch{}return null};
const reduced=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
const isApproved=item=>!!item&&item.active!==false&&item.visible_to_agent!==false&&item.needs_owner_confirm!==true&&(!item.status||item.status==="approved");
const caption=(item,lang,field="title")=>String(item?.[field+"_"+(lang==="zh"?"zh":"en")]||item?.[field+"_en"]||"");
const cleanLine=id=>PRODUCT_LINES.includes(id)?id:null;
const safeUrl=value=>{
  try{
    const u=new URL(value,location.origin);
    return (u.origin===location.origin||u.protocol==="https:")?u.href:null;
  }catch{return null}
};

export function roadmapState(data={}){
  const state=getUnlockProgress(data);
  const courses=new Map((data.training||[]).map(x=>[String(x.training_modules?.code||""),x]));
  return REQUIRED_COURSE_CODES.map((code,index)=>{
    const row=courses.get(code),passed=row?.status==="passed";
    return {code,day:index+1,passed,unlocked:index===0||REQUIRED_COURSE_CODES.slice(0,index).every(c=>courses.get(c)?.status==="passed"),
      handbookSection:cleanLine(row?.training_modules?.handbook_section)||COURSE_TO_LINE[code],course:row?.training_modules};
  }).map(item=>({...item,completed:state.completed,total:state.total}));
}

export function createAgentGuide({getData,getLang,getUserId,api,onNavigate,onRefresh}){
  let handbook=null,loaded=false,loading=false,modal=null,tourLayer=null,aiTips=null;
  const L=(key,vars)=>text(getLang(),key,vars);
  const storageKey=suffix=>"ew_guide_"+String(getUserId()||"guest")+"_"+suffix;
  const create=(tag,cls,txt)=>element(tag,{className:cls,text:txt});
  const button=(label,action,cls="btn btn-secondary")=>{
    const b=create("button",cls,label);b.type="button";b.addEventListener("click",action);return b;
  };
  const displayTitle=id=>L("line_"+id);
  const media=()=>handbook?.motion_assets||{};
  function safeMedia(value){
    const url=safeUrl(value);
    if(!url)return null;
    return url;
  }
  function imgOrFallback(src,description,cls){
    const frame=create("div",cls);
    const placeholder=create("span","guide-image-fallback",description);
    frame.append(placeholder);
    const url=safeMedia(src);
    if(url){
      const img=element("img",{attrs:{src:url,alt:description,loading:"lazy",decoding:"async"}});
      img.addEventListener("load",()=>placeholder.classList.add("hidden"));
      img.addEventListener("error",()=>img.remove());
      frame.append(img);
    }
    return frame;
  }
  async function load(){
    if(loading||loaded)return;
    loading=true;
    try{
      const response=await api.agent({action:"handbook"});
      // Server must select only Owner-approved rows; the client performs a second defensive filter.
      handbook={
        lines:PRODUCT_LINES.map(id=>{
          const raw=(Array.isArray(response?.lines)?response.lines:[]).find(x=>x.id===id)||{};
          const line=isApproved(raw)?raw:{};
          return {...line,id,cards:(line.cards||[]).filter(isApproved).slice(0,4),
            photos:(line.photos||[]).filter(x=>isApproved(x)&&x.status==="approved"),
            questions:(line.questions||[]).filter(isApproved).slice(0,3),
            scripts:(line.scripts||[]).filter(isApproved).slice(0,3),
            faqs:(line.faqs||[]).filter(isApproved)};
        }),
        motion_assets:response?.motion_assets||{}
      };
      loaded=true;
    }catch{
      // No invented product/price/FAQ/approved photos while the Owner backend is not live.
      handbook={lines:PRODUCT_LINES.map(id=>({id,cards:[],photos:[],scripts:[],faqs:[],questions:[]})),motion_assets:{}};
      loaded=true;
    }finally{loading=false}
  }
  function lineData(id){return handbook?.lines.find(x=>x.id===id)||{id,cards:[],photos:[],scripts:[],faqs:[],questions:[]}}
  function openModal(title){
    closeModal();
    const layer=create("div","guide-modal");layer.setAttribute("role","dialog");layer.setAttribute("aria-modal","true");layer.setAttribute("aria-label",title);
    const surface=create("div","guide-modal-surface");
    layer.append(surface);document.body.append(layer);modal=layer;
    layer.addEventListener("click",e=>{if(e.target===layer)closeModal()});
    layer.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
    return surface;
  }
  function closeModal(){modal?.remove();modal=null}
  function header(parent,title){
    const head=create("div","guide-modal-header");
    head.append(create("strong","",title),button("×",closeModal,"guide-close"));
    parent.append(head);
  }
  function swipe(node,previous,next){
    let start=null;
    node.addEventListener("touchstart",e=>{start=e.changedTouches[0]?.clientX??null},{passive:true});
    node.addEventListener("touchend",e=>{
      if(start==null)return;
      const d=(e.changedTouches[0]?.clientX??start)-start;
      if(Math.abs(d)>55)(d<0?next:previous)();
      start=null;
    },{passive:true});
  }
  function showOnboardingOnce(){
    if(safeStorage(storageKey("onboarding_done"))==="1")return;
    let slide=0;const surface=openModal(L("intro0"));
    const draw=()=>{
      clear(surface);
      const head=create("div","guide-modal-header");
      head.append(create("strong","","EW VERDORA"),button(L("skip"),finish,"guide-skip"));surface.append(head);
      const asset=media().onboarding?.[slide];
      const image=imgOrFallback(asset,L("noMedia"),"guide-onboarding-image");
      image.firstChild.textContent=String(slide+1).padStart(2,"0")+" / 04";
      surface.append(image,create("span","guide-kicker",String(slide+1)+" / 4"),create("h2","guide-onboarding-title",L("intro"+slide)),
        create("p","guide-onboarding-description",L("introText"+slide)));
      const dots=create("div","guide-dots");for(let i=0;i<4;i++)dots.append(create("span","guide-dot"+(i===slide?" active":"")));
      surface.append(dots);
      const actions=create("div","guide-actions");
      if(slide>0)actions.append(button(L("previous"),()=>{slide--;draw()}));
      actions.append(button(slide===3?L("finish"):L("next"),()=>{
        if(slide===3)finish();else{slide++;draw()}
      },"btn btn-primary"));
      surface.append(actions);
    };
    const finish=()=>{safeStorage(storageKey("onboarding_done"),"1");closeModal();document.dispatchEvent(new Event("ew-guide-onboarded"))};
    swipe(surface,()=>{if(slide>0){slide--;draw()}},()=>{if(slide<3){slide++;draw()}else finish()});
    draw();
  }
  async function shareApprovedPhoto(photo){
    const url=safeMedia(photo.signed_url||photo.share_url);
    if(!url)return toast(L("photoUnavailable"),{tone:"warning"});
    try{
      const response=await fetch(url,{mode:"cors"});
      if(!response.ok)throw new Error("download_failed");
      const blob=await response.blob();
      if(!blob.type.startsWith("image/"))throw new Error("not_image");
      const ext=blob.type.includes("png")?"png":blob.type.includes("webp")?"webp":"jpg";
      const file=new File([blob],"EW-VERDORA-Portfolio."+ext,{type:blob.type});
      if(navigator.share&&navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:"EW VERDORA"});
      else{
        const a=document.createElement("a");const object=URL.createObjectURL(blob);
        a.href=object;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(object),1000);
      }
    }catch(e){if(e.name!=="AbortError")toast(L("photoUnavailable"),{tone:"warning"})}
  }
  function showPhoto(photo){
    const src=safeMedia(photo.signed_url||photo.preview_url);
    if(!src)return toast(L("photoUnavailable"),{tone:"warning"});
    const surface=openModal(L("approvedPending"));header(surface,L("work"));
    const img=element("img",{className:"guide-photo-large",attrs:{src,alt:caption(photo,getLang(),"caption")||L("work")}});
    surface.append(img,create("p","guide-photo-caption",caption(photo,getLang(),"caption")));
    surface.append(button(L("share"),()=>shareApprovedPhoto(photo),"btn btn-primary"));
  }
  function copyScript(script){
    const value=caption(script,getLang(),"body")||caption(script,getLang(),"text");
    if(!value)return;
    navigator.clipboard?.writeText(value).then(()=>toast(L("copied"),{tone:"success"}))
      .catch(()=>toast(L("photoUnavailable"),{tone:"warning"}));
  }

  function openQuiz(id,course){
    const line=lineData(id);
    const questions=(line.questions||[]).filter(q=>Array.isArray(q.options_en)&&Array.isArray(q.options_zh)&&q.options_en.length===4&&q.options_zh.length===4
      &&Number.isInteger(q.correct_index)&&q.correct_index>=0&&q.correct_index<=3).slice(0,3);
    const surface=openModal(L("practice"));
    if(questions.length!==3){
      header(surface,L("practice"));
      surface.append(create("p","guide-empty",L("questionMissing")));
      surface.append(button(L("official"),()=>{closeModal();onNavigate("training",{focusModule:course})},"btn btn-primary"));
      return;
    }
    let index=0,correct=0,choice=-1;
    const draw=()=>{
      clear(surface);header(surface,L("practice"));
      if(index>=3){
        surface.append(createIcon("circleCheck",{size:34}),
          create("h2","guide-onboarding-title",L("practicePassed")),
          create("p","guide-empty",L("practiceNote")));
        surface.append(button(L("official"),()=>{closeModal();onNavigate("training",{focusModule:course})},"btn btn-primary"));
        return;
      }
      const q=questions[index];
      surface.append(create("span","guide-kicker",L("questionCount",{n:index+1})),
        create("h3","guide-question",caption(q,getLang(),"question")));
      const options=getLang()==="zh"?q.options_zh:q.options_en;
      const list=create("div","guide-quiz-options");
      options.forEach((value,i)=>{
        const answer=button(String(value),()=>{choice=i;draw()},"guide-quiz-option"+(choice===i?" selected":""));
        answer.setAttribute("aria-pressed",String(choice===i));
        list.append(answer);
      });
      surface.append(list,create("p","guide-empty",L("practiceNote")));
      const check=button(L("answer"),()=>{
        if(choice<0)return;
        if(choice===q.correct_index){
          correct++;index++;choice=-1;draw();
        }else{
          toast(L("tryAgain"),{tone:"warning"});choice=-1;draw();
        }
      },"btn btn-primary");check.disabled=choice<0;surface.append(check);
    };
    draw();
  }

  async function openLine(id,{course=null}={}){
    id=cleanLine(id);if(!id)return;
    await load();
    const line=lineData(id);
    let index=0;
    const surface=openModal(displayTitle(id));
    const draw=()=>{
      clear(surface);header(surface,displayTitle(id));
      const cards=line.cards;
      surface.append(create("h3","guide-section-title",L("cards")));
      if(cards.length){
        const card=cards[index%cards.length];
        const slide=create("article","guide-learning-card");
        slide.append(create("span","guide-kicker",String(index+1)+" / "+String(cards.length)),
          create("h4","",caption(card,getLang())),create("p","",caption(card,getLang(),"body")));
        surface.append(slide);
        if(course)safeStorage(storageKey("view_"+course),"1");
        const actions=create("div","guide-actions");
        actions.append(button(L("previous"),()=>{index=(index+cards.length-1)%cards.length;draw()}),
          button(L("next"),()=>{index=(index+1)%cards.length;draw()},"btn btn-primary"));
        surface.append(actions);
        swipe(slide,()=>{index=(index+cards.length-1)%cards.length;draw()},()=>{index=(index+1)%cards.length;draw()});
      }else surface.append(create("p","guide-empty",L("approvedPending")));
      surface.append(create("h3","guide-section-title",L("work")));
      if(line.photos.length){
        const photos=create("div","guide-photo-strip");
        line.photos.forEach(photo=>{
          const img=imgOrFallback(photo.preview_url||photo.signed_url,caption(photo,getLang(),"caption")||L("work"),"guide-photo-thumb");
          img.setAttribute("role","button");img.tabIndex=0;
          img.addEventListener("click",()=>showPhoto(photo));
          img.addEventListener("keydown",e=>{if(e.key==="Enter")showPhoto(photo)});
          photos.append(img);
        });surface.append(photos);
      }else surface.append(create("p","guide-empty",L("noPhotos")));
      surface.append(create("h3","guide-section-title",L("scripts")));
      if(line.scripts.length){
        line.scripts.forEach(script=>{
          const row=create("div","guide-script");
          row.append(create("p","",caption(script,getLang(),"body")||caption(script,getLang(),"text")),
            button(L("copy"),()=>copyScript(script),"btn btn-secondary btn-small"));
          surface.append(row);
        });
      }else surface.append(create("p","guide-empty",L("noScripts")));
      surface.append(create("h3","guide-section-title",L("faqs")));
      if(line.faqs.length)line.faqs.forEach(faq=>{
        const d=document.createElement("details");d.className="guide-faq";
        d.append(create("summary","",caption(faq,getLang(),"question")),create("p","",caption(faq,getLang(),"answer")));
        surface.append(d);
      });else surface.append(create("p","guide-empty",L("noFaq")));
      if(course){
        const cta=create("div","guide-actions");
        cta.append(button(L("quiz"),()=>openQuiz(id,course),"btn btn-secondary"),button(L("official"),()=>{closeModal();onNavigate("training",{focusModule:course})},"btn btn-primary"));
        surface.append(cta);
      }
    };
    draw();
  }
  function renderHandbook(){
    const page=create("div","page-shell guide-handbook");
    page.append(create("h1","screen-title",L("handbook")),create("p","screen-subtitle",L("handbookSub")));
    const grid=create("div","guide-line-grid");
    PRODUCT_LINES.forEach(id=>{
      const row=button("",()=>openLine(id),"guide-line-card");
      const mediaNode=imgOrFallback(media().icons?.[id],"","guide-icon-motion");
      if(!mediaNode.querySelector("img"))mediaNode.append(createIcon("flower2",{size:27}));
      row.append(mediaNode,create("strong","",displayTitle(id)),createIcon("arrowRight",{size:17}));
      grid.append(row);
    });page.append(grid);
    stagger(grid.children,{step:28,max:5});
    return page;
  }
  function renderRoadmap(){
    const data=getData()||{},rows=roadmapState(data),completed=rows.filter(x=>x.passed).length;
    const card=create("section","guide-roadmap");
    const top=create("div","guide-roadmap-top");
    const ring=create("div","guide-progress-ring");ring.style.setProperty("--percentage",String(completed/7*100));
    ring.setAttribute("role","progressbar");ring.setAttribute("aria-valuemin","0");ring.setAttribute("aria-valuemax","7");ring.setAttribute("aria-valuenow",String(completed));
    ring.setAttribute("aria-label",L("guide"));ring.append(create("strong","",String(completed)+"/7"));
    const copy=create("div","guide-roadmap-copy");
    copy.append(create("h2","",L("guide")),create("p","",L("guideSub")),create("small","",String(completed)+"/7 "+L("progress")));
    top.append(copy,ring);card.append(top);
    const steps=create("div","guide-day-list");
    rows.forEach(row=>{
      const step=create("article","guide-day"+(row.passed?" is-done":row.unlocked?" is-current":" is-locked"));
      const tag=create("span","guide-day-label",getLang()==="zh"?L("day")+row.day+" 天":L("day")+" "+row.day);
      const course=create("div","guide-day-content");
      const courseName=(getLang()==="zh"?row.course?.title_zh:row.course?.title_en)||row.code;
      course.append(tag,create("strong","",courseName),
        create("small","",row.passed?L("done"):row.unlocked?L("current"):L("locked")));
      const action=button(row.passed?L("done"):L("learn"),()=>openLine(row.handbookSection,{course:row.code}),"guide-day-action");
      action.disabled=!row.unlocked;
      const training=button(L("official"),()=>onNavigate("training",{focusModule:row.code}),"guide-day-course");
      training.disabled=!row.unlocked;
      step.append(course,action);if(row.unlocked&&!row.passed){
        const quizButton=button(L("quiz"),()=>{load().then(()=>openQuiz(row.handbookSection,row.code))},"guide-day-course");
        step.append(quizButton,training);
      }
      steps.append(step);
    });
    card.append(steps);
    const handbook=button(L("startHandbook"),()=>onNavigate("handbook"),"btn btn-secondary btn-wide");
    card.append(handbook);
    if(completed===7&&safeStorage(storageKey("roadmap_celebrated"))!=="1"){
      safeStorage(storageKey("roadmap_celebrated"),"1");celebrate(ring,L("done"));
      const animation=safeMedia(media().celebrate);
      if(animation&&!reduced()){
        const layer=imgOrFallback(animation,"","guide-celebrate");
        document.body.append(layer);setTimeout(()=>layer.remove(),1700);
      }
    }
    return card;
  }
  function emptyAction(kind){
    const box=create("section","guide-help-empty");
    box.append(createIcon("sparkles",{size:23}),create("p","",L(kind==="customers"?"noCustomers":"noOrders")));
    box.append(button(L(kind==="customers"?"startTraining":"startHandbook"),()=>kind==="customers"?onNavigate("training",{focusModule:"QUALIFY"}):onNavigate("handbook"),"btn btn-primary"));
    return box;
  }
  function showTour(page,selectors){
    if(document.querySelector(".guide-modal"))return;
    if(safeStorage(storageKey("tour_"+page))==="1"){if(page==="today")showAITips(page);return}
    const targets=(selectors||[]).map(([selector,label])=>[document.querySelector(selector),label]).filter(([node])=>node&&node.getBoundingClientRect().width>0).slice(0,3);
    if(!targets.length)return;
    closeTour();
    let index=0;
    const layer=create("div","guide-tour-layer");layer.setAttribute("role","dialog");layer.setAttribute("aria-modal","true");
    document.body.append(layer);tourLayer=layer;
    const exit=()=>{safeStorage(storageKey("tour_"+page),"1");closeTour();if(page==="today")showAITips(page)};
    const draw=()=>{
      clear(layer);
      const [target,key]=targets[index],rect=target.getBoundingClientRect();
      const spot=create("div","guide-spotlight");
      spot.style.left=Math.max(6,rect.left-6)+"px";spot.style.top=Math.max(6,rect.top-6)+"px";
      spot.style.width=Math.min(innerWidth-12,rect.width+12)+"px";spot.style.height=rect.height+12+"px";
      const tip=create("div","guide-tour-tip");
      tip.append(create("span","guide-kicker",String(index+1)+" / "+targets.length),
        create("p","",L(key)));
      const buttons=create("div","guide-actions");
      buttons.append(button(L("tourSkip"),exit,"btn btn-text btn-small"),
        button(index===targets.length-1?L("tourDone"):L("tourNext"),()=>{index++;if(index===targets.length)exit();else draw()},"btn btn-primary btn-small"));
      tip.append(buttons);layer.append(spot,tip);
    };
    draw();
  }
  function closeTour(){tourLayer?.remove();tourLayer=null}
  function showAITips(page){
    aiTips?.remove();aiTips=null;
    if(safeStorage(storageKey("ai_tips_"+page))==="1")return;
    const box=create("div","guide-ai-tips");box.append(create("strong","",L("hintsTitle")));
    const exit=button("×",()=>{safeStorage(storageKey("ai_tips_"+page),"1");box.remove()},"guide-close");
    box.append(exit);
    ["hint1","hint2","hint3"].forEach(key=>box.append(button(L(key),()=>{
      safeStorage(storageKey("ai_tips_"+page),"1");box.remove();document.dispatchEvent(new CustomEvent("ew-ai-ask",{detail:L(key)}));
    },"guide-ai-suggestion")));
    document.body.append(box);aiTips=box;
  }
  function destroy(){closeModal();closeTour();aiTips?.remove();aiTips=null}
  return {load,showOnboardingOnce,renderRoadmap,renderHandbook,openLine,showTour,showAITips,emptyAction,destroy};
}
