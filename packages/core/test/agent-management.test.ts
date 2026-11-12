import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_RULES } from '../src/config/rules';
import { auditMessage, enforce } from '../src/engine/audit';
import { diagnoseFunnel, performanceScore } from '../src/engine/kpi';
import { applyDormancy, canSell, dormancyStage, gradeExam, transition } from '../src/engine/lifecycle';
import { buildMission, rankChannels } from '../src/engine/mission';
import { evaluateQuote } from '../src/engine/profitGuard';
import { assertAgentAccess, assertAgentSafe, canAccessAgentData, findInternalKeys, ForbiddenError, toAgentQuoteView } from '../src/engine/visibility';
import { rm } from '../src/money';

const rules = DEFAULT_RULES;
const kinds = (text: string, approvedRm: number | null = null, customerRm: number[] = []): string[] =>
  auditMessage(text, { approvedQuoteSen: approvedRm === null ? null : rm(approvedRm), customerStatedSen: customerRm.map(rm) }).map((f) => f.kind);

test('audit: agent attempts an unauthorized price', () => {
  assert.deepEqual(kinds('Can, I do for you RM250 only', 300), ['UNAUTHORIZED_PRICE']);
  assert.deepEqual(kinds('This bouquet is RM280', null), ['UNAUTHORIZED_PRICE']);
  assert.deepEqual(kinds('The official quote is RM300.', 300), []);
  assert.deepEqual(kinds('Noted your budget is RM200, I will request the official quote.', null, [200]), []);
});

test('audit: agent offers an unauthorized discount', () => {
  assert.deepEqual(kinds('Friend price for you, I give you discount'), ['UNAUTHORIZED_DISCOUNT']);
  assert.deepEqual(kinds('我给你打8折'), ['UNAUTHORIZED_DISCOUNT']);
});

test('audit: agent promises exact reproduction, in English and 中文', () => {
  assert.deepEqual(kinds('Sure, 100% same as the photo'), ['EXACT_REPRODUCTION_PROMISE']);
  assert.deepEqual(kinds('We will make the exact same bouquet'), ['EXACT_REPRODUCTION_PROMISE']);
  assert.deepEqual(kinds('可以的，保证一模一样'), ['EXACT_REPRODUCTION_PROMISE']);
  // Correctly refusing an exact copy is not a violation.
  assert.deepEqual(kinds('We cannot promise 100% same, the design will be similar / adapted.'), []);
  assert.deepEqual(kinds('我们不能保证一模一样，会做相似的款式'), []);
});

test('audit: personal payment instruction gets a warning first, then goes to the Owner', () => {
  assert.deepEqual(kinds('You can transfer to my account'), ['PERSONAL_PAYMENT_INSTRUCTION']);
  assert.deepEqual(kinds('直接转给我就可以'), ['PERSONAL_PAYMENT_INSTRUCTION']);
  assert.deepEqual(kinds('Please pay using the official EW VERDORA payment link'), []);

  const first = enforce('PERSONAL_PAYMENT_INSTRUCTION', { priorInWindow: 0, priorPersonalPaymentInWindow: 0 }, rules);
  assert.equal(first.action, 'WARN');
  assert.equal(first.routine, true);
  const second = enforce('PERSONAL_PAYMENT_INSTRUCTION', { priorInWindow: 1, priorPersonalPaymentInWindow: 1 }, rules);
  assert.equal(second.action, 'OWNER_EXCEPTION');
  assert.equal(second.routine, false);
  assert.equal(second.recommendedOwnerAction, 'TEMPORARY_FREEZE');
});

test('audit: routine ladder is WARN → MICRO TRAINING → TEMP RESTRICTION with no Owner', () => {
  const steps = [0, 1, 2].map((n) => enforce('EXACT_REPRODUCTION_PROMISE', { priorInWindow: n, priorPersonalPaymentInWindow: 0 }, rules));
  assert.deepEqual(steps.map((s) => s.action), ['WARN', 'MICRO_TRAINING', 'TEMP_RESTRICTION']);
  assert.ok(steps.every((s) => s.routine));
  assert.equal(steps[1]?.trainingModule, 'reference-promise-compliance');
  assert.equal(steps[2]?.recoveryTaskRequired, true);
});

test('audit: internal information leak is detected', () => {
  assert.deepEqual(kinds('Our supplier charges us less so I can help'), ['INTERNAL_INFO_LEAK']);
});

