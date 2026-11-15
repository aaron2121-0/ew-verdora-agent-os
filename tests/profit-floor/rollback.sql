-- EW VERDORA profit floor integration QA.
-- Run only with 20261115170000_profit_contribution_floor.sql applied in the SAME transaction.
-- Every fixture and setting mutation is rolled back.
BEGIN;
DO $$
DECLARE
  v_owner uuid;
  v_agent uuid;
  v_old_rate numeric;
  v_lead_low uuid;
  v_lead_high uuid;
  v_lead_healthy uuid;
  v_q_low public.quotes;
  v_q_high public.quotes;
  v_q_healthy public.quotes;
  v_order public.orders;
  v_healthy_order public.orders;
  v_result jsonb;
  v_overview jsonb;
  v_rejected boolean:=false;
  v_floor_min numeric;
BEGIN
  select user_id into v_owner from private.user_roles where role='owner' limit 1;
  select id,commission_rate into v_agent,v_old_rate
  from public.agents
  where is_demo=false
  order by created_at
  limit 1;

  if v_owner is null or v_agent is null then
    raise exception 'fixture_requires_existing_owner_and_agent';
  end if;

  -- Use the highest current tier rate so the hard-floor maths is deterministic.
  update public.agents set commission_rate=0.10 where id=v_agent;

  insert into public.leads(agent_id,source,status)
  values(v_agent,'other','new') returning id into v_lead_low;

  select * into v_q_low
  from public.create_quote_internal(v_lead_low,100,45,'adapted',now()+interval '30 minutes');

  select hard_floor_min_selling_price into v_floor_min
  from private.quote_financials where quote_id=v_q_low.id;

  if v_q_low.status<>'draft'
     or v_q_low.profit_guard_status<>'manual_review'
     or v_q_low.contribution_margin>=0.50
     or v_floor_min<>140
     or (select status from public.leads where id=v_lead_low)<>'new'
  then
    raise exception 'FAIL: below_floor_quote_not_routed';
  end if;
  raise notice 'PASS 1/5: RM100 / RM45 / 10%% quote is draft+manual_review; hard-floor minimum RM140';

  insert into public.leads(agent_id,source,status)
  values(v_agent,'other','new') returning id into v_lead_high;

  select * into v_q_high
  from public.create_quote_internal(v_lead_high,300,45,'adapted',now()+interval '30 minutes');

  if v_q_high.status<>'approved'
     or v_q_high.profit_guard_status<>'pass'
     or v_q_high.contribution_margin<0.65
  then
    raise exception 'FAIL: healthy_quote_rejected';
  end if;
  raise notice 'PASS 2/5: RM300 / RM45 / 10%% quote auto-approved above dynamic target';

  begin
    perform public.create_order_from_quote_internal(
      v_q_high.id,
      'PF-FAIL-'||left(gen_random_uuid()::text,8),
      50,
      120
    );
  exception when others then
    v_rejected:=position('order_profit_floor_failed' in sqlerrm)>0;
  end;

  if not v_rejected
     or exists(select 1 from public.orders where quote_id=v_q_high.id)
  then
    raise exception 'FAIL: delivery_guard_did_not_block';
  end if;
  raise notice 'PASS 3/5: delivery-aware order below 50%% was blocked before payment';

  select * into v_order
  from public.create_order_from_quote_internal(
    v_q_high.id,
    'PF-PASS-'||left(gen_random_uuid()::text,8),
    50,
    40
  );

  if v_order.id is null
     or not exists(
       select 1 from private.order_financials f
       where f.order_id=v_order.id and f.actual=false and f.contribution_margin>=0.50
     )
  then
    raise exception 'FAIL: healthy_delivery_order_rejected';
  end if;

  update public.orders
  set status='completed',payment_status='paid',completed_at=now(),updated_at=now()
  where id=v_order.id;

  select public.record_completed_order_actuals_internal(
    v_order.id,200,6,40,0,5,'external',true,false
  ) into v_result;

  if coalesce((v_result->>'below_floor')::boolean,false) is not true
     or not exists(
       select 1 from public.exceptions e
       where e.type='low_contribution_margin'
         and e.status='open'
         and e.evidence->>'order_id'=v_order.id::text
     )
  then
    raise exception 'FAIL: completed_low_margin_not_alerted';
  end if;
  raise notice 'PASS 4/5: completed order below floor was recorded and Owner exception created';

  insert into public.leads(agent_id,source,status)
  values(v_agent,'other','new') returning id into v_lead_healthy;

  select * into v_q_healthy
  from public.create_quote_internal(v_lead_healthy,400,40,'adapted',now()+interval '30 minutes');

  select * into v_healthy_order
  from public.create_order_from_quote_internal(
    v_q_healthy.id,
    'PF-HEALTHY-'||left(gen_random_uuid()::text,8),
    20,
    10
  );

  update public.orders
  set status='completed',payment_status='paid',completed_at=now(),updated_at=now()
  where id=v_healthy_order.id;

  select public.record_completed_order_actuals_internal(
    v_healthy_order.id,40,8,10,0,5,'external',true,false
  ) into v_result;

  if coalesce((v_result->>'below_floor')::boolean,true) is true
     or exists(
       select 1 from public.exceptions e
       where e.type='low_contribution_margin'
         and e.evidence->>'order_id'=v_healthy_order.id::text
     )
  then
    raise exception 'FAIL: healthy_completed_order_alerted';
  end if;

  select public.owner_profit_floor_overview_internal(v_owner,20) into v_overview;
  if (v_overview->>'min_contribution_margin')::numeric<>0.50
     or (v_overview->>'auto_quote_target')::numeric<0.65
     or (v_overview->>'quote_count')::int<1
     or (v_overview->>'order_count')::int<1
  then
    raise exception 'FAIL: owner_profit_overview';
  end if;

  raise notice 'PASS 5/5: healthy completed order passes; Owner overview shows 50%% floor and current >=65%% auto target';
END;
$$;
ROLLBACK;
