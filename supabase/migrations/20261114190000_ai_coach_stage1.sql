-- AI Coach Stage 1. Schema and deterministic missions only.
-- Do not alter original missions, training, status, payout, or financial rules.

create table if not exists private.coach_daily_plans (
  agent_id uuid not null references public.agents(id) on delete cascade,
  plan_date date not null,
  status text not null default 'active' check (status in ('active','reviewed')),
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (agent_id,plan_date)
);

create table if not exists private.coach_tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null,
  plan_date date not null,
  kind text not null check (kind in (
    'follow_up','find_lead','reactivate','ask_referral','post_content','request_quote','practice'
  )),
  lead_id uuid references public.leads(id) on delete set null,
  title_en text not null,
  title_zh text not null,
  why_en text not null,
  why_zh text not null,
  draft_en text not null default '',
  draft_zh text not null default '',
  minutes int not null default 5 check (minutes between 1 and 60),
  priority int not null check (priority between 1 and 20),
  status text not null default 'todo' check (status in ('todo','done','skipped')),
  outcome text check (outcome in (
    'no_reply','replied','interested','quote_requested','ordered','lost'
  )),
  outcome_note text,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (agent_id,plan_date)
    references private.coach_daily_plans(agent_id,plan_date) on delete cascade
);

create unique index if not exists coach_tasks_one_lead_per_day
  on private.coach_tasks(agent_id,plan_date,lead_id) where lead_id is not null;
create unique index if not exists coach_tasks_one_priority_per_day
  on private.coach_tasks(agent_id,plan_date,priority);
create index if not exists coach_tasks_agent_date_status
  on private.coach_tasks(agent_id,plan_date,status);

create table if not exists private.agent_skill_state (
  agent_id uuid not null references public.agents(id) on delete cascade,
  skill text not null check (skill in (
    'opening_line','ask_date_budget','follow_up','objection_price',
    'photo_rule','condolence_care','closing','referral'
  )),
  level smallint not null default 0 check (level between 0 and 5),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  updated_at timestamptz not null default now(),
  primary key(agent_id,skill)
);

create table if not exists private.coach_sessions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  task_id uuid references private.coach_tasks(id) on delete set null,
  skill text not null check (skill in (
    'opening_line','ask_date_budget','follow_up','objection_price',
    'photo_rule','condolence_care','closing','referral'
  )),
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  turns jsonb not null default '[]'::jsonb check (jsonb_typeof(turns)='array'),
  score smallint check (score between 0 and 100),
  feedback jsonb not null default '{}'::jsonb check (jsonb_typeof(feedback)='object'),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists coach_sessions_agent_created
  on private.coach_sessions(agent_id,created_at desc);

-- Defense in depth: no anonymous or user-facing PostgREST access.
alter table private.coach_daily_plans enable row level security;
alter table private.coach_tasks enable row level security;
alter table private.agent_skill_state enable row level security;
alter table private.coach_sessions enable row level security;
revoke all on private.coach_daily_plans, private.coach_tasks,
  private.agent_skill_state, private.coach_sessions from public, anon, authenticated;
grant select,insert,update,delete on private.coach_daily_plans, private.coach_tasks,
  private.agent_skill_state, private.coach_sessions to service_role;

create or replace function private.coach_build_plan_internal(
  p_agent_id uuid,
  p_date date default (timezone('Asia/Kuching',now()))::date
) returns jsonb
language plpgsql security definer set search_path = ''
as $fn$
declare
  v_agent public.agents%rowtype;
  v_locked boolean;
  v_n int := 3;
  v_total int := 0;
  v_done int := 0;
  v_count int := 0;
  v_kind text;
  v_title_en text;
  v_title_zh text;
  v_why_en text;
  v_why_zh text;
  v_draft_en text;
  v_draft_zh text;
  v_minutes int;
  v_holiday text;
  v_mission jsonb := null;
  v_progress jsonb := '{}'::jsonb;
  v_existing private.coach_daily_plans%rowtype;
  v_start timestamptz;
  v_end timestamptz;
  r record;