test('lifecycle: register → train → exam → certified without Owner approval', () => {
  let s = transition('REGISTERED', 'PROFILE_SUBMITTED', 'AGENT');
  s = transition(s, 'TRAINING_STARTED', 'AGENT');
  s = transition(s, 'CORE_TRAINING_COMPLETED', 'SYSTEM');
  const exam = gradeExam({ requirementDiscovery: 18, customerHandling: 17, closingAbility: 16, pricingDiscipline: 18, policyCompliance: 19 }, rules);
  assert.equal(exam.passed, true);
  s = transition(s, exam.event, 'SYSTEM');
  assert.equal(s, 'ACTIVE');
  assert.equal(canSell(s), true);
});

test('lifecycle: failed exam assigns targeted retraining and allows a retry', () => {
  const exam = gradeExam({ requirementDiscovery: 10, customerHandling: 16, closingAbility: 9, pricingDiscipline: 18, policyCompliance: 17 }, rules);
  assert.equal(exam.total, 70);
  assert.equal(exam.passed, false);
  assert.deepEqual(exam.assignedModules, ['requirement-discovery', 'objection-handling']);
  let s = transition('EXAM_READY', exam.event, 'SYSTEM');
  assert.equal(s, 'RETRAINING');
  s = transition(s, 'RETRAINING_COMPLETED', 'SYSTEM');
  assert.equal(s, 'EXAM_READY');
});

test('lifecycle: scores are clamped and an Agent cannot self-certify or self-unfreeze', () => {
  assert.equal(gradeExam({ requirementDiscovery: 99, customerHandling: 99, closingAbility: 99, pricingDiscipline: 99, policyCompliance: Number.NaN }, rules).total, 80);
  assert.throws(() => transition('EXAM_READY', 'EXAM_PASSED', 'AGENT'));
  assert.throws(() => transition('FROZEN', 'OWNER_UNFROZE', 'SYSTEM'));
  assert.throws(() => transition('REGISTERED', 'EXAM_PASSED', 'SYSTEM'), /Invalid transition/);
});

test('dormancy: agent goes dormant, then completes recovery and is restored', () => {
  assert.equal(dormancyStage(1, rules), 'NONE');
  assert.equal(dormancyStage(2, rules), 'RESTART_MISSION');
  assert.equal(dormancyStage(6, rules), 'RECOVERY_MISSION');
  assert.equal(dormancyStage(12, rules), 'REACTIVATION_TRAINING');
  const dormant = applyDormancy('ACTIVE', 21, rules);
  assert.equal(dormant.status, 'DORMANT');
  assert.equal(canSell(dormant.status), false);
  assert.equal(transition(dormant.status, 'RECOVERY_COMPLETED', 'SYSTEM'), 'ACTIVE');
});

test('restriction: restricted agent is restored by completing the recovery task', () => {
  const restricted = transition('ACTIVE', 'RESTRICTION_APPLIED', 'SYSTEM');
  assert.equal(canSell(restricted), false);
  assert.equal(transition(restricted, 'RECOVERY_COMPLETED', 'SYSTEM'), 'ACTIVE');
});

test('kpi: zero orders is diagnosed, not punished', () => {
  assert.deepEqual(diagnoseFunnel({ conversations: 15, qualifiedLeads: 6, quotes: 5, orders: 0 }, rules), { diagnosis: 'CLOSING_PROBLEM', remedy: 'objection-handling' });
  assert.deepEqual(diagnoseFunnel({ conversations: 2, qualifiedLeads: 0, quotes: 0, orders: 0 }, rules), { diagnosis: 'ACTIVITY_PROBLEM', remedy: 'ACQUISITION_MISSION' });
  assert.equal(diagnoseFunnel({ conversations: 12, qualifiedLeads: 2, quotes: 1, orders: 0 }, rules).diagnosis, 'QUALIFICATION_PROBLEM');
  assert.equal(diagnoseFunnel({ conversations: 6, qualifiedLeads: 3, quotes: 2, orders: 1 }, rules).diagnosis, 'HEALTHY');
});

test('kpi: performance score follows the configured weights', () => {
  const perfect = performanceScore({ completedOrders30d: 30, qualifiedLeads30d: 100, quotes30d: 60, followUpsDue30d: 10, followUpsDone30d: 10, activeDays30d: 22, upheldComplaints30d: 0, violationPoints30d: 0, trainingCompletion: 1 }, rules);
  assert.equal(perfect.score, 100);
  const none = performanceScore({ completedOrders30d: 0, qualifiedLeads30d: 0, quotes30d: 0, followUpsDue30d: 5, followUpsDone30d: 0, activeDays30d: 0, upheldComplaints30d: 0, violationPoints30d: 0, trainingCompletion: 1 }, rules);
  assert.equal(none.score, 20); // quality + compliance only
  const half = performanceScore({ completedOrders30d: 15, qualifiedLeads30d: 50, quotes30d: 75, followUpsDue30d: 10, followUpsDone30d: 5, activeDays30d: 11, upheldComplaints30d: 0, violationPoints30d: 5, trainingCompletion: 1 }, rules);
  assert.equal(half.score, 15 + 7.5 + 7.5 + 5 + 5 + 10 + 5);
});

