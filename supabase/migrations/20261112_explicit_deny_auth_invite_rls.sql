-- Explicit deny-all RLS policies for one-time auth invite tables.
-- Service-role access remains via grants; client roles have no table grants.

drop policy if exists agent_auth_invites_deny_all on public.agent_auth_invites;
create policy agent_auth_invites_deny_all
on public.agent_auth_invites
for all
to public
using (false)
with check (false);

drop policy if exists owner_auth_invites_deny_all on public.owner_auth_invites;
create policy owner_auth_invites_deny_all
on public.owner_auth_invites
for all
to public
using (false)
with check (false);
