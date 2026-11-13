import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateHandbookContent,HANDBOOK_SECTIONS} from "../../../supabase/functions/_shared/handbook-content-validate.mjs";
import {SKILLS} from "../../../scripts/training-bank-import.mjs";

const entry={section:"product_line",title_en:"Bouquet",title_zh:"花束",body_en:"Confirm availability with the team.",body_zh:"请向团队确认实际供应。",sort:20};
const valid=()=>({schema_version:"1.0",source:"grok",entries:[{...entry}]});

test("valid Grok JSON normalizes draft content without authority flags",()=>{
  const parsed=validateHandbookContent(valid());
  assert.equal(parsed.entries.length,1);
  assert.deepEqual(Object.keys(parsed.entries[0]),["section","title_en","title_zh","body_en","body_zh","sort"]);
  assert.equal(parsed.entries[0].title_zh,"花束");
});
test("rejects unsupported metadata, unknown enum and absent Chinese content",()=>{
  assert.throws(()=>validateHandbookContent({...valid(),visibility:"public"}),/unknown field/);
  assert.throws(()=>validateHandbookContent({...valid(),entries:[{...entry,visible_to_agent:true}]}),/unknown field/);
  assert.throws(()=>validateHandbookContent({...valid(),entries:[{...entry,section:"fake"}]}),/section invalid/);
  assert.throws(()=>validateHandbookContent({...valid(),entries:[{...entry,body_zh:"  "}]}),/1-10000 characters/);
});
test("requires Grok source, version and nonempty entries",()=>{
  assert.throws(()=>validateHandbookContent({...valid(),source:"unknown"}),/source must be grok/);
  assert.throws(()=>validateHandbookContent({...valid(),schema_version:"2.0"}),/schema_version/);
  assert.throws(()=>validateHandbookContent({...valid(),entries:[]}),/1-100/);
  assert.throws(()=>validateHandbookContent({...valid(),entries:[{...entry,sort:1.5}]}),/sort/);
});
test("rejects oversized payloads and invalid UTC timestamps",()=>{
  assert.throws(()=>validateHandbookContent({...valid(),entries:[{...entry,body_en:"x".repeat(270000)}]}),/256 KiB/);
  assert.throws(()=>validateHandbookContent({...valid(),generated_at:"tomorrow"}),/UTC ISO/);
  assert.equal(validateHandbookContent({...valid(),generated_at:"2026-11-13T06:00:00Z"}).entries.length,1);
});
test("handbook enum and MCQ skill codes stay separate",()=>{
  assert.deepEqual(HANDBOOK_SECTIONS,["story","product_line","service_rule","delivery","script","announcement"]);
  assert.deepEqual(SKILLS,["LEAD-FINDING","QUALIFY","REFERENCE","OBJECTION","CLOSING","PAYMENT"]);
});
test("migration maps the seven required courses and preserves MCQ table",()=>{
  const sql=readFileSync(new URL("../../../supabase/migrations/20261113150100_handbook_training_links.sql",import.meta.url),"utf8");
  for(const code of ["CORE-BRAND","LEAD-FINDING","QUALIFY","REFERENCE","OBJECTION","CLOSING","PAYMENT"])
    assert.ok(sql.includes("'"+code+"'"),"Missing "+code);
  assert.match(sql,/training_modules_required_handbook_section/);
  assert.doesNotMatch(sql,/training_questions|skill_code/i);
});
test("Agent handbook data path enforces all three publication flags",()=>{
  const src=readFileSync(new URL("../../../supabase/functions/agent-session/index.ts",import.meta.url),"utf8");
  assert.match(src,/\.eq\("active",true\)/);
  assert.match(src,/\.eq\("visible_to_agent",true\)\.eq\("needs_owner_confirm",false\)/);
});
