import type { Bps, Sen } from '../money';
import type { QuoteDecision } from './profitGuard';

export type Role = 'AGENT' | 'OWNER' | 'SYSTEM';

export interface Principal {
  role: Role;
  /** Set for AGENT principals. */
  agentId: string | null;
}

/** Server-side check used by every data access path, in addition to RLS. */
export function canAccessAgentData(principal: Principal, ownerAgentId: string): boolean {
  if (principal.role === 'OWNER' || principal.role === 'SYSTEM') return true;
  return principal.agentId !== null && principal.agentId === ownerAgentId;
}

export function assertAgentAccess(principal: Principal, ownerAgentId: string): void {
  if (!canAccessAgentData(principal, ownerAgentId)) throw new ForbiddenError('Not your record');
}

export class ForbiddenError extends Error {
  override name = 'ForbiddenError';
}

/**
 * Keys that must never appear in a payload sent to an Agent or a browser.
 * Matching is case- and separator-insensitive on every nested key.
 */
const INTERNAL_KEY_PATTERNS = [
  /procure/,
  /maximumbuycost|^mbc$|mbc(sen)?$/,
  /cost/,
  /margin/,
  /contribution/,
  /supplier/,
  /externalflorist|florist(id|name)/,
  /breakdown/,
  /minimumflowerprice|pricefloor/,
  /opex|netprofit/,
  /servicerole|apikey|secret/,
];

const normalise = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]/g, '');

export function findInternalKeys(value: unknown, path = ''): string[] {
  if (value === null || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap((v, i) => findInternalKeys(v, `${path}[${i}]`));
  const hits: string[] = [];
  for (const [key, v] of Object.entries(value)) {
    const here = path ? `${path}.${key}` : key;
    if (INTERNAL_KEY_PATTERNS.some((p) => p.test(normalise(key)))) hits.push(here);
    hits.push(...findInternalKeys(v, here));
  }
  return hits;
}

/** Last line of defence at the API boundary for Agent-facing responses. */
export function assertAgentSafe<T>(payload: T): T {
  const hits = findInternalKeys(payload);
  if (hits.length > 0) throw new Error(`Internal fields in Agent payload: ${hits.join(', ')}`);
  return payload;
}

/* ---------- Agent-safe projections ---------- */

export interface AgentQuoteView {
  quoteId: string;
  version: number;
  status: 'APPROVED' | 'NEEDS_REPRICE';
  flowerPriceSen: Sen;
  deliveryFeeSen: Sen;
  totalSen: Sen;
  commissionRateLockedBps: Bps | null;
  estimatedCommissionSen: Sen | null;
}

/**
 * What an Agent learns from a quote decision: approved or not, the customer
 * price, and their own commission. No floor, no cost, no margin, no reason
 * that would let them reverse-engineer the formula.
 */
export function toAgentQuoteView(input: {
  quoteId: string;
  version: number;
  flowerPriceSen: Sen;
  deliveryFeeSen: Sen;
  decision: QuoteDecision;
  commissionRateLockedBps: Bps | null;
}): AgentQuoteView {
  const approved = input.decision.approved;
  return assertAgentSafe({
    quoteId: input.quoteId,
    version: input.version,
    status: approved ? ('APPROVED' as const) : ('NEEDS_REPRICE' as const),
    flowerPriceSen: input.flowerPriceSen,
    deliveryFeeSen: input.deliveryFeeSen,
    totalSen: input.flowerPriceSen + input.deliveryFeeSen,
    commissionRateLockedBps: approved ? input.commissionRateLockedBps : null,
    estimatedCommissionSen: approved && input.commissionRateLockedBps !== null ? input.decision.breakdown.commissionSen : null,
  });
}
