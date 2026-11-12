-- Phase 4: customer segmentation/loss reasons, lead intelligence, AI quotas/cache, Owner risk/anomaly functions.

alter table public.leads drop constraint if exists leads_loss_reason_check;
alter table public.leads
  add constraint leads_loss_reason_check
  check (
    loss_reason is null or
    loss_reason = any(array['too_expensive','think_about_it','no_reply','chose_other','other'])
  );

create index if not exists leads_agent_status_updated_phase4_idx
  on public.leads(agent_id,status,updated_at desc);
create index if not exists lead_events_agent_lead_created_phase4_idx
  on public.lead_events(agent_id,lead_id,created_at desc);

create table if not exists private.ai_weekly_plan_cache(
  agent_id uuid not null references public.agents(id) on delete cascade,
  week_start date not null,
  payload jsonb not null,
  provider text not null check(provider in('gemini','fallback')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(agent_id,week_start)
);

revoke all on private.ai_weekly_plan_cache from public,anon,authenticated;
grant select,insert,update,delete on private.ai_weekly_plan_cache to service_role;

update private.system_settings
set value =
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(value,'{daily_limits,platform_post}','15'::jsonb,true),
        '{daily_limits,weekly_plan}','2'::jsonb,true
      ),
      '{daily_limits,profile_setup}','3'::jsonb,true
    ),
    '{daily_limits,lost_review}','20'::jsonb,true
  )
where key='ai_policy';

