import type { Rules, TierCode } from '../config/rules';
import { tierRule } from '../config/rules';
import { applyBps, type Bps, type Sen } from '../money';

export interface OrderAmounts {
  flowerRevenueSen: Sen;
  deliveryFeeSen: Sen;
  taxSen: Sen;
  passThroughSen: Sen;
  /** Flower revenue refunded to the customer so far. */
  refundedFlowerSen: Sen;
}

/** Commissionable revenue: configured components only, net of refunds. */
export function commissionableRevenue(o: OrderAmounts, rules: Rules): Sen {
  const parts: Record<string, Sen> = {
    flower: o.flowerRevenueSen,
    delivery: o.deliveryFeeSen,
    tax: o.taxSen,
    passThrough: o.passThroughSen,
  };
  let base = 0;
  for (const c of rules.commission.includedComponents) base += parts[c] ?? 0;
  if (rules.commission.subtractRefunds) base -= o.refundedFlowerSen;
  return Math.max(0, base);
}

/**
 * Recorded once, when a quote version is officially approved. Later tier
 * changes, rule edits or procurement cost increases never alter it.
 */
export interface QuoteLock {
  readonly quoteId: string;
  readonly quoteVersion: number;
  readonly agentId: string;
  readonly tierAtLock: TierCode;
  readonly commissionRuleVersion: string;
  readonly commissionRateLockedBps: Bps;
  readonly lockedAt: string;
}

export function lockQuoteCommission(input: {
  quoteId: string;
  quoteVersion: number;
  agentId: string;
  tier: TierCode;
  rules: Rules;
  now: Date;
}): QuoteLock {
  return Object.freeze({
    quoteId: input.quoteId,
    quoteVersion: input.quoteVersion,
    agentId: input.agentId,
    tierAtLock: input.tier,
    commissionRuleVersion: input.rules.version,
    commissionRateLockedBps: tierRule(input.rules, input.tier).rateBps,
    lockedAt: input.now.toISOString(),
  });
}

export type LedgerEntryType = 'COMMISSION_EARNED' | 'COMMISSION_REVERSED' | 'BONUS';

export interface LedgerEntry {
  readonly idempotencyKey: string;
  readonly agentId: string;
  readonly type: LedgerEntryType;
  readonly amountSen: Sen;
  readonly orderId: string | null;
  readonly ruleVersion: string;
  readonly rateBps: Bps | null;
  readonly baseSen: Sen | null;
}

/** Commission for a completed order, at the rate locked on its quote. */
export function commissionEntry(orderId: string, amounts: OrderAmounts, lock: QuoteLock, rules: Rules): LedgerEntry {
  const base = commissionableRevenue({ ...amounts, refundedFlowerSen: 0 }, rules);
  return {
    idempotencyKey: `commission:${orderId}:earned`,
    agentId: lock.agentId,
    type: 'COMMISSION_EARNED',
    amountSen: applyBps(base, lock.commissionRateLockedBps),
    orderId,
    ruleVersion: lock.commissionRuleVersion,
    rateBps: lock.commissionRateLockedBps,
    baseSen: base,
  };
}

/** Reversal for a refund: the same locked rate applied to the refunded part. */
export function refundReversalEntry(orderId: string, refundId: string, refundedFlowerSen: Sen, lock: QuoteLock): LedgerEntry {
  return {
    idempotencyKey: `commission:${orderId}:refund:${refundId}`,
    agentId: lock.agentId,
    type: 'COMMISSION_REVERSED',
    amountSen: -applyBps(refundedFlowerSen, lock.commissionRateLockedBps),
    orderId,
    ruleVersion: lock.commissionRuleVersion,
    rateBps: lock.commissionRateLockedBps,
    baseSen: refundedFlowerSen,
  };
}

/**
 * Append-only ledger. Posting the same idempotency key twice is a no-op, so
 * a retried webhook or duplicated job can never pay twice. The database
 * enforces the same rule with a unique constraint on `idempotency_key`.
 */
export class Ledger {
  private readonly entries = new Map<string, LedgerEntry>();

  post(entry: LedgerEntry): { posted: boolean } {
    if (this.entries.has(entry.idempotencyKey)) return { posted: false };
    this.entries.set(entry.idempotencyKey, Object.freeze({ ...entry }));
    return { posted: true };
  }

  all(): readonly LedgerEntry[] {
    return [...this.entries.values()];
  }

  balance(agentId: string, type?: LedgerEntryType): Sen {
    let total = 0;
    for (const e of this.entries.values()) {
      if (e.agentId === agentId && (!type || e.type === type)) total += e.amountSen;
    }
    return total;
  }
}
