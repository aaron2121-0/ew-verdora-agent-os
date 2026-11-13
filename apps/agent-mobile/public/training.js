import {clear,element,progress,toast,vibrate,setButtonLoading,stagger} from "./components.js";
import {createIcon} from "./icons.js";
import {buildUnlockChecklist,getUnlockProgress} from "./unlock.js";

const SKILLS=["LEAD-FINDING","QUALIFY","REFERENCE","OBJECTION","CLOSING","PAYMENT"];
const skillKey=s=>({
  "LEAD-FINDING":"skillLeadFinding","QUALIFY":"skillQualify","REFERENCE":"skillReference",
  "OBJECTION":"skillObjection","CLOSING":"skillClosing","PAYMENT":"skillPayment"
}[s]||s);

function pct(v){return v==null?"—":Math.round(Number(v)*100)+"%"}
function score(v){return v==null?"—":Math.round(Number(v))+"%"}
function moduleStatus(value,tr){
  const key={assigned:"trainingAssigned",in_progress:"trainingInProgress",failed:"trainingFailed",waived:"trainingWaived",passed:"passed"}[String(value||"")];
  return key?tr(key):String(value||"—");
}

export function createTrainingUI({getData,getLang,tr,api,onSummary}){
  let host=null;
  let today=null;
  let exam=null;
  let feedback=null;
  let examFeedback=null;
  let result=null;
  let examResult=null;
  let loading=false;
  let timer=null;
  let clockOffset=0;
  let timeoutSubmitting=false;
  let expandedModule=null;
  let handbookModuleOpen=null;
  let handbookLoading=false;
  let handbookError=null;
  const handbookCache=new Map();

  function lang(en,zh){return getLang()==="zh"?zh:en}
  function stopTimer(){if(timer){clearInterval(timer);timer=null}}
  function setClock(serverNow){if(serverNow)clockOffset=Date.parse(serverNow)-Date.now()}
  function serverNow(){return Date.now()+clockOffset}

  async function call(body){
    const j=await api.training(body);
    setClock(j.server_now);
    return j;
  }

  async function loadSummary(){
    if(loading)return;
    loading=true;render();
    try{
      const j=await call({action:"today",start:false});
      today=j.today||null;
      onSummary?.(today);
      feedback=null;result=null;
    }catch(e){toast(api.friendlyError(e?.message),{tone:"danger"})}
    finally{loading=false;render()}
  }

  async function startDaily(){
    if(loading)return;
    loading=true;render();
    try{
      const j=await call({action:"today",start:true});
      today=j.today||null;onSummary?.(today);feedback=null;result=null;
      vibrate(8);
    }catch(e){toast(api.friendlyError(e?.message),{tone:"danger"})}
    finally{loading=false;render()}
  }

  async function answerDaily(index,{timeout=false}={}){
    if(loading||!today?.question)return;
    loading=true;stopTimer();render();
    try{
      const j=await call({action:"answer",position:today.question.position,selected_index:index});
      feedback=j.answer||null;
      if(feedback?.timed_out)vibrate([20,40,20]);else vibrate(feedback?.correct?12:[20,40,20]);
    }catch(e){toast(api.friendlyError(e?.message),{tone:"danger"});if(timeout)timeoutSubmitting=false}
    finally{loading=false;render()}
  }

  async function nextDaily(){
    if(loading)return;
    if(Number(feedback?.answered||0)>=5){
      loading=true;render();
      try{
        const j=await call({action:"finish"});
        result=j.result||null;
        const s=await call({action:"today",start:false});today=s.today||today;onSummary?.(today);
      }catch(e){toast(api.friendlyError(e?.message),{tone:"danger"})}
      finally{loading=false;feedback=null;render()}
      return;
    }
    feedback=null;
    await startDaily();
  }

  async function startExam(){
    if(loading)return;
    loading=true;render();
    try{
      const j=await call({action:"exam_start"});
      exam=j.exam||null;examFeedback=null;examResult=null;
      vibrate(8);
    }catch(e){toast(api.friendlyError(e?.message),{tone:"danger"})}
    finally{loading=false;render()}
  }

  async function answerExam(index,{timeout=false}={}){
    if(loading||!exam?.question||!exam?.attempt_id)return;
    loading=true;stopTimer();render();
    try{
      const j=await call({action:"exam_answer",attempt_id:exam.attempt_id,position:exam.question.position,selected_index:index});
      examFeedback=j.answer||null;
      vibrate(examFeedback?.correct?12:[20,40,20]);
    }catch(e){toast(api.friendlyError(e?.message),{tone:"danger"});if(timeout)timeoutSubmitting=false}
    finally{loading=false;render()}
  }

  async function nextExam(){
    if(loading)return;
    if(Number(examFeedback?.answered||0)>=20){
      loading=true;render();
      try{
        const j=await call({action:"exam_finish",attempt_id:exam.attempt_id});
        examResult=j.result||null;exam=null;
        const s=await call({action:"today",start:false});today=s.today||today;
      }catch(e){toast(api.friendlyError(e?.message),{tone:"danger"})}
      finally{loading=false;examFeedback=null;render()}
      return;
    }
    examFeedback=null;
    await startExam();
  }

  function header(){
    const h=element("div",{className:"screen-header"});
    const copy=element("div");
    copy.append(element("h1",{className:"screen-title",text:tr("trainingTitle")}),
      element("p",{className:"screen-subtitle",text:tr("trainingPhase3Subtitle")}));
    h.append(copy);
    return h;
  }

  function dailyHero(){
    const card=element("section",{className:"training3-hero"});
    const top=element("div",{className:"training3-hero-top"});
    const icon=element("span",{className:"training3-hero-icon"});icon.append(createIcon("target",{size:22}));
    const copy=element("div");
    copy.append(element("span",{text:tr("dailyTraining")}),
      element("strong",{text:today?.status==="completed"?tr("dailyCompleted"):tr("fiveQuestionsToday")}));
    top.append(icon,copy);
    const streak=element("div",{className:"training3-streak"});
    streak.append(element("strong",{text:String(Number(today?.streak||0))}),element("span",{text:tr("dayStreak")}));
    card.append(top,streak);
    const meta=element("div",{className:"training3-meta"});
    meta.append(element("span",{text:tr("dailyPassRule")}),element("span",{text:tr("serverTimed45")}));
    card.append(meta,element("small",{className:"training3-daily-note",text:tr("unlockDailyNote")}));
    return card;
  }

  function skills(){
    const card=element("section",{className:"training3-card"});
    const head=element("div",{className:"training3-section-head"});
    head.append(element("h2",{text:tr("skillAccuracy")}),element("small",{text:tr("adaptiveReview")}));
    card.append(head);
    const by=new Map((today?.skills||[]).map(x=>[x.skill,x]));
    const grid=element("div",{className:"skill-bars"});
    SKILLS.forEach(s=>{
      const d=by.get(s)||{},row=element("div",{className:"skill-bar-row"});
      const top=element("div",{className:"skill-bar-top"});
      top.append(element("span",{text:tr(skillKey(s))}),element("strong",{text:pct(d.accuracy)}));
      const p=progress(d.accuracy==null?0:Number(d.accuracy));
      row.append(top,p.lastChild,element("small",{text:tr("skillAnswers",{count:Number(d.answers||0)})}));
      grid.append(row);
    });
    card.append(grid);return card;
  }

  function expandModule(code){
    expandedModule=expandedModule===code?null:code;
    render();
    if(expandedModule)requestAnimationFrame(()=>{
      const node=[...host.querySelectorAll("[data-course]")].find(x=>x.dataset.course===code);
      node?.scrollIntoView({behavior:"smooth",block:"start"});
      node?.focus({preventScroll:true});
    });
  }


  async function toggleHandbook(code,section){
    if(handbookLoading)return;
    if(handbookModuleOpen===code){handbookModuleOpen=null;render();return}
    handbookModuleOpen=code;handbookError=null;
    if(handbookCache.has(section)){render();return}
    handbookLoading=true;render();
    try{
      const j=await api.agent({action:"handbook",section});
      handbookCache.set(section,Array.isArray(j.entries)?j.entries:[]);
    }catch(e){
      handbookError=section;
      toast(api.friendlyError(e?.message),{tone:"danger"});
    }finally{handbookLoading=false;render()}
  }

  const sectionName=section=>tr(({
    story:"handbookSectionStory",product_line:"handbookSectionProductLine",
    service_rule:"handbookSectionServiceRule",delivery:"handbookSectionDelivery",
    script:"handbookSectionScript",announcement:"handbookSectionAnnouncement"
  })[section]||"handbookSectionProductLine");

  function modules(){
    const card=element("section",{className:"training3-card"});
    const head=element("div",{className:"training3-section-head"});
    head.append(element("h2",{text:tr("requiredModules")}),element("small",{text:tr("examRequiresModules")}));
    card.append(head);
    const list=element("div",{className:"training3-modules"});
    const rows=getData()?.training||[];
    rows.forEach(x=>{
      const mod=x.training_modules||{},code=String(mod.code||"");
      const item=element("article",{className:"training3-course-item",attrs:{"data-course":code,tabindex:"-1"}});
      const r=element("div",{className:"training3-module"});
      const left=element("div");
      left.append(element("strong",{text:getLang()==="zh"?mod.title_zh:mod.title_en}),
        element("small",{text:moduleStatus(x.status,tr)+" · "+Number(x.best_score||0)+"/100"}));
      r.append(left);
      if(x.status==="passed")r.append(element("span",{className:"badge badge-success",text:tr("passed")}));
      // Passed courses also remain readable as handbook reference.
      const b=element("button",{className:"btn btn-secondary btn-small",attrs:{type:"button","aria-expanded":expandedModule===code?"true":"false"}});
      b.append(createIcon("graduationCap",{size:16}),element("span",{text:expandedModule===code?tr("unlockCourseClose"):tr("unlockCourseRead")}));
      b.addEventListener("click",()=>expandModule(code));
      r.append(b);
      item.append(r);
      if(expandedModule===code){
        const detail=element("div",{className:"training3-course-content"});
        const content=(getLang()==="zh"?mod.content_zh:mod.content_en)||{};
        for(const [key,title] of [["lesson","unlockCourseContent"],["must_not","unlockCourseMustNot"]]){
          const values=Array.isArray(content?.[key])?content[key]:[];
          if(!values.length)continue;
          detail.append(element("strong",{className:"training3-course-section",text:tr(title)}));
          const ul=element("ul",{className:"training3-course-list"});
          values.forEach(line=>ul.append(element("li",{text:String(line)})));
          detail.append(ul);
        }
        if(x.status!=="passed"){
          const practice=element("button",{className:"btn btn-text btn-small",attrs:{type:"button"}});
          practice.append(createIcon("graduationCap",{size:16}),element("span",{text:tr("practice")}));
          practice.addEventListener("click",()=>api.openPractice(code));
          detail.append(practice);
        }
        const section=String(mod.handbook_section||"");
        if(section){
          const handbookButton=element("button",{className:"btn btn-secondary btn-small training3-handbook-button",
            attrs:{type:"button","aria-expanded":handbookModuleOpen===code?"true":"false",disabled:handbookLoading}});
          handbookButton.append(createIcon("bookOpen",{size:16}),
            element("span",{text:tr("handbookReadFirst",{section:sectionName(section)})}));
          handbookButton.addEventListener("click",()=>toggleHandbook(code,section));
          detail.append(handbookButton);
          if(handbookModuleOpen===code){
            const panel=element("section",{className:"training3-handbook-panel",attrs:{"aria-live":"polite"}});
            if(handbookLoading)panel.append(element("p",{text:tr("handbookLoading")}));
            else if(handbookError===section)panel.append(element("p",{text:tr("handbookLoadError")}));
            else{
              const entries=handbookCache.get(section)||[];
              if(!entries.length)panel.append(element("p",{text:tr("handbookEmpty")}));
              entries.forEach(row=>{
                const article=element("article",{className:"training3-handbook-entry"});
                article.append(element("h3",{text:getLang()==="zh"?row.title_zh:row.title_en}),
                  element("p",{text:getLang()==="zh"?row.body_zh:row.body_en}));
                panel.append(article);
              });
            }
            detail.append(panel);
          }
        }
        item.append(detail);
      }
      list.append(item);
    });
    card.append(list);return card;
  }

  function examCard(){
    const remaining=Number(today?.remaining_required??(getData()?.training||[]).filter(x=>x.status!=="passed").length);
    const passed=Boolean(today?.exam_passed);
    const card=element("section",{className:"training3-card exam-entry",attrs:{id:"training-exam-entry"}});
    const top=element("div",{className:"exam-entry-top"});
    const ico=element("span");ico.append(createIcon("trophy",{size:22}));
    const copy=element("div");
    copy.append(element("strong",{text:tr("certificationExam")}),
      element("span",{text:passed?tr("examPassedAlready"):tr("examRule")}));
    top.append(ico,copy);card.append(top);
    if(!passed){
      const b=element("button",{className:"btn btn-primary btn-wide",attrs:{type:"button",disabled:remaining>0}});
      b.append(createIcon("trophy",{size:18}),element("span",{text:remaining>0?tr("completeModulesFirst",{count:remaining}):tr("startExam")}));
      b.addEventListener("click",startExam);card.append(b);
    }
    return card;
  }

  function timerNode(deadline,onTimeout){
    const wrap=element("div",{className:"training3-timer",attrs:{role:"timer"}});
    const ring=element("span",{className:"training3-timer-ring"});
    const text=element("strong",{text:"45"});ring.append(text);
    wrap.append(ring,element("span",{text:tr("secondsLeft")}));
    stopTimer();timeoutSubmitting=false;
    const tick=()=>{
      const ms=Math.max(0,Date.parse(deadline)-serverNow());
      const sec=Math.max(0,Math.ceil(ms/1000));
      text.textContent=String(sec);
      ring.style.setProperty("--time",String(Math.max(0,Math.min(1,ms/45000))));
      ring.classList.toggle("urgent",sec<=10);
      if(ms<=0&&!timeoutSubmitting){
        timeoutSubmitting=true;stopTimer();
        setTimeout(()=>onTimeout(),160);
      }
    };
    tick();timer=setInterval(tick,250);
    return wrap;
  }

  function questionCard(q,total,onAnswer,isExam=false){
    const page=element("div",{className:"training3-question-view"});
    const top=element("div",{className:"training3-question-top"});
    const pos=Number(q.position||1);
    top.append(element("span",{className:"badge badge-gold",text:tr("questionOf",{current:pos,total})}),
      element("span",{className:"training3-skill-chip",text:tr(skillKey(q.skill))}));
    page.append(top,progress(pos/total).lastChild,
      timerNode(q.deadline_at,()=>onAnswer(0,{timeout:true})));
    const card=element("section",{className:"training3-question-card"});
    card.append(element("h2",{text:lang(q.question_en,q.question_zh)}));
    const opts=element("div",{className:"training3-options"});
    const arr=getLang()==="zh"?q.options_zh:q.options_en;
    (arr||[]).forEach((v,i)=>{
      const b=element("button",{className:"training3-option",attrs:{type:"button",disabled:loading}});
      b.append(element("span",{className:"training3-option-letter",text:String.fromCharCode(65+i)}),element("span",{text:String(v)}));
      b.addEventListener("click",()=>onAnswer(i));
      opts.append(b);
    });
    card.append(opts);page.append(card);
    const note=element("div",{className:"training3-server-note"});
    note.append(createIcon("clock",{size:15}),element("span",{text:tr(isExam?"examServerTimeNote":"dailyServerTimeNote")}));
    page.append(note);return page;
  }

  function feedbackCard(f,onNext,nextLabel){
    const page=element("div",{className:"training3-feedback-view"});
    const ok=Boolean(f?.correct)&&!f?.timed_out;
    const hero=element("section",{className:"training3-feedback "+(ok?"correct":"wrong")});
    const ico=element("span");ico.append(createIcon(ok?"circleCheck":"circleHelp",{size:28}));
    hero.append(ico,element("strong",{text:f?.timed_out?tr("timeUp"):ok?tr("answerCorrect"):tr("answerWrong")}),
      element("p",{text:lang(f?.explanation_en||"",f?.explanation_zh||"")}));
    page.append(hero);
    const b=element("button",{className:"btn btn-primary btn-wide",attrs:{type:"button"}});
    b.append(createIcon("arrowRight",{size:18}),element("span",{text:nextLabel}));
    b.addEventListener("click",onNext);page.append(b);return page;
  }

  function resultCard(r,isExam=false){
    const page=element("div",{className:"training3-result-view"});
    const pass=Boolean(r?.passed);
    const hero=element("section",{className:"training3-result "+(pass?"passed":"failed")});
    hero.append(createIcon(pass?"trophy":"target",{size:32}),
      element("span",{text:isExam?tr("examResult"):tr("dailyResult")}),
      element("strong",{text:score(r?.score)}),
      element("p",{text:pass?tr(isExam?"examPassText":"dailyPassText"):tr(isExam?"examFailText":"dailyFailText")}));
    page.append(hero);
    const b=element("button",{className:"btn btn-secondary btn-wide",text:tr("backToTraining"),attrs:{type:"button"}});
    b.addEventListener("click",()=>{result=null;examResult=null;exam=null;feedback=null;examFeedback=null;loadSummary()});
    page.append(b);return page;
  }

  function home(){
    const page=element("div",{className:"page-shell training3-shell"});
    page.append(header());
    const state=getUnlockProgress(getData(),today);
    if(state.agentStatus==="trainee"||state.agentStatus==="recovery"||state.showRestriction||state.completed<state.total){
      page.append(buildUnlockChecklist({data:getData(),summary:today,tr,
        onCourse:code=>expandModule(code),
        onExam:()=>document.getElementById("training-exam-entry")?.scrollIntoView({behavior:"smooth",block:"center"})
      }));
    }
    page.append(dailyHero(),skills());
    if(today?.status==="completed"){
      const done=element("section",{className:"training3-daily-done"});
      done.append(createIcon(today?.passed?"circleCheck":"target",{size:22}),
        element("div",{className:"training3-done-copy"}));
      done.lastChild.append(element("strong",{text:tr("todayScore",{score:Math.round(Number(today.score||0))})}),
        element("span",{text:today?.passed?tr("dailyPassText"):tr("dailyFailText")}));
      page.append(done);
    }else{
      const start=element("button",{className:"btn btn-primary btn-wide training3-start",attrs:{type:"button",disabled:loading}});
      start.append(createIcon("target",{size:19}),element("span",{text:today?.status==="active"?tr("resumeDaily"):tr("startDaily")}));
      start.addEventListener("click",startDaily);page.append(start);
    }
    page.append(examCard(),modules());
    return page;
  }

  function render(){
    if(!host)return;
    stopTimer();clear(host);
    if(loading&&!today&&!exam){
      const shell=element("div",{className:"page-shell training3-shell"});
      shell.append(header(),element("div",{className:"training3-loading",text:tr("loading")}));
      host.append(shell);return;
    }
    let view;
    if(examResult)view=resultCard(examResult,true);
    else if(result)view=resultCard(result,false);
    else if(examFeedback)view=feedbackCard(examFeedback,nextExam,Number(examFeedback.answered||0)>=20?tr("finishExam"):tr("nextQuestion"));
    else if(exam?.question)view=questionCard(exam.question,20,answerExam,true);
    else if(feedback)view=feedbackCard(feedback,nextDaily,Number(feedback.answered||0)>=5?tr("finishDaily"):tr("nextQuestion"));
    else if(today?.question)view=questionCard(today.question,5,answerDaily,false);
    else view=home();
    host.append(view);
    stagger(host.querySelectorAll(".training3-card,.skill-bar-row,.training3-module"),{step:25,max:10});
  }

  async function open(target,{focusModule=null,focusExam=false}={}){
    host=target||host;
    if(focusModule)expandedModule=focusModule;
    render();
    if(!today)await loadSummary();
    else render();
    if(focusModule||focusExam)requestAnimationFrame(()=>{
      const node=focusModule?[...host.querySelectorAll("[data-course]")].find(x=>x.dataset.course===focusModule):host.querySelector("#training-exam-entry");
      node?.scrollIntoView({behavior:"smooth",block:"start"});
      node?.focus?.({preventScroll:true});
    });
  }
  function onLanguageChange(){render()}
  function onForeground(){
    if(!host?.classList.contains("active"))return;
    if(today?.status==="active"||exam?.status==="active") {
      if(exam)startExam(); else startDaily();
    }
  }
  function destroy(){stopTimer()}
  return {open,onLanguageChange,onForeground,destroy,render};
}
