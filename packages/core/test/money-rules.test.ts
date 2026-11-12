import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_RULES, parseRules, type Rules } from '../src/config/rules';
import { evaluateBonuses, type BonusFacts } from '../src/engine/bonus';
import { commissionableRevenue, commissionEntry, Ledger, lockQuoteCommission, refundReversalEntry } from '../src/engine/commission';
import { companyNetMargin, evaluateQuote, modePolicy, profitMode } from '../src/engine/profitGuard';
import { evaluateTier, qualifiedTier, type TierFacts } from '../src/engine/tier';
import { applyBps, rm } from '../src/money';

const rules = DEFAULT_RULES;
const now = new Date('2026-11-12T02:00:00Z');
const days = (n: number): Date => new Date(now.getTime() + n * 86_400_000);
const amounts = (flowerRm: number) => ({ flowerRevenueSen: rm(flowerRm), deliveryFeeSen: rm(15), taxSen: rm(8), passThroughSen: rm(20), refundedFlowerSen: 0 });

test('rules: default rule set is valid and bad weights are rejected', () => {
  assert.equal(rules.tiers.length, 4);
  const bad = structuredClone(rules) as Rules;
  bad.kpi.weights.completedOrders = 40;
  assert.throws(() => parseRules(bad), /KPI weights must total 100/);
});

test('commission: only flower revenue is commissionable', () => {
  assert.equal(commissionableRevenue(amounts(300), rules), rm(300));
  assert.equal(commissionableRevenue({ ...amounts(300), refundedFlowerSen: rm(100) }, rules), rm(200));
});

test('commission: quote lock records rule version and rate', () => {
  const lock = lockQuoteCommission({ quoteId: 'q1', quoteVersion: 2, agentId: 'a1', tier: 'ELITE', rules, now });
  assert.equal(lock.commissionRateLockedBps, 1000);
  assert.equal(lock.commissionRuleVersion, rules.version);
  assert.equal(lock.quoteVersion, 2);
  assert.throws(() => {
    (lock as { commissionRateLockedBps: number }).commissionRateLockedBps = 500;
  });
});

test('commission: tier later changes but the old quote keeps its locked rate', () => {
  const lock = lockQuoteCommission({ quoteId: 'q1', quoteVersion: 1, agentId: 'a1', tier: 'ELITE', rules, now });
  // Agent is downgraded and the rule set is edited before the order completes.
  const later = parseRules({ ...structuredClone(rules), version: '2027.01.0', tiers: rules.tiers.map((t) => ({ ...t, rateBps: t.code === 'ELITE' ? 900 : t.rateBps })) });
  const entry = commissionEntry('o1', amounts(500), lock, later);
  assert.equal(entry.amountSen, rm(50));
  assert.equal(entry.rateBps, 1000);
  assert.equal(entry.ruleVersion, rules.version);
});

test('commission: duplicate financial event does not duplicate commission', () => {
  const ledger = new Ledger();
  const lock = lockQuoteCommission({ quoteId: 'q1', quoteVersion: 1, agentId: 'a1', tier: 'ACTIVE', rules, now });
  const entry = commissionEntry('o1', amounts(300), lock, rules);
  assert.equal(ledger.post(entry).posted, true);
  assert.equal(ledger.post(entry).posted, false);
  assert.equal(ledger.post({ ...entry }).posted, false);
  assert.equal(ledger.balance('a1'), rm(21));
  assert.equal(ledger.all().length, 1);
});

test('commission: refund reverses at the locked rate, once', () => {
  const ledger = new Ledger();
  const lock = lockQuoteCommission({ quoteId: 'q1', quoteVersion: 1, agentId: 'a1', tier: 'PRO', rules, now });
  ledger.post(commissionEntry('o1', amounts(400), lock, rules));
  const reversal = refundReversalEntry('o1', 'r1', rm(400), lock);
  ledger.post(reversal);
  ledger.post(reversal);
  assert.equal(ledger.balance('a1'), 0);
});

const facts = (o: Partial<TierFacts>): TierFacts => ({ completedOrders30d: 0, performanceScore: 0, upheldComplaints30d: 0, seriousUnresolvedViolations: 0, ...o });

