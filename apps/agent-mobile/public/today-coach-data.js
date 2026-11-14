import {addDateDays,kuchingDateKey} from "./date.js";

const PROGRESS_KEYS=["orders","qualified_leads","quotes","followups"];

function count(value){
  if(typeof value!=="number"&&typeof value!=="string")return null;
  if(typeof value==="string"&&!value.trim())return null;
  const n=Number(value);
  return Number.isSafeInteger(n)&&n>=0?n:null;
}

// Counts come only from the server's mission and today's recorded activity.
// Incomplete dashboard data is unavailable; it must never become a 0/0 win.
export function todayProgress(data){
  const mission=data?.mission,actual=data?.today_progress,items=[];
  if(mission&&actual){
    for(const key of PROGRESS_KEYS){
      const target=count(mission["target_"+key]),value=count(actual[key]);
      if(target!==null&&value!==null)items.push({key,done:Math.min(value,target),target});
    }
  }
  const done=items.reduce((sum,item)=>sum+item.done,0);
  const total=items.reduce((sum,item)=>sum+item.target,0);
  return {available:items.length===PROGRESS_KEYS.length&&total>0,done,total,items};
}

export function isLiveAI(response){
  return response?.ok!==false&&response?.provider==="gemini";
}

function dateKey(value){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const date=new Date(value+"T00:00:00.000Z");
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?value:null;
}

// A weekly plan's day number is meaningful only inside its actual dated week.
// Never wrap this Sunday's plan back to the previous Monday as "tomorrow".
export function tomorrowFocus(response,now=Date.now()){
  if(!isLiveAI(response))return null;
  const plan=response?.plan;
  if(!plan||!Array.isArray(plan.days))return null;
  const start=dateKey(plan.week_start??response.week_start);
  if(!start||new Date(start+"T00:00:00.000Z").getUTCDay()!==1)return null;
  if(plan.week_start&&response.week_start&&plan.week_start!==response.week_start)return null;
  let tomorrow;
  try{tomorrow=addDateDays(kuchingDateKey(now),1)}catch{return null}
  const offset=(Date.parse(tomorrow+"T00:00:00.000Z")-Date.parse(start+"T00:00:00.000Z"))/86400000;
  if(!Number.isInteger(offset)||offset<0||offset>6)return null;
  const matches=plan.days.filter(item=>item&&Number(item.day)===offset+1);
  if(matches.length!==1)return null;
  const item=matches[0];
  if(typeof item.focus!=="string"||!item.focus.trim()||!Array.isArray(item.actions))return null;
  return item;
}

function leadRows(value){return Array.isArray(value)?value:[]}

// Keep rows from the authenticated dashboard, merging richer fields by ID.
// No names, example leads, statuses, streaks or scores are manufactured.
export function coachLeads(data){
  const map=new Map();
  for(const row of [...leadRows(data?.phase1?.due_followups),...leadRows(data?.phase1?.recent_leads),...leadRows(data?.recent_leads)]){
    if(!row||typeof row!=="object"||typeof row.id!=="string"||!row.id.trim())continue;
    const id=row.id.trim();
    map.set(id,{...map.get(id),...row,id});
  }
  return [...map.values()];
}

export function dueLeads(data){
  const dueIds=new Set(leadRows(data?.phase1?.due_followups).map(row=>row?.id).filter(id=>typeof id==="string"&&id.trim()).map(id=>id.trim()));
  return coachLeads(data).filter(row=>dueIds.has(row.id)&&!["won","lost","archived"].includes(row.status));
}
