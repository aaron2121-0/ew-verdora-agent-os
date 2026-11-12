create or replace function public.agent_leaderboard_internal(
  p_agent_id uuid,
  p_month date default (date_trunc('month', timezone('Asia/Kuching', now())))::date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_month date;
  v_start timestamptz;
  v_end timestamptz;
  v_mode text := 'agent_code';
  v_top jsonb := '[]'::jsonb;
  v_me jsonb;
  v_seller_count int := 0;
  v_team_count int := 0;
  v_my_label text;
  v_my_tier text;
begin
  if not exists(select 1 from public.agents where id=p_agent_id) then
    raise exception 'agent not found';
  end if;

  v_month := date_trunc('month', coalesce(p_month, timezone('Asia/Kuching', now())::date))::date;
  v_start := (v_month::timestamp at time zone 'Asia/Kuching');
  v_end := ((v_month + interval '1 month')::timestamp at time zone 'Asia/Kuching');

  select case
    when value->>'mode'='display_name' then 'display_name'
    else 'agent_code'
  end
  into v_mode
  from private.system_settings
  where key='agent_leaderboard_display';

  v_mode := coalesce(v_mode,'agent_code');

  select case when v_mode='display_name' then display_name else agent_code end,tier
  into v_my_label,v_my_tier
  from public.agents where id=p_agent_id;

  with payment as (
    select order_id,
      min(processed_at) filter (where event_type in ('payment_succeeded','paid')) as paid_at,
      coalesce(sum(amount) filter (where event_type in ('refund_succeeded','refunded')),0) as refunds
    from private.payment_events where order_id is not null group by order_id
  ),
  eligible as (
    select o.id,o.agent_id,
      coalesce(p.paid_at,o.completed_at,o.created_at) as sale_at,
      greatest(0,o.commissionable_revenue-least(coalesce(p.refunds,0),o.commissionable_revenue))::numeric as net_revenue
    from public.orders o
    left join payment p on p.order_id=o.id
    join public.agents a on a.id=o.agent_id
    where a.is_demo=false
      and o.status<>'cancelled'
      and o.payment_status<>'refunded'
      and (o.payment_status in ('paid','partially_refunded') or o.status='completed')
  ),
  aggregated as (
    select a.id as agent_id,a.agent_code,
      case when v_mode='display_name' then a.display_name else a.agent_code end as label,
      a.tier,coalesce(sum(e.net_revenue),0)::numeric as revenue,
      count(e.id)::int as orders,max(e.sale_at) as reached_at
    from public.agents a
    join eligible e on e.agent_id=a.id and e.sale_at>=v_start and e.sale_at<v_end
    where a.is_demo=false
    group by a.id,a.agent_code,a.display_name,a.tier
  ),
  ranked as (
    select *,
      row_number() over(order by revenue desc,orders desc,reached_at asc,agent_code asc)::int as rank,
      lag(revenue) over(order by revenue desc,orders desc,reached_at asc,agent_code asc) as previous_revenue
    from aggregated
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'rank',rank,'label',label,'tier',tier,'revenue',revenue,'orders',orders,'is_me',agent_id=p_agent_id
    ) order by rank) filter (where rank<=10),'[]'::jsonb),
    count(*)::int
  into v_top,v_seller_count from ranked;

  with payment as (
    select order_id,
      min(processed_at) filter (where event_type in ('payment_succeeded','paid')) as paid_at,
      coalesce(sum(amount) filter (where event_type in ('refund_succeeded','refunded')),0) as refunds
    from private.payment_events where order_id is not null group by order_id
  ),
  eligible as (
    select o.id,o.agent_id,coalesce(p.paid_at,o.completed_at,o.created_at) as sale_at,
      greatest(0,o.commissionable_revenue-least(coalesce(p.refunds,0),o.commissionable_revenue))::numeric as net_revenue
    from public.orders o
    left join payment p on p.order_id=o.id
    join public.agents a on a.id=o.agent_id
    where a.is_demo=false and o.status<>'cancelled' and o.payment_status<>'refunded'
      and (o.payment_status in ('paid','partially_refunded') or o.status='completed')
  ),
  aggregated as (
    select a.id as agent_id,a.agent_code,
      case when v_mode='display_name' then a.display_name else a.agent_code end as label,
      a.tier,coalesce(sum(e.net_revenue),0)::numeric as revenue,
      count(e.id)::int as orders,max(e.sale_at) as reached_at
    from public.agents a
    join eligible e on e.agent_id=a.id and e.sale_at>=v_start and e.sale_at<v_end
    where a.is_demo=false
    group by a.id,a.agent_code,a.display_name,a.tier
  ),
  ranked as (
    select *,
      row_number() over(order by revenue desc,orders desc,reached_at asc,agent_code asc)::int as rank,
      lag(revenue) over(order by revenue desc,orders desc,reached_at asc,agent_code asc) as previous_revenue
    from aggregated
  )
  select jsonb_build_object(
    'rank',rank,'label',label,'tier',tier,'revenue',revenue,'orders',orders,
    'gap_to_next',case when rank=1 then 0 else greatest(coalesce(previous_revenue,revenue)-revenue,0) end,
    'is_me',true
  ) into v_me from ranked where agent_id=p_agent_id;

  if v_me is null then
    with payment as (
      select order_id,
        min(processed_at) filter (where event_type in ('payment_succeeded','paid')) as paid_at,
        coalesce(sum(amount) filter (where event_type in ('refund_succeeded','refunded')),0) as refunds
      from private.payment_events where order_id is not null group by order_id
    ),
    eligible as (
      select o.id,o.agent_id,coalesce(p.paid_at,o.completed_at,o.created_at) as sale_at,
        greatest(0,o.commissionable_revenue-least(coalesce(p.refunds,0),o.commissionable_revenue))::numeric as net_revenue
      from public.orders o
      left join payment p on p.order_id=o.id
      join public.agents a on a.id=o.agent_id
      where a.is_demo=false and o.status<>'cancelled' and o.payment_status<>'refunded'
        and (o.payment_status in ('paid','partially_refunded') or o.status='completed')
    ),
    sellers as (
      select a.id,sum(e.net_revenue)::numeric as revenue
      from public.agents a
      join eligible e on e.agent_id=a.id and e.sale_at>=v_start and e.sale_at<v_end
      where a.is_demo=false group by a.id
    )
    select jsonb_build_object(
      'rank',v_seller_count+1,'label',v_my_label,'tier',v_my_tier,'revenue',0,'orders',0,
      'gap_to_next',coalesce((select min(revenue) from sellers),0),'is_me',true
    ) into v_me;
  end if;

  select count(*)::int into v_team_count from public.agents where is_demo=false;

  return jsonb_build_object(
    'month',to_char(v_month,'YYYY-MM'),'display_mode',v_mode,
    'top',v_top,'me',v_me,'team_count',v_team_count
  );
