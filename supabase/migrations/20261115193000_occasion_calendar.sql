-- Occasion Calendar: event dates are evidence-led; public holidays may be seeded
-- as confirmed, but graduation dates require an approved Owner verification.
-- The authenticated client sees only Agent-readable or Owner-readable records.
create table public.occasions (
  id uuid primary key default gen_random_uuid(),
  date_start date,
  date_end date,
  estimated_date date,
  name_zh text not null check (length(trim(name_zh)) > 0),
  name_en text not null check (length(trim(name_en)) > 0),
  category text not null check (category in ('graduation','festival','cultural','business','wedding','event')),
  location_or_audience text not null check (length(trim(location_or_audience)) > 0),
  flower_demand text not null check (flower_demand in ('high','medium','low')),
  typical_products text[] not null default '{}'::text[],
  order_lead_days integer not null check (order_lead_days between 0 and 365),
  recurrence text not null check (recurrence in ('fixed','lunar','variable')),
  date_status text not null check (date_status in ('confirmed','pattern','not_found')),
  confidence text not null check (confidence in ('high','medium','low')),
  past_2024 text,
  past_2025 text,
  source_url text check (source_url is null or source_url ~ '^https://[^[:space:]]+$'),
  evidence text,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint occasion_confirmed_requires_date_and_high check (
    date_status <> 'confirmed' or (date_start is not null and confidence = 'high')
  ),
  constraint occasion_pattern_requires_estimate check (
    date_status <> 'pattern' or estimated_date is not null
  ),
  constraint occasion_high_only_confirmed check (
    confidence <> 'high' or date_status = 'confirmed'
  ),
  constraint occasion_date_range check (
    date_end is null or (date_start is not null and date_end >= date_start)
  ),
  constraint occasion_verification_metadata_pair check (
    (verified_by is null and verified_at is null)
    or (verified_by is not null and verified_at is not null)
  )
);

create index occasions_date_start_idx on public.occasions(date_start);
create index occasions_estimated_date_idx on public.occasions(estimated_date);
create index occasions_status_demand_idx on public.occasions(date_status,flower_demand);
alter table public.occasions enable row level security;

create table public.occasion_verifications (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references public.occasions(id) on delete cascade,
  submitted_by uuid not null references auth.users(id),
  proposed_date_start date not null,
  proposed_date_end date,
  proof_url text not null check (proof_url ~ '^https://[^[:space:]]+$'),
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint occasion_verification_date_range check (
    proposed_date_end is null or proposed_date_end >= proposed_date_start
  ),
  constraint occasion_verification_review_pair check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status <> 'pending' and reviewed_by is not null and reviewed_at is not null)
  )
);
create index occasion_verifications_occcasion_idx
  on public.occasion_verifications(occasion_id,status,created_at desc);
create index occasion_verifications_submitter_idx
  on public.occasion_verifications(submitted_by,created_at desc);
alter table public.occasion_verifications enable row level security;

-- Privileges and RLS are both required: authenticated Agents are restricted by
-- policies, and never have approval rights. No privileges for anon/public.
revoke all on public.occasions,public.occasion_verifications from public,anon,authenticated;
grant select,insert,update,delete on public.occasions to authenticated;
grant select,insert,update,delete on public.occasion_verifications to authenticated;
grant all on public.occasions,public.occasion_verifications to service_role;

-- Role source is existing private.user_roles / private.is_owner(), not JWT
-- app_metadata or caller-provided role fields.
create policy occasions_agent_read on public.occasions
  for select to authenticated
  using (exists (
    select 1 from public.agents a where a.user_id = (select auth.uid())
  ));
create policy occasions_owner_access on public.occasions
  for all to authenticated
  using (private.is_owner())
  with check (private.is_owner());

create policy occasion_verifications_agent_read on public.occasion_verifications
  for select to authenticated
  using (
    submitted_by = (select auth.uid())
    and exists (select 1 from public.agents a where a.user_id = (select auth.uid()))
  );
create policy occasion_verifications_agent_submit on public.occasion_verifications
  for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null and reviewed_at is null
    and exists (select 1 from public.agents a where a.user_id = (select auth.uid()))
  );
create policy occasion_verifications_owner_access on public.occasion_verifications
  for all to authenticated
  using (private.is_owner())
  with check (private.is_owner());

