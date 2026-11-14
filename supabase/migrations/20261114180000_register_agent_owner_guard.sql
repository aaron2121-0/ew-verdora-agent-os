-- Self-registration (Google sign-in) opens register to any authenticated user.
-- Owner/admin accounts must never become agents.
create or replace function public.register_agent_internal(p_user_id uuid, p_display_name text, p_language text default 'en'::text)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare
  v_agent_id uuid;
  v_code text;
begin
  if p_user_id is null then raise exception 'user id required'; end if;
  if p_language not in ('en','zh') then raise exception 'invalid language'; end if;
  if exists(select 1 from private.user_roles where user_id=p_user_id and role in ('owner','admin')) then
    raise exception 'owner_cannot_register_as_agent';
  end if;

  select id into v_agent_id from public.agents where user_id=p_user_id;
  if v_agent_id is not null then return v_agent_id; end if;

  v_code := 'AG-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

  insert into public.profiles(id,display_name,preferred_language)
  values(p_user_id,left(coalesce(nullif(trim(p_display_name),''),'Agent'),120),p_language)
  on conflict(id) do update set
    display_name=excluded.display_name,
    preferred_language=excluded.preferred_language,
    updated_at=now();

  insert into public.agents(user_id,agent_code,display_name,status,tier,commission_rate,performance_score,preferred_language)
  values(p_user_id,v_code,left(coalesce(nullif(trim(p_display_name),''),'Agent'),120),'trainee','starter',0.05,0,p_language)
  returning id into v_agent_id;

  insert into public.training_progress(agent_id,module_id,status,assigned_reason)
  select v_agent_id,m.id,'assigned','initial_onboarding'
  from public.training_modules m
  where m.required=true and m.active=true
  on conflict(agent_id,module_id) do nothing;

  insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id,after_state)
  values(p_user_id,'system','agent_registered','agent',v_agent_id::text,
    jsonb_build_object('status','trainee','tier','starter','commission_rate',0.05));

  return v_agent_id;
end;
$function$;
revoke all on function public.register_agent_internal(uuid,text,text) from public,anon,authenticated;
grant execute on function public.register_agent_internal(uuid,text,text) to service_role;
