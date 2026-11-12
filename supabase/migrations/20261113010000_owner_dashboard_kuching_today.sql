-- Applied live by Claude on 2026-11-13: owner dashboard "orders/revenue today" now uses the Asia/Kuching business day.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.owner_dashboard_internal(uuid)'::regprocedure);
  if position('o.created_at::date=current_date' in d) > 0 then
    d := replace(d, 'o.created_at::date=current_date', 'timezone(''Asia/Kuching'',o.created_at)::date=timezone(''Asia/Kuching'',now())::date');
    execute d;
  end if;
end $$;