-- A graduation can be confirmed only when an Owner-approved, matching
-- verification exists. This prevents direct table UPDATE from bypassing review.
create or replace function private.occasion_stamp_and_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.category = 'graduation' and new.date_status = 'confirmed' then
    if new.verified_by is null or new.verified_at is null
      or not exists (
        select 1
        from public.occasion_verifications v
        join private.user_roles r on r.user_id = v.reviewed_by
        where v.occasion_id = new.id and v.status = 'approved'
          and r.role = 'owner'
          and v.reviewed_by = new.verified_by
          and v.proposed_date_start = new.date_start
          and v.proposed_date_end is not distinct from new.date_end
          and v.proof_url = new.source_url
      )
    then
      raise exception 'occasion_graduation_review_required' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger occasion_stamp_guard
before insert or update on public.occasions
for each row execute function private.occasion_stamp_and_guard();
revoke all on function private.occasion_stamp_and_guard() from public,anon,authenticated;

-- Only the trusted service-role Owner Edge Function may call the review RPC.
-- It verifies the JWT first, supplies the authenticated uid and maps errors
-- to safe allowlisted codes. A direct client RPC call is forbidden.
create or replace function public.owner_review_occasion_verification_internal(
  p_user_id uuid, p_verification_id uuid, p_decision text, p_reason text default null
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_role text;
  v_row public.occasion_verifications%rowtype;
  v_before jsonb;
  v_after jsonb;
begin
  select role into v_role from private.user_roles where user_id = p_user_id;
  if v_role is distinct from 'owner' then
    raise exception 'occasion_forbidden' using errcode = '42501';
  end if;
  if p_decision not in ('approve','reject') or p_decision is null then
    raise exception 'occasion_invalid_decision' using errcode = '22023';
  end if;
  if p_decision = 'reject' and length(trim(coalesce(p_reason,''))) < 3 then
    raise exception 'occasion_reject_reason_required' using errcode = '22023';
  end if;

  select * into v_row from public.occasion_verifications
  where id = p_verification_id for update;
  if not found then
    raise exception 'occasion_verification_not_found' using errcode = 'P0002';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'occasion_already_reviewed' using errcode = '23514';
  end if;
  if p_decision = 'reject' then
    update public.occasion_verifications
    set status = 'rejected', reviewed_by = p_user_id, reviewed_at = now(),
        note = concat_ws(E'\n',nullif(note,''),'Owner rejection: ' || trim(p_reason))
    where id = v_row.id;
    insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id,after_state)
    values (p_user_id,'owner','occasion_verification_rejected','occasion_verification',v_row.id::text,
      jsonb_build_object('occasion_id',v_row.occasion_id,'reason',trim(p_reason)));
    return jsonb_build_object('id',v_row.id,'occasion_id',v_row.occasion_id,'status','rejected');
  end if;

  select to_jsonb(o) into v_before
  from public.occasions o where o.id = v_row.occasion_id for update;
  if not found then
    raise exception 'occasion_not_found' using errcode = 'P0002';
  end if;
  -- Update verification first so the graduation trigger can prove this
  -- transaction includes the Owner's approved evidence.
  update public.occasion_verifications
  set status = 'approved', reviewed_by = p_user_id, reviewed_at = now()
  where id = v_row.id;

  update public.occasions set
    date_start = v_row.proposed_date_start,
    date_end = v_row.proposed_date_end,
    estimated_date = null,
    date_status = 'confirmed',
    confidence = 'high',
    source_url = v_row.proof_url,
    evidence = coalesce(nullif(trim(v_row.note),''),'Owner-approved source; date checked manually'),
    verified_by = p_user_id, verified_at = now()
  where id = v_row.occasion_id;

  select to_jsonb(o) into v_after from public.occasions o where o.id = v_row.occasion_id;
  insert into private.audit_events(
    actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state
  ) values (
    p_user_id,'owner','occasion_verification_approved','occasion',v_row.occasion_id::text,
    v_before,v_after
  );
  return jsonb_build_object('id',v_row.id,'occasion_id',v_row.occasion_id,
    'status','approved','date_start',v_row.proposed_date_start,
    'date_end',v_row.proposed_date_end);
end;
$$;
revoke all on function public.owner_review_occasion_verification_internal(uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.owner_review_occasion_verification_internal(uuid,uuid,text,text)
  to service_role;
