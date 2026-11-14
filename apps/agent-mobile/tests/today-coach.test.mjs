import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {todayProgress,tomorrowFocus,coachLeads,dueLeads,isLiveAI} from "../public/today-coach-data.js";

const dashboard=()=>({
  mission:{target_orders:1,target_qualified_leads:3,target_quotes:2,target_followups:4},
  today_progress:{orders:0,qualified_leads:2,quotes:1,followups:7}
});
const week=(start="2026-11-09")=>({ok:true,provider:"gemini",plan:{week_start:start,days:Array.from({length:7},(_,i)=>({day:i+1,focus:"returned focus "+(i+1),actions:["returned action "+(i+1)],channel:"whatsapp"}))}});

test("today coach progress sums real mission counts and caps recorded overachievement",()=>{
  assert.deepEqual(todayProgress(dashboard()),{available:true,done:7,total:10,items:[
    {key:"orders",done:0,target:1},{key:"qualified_leads",done:2,target:3},
    {key:"quotes",done:1,target:2},{key:"followups",done:4,target:4}
  ]});
});

test("today coach progress does not manufacture missing or invalid dashboard counts",()=>{
  for(const data of [null,{}, {mission:dashboard().mission},{today_progress:dashboard().today_progress}]){
    assert.deepEqual(todayProgress(data),{available:false,done:0,total:0,items:[]});
  }
  for(const invalid of [null,undefined,"",false,-1,1.5,Infinity,"bad"]){
    const data=dashboard();data.today_progress.quotes=invalid;
    const result=todayProgress(data);
    assert.equal(result.available,false);
    assert.equal(result.items.some(x=>x.key==="quotes"),false);
  }
  const noMission=dashboard();for(const key of Object.keys(noMission.mission))noMission.mission[key]=0;
  assert.equal(todayProgress(noMission).available,false);
  const withLocal=dashboard();withLocal.localTasks={kit:true,followup:true};
  assert.deepEqual(todayProgress(withLocal),todayProgress(dashboard()));
});

test("AI advice must be an actual Gemini response, including cached responses",()=>{
  assert.equal(isLiveAI({provider:"gemini",cached:true}),true);
  for(const response of [null,{}, {provider:"fallback"},{provider:"template"},{provider:"gemini",ok:false}])assert.equal(isLiveAI(response),false);
});

test("tomorrow focus respects Kuching dates rather than host UTC weekday",()=>{
  const response=week();
  // 16:30Z on Wednesday is already Thursday in Kuching: tomorrow is Friday.
  assert.deepEqual(tomorrowFocus(response,Date.parse("2026-11-11T16:30:00Z")),response.plan.days[4]);
  assert.deepEqual(tomorrowFocus(response,Date.parse("2026-11-11T15:59:00Z")),response.plan.days[3]);
});

test("tomorrow focus never relabels this week's Monday as next Monday",()=>{
  const response=week();
  assert.equal(tomorrowFocus(response,Date.parse("2026-11-15T06:00:00Z")),null);
  const actualNextWeek=week("2026-11-16");
  assert.deepEqual(tomorrowFocus(actualNextWeek,Date.parse("2026-11-15T06:00:00Z")),actualNextWeek.plan.days[0]);
});

test("tomorrow focus rejects stale, invalid, mismatched or fallback plans",()=>{
  const now=Date.parse("2026-11-11T06:00:00Z");
  for(const response of [null,{}, {...week(),provider:"fallback"},week("2026-11-02"),week("2026-11-10"),week("2026-02-30"),{...week(),week_start:"2026-11-16"}])assert.equal(tomorrowFocus(response,now),null);
  const duplicate=week();duplicate.plan.days.push(duplicate.plan.days[3]);
  assert.equal(tomorrowFocus(duplicate,now),null);
  assert.equal(tomorrowFocus(week(),"bad date"),null);
});

test("coach leads deduplicate real IDs and preserve actual server metadata",()=>{
  const data={phase1:{due_followups:[{id:"one",customer_label:"Real customer",status:"follow_up"},{id:"closed",status:"lost"}],recent_leads:[{id:"one",quote_id:"q1"},{id:"two",status:"new"}]},recent_leads:[{id:"one",loss_reason:null},{id:" ",customer_label:"invalid"},null]};
  const rows=coachLeads(data);
  assert.equal(rows.length,3);
  assert.deepEqual(rows.find(row=>row.id==="one"),{id:"one",customer_label:"Real customer",status:"follow_up",quote_id:"q1",loss_reason:null});
  assert.deepEqual(dueLeads(data).map(row=>row.id),["one"]);
  assert.deepEqual(coachLeads({}),[]);
});

test("today coach render source contains no design demonstrations or unsafe HTML insertion",()=>{
  const source=fs.readFileSync(new URL("../public/today-coach.js",import.meta.url),"utf8");
  assert.doesNotMatch(source,/Demo Agent|6\s*天连胜|6-day streak|今天联系\s*3\s*位老客户|demo\s*(?:data|customer)/i);
  assert.doesNotMatch(source,/innerHTML\s*=|insertAdjacentHTML|document\.write\s*\(/);
  const dataSource=fs.readFileSync(new URL("../public/today-coach-data.js",import.meta.url),"utf8");
  assert.doesNotMatch(dataSource,/localStorage|sessionStorage|Math\.random/);
});
