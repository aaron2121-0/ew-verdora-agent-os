-- [D5] Owner-generated course reminders; never send automatically.
create table if not exists private.owner_agent_reminder_usage(
 usage_date date not null,
 owner_user_id uuid not null,
 calls integer not null default 0 check(calls>=0),
 last_called_at timestamptz not null default now(),
 primary key(usage_date,owner_user_id)
);
alter table private.owner_agent_reminder_usage enable row level security;
revoke all on table private.owner_agent_reminder_usage from public,anon,authenticated;
grant select,insert,update on table private.owner_agent_reminder_usage to service_role;
update private.system_settings
set value=jsonb_set(value,'{daily_limits,owner_agent_reminder}','30'::jsonb,true),updated_at=now()
where key='ai_policy';

create or replace function public.owner_reserve_agent_reminder_internal(p_user_id uuid)
returns boolean language plpgsql security definer set search_path to ''
as $$
declare v_role text;v_limit integer:=30;v_calls integer;
begin
 select role into v_role from private.user_roles where user_id=p_user_id;
 if v_role is distinct from 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
 select greatest(0,least(30,coalesce((value->'daily_limits'->>'owner_agent_reminder')::integer,30)))
 into v_limit from private.system_settings where key='ai_policy';
 v_limit:=coalesce(v_limit,30);
 if v_limit=0 then return false; end if;
 insert into private.owner_agent_reminder_usage(usage_date,owner_user_id,calls)
 values ((now() at time zone 'Asia/Kuching')::date,p_user_id,1)
 on conflict(usage_date,owner_user_id) do update
 set calls=private.owner_agent_reminder_usage.calls+1,last_called_at=now()
 where private.owner_agent_reminder_usage.calls < v_limit
 returning calls into v_calls;
 return v_calls is not null;
end;
$$;
revoke all on function public.owner_reserve_agent_reminder_internal(uuid) from public,anon,authenticated;
grant execute on function public.owner_reserve_agent_reminder_internal(uuid) to service_role;
