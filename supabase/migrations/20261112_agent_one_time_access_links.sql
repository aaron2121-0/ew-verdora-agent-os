create table if not exists public.agent_auth_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.agent_auth_invites enable row level security;

revoke all on public.agent_auth_invites from anon, authenticated, public;
grant all on public.agent_auth_invites to service_role;

create index if not exists idx_agent_auth_invites_email
  on public.agent_auth_invites (lower(email));

create index if not exists idx_agent_auth_invites_expiry
  on public.agent_auth_invites (expires_at)
  where used_at is null;

create or replace function private.claim_agent_auth_invite(
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

revoke all on function private.claim_agent_auth_invite(text,text) from public, anon, authenticated;
grant execute on function private.claim_agent_auth_invite(text,text) to service_role;
