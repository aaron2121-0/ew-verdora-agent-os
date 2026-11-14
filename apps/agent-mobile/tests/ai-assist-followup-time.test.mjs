import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const phase=fs.readFileSync(new URL("../public/phase1.js",import.meta.url),"utf8");
const i18n=fs.readFileSync(new URL("../public/i18n.js",import.meta.url),"utf8");

test("AI next message can schedule its suggested follow-up",()=>{
  assert.match(phase,/next_followup_hours/);
  assert.match(phase,/action:"schedule_followup"/);
  assert.match(phase,/followupAt\.toISOString\(\)/);
  assert.match(phase,/formatKuchingDateTime/);
});

test("Agent must confirm the schedule explicitly",()=>{
  assert.match(phase,/aiSetFollowup/);
  assert.match(phase,/addEventListener\("click"/);
  assert.doesNotMatch(phase,/innerHTML\s*=/);
});

test("follow-up scheduling copy is bilingual",()=>{
  assert.match(i18n,/Set follow-up · \{time\}/);
  assert.match(i18n,/设下次跟进 · \{time\}/);
});