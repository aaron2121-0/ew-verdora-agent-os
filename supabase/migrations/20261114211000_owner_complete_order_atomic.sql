-- Atomic Owner order completion. The existing record_completed_order_actuals_internal
-- requires orders.status='completed', so walk the official state machine
-- (transition_order_internal) first, all inside one transaction. Commission maths is
-- untouched: record_completed_order_actuals_internal -> accrue_commission_internal.
create or replace function public.owner_complete_order_internal(
 p_user_id uuid, p_order_id uuid,
 p_production_cost numeric, p_payment_cost numeric, p_delivery_cost numeric,
 p_refund_cost numeric, p_risk_cost numeric,
 p_fulfilment_type text, p_qc_pass boolean, p_rework boolean
) returns jsonb language plpgsql security definer set search_path to ''
as $$
declare
 v_role text; o public.orders; v_next text; v_result jsonb; i int;
begin
 select role into v_role from private.user_roles where user_id=p_user_id;
 if coalesce(v_role,'')<>'owner' then raise exception 'forbidden' using errcode='42501'; end if;
 if p_qc_pass is distinct from true then raise exception 'qc_not_passed'; end if;
 select * into o from public.orders where id=p_order_id for update;
 if o.id is null then raise exception 'order_not_found'; end if;
 if o.status='completed' then raise exception 'order_already_completed'; end if;
 if o.payment_status<>'paid' then raise exception 'order_not_paid'; end if;
 for i in 1..6 loop
  select status into o.status from public.orders where id=p_order_id;
  exit when o.status='completed';
  v_next:=case o.status
   when 'paid' then 'producing' when 'producing' then 'qc_pending'
   when 'qc_pending' then 'qc_pass' when 'qc_pass' then 'delivering'
   when 'delivering' then 'completed' else null end;
  if v_next is null then raise exception 'order_not_ready_for_completion'; end if;
  perform public.transition_order_internal(p_order_id,v_next);
 end loop;
 if (select status from public.orders where id=p_order_id)<>'completed'
 then raise exception 'order_not_ready_for_completion'; end if;
 v_result:=public.record_completed_order_actuals_internal(
  p_order_id,p_production_cost,p_payment_cost,p_delivery_cost,p_refund_cost,
  p_risk_cost,p_fulfilment_type,true,coalesce(p_rework,false));
 perform public.owner_audit_action_internal(p_user_id,'owner_order_completed','order',p_order_id::text,
  null,jsonb_build_object('production_cost',p_production_cost,'payment_cost',p_payment_cost,
   'delivery_cost',p_delivery_cost,'refund_cost',p_refund_cost,'risk_cost',p_risk_cost,
   'fulfilment_type',p_fulfilment_type,'rework',coalesce(p_rework,false),
   'commission_amount',v_result->'commission_amount'));
 return v_result;
end $$;
revoke all on function public.owner_complete_order_internal(uuid,uuid,numeric,numeric,numeric,numeric,numeric,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.owner_complete_order_internal(uuid,uuid,numeric,numeric,numeric,numeric,numeric,text,boolean,boolean) to service_role;
