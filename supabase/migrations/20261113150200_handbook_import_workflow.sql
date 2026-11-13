-- Handbook import workflow; applies AFTER base Phase A and the separate faq enum migration.
-- Not deployed until Owner/Claude approval. No modification of commercial/commission logic.

create table if not exists public.handbook_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_version text not null check(length(btrim(source_version)) between 1 and 120),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  inserted_count integer not null default 0 check(inserted_count>=0),
  updated_count integer not null default 0 check(updated_count>=0),
  unchanged_count integer not null default 0 check(unchanged_count>=0),
  status text not null default 'pending' check(status in ('pending','partial','reviewed')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);
alter table public.handbook_import_batches enable row level security;
revoke all on public.handbook_import_batches from public,anon,authenticated;
grant select,insert,update,delete on public.handbook_import_batches to service_role;
-- No client RLS policies. All access via role-checked Owner Edge Function.

alter table public.company_knowledge
  add column if not exists code text unique,
  add column if not exists kind text not null default 'seed',
  add column if not exists product_line public.portfolio_product_line,
  add column if not exists key_points_en jsonb not null default '[]'::jsonb,
  add column if not exists key_points_zh jsonb not null default '[]'::jsonb,
  add column if not exists icon_hint text,
  add column if not exists import_batch_id uuid references public.handbook_import_batches(id);

alter table public.company_knowledge
  add constraint company_knowledge_kind_check
  check(kind in ('card','script','faq','seed'));
alter table public.company_knowledge
  add constraint company_knowledge_code_check
  check((kind='seed' and code is null) or
        (kind<>'seed' and code ~ '^[A-Z][A-Z0-9-]{1,63}$'));
alter table public.company_knowledge
  add constraint company_knowledge_key_points_check
  check(jsonb_typeof(key_points_en)='array' and jsonb_typeof(key_points_zh)='array'
    and (kind<>'card' or (jsonb_array_length(key_points_en)=3 and jsonb_array_length(key_points_zh)=3)));
alter table public.company_knowledge
  add constraint company_knowledge_kind_section_check
  check((kind='seed') or (kind='card' and section='product_line') or
        (kind='script' and section='script') or (kind='faq' and section='faq'));

create index if not exists company_knowledge_batch_review_idx
  on public.company_knowledge(import_batch_id,product_line,sort) where needs_owner_confirm=true;
create index if not exists company_knowledge_visible_product_idx
  on public.company_knowledge(section,product_line,sort)
  where active=true and visible_to_agent=true and needs_owner_confirm=false;

-- RPCs are used exclusively through service_role. They are not callable by browser sessions.
-- All modifications and their audit events commit or roll back together.