test('mission: channels are ranked by the agent\'s own conversion', () => {
  const ranked = rankChannels({
    channels: [
      { source: 'INSTAGRAM', leads: 20, quotes: 10, orders: 5 },
      { source: 'PERSONAL_NETWORK', leads: 10, quotes: 8, orders: 6 },
      { source: 'THREADS', leads: 25, quotes: 4, orders: 1 },
    ],
    preferredChannels: [],
    campaignPriority: null,
  }, rules);
  assert.deepEqual(ranked, ['PERSONAL_NETWORK', 'INSTAGRAM']);
});

test('mission: an inactive agent gets more outreach, a weak closer gets follow-ups', () => {
  const base = { agentId: 'a1', date: '2026-11-12', channels: [], preferredChannels: [], pendingFollowUps: 2, dormancy: 'NONE' as const, requiredTrainingModules: [], campaignPriority: null };
  const idle = buildMission({ ...base, recentFunnel: { conversations: 1, qualifiedLeads: 0, quotes: 0, orders: 0 } }, rules);
  assert.equal(idle.focus, 'ACTIVITY_PROBLEM');
  assert.equal(idle.items.find((i) => i.kind === 'WARM_OUTREACH')?.target, 10);
  const closer = buildMission({ ...base, recentFunnel: { conversations: 15, qualifiedLeads: 6, quotes: 5, orders: 0 } }, rules);
  assert.equal(closer.focus, 'CLOSING_PROBLEM');
  assert.equal(closer.items.find((i) => i.kind === 'FOLLOW_UP')?.target, 5);
  const training = buildMission({ ...base, requiredTrainingModules: ['objection-handling'], recentFunnel: { conversations: 6, qualifiedLeads: 3, quotes: 2, orders: 1 } }, rules);
  assert.equal(training.items[0]?.kind, 'TRAINING');
});

test('visibility: agent cannot see another agent\'s data', () => {
  const a1 = { role: 'AGENT' as const, agentId: 'a1' };
  assert.equal(canAccessAgentData(a1, 'a1'), true);
  assert.equal(canAccessAgentData(a1, 'a2'), false);
  assert.throws(() => assertAgentAccess(a1, 'a2'), ForbiddenError);
  assert.equal(canAccessAgentData({ role: 'AGENT', agentId: null }, 'a2'), false);
  assert.equal(canAccessAgentData({ role: 'OWNER', agentId: null }, 'a2'), true);
});

test('visibility: agent cannot access internal cost data', () => {
  const decision = evaluateQuote({ flowerPriceSen: rm(300), deliveryFeeSen: rm(15), procurementCeilingSen: rm(60), commissionRateBps: 700, mode: 'NORMAL' }, rules);
  // The raw decision is internal and is refused at the boundary.
  assert.throws(() => assertAgentSafe(decision), /Internal fields/);
  assert.ok(findInternalKeys({ lead: { quote: { procurement_ceiling_sen: 1, MBC: 2, supplierName: 'x' } } }).length === 3);

  const view = toAgentQuoteView({ quoteId: 'q1', version: 1, flowerPriceSen: rm(300), deliveryFeeSen: rm(15), decision, commissionRateLockedBps: 700 });
  assert.deepEqual(Object.keys(view).sort(), ['commissionRateLockedBps', 'deliveryFeeSen', 'estimatedCommissionSen', 'flowerPriceSen', 'quoteId', 'status', 'totalSen', 'version']);
  assert.equal(view.estimatedCommissionSen, rm(21));

  const blocked = evaluateQuote({ flowerPriceSen: rm(300), deliveryFeeSen: rm(15), procurementCeilingSen: rm(160), commissionRateBps: 700, mode: 'NORMAL' }, rules);
  const blockedView = toAgentQuoteView({ quoteId: 'q2', version: 1, flowerPriceSen: rm(300), deliveryFeeSen: rm(15), decision: blocked, commissionRateLockedBps: 700 });
  assert.equal(blockedView.status, 'NEEDS_REPRICE');
  assert.equal(blockedView.estimatedCommissionSen, null);
  assert.ok(!JSON.stringify(blockedView).includes(String(blocked.minimumFlowerPriceSen)));
});
