-- EW VERDORA Agent OS live hardening after Claude handoff review.
-- This file records changes already applied to the live Supabase project.
-- It is intentionally separate from docs/reference/unapplied-schema-draft/.

create unique index if not exists uq_orders_quote_id on public.orders(quote_id);

alter table public.commission_adjustments
  add column if not exists source_event_id text;

drop index if exists public.uq_refund_clawback_per_commission;
create unique index if not exists uq_refund_clawback_event
on public.commission_adjustments(commission_id,type,source_event_id)
where type='refund_clawback';

create or replace function public.create_order_from_quote_internal(
  p_quote_id uuid,
  p_order_code text,
  p_delivery_fee numeric default 0
)
returns public.orders
language plpgsql
security definer
set search_path=''
as $$
declare
  q public.quotes;
  o public.orders;
  collision public.orders;
begin
  if nullif(trim(p_order_code),'') is null then raise exception 'order code required'; end if;
  if p_delivery_fee < 0 then raise exception 'invalid delivery fee'; end if;

  select * into q from public.quotes where id=p_quote_id for update;
  if q.id is null then raise exception 'quote not found'; end if;

  select * into o from public.orders where quote_id=p_quote_id;
  if o.id is not null then return o; end if;

  if q.status not in ('approved','sent','accepted') then raise exception 'quote not eligible'; end if;
  if q.valid_until is not null and q.valid_until < now() then raise exception 'quote expired'; end if;

  select * into collision from public.orders where order_code=left(trim(p_order_code),80);
  if collision.id is not null and collision.quote_id<>p_quote_id then
    raise exception 'order code already belongs to another quote';
  end if;

  insert into public.orders(
    order_code,quote_id,agent_id,status,commissionable_revenue,delivery_fee,payment_status
  )
  values(
    left(trim(p_order_code),80),q.id,q.agent_id,'confirmed',q.selling_price,p_delivery_fee,'pending'
  )
  returning * into o;

  update public.quotes set status='accepted' where id=q.id;
  update public.leads set status='won',updated_at=now() where id=q.lead_id;
  return o;
end;
$$;

