import { DEFAULT_RULES, tierRule, type Rules, type TierCode } from '../config/rules';
import { auditMessage, enforce, type EnforcementAction, type ViolationKind } from '../engine/audit';
import { evaluateBonuses, type BonusAward } from '../engine/bonus';
import { commissionEntry, Ledger, lockQuoteCommission } from '../engine/commission';
import { diagnoseFunnel, performanceScore, type Diagnosis, type KpiFacts } from '../engine/kpi';
import { applyDormancy, transition, type AgentStatus, type DormancyStage } from '../engine/lifecycle';
import { buildMission, LEAD_SOURCES, type ChannelStats, type LeadSource } from '../engine/mission';
import { companyNetMargin, evaluateQuote, profitMode, type CompanyWindow, type ProfitMode } from '../engine/profitGuard';
import { evaluateTier, type TierChange } from '../engine/tier';
import { rm, type Sen } from '../money';

/* ---------- Seeded randomness: same seed, same demo ---------- */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Demo agents ---------- */

export type Behaviour =
  | 'LOW_ACTIVITY'
  | 'WEAK_CLOSING'
  | 'POOR_QUALIFICATION'
  | 'STRONG_CLOSING'
  | 'OVERPROMISE_RISK'
  | 'HIGH_CONVERSION'
  | 'STEADY'
  | 'QUALITY_GAP'
  | 'HIGH_PERFORMER'
  | 'OFF_PLATFORM_PAYMENT';

export interface DemoAgent {
  id: string;
  code: string;
  behaviour: Behaviour;
  tier: TierCode;
  daysInactive: number;
  /** Probability of engaging an enquiry, qualifying it, quoting it, closing it. */
  p: { engage: number; qualify: number; quote: number; close: number };
  /** Rolling 30-day history before the demo day. */
  history: KpiFacts;
  channels: ChannelStats[];
}

const hist = (o: Partial<KpiFacts>): KpiFacts => ({
  completedOrders30d: 0,
  qualifiedLeads30d: 0,
  quotes30d: 0,
  followUpsDue30d: 0,
  followUpsDone30d: 0,
  activeDays30d: 0,
  upheldComplaints30d: 0,
  violationPoints30d: 0,
  trainingCompletion: 1,
  ...o,
});

const ch = (source: LeadSource, leads: number, quotes: number, orders: number): ChannelStats => ({ source, leads, quotes, orders });

