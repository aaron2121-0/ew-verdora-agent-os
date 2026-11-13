#!/usr/bin/env node
import fs from "node:fs";
import {spawnSync} from "node:child_process";

export const SKILLS=Object.freeze(["LEAD-FINDING","QUALIFY","REFERENCE","OBJECTION","CLOSING","PAYMENT"]);

function fail(msg){throw new Error(msg)}
function str(v,name){
  const s=String(v??"").trim();
  if(!s)fail(name+" is required");
  return s;
}
function options(v,name){
  if(!Array.isArray(v)||v.length!==4)fail(name+" must contain exactly 4 options");
  return v.map((x,i)=>str(x,name+"["+i+"]"));
}
export function validateQuestion(q,index){
  if(!q||typeof q!=="object"||Array.isArray(q))fail("question["+index+"] must be an object");
  const bank_type=str(q.bank_type,"question["+index+"].bank_type");
  if(!["daily","exam"].includes(bank_type))fail("question["+index+"].bank_type must be daily or exam");
  const skill_code=str(q.skill_code,"question["+index+"].skill_code");
  if(!SKILLS.includes(skill_code))fail("question["+index+"].skill_code invalid: "+skill_code);
  const correct_index=Number(q.correct_index);
  if(!Number.isInteger(correct_index)||correct_index<0||correct_index>3)fail("question["+index+"].correct_index must be an integer from 0 to 3");
  const difficulty=Number(q.difficulty??1);
  if(!Number.isInteger(difficulty)||difficulty<1||difficulty>3)fail("question["+index+"].difficulty must be 1, 2 or 3");
  return {
    code:str(q.code,"question["+index+"].code"),
    bank_type,skill_code,difficulty,
    question_en:str(q.question_en,"question["+index+"].question_en"),
    question_zh:str(q.question_zh,"question["+index+"].question_zh"),
    options_en:options(q.options_en,"question["+index+"].options_en"),
    options_zh:options(q.options_zh,"question["+index+"].options_zh"),
    correct_index,
    related_card_code:q.related_card_code==null?null:str(q.related_card_code,"question["+index+"].related_card_code"),
    explanation_en:str(q.explanation_en,"question["+index+"].explanation_en"),
    explanation_zh:str(q.explanation_zh,"question["+index+"].explanation_zh")
  };
}

export function validateBank(input,{formal=false}={}){
  const source=Array.isArray(input)?{questions:input}:input;
  if(!source||!Array.isArray(source.questions))fail("Seed JSON must contain a questions array");
  const questions=source.questions.map(validateQuestion);
  const codes=new Set();
  for(const q of questions){
    if(codes.has(q.code))fail("Duplicate question code: "+q.code);
    codes.add(q.code);
  }
  if(formal){
    for(const skill of SKILLS){
      const n=questions.filter(q=>q.bank_type==="daily"&&q.skill_code===skill).length;
      if(n!==20)fail("Formal bank requires exactly 20 daily questions for "+skill+"; found "+n);
    }
    const exam=questions.filter(q=>q.bank_type==="exam").length;
    if(exam!==40)fail("Formal bank requires exactly 40 exam questions; found "+exam);
    if(questions.length!==160)fail("Formal bank must contain 160 total questions; found "+questions.length);
  }
  return {
    source_version:str(source.source_version||"grok-formal-v1","source_version"),
    questions
  };
}

