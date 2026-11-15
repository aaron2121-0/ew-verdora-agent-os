-- Occasion Calendar. Private tables are accessed only through authenticated
-- session Edge Functions using service_role RPCs; clients have no direct access.
create function private.occasion_url_valid(p_url text)
returns boolean language sql immutable set search_path=''
as $$
 select p_url is null or (char_length(p_url) between 1 and 2048
   and p_url ~* '^https?://(\[[0-9a-f:.]+\]|[a-z0-9]([a-z0-9.-]*[a-z0-9])?)(:[0-9]{1,5})?([/?#][^[:space:]]*)?$'
   and p_url !~ '[[:space:]]'
   and coalesce(substring(lower(p_url) from '^https?://(?:\[[^]]+\]|[^/:?#]+):([0-9]+)')::integer,80) between 1 and 65535);
$$;
create function private.occasion_products_valid(p_products text[])
returns boolean language sql immutable set search_path=''
as $$ select p_products is not null and cardinality(p_products)<=40
 and not exists(select 1 from unnest(p_products) p where p is null or char_length(trim(p)) not between 1 and 120); $$;
revoke all on function private.occasion_url_valid(text),private.occasion_products_valid(text[]) from public,anon,authenticated;

create table private.occasions (
 id uuid primary key default gen_random_uuid(),
 date_start date, date_end date, estimated_date date,
 name_zh text not null check(char_length(trim(name_zh)) between 1 and 240),
 name_en text not null check(char_length(trim(name_en)) between 1 and 240),
 category text not null check(category in ('graduation','festival','cultural','business','wedding','event')),
 location_or_audience text not null default '' check(char_length(location_or_audience)<=500),
 flower_demand text not null check(flower_demand in ('high','medium','low')),
 typical_products text[] not null default '{}' check(private.occasion_products_valid(typical_products)),
 order_lead_days integer not null default 21 check(order_lead_days between 0 and 365),
 recurrence text not null check(recurrence in ('fixed','lunar','variable')),
 date_status text not null check(date_status in ('confirmed','pattern','not_found')),
 confidence text not null check(confidence in ('high','medium','low')),
 past_2024 text check(char_length(past_2024)<=1000),
 past_2025 text check(char_length(past_2025)<=1000),
 source_url text check(private.occasion_url_valid(source_url)),
 evidence text check(char_length(evidence)<=10000),
 verified_by uuid references auth.users(id) on delete restrict,
 verified_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 constraint occasions_date_range check(date_end is null or (date_start is not null and date_end>=date_start)),
 constraint occasions_date_bounds check((date_start is null or date_start between date '0001-01-01' and date '9999-12-31') and (date_end is null or date_end between date '0001-01-01' and date '9999-12-31') and (estimated_date is null or estimated_date between date '0001-01-01' and date '9999-12-31')),
 constraint occasions_confirmation_metadata check(
  (date_status='confirmed' and date_start is not null and verified_by is not null and verified_at is not null)
  or (date_status<>'confirmed' and verified_by is null and verified_at is null))
);
create index occasions_date_start_idx on private.occasions(date_start);
create index occasions_estimated_date_idx on private.occasions(estimated_date);
create index occasions_status_demand_idx on private.occasions(date_status,flower_demand);
create index occasions_verified_by_idx on private.occasions(verified_by) where verified_by is not null;

create table private.occasion_verifications (
 id uuid primary key default gen_random_uuid(),
 occasion_id uuid not null references private.occasions(id) on delete cascade,
 submitted_by uuid not null references auth.users(id) on delete cascade,
 proposed_date_start date not null check(proposed_date_start between date '0001-01-01' and date '9999-12-31'),
 proposed_date_end date check(proposed_date_end between date '0001-01-01' and date '9999-12-31'),
 proof_url text check(private.occasion_url_valid(proof_url)),
 note text not null default '' check(char_length(note)<=5000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewed_by uuid references auth.users(id) on delete restrict,
 reviewed_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),
 constraint occasion_verifications_date_range check(proposed_date_end is null or proposed_date_end>=proposed_date_start),
 constraint occasion_verifications_review_metadata check(
  (status='pending' and reviewed_by is null and reviewed_at is null)
  or (status in ('approved','rejected') and reviewed_by is not null and reviewed_at is not null))
);
create index occasion_verifications_occasion_idx on private.occasion_verifications(occasion_id);
create index occasion_verifications_submitter_idx on private.occasion_verifications(submitted_by,created_at desc);
create index occasion_verifications_status_idx on private.occasion_verifications(status,created_at desc);
create index occasion_verifications_reviewer_idx on private.occasion_verifications(reviewed_by) where reviewed_by is not null;
alter table private.occasions enable row level security;
alter table private.occasion_verifications enable row level security;
revoke all on private.occasions,private.occasion_verifications from public,anon,authenticated,service_role;
-- Explicit restrictive denies also defend against future permissive policies.
create policy occasions_deny_clients on private.occasions as restrictive for all to anon,authenticated using(false) with check(false);
create policy occasion_verifications_deny_clients on private.occasion_verifications as restrictive for all to anon,authenticated using(false) with check(false);

