-- Owner V2 Phase A: improve existing Owner audit records without touching frozen agent/quote business functions.
create or replace function public.owner_set_reference_baseline_internal(
 p_user_id uuid,p_size text,p_density text,p_premium text,p_complexity text,
 p_safe_cost numeric,p_note text default null
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_old jsonb; v_new jsonb; v_key text;
begin
 select role into v_role from private.user_roles where user_id=p_user_id;
 if v_role is distinct from 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
 if p_size not in ('small','medium','large','xl','structure')
  or p_density not in ('light','medium','full','very_full')
  or p_premium not in ('low','medium','high','very_high')
  or p_complexity not in ('low','medium','high','special')
 then raise exception 'invalid classification'; end if;
 if p_safe_cost is null or p_safe_cost<0 or p_safe_cost>100000 then raise exception 'invalid cost'; end if;
 select to_jsonb(t) into v_old from private.reference_cost_baselines t
  where size_band=p_size and density_band=p_density and premium_intensity=p_premium and complexity_band=p_complexity
  for update;
 insert into private.reference_cost_baselines(
  size_band,density_band,premium_intensity,complexity_band,safe_cost,note,active,updated_at
 ) values(p_size,p_density,p_premium,p_complexity,p_safe_cost,left(p_note,500),true,now())
 on conflict(size_band,density_band,premium_intensity,complexity_band) do update set
  safe_cost=excluded.safe_cost,note=excluded.note,active=true,updated_at=now();
 select to_jsonb(t) into v_new from private.reference_cost_baselines t
  where size_band=p_size and density_band=p_density and premium_intensity=p_premium and complexity_band=p_complexity;
 v_key:=p_size||'/'||p_density||'/'||p_premium||'/'||p_complexity;
 insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state)
 values(p_user_id,'owner','reference_cost_baseline_set','quote_calibration',v_key,v_old,v_new);
 return jsonb_build_object('ok',true,'fingerprint',jsonb_build_object(
  'size',p_size,'density',p_density,'premium',p_premium,'complexity',p_complexity),'safe_cost',p_safe_cost);
end $$;

create or replace function public.owner_decide_exception_internal(
 p_user_id uuid,p_exception_id uuid,p_decision text
) returns public.exceptions language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_before public.exceptions; v_after public.exceptions;
begin
 select role into v_role from private.user_roles where user_id=p_user_id;
 if coalesce(v_role,'') not in ('owner','admin') then raise exception 'forbidden' using errcode='42501';end if;
 if p_decision not in ('freeze','dismiss','resolve') then raise exception 'invalid decision';end if;
 select * into v_before from public.exceptions where id=p_exception_id for update;
 if not found then raise exception 'exception not found';end if;
 update public.exceptions set
  status=case p_decision when 'freeze' then 'frozen' when 'dismiss' then 'dismissed' else 'resolved' end,
  owner_decision=p_decision,resolved_at=case when p_decision in ('dismiss','resolve') then now() else resolved_at end
 where id=p_exception_id returning * into v_after;
 if p_decision='freeze' and v_after.agent_id is not null then
  -- Preserves the EXISTING exception-freeze behavior. No new agent status change route.
  update public.agents set status='suspended',updated_at=now() where id=v_after.agent_id;
 end if;
 insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state)
 values(p_user_id,'owner','exception_decision','exception',p_exception_id::text,to_jsonb(v_before),to_jsonb(v_after));
 return v_after;
end $$;