begin
  if p_agent_id is null or p_date is null then
    raise exception 'agent and date required';
  end if;
  -- Serialize overlapping cron and API calls for the same agent/day.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_agent_id::text || ':' || p_date::text,0)
  );
  select * into v_agent from public.agents where id=p_agent_id;
  if not found then raise exception 'agent not found'; end if;
  if v_agent.is_demo then
    return jsonb_build_object('skipped','demo','agent_id',p_agent_id,'plan_date',p_date);
  end if;
  select * into v_existing
  from private.coach_daily_plans where agent_id=p_agent_id and plan_date=p_date;
  if found then
    return jsonb_build_object(
      'agent_id',p_agent_id,'plan_date',p_date,'existing',true,
      'summary',v_existing.summary,
      'tasks',coalesce((select jsonb_agg(to_jsonb(t) order by t.priority)
        from private.coach_tasks t where t.agent_id=p_agent_id and t.plan_date=p_date),'[]'::jsonb)
    );
  end if;

  v_locked := v_agent.status in ('trainee','restricted','recovery','dormant','suspended');
  v_start := (p_date::timestamp at time zone 'Asia/Kuching');
  v_end := ((p_date+1)::timestamp at time zone 'Asia/Kuching');

  select count(*)::int,
         count(*) filter (where t.status='done')::int
    into v_total,v_done
  from private.coach_tasks t
  where t.agent_id=p_agent_id and t.plan_date>=p_date-7 and t.plan_date<p_date;
  if v_total > 0 then
    v_n := case when v_done::numeric/v_total >= 0.80 then 5
                when v_done::numeric/v_total >= 0.50 then 4
                else 3 end;
  end if;

  -- Read the existing target only. Never call its mutating get_or_create function.
  select to_jsonb(dm) into v_mission from public.daily_missions dm
  where dm.agent_id=p_agent_id and dm.mission_date=p_date;
  select public.agent_today_progress_internal(p_agent_id,p_date) into v_progress;

  -- Fixed-date / computable seasonal opportunities; variable lunar holidays are not guessed.
  select case
    when to_char(d,'MM-DD')='02-14' then 'Valentine''s Day'
    when to_char(d,'MM-DD')='03-08' then 'International Women''s Day'
    when to_char(d,'MM-DD')='05-16' then 'Teachers'' Day'
    when to_char(d,'MM-DD') in ('06-01','06-02') then 'Gawai'
    when to_char(d,'MM-DD')='12-25' then 'Christmas'
    when extract(month from d)=5
      and extract(dow from d)=0 and extract(day from d) between 8 and 14 then 'Mother''s Day'
    when extract(month from d)=6
      and extract(dow from d)=0 and extract(day from d) between 15 and 21 then 'Father''s Day'
  end into v_holiday
  from pg_catalog.generate_series(p_date::timestamp,(p_date+14)::timestamp,'1 day'::interval) AS days(d)
  where (to_char(d,'MM-DD') in ('02-14','03-08','05-16','06-01','06-02','12-25'))
     or (extract(month from d)=5 and extract(dow from d)=0 and extract(day from d) between 8 and 14)
     or (extract(month from d)=6 and extract(dow from d)=0 and extract(day from d) between 15 and 21)
  order by d limit 1;

  insert into private.coach_daily_plans(agent_id,plan_date,status,summary)
  values(p_agent_id,p_date,'active',jsonb_build_object(
    'selling_locked',v_locked,'target_tasks',v_n,
    'previous_7d',jsonb_build_object('completed',v_done,'assigned',v_total),
    'existing_mission_readonly',coalesce(v_mission,'null'::jsonb),
    'today_progress_readonly',coalesce(v_progress,'{}'::jsonb),
    'seasonal_opportunity',v_holiday
  ));

  if not v_locked then
    -- One candidate per lead. Quote > due follow-up > qualification > referral > reactivation.
    for r in
      select l.id as lead_id, x.kind
      from public.leads l
      left join lateral (
        select q.id,q.status
        from public.quotes q
        where q.lead_id=l.id and q.agent_id=p_agent_id
        order by q.quote_version desc,q.created_at desc limit 1
      ) q on true
      left join lateral (
        select max(e.created_at) as last_at
        from public.lead_events e where e.lead_id=l.id and e.agent_id=p_agent_id
      ) ev on true
      left join lateral (
        select max(o.completed_at) as completed_at
        from public.orders o join public.quotes oq on oq.id=o.quote_id
        where oq.lead_id=l.id and o.agent_id=p_agent_id and o.status='completed'
      ) recent_sale on true
      cross join lateral (
        select case
          when l.status not in ('won','lost','archived')
            and q.status in ('approved','sent','accepted')
            and not exists (
              select 1 from public.orders o join public.quotes oq on oq.id=o.quote_id
              where oq.lead_id=l.id and o.agent_id=p_agent_id
                and o.status not in ('cancelled','exception')
            ) then 'follow_up'
          when l.status not in ('won','lost','archived')
            and l.next_followup_at < v_end then 'follow_up'
          when l.status in ('qualified','follow_up')
            and q.id is null then 'request_quote'
          when recent_sale.completed_at >= v_start-interval '7 days'
            and recent_sale.completed_at < v_end then 'ask_referral'
          when l.status not in ('lost','archived')
            and greatest(l.updated_at,coalesce(ev.last_at,l.updated_at)) <= v_start-interval '30 days'
            then 'reactivate'
          else null
        end as kind
      ) x
      where l.agent_id=p_agent_id and x.kind is not null
      order by
        case
          when x.kind='follow_up' and q.status in ('approved','sent','accepted') then 1
          when x.kind='follow_up' then 2
          when x.kind='request_quote' then 3
          when x.kind='ask_referral' then 4
          else 5 end,
        l.next_followup_at nulls last,l.updated_at,l.id
      limit v_n
    loop
      v_kind:=r.kind;
      case v_kind
        when 'follow_up' then
          v_title_en:='Follow up with a warm lead'; v_title_zh:='跟进已经接触的客户';
          v_why_en:='This customer is already closer to deciding than a new prospect.';
          v_why_zh:='已经沟通过的客户更接近下单。';
          v_draft_en:='Hi! Just following up on the floral arrangement. Would you like me to help with the next step?';
          v_draft_zh:='Hi～想跟进一下之前聊的花礼，需要我帮你安排下一步吗？';
          v_minutes:=5;
        when 'request_quote' then
          v_title_en:='Confirm date and budget'; v_title_zh:='确认日期与预算并申请报价';
          v_why_en:='Clear details make it easier to request an accurate quotation.';
          v_why_zh:='确认需求后才能更快申请正式报价。';
          v_draft_en:='May I confirm the occasion, required date and estimated budget? I can then request a quotation for you.';
          v_draft_zh:='可以告诉我用途、需要的日期和大概预算吗？我再帮你申请正式报价。';
          v_minutes:=7;
        when 'ask_referral' then
          v_title_en:='Ask a recent customer for a referral'; v_title_zh:='请最近成交客户介绍朋友';
          v_why_en:='A happy recent customer may introduce someone with a real occasion.';
          v_why_zh:='近期客户有机会介绍真正有送花需求的朋友。';
          v_draft_en:='Thanks again for trusting us. If anyone around you needs a floral arrangement, you are welcome to share my contact.';
          v_draft_zh:='谢谢你之前的支持～身边如果有朋友需要花礼，欢迎介绍给我呀。';
          v_minutes:=4;
        else
          v_title_en:='Reconnect with a past contact'; v_title_zh:='重新联系旧客户';
          v_why_en:='A gentle check-in can reveal upcoming occasions without pressure.';
          v_why_zh:='自然问候有机会了解客户近期是否有送花计划。';
          v_draft_en:='Hi! Just checking in. Do you have any occasions coming up where a floral arrangement might help?';
          v_draft_zh:='Hi～最近还好吗？接下来有需要准备花礼的场合吗？';
          v_minutes:=4;
      end case;
      v_count:=v_count+1;
      insert into private.coach_tasks(
        agent_id,plan_date,kind,lead_id,title_en,title_zh,why_en,why_zh,
        draft_en,draft_zh,minutes,priority
      ) values (
        p_agent_id,p_date,v_kind,r.lead_id,v_title_en,v_title_zh,v_why_en,v_why_zh,
        v_draft_en,v_draft_zh,v_minutes,v_count
      );
    end loop;
  end if;

  while v_count < v_n loop
    -- For locked agents these are research/education activities, NOT sales outreach.
    v_kind:=case
      when v_locked and v_count%3=0 then 'find_lead'
      when v_locked and v_count%3=1 then 'post_content'
      when v_locked then 'practice'
      when v_count=0 then 'post_content'
      when v_count%3=1 then 'find_lead'
      when v_count%3=2 then 'practice'
      else 'post_content' end;
    case v_kind
      when 'find_lead' then
        v_title_en:='Identify potential flower buyers';
        v_title_zh:='寻找有明确用花需求的潜在客户';
        v_why_en:='Specific upcoming occasions create real conversations and future orders.';
        v_why_zh:='找到真实用途和时间，才有机会转化成订单。';
        if v_holiday is not null then
          v_title_en:=v_title_en || ' — ' || v_holiday;
          v_why_en:=v_why_en || ' Upcoming: ' || v_holiday || '.';
        end if;
        v_draft_en:='Find one relevant publicly shared request or an opted-in contact; record the occasion and date. Do not spam.';
        v_draft_zh:='找一位有公开求购意向或已同意联系的客户，记录用途和日期；不要群发骚扰。';
        v_minutes:=10;
      when 'post_content' then
        v_title_en:='Share useful flower guidance';v_title_zh:='发布一则实用花礼内容';
        v_why_en:='Helpful content lets interested customers start a conversation voluntarily.';
        v_why_zh:='有帮助的内容能让有需要的人主动来问。';
        v_draft_en:='Planning flowers for an upcoming occasion? Share your date and occasion so the right options can be explored.';
        v_draft_zh:='近期有需要准备花礼的场合吗？可以先告诉我日期和用途，再一起看看适合的选择。';
        v_minutes:=10;
      else
        v_title_en:='Practice a short opening';v_title_zh:='练习一句自然开场';
        v_why_en:='A clear opening helps the next real conversation progress.';
        v_why_zh:='开场讲清楚，下一次真实沟通更容易推进。';
        v_draft_en:='May I ask what the flowers are for and when you need them?';
        v_draft_zh:='可以问一下是送什么场合、哪一天需要吗？';
        v_minutes:=4;
    end case;
    v_count:=v_count+1;
    insert into private.coach_tasks(
      agent_id,plan_date,kind,lead_id,title_en,title_zh,why_en,why_zh,
      draft_en,draft_zh,minutes,priority
    ) values (
      p_agent_id,p_date,v_kind,null,v_title_en,v_title_zh,v_why_en,v_why_zh,
      v_draft_en,v_draft_zh,v_minutes,v_count
    );
  end loop;

  return jsonb_build_object(
    'agent_id',p_agent_id,'plan_date',p_date,'existing',false,
    'tasks',(select jsonb_agg(to_jsonb(t) order by t.priority)
      from private.coach_tasks t where t.agent_id=p_agent_id and t.plan_date=p_date),
    'summary',(select p.summary from private.coach_daily_plans p
      where p.agent_id=p_agent_id and p.plan_date=p_date)
  );
