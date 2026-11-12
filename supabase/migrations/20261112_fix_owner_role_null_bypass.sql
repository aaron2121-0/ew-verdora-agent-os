-- Applied live as migration fix_owner_role_null_bypass.
-- CRITICAL: SQL NULL made previous "v_role not in (...)" and "<> owner"
-- guards fail open for users with no role row. Make all Owner guards NULL-safe
-- and remove direct client EXECUTE from Owner SECURITY DEFINER functions.

do $$
declare
  r record;
  d text;
begin
  for r in
    select p.oid,p.proname
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prokind='f'
      and p.proname in (
        'owner_dashboard_internal',
        'owner_list_exceptions_internal',
        'owner_decide_exception_internal',
        'owner_add_opex_internal',
        'owner_set_reference_baseline_internal',
        'owner_update_setting_internal'
      )
  loop
    d:=pg_get_functiondef(r.oid);
    d:=replace(
      d,
      'if v_role not in(''owner'',''admin'') then',
      'if coalesce(v_role,'''') not in(''owner'',''admin'') then'
    );
    d:=replace(
      d,
      'if v_role<>''owner'' then',
      'if coalesce(v_role,'''')<>''owner'' then'
    );
    execute d;
  end loop;
end
$$;

revoke all on function public.owner_dashboard_internal(uuid) from public, anon, authenticated;
revoke all on function public.owner_list_exceptions_internal(uuid,integer) from public, anon, authenticated;
revoke all on function public.owner_decide_exception_internal(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.owner_add_opex_internal(uuid,date,text,numeric,text) from public, anon, authenticated;
revoke all on function public.owner_set_reference_baseline_internal(uuid,text,text,text,text,numeric,text) from public, anon, authenticated;
revoke all on function public.owner_update_setting_internal(uuid,text,jsonb) from public, anon, authenticated;

grant execute on function public.owner_dashboard_internal(uuid) to service_role;
grant execute on function public.owner_list_exceptions_internal(uuid,integer) to service_role;
grant execute on function public.owner_decide_exception_internal(uuid,uuid,text) to service_role;
grant execute on function public.owner_add_opex_internal(uuid,date,text,numeric,text) to service_role;
grant execute on function public.owner_set_reference_baseline_internal(uuid,text,text,text,text,numeric,text) to service_role;
grant execute on function public.owner_update_setting_internal(uuid,text,jsonb) to service_role;
