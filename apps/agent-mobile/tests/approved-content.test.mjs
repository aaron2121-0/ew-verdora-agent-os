import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {COURSE_CODES,dailyActions,sectionFromFocus} from "../public/approved-content.js";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
const load=filename=>JSON.parse(fs.readFileSync(path.join(root,"content","handbook",filename),"utf8"));
const onboarding=load("onboarding_7day.json"),copy=load("ui_microcopy.json");
test("Seven reviewed days align to the existing seven courses, with no new skill codes",()=>{
 assert.equal(COURSE_CODES.length,7);
 assert.equal(onboarding.days.length,7);
 assert.deepEqual(onboarding.days.map(x=>x.day),[1,2,3,4,5,6,7]);
 assert.deepEqual(onboarding.days.map(x=>sectionFromFocus(x.handbook_focus)?.section),[
  "story","product_line","product_line","product_line","product_line","product_line","service_rule"
 ]);
});
test("Reviewed copy covers the tour, coach marks, empty states and AI suggestions in both languages",()=>{
 assert.equal(copy.tour.length,4);
 for(const row of copy.tour)for(const key of ["title_en","title_zh","body_en","body_zh"])assert.ok(row[key]);
 assert.ok(copy.coach_marks.length>=6);
 for(const m of copy.coach_marks)assert.ok(m.tip_en&&m.tip_zh&&m.code);
 for(const e of copy.empty_states)assert.ok(e.title_en&&e.title_zh&&e.body_en&&e.body_zh&&e.cta_en&&e.cta_zh);
 for(const a of copy.ai_suggestions)assert.equal(a.prompts_en.length,a.prompts_zh.length);
});
test("Three earning actions are derived from actual dashboard, not invented leads",()=>{
 const empty=dailyActions({phase1:{due_followups:[],recent_leads:[]},selling_kits:[]},"zh");
 assert.equal(empty.length,3);
 assert.equal(empty[0].target,"customers");
 const due=dailyActions({phase1:{due_followups:[{id:"1"}],recent_leads:[]},selling_kits:[{}]},"en");
 assert.equal(due[0].target,"today");
 assert.equal(due[2].target,"selling");
});
test("Day 1 has at least five reviewed CORE-BRAND questions",()=>{
 const bank=load("core_brand_questions.json");
 assert.ok(bank.questions.length>=5);
 assert.ok(bank.questions.every(q=>q.code.startsWith("HB-CORE-BRAND-")));
});
test("The agent-only module migration is timestamped, five-question and owns no handbook_section",()=>{
 const file=fs.readFileSync(path.join(root,"supabase/migrations/20261113152000_agent_seven_day_quiz.sql"),"utf8");
 assert.match(file,/position between 1 and 5/);
 assert.doesNotMatch(file,/add column if not exists handbook_section/);
 assert.match(file,/first_seen_at/);
});
