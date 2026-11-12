import type { BonusRule, Rules } from '../config/rules';
import type { Sen } from '../money';
import { modePolicy, type ProfitMode } from './profitGuard';

export type BonusStatus = 'APPROVED' | 'PENDING_PROFIT_QUALIFICATION' | 'PAUSED_BY_PROFIT_GUARD';

export interface BonusAward {
  /** Unique per Agent, rule and period: the idempotency key. */
  key: string;
  agentId: string;
  code: string;
  amountSen: Sen;
  status: BonusStatus;
  ruleVersion: string;
}

export interface BonusFacts {
  agentId: string;
  /** e.g. "2026-11" for 30-day rules, "2026-W46" for 7-day rules. */
  periodKey30d: string;
  periodKey7d: string;
  completedOrders7d: number;
  completedOrders30d: number;
  upheldComplaints30d: number;
  /**
   * True once the orders behind the achievement are profit-verified
   * (paid, delivered, refund window closed). Until then awards stay pending.
   */
  profitVerified: boolean;
  mode: ProfitMode;
  /** Awards already recorded for these periods. */
  existing: readonly Pick<BonusAward, 'key' | 'code' | 'amountSen'>[];
}

function reached(rule: BonusRule, f: BonusFacts): boolean {
  const orders = rule.windowDays <= 7 ? f.completedOrders7d : f.completedOrders30d;
  if (orders < rule.orders) return false;
  if (rule.requiresZeroUpheldComplaints && f.upheldComplaints30d > 0) return false;
  return true;
}

/**
 * Fixed-RM bonuses only. Rules in the same stack group never add up: the
 * Agent receives the highest amount reached, paid as a top-up over what the
 * group already paid in the period. Calling this repeatedly is safe.
 */
export function evaluateBonuses(f: BonusFacts, rules: Rules): BonusAward[] {
  const policy = modePolicy(f.mode);
  const existingKeys = new Set(f.existing.map((e) => e.key));
  const awards: BonusAward[] = [];

  const statusFor = (rule: BonusRule): BonusStatus => {
    if (rule.discretionary && policy.discretionaryBonusesPaused) return 'PAUSED_BY_PROFIT_GUARD';
    if (!f.profitVerified) return 'PENDING_PROFIT_QUALIFICATION';
    return 'APPROVED';
  };
  const keyFor = (rule: BonusRule): string =>
    `bonus:${f.agentId}:${rule.code}:${rule.windowDays <= 7 ? f.periodKey7d : f.periodKey30d}`;

  const groups = new Map<string, BonusRule[]>();
  for (const rule of rules.bonuses) {
    if (!reached(rule, f)) continue;
    if (rule.stackGroup === null) {
      const key = keyFor(rule);
      if (!existingKeys.has(key)) {
        awards.push({ key, agentId: f.agentId, code: rule.code, amountSen: rule.amountSen, status: statusFor(rule), ruleVersion: rules.version });
      }
    } else {
      groups.set(rule.stackGroup, [...(groups.get(rule.stackGroup) ?? []), rule]);
    }
  }

  for (const [group, reachedRules] of groups) {
    const top = reachedRules.reduce((a, b) => (b.amountSen > a.amountSen ? b : a));
    const key = keyFor(top);
    if (existingKeys.has(key)) continue;
    const groupCodes = new Set(rules.bonuses.filter((r) => r.stackGroup === group).map((r) => r.code));
    const alreadyPaid = f.existing.filter((e) => groupCodes.has(e.code)).reduce((s, e) => s + e.amountSen, 0);
    const topUp = top.amountSen - alreadyPaid;
    if (topUp > 0) {
      awards.push({ key, agentId: f.agentId, code: top.code, amountSen: topUp, status: statusFor(top), ruleVersion: rules.version });
    }
  }
  return awards;
}