end;
$fn$;

-- Self-reported outcomes never modify orders, quotes, commissions or agent status.
create or replace function private.coach_complete_task_internal(
  p_agent_id uuid,p_task_id uuid,p_outcome text,p_note text default null
) returns jsonb
language plpgsql security definer set search_path=''
as $fn$
declare
  t private.coach_tasks%rowtype;
  v_skill text;
  v_positive int;
  v_level int;
begin
  if p_outcome is null or p_outcome not in
    ('no_reply','replied','interested','quote_requested','ordered','lost')
    then raise exception 'invalid outcome';
  end if;
  if p_note is not null and length(p_note)>1000 then
    raise exception 'note too long';
  end if;
  select * into t from private.coach_tasks
  where id=p_task_id and agent_id=p_agent_id for update;
  if not found then raise exception 'task not found'; end if;
  if t.status='done' then
    return jsonb_build_object('task_id',t.id,'status','done','already_done',true);
  end if;
  if t.status='skipped' then raise exception 'task already skipped'; end if;
  update private.coach_tasks set
    status='done',outcome=p_outcome,outcome_note=p_note,done_at=now()
  where id=t.id and agent_id=p_agent_id;
  v_skill:=case t.kind
    when 'follow_up' then 'follow_up'
    when 'request_quote' then 'ask_date_budget'
    when 'ask_referral' then 'referral'
    when 'reactivate' then 'opening_line'
    when 'find_lead' then 'opening_line'
    when 'practice' then 'opening_line'
    when 'post_content' then 'opening_line'
  end;
  v_positive:=case when p_outcome in ('replied','interested','quote_requested','ordered') then 1 else 0 end;
  insert into private.agent_skill_state(agent_id,skill,level,evidence)
  values(p_agent_id,v_skill,case when v_positive=1 then 1 else 0 end,
    jsonb_build_object('completed',1,'positive',v_positive,'last_outcome',p_outcome,'last_task_id',t.id))
  on conflict(agent_id,skill) do update set
    level=case
      when coalesce((private.agent_skill_state.evidence->>'positive')::int,0)+v_positive>=10 then 5
      when coalesce((private.agent_skill_state.evidence->>'positive')::int,0)+v_positive>=7 then 4
      when coalesce((private.agent_skill_state.evidence->>'positive')::int,0)+v_positive>=4 then 3
      when coalesce((private.agent_skill_state.evidence->>'positive')::int,0)+v_positive>=2 then 2
      when coalesce((private.agent_skill_state.evidence->>'positive')::int,0)+v_positive>=1 then 1
      else 0 end,
    evidence=jsonb_build_object(
      'completed',coalesce((private.agent_skill_state.evidence->>'completed')::int,0)+1,
      'positive',coalesce((private.agent_skill_state.evidence->>'positive')::int,0)+v_positive,
      'last_outcome',p_outcome,'last_task_id',t.id
    ),
    updated_at=now();
  select level into v_level from private.agent_skill_state
    where agent_id=p_agent_id and skill=v_skill;
  return jsonb_build_object('task_id',t.id,'status','done','outcome',p_outcome,
    'skill',v_skill,'skill_level',v_level,'already_done',false);
