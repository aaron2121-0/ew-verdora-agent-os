import type { Rules } from '../config/rules';
import { applyBps, ratioBps, type Bps, type Sen } from '../money';

export type ProfitMode = 'NORMAL' | 'PROTECTION' | 'PROFIT_RECOVERY';

/* ---------- Company level: rolling 30-day net margin ---------- */

export interface CompanyWindow {
  revenueSen: Sen;
  productionCostSen: Sen;
  commissionSen: Sen;
  bonusSen: Sen;
  paymentFeesSen: Sen;
  refundsSen: Sen;
  /** Payroll, rent, software, admin and other operating expenses. */
  opexSen: Sen;
}

export function companyNetMargin(w: CompanyWindow): { netProfitSen: Sen; netMarginBps: Bps } {
  const netProfitSen =
    w.revenueSen - w.productionCostSen - w.commissionSen - w.bonusSen - w.paymentFeesSen - w.refundsSen - w.opexSen;
  return { netProfitSen, netMarginBps: ratioBps(netProfitSen, w.revenueSen) };
}

export function profitMode(netMarginBps: Bps, rules: Rules): ProfitMode {
  const { targetNetMarginBps, protectionBandBps } = rules.profitGuard;
  if (netMarginBps >= targetNetMarginBps + protectionBandBps) return 'NORMAL';
  if (netMarginBps >= targetNetMarginBps) return 'PROTECTION';
  return 'PROFIT_RECOVERY';
}

export interface ModePolicy {
  discretionaryBonusesPaused: boolean;
  lowMarginCampaignsPaused: boolean;
  discountsAllowed: boolean;
}

/** What each mode switches off. Locked commissions are never touched. */
export function modePolicy(mode: ProfitMode): ModePolicy {
  switch (mode) {
    case 'NORMAL':
      return { discretionaryBonusesPaused: false, lowMarginCampaignsPaused: false, discountsAllowed: true };
    case 'PROTECTION':
      return { discretionaryBonusesPaused: false, lowMarginCampaignsPaused: true, discountsAllowed: false };
    case 'PROFIT_RECOVERY':
      return { discretionaryBonusesPaused: true, lowMarginCampaignsPaused: true, discountsAllowed: false };
  }
}

/* ---------- Order level: contribution check before approving a price ---------- */

export interface QuoteInput {
  flowerPriceSen: Sen;
  deliveryFeeSen: Sen;
  /** Production cost estimate / procurement ceiling. INTERNAL. */
  procurementCeilingSen: Sen;
  commissionRateBps: Bps;
  otherVariableCostSen?: Sen;
  mode: ProfitMode;
}

/** INTERNAL result. Never serialise this to an Agent; see visibility.ts. */
export interface QuoteDecision {
  approved: boolean;
  reason: 'OK' | 'BELOW_CONTRIBUTION_FLOOR';
  contributionSen: Sen;
  contributionMarginBps: Bps;
  requiredMarginBps: Bps;
  /** Lowest flower price that would pass at this cost. */
  minimumFlowerPriceSen: Sen;
  /** Highest procurement cost that would pass at this price (MBC). */
  maximumBuyCostSen: Sen;
  breakdown: {
    commissionSen: Sen;
    bonusAllocationSen: Sen;
    paymentProcessingSen: Sen;
    riskAllowanceSen: Sen;
    refundAllowanceSen: Sen;
    otherVariableCostSen: Sen;
  };
  ruleVersion: string;
}

export function evaluateQuote(q: QuoteInput, rules: Rules): QuoteDecision {
  const g = rules.profitGuard;
  const other = q.otherVariableCostSen ?? 0;
  const breakdown = {
    commissionSen: applyBps(q.flowerPriceSen, q.commissionRateBps),
    bonusAllocationSen: applyBps(q.flowerPriceSen, g.bonusAllocationBps),
    paymentProcessingSen: applyBps(q.flowerPriceSen + q.deliveryFeeSen, g.paymentProcessingBps),
    riskAllowanceSen: applyBps(q.flowerPriceSen, g.riskAllowanceBps),
    refundAllowanceSen: applyBps(q.flowerPriceSen, g.refundAllowanceBps),
    otherVariableCostSen: other,
  };
  const variable =
    breakdown.commissionSen +
    breakdown.bonusAllocationSen +
    breakdown.paymentProcessingSen +
    breakdown.riskAllowanceSen +
    breakdown.refundAllowanceSen +
    other;
  const contributionSen = q.flowerPriceSen - q.procurementCeilingSen - variable;
  const contributionMarginBps = ratioBps(contributionSen, q.flowerPriceSen);
  const requiredMarginBps = g.minContributionMarginBps[q.mode];
  const approved = q.flowerPriceSen > 0 && contributionMarginBps >= requiredMarginBps;

  // P·(1 − rates − required) ≥ procurement + other + delivery·processing
  const rateSum =
    q.commissionRateBps + g.bonusAllocationBps + g.paymentProcessingBps + g.riskAllowanceBps + g.refundAllowanceBps + requiredMarginBps;
  const fixed = q.procurementCeilingSen + other + applyBps(q.deliveryFeeSen, g.paymentProcessingBps);
  const keep = (10_000 - rateSum) / 10_000;
  const minimumFlowerPriceSen = keep > 0 ? Math.ceil(fixed / keep) : Number.MAX_SAFE_INTEGER;
  const maximumBuyCostSen = Math.max(0, q.flowerPriceSen - variable - applyBps(q.flowerPriceSen, requiredMarginBps));

  return {
    approved,
    reason: approved ? 'OK' : 'BELOW_CONTRIBUTION_FLOOR',
    contributionSen,
    contributionMarginBps,
    requiredMarginBps,
    minimumFlowerPriceSen,
    maximumBuyCostSen,
    breakdown,
    ruleVersion: rules.version,
  };
}
