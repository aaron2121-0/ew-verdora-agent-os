create or replace function public.agent_phase1_overview_internal(
  p_agent_id uuid,
  p_date date default (timezone('Asia/Kuching', now()))::date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_agent public.agents;
  v_cfg jsonb := '{}'::jsonb;
  v_start timestamptz := (p_date::timestamp at time zone 'Asia/Kuching');
  v_end timestamptz := ((p_date + 1)::timestamp at time zone 'Asia/Kuching');
  v_month_start timestamptz := (date_trunc('month', p_date::timestamp) at time zone 'Asia/Kuching');
  v_month_end timestamptz := ((date_trunc('month', p_date::timestamp) + interval '1 month') at time zone 'Asia/Kuching');
  v_orders_30d int := 0;
  v_next_tier text;
  v_next_orders int;
  v_next_score numeric;
  v_today_earned numeric := 0;
  v_pending numeric := 0;
  v_month_earned numeric := 0;
  v_due jsonb := '[]'::jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_training_pending boolean := false;
begin
  select * into v_agent
  from public.agents
  where id = p_agent_id;

  if v_agent.id is null then
    raise exception 'agent not found';
  end if;

  select value into v_cfg
  from private.system_settings
  where key = 'agent_tiers';

  select count(*) into v_orders_30d
  from public.orders
  where agent_id = p_agent_id
    and status = 'completed'
    and coalesce(completed_at, created_at) >= now() - interval '30 days';

  v_next_tier := case v_agent.tier
    when 'starter' then 'active'
    when 'active' then 'pro'
    when 'pro' then 'elite'
    else null
  end;

  if v_next_tier is not null then
    v_next_orders := coalesce((v_cfg #>> array[v_next_tier,'orders'])::int,
      case v_next_tier when 'active' then 15 when 'pro' then 30 when 'elite' then 45 end);
    v_next_score := coalesce((v_cfg #>> array[v_next_tier,'score'])::numeric,
      case v_next_tier when 'active' then 70 when 'pro' then 80 when 'elite' then 90 end);
  end if;

  select
    coalesce(sum(amount) filter (
      where earned_at >= v_start and earned_at < v_end
        and status in ('earned','payable','held','paid')
    ),0),
    coalesce(sum(amount) filter (
      where status in ('earned','payable','held')
    ),0),
    coalesce(sum(amount) filter (
      where earned_at >= v_month_start and earned_at < v_month_end
        and status in ('earned','payable','held','paid')
    ),0)
  into v_today_earned, v_pending, v_month_earned
  from public.commissions
  where agent_id = p_agent_id;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.next_followup_at),'[]'::jsonb)
  into v_due
  from (
    select id, customer_label, source, occasion, sales_category, budget,
           delivery_date, delivery_time, next_followup_at, status
    from public.leads
    where agent_id = p_agent_id
      and next_followup_at is not null
      and next_followup_at < v_end
      and status not in ('won','lost','archived')
    order by next_followup_at
    limit 20
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
  into v_recent
  from (
    select
      l.id, l.customer_label, l.source, l.occasion, l.sales_category, l.budget,
      l.delivery_date, l.delivery_time, l.next_followup_at, l.status, l.created_at,
      q.id as quote_id, q.status as quote_status, q.selling_price as quote_price,
      o.id as order_id, o.status as order_status, o.payment_status
    from public.leads l
    left join lateral (
      select q1.id, q1.status, q1.selling_price, q1.created_at
      from public.quotes q1
      where q1.lead_id = l.id and q1.agent_id = p_agent_id
      order by q1.quote_version desc, q1.created_at desc
      limit 1
    ) q on true
    left join lateral (
      select o1.id, o1.status, o1.payment_status, o1.created_at
      from public.orders o1
      where o1.quote_id = q.id and o1.agent_id = p_agent_id
      order by o1.created_at desc
      limit 1
    ) o on true
    where l.agent_id = p_agent_id
    order by l.created_at desc
    limit 50
  ) x;

  select exists(
    select 1
    from public.training_progress tp
    join public.training_modules tm on tm.id = tp.module_id
    where tp.agent_id = p_agent_id
      and tm.required = true
      and tm.active = true
      and tp.status not in ('passed','waived')
  ) into v_training_pending;

  return jsonb_build_object(
    'kuching_date', p_date,
    'can_sell', v_agent.status not in ('trainee','restricted','recovery','dormant','suspended'),
    'money', jsonb_build_object(
      'today_earned', v_today_earned,
      'pending', v_pending,
      'month_earned', v_month_earned
    ),
    'tier_progress', jsonb_build_object(
      'current_tier', v_agent.tier,
      'commission_rate', v_agent.commission_rate,
      'orders_30d', v_orders_30d,
      'performance_score', v_agent.performance_score,
      'next_tier', v_next_tier,
      'next_orders_required', v_next_orders,
      'next_score_required', v_next_score,
      'orders_remaining', case when v_next_orders is null then 0 else greatest(v_next_orders - v_orders_30d,0) end,
      'score_remaining', case when v_next_score is null then 0 else greatest(v_next_score - v_agent.performance_score,0) end
    ),
    'due_followups', v_due,
    'recent_leads', v_recent,
    'training_pending', v_training_pending
  );
end;
$function$;

revoke all on function public.agent_phase1_overview_internal(uuid,date) from public, anon, authenticated;
grant execute on function public.agent_phase1_overview_internal(uuid,date) to service_role;
