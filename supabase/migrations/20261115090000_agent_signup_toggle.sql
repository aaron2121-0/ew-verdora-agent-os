-- Agent self-signup toggle. Default OPEN.
-- No CAPTCHA, challenge token, grant table, or extra login gate is introduced here.
insert into private.system_settings(key,value)
values ('agent_signup.open', 'true'::jsonb)
on conflict (key) do nothing;

create or replace function public.owner_signup_setting_get_internal(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_open boolean := true;
begin
  select role into v_role
  from private.user_roles
  where user_id = p_user_id;

  if v_role is distinct from 'owner' then
    raise exception 'forbidden' using errcode='42501';
  end if;

  select (value = 'true'::jsonb)
    into v_open
  from private.system_settings
  where key = 'agent_signup.open';

  return jsonb_build_object('open', coalesce(v_open,true));
end;
$$;

create or replace function public.owner_signup_setting_set_internal(
  p_user_id uuid,
  p_open boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_before jsonb;
  v_after jsonb;
begin
  select role into v_role
  from private.user_roles
  where user_id = p_user_id;

  if v_role is distinct from 'owner' then
    raise exception 'forbidden' using errcode='42501';
  end if;

  if p_open is null then
    raise exception 'invalid_value';
  end if;

  select value
    into v_before
  from private.system_settings
  where key = 'agent_signup.open'
  for update;

  if not found then
    insert into private.system_settings(key,value)
    values ('agent_signup.open','true'::jsonb)
    returning value into v_before;
  end if;

  v_after := to_jsonb(p_open);

  if v_before is distinct from v_after then
    update private.system_settings
       set value = v_after,
           updated_at = now()
     where key = 'agent_signup.open';

    insert into private.audit_events(
      actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state
    )
    values(
      p_user_id,'owner','agent_signup_setting_changed','system_setting','agent_signup.open',
      jsonb_build_object('value',v_before),
      jsonb_build_object('value',v_after)
    );
  end if;

  return jsonb_build_object('open',p_open);
end;
$$;

create or replace function private.guard_agent_registration_signup_toggle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_open boolean := true;
  v_role text;
begin
  if new.user_id is null then
    return new;
  end if;

  select role into v_role
  from private.user_roles
  where user_id = new.user_id;

  if v_role in ('owner','admin') then
    raise exception 'owner_cannot_register_as_agent' using errcode='42501';
  end if;

  select lower(trim(email))
    into v_email
  from auth.users
  where id = new.user_id;

  if exists (
    select 1
    from private.user_roles r
    join auth.users u on u.id = r.user_id
    where r.role in ('owner','admin')
      and lower(trim(u.email)) = v_email
  ) then
    raise exception 'owner_cannot_register_as_agent' using errcode='42501';
  end if;

  select (value = 'true'::jsonb)
    into v_open
  from private.system_settings
  where key = 'agent_signup.open';

  if coalesce(v_open,true) then
    return new;
  end if;

  if exists (
    select 1
    from public.agent_auth_invites
    where lower(trim(email)) = v_email
      and used_at is not null
  ) then
    return new;
  end if;

  raise exception 'agent_signup_closed' using errcode='42501';
end;
$$;

drop trigger if exists guard_agent_google_registration on public.agents;
drop trigger if exists guard_agent_registration_signup_toggle on public.agents;
create trigger guard_agent_registration_signup_toggle
before insert on public.agents
for each row
execute function private.guard_agent_registration_signup_toggle();

revoke all on function public.owner_signup_setting_get_internal(uuid) from public,anon,authenticated;
revoke all on function public.owner_signup_setting_set_internal(uuid,boolean) from public,anon,authenticated;
grant execute on function public.owner_signup_setting_get_internal(uuid) to service_role;
grant execute on function public.owner_signup_setting_set_internal(uuid,boolean) to service_role;