create or replace function public.agent_lead_intelligence_internal(
  p_agent_id uuid,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $function$
declare
  v_result jsonb := '[]'::jsonb;
  v_active_hour int;
  v_now_local timestamp := timezone('Asia/Kuching',now());
  v_limit int := least(greatest(coalesce(p_limit,50),1),100);
  r record;
  v_score int;
  v_codes text[];
  v_en text[];
  v_zh text[];
  v_action text;
  v_hour int;
  v_best timestamptz;
  v_local_date date;
begin
  if not exists(select 1 from public.agents where id=p_agent_id) then
    raise exception 'agent not found';
  end if;

  select case
    when (p.stats->'active_hours_kuching'->>0) ~ '^\d{1,2}$'
      then least(22,greatest(8,(p.stats->'active_hours_kuching'->>0)::int))
    else null
  end
  into v_active_hour
  from public.agent_ai_profile p
  where p.agent_id=p_agent_id;

  for r in
    select
      l.id,l.status,l.source,l.budget,l.occasion,l.delivery_date,l.next_followup_at,l.created_at,l.updated_at,l.loss_reason,
      exists(
        select 1 from public.quotes q where q.lead_id=l.id and q.agent_id=p_agent_id
      ) as quote_exists,
      (
        select q.status from public.quotes q
        where q.lead_id=l.id and q.agent_id=p_agent_id
        order by q.quote_version desc,q.created_at desc limit 1
      ) as quote_status,
      (
        select max(e.created_at) from public.lead_events e
        where e.lead_id=l.id and e.agent_id=p_agent_id
      ) as last_event_at
    from public.leads l
    where l.agent_id=p_agent_id
    order by l.updated_at desc,l.created_at desc
    limit v_limit
  loop
    v_score := 0;
    v_codes := array[]::text[];
    v_en := array[]::text[];
    v_zh := array[]::text[];

    if r.status in('won','lost','archived') then
      v_score := 0;
      v_codes := array_append(v_codes,'terminal_status');
      v_en := array_append(v_en,'Lead is already closed');
      v_zh := array_append(v_zh,'客户已结束');
    else
      v_score := 20;

      if r.status='quoted' or r.quote_exists then
        v_score := v_score + 20;
        v_codes := array_append(v_codes,'quote_exists');
        v_en := array_append(v_en,'A quote already exists');
        v_zh := array_append(v_zh,'已有报价');
      elsif r.status='follow_up' then
        v_score := v_score + 15;
        v_codes := array_append(v_codes,'followup_stage');
        v_en := array_append(v_en,'Customer is in follow-up');
        v_zh := array_append(v_zh,'客户正在跟进中');
      elsif r.status='qualified' then
        v_score := v_score + 12;
        v_codes := array_append(v_codes,'qualified');
        v_en := array_append(v_en,'Core requirements are qualified');
        v_zh := array_append(v_zh,'核心需求已确认');
      else
        v_score := v_score + 5;
        v_codes := array_append(v_codes,'new_lead');
        v_en := array_append(v_en,'New lead still needs qualification');
        v_zh := array_append(v_zh,'新客户仍需确认需求');
      end if;

      if r.budget is not null and r.budget>0 then
        v_score := v_score + case when r.budget>=500 then 15 when r.budget>=250 then 10 else 5 end;
        v_codes := array_append(v_codes,'budget_known');
        v_en := array_append(v_en,'Budget is known');
        v_zh := array_append(v_zh,'预算已确认');
      end if;

      if r.delivery_date is not null then
        if r.delivery_date < v_now_local::date then
          v_score := v_score - 10;
          v_codes := array_append(v_codes,'delivery_overdue');
          v_en := array_append(v_en,'Requested delivery date has passed');
          v_zh := array_append(v_zh,'客户要求的送达日期已过');
        elsif r.delivery_date <= v_now_local::date + 3 then
          v_score := v_score + 15;
          v_codes := array_append(v_codes,'delivery_soon');
          v_en := array_append(v_en,'Delivery is within 3 days');
          v_zh := array_append(v_zh,'3 天内需要送达');
        elsif r.delivery_date <= v_now_local::date + 7 then
          v_score := v_score + 10;
          v_codes := array_append(v_codes,'delivery_this_week');
          v_en := array_append(v_en,'Delivery is within 7 days');
          v_zh := array_append(v_zh,'7 天内需要送达');
        end if;
      end if;

      if r.next_followup_at is not null then
        if r.next_followup_at <= now() then
          v_score := v_score + 15;
          v_codes := array_append(v_codes,'followup_overdue');
          v_en := array_append(v_en,'Follow-up is due now');
          v_zh := array_append(v_zh,'跟进已到期');
        elsif r.next_followup_at <= now()+interval '24 hours' then
          v_score := v_score + 10;
          v_codes := array_append(v_codes,'followup_due_24h');
          v_en := array_append(v_en,'Follow-up is due within 24 hours');
          v_zh := array_append(v_zh,'24 小时内需要跟进');
        end if;
      end if;

      if r.last_event_at is not null and r.last_event_at >= now()-interval '3 days' then
        v_score := v_score + 10;
        v_codes := array_append(v_codes,'recent_activity');
        v_en := array_append(v_en,'There was recent customer activity');
        v_zh := array_append(v_zh,'近期有客户互动');
      end if;
    end if;

    v_score := least(100,greatest(0,v_score));

    v_action := case
      when r.status='lost' then 'lost_review'
      when r.status in('won','archived') then 'none'
      when (r.status='quoted' or r.quote_exists) and r.next_followup_at is not null and r.next_followup_at<=now() then 'follow_up_quote'
      when r.status='quoted' or r.quote_exists then 'schedule_quote_followup'
      when r.status='follow_up' then 'follow_up'
      when r.status='new' and (r.budget is null or nullif(trim(coalesce(r.occasion,'')),'') is null or r.delivery_date is null) then 'qualify_lead'
      when r.status in('new','qualified') then 'request_quote'
      else 'follow_up'
    end;

    v_best := null;
    if r.status not in('won','lost','archived') then
      if r.next_followup_at is not null then
        v_best := r.next_followup_at;
      else
        v_hour := coalesce(v_active_hour,case
          when r.source='corporate_outreach' then 10
          when r.source in('instagram','facebook','threads','xiaohongshu','whatsapp') then 19
          when r.source in('personal_network','referral','previous_customer') then 18
          else 11 end);
        v_local_date := case
          when v_now_local::time < make_time(v_hour,0,0) then v_now_local::date
          else v_now_local::date+1 end;
        v_best := ((v_local_date::timestamp + make_interval(hours=>v_hour)) at time zone 'Asia/Kuching');
      end if;
    end if;

    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'lead_id',r.id,
      'lead_score',v_score,
      'lead_score_reason',jsonb_build_object(
        'codes',to_jsonb(v_codes),
        'en',array_to_string(v_en,'; '),
        'zh',array_to_string(v_zh,'；')
      ),
      'next_best_action',v_action,
      'best_followup_time',v_best
    ));
  end loop;

  return v_result;
end;
$function$;

revoke all on function public.agent_lead_intelligence_internal(uuid,integer) from public,anon,authenticated;
grant execute on function public.agent_lead_intelligence_internal(uuid,integer) to service_role;

