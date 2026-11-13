import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {validateHandbookContent,PRODUCT_LINES,HANDBOOK_SECTIONS} from "../../../supabase/functions/_shared/handbook-content-validate.mjs";
import {SKILLS} from "../../../scripts/training-bank-import.mjs";

const path=new URL("../../../content/handbook/handbook_content.json",import.meta.url);
const raw=readFileSync(path,"utf8");
const input=JSON.parse(raw);
const parsed=validateHandbookContent(input);
const copy=()=>structuredClone(input);
const sql=readFileSync(new URL("../../../supabase/migrations/20261113150200_handbook_import_workflow.sql",import.meta.url),"utf8");

test("Claude-reviewed original handbook JSON is byte-identical to main",()=>{
  const gitSha=createHash("sha1").update("blob "+Buffer.byteLength(raw)+"\0").update(raw).digest("hex");
  assert.equal(gitSha,"0aeae074e1d74fbcec3932cf63c7ef2654ba8108");
  assert.deepEqual(Object.keys(input),["source_version","cards","scripts","faqs"]);
  assert.equal(input.source_version,"grok-2026-11-13-claude-reviewed");
});
test("imports the real 20 cards + 15 scripts + 12 FAQs via strict validator",()=>{
  assert.deepEqual(parsed.counts,{cards:20,scripts:15,faqs:12});
  assert.equal(parsed.entries.length,47);
  assert.equal(new Set(parsed.entries.map(x=>x.code)).size,47);
  assert.equal(parsed.entries.filter(x=>x.kind==="card").length,20);
  assert.equal(parsed.entries.filter(x=>x.kind==="script").length,15);
  assert.equal(parsed.entries.filter(x=>x.kind==="faq").length,12);
  assert.deepEqual([...new Set(parsed.entries.filter(x=>x.kind==="card").map(x=>x.product_line))].sort(),[...PRODUCT_LINES].sort());
  assert.deepEqual(parsed.entries.filter(x=>x.kind==="card").map(x=>x.key_points_zh.length),Array(20).fill(3));
});
test("mapping uses original reviewed titles, scripts, FAQs and null FAQ product line",()=>{
  const card=parsed.entries.find(x=>x.code==="COND-1"),sourceCard=input.cards[0];
  assert.equal(card.title_zh,sourceCard.title_zh);
  assert.equal(card.body_en,sourceCard.body_en);
  assert.deepEqual(card.key_points_zh,sourceCard.key_points_zh);
  assert.equal(card.section,"product_line");
  const script=parsed.entries.find(x=>x.code==="SCR-COND-1");
  assert.equal(script.section,"script");
  assert.equal(script.title_en,input.scripts[0].situation_en);
  assert.equal(script.body_zh,input.scripts[0].text_zh);
  const faq=parsed.entries.find(x=>x.code==="FAQ-01");
  assert.equal(faq.section,"faq");
  assert.equal(faq.product_line,null);
  assert.equal(faq.title_zh,input.faqs[0].q_zh);
  assert.equal(faq.body_en,input.faqs[0].a_en);
  assert.ok(HANDBOOK_SECTIONS.includes("faq"));
});
test("strict validation rejects duplicates, extra fields, missing bilingual points and oversized JSON",()=>{
  let x=copy();x.cards[1].code=x.cards[0].code;
  assert.throws(()=>validateHandbookContent(x),/duplicate code/);
  x=copy();x.cards[0].visible_to_agent=true;
  assert.throws(()=>validateHandbookContent(x),/not allowed/);
  x=copy();x.cards[0].key_points_en.pop();
  assert.throws(()=>validateHandbookContent(x),/exactly 3/);
  x=copy();x.faqs[0].a_zh="  ";
  assert.throws(()=>validateHandbookContent(x),/1-10000 characters/);
  x=copy();x.cards[0].body_en="X".repeat(280000);
  assert.throws(()=>validateHandbookContent(x),/256 KiB/);
});
test("code-key upsert and publication gates are implemented transactionally",()=>{
  assert.match(sql,/on conflict\(code\) do update/);
  assert.match(sql,/is distinct from/);
  assert.match(sql,/v_unchanged:=v_unchanged\+1/);
  assert.match(sql,/v_new\+v_updated=0/);
  assert.match(sql,/active=false,visible_to_agent=false,needs_owner_confirm=true/);
  assert.match(sql,/active=true,visible_to_agent=true,needs_owner_confirm=false/);
  assert.match(sql,/handbook_review_batch_internal/);
  assert.match(sql,/handbook_update_internal/);
  assert.match(sql,/handbook_bulk_approved/);
  assert.match(sql,/v_batch::text/);
  assert.match(sql,/private\.audit_events/);
});
test("FAQ enum is isolated in its own migration and seven required courses retain their links",()=>{
  const enumSql=readFileSync(new URL("../../../supabase/migrations/20261113145900_product_handbook_faq_enum.sql",import.meta.url),"utf8");
  const links=readFileSync(new URL("../../../supabase/migrations/20261113150100_handbook_training_links.sql",import.meta.url),"utf8");
  assert.match(enumSql,/add value if not exists 'faq'/);
  assert.doesNotMatch(sql,/alter type.*add value/i);
  for(const code of ["CORE-BRAND","LEAD-FINDING","QUALIFY","REFERENCE","OBJECTION","CLOSING","PAYMENT"])
    assert.ok(links.includes("'"+code+"'"),"Missing "+code);
  assert.deepEqual(SKILLS,["LEAD-FINDING","QUALIFY","REFERENCE","OBJECTION","CLOSING","PAYMENT"]);
  assert.doesNotMatch(links,/skill_code|training_questions/i);
});
test("Agent API supplies complete fields and enforces all three approved filters",()=>{
  const s=readFileSync(new URL("../../../supabase/functions/agent-session/index.ts",import.meta.url),"utf8");
  assert.match(s,/code,kind,section,product_line,sort,title_en,title_zh,body_en,body_zh,key_points_en,key_points_zh,icon_hint/);
  assert.match(s,/\.eq\("active",true\)\.eq\("visible_to_agent",true\)\.eq\("needs_owner_confirm",false\)/);
  assert.match(s,/if\(productLine\)query=query\.eq\("product_line",productLine\)/);
  const owner=readFileSync(new URL("../../../supabase/functions/owner-session/index.ts",import.meta.url),"utf8");
  assert.match(owner,/handbook_bulk_approve/);
  assert.match(owner,/handbook_update/);
  assert.match(owner,/handbook_import_internal/);
});
