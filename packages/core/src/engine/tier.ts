import { TIER_CODES, tierRule, type Rules, type TierCode } from '../config/rules';
import { ratioBps } from '../money';

export interface TierFacts {
  completedOrders30d: number;
  performanceScore: number;
  upheldComplaints30d: number;
  seriousUnresolvedViolations: number;
}

export interface TierState {
  tier: TierCode;
  /** Set while the Agent is below their tier's requirements. */
  graceStartedAt: string | null;
  /** Set after a downgrade; missions target re-qualification until then. */
  recoveryUntil: string | null;
}

export type TierChange = 'UPGRADE' | 'DOWNGRADE' | 'HOLD' | 'GRACE_STARTED' | 'IN_GRACE';

export interface TierDecision {
  state: TierState;
  change: TierChange;
  from: TierCode;
  to: TierCode;
  qualifiedTier: TierCode;
  /** Requirement names the Agent misses for the next tier up. */
  missingForNext: string[];
  ruleVersion: string;
}

const DAY_MS = 86_400_000;

export function qualityOk(facts: TierFacts, rules: Rules): boolean {
  return ratioBps(facts.upheldComplaints30d, facts.completedOrders30d) <= rules.tierPolicy.qualityMaxComplaintRateBps;
}

function missing(code: TierCode, facts: TierFacts, rules: Rules): string[] {
  const t = tierRule(rules, code);
  const out: string[] = [];
  if (facts.completedOrders30d < t.minOrders30d) out.push('orders');
  if (facts.performanceScore < t.minScore) out.push('score');
  if (t.requiresQuality && !qualityOk(facts, rules)) out.push('quality');
  if (t.requiresNoSeriousViolation && facts.seriousUnresolvedViolations > 0) out.push('serious_violation');
  return out;
}

/** Highest tier whose every requirement is met. Purely deterministic. */
export function qualifiedTier(facts: TierFacts, rules: Rules): TierCode {
  let best: TierCode = 'STARTER';
  for (const code of TIER_CODES) {
    if (missing(code, facts, rules).length === 0) best = code;
  }
  return best;
}

/**
 * Upgrades apply immediately. A drop starts a grace period; the downgrade
 * only applies if the Agent is still below the tier when grace runs out.
 * No Owner approval is involved in either direction.
 */
export function evaluateTier(current: TierState, facts: TierFacts, rules: Rules, now: Date): TierDecision {
  const qualified = qualifiedTier(facts, rules);
  const curIdx = TIER_CODES.indexOf(current.tier);
  const qIdx = TIER_CODES.indexOf(qualified);
  const next = TIER_CODES[curIdx + 1];
  const base = {
    from: current.tier,
    qualifiedTier: qualified,
    ruleVersion: rules.version,
  };
  const missingNext = (tier: TierCode): string[] => {
    const n = TIER_CODES[TIER_CODES.indexOf(tier) + 1];
    return n ? missing(n, facts, rules) : [];
  };

  if (qIdx > curIdx) {
    return {
      ...base,
      change: 'UPGRADE',
      to: qualified,
      missingForNext: missingNext(qualified),
      state: { tier: qualified, graceStartedAt: null, recoveryUntil: null },
    };
  }

  if (qIdx === curIdx) {
    const recoveryUntil = current.recoveryUntil && new Date(current.recoveryUntil) > now ? current.recoveryUntil : null;
    return {
      ...base,
      change: 'HOLD',
      to: current.tier,
      missingForNext: next ? missing(next, facts, rules) : [],
      state: { tier: current.tier, graceStartedAt: null, recoveryUntil },
    };
  }

  // Below current tier.
  if (!current.graceStartedAt) {
    if (rules.tierPolicy.graceDays === 0) return downgrade();
    return {
      ...base,
      change: 'GRACE_STARTED',
      to: current.tier,
      missingForNext: missing(current.tier, facts, rules),
      state: { ...current, graceStartedAt: now.toISOString() },
    };
  }
  const graceEnds = new Date(current.graceStartedAt).getTime() + rules.tierPolicy.graceDays * DAY_MS;
  if (now.getTime() < graceEnds) {
    return {
      ...base,
      change: 'IN_GRACE',
      to: current.tier,
      missingForNext: missing(current.tier, facts, rules),
      state: current,
    };
  }
  return downgrade();

  function downgrade(): TierDecision {
    return {
      ...base,
      change: 'DOWNGRADE',
      to: qualified,
      missingForNext: missingNext(qualified),
      state: {
        tier: qualified,
        graceStartedAt: null,
        recoveryUntil: new Date(now.getTime() + rules.tierPolicy.recoveryDays * DAY_MS).toISOString(),
      },
    };
  }
}
