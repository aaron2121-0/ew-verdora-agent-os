-- EW VERDORA — hard contribution-margin floor + delivery-aware order guard.
-- Money rule: no automatic quote/order may go below the configurable floor.
-- Existing dynamic quote target remains in force; this floor is an absolute minimum.
-- No historical orders are rewritten.

insert into private.system_settings(key,value)
values ('profit_floor', jsonb_build_object('min_contribution_margin',0.50))
on conflict(key) do nothing;

update private.system_settings
set value=jsonb_set(value,'{min_contribution_margin}','0.50'::jsonb,true),
    updated_at=now()
where key='profit_floor' and not (value ? 'min_contribution_margin');

alter table private.quote_financials
  add column if not exists hard_floor_contribution_margin numeric,
  add column if not exists hard_floor_min_selling_price numeric,
  add column if not exists auto_approval_min_selling_price numeric,
  add column if not exists manual_review_reason text;

create or replace function private.minimum_contribution_margin_floor()
returns numeric
language sql
stable
set search_path=''
as $$
  select greatest(
    0.50::numeric,
    least(
      0.80::numeric,
      coalesce(
        (select (s.value->>'min_contribution_margin')::numeric
         from private.system_settings s
         where s.key='profit_floor'),
        0.50::numeric
      )
    )
  );
$$;

revoke all on function private.minimum_contribution_margin_floor() from public,anon,authenticated;
grant execute on function private.minimum_contribution_margin_floor() to service_role;

