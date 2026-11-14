-- [D1] Owner-only commission payout; no changes to commission accrual/math.
-- This migration is deferred until the 1.0.0-ai-assist production gate opens.
create or replace function public.owner_audit_action_internal(
 p_user_id uuid,p_action text,p_entity_type text,p_entity_id text,
 p_before jsonb default null::jsonb,p_after jsonb default null::jsonb
) returns void language plpgsql security definer set search_path to ''
as $$
declare v_role text;
begin
 select role into v_role from private.user_roles where user_id=p_user_id;
 if coalesce(v_role,'') not in ('owner','admin') then raise exception 'forbidden' using errcode='42501'; end if;
 if p_action not in (
   'agent_invite_created','owner_recovery_created','owner_order_created',
   'owner_payment_confirmed','owner_order_completed','owner_commission_paid'
 ) then raise exception 'invalid action'; end if;
 if p_action in (
   'owner_recovery_created','owner_order_created','owner_payment_confirmed',
   'owner_order_completed','owner_commission_paid'
 ) and v_role <> 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
 insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state)
 values(p_user_id,'owner',p_action,left(p_entity_type,60),left(p_entity_id,200),p_before,p_after);
end;
$$;
revoke all on function public.owner_audit_action_internal(uuid,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.owner_audit_action_internal(uuid,text,text,text,jsonb,jsonb) to service_role;

create or replace function public.owner_mark_commissions_paid_internal(
 p_user_id uuid,p_commission_ids uuid[],p_payment_reference text
) returns jsonb language plpgsql security definer set search_path to ''
as $$
declare
 v_role text;
 v_agent uuid;
 v_count integer:=0;
 v_total numeric:=0;
 v_item record;
 v_paid jsonb:='[]'::jsonb;
 v_paid_at timestamptz:=now();
 v_reference text:=upper(btrim(coalesce(p_payment_reference,'')));
begin
 select role into v_role from private.user_roles where user_id=p_user_id;
 if v_role is distinct from 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
 if p_commission_ids is null or cardinality(p_commission_ids)<1 or cardinality(p_commission_ids)>100
    or array_position(p_commission_ids,null) is not null
    or (select count(distinct x) from unnest(p_commission_ids) x)<>cardinality(p_commission_ids)
 then raise exception 'invalid_commission_selection'; end if;
 if v_reference !~ '^[A-Z0-9][A-Z0-9_/-]{4,79}$' then raise exception 'invalid_payment_reference'; end if;
 -- Lock in stable UUID order. Concurrent payouts serialize on the same rows.
 for v_item in
   select c.id,c.agent_id,c.order_id,c.status,c.amount
   from public.commissions c where c.id=any(p_commission_ids)
   order by c.id for update
 loop
   if v_item.status is distinct from 'payable' then raise exception 'commission_not_payable'; end if;
   if v_agent is null then v_agent:=v_item.agent_id; end if;
   if v_agent is distinct from v_item.agent_id then raise exception 'mixed_agent_selection'; end if;
   v_total:=v_total+v_item.amount;
   v_count:=v_count+1;
   v_paid:=v_paid||jsonb_build_array(jsonb_build_object(
     'id',v_item.id,'order_id',v_item.order_id,'amount',v_item.amount));
 end loop;
 if v_count<>cardinality(p_commission_ids) then raise exception 'commissions_not_found'; end if;
 if v_total<0 then raise exception 'invalid_commission_amount'; end if;
 update public.commissions
    set status='paid',paid_at=v_paid_at
    where id=any(p_commission_ids) and status='payable';
 if not found then raise exception 'commission_not_payable'; end if;
 -- The audit call is in the same transaction as UPDATE, so audit failure rolls back payment.
 perform public.owner_audit_action_internal(
   p_user_id,'owner_commission_paid','agent',v_agent::text,
   null,jsonb_build_object(
     'reference',v_reference,'agent_id',v_agent,'amount',v_total,
     'count',v_count,'commissions',v_paid,'paid_at',v_paid_at));
 return jsonb_build_object('ok',true,'agent_id',v_agent,'amount',v_total,
   'count',v_count,'payment_reference',v_reference,'paid_at',v_paid_at);
end;
$$;
revoke all on function public.owner_mark_commissions_paid_internal(uuid,uuid[],text) from public,anon,authenticated;
grant execute on function public.owner_mark_commissions_paid_internal(uuid,uuid[],text) to service_role;
