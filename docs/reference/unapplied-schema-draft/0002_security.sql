-- Row-level security. The browser only ever holds the anon key and a user
-- JWT, so these policies are what stop an Agent reading another Agent's data
-- or any internal cost. All money and status writes go through the server
-- with the service role (which bypasses RLS) after rule-engine validation.

create function app.current_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create function app.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'OWNER' from public.profiles where id = auth.uid()), false)
$$;

create function app.current_agent_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.agents where profile_id = auth.uid()
$$;

create function app.agent_can_sell() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'ACTIVE' from public.agents where profile_id = auth.uid()), false)
$$;

grant usage on schema app to authenticated;
grant execute on function app.current_role(), app.is_owner(), app.current_agent_id(), app.agent_can_sell() to authenticated;

-- New sign-ups get an AGENT profile and a REGISTERED agent record.
create sequence app.agent_code_seq start 1001;
create function app.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  new_agent uuid;
begin
  insert into public.profiles (id, display_name, locale)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''), coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'en'))
  on conflict (id) do nothing;
  if not exists (select 1 from public.agents where profile_id = new.id) then
    insert into public.agents (profile_id, code) values (new.id, 'A' || nextval('app.agent_code_seq')) returning id into new_agent;
    insert into public.agent_status_history (agent_id, from_status, to_status, event, actor) values (new_agent, null, 'REGISTERED', 'REGISTERED', 'SYSTEM');
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function app.handle_new_user();

-- Start from nothing, then grant exactly what each client role needs.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---- Owner: read everything; write configuration and exception decisions.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy owner_read on public.%I for select to authenticated using (app.is_owner())', t);
  end loop;
  foreach t in array array['system_settings', 'training_modules', 'campaigns', 'campaign_internals', 'selling_kits', 'selling_kit_assets', 'opex_entries'] loop
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('create policy owner_write on public.%I for all to authenticated using (app.is_owner()) with check (app.is_owner())', t);
  end loop;
end $$;

grant insert on public.rule_sets to authenticated;
create policy owner_insert on public.rule_sets for insert to authenticated with check (app.is_owner());

grant update (status, decided_by, decided_at, decision_note) on public.owner_exceptions to authenticated;
create policy owner_decide on public.owner_exceptions for update to authenticated using (app.is_owner()) with check (app.is_owner());

-- ---- Internal tables: no Agent access at all, not even column metadata reads.
revoke select on public.quote_version_internals, public.campaign_internals, public.owner_exceptions, public.audit_log,
  public.opex_entries, public.profit_snapshots, public.rule_sets, public.system_settings from authenticated;
-- Owners read these through the server (service role) after an OWNER check.

-- ---- Agent: own rows only.
create policy self_read on public.profiles for select to authenticated using (id = auth.uid());
grant update (display_name, locale) on public.profiles to authenticated;
create policy self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy self_read on public.agents for select to authenticated using (profile_id = auth.uid());
grant update (preferred_channels, phone) on public.agents to authenticated;
create policy self_update on public.agents for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['agent_status_history', 'agent_tier_history', 'training_progress', 'roleplay_sessions', 'daily_missions', 'mission_items',
    'leads', 'lead_events', 'quotes', 'quote_versions', 'orders', 'bonus_awards', 'ledger_entries', 'kpi_snapshots', 'violations', 'restrictions', 'recovery_tasks'] loop
    execute format('create policy agent_own_read on public.%I for select to authenticated using (agent_id = app.current_agent_id())', t);
  end loop;
end $$;

-- Shared, Agent-safe reference content.
create policy agent_read on public.training_modules for select to authenticated using (active);
create policy agent_read on public.selling_kits for select to authenticated using (active);
create policy agent_read on public.selling_kit_assets for select to authenticated using (exists (select 1 from public.selling_kits k where k.id = kit_id and k.active));
create policy agent_read on public.campaigns for select to authenticated using (active);

-- Agents record and update their own leads, while allowed to sell.
grant insert (agent_id, source, customer_name, customer_contact, occasion, budget_sen, reference_image_path, delivery_date, delivery_time, requirements, follow_up_at) on public.leads to authenticated;
grant update (source, customer_name, customer_contact, occasion, budget_sen, reference_image_path, delivery_date, delivery_time, requirements, status, follow_up_at, loss_reason) on public.leads to authenticated;
create policy agent_insert on public.leads for insert to authenticated with check (agent_id = app.current_agent_id() and app.agent_can_sell());
create policy agent_update on public.leads for update to authenticated using (agent_id = app.current_agent_id()) with check (agent_id = app.current_agent_id());

grant insert (lead_id, agent_id, kind, payload) on public.lead_events to authenticated;
create policy agent_insert on public.lead_events for insert to authenticated
  with check (agent_id = app.current_agent_id() and exists (select 1 from public.leads l where l.id = lead_id and l.agent_id = app.current_agent_id()));
grant usage on sequence public.lead_events_id_seq to authenticated;
