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
