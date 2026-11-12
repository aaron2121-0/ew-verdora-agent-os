-- Applied live as migration secure_agent_auth_invite_consume.
-- Atomically consumes one Agent access link. Service-role only.

create or replace function public.consume_agent_auth_invite_internal(
  p_email text,
  p_code_hash text
)
returns table(invite_id uuid, invite_email text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.agent_auth_invites
     set used_at = now()
   where lower(email) = lower(trim(p_email))
     and code_hash = p_code_hash
     and used_at is null
     and expires_at > now()
  returning id, email;
end;
$$;

revoke all on function public.consume_agent_auth_invite_internal(text,text) from public, anon, authenticated;
grant execute on function public.consume_agent_auth_invite_internal(text,text) to service_role;
