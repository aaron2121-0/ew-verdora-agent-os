create or replace function public.owner_role_internal(p_user_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_role text;
begin
 select role into v_role from private.user_roles where user_id=p_user_id;
 if coalesce(v_role,'') not in ('owner','admin') then raise exception 'forbidden' using errcode='42501'; end if;
 return v_role;
end $$;
revoke all on function public.owner_role_internal(uuid) from public,anon,authenticated;
grant execute on function public.owner_role_internal(uuid) to service_role;