create function private.occasion_require_owner(p_user_id uuid)
returns void language plpgsql security definer set search_path=''
as $$ begin
 if p_user_id is null or not exists(select 1 from private.user_roles where user_id=p_user_id and role='owner') then
  raise exception 'forbidden' using errcode='42501';
 end if;
end $$;
create function private.occasion_require_agent(p_user_id uuid)
returns void language plpgsql security definer set search_path=''
as $$ begin
 if p_user_id is null or not exists(select 1 from public.agents where user_id=p_user_id) then
  raise exception 'occasion_agent_required' using errcode='42501';
 end if;
end $$;
revoke all on function private.occasion_require_owner(uuid),private.occasion_require_agent(uuid) from public,anon,authenticated,service_role;

-- Validate JSON inside the privileged boundary as well as at the Edge.
create function private.occasion_validate_input(p_input jsonb)
returns jsonb language plpgsql set search_path=''
as $$
declare
 v_key text; v_value jsonb; v_text text; v_date date;
 v_fields constant text[]:=array['date_start','date_end','estimated_date','name_zh','name_en','category','location_or_audience','flower_demand','typical_products','order_lead_days','recurrence','date_status','confidence','past_2024','past_2025','source_url','evidence'];
begin
 if jsonb_typeof(p_input) is distinct from 'object' or not (p_input ?& v_fields) then raise exception 'occasion_invalid_request'; end if;
 for v_key,v_value in select * from jsonb_each(p_input) loop
  if not(v_key=any(v_fields)) then raise exception 'occasion_invalid_request'; end if;
  if v_key=any(array['date_start','date_end','estimated_date']) then
   if v_value='null'::jsonb then continue; end if;
   v_text:=p_input->>v_key;
   if jsonb_typeof(v_value)<>'string' or v_text!~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'occasion_invalid_request'; end if;
   begin v_date:=v_text::date;
    if v_date not between date '0001-01-01' and date '9999-12-31' or to_char(v_date,'YYYY-MM-DD')<>v_text then raise exception 'occasion_invalid_request'; end if;
   exception when others then raise exception 'occasion_invalid_request'; end;
  elsif v_key='typical_products' then
   if jsonb_typeof(v_value)<>'array' or jsonb_array_length(v_value)>40 then raise exception 'occasion_invalid_request'; end if;
   if exists(select 1 from jsonb_array_elements(v_value) item where jsonb_typeof(item)<>'string' or char_length(trim(item#>>'{}')) not between 1 and 120) then raise exception 'occasion_invalid_request'; end if;
  elsif v_key='order_lead_days' then
   if jsonb_typeof(v_value)<>'number' or (v_value#>>'{}')!~ '^[0-9]{1,3}$' or (v_value#>>'{}')::integer>365 then raise exception 'occasion_invalid_request'; end if;
  elsif v_key=any(array['past_2024','past_2025','source_url','evidence']) and v_value='null'::jsonb then
   continue;
  elsif jsonb_typeof(v_value)<>'string' then raise exception 'occasion_invalid_request';
  end if;
 end loop;
 if char_length(trim(p_input->>'name_zh')) not between 1 and 240 or char_length(trim(p_input->>'name_en')) not between 1 and 240
  or char_length(p_input->>'location_or_audience')>500
  or char_length(p_input->>'past_2024')>1000 or char_length(p_input->>'past_2025')>1000
  or char_length(p_input->>'evidence')>10000
  or not private.occasion_url_valid(p_input->>'source_url')
  or p_input->>'category' not in ('graduation','festival','cultural','business','wedding','event')
  or p_input->>'flower_demand' not in ('high','medium','low')
  or p_input->>'recurrence' not in ('fixed','lunar','variable')
  or p_input->>'date_status' not in ('confirmed','pattern','not_found')
  or p_input->>'confidence' not in ('high','medium','low')
  or ((p_input->>'date_end') is not null and ((p_input->>'date_start') is null or (p_input->>'date_end')::date<(p_input->>'date_start')::date))
  or (p_input->>'date_status'='confirmed' and p_input->>'date_start' is null)
 then raise exception 'occasion_invalid_request'; end if;
 return p_input;
end $$;
revoke all on function private.occasion_validate_input(jsonb) from public,anon,authenticated,service_role;

-- Shared write implementation. Metadata is always produced by this server.
create function private.occasion_write(p_user_id uuid,p_input jsonb,p_id uuid,p_confirm boolean,p_create_missing boolean default false)
returns private.occasions language plpgsql security definer set search_path=''
as $$
declare v_row private.occasions; v_old private.occasions; v_id uuid; v_now timestamptz;
begin
 perform private.occasion_require_owner(p_user_id);
 perform private.occasion_validate_input(p_input);
 if p_confirm is null or (p_confirm and p_input->>'date_status'<>'confirmed') then raise exception 'occasion_invalid_request'; end if;
 if p_input->>'date_status'='confirmed' and not p_confirm then raise exception 'occasion_confirmation_required'; end if;
 v_id:=coalesce(p_id,gen_random_uuid());
 if p_id is not null then
  select * into v_old from private.occasions where id=p_id for update;
  if not found and not p_create_missing then raise exception 'occasion_not_found' using errcode='P0002'; end if;
 end if;
 v_now:=clock_timestamp();
 -- Populate only validated OccasionInput fields; caller metadata never enters here.
 v_row:=jsonb_populate_record(null::private.occasions,p_input);
 v_row.id:=v_id; v_row.created_at:=coalesce(v_old.created_at,v_now); v_row.updated_at:=v_now;
 v_row.verified_by:=case when p_confirm then p_user_id else null end;
 v_row.verified_at:=case when p_confirm then v_now else null end;
 insert into private.occasions select (v_row).*
 on conflict(id) do update set
  date_start=excluded.date_start,date_end=excluded.date_end,estimated_date=excluded.estimated_date,
  name_zh=excluded.name_zh,name_en=excluded.name_en,category=excluded.category,
  location_or_audience=excluded.location_or_audience,flower_demand=excluded.flower_demand,
  typical_products=excluded.typical_products,order_lead_days=excluded.order_lead_days,
  recurrence=excluded.recurrence,date_status=excluded.date_status,confidence=excluded.confidence,
  past_2024=excluded.past_2024,past_2025=excluded.past_2025,source_url=excluded.source_url,evidence=excluded.evidence,
  verified_by=excluded.verified_by,verified_at=excluded.verified_at,updated_at=excluded.updated_at
 returning * into v_row;
 return v_row;
end $$;
revoke all on function private.occasion_write(uuid,jsonb,uuid,boolean,boolean) from public,anon,authenticated,service_role;

create function public.occasion_list_internal(p_user_id uuid,p_role text default 'agent')
returns jsonb language plpgsql stable security definer set search_path=''
as $$ begin
 if p_role='owner' then perform private.occasion_require_owner(p_user_id);
 elsif p_role='agent' then perform private.occasion_require_agent(p_user_id);
 else raise exception 'forbidden' using errcode='42501'; end if;
 return jsonb_build_object(
  'occasions',coalesce((select jsonb_agg(to_jsonb(o) order by coalesce(o.date_start,o.estimated_date),o.name_en,o.id) from private.occasions o),'[]'::jsonb),
  'verifications',coalesce((select jsonb_agg(to_jsonb(v) order by v.created_at desc,v.id) from private.occasion_verifications v where p_role='owner' or v.submitted_by=p_user_id),'[]'::jsonb));
end $$;

create function public.occasion_verification_submit_internal(p_user_id uuid,p_submission jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_row private.occasion_verifications; v_key text; v_value jsonb; v_text text; v_date date;
begin
 perform private.occasion_require_agent(p_user_id);
 if jsonb_typeof(p_submission) is distinct from 'object' or not(p_submission ?& array['occasion_id','proposed_date_start','proposed_date_end','proof_url','note']) then raise exception 'occasion_invalid_request'; end if;
 for v_key,v_value in select * from jsonb_each(p_submission) loop
  if v_key not in ('occasion_id','proposed_date_start','proposed_date_end','proof_url','note') then raise exception 'occasion_invalid_request'; end if;
  if v_key in ('proposed_date_start','proposed_date_end') then
   if v_key='proposed_date_end' and v_value='null'::jsonb then continue; end if;
   v_text:=p_submission->>v_key;
   if jsonb_typeof(v_value)<>'string' or v_text!~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'occasion_invalid_request'; end if;
   begin v_date:=v_text::date;
    if v_date not between date '0001-01-01' and date '9999-12-31' or to_char(v_date,'YYYY-MM-DD')<>v_text then raise exception 'occasion_invalid_request'; end if;
   exception when others then raise exception 'occasion_invalid_request'; end;
  elsif v_key='proof_url' and v_value='null'::jsonb then continue;
  elsif jsonb_typeof(v_value)<>'string' then raise exception 'occasion_invalid_request'; end if;
 end loop;
 if p_submission->>'occasion_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  or char_length(p_submission->>'note')>5000 or not private.occasion_url_valid(p_submission->>'proof_url')
  or ((p_submission->>'proposed_date_end')::date<(p_submission->>'proposed_date_start')::date)
 then raise exception 'occasion_invalid_request'; end if;
 -- Serialize submission with owner writes; created_at then describes the version observed.
 perform 1 from private.occasions where id=(p_submission->>'occasion_id')::uuid for share;
 if not found then raise exception 'occasion_not_found' using errcode='P0002'; end if;
 insert into private.occasion_verifications(occasion_id,submitted_by,proposed_date_start,proposed_date_end,proof_url,note)
 values((p_submission->>'occasion_id')::uuid,p_user_id,(p_submission->>'proposed_date_start')::date,(p_submission->>'proposed_date_end')::date,p_submission->>'proof_url',p_submission->>'note') returning * into v_row;
 return jsonb_build_object('verification',to_jsonb(v_row));
end $$;

create function public.occasion_stock_eligibility_internal(p_user_id uuid,p_occasion_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$ declare v_row private.occasions; v_allowed boolean; begin
 if not exists(select 1 from private.user_roles where user_id=p_user_id and role='owner') then perform private.occasion_require_agent(p_user_id); end if;
 select * into v_row from private.occasions where id=p_occasion_id;
 if not found then raise exception 'occasion_not_found' using errcode='P0002'; end if;
 v_allowed:=v_row.date_status='confirmed' and v_row.date_start is not null and v_row.verified_at is not null and v_row.verified_by is not null and exists(select 1 from private.user_roles where user_id=v_row.verified_by and role='owner');
 return jsonb_build_object('allowed',v_allowed,'reasonKey',case when v_allowed then 'lockAllowed' when v_row.date_status='not_found' then 'lockBlockedNotFound' else 'lockBlockedPattern' end);
end $$;

create function public.occasion_upsert_internal(p_user_id uuid,p_occasion jsonb,p_id uuid default null,p_confirm boolean default false)
returns jsonb language plpgsql security definer set search_path=''
as $$ declare v_row private.occasions; begin
 v_row:=private.occasion_write(p_user_id,p_occasion,p_id,p_confirm,false);
 return jsonb_build_object('occasion',to_jsonb(v_row));
end $$;

create function public.occasion_verification_review_internal(p_user_id uuid,p_verification_id uuid,p_decision text)
returns jsonb language plpgsql security definer set search_path=''
as $$ declare v_row private.occasion_verifications; v_occasion private.occasions; v_now timestamptz; begin
 perform private.occasion_require_owner(p_user_id);
 if p_decision is null or p_decision not in ('approved','rejected') then raise exception 'occasion_invalid_request'; end if;
 select * into v_row from private.occasion_verifications where id=p_verification_id for update;
 if not found then raise exception 'occasion_verification_not_found' using errcode='P0002'; end if;
 if v_row.status<>'pending' then raise exception 'occasion_verification_already_reviewed' using errcode='P0001'; end if;
 select * into v_occasion from private.occasions where id=v_row.occasion_id for update;
 if not found then raise exception 'occasion_not_found' using errcode='P0002'; end if;
 if p_decision='approved' and v_occasion.updated_at>v_row.created_at then raise exception 'occasion_verification_stale' using errcode='P0001'; end if;
 v_now:=clock_timestamp();
 update private.occasion_verifications set status=p_decision,reviewed_by=p_user_id,reviewed_at=v_now where id=v_row.id returning * into v_row;
 if p_decision='approved' then
  update private.occasions set date_start=v_row.proposed_date_start,date_end=v_row.proposed_date_end,
   date_status='confirmed',confidence='high',source_url=coalesce(v_row.proof_url,source_url),
   evidence=coalesce(nullif(trim(v_row.note),''),evidence),verified_by=p_user_id,verified_at=v_now,updated_at=v_now
  where id=v_row.occasion_id returning * into v_occasion;
 end if;
 return jsonb_build_object('verification',to_jsonb(v_row),'occasion',to_jsonb(v_occasion));
end $$;

create function public.occasion_import_internal(p_user_id uuid,p_records jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_record jsonb; v_input jsonb; v_row private.occasions; v_id uuid; v_key text; v_text text; v_seen uuid[]:='{}'; v_count integer:=0; v_needs boolean;
begin
 perform private.occasion_require_owner(p_user_id);
 if jsonb_typeof(p_records) is distinct from 'array' then raise exception 'occasion_invalid_request'; end if;
 if jsonb_array_length(p_records) not between 1 and 200 or octet_length(p_records::text)>2097152 then raise exception 'occasion_invalid_request'; end if;
 for v_record in select value from jsonb_array_elements(p_records) loop
  if jsonb_typeof(v_record) is distinct from 'object' or jsonb_typeof(v_record->'needs_owner_confirm') is distinct from 'boolean' then raise exception 'occasion_invalid_request'; end if;
  for v_key in select jsonb_object_keys(v_record) loop
   if v_key not in ('id','date_start','date_end','estimated_date','name_zh','name_en','category','location_or_audience','flower_demand','typical_products','order_lead_days','recurrence','date_status','confidence','past_2024','past_2025','source_url','evidence','verified_by','verified_at','created_at','updated_at','needs_owner_confirm') then raise exception 'occasion_invalid_request'; end if;
   if v_key in ('id','verified_by') and v_record->v_key<>'null'::jsonb then
    if jsonb_typeof(v_record->v_key)<>'string' or v_record->>v_key!~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'occasion_invalid_request'; end if;
   elsif v_key in ('verified_at','created_at','updated_at') and v_record->v_key<>'null'::jsonb then
    v_text:=v_record->>v_key;
    if jsonb_typeof(v_record->v_key)<>'string' or v_text!~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$' then raise exception 'occasion_invalid_request'; end if;
    begin perform v_text::timestamptz; exception when others then raise exception 'occasion_invalid_request'; end;
   end if;
  end loop;
  if v_record ? 'id' and v_record->'id'='null'::jsonb then raise exception 'occasion_invalid_request'; end if;
  v_id:=(v_record->>'id')::uuid;
  if v_id=any(v_seen) then raise exception 'occasion_invalid_request'; end if;
  if v_id is not null then v_seen:=array_append(v_seen,v_id); end if;
  v_needs:=(v_record->>'needs_owner_confirm')::boolean;
  v_input:=private.occasion_validate_input(v_record-array['id','verified_by','verified_at','created_at','updated_at','needs_owner_confirm']);
  if v_needs then
   v_input:=v_input||jsonb_build_object('estimated_date',coalesce(v_input->>'estimated_date',v_input->>'date_start'),'date_start',null,'date_end',null,'date_status',case when coalesce(v_input->>'estimated_date',v_input->>'date_start') is null then 'not_found' else 'pattern' end);
  end if;
  v_row:=private.occasion_write(p_user_id,v_input,v_id,not v_needs and v_input->>'date_status'='confirmed',true);
  v_count:=v_count+1;
 end loop;
 return jsonb_build_object('imported',v_count);
end $$;

revoke all on function public.occasion_list_internal(uuid,text),public.occasion_verification_submit_internal(uuid,jsonb),public.occasion_stock_eligibility_internal(uuid,uuid),public.occasion_upsert_internal(uuid,jsonb,uuid,boolean),public.occasion_verification_review_internal(uuid,uuid,text),public.occasion_import_internal(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.occasion_list_internal(uuid,text),public.occasion_verification_submit_internal(uuid,jsonb),public.occasion_stock_eligibility_internal(uuid,uuid),public.occasion_upsert_internal(uuid,jsonb,uuid,boolean),public.occasion_verification_review_internal(uuid,uuid,text),public.occasion_import_internal(uuid,jsonb) to service_role;