create or replace function public.owner_agent_churn_risk_internal(
  p_user_id uuid,
  p_as_of date default timezone('Asia/Kuching',now())::date
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $function$
declare
  v_role text;
  v_cutoff timestamptz := ((p_as_of+1)::timestamp at time zone 'Asia/Kuching');
  v_agents jsonb;
begin
  select role into v_role from private.user_roles where user_id=p_user_id;
  if coalesce(v_role,'') not in('owner','admin') then raise exception 'forbidden'; end if;

  with metrics as (
    select
      a.id,a.agent_code,a.display_name,a.status,a.tier,a.performance_score,a.last_active_at,
      case when a.last_active_at is null then 999
        else greatest(0,floor(extract(epoch from (v_cutoff-a.last_active_at))/86400))::int end as inactive_days,
      (select count(*) from public.leads l where l.agent_id=a.id and l.created_at>=v_cutoff-interval '30 days' and l.created_at<v_cutoff)::int as leads_30d,
      (select count(*) from public.quotes q where q.agent_id=a.id and q.created_at>=v_cutoff-interval '30 days' and q.created_at<v_cutoff)::int as quotes_30d,
      (select count(*) from public.orders o where o.agent_id=a.id and o.status<>'cancelled' and o.created_at>=v_cutoff-interval '30 days' and o.created_at<v_cutoff)::int as orders_30d,
      (select count(*) from public.leads l where l.agent_id=a.id and l.status not in('won','lost','archived') and l.next_followup_at<v_cutoff)::int as overdue_followups,
      (select max(t.training_date) from public.training_daily_attempts t where t.agent_id=a.id and t.status='completed') as last_training_date,
      (select count(*) from public.violations v where v.agent_id=a.id and v.status not in('resolved','dismissed') and v.severity in('high','critical'))::int as open_serious_violations
    from public.agents a
    where a.is_demo=false
  ),
  scored as (
    select *,
      least(100,
        (case when status='dormant' then 35 when status in('restricted','recovery','suspended') then 25 else 0 end) +
        (case when inactive_days>=14 then 35 when inactive_days>=7 then 25 when inactive_days>=3 then 10 else 0 end) +
        (case when leads_30d=0 then 15 when leads_30d<3 then 8 else 0 end) +
        (case when orders_30d=0 then 15 when orders_30d=1 then 8 else 0 end) +
        (case when overdue_followups>=10 then 12 when overdue_followups>=5 then 8 else 0 end) +
        (case when last_training_date is null or last_training_date<p_as_of-14 then 8 else 0 end) +
        (case when open_serious_violations>0 then 15 else 0 end)
      )::int as risk_score,
      array_remove(array[
        case when status='dormant' then 'dormant_status' when status in('restricted','recovery','suspended') then 'restricted_status' end,
        case when inactive_days>=14 then 'inactive_14d' when inactive_days>=7 then 'inactive_7d' when inactive_days>=3 then 'inactive_3d' end,
        case when leads_30d=0 then 'no_leads_30d' when leads_30d<3 then 'low_leads_30d' end,
        case when orders_30d=0 then 'no_orders_30d' when orders_30d=1 then 'low_orders_30d' end,
        case when overdue_followups>=5 then 'followup_backlog' end,
        case when last_training_date is null or last_training_date<p_as_of-14 then 'training_inactive' end,
        case when open_serious_violations>0 then 'serious_violation_open' end
      ],null) as reasons
    from metrics
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'agent_id',id,'agent_code',agent_code,'display_name',display_name,'status',status,'tier',tier,
    'risk_score',risk_score,
    'risk_level',case when risk_score>=70 then 'high' when risk_score>=40 then 'medium' else 'low' end,
    'reasons',to_jsonb(reasons),
    'metrics',jsonb_build_object(
      'inactive_days',inactive_days,'leads_30d',leads_30d,'quotes_30d',quotes_30d,'orders_30d',orders_30d,
      'overdue_followups',overdue_followups,'last_training_date',last_training_date,
      'open_serious_violations',open_serious_violations,'performance_score',performance_score
    )
  ) order by risk_score desc,agent_code),'[]'::jsonb)
  into v_agents
  from scored;

  return jsonb_build_object('as_of',p_as_of,'agents',v_agents);
end;
$function$;

revoke all on function public.owner_agent_churn_risk_internal(uuid,date) from public,anon,authenticated;
grant execute on function public.owner_agent_churn_risk_internal(uuid,date) to service_role;