end;
$fn$;

create or replace function private.coach_review_day_internal(
  p_agent_id uuid,p_date date default (timezone('Asia/Kuching',now()))::date
) returns jsonb
language plpgsql security definer set search_path=''
as $fn$
declare
  v_result jsonb;
begin
  if not exists(select 1 from private.coach_daily_plans
    where agent_id=p_agent_id and plan_date=p_date) then
    return jsonb_build_object('missing_plan',true);
  end if;
  select jsonb_build_object(
    'assigned',count(*),'done',count(*) filter(where status='done'),
    'skipped',count(*) filter(where status='skipped'),
    'todo',count(*) filter(where status='todo'),
    'replied',count(*) filter(where outcome in ('replied','interested','quote_requested','ordered')),
    'quote_requested',count(*) filter(where outcome='quote_requested'),
    'ordered_self_reported',count(*) filter(where outcome='ordered'),
    'completion_rate',case when count(*)=0 then 0 else
      round((count(*) filter(where status='done'))::numeric/count(*),3) end,
    'reviewed_at',now()
  ) into v_result
  from private.coach_tasks where agent_id=p_agent_id and plan_date=p_date;
  update private.coach_daily_plans
    set status='reviewed',summary=summary||jsonb_build_object('review',v_result),updated_at=now()
  where agent_id=p_agent_id and plan_date=p_date;
  return v_result;