const esc=s=>String(s).replaceAll("'","''");
const js=v=>esc(JSON.stringify(v));
export function buildSql(bank,{test=false}={}){
  const rows=bank.questions.map(q=>
    "('"+esc(q.code)+"','"+q.bank_type+"','"+q.skill_code+"',"+q.difficulty+
    ",'"+esc(q.question_en)+"','"+esc(q.question_zh)+"','"+js(q.options_en)+"'::jsonb,'"+
    js(q.options_zh)+"'::jsonb,"+q.correct_index+",'"+esc(q.explanation_en)+"','"+
    esc(q.explanation_zh)+"',"+(q.related_card_code==null?"NULL":"'"+esc(q.related_card_code)+"'")+",true,"+(test?"true":"false")+",'"+esc(bank.source_version)+"')"
  ).join(",\n");
  return "begin;\n"+
    "insert into private.training_questions(\n"+
    "  code,bank_type,skill_code,difficulty,question_en,question_zh,options_en,options_zh,\n"+
    "  correct_index,explanation_en,explanation_zh,related_card_code,active,is_test,source_version\n"+
    ") values\n"+rows+"\n"+
    "on conflict(code) do update set\n"+
    "  bank_type=excluded.bank_type,\n"+
    "  skill_code=excluded.skill_code,\n"+
    "  difficulty=excluded.difficulty,\n"+
    "  question_en=excluded.question_en,\n"+
    "  question_zh=excluded.question_zh,\n"+
    "  options_en=excluded.options_en,\n"+
    "  options_zh=excluded.options_zh,\n"+
    "  correct_index=excluded.correct_index,\n"+
    "  related_card_code=excluded.related_card_code,\n"+
    "  explanation_en=excluded.explanation_en,\n"+
    "  explanation_zh=excluded.explanation_zh,\n"+
    "  active=excluded.active,\n"+
    "  is_test=excluded.is_test,\n"+
    "  source_version=excluded.source_version,\n"+
    "  updated_at=now();\ncommit;\n";
}

function parseArgs(argv){
  const args={formal:false,apply:false,test:false,out:null,file:null,relatedCards:null};
  for(let i=0;i<argv.length;i++){
    const x=argv[i];
    if(x==="--formal")args.formal=true;
    else if(x==="--apply")args.apply=true;
    else if(x==="--test")args.test=true;
    else if(x==="--out")args.out=argv[++i]||null;
    else if(x==="--related-cards")args.relatedCards=argv[++i]||null;
    else if(!args.file)args.file=x;
    else fail("Unexpected argument: "+x);
  }
  if(!args.file)fail("Usage: node scripts/training-bank-import.mjs <bank.json> [--formal] [--out seed.sql] [--apply]");
  return args;
}

if(import.meta.url===new URL("file://"+process.argv[1]).href){
  try{
    const args=parseArgs(process.argv.slice(2));
    const input=JSON.parse(fs.readFileSync(args.file,"utf8"));
    const bank=validateBank(input,{formal:args.formal});
    if(args.relatedCards){
      const doc=JSON.parse(fs.readFileSync(args.relatedCards,"utf8"));
      const links=doc.links||{};
      if(!links||typeof links!=="object"||Array.isArray(links))fail("related-cards requires a links object");
      const known=new Set(bank.questions.map(x=>x.code));
      for(const [question,card] of Object.entries(links)){
        if(!known.has(question))fail("Unknown question card link: "+question);
        if(card!==null&&!/^[A-Z0-9-]{3,60}$/.test(String(card)))fail("Invalid related card for "+question);
      }
      for(const q of bank.questions)if(Object.hasOwn(links,q.code))q.related_card_code=links[q.code];
    }
    const sql=buildSql(bank,{test:args.test});
    if(args.out)fs.writeFileSync(args.out,sql);
    if(args.apply){
      const url=process.env.DATABASE_URL;
      if(!url)fail("DATABASE_URL is required with --apply");
      const r=spawnSync("psql",[url,"-v","ON_ERROR_STOP=1","-X","-q"],{input:sql,stdio:["pipe","inherit","inherit"],encoding:"utf8"});
      if(r.error)throw r.error;
      if(r.status!==0)process.exit(r.status||1);
    }
    const daily=Object.fromEntries(SKILLS.map(s=>[s,bank.questions.filter(q=>q.bank_type==="daily"&&q.skill_code===s).length]));
    const exam=bank.questions.filter(q=>q.bank_type==="exam").length;
    console.log(JSON.stringify({ok:true,source_version:bank.source_version,total:bank.questions.length,daily,exam,formal:args.formal,applied:args.apply},null,2));
  }catch(e){
    console.error("TRAINING_SEED_INVALID:",e.message);
    process.exit(1);
  }
}
