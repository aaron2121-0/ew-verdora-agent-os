-- [D4] Exactly one Owner brief generation claim per Kuching day.
-- The table cannot be read or written by normal client roles.
create table if not exists private.owner_daily_brief_cache(
 brief_date date primary key,
 status text not null default 'generating' check(status in ('generating','ready')),
 payload jsonb,
 claim_token uuid not null default gen_random_uuid(),
 claimed_at timestamptz not null default now(),
 completed_at timestamptz
);
alter table private.owner_daily_brief_cache enable row level security;
revoke all on table private.owner_daily_brief_cache from public,anon,authenticated;
grant select,insert,update on table private.owner_daily_brief_cache to service_role;

update private.system_settings
set value=jsonb_set(value,'{daily_limits,owner_daily_brief}','1'::jsonb,true),updated_at=now()
where key='ai_policy';

create or replace function public.owner_daily_brief_claim_internal(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare
 v_role text;
 v_today date:=(now() at time zone 'Asia/Kuching')::date;
 v_claim uuid:=gen_random_uuid();
 v_row private.owner_daily_brief_cache%rowtype;
begin
 select role into v_role from private.user_roles where user_id=p_user_id;
 if v_role is distinct from 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
 insert into private.owner_daily_brief_cache(brief_date,status,claim_token,claimed_at)
 values(v_today,'generating',v_claim,now()) on conflict(brief_date) do nothing;
 if found then return jsonb_build_object('claimed',true,'claim_token',v_claim,'date',v_today); end if;

 -- Recover a crashed generation only after it has been abandoned for 2 minutes.
 update private.owner_daily_brief_cache set claim_token=v_claim,claimed_at=now()
 where brief_date=v_today and status='generating' and claimed_at<now()-interval '2 minutes';
 if found then return jsonb_build_object('claimed',true,'claim_token',v_claim,'date',v_today); end if;
 select * into v_row from private.owner_daily_brief_cache where brief_date=v_today;
 return jsonb_build_object('claimed',false,'status',v_row.status,'date',v_today,
   'payload',v_row.payload);
end;
$$;
revoke all on function public.owner_daily_brief_claim_internal(uuid) from public,anon,authenticated;
grant execute on function public.owner_daily_brief_claim_internal(uuid) to service_role;

create or replace function public.owner_daily_brief_finish_internal(
 p_user_id uuid,p_claim_token uuid,p_payload jsonb
) returns boolean language plpgsql security definer set search_path to ''
as $$
declare v_role text;
begin
 select role into v_role from private.user_roles where user_id=p_user_id;
 if v_role is distinct from 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object'
 then raise exception 'invalid_brief'; end if;
 update private.owner_daily_brief_cache
 set payload=p_payload,status='ready',completed_at=now()
 where brief_date=(now() at time zone 'Asia/Kuching')::date
 and claim_token=p_claim_token and status='generating';
 return found;
end;
$$;
revoke all on function public.owner_daily_brief_finish_internal(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.owner_daily_brief_finish_internal(uuid,uuid,jsonb) to service_role;
