-- Run ONLY against an isolated database with the ai_coach migration installed:
-- psql -v ON_ERROR_STOP=1 -f tests/ai-coach/stage1.sql
-- Whole test is rolled back. Never run as a live production QA script.
begin;
do $test$
declare
  a uuid:=gen_random_uuid();
  b uuid:=gen_random_uuid();
  demo uuid:=gen_random_uuid();
  locked uuid:=gen_random_uuid();
  lead_a uuid:=gen_random_uuid();
  lead_b uuid:=gen_random_uuid();
  lead_locked uuid:=gen_random_uuid();
  d date:=timezone('Asia/Kuching',now())::date + 1;
  i int;
  total int;
  task uuid;
  level_before int;
  out jsonb;
begin
  insert into public.agents(id,agent_code,display_name,status,is_demo) values
    (a,'QA-COACH-A-'||left(a::text,8),'QA Coach A','active',false),
    (b,'QA-COACH-B-'||left(b::text,8),'QA Coach B','active',false),
    (demo,'QA-COACH-D-'||left(demo::text,8),'QA Coach Demo','active',true),
    (locked,'QA-COACH-L-'||left(locked::text,8),'QA Coach Locked','trainee',false);
  insert into public.leads(id,agent_id,source,status,occasion,next_followup_at) values
    (lead_a,a,'personal_network','qualified','birthday',(d::timestamp at time zone 'Asia/Kuching')),
    (lead_b,b,'referral','qualified','anniversary',(d::timestamp at time zone 'Asia/Kuching')),
    (lead_locked,locked,'whatsapp','qualified','birthday',(d::timestamp at time zone 'Asia/Kuching'));

  -- 100% prior-week completion increases A from three tasks to five.
  insert into private.coach_daily_plans(agent_id,plan_date) values(a,d-1);
  for i in 1..3 loop
    insert into private.coach_tasks(
      agent_id,plan_date,kind,priority,title_en,title_zh,why_en,why_zh
    ) values(a,d-1,'practice',i,'Practice','练习','Build skill','积累能力');
  end loop;
  for task in select id from private.coach_tasks
    where agent_id=a and plan_date=d-1 loop
    perform private.coach_complete_task_internal(a,task,'replied','test');
  end loop;

  out:=private.coach_build_plan_internal(a,d);
  if (out->>'existing')::boolean is true then raise exception 'fresh plan incorrectly marked existing'; end if;
  perform private.coach_build_plan_internal(b,d);
  perform private.coach_build_plan_internal(locked,d);
  out:=private.coach_build_plan_internal(demo,d);
  if out->>'skipped'<>'demo' then raise exception 'demo should be skipped'; end if;
  if exists (select 1 from private.coach_daily_plans where agent_id=demo)
    then raise exception 'demo plan was persisted'; end if;

  select count(*) into total from private.coach_tasks where agent_id=a and plan_date=d;
  if total<>5 then raise exception 'high-completion agent should get five tasks, got %',total; end if;
  select count(*) into total from private.coach_tasks where agent_id=b and plan_date=d;
  if total<>3 then raise exception 'new agent should get three tasks, got %',total; end if;

  if exists(select 1 from private.coach_tasks where agent_id=a and lead_id=lead_b)
    or exists(select 1 from private.coach_tasks where agent_id=b and lead_id=lead_a)
    then raise exception 'A/B ownership isolation failed'; end if;
  if exists (select 1 from private.coach_tasks where agent_id=locked
    and (kind not in ('find_lead','post_content','practice') or lead_id is not null))
    then raise exception 'locked agent was assigned customer outreach'; end if;
  if (select count(*) from private.coach_tasks where agent_id=locked and plan_date=d)<>3
    then raise exception 'locked agent task count wrong'; end if;

  -- Re-running same date must not create tasks, even if their state changes.
  select count(*) into total from private.coach_tasks where agent_id=a and plan_date=d;
  out:=private.coach_build_plan_internal(a,d);
  if (out->>'existing')::boolean is not true then raise exception 'idempotent plan flag absent'; end if;
  if (select count(*) from private.coach_tasks where agent_id=a and plan_date=d)<>total
    then raise exception 'repeat plan duplicated tasks'; end if;
  if exists(select 1 from private.coach_tasks
    where agent_id=a and plan_date=d and lead_id is not null
    group by lead_id having count(*)>1)
    then raise exception 'same customer appeared twice in a day'; end if;

  select id into task from private.coach_tasks
    where agent_id=a and plan_date=d and kind='follow_up' limit 1;
  if task is null then raise exception 'expected follow-up on A due lead'; end if;
  perform private.coach_complete_task_internal(a,task,'interested','customer asked for details');
  select level into level_before from private.agent_skill_state
    where agent_id=a and skill='follow_up';
  out:=private.coach_complete_task_internal(a,task,'interested','again');
  if out->>'already_done'<>'true' then raise exception 'complete must be idempotent'; end if;
  if (select level from private.agent_skill_state
    where agent_id=a and skill='follow_up')<>level_before
    then raise exception 'duplicate done updated skills'; end if;
  begin
    perform private.coach_complete_task_internal(b,task,'replied','cross-agent');
    raise exception 'should not complete another agent task';
  exception when others then
    if SQLERRM='should not complete another agent task' then raise; end if;
  end;

  perform private.coach_review_day_internal(a,d);
  if (select status from private.coach_daily_plans
    where agent_id=a and plan_date=d)<>'reviewed'
    then raise exception 'review not persisted'; end if;

  if has_function_privilege('anon','private.coach_build_plan_internal(uuid,date)','EXECUTE')
     or has_function_privilege('authenticated','private.coach_complete_task_internal(uuid,uuid,text,text)','EXECUTE')
     or has_table_privilege('authenticated','private.coach_tasks','SELECT')
    then raise exception 'function/table security grants incorrect'; end if;
  if not (select relrowsecurity from pg_catalog.pg_class
      where oid='private.coach_tasks'::regclass) then
    raise exception 'RLS not enabled';
  end if;
  raise notice 'PASS: isolation, demo skip, idempotence, adaptive count, lock, skills, review, grants';
end;
$test$;
rollback;
