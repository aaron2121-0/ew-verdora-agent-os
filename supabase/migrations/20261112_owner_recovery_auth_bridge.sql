-- Applied live as migration owner_recovery_auth_bridge.
-- Creates hash-only, one-time Owner recovery links. Service-role only.

create table if not exists public.owner_auth_invites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.owner_auth_invites enable row level security;

revoke all on table public.owner_auth_invites from public, anon, authenticated;
grant select, insert, update, delete on table public.owner_auth_invites to service_role;

create index if not exists idx_owner_auth_invites_user on public.owner_auth_invites(user_id);
create index if not exists idx_owner_auth_invites_expiry
  on public.owner_auth_invites(expires_at)
  where used_at is null;

create or replace function public.consume_owner_auth_invite_internal(
  p_code_hash text
)
returns table(invite_id uuid, owner_user_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.owner_auth_invites
     set used_at = now()
   where code_hash = p_code_hash
     and used_at is null
     and expires_at > now()
  returning id, user_id;
end;
$$;

revoke all on function public.consume_owner_auth_invite_internal(text) from public, anon, authenticated;
grant execute on function public.consume_owner_auth_invite_internal(text) to service_role;
