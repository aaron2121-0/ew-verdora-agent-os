-- Agent identity verification (KYC). No client-side access to raw identity records.
-- Prerequisite BEFORE enabling registration:
-- create two separate random 32+ byte secrets in Supabase Vault named
-- agent_kyc_encryption_key and agent_kyc_hash_key. Never commit their values.
-- Vault access and pgcrypto remain on the privileged database side.
create type private.agent_kyc_status as enum ('draft','submitted','approved','rejected');

create table private.agent_kyc (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null unique references public.agents(id) on delete cascade,
  legal_name text not null check (char_length(legal_name) between 2 and 120),
  preferred_name text not null check (char_length(preferred_name) between 2 and 120),
  ic_number_enc bytea not null,
  ic_number_hash bytea not null,
  ic_last4 text not null check (ic_last4 ~ '^[0-9]{4}$'),
  date_of_birth date not null,
  phone_whatsapp text not null,
  area text not null check (area in (
    'Kuching','Matang','Batu Kawa','Tabuan Jaya','Petra Jaya',
    'Satok','Padawan','Siburan','Samarahan','Other'
  )),
  ic_front_path text,
  status private.agent_kyc_status not null default 'draft',
  reject_reason text,
  consent_version text not null,
  consent_at timestamptz not null,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  delete_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index agent_kyc_ic_hash_unique on private.agent_kyc(ic_number_hash);
create index agent_kyc_status_submitted_idx on private.agent_kyc(status,submitted_at desc);

create table private.agent_kyc_upload_tokens (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  agent_id uuid not null references public.agents(id) on delete cascade,
  object_path text not null unique,
  content_type text not null check (content_type in ('image/jpeg','image/png','image/webp')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index agent_kyc_upload_expiry_idx on private.agent_kyc_upload_tokens(expires_at);
alter table private.agent_kyc enable row level security;
alter table private.agent_kyc_upload_tokens enable row level security;
revoke all on private.agent_kyc,private.agent_kyc_upload_tokens from public,anon,authenticated;
grant all on private.agent_kyc,private.agent_kyc_upload_tokens to service_role;

-- Supabase Storage is PRIVATE; service_role Edge Function is the only uploader.
-- Files are named <agent UUID>/<random UUID>.jpg even for PNG/WebP (correct MIME is kept).
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('agent-kyc','agent-kyc',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set
 public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
-- A RESTRICTIVE policy denies client access even if another broad Storage
-- policy is added later. service_role bypasses RLS for the trusted Edge backend.
create policy agent_kyc_deny_client_objects on storage.objects
  as restrictive for all to anon,authenticated
  using (bucket_id <> 'agent-kyc')
  with check (bucket_id <> 'agent-kyc');

-- Only service_role can call these public RPC entry points. All function
-- callers are Edge Functions which separately verify their caller's JWT.
create or replace function public.agent_kyc_register_internal(
  p_user_id uuid, p_display_name text, p_language text,
  p_legal_name text, p_preferred_name text, p_ic_number text,
  p_phone_whatsapp text, p_area text, p_consent boolean, p_consent_version text
) returns uuid language plpgsql security definer set search_path=''
as $$
declare
  v_ic text;
  v_phone text;
  v_yy int;
  v_y int;
  v_dob date;
  v_key text;
  v_hash_key text;
  v_agent uuid;
  v_digest bytea;
begin
  if p_user_id is null then raise exception 'kyc_auth_required'; end if;
  if p_consent is distinct from true then raise exception 'kyc_consent_required'; end if;
  if p_consent_version is distinct from 'v1.0-2026-11' then raise exception 'kyc_invalid_consent_version'; end if;
  if p_language not in ('zh','en') then raise exception 'kyc_invalid_language'; end if;
  if char_length(trim(coalesce(p_legal_name,''))) not between 2 and 120
    or char_length(trim(coalesce(p_preferred_name,''))) not between 2 and 120
  then raise exception 'kyc_invalid_name'; end if;
  if p_area not in ('Kuching','Matang','Batu Kawa','Tabuan Jaya','Petra Jaya',
      'Satok','Padawan','Siburan','Samarahan','Other')
  then raise exception 'kyc_invalid_area'; end if;
  v_ic:=regexp_replace(coalesce(p_ic_number,''),'[[:space:]-]','','g');
  if v_ic !~ '^[0-9]{12}$' then raise exception 'kyc_invalid_ic_format'; end if;
  v_yy:=substring(v_ic,1,2)::integer;
  v_y:=case when v_yy <= extract(year from timezone('Asia/Kuching',now()))::int % 100
    then 2000+v_yy else 1900+v_yy end;
  begin
    v_dob:=make_date(v_y,substring(v_ic,3,2)::int,substring(v_ic,5,2)::int);
  exception when datetime_field_overflow or invalid_datetime_format then
    raise exception 'kyc_invalid_ic_date';
  end;
  if v_dob > ((timezone('Asia/Kuching',now()))::date - interval '18 years')::date then
    raise exception 'kyc_underage';
  end if;
  v_phone:=regexp_replace(coalesce(p_phone_whatsapp,''),'[[:space:]+()-]','','g');
  if left(v_phone,1)='0' then v_phone:='6'||v_phone; end if;
  if v_phone !~ '^601[0-9]{8,9}$' then raise exception 'kyc_invalid_phone'; end if;

  select decrypted_secret into v_key from vault.decrypted_secrets
    where name='agent_kyc_encryption_key' limit 1;
  select decrypted_secret into v_hash_key from vault.decrypted_secrets
    where name='agent_kyc_hash_key' limit 1;
  if length(coalesce(v_key,''))<32 or length(coalesce(v_hash_key,''))<32
    then raise exception 'kyc_configuration_missing'; end if;
  v_digest:=extensions.hmac(v_ic,v_hash_key,'sha256');

  -- The unique digest is keyed (HMAC), preventing offline NRIC enumeration.
  select a.id into v_agent from public.agents a where a.user_id=p_user_id;
  if exists(select 1 from private.agent_kyc
    where ic_number_hash=v_digest and agent_id is distinct from v_agent) then
    raise exception 'kyc_duplicate_ic';
  end if;

  if v_agent is not null and exists(
    select 1 from private.agent_kyc where agent_id=v_agent
  ) then
    -- Agents may correct draft or rejected details without deleting an account.
    -- A superseded photo remains private until new submission removes it.
    if not exists(select 1 from private.agent_kyc
       where agent_id=v_agent and status in ('draft','rejected')
         and delete_requested_at is null)
    then raise exception 'kyc_already_registered'; end if;
    update private.agent_kyc set legal_name=trim(p_legal_name),
      preferred_name=trim(p_preferred_name),
      ic_number_enc=extensions.pgp_sym_encrypt(v_ic,v_key,'cipher-algo=aes256'),
      ic_number_hash=v_digest,ic_last4=right(v_ic,4),
      date_of_birth=v_dob,phone_whatsapp=v_phone,area=p_area,
      status='draft',reject_reason=null,submitted_at=null,
      reviewed_by=null,reviewed_at=null,consent_version=p_consent_version,
      consent_at=now(),updated_at=now()
    where agent_id=v_agent;
    update public.agents set display_name=trim(p_preferred_name),updated_at=now()
      where id=v_agent;
    update public.profiles set display_name=trim(p_preferred_name),updated_at=now()
      where id=p_user_id;
    insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id)
      values(p_user_id,'agent','kyc_details_corrected','agent',v_agent::text);
  else
    -- Existing onboarding RPC creates initial training and trainee status.
    -- The transaction rolls back if the private identity insert fails.
    v_agent:=public.register_agent_internal(
      p_user_id,trim(p_preferred_name),p_language
    );
    insert into private.agent_kyc(
      agent_id,legal_name,preferred_name,ic_number_enc,ic_number_hash,ic_last4,
      date_of_birth,phone_whatsapp,area,consent_version,consent_at
    ) values (
      v_agent,trim(p_legal_name),trim(p_preferred_name),
      extensions.pgp_sym_encrypt(v_ic,v_key,'cipher-algo=aes256'),
      v_digest,right(v_ic,4),v_dob,v_phone,p_area,p_consent_version,now()
    );
  end if;
  return v_agent;
exception when unique_violation then
  raise exception 'kyc_duplicate_ic';
end $$;

create or replace function public.agent_kyc_status_internal(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v private.agent_kyc;
begin
 select k.* into v from private.agent_kyc k
 join public.agents a on a.id=k.agent_id where a.user_id=p_user_id;
 if not found then
   return jsonb_build_object('status',null,'reject_reason',null,'ic_last4',null,
     'kyc_required',true,'delete_requested',false);
 end if;
 return jsonb_build_object('status',v.status::text,'reject_reason',v.reject_reason,
   'ic_last4',v.ic_last4,'kyc_required',v.status<>'approved',
   'delete_requested',v.delete_requested_at is not null);
end $$;

create or replace function public.agent_kyc_issue_upload_internal(
 p_user_id uuid,p_token_hash text,p_object_path text,p_content_type text
) returns void language plpgsql security definer set search_path=''
as $$
declare v_agent uuid; v_status private.agent_kyc_status;
begin
 select a.id,k.status into v_agent,v_status
 from public.agents a join private.agent_kyc k on k.agent_id=a.id
 where a.user_id=p_user_id and k.delete_requested_at is null for update of k;
 if v_agent is null then raise exception 'kyc_profile_missing'; end if;
 if v_status not in ('draft','rejected') then raise exception 'kyc_upload_not_allowed'; end if;
 if p_content_type not in ('image/jpeg','image/png','image/webp')
   or p_token_hash !~ '^[a-f0-9]{64}$'
   or p_object_path !~ ('^'||v_agent::text||'/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.jpg$')
   then raise exception 'kyc_invalid_upload'; end if;
 insert into private.agent_kyc_upload_tokens(
  agent_id,token_hash,object_path,content_type,expires_at
 ) values(v_agent,p_token_hash,p_object_path,p_content_type,now()+interval '60 seconds');
end $$;

create or replace function public.agent_kyc_consume_upload_internal(
 p_user_id uuid,p_token_hash text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_agent uuid; v_t private.agent_kyc_upload_tokens;
begin
 select id into v_agent from public.agents where user_id=p_user_id;
 update private.agent_kyc_upload_tokens t set used_at=now()
 where t.token_hash=p_token_hash and t.agent_id=v_agent
   and t.used_at is null and t.expires_at>now()
   and exists(select 1 from private.agent_kyc k
       where k.agent_id=v_agent and k.status in ('draft','rejected')
         and k.delete_requested_at is null)
 returning * into v_t;
 if v_t.agent_id is null then raise exception 'kyc_upload_token_invalid'; end if;
 return jsonb_build_object('path',v_t.object_path,'content_type',v_t.content_type);
end $$;

create or replace function public.agent_kyc_submit_internal(
 p_user_id uuid,p_object_path text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_agent uuid; v_k private.agent_kyc; v_old_path text;
begin
 select id into v_agent from public.agents where user_id=p_user_id;
 select * into v_k from private.agent_kyc
 where agent_id=v_agent for update;
 if v_k.agent_id is null then raise exception 'kyc_profile_missing'; end if;
 if v_k.status not in ('draft','rejected') or v_k.delete_requested_at is not null
 then raise exception 'kyc_submit_not_allowed'; end if;
 if p_object_path !~ ('^'||v_agent::text||'/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.jpg$')
 then raise exception 'kyc_invalid_upload'; end if;
 if not exists(select 1 from private.agent_kyc_upload_tokens
   where agent_id=v_agent and object_path=p_object_path and used_at is not null)
 or not exists(select 1 from storage.objects
   where bucket_id='agent-kyc' and name=p_object_path)
 then raise exception 'kyc_photo_missing'; end if;
 v_old_path:=v_k.ic_front_path;
 update private.agent_kyc set ic_front_path=p_object_path,status='submitted',
   submitted_at=now(),reject_reason=null,reviewed_by=null,reviewed_at=null,
   delete_requested_at=null,updated_at=now()
 where agent_id=v_agent;
 return jsonb_build_object('status','submitted','old_path',v_old_path);
end $$;

create or replace function public.agent_kyc_request_delete_internal(p_user_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare v_agent uuid;
begin
 select k.agent_id into v_agent from private.agent_kyc k
 join public.agents a on a.id=k.agent_id where a.user_id=p_user_id for update of k;
 if v_agent is null then raise exception 'kyc_profile_missing'; end if;
 update private.agent_kyc set delete_requested_at=now(),updated_at=now()
 where agent_id=v_agent;
 insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id)
 values(p_user_id,'agent','kyc_delete_requested','agent',v_agent::text);
end $$;

create or replace function public.owner_kyc_list_internal(
 p_user_id uuid,p_status text default 'all',p_limit integer default 50
) returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_rows jsonb;
begin
 if not exists(select 1 from private.user_roles
  where user_id=p_user_id and role in('owner','admin'))
 then raise exception 'forbidden' using errcode='42501'; end if;
 if p_status not in ('all','draft','submitted','approved','rejected')
 then raise exception 'kyc_invalid_status'; end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_rows from (
  select k.agent_id,a.agent_code,k.preferred_name,k.area,
    k.status::text as status,k.ic_last4,k.submitted_at,k.reviewed_at,
    k.delete_requested_at
  from private.agent_kyc k join public.agents a on a.id=k.agent_id
  where p_status='all' or k.status::text=p_status
  order by k.submitted_at desc nulls last,k.created_at desc
  limit least(100,greatest(1,coalesce(p_limit,50)))
 ) x;
 return v_rows;
end $$;

create or replace function public.owner_kyc_view_internal(
 p_user_id uuid,p_agent_id uuid
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_k private.agent_kyc; v_key text; v_ic text;
begin
 if not exists(select 1 from private.user_roles
  where user_id=p_user_id and role in('owner','admin'))
 then raise exception 'forbidden' using errcode='42501'; end if;
 select * into v_k from private.agent_kyc where agent_id=p_agent_id;
 if v_k.agent_id is null then raise exception 'kyc_profile_missing'; end if;
 select decrypted_secret into v_key from vault.decrypted_secrets
   where name='agent_kyc_encryption_key' limit 1;
 if length(coalesce(v_key,''))<32 then raise exception 'kyc_configuration_missing'; end if;
 v_ic:=extensions.pgp_sym_decrypt(v_k.ic_number_enc,v_key);
 -- Audit is committed in the same transaction as disclosure of plaintext.
 -- NEVER store personal details or storage paths in the audit columns.
 insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id)
 values(p_user_id,'owner','kyc_view','agent',p_agent_id::text);
 return jsonb_build_object(
  'agent_id',v_k.agent_id,'legal_name',v_k.legal_name,
  'preferred_name',v_k.preferred_name,'ic_number',v_ic,
  'ic_last4',v_k.ic_last4,'date_of_birth',v_k.date_of_birth,
  'phone_whatsapp',v_k.phone_whatsapp,'area',v_k.area,
  'status',v_k.status::text,'reject_reason',v_k.reject_reason,
  'consent_version',v_k.consent_version,'consent_at',v_k.consent_at,
  'submitted_at',v_k.submitted_at,'reviewed_at',v_k.reviewed_at,
  'delete_requested_at',v_k.delete_requested_at,
  'ic_front_path',v_k.ic_front_path
 );
end $$;

create or replace function public.owner_kyc_review_internal(
 p_user_id uuid,p_agent_id uuid,p_decision text,p_reason text default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_new text;
begin
 if not exists(select 1 from private.user_roles
  where user_id=p_user_id and role in('owner','admin'))
 then raise exception 'forbidden' using errcode='42501'; end if;
 if p_decision not in ('approve','reject') then raise exception 'kyc_invalid_decision'; end if;
 if p_decision='reject' and length(trim(coalesce(p_reason,'')))<3
 then raise exception 'kyc_reject_reason_required'; end if;
 if p_decision='reject' and (coalesce(p_reason,'') ~ '[0-9]{6}-?[0-9]{2}-?[0-9]{4}'
   or lower(coalesce(p_reason,'')) like '%agent-kyc%'
   or lower(coalesce(p_reason,'')) like '%http%')
 then raise exception 'kyc_reject_reason_invalid'; end if;
 update private.agent_kyc set
  status=case when p_decision='approve' then 'approved'::private.agent_kyc_status
    else 'rejected'::private.agent_kyc_status end,
  reject_reason=case when p_decision='reject' then left(trim(p_reason),500) else null end,
  reviewed_by=p_user_id,reviewed_at=now(),updated_at=now()
 where agent_id=p_agent_id and status='submitted'
 returning status::text into v_new;
 if v_new is null then raise exception 'kyc_not_submitted'; end if;
 insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id)
 values(p_user_id,'owner','kyc_'||p_decision,'agent',p_agent_id::text);
 if p_decision='approve' then
   perform public.refresh_agent_certification_internal(p_agent_id);
 end if;
 return jsonb_build_object('status',v_new,'agent_id',p_agent_id);
end $$;


create or replace function public.owner_kyc_delete_ready_internal(
 p_user_id uuid,p_agent_id uuid
) returns boolean language plpgsql stable security definer set search_path=''
as $
begin
 if not exists(select 1 from private.user_roles
  where user_id=p_user_id and role in('owner','admin'))
 then raise exception 'forbidden' using errcode='42501'; end if;
 if not exists(select 1 from private.agent_kyc
  where agent_id=p_agent_id and delete_requested_at is not null)
 then raise exception 'kyc_delete_request_required'; end if;
 return true;
end $;

-- Owner must confirm that every file was removed through Storage API first.
-- This function deletes all KYC details and upload grants; immutable audit survives.
create or replace function public.owner_kyc_delete_internal(
 p_user_id uuid,p_agent_id uuid
) returns void language plpgsql security definer set search_path=''
as $$
begin
 if not exists(select 1 from private.user_roles
  where user_id=p_user_id and role in('owner','admin'))
 then raise exception 'forbidden' using errcode='42501'; end if;
 if not exists(select 1 from private.agent_kyc
   where agent_id=p_agent_id and delete_requested_at is not null)
 then raise exception 'kyc_delete_request_required'; end if;
 delete from private.agent_kyc_upload_tokens where agent_id=p_agent_id;
 delete from private.agent_kyc where agent_id=p_agent_id;
 -- A deleted approval must never continue allowing sales.
 update public.agents set status='trainee',certified_at=null,updated_at=now()
 where id=p_agent_id and status='active';
 insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id)
 values(p_user_id,'owner','kyc_deleted','agent',p_agent_id::text);
end $$;

-- Preserve all pre-existing training/recovery/violation checks, add approval gate.
create or replace function public.refresh_agent_certification_internal(p_agent_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_remaining int;
 v_open_recovery int;
 v_serious int;
 v_exam_passed boolean;
 v_kyc_approved boolean;
 v_status text;
begin
 select count(*) into v_remaining
 from public.training_modules m
 left join public.training_progress p on p.module_id=m.id and p.agent_id=p_agent_id
 where m.required=true and m.active=true and coalesce(p.status,'assigned')<>'passed';
 select count(*) into v_open_recovery from public.recovery_tasks
 where agent_id=p_agent_id and status='active';
 select count(*) into v_serious from public.violations
 where agent_id=p_agent_id and severity in('high','critical')
   and status not in('resolved','dismissed');
 select exists(select 1 from public.training_exam_attempts
   where agent_id=p_agent_id and status='completed' and passed=true) into v_exam_passed;
 select exists(select 1 from private.agent_kyc where agent_id=p_agent_id
   and status='approved') into v_kyc_approved;
 if v_remaining=0 and v_open_recovery=0 and v_serious=0
    and v_exam_passed and v_kyc_approved then
  update public.agents set status='active',
   certified_at=coalesce(certified_at,now()),last_active_at=now(),updated_at=now()
  where id=p_agent_id and status in('trainee','certified','recovery','restricted')
  returning status into v_status;
  update public.violations set status='resolved',resolved_at=now()
  where agent_id=p_agent_id and severity in('low','medium')
    and status in('open','training_assigned','restricted');
 end if;
 if v_status is null then select status into v_status from public.agents where id=p_agent_id; end if;
 return jsonb_build_object(
  'remaining_required',v_remaining,'open_recovery_tasks',v_open_recovery,
  'open_serious_violations',v_serious,'exam_passed',v_exam_passed,
  'kyc_approved',v_kyc_approved,'agent_status',v_status
 );
end $$;

revoke all on function public.agent_kyc_register_internal(uuid,text,text,text,text,text,text,text,boolean,text) from public,anon,authenticated;
revoke all on function public.agent_kyc_status_internal(uuid) from public,anon,authenticated;
revoke all on function public.agent_kyc_issue_upload_internal(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.agent_kyc_consume_upload_internal(uuid,text) from public,anon,authenticated;
revoke all on function public.agent_kyc_submit_internal(uuid,text) from public,anon,authenticated;
revoke all on function public.agent_kyc_request_delete_internal(uuid) from public,anon,authenticated;
revoke all on function public.owner_kyc_list_internal(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.owner_kyc_view_internal(uuid,uuid) from public,anon,authenticated;
revoke all on function public.owner_kyc_review_internal(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.owner_kyc_delete_ready_internal(uuid,uuid) from public,anon,authenticated;
revoke all on function public.owner_kyc_delete_internal(uuid,uuid) from public,anon,authenticated;
revoke all on function public.refresh_agent_certification_internal(uuid) from public,anon,authenticated;
grant execute on function public.agent_kyc_register_internal(uuid,text,text,text,text,text,text,text,boolean,text) to service_role;
grant execute on function public.agent_kyc_status_internal(uuid) to service_role;
grant execute on function public.agent_kyc_issue_upload_internal(uuid,text,text,text) to service_role;
grant execute on function public.agent_kyc_consume_upload_internal(uuid,text) to service_role;
grant execute on function public.agent_kyc_submit_internal(uuid,text) to service_role;
grant execute on function public.agent_kyc_request_delete_internal(uuid) to service_role;
grant execute on function public.owner_kyc_list_internal(uuid,text,integer) to service_role;
grant execute on function public.owner_kyc_view_internal(uuid,uuid) to service_role;
grant execute on function public.owner_kyc_review_internal(uuid,uuid,text,text) to service_role;
grant execute on function public.owner_kyc_delete_ready_internal(uuid,uuid) to service_role;
grant execute on function public.owner_kyc_delete_internal(uuid,uuid) to service_role;
grant execute on function public.refresh_agent_certification_internal(uuid) to service_role;