end;
$fn$;

create or replace function private.coach_run_morning_internal(
  p_date date default (timezone('Asia/Kuching',now()))::date
) returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare a record; n int:=0;
begin
  for a in select id from public.agents where is_demo=false loop
    perform private.coach_build_plan_internal(a.id,p_date);
    n:=n+1;
  end loop;
  return jsonb_build_object('date',p_date,'agents_planned',n);
end;
$fn$;

create or replace function private.coach_run_evening_internal(
  p_date date default (timezone('Asia/Kuching',now()))::date
) returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare a record; n int:=0;
begin
  for a in select p.agent_id from private.coach_daily_plans p
    join public.agents ag on ag.id=p.agent_id and ag.is_demo=false
    where p.plan_date=p_date loop
    perform private.coach_review_day_internal(a.agent_id,p_date);
    n:=n+1;
  end loop;
  return jsonb_build_object('date',p_date,'agents_reviewed',n);
end;
$fn$;

revoke all on function private.coach_build_plan_internal(uuid,date),
  private.coach_complete_task_internal(uuid,uuid,text,text),
  private.coach_review_day_internal(uuid,date),
  private.coach_run_morning_internal(date),
  private.coach_run_evening_internal(date) from public,anon,authenticated;
grant execute on function private.coach_build_plan_internal(uuid,date),
  private.coach_complete_task_internal(uuid,uuid,text,text),
  private.coach_review_day_internal(uuid,date),
  private.coach_run_morning_internal(date),
  private.coach_run_evening_internal(date) to service_role;

-- pg_cron schedules are UTC on this project: 22:00 UTC -> Kuching 06:00 next day;
-- 13:30 UTC -> Kuching 21:30 same day. No network or paid service needed.
select cron.schedule(
  'ew-ai-coach-plan-kuching-0600',
  '0 22 * * *',
  $cron$select private.coach_run_morning_internal(timezone('Asia/Kuching',now())::date);$cron$
);
select cron.schedule(
  'ew-ai-coach-review-kuching-2130',
  '30 13 * * *',
  $cron$select private.coach_run_evening_internal(timezone('Asia/Kuching',now())::date);$cron$
);