end;
$function$;

revoke all on function public.agent_leaderboard_internal(uuid,date) from public,anon,authenticated;
grant execute on function public.agent_leaderboard_internal(uuid,date) to service_role;

create or replace function public.agent_sales_dashboard_internal(
  p_agent_id uuid,
  p_month date default (date_trunc('month', timezone('Asia/Kuching', now())))::date
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
  v_month date;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_period_end timestamptz;
  v_prev_start timestamptz;
  v_prev_end timestamptz;
  v_elapsed interval;
  v_revenue numeric := 0;
  v_orders int := 0;
  v_aov numeric := 0;
  v_prev_revenue numeric := 0;
  v_prev_orders int := 0;
  v_prev_aov numeric := 0;
  v_quotes int := 0;
  v_converted int := 0;
  v_quote_conversion numeric;
  v_prev_quotes int := 0;
  v_prev_converted int := 0;
  v_prev_quote_conversion numeric;
  v_follow_due int := 0;
  v_follow_done int := 0;
  v_follow_completion numeric;
  v_training_score numeric;
  v_orders_30d int := 0;
  v_next_tier text;
  v_next_orders int;
  v_next_score numeric;
  v_daily jsonb := '[]'::jsonb;
  v_wallet jsonb := '{}'::jsonb;
  v_wallet_ledger jsonb := '[]'::jsonb;
  v_team_total int := 0;
  v_team_active int := 0;
begin
  select * into v_agent from public.agents where id=p_agent_id;
  if v_agent.id is null then raise exception 'agent not found'; end if;
  select value into v_cfg from private.system_settings where key='agent_tiers';

  v_month := date_trunc('month',coalesce(p_month,timezone('Asia/Kuching',now())::date))::date;
  v_month_start := (v_month::timestamp at time zone 'Asia/Kuching');
  v_month_end := ((v_month + interval '1 month')::timestamp at time zone 'Asia/Kuching');
  if v_month=(date_trunc('month',timezone('Asia/Kuching',now())))::date then
    v_period_end:=least(now(),v_month_end);
  else
    v_period_end:=v_month_end;
  end if;
  v_elapsed:=v_period_end-v_month_start;
  v_prev_start:=((v_month-interval '1 month')::date::timestamp at time zone 'Asia/Kuching');
  v_prev_end:=least(v_prev_start+v_elapsed,v_month_start);

  with payment as (
    select order_id,
      min(processed_at) filter (where event_type in ('payment_succeeded','paid')) as paid_at,
      coalesce(sum(amount) filter (where event_type in ('refund_succeeded','refunded')),0) as refunds
    from private.payment_events where order_id is not null group by order_id
  ),
  eligible as (
    select o.id,o.agent_id,o.quote_id,coalesce(p.paid_at,o.completed_at,o.created_at) as sale_at,
      greatest(0,o.commissionable_revenue-least(coalesce(p.refunds,0),o.commissionable_revenue))::numeric as net_revenue
    from public.orders o left join payment p on p.order_id=o.id
    where o.status<>'cancelled' and o.payment_status<>'refunded'
      and (o.payment_status in ('paid','partially_refunded') or o.status='completed')
  )
  select
    coalesce(sum(net_revenue) filter(where agent_id=p_agent_id and sale_at>=v_month_start and sale_at<v_period_end),0),
    count(*) filter(where agent_id=p_agent_id and sale_at>=v_month_start and sale_at<v_period_end)::int,
    coalesce(sum(net_revenue) filter(where agent_id=p_agent_id and sale_at>=v_prev_start and sale_at<v_prev_end),0),
    count(*) filter(where agent_id=p_agent_id and sale_at>=v_prev_start and sale_at<v_prev_end)::int
  into v_revenue,v_orders,v_prev_revenue,v_prev_orders from eligible;

  v_aov:=case when v_orders>0 then round(v_revenue/v_orders,2) else 0 end;
  v_prev_aov:=case when v_prev_orders>0 then round(v_prev_revenue/v_prev_orders,2) else 0 end;

  with payment as (
    select order_id,
      min(processed_at) filter (where event_type in ('payment_succeeded','paid')) as paid_at,
      coalesce(sum(amount) filter (where event_type in ('refund_succeeded','refunded')),0) as refunds
    from private.payment_events where order_id is not null group by order_id
  ),
  qualified_orders as (
    select o.id,o.quote_id,coalesce(p.paid_at,o.completed_at,o.created_at) as sale_at
    from public.orders o left join payment p on p.order_id=o.id
    where o.agent_id=p_agent_id and o.status<>'cancelled' and o.payment_status<>'refunded'
      and (o.payment_status in ('paid','partially_refunded') or o.status='completed')
  )
  select
    count(distinct q.lead_id) filter(where q.created_at>=v_month_start and q.created_at<v_period_end and q.status<>'cancelled')::int,
    count(distinct q.lead_id) filter(where q.created_at>=v_month_start and q.created_at<v_period_end and q.status<>'cancelled'
      and exists(select 1 from qualified_orders qo where qo.quote_id=q.id and qo.sale_at<v_period_end))::int,
    count(distinct q.lead_id) filter(where q.created_at>=v_prev_start and q.created_at<v_prev_end and q.status<>'cancelled')::int,
    count(distinct q.lead_id) filter(where q.created_at>=v_prev_start and q.created_at<v_prev_end and q.status<>'cancelled'
      and exists(select 1 from qualified_orders qo where qo.quote_id=q.id and qo.sale_at<v_prev_end))::int
  into v_quotes,v_converted,v_prev_quotes,v_prev_converted
  from public.quotes q where q.agent_id=p_agent_id;

  v_quote_conversion:=case when v_quotes>0 then round(v_converted::numeric/v_quotes,4) else null end;
  v_prev_quote_conversion:=case when v_prev_quotes>0 then round(v_prev_converted::numeric/v_prev_quotes,4) else null end;

  select
    count(*) filter(where event_type='followup_due' and created_at>=v_month_start and created_at<v_period_end)::int,
    count(*) filter(where event_type='followup_completed' and created_at>=v_month_start and created_at<v_period_end)::int
  into v_follow_due,v_follow_done
  from public.lead_events where agent_id=p_agent_id;

  v_follow_completion:=case when v_follow_due>0
    then round(least(v_follow_done,v_follow_due)::numeric/v_follow_due,4) else null end;

  select round(avg(best_score),1) into v_training_score
  from public.training_progress where agent_id=p_agent_id and best_score is not null;

  select count(*)::int into v_orders_30d
  from public.orders
  where agent_id=p_agent_id and status='completed'
    and coalesce(completed_at,created_at)>=now()-interval '30 days';

  v_next_tier:=case v_agent.tier when 'starter' then 'active' when 'active' then 'pro' when 'pro' then 'elite' else null end;
  if v_next_tier is not null then
    v_next_orders:=coalesce((v_cfg #>> array[v_next_tier,'orders'])::int,
      case v_next_tier when 'active' then 15 when 'pro' then 30 when 'elite' then 45 end);
    v_next_score:=coalesce((v_cfg #>> array[v_next_tier,'score'])::numeric,
      case v_next_tier when 'active' then 70 when 'pro' then 80 when 'elite' then 90 end);
  end if;

  with payment as (
    select order_id,
      min(processed_at) filter (where event_type in ('payment_succeeded','paid')) as paid_at,
      coalesce(sum(amount) filter (where event_type in ('refund_succeeded','refunded')),0) as refunds
    from private.payment_events where order_id is not null group by order_id
  ),
  eligible as (
    select coalesce(p.paid_at,o.completed_at,o.created_at) as sale_at,
      greatest(0,o.commissionable_revenue-least(coalesce(p.refunds,0),o.commissionable_revenue))::numeric as net_revenue
    from public.orders o left join payment p on p.order_id=o.id
    where o.agent_id=p_agent_id and o.status<>'cancelled' and o.payment_status<>'refunded'
      and (o.payment_status in ('paid','partially_refunded') or o.status='completed')
  ),
  days as (
    select generate_series(v_month,(timezone('Asia/Kuching',v_period_end)-interval '1 millisecond')::date,interval '1 day')::date as day
  ),
  daily as (
    select d.day,coalesce(sum(e.net_revenue),0)::numeric as revenue,count(e.sale_at)::int as orders
    from days d
    left join eligible e on (e.sale_at at time zone 'Asia/Kuching')::date=d.day
      and e.sale_at>=v_month_start and e.sale_at<v_period_end
    group by d.day order by d.day
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'date',day,'day',extract(day from day)::int,'revenue',revenue,'orders',orders
  ) order by day),'[]'::jsonb) into v_daily from daily;

  select jsonb_build_object(
    'pending',coalesce(sum(amount) filter(where status='pending'),0),
    'earned',coalesce(sum(amount) filter(where status='earned'),0),
    'payable',coalesce(sum(amount) filter(where status='payable'),0),
    'held',coalesce(sum(amount) filter(where status='held'),0),
    'paid',coalesce(sum(amount) filter(where status='paid'),0),
    'reversed',coalesce(sum(amount) filter(where status='reversed'),0),
    'refund_adjustments_pending',coalesce((select sum(amount) from public.commission_adjustments
      where agent_id=p_agent_id and type='refund_clawback' and status='pending'),0),
    'refund_adjustments_applied',coalesce((select sum(amount) from public.commission_adjustments
      where agent_id=p_agent_id and type='refund_clawback' and status='applied'),0)
  ) into v_wallet
  from public.commissions where agent_id=p_agent_id;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.occurred_at desc),'[]'::jsonb)
  into v_wallet_ledger
  from (
    select occurred_at,kind,status,amount,subtype
    from (
      select c.created_at as occurred_at,'commission'::text as kind,c.status,c.amount,null::text as subtype
      from public.commissions c where c.agent_id=p_agent_id
      union all
      select a.created_at,'adjustment'::text,a.status,a.amount,a.type
      from public.commission_adjustments a where a.agent_id=p_agent_id
    ) u order by occurred_at desc limit 20
  ) x;

  select
    count(*) filter(where is_demo=false)::int,
    count(*) filter(where is_demo=false and status in ('certified','active'))::int
  into v_team_total,v_team_active from public.agents;

  return jsonb_build_object(
    'month',to_char(v_month,'YYYY-MM'),
    'as_of',timezone('Asia/Kuching',v_period_end),
    'compare_start',timezone('Asia/Kuching',v_prev_start),
    'compare_end',timezone('Asia/Kuching',v_prev_end),
    'sales',jsonb_build_object(
      'revenue',v_revenue,'orders',v_orders,'aov',v_aov,
      'quote_conversion',v_quote_conversion,'quotes',v_quotes,'converted_quotes',v_converted
    ),
    'previous',jsonb_build_object(
      'revenue',v_prev_revenue,'orders',v_prev_orders,'aov',v_prev_aov,
      'quote_conversion',v_prev_quote_conversion,'quotes',v_prev_quotes,'converted_quotes',v_prev_converted
    ),
    'changes',jsonb_build_object(
      'revenue_pct',case when v_prev_revenue=0 then null else round((v_revenue-v_prev_revenue)*100/v_prev_revenue,1) end,
      'orders_pct',case when v_prev_orders=0 then null else round((v_orders-v_prev_orders)*100.0/v_prev_orders,1) end,
      'aov_pct',case when v_prev_aov=0 then null else round((v_aov-v_prev_aov)*100/v_prev_aov,1) end,
      'quote_conversion_pct',case when v_prev_quote_conversion is null or v_prev_quote_conversion=0 then null
        else round((v_quote_conversion-v_prev_quote_conversion)*100/v_prev_quote_conversion,1) end
    ),
    'daily',v_daily,
    'tier_progress',jsonb_build_object(
      'current_tier',v_agent.tier,'orders_30d',v_orders_30d,'performance_score',v_agent.performance_score,
      'next_tier',v_next_tier,'next_orders_required',v_next_orders,'next_score_required',v_next_score,
      'orders_remaining',case when v_next_orders is null then 0 else greatest(v_next_orders-v_orders_30d,0) end,
      'score_remaining',case when v_next_score is null then 0 else greatest(v_next_score-v_agent.performance_score,0) end
    ),
    'kpis',jsonb_build_object(
      'quote_conversion',v_quote_conversion,'followup_completion',v_follow_completion,
      'training_score',v_training_score,'performance_score',v_agent.performance_score
    ),
    'team',jsonb_build_object('total_agents',v_team_total,'active_agents',v_team_active),
    'wallet',v_wallet,'wallet_ledger',v_wallet_ledger
  );
end;
$function$;

revoke all on function public.agent_sales_dashboard_internal(uuid,date) from public,anon,authenticated;
grant execute on function public.agent_sales_dashboard_internal(uuid,date) to service_role;