create or replace function public.owner_agent_anomalies_internal(
  p_user_id uuid,
  p_days integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $function$
declare
  v_role text;
  v_days int := least(greatest(coalesce(p_days,30),7),90);
  v_now timestamptz := now();
  v_items jsonb;
begin
  select role into v_role from private.user_roles where user_id=p_user_id;
  if coalesce(v_role,'') not in('owner','admin') then raise exception 'forbidden'; end if;

  with metrics as (
    select
      a.id,a.agent_code,a.display_name,
      (select count(*) from public.orders o where o.agent_id=a.id and o.status<>'cancelled' and o.created_at>=v_now-make_interval(days=>v_days))::int as order_count,
      (select count(*) from public.orders o where o.agent_id=a.id and o.status<>'cancelled' and o.payment_status in('refunded','partially_refunded') and o.created_at>=v_now-make_interval(days=>v_days))::int as refund_order_count,
      (select count(*) from public.leads l where l.agent_id=a.id and l.status='lost' and l.updated_at>=v_now-make_interval(days=>v_days))::int as lost_count,
      (select count(*) from public.leads l where l.agent_id=a.id and l.status='lost' and l.loss_reason is null and l.updated_at>=v_now-make_interval(days=>v_days))::int as lost_without_reason,
      (select count(*) from public.leads l where l.agent_id=a.id and l.status not in('won','lost','archived') and l.next_followup_at<now())::int as overdue_followups,
      (select count(*) from public.quotes q where q.agent_id=a.id and q.created_at>=v_now-make_interval(days=>v_days))::int as quote_count,
      (select count(*) from public.quotes q where q.agent_id=a.id and q.created_at>=v_now-make_interval(days=>v_days)
         and exists(select 1 from public.orders o where o.quote_id=q.id and o.agent_id=a.id and o.status<>'cancelled'))::int as converted_quotes,
      (select count(*) from public.violations v where v.agent_id=a.id and v.status not in('resolved','dismissed') and v.severity in('high','critical'))::int as open_serious_violations,
      (select count(*) from public.leads l where l.agent_id=a.id and l.created_at>=v_now-interval '7 days')::int as leads_7d,
      (select count(*) from public.leads l where l.agent_id=a.id and l.created_at>=v_now-interval '14 days' and l.created_at<v_now-interval '7 days')::int as leads_prev_7d
    from public.agents a
    where a.is_demo=false
  ),
  anomalies as (
    select id,agent_code,display_name,'refund_ratio'::text type,
      'high'::text severity,
      round(refund_order_count::numeric/nullif(order_count,0),3) metric,
      0.25::numeric threshold,
      jsonb_build_object('orders',order_count,'refund_orders',refund_order_count) detail
    from metrics where order_count>=4 and refund_order_count::numeric/nullif(order_count,0)>0.25

    union all
    select id,agent_code,display_name,'lost_without_reason',
      case when lost_without_reason>=8 then 'high' else 'medium' end,
      lost_without_reason::numeric,3::numeric,
      jsonb_build_object('lost_total',lost_count,'missing_reason',lost_without_reason)
    from metrics where lost_without_reason>=3

    union all
    select id,agent_code,display_name,'followup_backlog',
      case when overdue_followups>=10 then 'high' else 'medium' end,
      overdue_followups::numeric,5::numeric,
      jsonb_build_object('overdue_followups',overdue_followups)
    from metrics where overdue_followups>=5

    union all
    select id,agent_code,display_name,'low_quote_conversion',
      'medium',
      round(converted_quotes::numeric/nullif(quote_count,0),3),0.15::numeric,
      jsonb_build_object('quotes',quote_count,'converted',converted_quotes)
    from metrics where quote_count>=8 and converted_quotes::numeric/nullif(quote_count,0)<0.15

    union all
    select id,agent_code,display_name,'serious_policy_violation',
      'high',
      open_serious_violations::numeric,1::numeric,
      jsonb_build_object('open_serious_violations',open_serious_violations)
    from metrics where open_serious_violations>=1

    union all
    select id,agent_code,display_name,'activity_drop',
      'medium',
      case when leads_prev_7d>0 then round(leads_7d::numeric/leads_prev_7d,3) else 0 end,0.40::numeric,
      jsonb_build_object('leads_7d',leads_7d,'previous_7d',leads_prev_7d)
    from metrics where leads_prev_7d>=5 and leads_7d::numeric < leads_prev_7d*0.40
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'agent_id',id,'agent_code',agent_code,'display_name',display_name,
    'type',type,'severity',severity,'metric',metric,'threshold',threshold,'detail',detail
  ) order by case severity when 'high' then 1 else 2 end,agent_code,type),'[]'::jsonb)
  into v_items
  from anomalies;

  return jsonb_build_object('days',v_days,'generated_at',now(),'anomalies',v_items);
end;
$function$;

revoke all on function public.owner_agent_anomalies_internal(uuid,integer) from public,anon,authenticated;
grant execute on function public.owner_agent_anomalies_internal(uuid,integer) to service_role;
