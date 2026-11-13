-- Run only AFTER Claude approves the Phase A migration and it has been applied.
-- Read-only assertions. Expected result: "product_handbook_phase_a PASS".
do $verify$
begin
  if to_regclass('public.company_knowledge') is null
     or to_regclass('public.portfolio_photos') is null then
    raise exception 'product handbook tables missing';
  end if;

  if not (select relrowsecurity from pg_class where oid='public.company_knowledge'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.portfolio_photos'::regclass) then
    raise exception 'RLS is not enabled for both tables';
  end if;

  if has_table_privilege('anon','public.company_knowledge','SELECT')
     or has_table_privilege('authenticated','public.company_knowledge','SELECT')
     or has_table_privilege('authenticated','public.company_knowledge','INSERT')
     or has_table_privilege('authenticated','public.company_knowledge','UPDATE')
     or has_table_privilege('authenticated','public.company_knowledge','DELETE')
     or has_table_privilege('anon','public.portfolio_photos','SELECT')
     or has_table_privilege('authenticated','public.portfolio_photos','SELECT')
     or has_table_privilege('authenticated','public.portfolio_photos','INSERT')
     or has_table_privilege('authenticated','public.portfolio_photos','UPDATE')
     or has_table_privilege('authenticated','public.portfolio_photos','DELETE') then
    raise exception 'a client role has direct access';
  end if;

  if not has_table_privilege('service_role','public.company_knowledge','SELECT')
     or not has_table_privilege('service_role','public.portfolio_photos','UPDATE') then
    raise exception 'service_role cannot read or review';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename in ('company_knowledge','portfolio_photos')
  ) then
    raise exception 'unexpected client-facing RLS policy';
  end if;

  if not exists (
    select 1 from storage.buckets where id='portfolio' and public=false
  ) then
    raise exception 'portfolio bucket missing or public';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
  ) then
    raise exception 'storage.objects has policies: inspect whether any permit access to portfolio';
  end if;

  if (select count(*) from public.company_knowledge where section='product_line')<>5
     or (select count(*) from public.company_knowledge where section='script')<>3 then
    raise exception 'handbook product line or response script seeds incomplete';
  end if;

  if (select count(*) from public.company_knowledge where needs_owner_confirm)=4
     and not exists (
       select 1 from public.company_knowledge
       where needs_owner_confirm and (active or visible_to_agent)
     ) then
    null;
  else
    raise exception 'unconfirmed address or hours must be hidden and inactive';
  end if;

  if exists (
    select 1 from public.company_knowledge
    where needs_owner_confirm and visible_to_agent
  ) then
    raise exception 'Owner-unconfirmed data exposed to agents';
  end if;

  raise notice 'product_handbook_phase_a PASS';
end;
$verify$;