create or replace function public.handbook_import_internal(
  p_user_id uuid, p_source_version text, p_entries jsonb
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_batch uuid;
  v_row record;
  v_before public.company_knowledge%rowtype;
  v_existing boolean;
  v_affected integer;
  v_new integer:=0;
  v_updated integer:=0;
  v_unchanged integer:=0;
  v_seen integer:=0;
begin
  if not exists(select 1 from private.user_roles where user_id=p_user_id and role='owner')
    then raise exception 'forbidden' using errcode='42501'; end if;
  if p_source_version is null or length(btrim(p_source_version)) not between 1 and 120
    then raise exception 'invalid_source_version'; end if;
  if jsonb_typeof(p_entries) is distinct from 'array'
    or jsonb_array_length(p_entries) not between 1 and 300
    then raise exception 'invalid_handbook_entries'; end if;

  -- Serializes imports so code-key upserts are idempotent under concurrent requests.
  perform pg_catalog.pg_advisory_xact_lock(814613,20261113);
  insert into public.handbook_import_batches(source_version,created_by)
    values(p_source_version,p_user_id) returning id into v_batch;

  for v_row in
    select *
    from pg_catalog.jsonb_to_recordset(p_entries) as e(
      code text,kind text,section text,product_line text,sort integer,
      title_en text,title_zh text,body_en text,body_zh text,
      key_points_en jsonb,key_points_zh jsonb,icon_hint text
    )
  loop
    v_seen:=v_seen+1;
    if v_row.code is null or v_row.kind not in ('card','script','faq')
       or v_row.section not in ('product_line','script','faq')
       or v_row.title_en is null or v_row.title_zh is null
       or v_row.body_en is null or v_row.body_zh is null
       or v_row.key_points_en is null or v_row.key_points_zh is null
       then raise exception 'invalid_handbook_entry'; end if;

    select * into v_before from public.company_knowledge
      where code=v_row.code for update;
    v_existing:=found;
    insert into public.company_knowledge(
      code,kind,section,product_line,sort,title_en,title_zh,body_en,body_zh,
      key_points_en,key_points_zh,icon_hint,import_batch_id,
      active,visible_to_agent,needs_owner_confirm,updated_by,updated_at
    ) values(
      v_row.code,v_row.kind,v_row.section::public.handbook_section,
      v_row.product_line::public.portfolio_product_line,v_row.sort,
      v_row.title_en,v_row.title_zh,v_row.body_en,v_row.body_zh,
      v_row.key_points_en,v_row.key_points_zh,v_row.icon_hint,v_batch,
      false,false,true,p_user_id,now()
    )
    on conflict(code) do update set
      kind=excluded.kind,section=excluded.section,product_line=excluded.product_line,
      sort=excluded.sort,title_en=excluded.title_en,title_zh=excluded.title_zh,
      body_en=excluded.body_en,body_zh=excluded.body_zh,
      key_points_en=excluded.key_points_en,key_points_zh=excluded.key_points_zh,
      icon_hint=excluded.icon_hint,import_batch_id=excluded.import_batch_id,
      active=false,visible_to_agent=false,needs_owner_confirm=true,
      updated_by=p_user_id,updated_at=now()
    where (
      public.company_knowledge.kind,public.company_knowledge.section,
      public.company_knowledge.product_line,public.company_knowledge.sort,
      public.company_knowledge.title_en,public.company_knowledge.title_zh,
      public.company_knowledge.body_en,public.company_knowledge.body_zh,
      public.company_knowledge.key_points_en,public.company_knowledge.key_points_zh,
      public.company_knowledge.icon_hint
    ) is distinct from (
      excluded.kind,excluded.section,excluded.product_line,excluded.sort,
      excluded.title_en,excluded.title_zh,excluded.body_en,excluded.body_zh,
      excluded.key_points_en,excluded.key_points_zh,excluded.icon_hint
    );
    get diagnostics v_affected=row_count;
    if v_affected=0 then
      v_unchanged:=v_unchanged+1;
    elsif v_existing then
      v_updated:=v_updated+1;
    else
      v_new:=v_new+1;
    end if;
  end loop;

  -- No new batch/audit for a byte-equivalent reimport.
  if v_new+v_updated=0 then
    delete from public.handbook_import_batches where id=v_batch;
    return pg_catalog.jsonb_build_object('ok',true,'batch_id',null,
      'inserted',0,'updated',0,'unchanged',v_unchanged,
      'pending_owner_review',false);
  end if;

  update public.handbook_import_batches set
    inserted_count=v_new,updated_count=v_updated,unchanged_count=v_unchanged
  where id=v_batch;

  insert into private.audit_events(
    actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state
  ) values(
    p_user_id,'owner','handbook_import_pending','handbook_batch',v_batch::text,null,
    pg_catalog.jsonb_build_object('batch_id',v_batch,'source_version',p_source_version,
      'inserted',v_new,'updated',v_updated,'unchanged',v_unchanged)
  );

  return pg_catalog.jsonb_build_object('ok',true,'batch_id',v_batch,
    'inserted',v_new,'updated',v_updated,'unchanged',v_unchanged,
    'pending_owner_review',true);
end $$;

create or replace function public.handbook_update_internal(
  p_user_id uuid,p_id uuid,
  p_title_en text,p_title_zh text,p_body_en text,p_body_zh text
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_before public.company_knowledge%rowtype; v_after public.company_knowledge%rowtype;
begin
  if not exists(select 1 from private.user_roles where user_id=p_user_id and role='owner')
    then raise exception 'forbidden' using errcode='42501'; end if;
  if p_title_en is null or length(btrim(p_title_en)) not between 1 and 120
     or p_title_zh is null or length(btrim(p_title_zh)) not between 1 and 120
     or p_body_en is null or length(btrim(p_body_en)) not between 1 and 10000
     or p_body_zh is null or length(btrim(p_body_zh)) not between 1 and 10000
     then raise exception 'invalid_handbook_content'; end if;
  select * into v_before from public.company_knowledge
    where id=p_id and needs_owner_confirm=true for update;
  if not found then raise exception 'handbook_not_pending'; end if;
  if (v_before.title_en,v_before.title_zh,v_before.body_en,v_before.body_zh)
     is not distinct from (btrim(p_title_en),btrim(p_title_zh),btrim(p_body_en),btrim(p_body_zh))
     then return pg_catalog.jsonb_build_object('ok',true,'id',p_id,'unchanged',true); end if;

  update public.company_knowledge set
    title_en=btrim(p_title_en),title_zh=btrim(p_title_zh),
    body_en=btrim(p_body_en),body_zh=btrim(p_body_zh),
    active=false,visible_to_agent=false,needs_owner_confirm=true,
    updated_by=p_user_id,updated_at=now()
  where id=p_id and needs_owner_confirm=true returning * into v_after;

  insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state)
  values(p_user_id,'owner','handbook_pending_edit','handbook_batch',
    coalesce(v_before.import_batch_id::text,p_id::text),
    pg_catalog.jsonb_build_object('id',p_id,'title_en',v_before.title_en,'title_zh',v_before.title_zh,
      'body_en',v_before.body_en,'body_zh',v_before.body_zh),
    pg_catalog.jsonb_build_object('id',p_id,'title_en',v_after.title_en,'title_zh',v_after.title_zh,
      'body_en',v_after.body_en,'body_zh',v_after.body_zh));
  return pg_catalog.jsonb_build_object('ok',true,'id',p_id,'unchanged',false);
end $$;

create or replace function public.handbook_review_item_internal(
  p_user_id uuid,p_id uuid,p_decision text
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_before public.company_knowledge%rowtype; v_approve boolean;
begin
  if not exists(select 1 from private.user_roles where user_id=p_user_id and role='owner')
    then raise exception 'forbidden' using errcode='42501'; end if;
  if p_decision not in ('approve','reject') then raise exception 'invalid_handbook_review'; end if;
  select * into v_before from public.company_knowledge
    where id=p_id and needs_owner_confirm=true for update;
  if not found then raise exception 'handbook_not_pending'; end if;
  v_approve:=p_decision='approve';
  update public.company_knowledge set
    active=v_approve,visible_to_agent=v_approve,needs_owner_confirm=false,
    updated_by=p_user_id,updated_at=now()
  where id=p_id and needs_owner_confirm=true;

  if v_before.import_batch_id is not null then
    update public.handbook_import_batches set
      status=case when exists(select 1 from public.company_knowledge
                  where import_batch_id=v_before.import_batch_id and needs_owner_confirm=true)
               then 'partial' else 'reviewed' end,
      reviewed_by=case when exists(select 1 from public.company_knowledge
                    where import_batch_id=v_before.import_batch_id and needs_owner_confirm=true)
                  then reviewed_by else p_user_id end,
      reviewed_at=case when exists(select 1 from public.company_knowledge
                    where import_batch_id=v_before.import_batch_id and needs_owner_confirm=true)
                  then reviewed_at else now() end
    where id=v_before.import_batch_id;
  end if;

  insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state)
    values(p_user_id,'owner','handbook_'||p_decision,'handbook_batch',
      coalesce(v_before.import_batch_id::text,p_id::text),
      pg_catalog.jsonb_build_object('id',p_id,'pending',true),
      pg_catalog.jsonb_build_object('id',p_id,'approved',v_approve));
  return pg_catalog.jsonb_build_object('ok',true,'id',p_id,'decision',p_decision,'visible_to_agent',v_approve);
end $$;

create or replace function public.handbook_review_batch_internal(
  p_user_id uuid,p_batch_id uuid,p_confirm boolean
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_batch public.handbook_import_batches%rowtype; v_count integer;
begin
  if not exists(select 1 from private.user_roles where user_id=p_user_id and role='owner')
    then raise exception 'forbidden' using errcode='42501'; end if;
  if p_confirm is distinct from true then raise exception 'confirmation_required'; end if;
  select * into v_batch from public.handbook_import_batches
    where id=p_batch_id for update;
  if not found then raise exception 'handbook_batch_not_found'; end if;

  update public.company_knowledge set
    active=true,visible_to_agent=true,needs_owner_confirm=false,
    updated_by=p_user_id,updated_at=now()
  where import_batch_id=p_batch_id and needs_owner_confirm=true;
  get diagnostics v_count=row_count;
  if v_count=0 then raise exception 'handbook_batch_not_pending'; end if;

  update public.handbook_import_batches
    set status='reviewed',reviewed_at=now(),reviewed_by=p_user_id
    where id=p_batch_id;
  insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state)
    values(p_user_id,'owner','handbook_bulk_approved','handbook_batch',p_batch_id::text,
      pg_catalog.jsonb_build_object('status',v_batch.status),
      pg_catalog.jsonb_build_object('status','reviewed','approved_count',v_count));
  return pg_catalog.jsonb_build_object('ok',true,'batch_id',p_batch_id,'approved',v_count);
end $$;

revoke all on function public.handbook_import_internal(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.handbook_update_internal(uuid,uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.handbook_review_item_internal(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.handbook_review_batch_internal(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.handbook_import_internal(uuid,text,jsonb) to service_role;
grant execute on function public.handbook_update_internal(uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.handbook_review_item_internal(uuid,uuid,text) to service_role;
grant execute on function public.handbook_review_batch_internal(uuid,uuid,boolean) to service_role;
