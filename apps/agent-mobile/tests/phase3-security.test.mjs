import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repoRoot=path.resolve(root,"../..");
const read=p=>fs.readFileSync(p,"utf8");
const sql=read(path.join(repoRoot,"supabase/migrations/20261113_phase3_training_mcq_certification.sql"));
const edge=read(path.join(repoRoot,"supabase/functions/agent-training/index.ts"));
const ui=read(path.join(root,"public/training.js"));

test("Correct answers live only in private question bank",()=>{
  assert.match(sql,/create table if not exists private\.training_questions/i);
  assert.match(sql,/correct_index smallint not null/i);
  assert.match(sql,/revoke all on private\.training_questions from public,anon,authenticated/i);
  assert.equal(/correct_index/.test(ui),false);
});

test("Today and exam_start responses scrub all answer-bearing fields",()=>{
  assert.match(edge,/new Set\(\["correct_index","option_order","question_id"\]\)/);
  assert.match(edge,/!allowFeedback&&\(k==="explanation_en"\|\|k==="explanation_zh"\|\|k==="correct"\|\|k==="timed_out"\)/);
  assert.match(edge,/today:safeQuestionPayload\(data,false\)/);
  assert.match(edge,/exam:safeQuestionPayload\(data,false\)/);
});

test("Daily identity and timing are server authoritative",()=>{
  assert.match(sql,/unique\(agent_id,training_date\)/i);
  assert.match(sql,/md5\(p_agent_id::text\|\|':'\|\|p_date::text\)/);
  assert.match(sql,/deadline_at=now\(\)\+interval '45 seconds'/i);
  assert.match(sql,/v_timeout:=p_now>v_item\.deadline_at/i);
  assert.match(edge,/const day=kuchingToday\(\)/);
  assert.equal(/body\.date/.test(edge),false);
});

test("Daily selection enforces adaptive mix and seven-day exclusion",()=>{
  assert.match(sql,/v_weak_count>=2/);
  assert.match(sql,/v_new_count<2/);
  assert.match(sql,/r\.last_correct=false/);
  assert.match(sql,/interval '7 days'/);
  assert.match(sql,/next_review_on=p_date\+case when not v_correct then 1 when private\.training_review_state\.consecutive_correct>=1 then 7 else 3 end/);
});

test("Duplicate answers and one formal daily attempt are constrained",()=>{
  assert.match(sql,/unique\(item_id\)/i);
  assert.match(sql,/exists\(select 1 from public\.training_daily_answers where item_id=v_item\.id\)/i);
  assert.match(sql,/unique\(agent_id,training_date\)/i);
});

test("Daily pass threshold and exam threshold match spec",()=>{
  assert.match(sql,/v_score:=v_correct\*20/);
  assert.match(sql,/v_pass:=v_score>=80/);
  assert.match(sql,/v_score:=v_correct\*5/);
  assert.match(sql,/v_pass:=v_score>=85/);
});

test("Micro training uses existing audit only and does not create punishment",()=>{
  assert.match(sql,/action='MICRO_TRAINING'/);
  assert.match(sql,/'system','MICRO_TRAINING','agent'/);
  assert.equal(/insert into public\.(violations|recovery_tasks)/i.test(sql),false);
});

test("Certification requires passed exam before existing activation flow",()=>{
  assert.match(sql,/from public\.training_exam_attempts[\s\S]*passed=true/i);
  assert.match(sql,/v_remaining=0 and v_open_recovery=0 and v_serious=0 and v_exam_passed/i);
  assert.match(sql,/record_training_result_internal/);
  assert.match(sql,/refresh_agent_certification_internal\(p_agent_id\)/);
});

test("Training records use RLS ownership policies",()=>{
  for(const table of ["training_daily_attempts","training_daily_items","training_daily_answers","training_exam_attempts","training_exam_items","training_exam_answers"]){
    assert.match(sql,new RegExp("alter table public\\."+table+" enable row level security","i"));
    assert.match(sql,new RegExp("a\\.id="+table+"\\.agent_id and a\\.user_id=\\(select auth\\.uid\\(\\)\\)","i"));
  }
});

test("Training UI remains safe native JS",()=>{
  assert.equal(/\.innerHTML\s*=|insertAdjacentHTML/.test(ui),false);
  assert.equal(/from\s+["']react["']|react-dom|jsx-runtime/i.test(ui),false);
  assert.match(ui,/server_now/);
  assert.match(ui,/deadline_at/);
});

test("Private training helpers are not client executable",()=>{
  const lines=[
    "revoke all on function private.training_option_order(text,uuid) from public,anon,authenticated;",
    "revoke all on function private.training_select_daily_questions(uuid,date) from public,anon,authenticated;",
    "revoke all on function private.training_skill_snapshot(uuid) from public,anon,authenticated;",
    "revoke all on function private.training_daily_record_answer(uuid,uuid,smallint,smallint,timestamptz,date) from public,anon,authenticated;",
    "revoke all on function private.training_exam_record_answer(uuid,uuid,smallint,smallint,timestamptz) from public,anon,authenticated;"
  ];
  for(const line of lines)assert.ok(sql.toLowerCase().includes(line),"missing "+line);
});
