-- EW VERDORA — allow existing pre-KYC Agents to attach a draft KYC profile.
-- Keeps the existing Agent row/ID intact so leads, orders, commissions and training history stay attached.
-- Validation rules, consent version, upload-token TTL and storage permissions are unchanged.

create or replace function public.agent_kyc_register_internal(
  p_user_id uuid,
  p_display_name text,
  p_language text,
  p_legal_name text,
  p_preferred_name text,
  p_ic_number text,
  p_phone_whatsapp text,
  p_area text,
  p_consent boolean,
  p_consent_version text
)
returns uuid
language plpgsql
security definer
set search_path=''
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

  select a.id into v_agent from public.agents a where a.user_id=p_user_id;
  if exists(select 1 from private.agent_kyc
    where ic_number_hash=v_digest and agent_id is distinct from v_agent) then
    raise exception 'kyc_duplicate_ic';
  end if;

  if v_agent is not null then
    if exists(select 1 from private.agent_kyc where agent_id=v_agent) then
      -- Existing KYC Agents may correct draft/rejected details only.
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
      -- Compatibility path for Agents created before KYC existed.
      -- Reuse the existing Agent ID; never call register_agent_internal again.
      insert into private.agent_kyc(
        agent_id,legal_name,preferred_name,ic_number_enc,ic_number_hash,ic_last4,
        date_of_birth,phone_whatsapp,area,consent_version,consent_at
      ) values (
        v_agent,trim(p_legal_name),trim(p_preferred_name),
        extensions.pgp_sym_encrypt(v_ic,v_key,'cipher-algo=aes256'),
        v_digest,right(v_ic,4),v_dob,v_phone,p_area,p_consent_version,now()
      );

      update public.agents set display_name=trim(p_preferred_name),updated_at=now()
        where id=v_agent;
      update public.profiles set display_name=trim(p_preferred_name),updated_at=now()
        where id=p_user_id;
      insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id)
        values(p_user_id,'agent','kyc_profile_created_for_existing_agent','agent',v_agent::text);
    end if;
  else
    -- New Agent onboarding stays exactly on the existing registration path.
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
end;
$$;

revoke all on function public.agent_kyc_register_internal(
  uuid,text,text,text,text,text,text,text,boolean,text
) from public,anon,authenticated;
grant execute on function public.agent_kyc_register_internal(
  uuid,text,text,text,text,text,text,text,boolean,text
) to service_role;
