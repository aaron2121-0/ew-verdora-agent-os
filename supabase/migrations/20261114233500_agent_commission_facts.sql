-- Read-only, official commission facts for ONE agent, so the AI chat can explain
-- the commission structure instead of deflecting. No company costs or margins.
-- (Applied to production 2026-11-14 via MCP as migration agent_commission_facts.)
create or replace function public.agent_commission_facts_internal(p_agent_id uuid)
returns jsonb language plpgsql stable security definer set search_path to ''
as $$
declare a public.agents; tiers jsonb; settle jsonb; own jsonb;
begin
 select * into a from public.agents where id=p_agent_id;
 if a.id is null then return null; end if;
 select value into tiers from private.system_settings where key='agent_tiers';
 select value into settle from private.system_settings where key='settlement_policy';
 select jsonb_build_object(
   'processing_rm',coalesce(sum(amount) filter (where status in('pending','earned')),0),
   'ready_to_withdraw_rm',coalesce(sum(amount) filter (where status='payable'),0),
   'paid_rm',coalesce(sum(amount) filter (where status='paid'),0),
   'completed_orders',count(*) filter (where status in('earned','payable','paid'))
 ) into own from public.commissions where agent_id=p_agent_id;
 return jsonb_build_object(
   'my_tier',a.tier,'my_commission_rate',a.commission_rate,'my_status',a.status,
   'tiers',jsonb_build_object(
     'starter',tiers->'starter','active',tiers->'active','pro',tiers->'pro','elite',tiers->'elite'),
   'tier_notes','Tier needs BOTH the completed-order count (30 days) and the performance score; downgrade grace '||coalesce(tiers->>'downgrade_grace_days','14')||' days; elite also needs complaint rate <= '||coalesce(tiers->>'elite_max_complaint','0.03'),
   'how_commission_works','Commission = flower price (commissionable revenue, excluding delivery fee) x the rate locked when the quote was made. Earned when the order is completed; held '||coalesce(settle->>'commission_dispute_hours','24')||' hours for disputes, then ready to withdraw; Owner transfers it and marks it paid. Refunds reverse unpaid commission. Campaign bonuses only when an active campaign says so.',
   'my_money',own
 );
end $$;
revoke all on function public.agent_commission_facts_internal(uuid) from public,anon,authenticated;
grant execute on function public.agent_commission_facts_internal(uuid) to service_role;