create or replace function public.record_payment_event_internal(
  p_provider text,
  p_event_id text,
  p_order_id uuid,
  p_event_type text,
  p_amount numeric,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  o public.orders;
  c public.commissions;
  f private.order_financials;
  total_due numeric;
  total_refunds numeric:=0;
  prior_refunds numeric:=0;
  prior_flower_refund numeric:=0;
  event_flower_refund numeric:=0;
  desired_commissionable numeric:=0;
  desired_commission numeric:=0;
  clawback numeric:=0;
  new_payment_status text;
begin
  if nullif(trim(p_provider),'') is null or nullif(trim(p_event_id),'') is null then
    raise exception 'payment event identity required';
  end if;

  if exists(
    select 1 from private.payment_events
    where provider=left(trim(p_provider),50)
      and external_event_id=left(trim(p_event_id),200)
  ) then
    return jsonb_build_object('duplicate',true,'order_id',p_order_id);
  end if;

  if p_amount is null or p_amount<=0 then raise exception 'invalid amount'; end if;

  select * into o from public.orders where id=p_order_id for update;
  if o.id is null then raise exception 'order not found'; end if;
  total_due:=round(o.commissionable_revenue+o.delivery_fee,2);

  if p_event_type in ('payment_succeeded','paid') then
    if o.status='cancelled' then raise exception 'payment not allowed for cancelled order'; end if;
    if o.payment_status in ('refunded','partially_refunded') then
      raise exception 'payment after refund requires manual review';
    end if;
    if o.payment_status='paid' then raise exception 'payment already recorded'; end if;
    if abs(p_amount-total_due)>0.01 then raise exception 'payment amount mismatch'; end if;

  elsif p_event_type in ('refund_succeeded','refunded') then
    if o.payment_status not in ('paid','partially_refunded') then
      raise exception 'refund requires a paid order';
    end if;

    select coalesce(sum(amount),0) into prior_refunds
    from private.payment_events
    where order_id=p_order_id
      and event_type in ('refund_succeeded','refunded');

    if prior_refunds+p_amount>total_due+0.01 then
      raise exception 'refund exceeds paid order total';
    end if;
  else
    raise exception 'unsupported payment event type';
  end if;

  insert into private.payment_events(provider,external_event_id,order_id,event_type,amount,payload)
  values(
    left(trim(p_provider),50),left(trim(p_event_id),200),p_order_id,
    left(p_event_type,80),p_amount,coalesce(p_payload,'{}'::jsonb)
  );

  if p_event_type in ('payment_succeeded','paid') then
    update public.orders
    set payment_status='paid',
        status=case when status='confirmed' then 'paid' else status end,
        updated_at=now()
    where id=p_order_id;
  else
    total_refunds:=prior_refunds+p_amount;
    new_payment_status:=case
      when total_refunds>=total_due-0.01 then 'refunded'
      else 'partially_refunded'
    end;

    update public.orders
    set payment_status=new_payment_status,updated_at=now()
    where id=p_order_id;

    select * into f from private.order_financials where order_id=p_order_id for update;
    if f.order_id is not null then
      update private.order_financials
      set refund_cost=refund_cost+p_amount,
          contribution=(selling_price+delivery_fee_revenue)
            -production_cost-payment_cost-risk_cost-delivery_cost-(refund_cost+p_amount)-agent_commission-bonus_allocation,
          contribution_margin=case when selling_price+delivery_fee_revenue>0 then
            ((selling_price+delivery_fee_revenue)-production_cost-payment_cost-risk_cost-delivery_cost-(refund_cost+p_amount)-agent_commission-bonus_allocation)
              /(selling_price+delivery_fee_revenue)
            else 0 end,
          updated_at=now()
      where order_id=p_order_id;
    end if;

    prior_flower_refund:=least(prior_refunds,o.commissionable_revenue);
    event_flower_refund:=least(p_amount,greatest(0,o.commissionable_revenue-prior_flower_refund));

    select * into c from public.commissions where order_id=p_order_id for update;
    if c.id is not null then
      desired_commissionable:=greatest(0,o.commissionable_revenue-least(total_refunds,o.commissionable_revenue));
      desired_commission:=round(desired_commissionable*c.rate_locked,2);

      if c.status='paid' then
        clawback:=-round(event_flower_refund*c.rate_locked,2);
        if clawback<>0 then
          insert into public.commission_adjustments(
            agent_id,order_id,commission_id,type,amount,status,reason,source_event_id
          )
          values(
            c.agent_id,p_order_id,c.id,'refund_clawback',clawback,'pending',
            'Customer refund after commission payout',
            left(trim(p_provider)||':'||trim(p_event_id),250)
          )
          on conflict(commission_id,type,source_event_id)
          where type='refund_clawback'
          do nothing;
        end if;
      elsif c.status<>'reversed' then
        update public.commissions
        set commissionable_revenue=desired_commissionable,
            amount=desired_commission,
            status=case when desired_commission<=0 then 'reversed' else status end
        where id=c.id;
      end if;
    end if;

    if o.status='completed' then
      perform public.refresh_profit_snapshot_internal(current_date-29,current_date);
    end if;
  end if;

  return jsonb_build_object(
    'duplicate',false,
    'order_id',p_order_id,
    'event_type',p_event_type,
    'payment_status',(select payment_status from public.orders where id=p_order_id)
  );
end;
$$;

create or replace function public.transition_order_internal(p_order_id uuid,p_to text)
returns public.orders
language plpgsql
security definer
set search_path=''
as $$
declare o public.orders; allowed boolean:=false;
begin
  select * into o from public.orders where id=p_order_id for update;
  if o.id is null then raise exception 'order not found'; end if;

  if o.payment_status='refunded' and p_to not in ('cancelled','exception') then
    raise exception 'fully refunded order cannot continue';
  end if;
  if p_to='paid' and o.payment_status<>'paid' then
    raise exception 'paid transition requires successful payment';
  end if;
  if p_to in ('producing','qc_pending','qc_pass','delivering','completed')
     and o.payment_status not in ('paid','partially_refunded') then
    raise exception 'order progression requires paid funds';
  end if;

  allowed:=case
    when o.status='confirmed' and p_to in('paid','cancelled','exception') then true
    when o.status='paid' and p_to in('producing','cancelled','exception') then true
    when o.status='producing' and p_to in('qc_pending','exception') then true
    when o.status='qc_pending' and p_to in('qc_pass','producing','exception') then true
    when o.status='qc_pass' and p_to in('delivering','exception') then true
    when o.status='delivering' and p_to in('completed','exception') then true
    when o.status='exception' and p_to in('producing','qc_pending','qc_pass','delivering','cancelled') then true
    else false end;

  if not allowed then raise exception 'invalid order transition % -> %',o.status,p_to; end if;
  update public.orders
  set status=p_to,
      completed_at=case when p_to='completed' then now() else completed_at end,
      updated_at=now()
  where id=p_order_id returning * into o;
  return o;
end;
$$;

create or replace function public.accrue_commission_internal(p_order_id uuid)
returns public.commissions
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order public.orders;
  v_quote public.quotes;
  v_comm public.commissions;
  v_refunds numeric:=0;
  v_base numeric:=0;
  v_amount numeric:=0;
begin
  select * into v_order from public.orders where id=p_order_id for update;
  if v_order.id is null then raise exception 'order not found'; end if;
  if v_order.status<>'completed' then raise exception 'order not completed'; end if;
  if v_order.payment_status not in ('paid','partially_refunded') then
    raise exception 'commission requires paid order';
  end if;

  select * into v_quote from public.quotes where id=v_order.quote_id;
  if v_quote.id is null then raise exception 'quote not found'; end if;

  select coalesce(sum(amount),0) into v_refunds
  from private.payment_events
  where order_id=p_order_id and event_type in ('refund_succeeded','refunded');

  v_base:=greatest(0,v_order.commissionable_revenue-least(v_refunds,v_order.commissionable_revenue));
  v_amount:=round(v_base*v_quote.commission_rate_locked,2);
  if v_amount<=0 then raise exception 'no commission due after refunds'; end if;

  select * into v_comm from public.commissions where order_id=p_order_id for update;
  if v_comm.id is not null then return v_comm; end if;

  insert into public.commissions(order_id,agent_id,commissionable_revenue,rate_locked,amount,status,earned_at)
  values(v_order.id,v_order.agent_id,v_base,v_quote.commission_rate_locked,v_amount,'earned',now())
  returning * into v_comm;
  return v_comm;
end;
$$;

revoke all privileges on public.campaigns from anon,authenticated;
revoke all privileges on public.channel_playbooks from anon,authenticated;
revoke all privileges on public.commission_adjustments from anon,authenticated;
revoke all privileges on public.lead_events from anon,authenticated;
revoke all privileges on public.quote_requests from anon,authenticated;

grant select on public.campaigns to authenticated;
grant select on public.channel_playbooks to authenticated;
grant select on public.commission_adjustments to authenticated;
grant select on public.lead_events to authenticated;
grant select on public.quote_requests to authenticated;

revoke execute on function private.daily_manager_job() from public,anon,authenticated;
revoke execute on function private.release_commissions_job() from public,anon,authenticated;
revoke execute on function private.sync_campaign_status() from public,anon,authenticated;

grant execute on function private.daily_manager_job() to service_role;
grant execute on function private.release_commissions_job() to service_role;
grant execute on function private.sync_campaign_status() to service_role;

revoke all on function public.record_payment_event_internal(text,text,uuid,text,numeric,jsonb)
from public,anon,authenticated;
grant execute on function public.record_payment_event_internal(text,text,uuid,text,numeric,jsonb)
to service_role;
