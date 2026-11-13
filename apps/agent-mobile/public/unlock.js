import {element} from "./components.js";

export const REQUIRED_COURSE_CODES=["CORE-BRAND","LEAD-FINDING","QUALIFY","REFERENCE","OBJECTION","CLOSING","PAYMENT"];
const DONE_STATUS=new Set(["passed"]);
const OPEN_TASK_STATUS=new Set(["pending","open","assigned","in_progress","overdue","required"]);
const SEVERE=new Set(["severe","serious","critical","high"]);

export function getUnlockProgress(data={},summary=null){
  const rows=Array.isArray(data?.training)?data.training:[];
  const byCode=new Map(rows.map(row=>[String(row?.training_modules?.code||""),row]));
  const completed=REQUIRED_COURSE_CODES.filter(code=>DONE_STATUS.has(String(byCode.get(code)?.status||"").toLowerCase())).length;
  const firstIncompleteCode=REQUIRED_COURSE_CODES.find(code=>!DONE_STATUS.has(String(byCode.get(code)?.status||"").toLowerCase()))||null;
  const examPassed=summary?.exam_passed===true||data?.exam_passed===true||data?.phase1?.exam_passed===true;
  const examStatus=examPassed?"passed":completed<REQUIRED_COURSE_CODES.length?"locked":summary?"ready":"checking";
  const tasks=[data?.recovery_tasks,data?.phase1?.recovery_tasks].find(Array.isArray)||[];
  const recoveryTasks=tasks.filter(item=>OPEN_TASK_STATUS.has(String(item?.status||"pending").toLowerCase()));
  const issues=[data?.violations,data?.phase1?.violations,data?.serious_violations].find(Array.isArray)||[];
  const seriousViolations=issues.filter(item=>SEVERE.has(String(item?.severity||item?.level||"").toLowerCase())&&!["resolved","cleared","dismissed"].includes(String(item?.status||"").toLowerCase()));
  const agentStatus=String(data?.agent?.status||"").toLowerCase();
  return {completed,total:REQUIRED_COURSE_CODES.length,firstIncompleteCode,examStatus,recoveryTasks,seriousViolations,agentStatus,
    showRecovery:agentStatus==="recovery"||recoveryTasks.length>0,
    showRestriction:["restricted","suspended"].includes(agentStatus)};
}

function row(number,title,status,{onClick=null,buttonLabel="",hint="",tone="default"}={}){
  const item=element("div",{className:"unlock-step"});
  const index=element("span",{className:"unlock-step-number",text:number});
  const content=element("div",{className:"unlock-step-content"});
  const top=element("div",{className:"unlock-step-heading"});
  top.append(element("strong",{text:title}),element("span",{className:"unlock-step-status unlock-step-status-"+tone,text:status}));
  content.append(top);
  if(hint)content.append(element("small",{className:"unlock-step-hint",text:hint}));
  if(onClick&&buttonLabel){
    const button=element("button",{className:"unlock-step-action",text:buttonLabel,attrs:{type:"button"}});
    button.addEventListener("click",onClick);content.append(button);
  }
  item.append(index,content);return item;
}

export function buildUnlockChecklist({data,summary,tr,onCourse,onExam}){
  const state=getUnlockProgress(data,summary);
  const box=element("section",{className:"unlock-progress-card",attrs:{"aria-label":tr("unlockProgressTitle")}});
  const header=element("div",{className:"unlock-progress-head"});
  const logo=element("img",{className:"unlock-progress-logo",attrs:{src:"/brand-mark.svg",alt:tr("companyLogo")}});
  const label=element("div",{className:"unlock-progress-label"});
  label.append(element("strong",{text:tr("unlockProgressTitle")}),element("small",{text:tr("unlockProgressSubtitle")}));
  const count=element("span",{className:"unlock-progress-count",text:state.completed+"/"+state.total});
  header.append(logo,label,count);box.append(header);
  const track=element("div",{className:"unlock-progress-track",attrs:{role:"progressbar","aria-valuemin":"0","aria-valuemax":String(state.total),"aria-valuenow":String(state.completed),"aria-label":tr("unlockRequiredCourses")}});
  track.append(element("span",{className:"unlock-progress-fill"}));
  track.firstChild.style.width=(state.completed/state.total*100)+"%";
  box.append(track);
  const steps=element("div",{className:"unlock-progress-steps"});
  steps.append(row("①",tr("unlockRequiredCourses"),tr("unlockCourseCount",{done:state.completed,total:state.total}),{
    onClick:state.firstIncompleteCode?()=>onCourse?.(state.firstIncompleteCode):null,
    buttonLabel:state.firstIncompleteCode?tr("unlockOpenNextCourse"):"",
    hint:state.firstIncompleteCode?tr("unlockCourseHint"):"",
    tone:state.firstIncompleteCode?"pending":"done"
  }));
  const examKey={locked:"unlockExamLocked",ready:"unlockExamReady",passed:"unlockExamPassed",checking:"unlockExamChecking"}[state.examStatus];
  steps.append(row("②",tr("certificationExam"),tr(examKey),{
    onClick:state.examStatus==="ready"?()=>onExam?.():null,
    buttonLabel:state.examStatus==="ready"?tr("unlockStartExam"):"",
    tone:state.examStatus==="passed"?"done":state.examStatus==="ready"?"ready":"pending"
  }));
  if(state.showRecovery){
    const count=state.recoveryTasks.length;
    steps.append(row("③",tr("unlockRecoveryTitle"),count?tr("unlockRecoveryCount",{count}):tr("unlockRecoveryRequired"),{
      hint:count?state.recoveryTasks.map(t=>String(t?.title||t?.description||t?.type||"")).filter(Boolean).slice(0,2).join(" · "):tr("unlockRecoveryHint"),tone:"pending"
    }));
  }
  if(state.seriousViolations.length){
    steps.append(row(state.showRecovery?"④":"③",tr("unlockSeriousViolation"),tr("unlockViolationCount",{count:state.seriousViolations.length}),{tone:"pending"}));
  }else if(state.showRestriction){
    steps.append(row(state.showRecovery?"④":"③",tr("unlockRestrictionTitle"),tr("unlockRestrictionPending"),{tone:"pending"}));
  }
  box.append(steps);
  return box;
}