test('tier: agent qualifies for upgrade and is upgraded automatically', () => {
  const d = evaluateTier({ tier: 'PRO', graceStartedAt: null, recoveryUntil: null }, facts({ completedOrders30d: 46, performanceScore: 92 }), rules, now);
  assert.equal(d.change, 'UPGRADE');
  assert.equal(d.to, 'ELITE');
});

test('tier: agent nearly qualifies for Elite but misses the quality requirement', () => {
  const f = facts({ completedOrders30d: 50, performanceScore: 95, upheldComplaints30d: 3 });
  assert.equal(qualifiedTier(f, rules), 'PRO');
  const d = evaluateTier({ tier: 'PRO', graceStartedAt: null, recoveryUntil: null }, f, rules, now);
  assert.equal(d.change, 'HOLD');
  assert.deepEqual(d.missingForNext, ['quality']);
});

test('tier: serious unresolved violation blocks Elite', () => {
  assert.equal(qualifiedTier(facts({ completedOrders30d: 50, performanceScore: 95, seriousUnresolvedViolations: 1 }), rules), 'PRO');
});

test('tier: downgrade waits for the grace period, then applies with a recovery window', () => {
  const below = facts({ completedOrders30d: 20, performanceScore: 75 });
  const d1 = evaluateTier({ tier: 'PRO', graceStartedAt: null, recoveryUntil: null }, below, rules, now);
  assert.equal(d1.change, 'GRACE_STARTED');
  assert.equal(d1.state.tier, 'PRO');
  const d2 = evaluateTier(d1.state, below, rules, days(3));
  assert.equal(d2.change, 'IN_GRACE');
  const d3 = evaluateTier(d2.state, below, rules, days(8));
  assert.equal(d3.change, 'DOWNGRADE');
  assert.equal(d3.to, 'ACTIVE');
  assert.ok(d3.state.recoveryUntil);
  // Re-qualifying during grace clears it.
  const back = evaluateTier(d1.state, facts({ completedOrders30d: 31, performanceScore: 85 }), rules, days(3));
  assert.equal(back.change, 'HOLD');
  assert.equal(back.state.graceStartedAt, null);
});

test('profit guard: approves a safe quote and blocks an unsafe one', () => {
  const safe = evaluateQuote({ flowerPriceSen: rm(300), deliveryFeeSen: rm(15), procurementCeilingSen: rm(60), commissionRateBps: 700, mode: 'NORMAL' }, rules);
  assert.equal(safe.approved, true);
  const unsafe = evaluateQuote({ flowerPriceSen: rm(300), deliveryFeeSen: rm(15), procurementCeilingSen: rm(140), commissionRateBps: 700, mode: 'NORMAL' }, rules);
  assert.equal(unsafe.approved, false);
  assert.equal(unsafe.reason, 'BELOW_CONTRIBUTION_FLOOR');
  // The floor it reports really is the lowest passing price.
  const atFloor = evaluateQuote({ flowerPriceSen: unsafe.minimumFlowerPriceSen, deliveryFeeSen: rm(15), procurementCeilingSen: rm(140), commissionRateBps: 700, mode: 'NORMAL' }, rules);
  assert.equal(atFloor.approved, true);
  const underFloor = evaluateQuote({ flowerPriceSen: unsafe.minimumFlowerPriceSen - 200, deliveryFeeSen: rm(15), procurementCeilingSen: rm(140), commissionRateBps: 700, mode: 'NORMAL' }, rules);
  assert.equal(underFloor.approved, false);
});

test('profit guard: contribution arithmetic is exact', () => {
  const d = evaluateQuote({ flowerPriceSen: rm(400), deliveryFeeSen: 0, procurementCeilingSen: rm(80), commissionRateBps: 1000, mode: 'NORMAL' }, rules);
  // 400 − 80 − 40 (10%) − 6 (1.5%) − 6 (1.5%) − 8 (2%) − 8 (2%) = 252
  assert.equal(d.contributionSen, rm(252));
  assert.equal(d.contributionMarginBps, 6300);
  assert.equal(d.maximumBuyCostSen, rm(92));
});