export const DEMO_AGENTS: readonly DemoAgent[] = [
  { id: 'agent-a01', code: 'A01', behaviour: 'LOW_ACTIVITY', tier: 'STARTER', daysInactive: 6, p: { engage: 0.4, qualify: 0.5, quote: 0.6, close: 0.3 },
    history: hist({ completedOrders30d: 2, qualifiedLeads30d: 9, quotes30d: 6, followUpsDue30d: 20, followUpsDone30d: 6, activeDays30d: 5 }),
    channels: [ch('WHATSAPP', 8, 3, 1), ch('PERSONAL_NETWORK', 6, 3, 1)] },
  { id: 'agent-a02', code: 'A02', behaviour: 'WEAK_CLOSING', tier: 'STARTER', daysInactive: 0, p: { engage: 1, qualify: 0.85, quote: 0.95, close: 0.1 },
    history: hist({ completedOrders30d: 5, qualifiedLeads30d: 70, quotes30d: 55, followUpsDue30d: 60, followUpsDone30d: 30, activeDays30d: 20 }),
    channels: [ch('INSTAGRAM', 60, 40, 3), ch('THREADS', 25, 15, 2)] },
  { id: 'agent-a03', code: 'A03', behaviour: 'POOR_QUALIFICATION', tier: 'STARTER', daysInactive: 0, p: { engage: 1, qualify: 0.25, quote: 0.7, close: 0.4 },
    history: hist({ completedOrders30d: 6, qualifiedLeads30d: 22, quotes30d: 15, followUpsDue30d: 40, followUpsDone30d: 22, activeDays30d: 18 }),
    channels: [ch('FACEBOOK', 70, 10, 4), ch('THREADS', 40, 5, 2)] },
  { id: 'agent-a04', code: 'A04', behaviour: 'STRONG_CLOSING', tier: 'STARTER', daysInactive: 0, p: { engage: 1, qualify: 0.75, quote: 0.9, close: 0.7 },
    history: hist({ completedOrders30d: 14, qualifiedLeads30d: 72, quotes30d: 30, followUpsDue30d: 40, followUpsDone30d: 36, activeDays30d: 21 }),
    channels: [ch('PERSONAL_NETWORK', 30, 20, 9), ch('INSTAGRAM', 30, 10, 5)] },
  { id: 'agent-a05', code: 'A05', behaviour: 'OVERPROMISE_RISK', tier: 'ACTIVE', daysInactive: 0, p: { engage: 1, qualify: 0.7, quote: 0.85, close: 0.45 },
    history: hist({ completedOrders30d: 17, qualifiedLeads30d: 75, quotes30d: 42, followUpsDue30d: 50, followUpsDone30d: 40, activeDays30d: 22 }),
    channels: [ch('INSTAGRAM', 60, 30, 12), ch('XIAOHONGSHU', 20, 12, 5)] },
  { id: 'agent-a06', code: 'A06', behaviour: 'HIGH_CONVERSION', tier: 'ACTIVE', daysInactive: 0, p: { engage: 1, qualify: 0.8, quote: 0.9, close: 0.65 },
    history: hist({ completedOrders30d: 22, qualifiedLeads30d: 80, quotes30d: 40, followUpsDue30d: 50, followUpsDone30d: 46, activeDays30d: 23 }),
    channels: [ch('PERSONAL_NETWORK', 10, 8, 6), ch('INSTAGRAM', 20, 12, 5), ch('THREADS', 25, 6, 1)] },
  { id: 'agent-a07', code: 'A07', behaviour: 'STEADY', tier: 'PRO', daysInactive: 0, p: { engage: 1, qualify: 0.75, quote: 0.85, close: 0.5 },
    history: hist({ completedOrders30d: 31, qualifiedLeads30d: 110, quotes30d: 70, followUpsDue30d: 80, followUpsDone30d: 72, activeDays30d: 25 }),
    channels: [ch('PREVIOUS_CUSTOMER', 30, 25, 14), ch('FACEBOOK', 60, 30, 12)] },
  { id: 'agent-a08', code: 'A08', behaviour: 'QUALITY_GAP', tier: 'PRO', daysInactive: 0, p: { engage: 1, qualify: 0.8, quote: 0.9, close: 0.6 },
    history: hist({ completedOrders30d: 46, qualifiedLeads30d: 140, quotes30d: 95, followUpsDue30d: 90, followUpsDone30d: 88, activeDays30d: 27, upheldComplaints30d: 2 }),
    channels: [ch('CORPORATE_OUTREACH', 30, 25, 15), ch('INSTAGRAM', 80, 50, 25)] },
  { id: 'agent-a09', code: 'A09', behaviour: 'HIGH_PERFORMER', tier: 'ELITE', daysInactive: 0, p: { engage: 1, qualify: 0.85, quote: 0.95, close: 0.7 },
    history: hist({ completedOrders30d: 47, qualifiedLeads30d: 150, quotes30d: 100, followUpsDue30d: 90, followUpsDone30d: 90, activeDays30d: 28 }),
    channels: [ch('REFERRAL', 40, 35, 22), ch('INSTAGRAM', 70, 45, 20)] },
  { id: 'agent-a10', code: 'A10', behaviour: 'OFF_PLATFORM_PAYMENT', tier: 'ACTIVE', daysInactive: 0, p: { engage: 1, qualify: 0.7, quote: 0.8, close: 0.5 },
    history: hist({ completedOrders30d: 16, qualifiedLeads30d: 70, quotes30d: 40, followUpsDue30d: 50, followUpsDone30d: 41, activeDays30d: 22 }),
    channels: [ch('WHATSAPP', 50, 30, 12), ch('FACEBOOK', 30, 10, 4)] },
];

/** What a demo Agent types to the customer on enquiry number `i` (0-based). */
function agentMessage(agent: DemoAgent, i: number, approvedSen: Sen | null): string {
  const priceLine = approvedSen !== null ? `The official quote is RM${approvedSen / 100}.` : 'I will send you the official quote shortly.';
  if (agent.behaviour === 'OVERPROMISE_RISK' && i % 2 === 0) return `Yes can, we will make it 100% same as your photo. ${priceLine}`;
  if (agent.behaviour === 'POOR_QUALIFICATION' && i === 1) return `No problem, I give you discount. ${priceLine}`;
  if (agent.behaviour === 'OFF_PLATFORM_PAYMENT' && (i === 1 || i === 3)) return `${priceLine} You can transfer to my account, faster.`;
  return `Thanks! The design will be similar / adapted to your reference. ${priceLine}`;
}

