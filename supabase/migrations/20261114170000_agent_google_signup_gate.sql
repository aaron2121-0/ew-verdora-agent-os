-- Google self-signup gate. PR-only: do not apply until Claude approval.
-- Default CLOSED; the private setting is never exposed to PostgREST.
insert into private.system_settings(key,value)
values ('agent_signup.open', 'false'::jsonb)
on conflict (key) do nothing;

-- Short-lived challenge proof: issued only after server-side Cloudflare siteverify.
-- Never expose either table through the Data API.
create table if not exists private.agent_google_signup_challenges (
  nonce_hash text primary key,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create table if not exists private.agent_google_signup_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table private.agent_google_signup_challenges enable row level security;
alter table private.agent_google_signup_grants enable row level security;
revoke all on private.agent_google_signup_challenges from public,anon,authenticated;
revoke all on private.agent_google_signup_grants from public,anon,authenticated;

create or replace function public.agent_signup_challenge_create_internal(p_nonce_hash text)
returns void language plpgsql security definer set search_path = ''
as $
begin
  if p_nonce_hash !~ '^[0-9a-f]{64}
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_email text; v_open boolean := false;
begin
  if p_user_id is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select lower(trim(email)) into v_email from auth.users where id=p_user_id;
  select role into v_role from private.user_roles where user_id = p_user_id;
  if v_role in ('owner','admin') or exists (
    select 1 from private.user_roles r join auth.users u on u.id=r.user_id
    where r.role in ('owner','admin') and lower(trim(u.email))=v_email
  ) then return jsonb_build_object('route','owner'); end if;
  if exists (select 1 from public.agents where user_id = p_user_id) then
    return jsonb_build_object('route','home');
  end if;
  -- A consumed invitation remains eligible even if public registration is closed.
  select lower(trim(email)) into v_email from auth.users where id = p_user_id;
  if exists (
    select 1 from public.agent_auth_invites
     where lower(trim(email)) = v_email and used_at is not null
  ) then return jsonb_build_object('route','register'); end if;
  select (value = 'true'::jsonb) into v_open
    from private.system_settings where key = 'agent_signup.open';
  if coalesce(v_open,false) then
    if exists (
      select 1 from private.agent_google_signup_grants
      where user_id=p_user_id and expires_at>now()
    ) then return jsonb_build_object('route','register'); end if;
    -- Google OAuth itself does not enforce Supabase Auth's captchaToken.
    if exists (select 1 from auth.identities where user_id=p_user_id and provider='google')
    then return jsonb_build_object('route','captcha_required'); end if;
    -- Other auth providers are unchanged.
    return jsonb_build_object('route','register');
  end if;
  return jsonb_build_object('route','invite_only');
end $$;

create or replace function public.owner_signup_setting_get_internal(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_open boolean := false;
begin
  select role into v_role from private.user_roles where user_id = p_user_id;
  if v_role is distinct from 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
  select (value = 'true'::jsonb) into v_open
    from private.system_settings where key = 'agent_signup.open';
  return jsonb_build_object('open',coalesce(v_open,false));
end $$;

create or replace function public.owner_signup_setting_set_internal(p_user_id uuid,p_open boolean)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_before jsonb; v_after jsonb;
begin
  select role into v_role from private.user_roles where user_id = p_user_id;
  if v_role is distinct from 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
  if p_open is null then raise exception 'invalid value'; end if;
  select value into v_before from private.system_settings
    where key = 'agent_signup.open' for update;
  if not found then raise exception 'setting not found'; end if;
  v_after := to_jsonb(p_open);
  if v_before is distinct from v_after then
    update private.system_settings set value = v_after,updated_at = now()
      where key = 'agent_signup.open';
    insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state)
    values(p_user_id,'owner','agent_signup_setting_changed','system_setting','agent_signup.open',
      jsonb_build_object('value',v_before),jsonb_build_object('value',v_after));
  end if;
  return jsonb_build_object('open',p_open);
end $$;

-- Defence in depth: calling the legacy register RPC directly cannot bypass the
-- Google new-user gate. Invited Google identities remain eligible.
-- No changes to agent-session/register or KYC procedures.
create or replace function private.guard_agent_google_registration()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_email text; v_open boolean := false; v_role text;
begin
  select lower(trim(email)) into v_email from auth.users where id=new.user_id;
  select role into v_role from private.user_roles where user_id = new.user_id;
  if v_role in ('owner','admin') or exists (
    select 1 from private.user_roles r join auth.users u on u.id=r.user_id
    where r.role in ('owner','admin') and lower(trim(u.email))=v_email
  ) then
    raise exception 'owner_cannot_register_as_agent' using errcode='42501';
  end if;
  if not exists (
    select 1 from auth.identities
    where user_id = new.user_id and provider = 'google'
  ) then return new; end if;
  select (value = 'true'::jsonb) into v_open
    from private.system_settings where key = 'agent_signup.open';
  select lower(trim(email)) into v_email from auth.users where id = new.user_id;
  if exists (
    select 1 from public.agent_auth_invites
      where lower(trim(email)) = v_email and used_at is not null
  ) then return new; end if;
  if not coalesce(v_open,false) then
    raise exception 'agent_signup_closed' using errcode='42501';
  end if;
  if not exists (
    select 1 from private.agent_google_signup_grants
    where user_id=new.user_id and expires_at>now()
  ) then raise exception 'captcha_required' using errcode='42501'; end if;
  return new;
end $$;

drop trigger if exists guard_agent_google_registration on public.agents;
create trigger guard_agent_google_registration
before insert on public.agents for each row
execute function private.guard_agent_google_registration();

revoke all on function public.agent_signup_route_internal(uuid) from public,anon,authenticated;
revoke all on function public.owner_signup_setting_get_internal(uuid) from public,anon,authenticated;
revoke all on function public.owner_signup_setting_set_internal(uuid,boolean) from public,anon,authenticated;
grant execute on function public.agent_signup_route_internal(uuid) to service_role;
grant execute on function public.owner_signup_setting_get_internal(uuid) to service_role;
grant execute on function public.owner_signup_setting_set_internal(uuid,boolean) to service_role;
 then raise exception 'invalid challenge'; end if;
  delete from private.agent_google_signup_challenges where expires_at < now() - interval '1 day';
  insert into private.agent_google_signup_challenges(nonce_hash,expires_at)
  values(p_nonce_hash,now()+interval '5 minutes');
end $;

create or replace function public.agent_signup_challenge_consume_internal(p_user_id uuid,p_nonce_hash text)
returns boolean language plpgsql security definer set search_path = ''
as $
declare v_nonce text;
begin
  if p_user_id is null or p_nonce_hash !~ '^[0-9a-f]{64}
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_email text; v_open boolean := false;
begin
  if p_user_id is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select role into v_role from private.user_roles where user_id = p_user_id;
  if v_role in ('owner','admin') then return jsonb_build_object('route','owner'); end if;
  if exists (select 1 from public.agents where user_id = p_user_id) then
    return jsonb_build_object('route','home');
  end if;
  -- A consumed invitation remains eligible even if public registration is closed.
  select lower(trim(email)) into v_email from auth.users where id = p_user_id;
  if exists (
    select 1 from public.agent_auth_invites
     where lower(trim(email)) = v_email and used_at is not null
  ) then return jsonb_build_object('route','register'); end if;
  select (value = 'true'::jsonb) into v_open
    from private.system_settings where key = 'agent_signup.open';
  if coalesce(v_open,false) then
    if exists (
      select 1 from private.agent_google_signup_grants
      where user_id=p_user_id and expires_at>now()
    ) then return jsonb_build_object('route','register'); end if;
    -- Google OAuth itself does not enforce Supabase Auth's captchaToken.
    if exists (select 1 from auth.identities where user_id=p_user_id and provider='google')
    then return jsonb_build_object('route','captcha_required'); end if;
    -- Other auth providers are unchanged.
    return jsonb_build_object('route','register');
  end if;
  return jsonb_build_object('route','invite_only');
end $$;

create or replace function public.owner_signup_setting_get_internal(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_open boolean := false;
begin
  select role into v_role from private.user_roles where user_id = p_user_id;
  if v_role is distinct from 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
  select (value = 'true'::jsonb) into v_open
    from private.system_settings where key = 'agent_signup.open';
  return jsonb_build_object('open',coalesce(v_open,false));
end $$;

create or replace function public.owner_signup_setting_set_internal(p_user_id uuid,p_open boolean)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_before jsonb; v_after jsonb;
begin
  select role into v_role from private.user_roles where user_id = p_user_id;
  if v_role is distinct from 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
  if p_open is null then raise exception 'invalid value'; end if;
  select value into v_before from private.system_settings
    where key = 'agent_signup.open' for update;
  if not found then raise exception 'setting not found'; end if;
  v_after := to_jsonb(p_open);
  if v_before is distinct from v_after then
    update private.system_settings set value = v_after,updated_at = now()
      where key = 'agent_signup.open';
    insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state)
    values(p_user_id,'owner','agent_signup_setting_changed','system_setting','agent_signup.open',
      jsonb_build_object('value',v_before),jsonb_build_object('value',v_after));
  end if;
  return jsonb_build_object('open',p_open);
end $$;

-- Defence in depth: calling the legacy register RPC directly cannot bypass the
-- Google new-user gate. Invited Google identities remain eligible.
-- No changes to agent-session/register or KYC procedures.
create or replace function private.guard_agent_google_registration()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_email text; v_open boolean := false; v_role text;
begin
  select role into v_role from private.user_roles where user_id = new.user_id;
  if v_role in ('owner','admin') then
    raise exception 'owner_cannot_register_as_agent' using errcode='42501';
  end if;
  if not exists (
    select 1 from auth.identities
    where user_id = new.user_id and provider = 'google'
  ) then return new; end if;
  select (value = 'true'::jsonb) into v_open
    from private.system_settings where key = 'agent_signup.open';
  if coalesce(v_open,false) then return new; end if;
  select lower(trim(email)) into v_email from auth.users where id = new.user_id;
  if exists (
    select 1 from public.agent_auth_invites
      where lower(trim(email)) = v_email and used_at is not null
  ) then return new; end if;
  raise exception 'agent_signup_closed' using errcode='42501';
end $$;

drop trigger if exists guard_agent_google_registration on public.agents;
create trigger guard_agent_google_registration
before insert on public.agents for each row
execute function private.guard_agent_google_registration();

revoke all on function public.agent_signup_route_internal(uuid) from public,anon,authenticated;
revoke all on function public.owner_signup_setting_get_internal(uuid) from public,anon,authenticated;
revoke all on function public.owner_signup_setting_set_internal(uuid,boolean) from public,anon,authenticated;
grant execute on function public.agent_signup_route_internal(uuid) to service_role;
grant execute on function public.owner_signup_setting_get_internal(uuid) to service_role;
grant execute on function public.owner_signup_setting_set_internal(uuid,boolean) to service_role;
 then return false; end if;
  if exists (select 1 from private.user_roles where user_id=p_user_id and role in ('owner','admin'))
  then return false; end if;
  update private.agent_google_signup_challenges set used_at=now()
    where nonce_hash=p_nonce_hash and used_at is null and expires_at>now()
    returning nonce_hash into v_nonce;
  if v_nonce is null then return false; end if;
  insert into private.agent_google_signup_grants(user_id,created_at,expires_at)
    values(p_user_id,now(),now()+interval '2 hours')
  on conflict (user_id) do update set created_at=excluded.created_at,expires_at=excluded.expires_at;
  return true;
end $;

create or replace function public.agent_signup_route_internal(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_email text; v_open boolean := false;
begin
  if p_user_id is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select role into v_role from private.user_roles where user_id = p_user_id;
  if v_role in ('owner','admin') then return jsonb_build_object('route','owner'); end if;
  if exists (select 1 from public.agents where user_id = p_user_id) then
    return jsonb_build_object('route','home');
  end if;
  -- A consumed invitation remains eligible even if public registration is closed.
  select lower(trim(email)) into v_email from auth.users where id = p_user_id;
  if exists (
    select 1 from public.agent_auth_invites
     where lower(trim(email)) = v_email and used_at is not null
  ) then return jsonb_build_object('route','register'); end if;
  select (value = 'true'::jsonb) into v_open
    from private.system_settings where key = 'agent_signup.open';
  if coalesce(v_open,false) then
    if exists (
      select 1 from private.agent_google_signup_grants
      where user_id=p_user_id and expires_at>now()
    ) then return jsonb_build_object('route','register'); end if;
    -- Google OAuth itself does not enforce Supabase Auth's captchaToken.
    if exists (select 1 from auth.identities where user_id=p_user_id and provider='google')
    then return jsonb_build_object('route','captcha_required'); end if;
    -- Other auth providers are unchanged.
    return jsonb_build_object('route','register');
  end if;
  return jsonb_build_object('route','invite_only');
end $$;

create or replace function public.owner_signup_setting_get_internal(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_open boolean := false;
begin
  select role into v_role from private.user_roles where user_id = p_user_id;
  if v_role is distinct from 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
  select (value = 'true'::jsonb) into v_open
    from private.system_settings where key = 'agent_signup.open';
  return jsonb_build_object('open',coalesce(v_open,false));
end $$;

create or replace function public.owner_signup_setting_set_internal(p_user_id uuid,p_open boolean)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_before jsonb; v_after jsonb;
begin
  select role into v_role from private.user_roles where user_id = p_user_id;
  if v_role is distinct from 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
  if p_open is null then raise exception 'invalid value'; end if;
  select value into v_before from private.system_settings
    where key = 'agent_signup.open' for update;
  if not found then raise exception 'setting not found'; end if;
  v_after := to_jsonb(p_open);
  if v_before is distinct from v_after then
    update private.system_settings set value = v_after,updated_at = now()
      where key = 'agent_signup.open';
    insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state)
    values(p_user_id,'owner','agent_signup_setting_changed','system_setting','agent_signup.open',
      jsonb_build_object('value',v_before),jsonb_build_object('value',v_after));
  end if;
  return jsonb_build_object('open',p_open);
end $$;

-- Defence in depth: calling the legacy register RPC directly cannot bypass the
-- Google new-user gate. Invited Google identities remain eligible.
-- No changes to agent-session/register or KYC procedures.
create or replace function private.guard_agent_google_registration()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_email text; v_open boolean := false; v_role text;
begin
  select role into v_role from private.user_roles where user_id = new.user_id;
  if v_role in ('owner','admin') then
    raise exception 'owner_cannot_register_as_agent' using errcode='42501';
  end if;
  if not exists (
    select 1 from auth.identities
    where user_id = new.user_id and provider = 'google'
  ) then return new; end if;
  select (value = 'true'::jsonb) into v_open
    from private.system_settings where key = 'agent_signup.open';
  if coalesce(v_open,false) then return new; end if;
  select lower(trim(email)) into v_email from auth.users where id = new.user_id;
  if exists (
    select 1 from public.agent_auth_invites
      where lower(trim(email)) = v_email and used_at is not null
  ) then return new; end if;
  raise exception 'agent_signup_closed' using errcode='42501';
end $$;

drop trigger if exists guard_agent_google_registration on public.agents;
create trigger guard_agent_google_registration
before insert on public.agents for each row
execute function private.guard_agent_google_registration();

revoke all on function public.agent_signup_route_internal(uuid) from public,anon,authenticated;
revoke all on function public.owner_signup_setting_get_internal(uuid) from public,anon,authenticated;
revoke all on function public.owner_signup_setting_set_internal(uuid,boolean) from public,anon,authenticated;
grant execute on function public.agent_signup_route_internal(uuid) to service_role;
grant execute on function public.owner_signup_setting_get_internal(uuid) to service_role;
grant execute on function public.owner_signup_setting_set_internal(uuid,boolean) to service_role;

revoke all on function public.agent_signup_challenge_create_internal(text) from public,anon,authenticated;
revoke all on function public.agent_signup_challenge_consume_internal(uuid,text) from public,anon,authenticated;
grant execute on function public.agent_signup_challenge_create_internal(text) to service_role;
grant execute on function public.agent_signup_challenge_consume_internal(uuid,text) to service_role;
