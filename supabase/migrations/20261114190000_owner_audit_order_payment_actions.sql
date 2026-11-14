-- PR #17 owner order/payment actions audit through owner_audit_action_internal,
-- which previously only accepted invite/recovery actions (order would succeed,
-- then the audit raised 'invalid action' and the Owner saw a 500).
create or replace function public.owner_audit_action_internal(p_user_id uuid, p_action text, p_entity_type text, p_entity_id text, p_before jsonb default null::jsonb, p_after jsonb default null::jsonb)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare v_role text;
begin
 select role into v_role from private.user_roles where user_id=p_user_id;
 if coalesce(v_role,'') not in ('owner','admin') then raise exception 'forbidden' using errcode='42501'; end if;
 if p_action not in ('agent_invite_created','owner_recovery_created','owner_order_created','owner_payment_confirmed') then raise exception 'invalid action'; end if;
 if p_action in ('owner_recovery_created','owner_order_created','owner_payment_confirmed') and v_role <> 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
 insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state)
 values(p_user_id,'owner',p_action,left(p_entity_type,60),left(p_entity_id,200),p_before,p_after);
end $function$;
revoke all on function public.owner_audit_action_internal(uuid,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.owner_audit_action_internal(uuid,text,text,text,jsonb,jsonb) to service_role;