/* ---------- Result types ---------- */

export interface Situation {
  agentCode: string;
  kind: string;
  handledBy: 'SYSTEM' | 'OWNER';
  detail: string;
}

export interface OwnerException {
  agentCode: string;
  risk: ViolationKind;
  affectedOrders: number;
  evidence: string[];
  recommendedAction: 'TEMPORARY_FREEZE';
}

export interface AgentOutcome {
  code: string;
  behaviour: Behaviour;
  status: AgentStatus;
  dormancy: DormancyStage;
  enquiries: number;
  conversations: number;
  qualified: number;
  quotes: number;
  orders: number;
  commissionSen: Sen;
  score: number;
  tierBefore: TierCode;
  tierAfter: TierCode;
  tierChange: TierChange;
  missingForNext: string[];
  diagnosis: Diagnosis;
  trainingAssigned: string[];
  enforcement: EnforcementAction[];
  bonuses: BonusAward[];
  recommendedChannels: LeadSource[];
}

export interface SimulationResult {
  seed: number;
  ruleVersion: string;
  mode: ProfitMode;
  netMarginBps: number;
  totals: {
    enquiries: number;
    conversations: number;
    qualified: number;
    quotes: number;
    quotesBlockedByProfitGuard: number;
    orders: number;
    flowerRevenueSen: Sen;
    commissionSen: Sen;
    bonusPendingSen: Sen;
    duplicateEventsIgnored: number;
  };
  agents: AgentOutcome[];
  situations: Situation[];
  exceptions: OwnerException[];
  agentsHandledAutomatically: number;
  agentsEscalatedToOwner: number;
}

const BUDGETS_RM = [120, 150, 180, 220, 250, 300, 380, 450, 600, 800];
const DELIVERY_FEE = rm(15);

/** A healthy trailing 30-day company window, so the demo starts in NORMAL. */
export const DEMO_COMPANY_WINDOW: CompanyWindow = {
  revenueSen: rm(62_000),
  productionCostSen: rm(13_500),
  commissionSen: rm(4_900),
  bonusSen: rm(900),
  paymentFeesSen: rm(930),
  refundsSen: rm(700),
  opexSen: rm(6_200),
};

/**
 * One demo day: 10 Agents × 5 enquiries, driven through the real rule
 * engine. Outcomes come from probabilities and the seed, never from
 * hard-coded totals.
 */