create or replace function public.owner_set_profit_floor_internal(
  p_user_id uuid,
  p_margin numeric
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_role text;
  v_old jsonb;
  v_next jsonb;
begin
  select role into v_role from private.user_roles where user_id=p_user_id;
  if v_role is distinct from 'owner' then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_margin is null or p_margin<0.50 or p_margin>0.80 then
    raise exception 'invalid profit floor';
  end if;

  select value into v_old
  from private.system_settings
  where key='profit_floor'
  for update;

  if v_old is null then v_old:='{}'::jsonb; end if;
  v_next:=jsonb_set(v_old,'{min_contribution_margin}',to_jsonb(round(p_margin,4)),true);

  insert into private.system_settings(key,value,updated_at)
  values('profit_floor',v_next,now())
  on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;

  insert into private.audit_events(
    actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state
  ) values(
    p_user_id,'owner','profit_floor_updated','system_setting','profit_floor',
    jsonb_build_object('value',v_old->'min_contribution_margin'),
    jsonb_build_object('value',v_next->'min_contribution_margin')
  );

  return jsonb_build_object(
    'min_contribution_margin',(v_next->>'min_contribution_margin')::numeric
  );
end;
$$;

revoke all on function public.owner_set_profit_floor_internal(uuid,numeric) from public,anon,authenticated;
grant execute on function public.owner_set_profit_floor_internal(uuid,numeric) to service_role;

create or replace function public.quote_underwrite_internal(
  p_agent_id uuid,
  p_customer_budget numeric,
  p_estimated_production_cost numeric,
  p_design_commitment text default 'adapted'
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_agent public.agents;
  v_required numeric;
  v_floor numeric;
  cfg jsonb;
  v_payment_pct numeric;
  v_risk_pct numeric;
  v_bonus_pct numeric;
  v_round numeric;
  v_variable_pct numeric;
  v_room numeric;
  v_floor_room numeric;
  v_max_buy numeric;
  v_full_price numeric;
  v_floor_price numeric;
  v_class text;
begin
  if p_customer_budget<=0 or p_estimated_production_cost<0 then
    raise exception 'invalid amount';
  end if;
  if p_design_commitment not in('flex','adapted','reference','exact','project') then
    raise exception 'invalid commitment';
  end if;

  select * into v_agent from public.agents where id=p_agent_id;
  if v_agent.id is null then raise exception 'agent not found'; end if;

  select value into cfg from private.system_settings where key='quote_policy';
  v_payment_pct:=coalesce((cfg->>'payment_pct')::numeric,0.02);
  v_risk_pct:=coalesce((cfg->>'risk_pct')::numeric,0.03);
  v_bonus_pct:=coalesce((cfg->>'bonus_pct')::numeric,0.01);
  v_round:=greatest(1,coalesce((cfg->>'price_rounding')::numeric,10));

  v_floor:=private.minimum_contribution_margin_floor();
  v_required:=greatest(private.required_contribution_margin(),v_floor);
  v_variable_pct:=v_agent.commission_rate+v_payment_pct+v_risk_pct+v_bonus_pct;
  v_room:=1-v_required-v_variable_pct;
  v_floor_room:=1-v_floor-v_variable_pct;

  if v_room<=0 or v_floor_room<=0 then
    return jsonb_build_object(
      'classification','RED',
      'reason','margin_structure_impossible',
      'manual_required',true,
      'required_contribution',v_required,
      'hard_floor',v_floor
    );
  end if;

  v_max_buy:=greatest(0,round(p_customer_budget*v_room,2));
  v_full_price:=ceil((p_estimated_production_cost/v_room)/v_round)*v_round;
  v_floor_price:=ceil((p_estimated_production_cost/v_floor_room)/v_round)*v_round;

  if p_design_commitment in('exact','project') then v_class:='RED';
  elsif p_estimated_production_cost<=v_max_buy then v_class:='GREEN';
  else v_class:='AMBER';
  end if;

  return jsonb_build_object(
    'classification',v_class,
    'customer_budget',p_customer_budget,
    'max_production_buy_cost',v_max_buy,
    'estimated_reference_cost',p_estimated_production_cost,
    'recommended_full_price',v_full_price,
    'hard_floor_min_price',v_floor_price,
    'budget_version_price',p_customer_budget,
    'budget_version_commitment',case when v_class='AMBER' then 'adapted' else p_design_commitment end,
    'manual_required',v_class='RED',
    'required_contribution',v_required,
    'hard_floor',v_floor
  );
end;
$$;

create or replace function public.create_quote_internal(
  p_lead_id uuid,
  p_selling_price numeric,
  p_production_estimate numeric,
  p_design_commitment text,
  p_valid_until timestamptz default (now()+interval '30 minutes')
) returns public.quotes
language plpgsql
security definer
set search_path=''
as $$
declare
  v_lead public.leads;
  v_agent public.agents;
  v_required numeric;
  v_floor numeric;
  cfg jsonb;
  v_payment_pct numeric;
  v_risk_pct numeric;
  v_bonus_pct numeric;
  v_round numeric;
  v_commission numeric;
  v_payment numeric;
  v_risk numeric;
  v_bonus numeric;
  v_contrib numeric;
  v_margin numeric;
  v_max_buy numeric;
  v_variable_pct numeric;
  v_floor_room numeric;
  v_required_room numeric;
  v_floor_min_price numeric;
  v_auto_min_price numeric;
  v_status text;
  v_guard text;
  v_reason text;
  v_q public.quotes;
  v_version int;
begin
  select * into v_lead from public.leads where id=p_lead_id for update;
  if v_lead.id is null then raise exception 'lead not found'; end if;

  select * into v_agent from public.agents where id=v_lead.agent_id;
  if v_agent.id is null then raise exception 'agent not found'; end if;

  if p_selling_price<=0 or p_production_estimate<0 then raise exception 'invalid amount'; end if;
  if p_design_commitment in('exact','project') then raise exception 'manual quote required'; end if;

  select value into cfg from private.system_settings where key='quote_policy';
  v_payment_pct:=coalesce((cfg->>'payment_pct')::numeric,0.02);
  v_risk_pct:=coalesce((cfg->>'risk_pct')::numeric,0.03);
  v_bonus_pct:=coalesce((cfg->>'bonus_pct')::numeric,0.01);
  v_round:=greatest(1,coalesce((cfg->>'price_rounding')::numeric,10));

  v_floor:=private.minimum_contribution_margin_floor();
  v_required:=greatest(private.required_contribution_margin(),v_floor);
  v_variable_pct:=v_agent.commission_rate+v_payment_pct+v_risk_pct+v_bonus_pct;
  v_floor_room:=1-v_floor-v_variable_pct;
  v_required_room:=1-v_required-v_variable_pct;

  if v_floor_room<=0 then raise exception 'profit floor structure impossible'; end if;

  v_floor_min_price:=ceil((p_production_estimate/v_floor_room)/v_round)*v_round;
  v_auto_min_price:=case when v_required_room>0
    then ceil((p_production_estimate/v_required_room)/v_round)*v_round
    else null end;

  v_commission:=round(p_selling_price*v_agent.commission_rate,2);
  v_payment:=round(p_selling_price*v_payment_pct,2);
  v_risk:=round(p_selling_price*v_risk_pct,2);
  v_bonus:=round(p_selling_price*v_bonus_pct,2);
  v_contrib:=p_selling_price-p_production_estimate-v_commission-v_payment-v_risk-v_bonus;
  v_margin:=v_contrib/p_selling_price;

  if v_margin<v_floor then
    v_status:='draft';
    v_guard:='manual_review';
    v_reason:='below_hard_floor';
  elsif v_margin<v_required then
    v_status:='draft';
    v_guard:='manual_review';
    v_reason:='below_auto_target';
  else
    v_status:='approved';
    v_guard:='pass';
    v_reason:=null;
  end if;

  v_max_buy:=case when v_required_room>0
    then round(p_selling_price*v_required_room,2)
    else 0 end;

  select coalesce(max(quote_version),0)+1 into v_version
  from public.quotes where lead_id=p_lead_id;

  insert into public.quotes(
    lead_id,agent_id,quote_version,selling_price,design_commitment,status,
    commission_rate_locked,commission_rule_version,contribution_margin,
    profit_guard_status,valid_until
  ) values(
    p_lead_id,v_agent.id,v_version,p_selling_price,p_design_commitment,v_status,
    v_agent.commission_rate,'v1',v_margin,v_guard,p_valid_until
  )
  returning * into v_q;

  insert into private.quote_financials(
    quote_id,production_cost_estimate,payment_cost_estimate,risk_allowance,
    bonus_allocation,required_contribution_margin,max_production_buy_cost,
    hard_floor_contribution_margin,hard_floor_min_selling_price,
    auto_approval_min_selling_price,manual_review_reason
  ) values(
    v_q.id,p_production_estimate,v_payment,v_risk,v_bonus,v_required,v_max_buy,
    v_floor,v_floor_min_price,v_auto_min_price,v_reason
  );

  if v_status='approved' then
    update public.leads set status='quoted',updated_at=now() where id=p_lead_id;
    insert into public.lead_events(lead_id,agent_id,event_type,metadata)
    values(
      p_lead_id,v_agent.id,'quote_sent',
      jsonb_build_object('quote_id',v_q.id,'selling_price',p_selling_price)
    );
  end if;

  return v_q;
end;
$$;

create or replace function public.create_quote_from_request_internal(
  p_agent_id uuid,
  p_request_id uuid,
  p_option text default 'budget'
) returns public.quotes
language plpgsql
security definer
set search_path=''
as $$
declare
  qr public.quote_requests;
  ra private.reference_analysis;
  uw jsonb;
  v_price numeric;
  v_cost numeric;
  v_q public.quotes;
begin
  select * into qr
  from public.quote_requests
  where id=p_request_id and agent_id=p_agent_id
  for update;

  if qr.id is null then raise exception 'quote request not found'; end if;
  if qr.status<>'underwritten' or qr.classification not in('GREEN','AMBER') then
    raise exception 'quote request not ready';
  end if;

  select * into ra from private.reference_analysis where quote_request_id=qr.id;
  if ra.quote_request_id is null or ra.estimated_production_cost is null then
    raise exception 'reference analysis missing';
  end if;

  uw:=public.quote_underwrite_internal(
    qr.agent_id,qr.customer_budget,ra.estimated_production_cost,qr.design_commitment
  );

  if p_option='recommended' then
    v_price:=coalesce(qr.recommended_price,(uw->>'recommended_full_price')::numeric);
    v_cost:=ra.estimated_production_cost;
  elsif p_option='budget' then
    v_price:=coalesce(qr.budget_version_price,qr.customer_budget);
    v_cost:=least(
      ra.estimated_production_cost,
      coalesce((uw->>'max_production_buy_cost')::numeric,0)
    );
  else
    raise exception 'invalid quote option';
  end if;

  if v_price is null or v_price<=0 or v_cost is null or v_cost<0 then
    raise exception 'quote option incomplete';
  end if;

  select * into v_q from public.create_quote_internal(
    qr.lead_id,
    v_price,
    v_cost,
    case when p_option='budget' and qr.classification='AMBER'
      then 'adapted' else qr.design_commitment end,
    now()+interval '30 minutes'
  );

  update public.quote_requests
  set
    status=case when v_q.status='draft' then 'manual_review' else 'quote_created' end,
    classification=case when v_q.status='draft' then 'RED' else classification end,
    customer_note_en=case when v_q.status='draft'
      then 'This quotation needs manual confirmation before it can be sent.'
      else customer_note_en end,
    customer_note_zh=case when v_q.status='draft'
      then '这笔报价需要人工确认后才能发出。'
      else customer_note_zh end,
    updated_at=now()
  where id=qr.id;

  return v_q;
end;
$$;

create or replace function public.create_order_from_quote_internal(
  p_quote_id uuid,
  p_order_code text,
  p_delivery_fee numeric,
  p_delivery_cost_estimate numeric
) returns public.orders
language plpgsql
security definer
set search_path=''
as $$
declare
  q public.quotes;
  qf private.quote_financials;
  o public.orders;
  collision public.orders;
  cfg jsonb;
  v_floor numeric;
  v_payment_pct numeric;
  v_delivery_payment numeric;
  v_flower_contrib numeric;
  v_total_contrib numeric;
  v_margin numeric;
  v_commission numeric;
begin
  if nullif(trim(p_order_code),'') is null then raise exception 'order code required'; end if;
  if p_delivery_fee<0 or p_delivery_cost_estimate<0 then raise exception 'invalid delivery amount'; end if;

  select * into q from public.quotes where id=p_quote_id for update;
  if q.id is null then raise exception 'quote not found'; end if;

  select * into o from public.orders where quote_id=p_quote_id;
  if o.id is not null then return o; end if;

  if q.status not in('approved','sent','accepted') then raise exception 'quote not eligible'; end if;
  if q.valid_until is not null and q.valid_until<now() then raise exception 'quote expired'; end if;
  if q.contribution_margin is null then raise exception 'quote profit data missing'; end if;

  select * into collision
  from public.orders
  where order_code=left(trim(p_order_code),80);
  if collision.id is not null and collision.quote_id<>p_quote_id then
    raise exception 'order code already belongs to another quote';
  end if;

  select value into cfg from private.system_settings where key='quote_policy';
  v_payment_pct:=coalesce((cfg->>'payment_pct')::numeric,0.02);
  v_floor:=private.minimum_contribution_margin_floor();
  v_delivery_payment:=round(p_delivery_fee*v_payment_pct,2);
  v_flower_contrib:=round(q.selling_price*q.contribution_margin,2);
  v_total_contrib:=v_flower_contrib+p_delivery_fee-p_delivery_cost_estimate-v_delivery_payment;
  v_margin:=case when q.selling_price+p_delivery_fee>0
    then v_total_contrib/(q.selling_price+p_delivery_fee)
    else 0 end;

  if v_margin<v_floor then raise exception 'order_profit_floor_failed'; end if;

  insert into public.orders(
    order_code,quote_id,agent_id,status,commissionable_revenue,delivery_fee,payment_status
  ) values(
    left(trim(p_order_code),80),q.id,q.agent_id,'confirmed',
    q.selling_price,p_delivery_fee,'pending'
  )
  returning * into o;

  select * into qf from private.quote_financials where quote_id=q.id;
  if qf.quote_id is not null then
    v_commission:=round(q.selling_price*q.commission_rate_locked,2);
    insert into private.order_financials(
      order_id,selling_price,production_cost,payment_cost,risk_cost,
      bonus_allocation,agent_commission,contribution,contribution_margin,
      actual,delivery_fee_revenue,delivery_cost,refund_cost,updated_at
    ) values(
      o.id,q.selling_price,qf.production_cost_estimate,
      qf.payment_cost_estimate+v_delivery_payment,qf.risk_allowance,
      qf.bonus_allocation,v_commission,v_total_contrib,v_margin,
      false,p_delivery_fee,p_delivery_cost_estimate,0,now()
    )
    on conflict(order_id) do update set
      selling_price=excluded.selling_price,
      production_cost=excluded.production_cost,
      payment_cost=excluded.payment_cost,
      risk_cost=excluded.risk_cost,
      bonus_allocation=excluded.bonus_allocation,
      agent_commission=excluded.agent_commission,
      contribution=excluded.contribution,
      contribution_margin=excluded.contribution_margin,
      actual=false,
      delivery_fee_revenue=excluded.delivery_fee_revenue,
      delivery_cost=excluded.delivery_cost,
      refund_cost=0,
      updated_at=now();
  end if;

  update public.quotes set status='accepted' where id=q.id;
  update public.leads set status='won',updated_at=now() where id=q.lead_id;
  return o;
end;
$$;

revoke all on function public.create_order_from_quote_internal(uuid,text,numeric,numeric)
from public,anon,authenticated;
grant execute on function public.create_order_from_quote_internal(uuid,text,numeric,numeric)
to service_role;

create or replace function public.create_order_from_quote_internal(
  p_quote_id uuid,
  p_order_code text,
  p_delivery_fee numeric default 0
) returns public.orders
language plpgsql
security definer
set search_path=''
as $$
begin
  -- Legacy callers get a conservative pass-through assumption:
  -- expected delivery cost equals the customer delivery fee.
  return public.create_order_from_quote_internal(
    p_quote_id,p_order_code,p_delivery_fee,p_delivery_fee
  );
end;
$$;

create or replace function public.record_completed_order_actuals_internal(
  p_order_id uuid,
  p_production_cost numeric,
  p_payment_cost numeric,
  p_delivery_cost numeric,
  p_refund_cost numeric default 0,
  p_risk_cost numeric default 0,
  p_fulfilment_type text default 'external',
  p_qc_pass boolean default true,
  p_rework boolean default false
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  o public.orders;
  q public.quotes;
  ra private.reference_analysis;
  commission numeric;
  bonus_alloc numeric:=0;
  contrib numeric;
  margin numeric;
  hold_hours int:=24;
  quote_cfg jsonb;
  settle_cfg jsonb;
  bonus_pct numeric:=0.01;
  v_floor numeric;
  c public.commissions;
begin
  if least(p_production_cost,p_payment_cost,p_delivery_cost,p_refund_cost,p_risk_cost)<0 then
    raise exception 'negative cost';
  end if;
  if p_fulfilment_type not in('internal','external') then
    raise exception 'invalid fulfilment type';
  end if;

  select * into o from public.orders where id=p_order_id for update;
  if o.id is null then raise exception 'order not found'; end if;
  if o.status<>'completed' then raise exception 'order not completed'; end if;

  select * into q from public.quotes where id=o.quote_id;
  commission:=round(o.commissionable_revenue*q.commission_rate_locked,2);

  select value into quote_cfg from private.system_settings where key='quote_policy';
  bonus_pct:=coalesce((quote_cfg->>'bonus_pct')::numeric,0.01);
  bonus_alloc:=round(o.commissionable_revenue*bonus_pct,2);
  v_floor:=private.minimum_contribution_margin_floor();

  contrib:=o.commissionable_revenue+o.delivery_fee
    -p_production_cost-p_payment_cost-p_delivery_cost-p_refund_cost-p_risk_cost
    -commission-bonus_alloc;

  margin:=case when o.commissionable_revenue+o.delivery_fee>0
    then contrib/(o.commissionable_revenue+o.delivery_fee)
    else 0 end;

  insert into private.order_financials(
    order_id,selling_price,production_cost,payment_cost,risk_cost,bonus_allocation,
    agent_commission,contribution,contribution_margin,actual,delivery_fee_revenue,
    delivery_cost,refund_cost,updated_at
  ) values(
    o.id,o.commissionable_revenue,p_production_cost,p_payment_cost,p_risk_cost,
    bonus_alloc,commission,contrib,margin,true,o.delivery_fee,p_delivery_cost,
    p_refund_cost,now()
  )
  on conflict(order_id) do update set
    production_cost=excluded.production_cost,
    payment_cost=excluded.payment_cost,
    risk_cost=excluded.risk_cost,
    bonus_allocation=excluded.bonus_allocation,
    agent_commission=excluded.agent_commission,
    contribution=excluded.contribution,
    contribution_margin=excluded.contribution_margin,
    actual=true,
    delivery_fee_revenue=excluded.delivery_fee_revenue,
    delivery_cost=excluded.delivery_cost,
    refund_cost=excluded.refund_cost,
    updated_at=now();

  if margin<v_floor and not exists(
    select 1
    from public.exceptions e
    where e.type='low_contribution_margin'
      and e.status in('open','frozen')
      and e.evidence->>'order_id'=o.id::text
  ) then
    insert into public.exceptions(
      agent_id,type,severity,summary,evidence,ai_recommendation,status
    ) values(
      o.agent_id,
      'low_contribution_margin',
      'high',
      'Completed order is below the contribution margin floor.',
      jsonb_build_object(
        'order_id',o.id,
        'order_code',o.order_code,
        'contribution_margin',round(margin,4),
        'minimum_contribution_margin',v_floor
      ),
      'Review production, delivery, payment, refund and risk costs before the next similar quote.',
      'open'
    );
  end if;

  select value into settle_cfg from private.system_settings where key='settlement_policy';
  hold_hours:=coalesce((settle_cfg->>'commission_dispute_hours')::int,24);

  select * into c from public.accrue_commission_internal(o.id);
  update public.commissions
  set dispute_hold_until=now()+(hold_hours||' hours')::interval,
      payable_at=now()+(hold_hours||' hours')::interval
  where id=c.id;

  select r.* into ra
  from public.quote_requests qr
  join private.reference_analysis r on r.quote_request_id=qr.id
  where qr.lead_id=q.lead_id
  order by qr.created_at desc
  limit 1;

  if ra.quote_request_id is not null and ra.size_band is not null then
    insert into private.fulfilment_history(
      source_order_id,size_band,density_band,premium_intensity,complexity_band,
      design_commitment,production_cost,fulfilment_type,qc_pass,rework_required,completed_at
    ) values(
      o.id,ra.size_band,ra.density_band,ra.premium_intensity,ra.complexity_band,
      q.design_commitment,p_production_cost,p_fulfilment_type,p_qc_pass,p_rework,
      coalesce(o.completed_at,now())
    )
    on conflict do nothing;
  end if;

  perform public.recalculate_kpi_internal(o.agent_id,current_date-29,current_date);
  perform public.evaluate_agent_tier_internal(o.agent_id);
  perform public.evaluate_bonus_internal(o.agent_id);
  perform public.refresh_profit_snapshot_internal(current_date-29,current_date);

  return jsonb_build_object(
    'order_id',o.id,
    'contribution',contrib,
    'contribution_margin',margin,
    'minimum_contribution_margin',v_floor,
    'below_floor',margin<v_floor,
    'commission_amount',commission,
    'bonus_reserve',bonus_alloc,
    'commission_hold_hours',hold_hours
  );
end;
$$;

create or replace function public.owner_profit_floor_overview_internal(
  p_user_id uuid,
  p_limit integer default 20
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_role text;
  v_floor numeric;
  v_auto_target numeric;
  v_quotes jsonb;
  v_orders jsonb;
begin
  select role into v_role from private.user_roles where user_id=p_user_id;
  if coalesce(v_role,'') not in('owner','admin') then
    raise exception 'forbidden' using errcode='42501';
  end if;

  v_floor:=private.minimum_contribution_margin_floor();
  v_auto_target:=greatest(private.required_contribution_margin(),v_floor);

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
  into v_quotes
  from (
    select
      q.id,
      q.created_at,
      q.selling_price,
      q.contribution_margin,
      q.status,
      q.profit_guard_status,
      qf.manual_review_reason,
      qf.hard_floor_min_selling_price,
      qf.auto_approval_min_selling_price,
      a.agent_code,
      a.display_name as agent_name,
      l.customer_label
    from public.quotes q
    join public.agents a on a.id=q.agent_id
    left join public.leads l on l.id=q.lead_id
    left join private.quote_financials qf on qf.quote_id=q.id
    where q.status='draft' and q.profit_guard_status='manual_review'
    order by q.created_at desc
    limit least(greatest(coalesce(p_limit,20),1),100)
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.completed_at desc),'[]'::jsonb)
  into v_orders
  from (
    select
      o.id,
      o.order_code,
      o.completed_at,
      f.contribution_margin,
      a.agent_code,
      a.display_name as agent_name
    from private.order_financials f
    join public.orders o on o.id=f.order_id
    join public.agents a on a.id=o.agent_id
    where f.actual=true and f.contribution_margin<v_floor
    order by o.completed_at desc nulls last
    limit least(greatest(coalesce(p_limit,20),1),100)
  ) x;

  return jsonb_build_object(
    'min_contribution_margin',v_floor,
    'auto_quote_target',v_auto_target,
    'quotes',v_quotes,
    'orders',v_orders,
    'quote_count',jsonb_array_length(v_quotes),
    'order_count',jsonb_array_length(v_orders)
  );
end;
$$;

revoke all on function public.owner_profit_floor_overview_internal(uuid,integer)
from public,anon,authenticated;
grant execute on function public.owner_profit_floor_overview_internal(uuid,integer)
to service_role;
