-- [D2] Private portfolio uploads and a strictly capped Owner image-caption budget.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('portfolio','portfolio',false,5242880,array['image/jpeg','image/png','image/webp']::text[])
on conflict(id) do update set public=false,file_size_limit=5242880,
 allowed_mime_types=array['image/jpeg','image/png','image/webp']::text[];
-- No anon/authenticated object policies: only the service_role can generate signed URLs.
alter table public.portfolio_photos enable row level security;
revoke all on table public.portfolio_photos from anon,authenticated;
grant select,insert,update on table public.portfolio_photos to service_role;

create table if not exists private.owner_ai_usage_daily(
 usage_date date not null,
 owner_user_id uuid not null,
 action text not null,
 calls integer not null default 0 check(calls >= 0),
 last_called_at timestamptz not null default now(),
 primary key(usage_date,owner_user_id,action)
);
alter table private.owner_ai_usage_daily enable row level security;
revoke all on table private.owner_ai_usage_daily from public,anon,authenticated;
grant select,insert,update on table private.owner_ai_usage_daily to service_role;

update private.system_settings
set value=jsonb_set(value,'{daily_limits,portfolio_caption}','50'::jsonb,true),updated_at=now()
where key='ai_policy';

create or replace function public.owner_reserve_portfolio_caption_internal(p_user_id uuid)
returns integer language plpgsql security definer set search_path to ''
as $$
declare v_limit integer:=50;v_used integer;v_role text;
begin
 select role into v_role from private.user_roles where user_id=p_user_id;
 if v_role is distinct from 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
 select greatest(0,least(50,coalesce((value->'daily_limits'->>'portfolio_caption')::integer,50)))
 into v_limit from private.system_settings where key='ai_policy';
 v_limit:=coalesce(v_limit,50);
 if v_limit<=0 then raise exception 'portfolio_caption_daily_limit'; end if;
 insert into private.owner_ai_usage_daily(usage_date,owner_user_id,action,calls)
 values ((now() at time zone 'Asia/Kuching')::date,p_user_id,'portfolio_caption',1)
 on conflict(usage_date,owner_user_id,action) do update
 set calls=private.owner_ai_usage_daily.calls+1,last_called_at=now()
 where private.owner_ai_usage_daily.calls < v_limit
 returning calls into v_used;
 if v_used is null then raise exception 'portfolio_caption_daily_limit'; end if;
 return v_used;
end;
$$;
revoke all on function public.owner_reserve_portfolio_caption_internal(uuid) from public,anon,authenticated;
grant execute on function public.owner_reserve_portfolio_caption_internal(uuid) to service_role;