export function runSimulation(opts: { seed?: number; rules?: Rules; enquiriesPerAgent?: number; now?: Date; company?: CompanyWindow } = {}): SimulationResult {
  const seed = opts.seed ?? 20261112;
  const rules = opts.rules ?? DEFAULT_RULES;
  const perAgent = opts.enquiriesPerAgent ?? 5;
  const now = opts.now ?? new Date('2026-11-12T10:00:00+08:00');
  const rng = mulberry32(seed);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)] as T;

  const { netMarginBps } = companyNetMargin(opts.company ?? DEMO_COMPANY_WINDOW);
  const mode = profitMode(netMarginBps, rules);

  const ledger = new Ledger();
  const situations: Situation[] = [];
  const exceptions: OwnerException[] = [];
  const agents: AgentOutcome[] = [];
  const totals: SimulationResult['totals'] = {
    enquiries: 0, conversations: 0, qualified: 0, quotes: 0, quotesBlockedByProfitGuard: 0,
    orders: 0, flowerRevenueSen: 0, commissionSen: 0, bonusPendingSen: 0, duplicateEventsIgnored: 0,
  };

  for (const agent of DEMO_AGENTS) {
    let status: AgentStatus = 'ACTIVE';
    const sit = (kind: string, detail: string, handledBy: Situation['handledBy'] = 'SYSTEM'): void => {
      situations.push({ agentCode: agent.code, kind, handledBy, detail });
    };

    // 1. Dormancy check and personalised mission.
    const dorm = applyDormancy(status, agent.daysInactive, rules);
    status = dorm.status;
    if (dorm.stage !== 'NONE') sit('DORMANCY', `${agent.daysInactive} days inactive → ${dorm.stage}`);
    const mission = buildMission({
      agentId: agent.id, date: now.toISOString().slice(0, 10),
      recentFunnel: { conversations: Math.round(agent.history.activeDays30d ? (agent.history.qualifiedLeads30d * 1.5) / agent.history.activeDays30d : 0), qualifiedLeads: Math.round(agent.history.qualifiedLeads30d / Math.max(1, agent.history.activeDays30d)), quotes: Math.round(agent.history.quotes30d / Math.max(1, agent.history.activeDays30d)), orders: Math.round(agent.history.completedOrders30d / Math.max(1, agent.history.activeDays30d)) },
      channels: agent.channels, preferredChannels: [], pendingFollowUps: agent.history.followUpsDue30d - agent.history.followUpsDone30d,
      dormancy: dorm.stage, requiredTrainingModules: [], campaignPriority: null,
    }, rules);
    sit('DAILY_MISSION', `focus ${mission.focus}, channels ${mission.recommendedChannels.join(' + ')}`);

    // 2. Enquiries.
    let conversations = 0, qualified = 0, quotes = 0, orders = 0, violationsToday = 0, personalPaymentToday = 0, pointsToday = 0;
    const enforcement: EnforcementAction[] = [];
    const training = new Set<string>();
    const paymentEvidence: string[] = [];
    let ordersWithPaymentRisk = 0;
    let duplicateTested = false;

    for (let i = 0; i < perAgent; i++) {
      totals.enquiries++;
      const leadId = `${agent.code}-L${i + 1}`;
      pick(LEAD_SOURCES); // lead source (kept in the stream so runs stay reproducible)
      const budgetSen = rm(pick(BUDGETS_RM));
      if (status !== 'ACTIVE' || rng() >= agent.p.engage) continue;
      conversations++;

      let approvedSen: Sen | null = null;
      let lock = null;
      let closeFactor = 1;
      const isQualified = rng() < agent.p.qualify;
      if (isQualified) {
        qualified++;
        if (rng() < agent.p.quote) {
          const procurementCeilingSen = Math.round((budgetSen * (0.14 + rng() * 0.14)) / 100) * 100;
          const rate = tierRule(rules, agent.tier).rateBps;
          let priceSen = budgetSen;
          let decision = evaluateQuote({ flowerPriceSen: priceSen, deliveryFeeSen: DELIVERY_FEE, procurementCeilingSen, commissionRateBps: rate, mode }, rules);
          if (!decision.approved) {
            // Profit Guard blocks the price; the system counter-quotes at the floor.
            totals.quotesBlockedByProfitGuard++;
            priceSen = Math.ceil(decision.minimumFlowerPriceSen / 1000) * 1000;
            decision = evaluateQuote({ flowerPriceSen: priceSen, deliveryFeeSen: DELIVERY_FEE, procurementCeilingSen, commissionRateBps: rate, mode }, rules);
            closeFactor = 0.6;
            sit('PROFIT_GUARD_REPRICE', `${leadId}: requested price below floor, counter-quote issued`);
          }
          if (decision.approved) {
            quotes++;
            approvedSen = priceSen;
            lock = lockQuoteCommission({ quoteId: `${leadId}-Q`, quoteVersion: 1, agentId: agent.id, tier: agent.tier, rules, now });
          }
        }
      }

      // 3. Audit what the Agent told the customer.
      const message = agentMessage(agent, i, approvedSen);
      for (const finding of auditMessage(message, { approvedQuoteSen: approvedSen, customerStatedSen: [budgetSen] })) {
        const action = enforce(finding.kind, { priorInWindow: violationsToday, priorPersonalPaymentInWindow: personalPaymentToday }, rules);
        violationsToday++;
        pointsToday += action.points;
        if (finding.kind === 'PERSONAL_PAYMENT_INSTRUCTION') {
          personalPaymentToday++;
          paymentEvidence.push(`${leadId}: "${finding.evidence}"`);
        }
        enforcement.push(action.action);
        if (action.trainingModule && action.action !== 'WARN') training.add(action.trainingModule);
        if (action.action === 'OWNER_EXCEPTION') {
          sit('SERIOUS_EXCEPTION', `${finding.kind} repeated`, 'OWNER');
        } else {
          sit(`AUDIT_${action.action}`, `${finding.kind} on ${leadId}`);
        }
        if (action.action === 'TEMP_RESTRICTION' && status === 'ACTIVE') status = transition(status, 'RESTRICTION_APPLIED', 'SYSTEM');
      }

      // 4. Order.
      if (lock && approvedSen !== null && rng() < agent.p.close * closeFactor) {
        orders++;
        if (personalPaymentToday > 0) ordersWithPaymentRisk++;
        const entry = commissionEntry(`${leadId}-O`, { flowerRevenueSen: approvedSen, deliveryFeeSen: DELIVERY_FEE, taxSen: 0, passThroughSen: 0, refundedFlowerSen: 0 }, lock, rules);
        ledger.post(entry);
        if (!duplicateTested) {
          // The payment webhook is delivered twice; the ledger must ignore the repeat.
          duplicateTested = true;
          if (!ledger.post(entry).posted) totals.duplicateEventsIgnored++;
        }
        totals.flowerRevenueSen += approvedSen;
      }
    }

    if (personalPaymentToday >= rules.audit.personalPaymentEscalateAt) {
      exceptions.push({ agentCode: agent.code, risk: 'PERSONAL_PAYMENT_INSTRUCTION', affectedOrders: ordersWithPaymentRisk, evidence: paymentEvidence, recommendedAction: 'TEMPORARY_FREEZE' });
    }

    // 5. Restricted Agents complete their recovery task and are restored automatically.
    if (status === 'RESTRICTED') {
      status = transition(status, 'RECOVERY_COMPLETED', 'SYSTEM');
      sit('RECOVERY_RESTORED', 'recovery task completed, selling restored');
    }

    // 6. End of day: KPI, diagnosis, tier, bonus.
    const facts: KpiFacts = {
      ...agent.history,
      completedOrders30d: agent.history.completedOrders30d + orders,
      qualifiedLeads30d: agent.history.qualifiedLeads30d + qualified,
      quotes30d: agent.history.quotes30d + quotes,
      activeDays30d: agent.history.activeDays30d + (conversations > 0 ? 1 : 0),
      violationPoints30d: agent.history.violationPoints30d + pointsToday,
    };
    const kpi = performanceScore(facts, rules);
    const diag = diagnoseFunnel({ conversations, qualifiedLeads: qualified, quotes, orders }, rules);
    if (diag.remedy !== 'NONE') {
      if (diag.remedy !== 'ACQUISITION_MISSION') training.add(diag.remedy);
      sit('DIAGNOSIS', `${diag.diagnosis} → ${diag.remedy}`);
    }
    const seriousUnresolved = exceptions.some((e) => e.agentCode === agent.code) ? 1 : 0;
    const tier = evaluateTier({ tier: agent.tier, graceStartedAt: null, recoveryUntil: null }, {
      completedOrders30d: facts.completedOrders30d, performanceScore: kpi.score,
      upheldComplaints30d: facts.upheldComplaints30d, seriousUnresolvedViolations: seriousUnresolved,
    }, rules, now);
    if (tier.change !== 'HOLD') sit(`TIER_${tier.change}`, `${tier.from} → ${tier.to}`);

    const bonuses = evaluateBonuses({
      agentId: agent.id, periodKey30d: '2026-11', periodKey7d: '2026-W46',
      completedOrders7d: Math.round(facts.completedOrders30d / 4.3), completedOrders30d: facts.completedOrders30d,
      upheldComplaints30d: facts.upheldComplaints30d, profitVerified: false, mode, existing: [],
    }, rules);
    for (const b of bonuses) {
      totals.bonusPendingSen += b.amountSen;
      sit('BONUS', `${b.code} ${b.status}`);
    }

    const commissionSen = ledger.balance(agent.id, 'COMMISSION_EARNED');
    totals.conversations += conversations;
    totals.qualified += qualified;
    totals.quotes += quotes;
    totals.orders += orders;
    totals.commissionSen += commissionSen;

    agents.push({
      code: agent.code, behaviour: agent.behaviour, status, dormancy: dorm.stage,
      enquiries: perAgent, conversations, qualified, quotes, orders, commissionSen,
      score: kpi.score, tierBefore: agent.tier, tierAfter: tier.to, tierChange: tier.change, missingForNext: tier.missingForNext,
      diagnosis: diag.diagnosis, trainingAssigned: [...training], enforcement, bonuses,
      recommendedChannels: mission.recommendedChannels,
    });
  }

  const escalated = new Set(exceptions.map((e) => e.agentCode)).size;
  return {
    seed, ruleVersion: rules.version, mode, netMarginBps, totals, agents, situations, exceptions,
    agentsHandledAutomatically: DEMO_AGENTS.length - escalated,
    agentsEscalatedToOwner: escalated,
  };
}
