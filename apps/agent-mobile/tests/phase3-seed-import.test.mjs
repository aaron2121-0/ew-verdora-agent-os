import test from "node:test";
import assert from "node:assert/strict";
import {SKILLS,validateBank,buildSql} from "../../../scripts/training-bank-import.mjs";

const q=(code,bank_type,skill_code)=>({
  code,bank_type,skill_code,difficulty:2,
  question_en:"English question "+code,
  question_zh:"中文题目 "+code,
  options_en:["A","B","C","D"],
  options_zh:["甲","乙","丙","丁"],
  correct_index:2,
  explanation_en:"English explanation.",
  explanation_zh:"中文解释。"
});

function formal(){
  const questions=[];
  for(const skill of SKILLS)for(let i=1;i<=20;i++)questions.push(q("D-"+skill+"-"+i,"daily",skill));
  for(let i=1;i<=40;i++)questions.push(q("E-"+i,"exam",SKILLS[(i-1)%SKILLS.length]));
  return {source_version:"grok-formal-test",questions};
}

test("Formal Grok bank requires 6x20 daily plus 40 exam",()=>{
  const bank=validateBank(formal(),{formal:true});
  assert.equal(bank.questions.length,160);
  for(const skill of SKILLS)assert.equal(bank.questions.filter(x=>x.bank_type==="daily"&&x.skill_code===skill).length,20);
  assert.equal(bank.questions.filter(x=>x.bank_type==="exam").length,40);
});

test("Every question must have exactly four bilingual options",()=>{
  const x=formal();x.questions[0].options_zh=["甲","乙","丙"];
  assert.throws(()=>validateBank(x,{formal:true}),/exactly 4 options/);
});

test("correct_index is strictly 0 through 3",()=>{
  const x=formal();x.questions[0].correct_index=4;
  assert.throws(()=>validateBank(x,{formal:true}),/0 to 3/);
});

test("Bilingual question and explanation text are mandatory",()=>{
  const x=formal();x.questions[0].question_zh="";
  assert.throws(()=>validateBank(x,{formal:true}),/question_zh is required/);
  const y=formal();y.questions[0].explanation_en="";
  assert.throws(()=>validateBank(y,{formal:true}),/explanation_en is required/);
});

test("Validated bank generates private-schema upsert SQL",()=>{
  const sql=buildSql(validateBank(formal(),{formal:true}));
  assert.match(sql,/insert into private\.training_questions/);
  assert.match(sql,/on conflict\(code\) do update/);
  assert.equal(/service_role|SUPABASE_SECRET|correct_index[^,]*=4/.test(sql),false);
});