test('profit guard: a tighter mode blocks a quote that NORMAL would approve', () => {
  const q = { flowerPriceSen: rm(400), deliveryFeeSen: 0, procurementCeilingSen: rm(88), commissionRateBps: 1000 };
  assert.equal(evaluateQuote({ ...q, mode: 'NORMAL' }, rules).approved, true);
  assert.equal(evaluateQuote({ ...q, mode: 'PROFIT_RECOVERY' }, rules).approved, false);
});

test('profit guard: company net margin drives the mode', () => {
  const w = { revenueSen: rm(100_000), productionCostSen: rm(22_000), commissionSen: rm(8_000), bonusSen: rm(1_000), paymentFeesSen: rm(1_500), refundsSen: rm(1_500), opexSen: rm(10_000) };
  assert.equal(companyNetMargin(w).netMarginBps, 5600);
  assert.equal(profitMode(5600, rules), 'NORMAL');
  assert.equal(profitMode(5200, rules), 'PROTECTION');
  assert.equal(profitMode(4900, rules), 'PROFIT_RECOVERY');
  assert.equal(modePolicy('PROFIT_RECOVERY').discretionaryBonusesPaused, true);
  assert.equal(modePolicy('NORMAL').discretionaryBonusesPaused, false);
});

const bonusFacts = (o: Partial<BonusFacts>): BonusFacts => ({
  agentId: 'a1', periodKey30d: '2026-11', periodKey7d: '2026-W46', completedOrders7d: 0, completedOrders30d: 0,
  upheldComplaints30d: 0, profitVerified: true, mode: 'NORMAL', existing: [], ...o,
});

test('bonus: agent earns a bonus but profit qualification is pending', () => {
  const awards = evaluateBonuses(bonusFacts({ completedOrders30d: 30, upheldComplaints30d: 1, profitVerified: false }), rules);
  assert.deepEqual(awards.map((a) => [a.code, a.amountSen, a.status]), [['ORDERS_30', rm(100), 'PENDING_PROFIT_QUALIFICATION']]);
});

test('bonus: milestones do not stack; a higher milestone pays only the top-up', () => {
  const first = evaluateBonuses(bonusFacts({ completedOrders30d: 46, upheldComplaints30d: 1 }), rules);
  assert.deepEqual(first.map((a) => [a.code, a.amountSen]), [['ORDERS_45', rm(250)]]);
  const paid30 = { key: 'bonus:a1:ORDERS_30:2026-11', code: 'ORDERS_30', amountSen: rm(100) };
  const topUp = evaluateBonuses(bonusFacts({ completedOrders30d: 46, upheldComplaints30d: 1, existing: [paid30] }), rules);
  assert.deepEqual(topUp.map((a) => [a.code, a.amountSen]), [['ORDERS_45', rm(150)]]);
});

test('bonus: evaluating twice never awards twice', () => {
  const f = bonusFacts({ completedOrders30d: 31, completedOrders7d: 7 });
  const first = evaluateBonuses(f, rules);
  assert.deepEqual(first.map((a) => a.code).sort(), ['ORDERS_30', 'STREAK_7_IN_7', 'ZERO_COMPLAINT_30']);
  assert.deepEqual(evaluateBonuses({ ...f, existing: first }, rules), []);
});

test('bonus: profit recovery pauses discretionary bonuses only', () => {
  const awards = evaluateBonuses(bonusFacts({ completedOrders30d: 31, completedOrders7d: 7, mode: 'PROFIT_RECOVERY' }), rules);
  const status = Object.fromEntries(awards.map((a) => [a.code, a.status]));
  assert.equal(status.STREAK_7_IN_7, 'PAUSED_BY_PROFIT_GUARD');
  assert.equal(status.ZERO_COMPLAINT_30, 'PAUSED_BY_PROFIT_GUARD');
  assert.equal(status.ORDERS_30, 'APPROVED');
});

test('money: basis-point rounding', () => {
  assert.equal(applyBps(rm(245), 850), 2083); // RM 20.825 → RM 20.83
  assert.equal(applyBps(0, 1000), 0);
});
