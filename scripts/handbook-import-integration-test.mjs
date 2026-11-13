#!/usr/bin/env node
// Deferred DB integration QA: run ONLY in a disposable/staging DB AFTER Owner
// approves migrations. All writes (including audit) are ROLLED BACK.
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {validateHandbookContent} from "../supabase/functions/_shared/handbook-content-validate.mjs";

if(!process.env.DATABASE_URL){
  console.error("STAGING DATABASE_URL required. This test does not deploy or migrate.");
  process.exit(2);
}
if(process.env.HANDBOOK_TEST_ALLOW_SQL!=="true"){
  console.error("Set HANDBOOK_TEST_ALLOW_SQL=true after explicit approval; refusing DB access.");
  process.exit(2);
}
const input=JSON.parse(fs.readFileSync(new URL("../content/handbook/handbook_content.json",import.meta.url),"utf8"));
const validated=validateHandbookContent(input);
if(validated.entries.length!==47||validated.counts.cards!==20||
   validated.counts.scripts!==15||validated.counts.faqs!==12)
  throw Error("Unexpected reviewed JSON counts");
const quote=x=>"'"+String(x).replaceAll("'","''")+"'";
const version=quote(validated.source_version);
const rows=quote(JSON.stringify(validated.entries));
// Use the real reviewed content and codes, unmodified, inside a rollback transaction.
// A fresh test schema is preferred; existing matching codes are temporarily deleted
// inside this transaction so reruns also exercise the new-entry path.
const sql=\`
begin;
do $qa$
declare
 v_owner uuid;
 v_batch uuid;
 v_first jsonb; v_again jsonb; v_edited jsonb; v_bulk jsonb; v_changed jsonb;
 v_id uuid; v_body text;
 n integer; cards integer; scripts integer; faqs integer;
begin
 select user_id into v_owner from private.user_roles where role='owner' limit 1;
 if v_owner is null then raise exception 'QA requires an existing Owner role in staging'; end if;

 delete from public.company_knowledge
   where code in (select x->>'code' from pg_catalog.jsonb_array_elements(\${rows}::jsonb) x);
 v_first:=public.handbook_import_internal(v_owner,\${version},\${rows}::jsonb);
 v_batch:=(v_first->>'batch_id')::uuid;
 if (v_first->>'inserted')::int<>47 or (v_first->>'updated')::int<>0 then
   raise exception 'initial import counts mismatch: %',v_first; end if;

 select count(*),
   count(*) filter(where kind='card'),
   count(*) filter(where kind='script'),
   count(*) filter(where kind='faq')
 into n,cards,scripts,faqs
 from public.company_knowledge where import_batch_id=v_batch
   and needs_owner_confirm and not active and not visible_to_agent;
 if n<>47 or cards<>20 or scripts<>15 or faqs<>12 then
   raise exception 'pending mapping mismatch: total %, cards %, scripts %, faqs %',n,cards,scripts,faqs; end if;

 select count(*) into n from public.company_knowledge
 where import_batch_id=v_batch and active=true
   and visible_to_agent=true and needs_owner_confirm=false;
 if n<>0 then raise exception 'Agent sees pending import'; end if;

 v_again:=public.handbook_import_internal(v_owner,\${version},\${rows}::jsonb);
 if (v_again->>'inserted')::int<>0 or (v_again->>'updated')::int<>0 or
    (v_again->>'unchanged')::int<>47 or (v_again->>'batch_id') is not null then
   raise exception 'duplicate import must produce zero changes: %',v_again; end if;

 select id,body_en into v_id,v_body from public.company_knowledge where code='COND-1';
 if v_id is null then raise exception 'COND-1 missing'; end if;
 select public.handbook_update_internal(v_owner,v_id,
   (select title_en from public.company_knowledge where id=v_id),
   (select title_zh from public.company_knowledge where id=v_id),
   v_body||' [QA edited]',
   (select body_zh from public.company_knowledge where id=v_id)) into v_edited;
 if exists(select 1 from public.company_knowledge where id=v_id and
   (not needs_owner_confirm or visible_to_agent or active)) then
   raise exception 'pending edit accidentally published'; end if;

 v_bulk:=public.handbook_review_batch_internal(v_owner,v_batch,true);
 if (v_bulk->>'approved')::int<>47 then raise exception 'bulk approval mismatch: %',v_bulk; end if;
 select count(*) into n from public.company_knowledge
   where import_batch_id=v_batch and active and visible_to_agent and not needs_owner_confirm;
 if n<>47 then raise exception 'Agent approved visibility mismatch %',n; end if;
 if not exists(select 1 from public.company_knowledge
   where id=v_id and body_en=v_body||' [QA edited]') then
   raise exception 'Owner pending edit lost on approval'; end if;

 -- Reimport after Owner edit is a real content change; no new codes but
 -- the changed item must become hidden/pending again until approved.
 v_changed:=public.handbook_import_internal(v_owner,\${version},\${rows}::jsonb);
 if (v_changed->>'inserted')::int<>0 or (v_changed->>'updated')::int<>1
     or (v_changed->>'unchanged')::int<>46 then
   raise exception 'changed reimport mismatch: %',v_changed; end if;
 if not exists(select 1 from public.company_knowledge where id=v_id and
    needs_owner_confirm and not active and not visible_to_agent and body_en=v_body) then
   raise exception 'changed item not reset to pending'; end if;
 perform public.handbook_review_batch_internal(v_owner,(v_changed->>'batch_id')::uuid,true);
 if not exists(select 1 from public.company_knowledge where id=v_id and
    active and visible_to_agent and not needs_owner_confirm and body_en=v_body) then
   raise exception 'changed item not correctly reapproved'; end if;

 raise notice 'HANDBOOK_ROLLBACK_QA_PASS: 20 cards + 15 scripts + 12 FAQ, 47 pending/hidden, bulk, duplicate=0, edit/reapproval';
end $qa$;
rollback;
\`;
const proc=spawnSync("psql",[process.env.DATABASE_URL,"-X","-v","ON_ERROR_STOP=1","-q"],{
  input:sql,encoding:"utf8",stdio:["pipe","pipe","pipe"]
});
if(proc.error)throw proc.error;
if(proc.status!==0){
  console.error("HANDBOOK_ROLLBACK_QA_FAILED:\n"+(proc.stderr||"").slice(0,2500));
  process.exit(proc.status||1);
}
console.log("HANDBOOK_ROLLBACK_QA_PASS (DB transaction rolled back)\n"+(proc.stderr||"").slice(0,800));
