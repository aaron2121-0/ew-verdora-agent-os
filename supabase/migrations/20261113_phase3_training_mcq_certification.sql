-- Phase 3: daily MCQ + certification exam

create table if not exists private.training_questions(
 id uuid primary key default gen_random_uuid(),
 code text not null unique,
 bank_type text not null check(bank_type in('daily','exam')),
 skill_code text not null check(skill_code in('LEAD-FINDING','QUALIFY','REFERENCE','OBJECTION','CLOSING','PAYMENT')),
 difficulty smallint not null default 1 check(difficulty between 1 and 3),
 question_en text not null check(length(trim(question_en))>0),
 question_zh text not null check(length(trim(question_zh))>0),
 options_en jsonb not null check(jsonb_typeof(options_en)='array' and jsonb_array_length(options_en)=4),
 options_zh jsonb not null check(jsonb_typeof(options_zh)='array' and jsonb_array_length(options_zh)=4),
 correct_index smallint not null check(correct_index between 0 and 3),
 explanation_en text not null check(length(trim(explanation_en))>0),
 explanation_zh text not null check(length(trim(explanation_zh))>0),
 active boolean not null default true,
 is_test boolean not null default false,
 source_version text not null default 'phase3-test-v1',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
revoke all on private.training_questions from public,anon,authenticated;
grant select,insert,update,delete on private.training_questions to service_role;

create table if not exists private.training_review_state(
 agent_id uuid not null references public.agents(id) on delete cascade,
 question_id uuid not null references private.training_questions(id) on delete cascade,
 times_seen int not null default 0 check(times_seen>=0),
 correct_count int not null default 0 check(correct_count>=0),
 consecutive_correct int not null default 0 check(consecutive_correct>=0),
 last_correct boolean,last_seen_at timestamptz,next_review_on date,
 primary key(agent_id,question_id)
);
revoke all on private.training_review_state from public,anon,authenticated;
grant select,insert,update,delete on private.training_review_state to service_role;

create table if not exists public.training_daily_attempts(
 id uuid primary key default gen_random_uuid(),
 agent_id uuid not null references public.agents(id) on delete cascade,
 training_date date not null,seed_hash text not null,
 status text not null default 'active' check(status in('active','completed')),
 started_at timestamptz not null default now(),finished_at timestamptz,
 score numeric check(score between 0 and 100),passed boolean,
 streak_after int not null default 0 check(streak_after>=0),
 created_at timestamptz not null default now(),unique(agent_id,training_date)
);
create table if not exists public.training_daily_items(
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.training_daily_attempts(id) on delete cascade,
 agent_id uuid not null references public.agents(id) on delete cascade,
 position smallint not null check(position between 1 and 5),
 question_id uuid not null references private.training_questions(id),
 option_order smallint[] not null check(cardinality(option_order)=4),
 served_at timestamptz,deadline_at timestamptz,
 unique(attempt_id,position),unique(attempt_id,question_id)
);
create table if not exists public.training_daily_answers(
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.training_daily_attempts(id) on delete cascade,
 item_id uuid not null references public.training_daily_items(id) on delete cascade,
 agent_id uuid not null references public.agents(id) on delete cascade,
 selected_index smallint check(selected_index between 0 and 3),
 is_correct boolean not null,timed_out boolean not null default false,
 response_ms int check(response_ms>=0),answered_at timestamptz not null default now(),
 unique(item_id)
);
create table if not exists public.training_exam_attempts(
 id uuid primary key default gen_random_uuid(),
 agent_id uuid not null references public.agents(id) on delete cascade,
 attempt_no int not null check(attempt_no>0),seed_hash text not null,
 status text not null default 'active' check(status in('active','completed')),
 started_at timestamptz not null default now(),finished_at timestamptz,
 score numeric check(score between 0 and 100),passed boolean,
 agent_status_before text not null,agent_status_after text,
 created_at timestamptz not null default now(),unique(agent_id,attempt_no)
);
create table if not exists public.training_exam_items(
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.training_exam_attempts(id) on delete cascade,
 agent_id uuid not null references public.agents(id) on delete cascade,
 position smallint not null check(position between 1 and 20),
 question_id uuid not null references private.training_questions(id),
 option_order smallint[] not null check(cardinality(option_order)=4),
 served_at timestamptz,deadline_at timestamptz,
 unique(attempt_id,position),unique(attempt_id,question_id)
);
create table if not exists public.training_exam_answers(
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.training_exam_attempts(id) on delete cascade,
 item_id uuid not null references public.training_exam_items(id) on delete cascade,
 agent_id uuid not null references public.agents(id) on delete cascade,
 selected_index smallint check(selected_index between 0 and 3),
 is_correct boolean not null,timed_out boolean not null default false,
 response_ms int check(response_ms>=0),answered_at timestamptz not null default now(),
 unique(item_id)
);

create index if not exists training_daily_attempts_agent_date_idx on public.training_daily_attempts(agent_id,training_date desc);
create index if not exists training_daily_answers_agent_idx on public.training_daily_answers(agent_id,answered_at desc);
create index if not exists training_exam_attempts_agent_idx on public.training_exam_attempts(agent_id,attempt_no desc);
create index if not exists training_exam_answers_agent_idx on public.training_exam_answers(agent_id,answered_at desc);
create index if not exists training_questions_bank_idx on private.training_questions(bank_type,skill_code,difficulty) where active=true;
create index if not exists training_review_due_idx on private.training_review_state(agent_id,next_review_on);

alter table public.training_daily_attempts enable row level security;
alter table public.training_daily_items enable row level security;
alter table public.training_daily_answers enable row level security;
alter table public.training_exam_attempts enable row level security;
alter table public.training_exam_items enable row level security;
alter table public.training_exam_answers enable row level security;

revoke all on public.training_daily_attempts,public.training_daily_items,public.training_daily_answers,
 public.training_exam_attempts,public.training_exam_items,public.training_exam_answers from anon;
revoke insert,update,delete on public.training_daily_attempts,public.training_daily_items,public.training_daily_answers,
 public.training_exam_attempts,public.training_exam_items,public.training_exam_answers from authenticated;
grant select on public.training_daily_attempts,public.training_daily_items,public.training_daily_answers,
 public.training_exam_attempts,public.training_exam_items,public.training_exam_answers to authenticated;
grant all on public.training_daily_attempts,public.training_daily_items,public.training_daily_answers,
 public.training_exam_attempts,public.training_exam_items,public.training_exam_answers to service_role;

drop policy if exists training_daily_attempts_select_self on public.training_daily_attempts;
create policy training_daily_attempts_select_self on public.training_daily_attempts for select to authenticated
using(exists(select 1 from public.agents a where a.id=training_daily_attempts.agent_id and a.user_id=(select auth.uid())) or private.is_owner());
drop policy if exists training_daily_items_select_self on public.training_daily_items;
create policy training_daily_items_select_self on public.training_daily_items for select to authenticated
using(exists(select 1 from public.agents a where a.id=training_daily_items.agent_id and a.user_id=(select auth.uid())) or private.is_owner());
drop policy if exists training_daily_answers_select_self on public.training_daily_answers;
create policy training_daily_answers_select_self on public.training_daily_answers for select to authenticated
using(exists(select 1 from public.agents a where a.id=training_daily_answers.agent_id and a.user_id=(select auth.uid())) or private.is_owner());
drop policy if exists training_exam_attempts_select_self on public.training_exam_attempts;
create policy training_exam_attempts_select_self on public.training_exam_attempts for select to authenticated
using(exists(select 1 from public.agents a where a.id=training_exam_attempts.agent_id and a.user_id=(select auth.uid())) or private.is_owner());
drop policy if exists training_exam_items_select_self on public.training_exam_items;
create policy training_exam_items_select_self on public.training_exam_items for select to authenticated
using(exists(select 1 from public.agents a where a.id=training_exam_items.agent_id and a.user_id=(select auth.uid())) or private.is_owner());
drop policy if exists training_exam_answers_select_self on public.training_exam_answers;
create policy training_exam_answers_select_self on public.training_exam_answers for select to authenticated
using(exists(select 1 from public.agents a where a.id=training_exam_answers.agent_id and a.user_id=(select auth.uid())) or private.is_owner());

CREATE OR REPLACE FUNCTION private.training_daily_record_answer(p_agent_id uuid, p_attempt_id uuid, p_position smallint, p_selected_index smallint, p_now timestamp with time zone, p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_attempt public.training_daily_attempts;
  v_item public.training_daily_items;
  v_current_position smallint;
  v_question private.training_questions;
  v_original smallint;
  v_correct boolean:=false;
  v_timeout boolean:=false;
  v_response_ms int;
  v_answered int;
begin
  select * into v_attempt from public.training_daily_attempts where id=p_attempt_id and agent_id=p_agent_id for update;
  if v_attempt.id is null then raise exception 'attempt_not_found'; end if;
  if v_attempt.status<>'active' then raise exception 'attempt_already_finished'; end if;

  select i.position into v_current_position
  from public.training_daily_items i left join public.training_daily_answers a on a.item_id=i.id
  where i.attempt_id=p_attempt_id and a.id is null order by i.position limit 1;
  if v_current_position is null then raise exception 'all_questions_answered'; end if;
  if p_position<>v_current_position then raise exception 'question_not_current'; end if;

  select * into v_item from public.training_daily_items where attempt_id=p_attempt_id and position=p_position for update;
  if exists(select 1 from public.training_daily_answers where item_id=v_item.id) then raise exception 'duplicate_answer'; end if;
  if v_item.served_at is null or v_item.deadline_at is null then raise exception 'question_not_served'; end if;

  select * into v_question from private.training_questions where id=v_item.question_id;
  v_timeout:=p_now>v_item.deadline_at;
  if not v_timeout then
    if p_selected_index is null or p_selected_index<0 or p_selected_index>3 then raise exception 'invalid_answer'; end if;
    v_original:=v_item.option_order[p_selected_index+1];
    v_correct:=v_original=v_question.correct_index;
  end if;
  v_response_ms:=greatest(0,least(45000,(extract(epoch from (least(p_now,v_item.deadline_at)-v_item.served_at))*1000)::int));

  insert into public.training_daily_answers(attempt_id,item_id,agent_id,selected_index,is_correct,timed_out,response_ms,answered_at)
  values(p_attempt_id,v_item.id,p_agent_id,case when v_timeout then null else p_selected_index end,v_correct,v_timeout,v_response_ms,p_now);

  insert into private.training_review_state(agent_id,question_id,times_seen,correct_count,consecutive_correct,last_correct,last_seen_at,next_review_on)
  values(p_agent_id,v_item.question_id,1,case when v_correct then 1 else 0 end,case when v_correct then 1 else 0 end,v_correct,p_now,p_date+case when v_correct then 3 else 1 end)
  on conflict(agent_id,question_id) do update set
    times_seen=private.training_review_state.times_seen+1,
    correct_count=private.training_review_state.correct_count+case when v_correct then 1 else 0 end,
    consecutive_correct=case when v_correct then private.training_review_state.consecutive_correct+1 else 0 end,
    last_correct=v_correct,last_seen_at=p_now,
    next_review_on=p_date+case when not v_correct then 1 when private.training_review_state.consecutive_correct>=1 then 7 else 3 end;

  select count(*)::int into v_answered from public.training_daily_answers where attempt_id=p_attempt_id;
  return jsonb_build_object(
    'correct',v_correct,'timed_out',v_timeout,
    'explanation_en',v_question.explanation_en,'explanation_zh',v_question.explanation_zh,
    'answered',v_answered,'total',5
  );
end;
$function$


CREATE OR REPLACE FUNCTION private.training_exam_record_answer(p_agent_id uuid, p_attempt_id uuid, p_position smallint, p_selected_index smallint, p_now timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_attempt public.training_exam_attempts;
  v_item public.training_exam_items;
  v_current_position smallint;
  v_question private.training_questions;
  v_original smallint;
  v_correct boolean:=false;
  v_timeout boolean:=false;
  v_response_ms int;
  v_answered int;
begin
  select * into v_attempt from public.training_exam_attempts
  where id=p_attempt_id and agent_id=p_agent_id for update;
  if v_attempt.id is null then raise exception 'exam_attempt_not_found'; end if;
  if v_attempt.status<>'active' then raise exception 'attempt_already_finished'; end if;

  select i.position into v_current_position
  from public.training_exam_items i
  left join public.training_exam_answers a on a.item_id=i.id
  where i.attempt_id=p_attempt_id and a.id is null
  order by i.position limit 1;
  if v_current_position is null then raise exception 'all_questions_answered'; end if;
  if p_position<>v_current_position then raise exception 'question_not_current'; end if;

  select * into v_item from public.training_exam_items
  where attempt_id=p_attempt_id and position=p_position for update;
  if exists(select 1 from public.training_exam_answers where item_id=v_item.id) then
    raise exception 'duplicate_answer';
  end if;
  if v_item.served_at is null or v_item.deadline_at is null then raise exception 'question_not_served'; end if;

  select * into v_question from private.training_questions where id=v_item.question_id;
  v_timeout:=p_now>v_item.deadline_at;
  if not v_timeout then
    if p_selected_index is null or p_selected_index<0 or p_selected_index>3 then raise exception 'invalid_answer'; end if;
    v_original:=v_item.option_order[p_selected_index+1];
    v_correct:=v_original=v_question.correct_index;
  end if;

  v_response_ms:=greatest(0,least(45000,(extract(epoch from (least(p_now,v_item.deadline_at)-v_item.served_at))*1000)::int));

  insert into public.training_exam_answers(attempt_id,item_id,agent_id,selected_index,is_correct,timed_out,response_ms,answered_at)
  values(p_attempt_id,v_item.id,p_agent_id,case when v_timeout then null else p_selected_index end,v_correct,v_timeout,v_response_ms,p_now);

  select count(*)::int into v_answered from public.training_exam_answers where attempt_id=p_attempt_id;

  return jsonb_build_object(
    'correct',v_correct,'timed_out',v_timeout,
    'explanation_en',v_question.explanation_en,'explanation_zh',v_question.explanation_zh,
    'answered',v_answered,'total',20
  );
end;
$function$


CREATE OR REPLACE FUNCTION private.training_option_order(p_seed text, p_question_id uuid)
 RETURNS smallint[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select array_agg(i::smallint order by md5(p_seed||':'||p_question_id::text||':'||i::text))
  from generate_series(0,3) g(i);
$function$


CREATE OR REPLACE FUNCTION private.training_select_daily_questions(p_agent_id uuid, p_date date)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_seed text:=md5(p_agent_id::text||':'||p_date::text);
  v_selected uuid[]:='{}'::uuid[];
  v_question uuid;
  v_skill text;
  v_current_difficulty smallint:=1;
  v_weak_count int:=0;
  v_new_count int:=0;
  v_seen_accuracy numeric;
begin
  select avg(case when a.is_correct then 1.0 else 0.0 end)
  into v_seen_accuracy
  from public.training_daily_answers a
  join public.training_daily_items i on i.id=a.item_id
  join private.training_questions q on q.id=i.question_id
  where a.agent_id=p_agent_id and q.bank_type='daily';

  v_current_difficulty:=case
    when v_seen_accuracy is null then 1
    when v_seen_accuracy<0.60 then 1
    when v_seen_accuracy<0.85 then 2
    else 3 end;

  select q.id into v_question
  from private.training_review_state r
  join private.training_questions q on q.id=r.question_id
  where r.agent_id=p_agent_id and q.active=true and q.bank_type='daily' and r.last_correct=false
  order by (r.next_review_on<=p_date) desc nulls last,coalesce(r.next_review_on,p_date),md5(v_seed||':wrong:'||q.id::text)
  limit 1;
  if v_question is not null then v_selected:=array_append(v_selected,v_question); end if;

  for v_skill in
    with skills(skill) as (values('LEAD-FINDING'),('QUALIFY'),('REFERENCE'),('OBJECTION'),('CLOSING'),('PAYMENT')),
    stats as (
      select q.skill_code,
        avg(case when a.is_correct then 1.0 else 0.0 end) accuracy,
        bool_or(r.next_review_on<=p_date) overdue
      from private.training_questions q
      left join public.training_daily_items i on i.question_id=q.id and i.agent_id=p_agent_id
      left join public.training_daily_answers a on a.item_id=i.id
      left join private.training_review_state r on r.agent_id=p_agent_id and r.question_id=q.id
      where q.bank_type='daily'
      group by q.skill_code
    )
    select s.skill from skills s left join stats st on st.skill_code=s.skill
    order by case when coalesce(st.overdue,false) then 0 else 1 end,coalesce(st.accuracy,0.5),md5(v_seed||':skill:'||s.skill)
  loop
    exit when v_weak_count>=2;
    select q.id into v_question
    from private.training_questions q
    where q.active=true and q.bank_type='daily' and q.skill_code=v_skill
      and not(q.id=any(v_selected))
      and not exists(
        select 1 from private.training_review_state r
        where r.agent_id=p_agent_id and r.question_id=q.id
          and r.last_seen_at >= (p_date::timestamp at time zone 'Asia/Kuching')-interval '7 days'
      )
    order by md5(v_seed||':weak:'||q.id::text)
    limit 1;
    if v_question is not null then
      v_selected:=array_append(v_selected,v_question);
      v_weak_count:=v_weak_count+1;
    end if;
  end loop;

  while v_new_count<2 loop
    select q.id into v_question
    from private.training_questions q
    where q.active=true and q.bank_type='daily' and q.difficulty=v_current_difficulty
      and not(q.id=any(v_selected))
      and not exists(select 1 from private.training_review_state r where r.agent_id=p_agent_id and r.question_id=q.id)
    order by md5(v_seed||':new:'||q.id::text)
    limit 1;
    exit when v_question is null;
    v_selected:=array_append(v_selected,v_question);
    v_new_count:=v_new_count+1;
  end loop;

  while cardinality(v_selected)<5 loop
    select q.id into v_question
    from private.training_questions q
    where q.active=true and q.bank_type='daily'
      and not(q.id=any(v_selected))
      and not exists(
        select 1 from private.training_review_state r
        where r.agent_id=p_agent_id and r.question_id=q.id
          and r.last_seen_at >= (p_date::timestamp at time zone 'Asia/Kuching')-interval '7 days'
      )
    order by md5(v_seed||':fill:'||q.id::text)
    limit 1;
    exit when v_question is null;
    v_selected:=array_append(v_selected,v_question);
  end loop;

  while cardinality(v_selected)<5 loop
    select q.id into v_question
    from private.training_questions q
    where q.active=true and q.bank_type='daily' and not(q.id=any(v_selected))
    order by md5(v_seed||':short-bank:'||q.id::text)
    limit 1;
    exit when v_question is null;
    v_selected:=array_append(v_selected,v_question);
  end loop;

  if cardinality(v_selected)<>5 then raise exception 'question_bank_not_ready'; end if;

  select array_agg(x.id order by md5(v_seed||':position:'||x.id::text))
  into v_selected from unnest(v_selected) x(id);
  return v_selected;
end;
$function$


CREATE OR REPLACE FUNCTION private.training_skill_snapshot(p_agent_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
with skills(skill) as (
  values('LEAD-FINDING'),('QUALIFY'),('REFERENCE'),('OBJECTION'),('CLOSING'),('PAYMENT')
),
stats as (
  select q.skill_code,
    count(a.id)::int answers,
    count(a.id) filter(where a.is_correct)::int correct_count
  from private.training_questions q
  left join public.training_daily_items i on i.question_id=q.id and i.agent_id=p_agent_id
  left join public.training_daily_answers a on a.item_id=i.id
  where q.bank_type='daily'
  group by q.skill_code
)
select coalesce(jsonb_agg(jsonb_build_object(
  'skill',s.skill,
  'answers',coalesce(st.answers,0),
  'accuracy',case when coalesce(st.answers,0)>0 then round(st.correct_count::numeric/st.answers,4) else null end
) order by array_position(array['LEAD-FINDING','QUALIFY','REFERENCE','OBJECTION','CLOSING','PAYMENT'],s.skill)),'[]'::jsonb)
from skills s left join stats st on st.skill_code=s.skill;
$function$



CREATE OR REPLACE FUNCTION public.agent_training_answer_internal(p_agent_id uuid, p_date date, p_position smallint, p_selected_index smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_date date:=coalesce(p_date,timezone('Asia/Kuching',now())::date);
  v_attempt_id uuid;
begin
  select id into v_attempt_id from public.training_daily_attempts
  where agent_id=p_agent_id and training_date=v_date;
  if v_attempt_id is null then raise exception 'attempt_not_found'; end if;
  return private.training_daily_record_answer(p_agent_id,v_attempt_id,p_position,p_selected_index,now(),v_date);
end;
$function$


CREATE OR REPLACE FUNCTION public.agent_training_exam_answer_internal(p_agent_id uuid, p_attempt_id uuid, p_position smallint, p_selected_index smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return private.training_exam_record_answer(p_agent_id,p_attempt_id,p_position,p_selected_index,now());
end;
$function$


CREATE OR REPLACE FUNCTION public.agent_training_exam_finish_internal(p_agent_id uuid, p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_attempt public.training_exam_attempts;
  v_answered int;
  v_correct int;
  v_score numeric;
  v_pass boolean;
  v_before text;
  v_after text;
  v_cert jsonb;
begin
  select * into v_attempt from public.training_exam_attempts
  where id=p_attempt_id and agent_id=p_agent_id for update;
  if v_attempt.id is null then raise exception 'exam_attempt_not_found'; end if;

  if v_attempt.status='completed' then
    return jsonb_build_object(
      'score',v_attempt.score,'passed',v_attempt.passed,
      'agent_status_before',v_attempt.agent_status_before,'agent_status_after',v_attempt.agent_status_after,
      'already_finished',true
    );
  end if;

  select count(*)::int,count(*) filter(where is_correct)::int
  into v_answered,v_correct
  from public.training_exam_answers where attempt_id=p_attempt_id;
  if v_answered<>20 then raise exception 'questions_remaining'; end if;

  v_score:=v_correct*5;
  v_pass:=v_score>=85;
  select status into v_before from public.agents where id=p_agent_id;

  update public.training_exam_attempts
  set status='completed',finished_at=now(),score=v_score,passed=v_pass
  where id=p_attempt_id;

  if v_pass then
    v_cert:=public.refresh_agent_certification_internal(p_agent_id);
    v_after:=v_cert->>'agent_status';
  else
    v_after:=v_before;
  end if;

  update public.training_exam_attempts set agent_status_after=v_after where id=p_attempt_id;

  return jsonb_build_object(
    'score',v_score,'passed',v_pass,
    'agent_status_before',v_before,'agent_status_after',v_after,
    'certification',case when v_pass then v_cert else null end
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.agent_training_exam_start_internal(p_agent_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_attempt public.training_exam_attempts;
  v_agent_status text;
  v_remaining int;
  v_no int;
  v_ids uuid[];
  v_qid uuid;
  v_item public.training_exam_items;
  v_q private.training_questions;
  v_i int;
  v_options_en jsonb;
  v_options_zh jsonb;
begin
  select status into v_agent_status from public.agents where id=p_agent_id;
  if v_agent_status is null then raise exception 'agent_not_found'; end if;

  if exists(select 1 from public.training_exam_attempts where agent_id=p_agent_id and status='completed' and passed=true) then
    return jsonb_build_object('status','passed','already_passed',true,'question',null);
  end if;

  select count(*) into v_remaining
  from public.training_modules m
  left join public.training_progress p on p.module_id=m.id and p.agent_id=p_agent_id
  where m.required=true and m.active=true and coalesce(p.status,'assigned')<>'passed';
  if v_remaining>0 then raise exception 'exam_prerequisites_incomplete'; end if;

  select * into v_attempt from public.training_exam_attempts
  where agent_id=p_agent_id and status='active'
  order by attempt_no desc limit 1;

  if v_attempt.id is null then
    select count(*) into v_i from private.training_questions where active=true and bank_type='exam';
    if v_i<20 then raise exception 'exam_bank_not_ready'; end if;

    select coalesce(max(attempt_no),0)+1 into v_no
    from public.training_exam_attempts where agent_id=p_agent_id;

    insert into public.training_exam_attempts(agent_id,attempt_no,seed_hash,agent_status_before)
    values(p_agent_id,v_no,md5(p_agent_id::text||':exam:'||v_no::text),v_agent_status)
    returning * into v_attempt;

    select array_agg(id order by md5(v_attempt.seed_hash||':'||id::text))
    into v_ids
    from (
      select id from private.training_questions
      where active=true and bank_type='exam'
      order by md5(v_attempt.seed_hash||':'||id::text)
      limit 20
    ) q;

    for v_i in 1..20 loop
      v_qid:=v_ids[v_i];
      insert into public.training_exam_items(attempt_id,agent_id,position,question_id,option_order)
      values(v_attempt.id,p_agent_id,v_i,v_qid,private.training_option_order(v_attempt.seed_hash,v_qid));
    end loop;
  end if;

  loop
    select i.* into v_item
    from public.training_exam_items i
    left join public.training_exam_answers a on a.item_id=i.id
    where i.attempt_id=v_attempt.id and a.id is null
    order by i.position limit 1;
    exit when v_item.id is null;
    if v_item.served_at is not null and v_item.deadline_at<=now() then
      perform private.training_exam_record_answer(p_agent_id,v_attempt.id,v_item.position,null,now());
    else
      exit;
    end if;
  end loop;

  select i.* into v_item
  from public.training_exam_items i
  left join public.training_exam_answers a on a.item_id=i.id
  where i.attempt_id=v_attempt.id and a.id is null
  order by i.position limit 1;

  if v_item.id is null then
    return jsonb_build_object(
      'attempt_id',v_attempt.id,'attempt_no',v_attempt.attempt_no,
      'status','ready_to_finish','question',null,'total',20
    );
  end if;

  if v_item.served_at is null then
    update public.training_exam_items
    set served_at=now(),deadline_at=now()+interval '45 seconds'
    where id=v_item.id returning * into v_item;
  end if;

  select * into v_q from private.training_questions where id=v_item.question_id;

  v_options_en:=jsonb_build_array(
    v_q.options_en->v_item.option_order[1],v_q.options_en->v_item.option_order[2],
    v_q.options_en->v_item.option_order[3],v_q.options_en->v_item.option_order[4]
  );
  v_options_zh:=jsonb_build_array(
    v_q.options_zh->v_item.option_order[1],v_q.options_zh->v_item.option_order[2],
    v_q.options_zh->v_item.option_order[3],v_q.options_zh->v_item.option_order[4]
  );

  return jsonb_build_object(
    'attempt_id',v_attempt.id,'attempt_no',v_attempt.attempt_no,'status','active','total',20,
    'question',jsonb_build_object(
      'position',v_item.position,'skill',v_q.skill_code,
      'question_en',v_q.question_en,'question_zh',v_q.question_zh,
      'options_en',v_options_en,'options_zh',v_options_zh,
      'served_at',v_item.served_at,'deadline_at',v_item.deadline_at
    )
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.agent_training_finish_internal(p_agent_id uuid, p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_date date:=coalesce(p_date,timezone('Asia/Kuching',now())::date);
  v_attempt public.training_daily_attempts;
  v_answered int;
  v_correct int;
  v_score numeric;
  v_pass boolean;
  v_prev_streak int:=0;
  v_streak int:=0;
  v_three_fail boolean:=false;
  v_weak jsonb:='[]'::jsonb;
  v_audit_written boolean:=false;
begin
  select * into v_attempt from public.training_daily_attempts
  where agent_id=p_agent_id and training_date=v_date for update;
  if v_attempt.id is null then raise exception 'attempt_not_found'; end if;
  if v_attempt.status='completed' then
    return jsonb_build_object('score',v_attempt.score,'passed',v_attempt.passed,'streak',v_attempt.streak_after,'already_finished',true);
  end if;

  select count(*)::int,count(*) filter(where is_correct)::int
  into v_answered,v_correct from public.training_daily_answers where attempt_id=v_attempt.id;
  if v_answered<>5 then raise exception 'questions_remaining'; end if;

  v_score:=v_correct*20;
  v_pass:=v_score>=80;

  if v_pass then
    select case when training_date=v_date-1 and passed=true then streak_after else 0 end
    into v_prev_streak
    from public.training_daily_attempts
    where agent_id=p_agent_id and training_date<v_date and status='completed'
    order by training_date desc limit 1;
    v_streak:=coalesce(v_prev_streak,0)+1;
  else
    v_streak:=0;
  end if;

  update public.training_daily_attempts
  set status='completed',finished_at=now(),score=v_score,passed=v_pass,streak_after=v_streak
  where id=v_attempt.id;

  select count(*)=3 and bool_and(not passed)
  into v_three_fail
  from (
    select passed from public.training_daily_attempts
    where agent_id=p_agent_id and status='completed' and training_date<=v_date
    order by training_date desc limit 3
  ) x;

  with skill_stats as (
    select q.skill_code,count(a.id)::int n,count(a.id) filter(where a.is_correct)::int c
    from public.training_daily_answers a
    join public.training_daily_items i on i.id=a.item_id
    join private.training_questions q on q.id=i.question_id
    where a.agent_id=p_agent_id and q.bank_type='daily'
    group by q.skill_code
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'skill',skill_code,'accuracy',round(c::numeric/n,4),'answers',n
  )) filter(where n>0 and c::numeric/n<0.60),'[]'::jsonb)
  into v_weak from skill_stats;

  if v_three_fail or jsonb_array_length(v_weak)>0 then
    if not exists(
      select 1 from private.audit_events
      where action='MICRO_TRAINING' and entity_type='agent' and entity_id=p_agent_id::text
        and after_state->>'training_date'=v_date::text
    ) then
      insert into private.audit_events(actor_type,action,entity_type,entity_id,after_state,rule_version)
      values(
        'system','MICRO_TRAINING','agent',p_agent_id::text,
        jsonb_build_object(
          'training_date',v_date,'three_consecutive_failures',v_three_fail,
          'weak_skills',v_weak,'source','daily_mcq'
        ),
        'phase3_v1'
      );
      v_audit_written:=true;
    end if;
  end if;

  return jsonb_build_object(
    'score',v_score,'passed',v_pass,'streak',v_streak,
    'weak_skills',v_weak,'micro_training_audit_written',v_audit_written
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.agent_training_summary_internal(p_agent_id uuid, p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_date date:=coalesce(p_date,timezone('Asia/Kuching',now())::date);
  v_today public.training_daily_attempts;
  v_streak int:=0;
  v_remaining int:=0;
  v_exam_passed boolean:=false;
begin
  select * into v_today from public.training_daily_attempts
  where agent_id=p_agent_id and training_date=v_date;

  select coalesce(streak_after,0) into v_streak
  from public.training_daily_attempts
  where agent_id=p_agent_id and status='completed' and training_date<v_date
  order by training_date desc limit 1;

  select count(*) into v_remaining
  from public.training_modules m
  left join public.training_progress p on p.module_id=m.id and p.agent_id=p_agent_id
  where m.required=true and m.active=true and coalesce(p.status,'assigned')<>'passed';

  select exists(
    select 1 from public.training_exam_attempts
    where agent_id=p_agent_id and status='completed' and passed=true
  ) into v_exam_passed;

  return jsonb_build_object(
    'date',v_date,
    'status',case when v_today.id is null then 'not_started' else v_today.status end,
    'score',v_today.score,
    'passed',v_today.passed,
    'streak',case when v_today.status='completed' then v_today.streak_after else v_streak end,
    'answered',case when v_today.id is null then 0 else (select count(*) from public.training_daily_answers where attempt_id=v_today.id) end,
    'total',5,
    'skills',private.training_skill_snapshot(p_agent_id),
    'exam_passed',v_exam_passed,
    'remaining_required',v_remaining,
    'question',null
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.agent_training_today_internal(p_agent_id uuid, p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_date date:=coalesce(p_date,timezone('Asia/Kuching',now())::date);
  v_attempt public.training_daily_attempts;
  v_ids uuid[];
  v_qid uuid;
  v_item public.training_daily_items;
  v_q private.training_questions;
  v_answered int:=0;
  v_streak int:=0;
  v_i int;
  v_options_en jsonb;
  v_options_zh jsonb;
begin
  if not exists(select 1 from public.agents where id=p_agent_id) then raise exception 'agent_not_found'; end if;

  select * into v_attempt from public.training_daily_attempts
  where agent_id=p_agent_id and training_date=v_date;

  if v_attempt.id is null then
    v_ids:=private.training_select_daily_questions(p_agent_id,v_date);
    insert into public.training_daily_attempts(agent_id,training_date,seed_hash)
    values(p_agent_id,v_date,md5(p_agent_id::text||':'||v_date::text))
    returning * into v_attempt;
    for v_i in 1..5 loop
      v_qid:=v_ids[v_i];
      insert into public.training_daily_items(attempt_id,agent_id,position,question_id,option_order)
      values(v_attempt.id,p_agent_id,v_i,v_qid,private.training_option_order(v_attempt.seed_hash,v_qid));
    end loop;
  end if;

  if v_attempt.status='completed' then
    return jsonb_build_object(
      'date',v_date,'status','completed','score',v_attempt.score,'passed',v_attempt.passed,
      'streak',v_attempt.streak_after,'answered',5,'total',5,'question',null,
      'skills',private.training_skill_snapshot(p_agent_id)
    );
  end if;

  loop
    select i.* into v_item
    from public.training_daily_items i
    left join public.training_daily_answers a on a.item_id=i.id
    where i.attempt_id=v_attempt.id and a.id is null
    order by i.position limit 1;
    exit when v_item.id is null;
    if v_item.served_at is not null and v_item.deadline_at<=now() then
      perform private.training_daily_record_answer(p_agent_id,v_attempt.id,v_item.position,null,now(),v_date);
    else
      exit;
    end if;
  end loop;

  select count(*)::int into v_answered from public.training_daily_answers where attempt_id=v_attempt.id;
  select coalesce(streak_after,0) into v_streak
  from public.training_daily_attempts
  where agent_id=p_agent_id and status='completed' and training_date<v_date
  order by training_date desc limit 1;

  select i.* into v_item
  from public.training_daily_items i
  left join public.training_daily_answers a on a.item_id=i.id
  where i.attempt_id=v_attempt.id and a.id is null
  order by i.position limit 1;

  if v_item.id is null then
    return jsonb_build_object(
      'date',v_date,'status','ready_to_finish','answered',v_answered,'total',5,
      'streak',v_streak,'question',null,'skills',private.training_skill_snapshot(p_agent_id)
    );
  end if;

  if v_item.served_at is null then
    update public.training_daily_items
    set served_at=now(),deadline_at=now()+interval '45 seconds'
    where id=v_item.id returning * into v_item;
  end if;

  select * into v_q from private.training_questions where id=v_item.question_id;
  v_options_en:=jsonb_build_array(
    v_q.options_en->v_item.option_order[1],v_q.options_en->v_item.option_order[2],
    v_q.options_en->v_item.option_order[3],v_q.options_en->v_item.option_order[4]
  );
  v_options_zh:=jsonb_build_array(
    v_q.options_zh->v_item.option_order[1],v_q.options_zh->v_item.option_order[2],
    v_q.options_zh->v_item.option_order[3],v_q.options_zh->v_item.option_order[4]
  );

  return jsonb_build_object(
    'date',v_date,'status','active','answered',v_answered,'total',5,'streak',v_streak,
    'skills',private.training_skill_snapshot(p_agent_id),
    'question',jsonb_build_object(
      'position',v_item.position,'skill',v_q.skill_code,
      'question_en',v_q.question_en,'question_zh',v_q.question_zh,
      'options_en',v_options_en,'options_zh',v_options_zh,
      'served_at',v_item.served_at,'deadline_at',v_item.deadline_at
    )
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.record_training_result_internal(p_agent_id uuid, p_module_code text, p_score numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_mod public.training_modules;
  v_pass boolean;
  r record;
  req_module text;
  req_score numeric;
  v_cert jsonb;
begin
  select * into v_mod from public.training_modules where code=p_module_code and active=true;
  if v_mod.id is null then raise exception 'module not found'; end if;
  if p_score<0 or p_score>100 then raise exception 'invalid score'; end if;
  v_pass:=p_score>=v_mod.pass_score;

  insert into public.training_progress(agent_id,module_id,status,attempts,best_score,last_attempt_at,completed_at,assigned_reason)
  values(
    p_agent_id,v_mod.id,case when v_pass then 'passed' else 'failed' end,1,p_score,now(),
    case when v_pass then now() else null end,'ai_training'
  )
  on conflict(agent_id,module_id) do update set
    status=case when v_pass then 'passed' else 'failed' end,
    attempts=public.training_progress.attempts+1,
    best_score=greatest(coalesce(public.training_progress.best_score,0),p_score),
    last_attempt_at=now(),
    completed_at=case when v_pass then coalesce(public.training_progress.completed_at,now()) else public.training_progress.completed_at end;

  if v_pass then
    for r in select id,requirements from public.recovery_tasks where agent_id=p_agent_id and status='active' loop
      req_module:=r.requirements->>'module';
      req_score:=coalesce((r.requirements->>'minimum_score')::numeric,0);
      if req_module=p_module_code and p_score>=req_score then
        update public.recovery_tasks set status='completed',completed_at=now() where id=r.id;
      end if;
    end loop;
  end if;

  v_cert:=public.refresh_agent_certification_internal(p_agent_id);

  return jsonb_build_object(
    'passed',v_pass,
    'remaining_required',(v_cert->>'remaining_required')::int,
    'open_recovery_tasks',(v_cert->>'open_recovery_tasks')::int,
    'open_serious_violations',(v_cert->>'open_serious_violations')::int,
    'exam_passed',(v_cert->>'exam_passed')::boolean,
    'agent_status',v_cert->>'agent_status'
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.refresh_agent_certification_internal(p_agent_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_remaining int;
  v_open_recovery int;
  v_serious int;
  v_exam_passed boolean;
  v_status text;
begin
  select count(*) into v_remaining
  from public.training_modules m
  left join public.training_progress p on p.module_id=m.id and p.agent_id=p_agent_id
  where m.required=true and m.active=true and coalesce(p.status,'assigned')<>'passed';

  select count(*) into v_open_recovery from public.recovery_tasks
  where agent_id=p_agent_id and status='active';

  select count(*) into v_serious from public.violations
  where agent_id=p_agent_id and severity in('high','critical')
    and status not in('resolved','dismissed');

  select exists(
    select 1 from public.training_exam_attempts
    where agent_id=p_agent_id and status='completed' and passed=true
  ) into v_exam_passed;

  if v_remaining=0 and v_open_recovery=0 and v_serious=0 and v_exam_passed then
    update public.agents
    set status='active',certified_at=coalesce(certified_at,now()),last_active_at=now(),updated_at=now()
    where id=p_agent_id and status in('trainee','certified','recovery','restricted')
    returning status into v_status;

    update public.violations
    set status='resolved',resolved_at=now()
    where agent_id=p_agent_id and severity in('low','medium')
      and status in('open','training_assigned','restricted');
  end if;

  if v_status is null then select status into v_status from public.agents where id=p_agent_id; end if;

  return jsonb_build_object(
    'remaining_required',v_remaining,'open_recovery_tasks',v_open_recovery,
    'open_serious_violations',v_serious,'exam_passed',v_exam_passed,'agent_status',v_status
  );
end;
$function$


revoke all on function public.agent_training_summary_internal(uuid,date) from public,anon,authenticated;
revoke all on function public.agent_training_today_internal(uuid,date) from public,anon,authenticated;
revoke all on function public.agent_training_answer_internal(uuid,date,smallint,smallint) from public,anon,authenticated;
revoke all on function public.agent_training_finish_internal(uuid,date) from public,anon,authenticated;
revoke all on function public.agent_training_exam_start_internal(uuid) from public,anon,authenticated;
revoke all on function public.agent_training_exam_answer_internal(uuid,uuid,smallint,smallint) from public,anon,authenticated;
revoke all on function public.agent_training_exam_finish_internal(uuid,uuid) from public,anon,authenticated;
revoke all on function public.refresh_agent_certification_internal(uuid) from public,anon,authenticated;
grant execute on function public.agent_training_summary_internal(uuid,date) to service_role;
grant execute on function public.agent_training_today_internal(uuid,date) to service_role;
grant execute on function public.agent_training_answer_internal(uuid,date,smallint,smallint) to service_role;
grant execute on function public.agent_training_finish_internal(uuid,date) to service_role;
grant execute on function public.agent_training_exam_start_internal(uuid) to service_role;
grant execute on function public.agent_training_exam_answer_internal(uuid,uuid,smallint,smallint) to service_role;
grant execute on function public.agent_training_exam_finish_internal(uuid,uuid) to service_role;
grant execute on function public.refresh_agent_certification_internal(uuid) to service_role;

