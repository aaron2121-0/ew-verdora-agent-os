-- Seven-day onboarding: use the EXISTING seven training modules and the EXISTING
-- private.training_questions bank (no new skill_code values).
-- Applying this migration does not publish content or grant client-table access.
alter table public.training_modules
  add column if not exists handbook_section text;
do $$
begin
 if not exists(select 1 from pg_constraint where conname='training_modules_handbook_section_check') then
  alter table public.training_modules
   add constraint training_modules_handbook_section_check
   check (handbook_section is null or handbook_section in
    ('condolence','opening','bouquet','wedding_event','wholesale'));
 end if;
end $$;

-- Provisional curriculum mapping, subject to Owner review; does not create
-- product claims or override Owner-approved knowledge visibility.
update public.training_modules set handbook_section=case code
 when 'CORE-BRAND' then 'bouquet'
 when 'LEAD-FINDING' then 'wholesale'
 when 'QUALIFY' then 'opening'
 when 'REFERENCE' then 'wedding_event'
 when 'OBJECTION' then 'condolence'
 when 'CLOSING' then 'bouquet'
 when 'PAYMENT' then 'wholesale'
 else handbook_section end
where required=true and code in
 ('CORE-BRAND','LEAD-FINDING','QUALIFY','REFERENCE','OBJECTION','CLOSING','PAYMENT')
 and handbook_section is null;

create table if not exists public.training_module_quiz_attempts(
 id uuid primary key default gen_random_uuid(),
 agent_id uuid not null references public.agents(id) on delete cascade,
 module_code text not null,
 attempt_no int not null check(attempt_no>=1),
 status text not null default 'active' check(status in('active','completed')),
 score numeric check(score>=0 and score<=100),
 passed boolean,
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 unique(agent_id,module_code,attempt_no)
);
create unique index if not exists one_active_module_quiz_per_agent
 on public.training_module_quiz_attempts(agent_id,module_code)
 where status='active';

create table if not exists public.training_module_quiz_items(
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.training_module_quiz_attempts(id) on delete cascade,
 agent_id uuid not null references public.agents(id) on delete cascade,
 position smallint not null check(position between 1 and 3),
 question_id uuid not null references private.training_questions(id),
 option_order smallint[] not null check(cardinality(option_order)=4),
 selected_index smallint check(selected_index between 0 and 3),
 is_correct boolean,
 answered_at timestamptz,
 unique(attempt_id,position),
 unique(attempt_id,question_id)
);
create index if not exists training_module_quiz_items_agent_idx
 on public.training_module_quiz_items(agent_id,attempt_id);
alter table public.training_module_quiz_attempts enable row level security;
alter table public.training_module_quiz_items enable row level security;
revoke all on public.training_module_quiz_attempts,public.training_module_quiz_items from public,anon,authenticated;
grant select,insert,update,delete on public.training_module_quiz_attempts,public.training_module_quiz_items to service_role;

comment on table public.training_module_quiz_attempts is
 'Server-graded 3-question module checkpoint. A pass is recorded through the existing record_training_result_internal RPC.';
comment on table public.training_module_quiz_items is
 'Question answers and private question IDs never leave the authenticated server.';


-- Private MCQ bank is intentionally NOT exposed via PostgREST. Edge Functions
-- obtain only the needed rows through restricted SECURITY DEFINER public RPCs.
create or replace function public.agent_module_quiz_pool_internal(
  p_agent_id uuid,p_module_code text)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare v_pool jsonb;
begin
 if not exists(select 1 from public.agents where id=p_agent_id) then
  raise exception 'agent_not_found';
 end if;
 if p_module_code not in
  ('CORE-BRAND','LEAD-FINDING','QUALIFY','REFERENCE','OBJECTION','CLOSING','PAYMENT')
 then raise exception 'invalid_module'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',z.id,'code',z.code,'skill_code',z.skill_code)),'[]'::jsonb)
 into v_pool
 from (
  select q.id,q.code,q.skill_code from private.training_questions q
  where q.active=true and q.is_test=false and q.bank_type='daily'
    and (case when p_module_code='CORE-BRAND' then
      q.code like 'HB-CORE-BRAND-%'
      else q.skill_code=p_module_code end)
  order by (q.code like 'HB-%') desc,md5(p_agent_id::text||':'||q.id::text)
  limit 250
 ) z;
 return v_pool;
end;
$$;

create or replace function public.agent_module_quiz_question_internal(
  p_agent_id uuid,p_question_id uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare v_question private.training_questions;
begin
 if not exists(select 1 from public.agents where id=p_agent_id) then
  raise exception 'agent_not_found';
 end if;
 select * into v_question from private.training_questions
  where id=p_question_id and active=true and is_test=false and bank_type='daily';
 if v_question.id is null then raise exception 'question_not_found'; end if;
 return jsonb_build_object(
  'id',v_question.id,'question_en',v_question.question_en,
  'question_zh',v_question.question_zh,'options_en',v_question.options_en,
  'options_zh',v_question.options_zh,'correct_index',v_question.correct_index,
  'explanation_en',v_question.explanation_en,'explanation_zh',v_question.explanation_zh,'related_card_code',v_question.related_card_code
 );
end;
$$;

revoke all on function public.agent_module_quiz_pool_internal(uuid,text),
 public.agent_module_quiz_question_internal(uuid,uuid) from public,anon,authenticated;
grant execute on function public.agent_module_quiz_pool_internal(uuid,text),
 public.agent_module_quiz_question_internal(uuid,uuid) to service_role;


-- Owner rule: one server-side read record per actual reviewed handbook card.
create table if not exists public.training_module_reads(
 agent_id uuid not null references public.agents(id) on delete cascade,
 module_code text not null,
 card_code text not null check(length(btrim(card_code))>0),
 read_at timestamptz not null default now(),
 primary key(agent_id,module_code,card_code)
);
create index if not exists training_module_reads_agent_idx
 on public.training_module_reads(agent_id,module_code,read_at);
alter table public.training_module_reads enable row level security;
revoke all on public.training_module_reads from public,anon,authenticated;
grant select,insert,update,delete on public.training_module_reads to service_role;
comment on table public.training_module_reads is
 'Server-persisted course reading checkpoints, submitted after >=4s per card in UI. Codes must be validated against current Owner-approved handbook before insertion.';

-- Optional card reference for a wrong answer. No fallback card data is fabricated.
alter table private.training_questions
 add column if not exists related_card_code text;
comment on column private.training_questions.related_card_code is
 'Owner-reviewed handbook card code used for incorrect-answer return link; NULL means first course card.';

-- No client policy on the module read table, private questions or handbook.
