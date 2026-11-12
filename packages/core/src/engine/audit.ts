import type { Rules } from '../config/rules';
import type { Sen } from '../money';

export type ViolationKind =
  | 'UNAUTHORIZED_PRICE'
  | 'UNAUTHORIZED_DISCOUNT'
  | 'EXACT_REPRODUCTION_PROMISE'
  | 'PERSONAL_PAYMENT_INSTRUCTION'
  | 'INTERNAL_INFO_LEAK';

export interface Finding {
  kind: ViolationKind;
  evidence: string;
}

export interface AuditContext {
  /** Flower price of the currently approved quote, if one exists. */
  approvedQuoteSen: Sen | null;
  /** Amounts the customer stated themselves (e.g. their budget); echoing them is fine. */
  customerStatedSen?: readonly Sen[];
}

/** Every "RM 123" amount in a text, in sen. */
export function pricesIn(text: string): Sen[] {
  return [...text.matchAll(PRICE)].map((m) => Math.round(Number(m[1]) * 100));
}

const EXACT = [
  /\b100\s*%\s*(the\s+)?same\b/i,
  /\bexact(ly)?\s+(the\s+)?same\b/i,
  /\bidentical\b/i,
  /\bexact\s+(copy|replica)\b/i,
  /(一模一样|完全一样|百分百一样|100\s*%\s*一样|一样一样)/,
];
/** Phrases that refuse an exact copy must not be flagged. */
const EXACT_NEGATED = [/\b(can(no|')?t|cannot|won'?t|not|no)\b[^.!?。！？]{0,40}\b(100\s*%|exact|identical)/i, /(不能|无法|不可能|没办法|不保证)[^。！？.!?]{0,20}(一模一样|完全一样|百分百)/];

const PERSONAL_PAYMENT = [
  /\b(transfer|bank\s*in|pay|send|duitnow|tng)\b[^.!?]{0,40}\b(to\s+)?(me|my\s+(own\s+)?(account|acc|bank|number|tng|e-?wallet|duitnow|qr))\b/i,
  /\bmy\s+(personal\s+)?(bank\s+)?(account|acc)\s*(number|no\.?)?\b/i,
  /(转|汇|付|过数)[^。！？.!?]{0,12}(给我|到我|我的(户口|账户|帐号|账号|银行|tng|钱包))/i,
  /我的(私人)?(户口|账户|账号|帐号)/,
];

const DISCOUNT = [
  /\b(i('ll| will| can)?\s+give\s+(you\s+)?(a\s+)?(special\s+)?discount)\b/i,
  /\b\d{1,2}\s*%\s*(off|discount)\b/i,
  /\b(special|friend)\s+price\b/i,
  /(给你|算你)[^。！？.!?]{0,8}(折|便宜|优惠)/,
  /(打\s*[一二三四五六七八九\d]\s*折|朋友价)/,
];

const INTERNAL = [/\b(supplier|our\s+cost|cost\s+price|profit\s+margin|external\s+florist|maximum\s+buy\s+cost|mbc)\b/i, /(供应商|成本价|利润率|外包花店)/];

const PRICE = /\bRM\s*(\d{2,5}(?:\.\d{1,2})?)\b/gi;

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return null;
}

/**
 * Deterministic policy check for one Agent-authored message (or one
 * AI-suggested reply). The AI may add a classification on top, but these
 * rules alone decide what counts as a violation.
 */
export function auditMessage(text: string, ctx: AuditContext): Finding[] {
  const findings: Finding[] = [];

  const exact = firstMatch(text, EXACT);
  if (exact && !firstMatch(text, EXACT_NEGATED)) findings.push({ kind: 'EXACT_REPRODUCTION_PROMISE', evidence: exact });

  const pay = firstMatch(text, PERSONAL_PAYMENT);
  if (pay) findings.push({ kind: 'PERSONAL_PAYMENT_INSTRUCTION', evidence: pay });

  const discount = firstMatch(text, DISCOUNT);
  if (discount) findings.push({ kind: 'UNAUTHORIZED_DISCOUNT', evidence: discount });

  const leak = firstMatch(text, INTERNAL);
  if (leak) findings.push({ kind: 'INTERNAL_INFO_LEAK', evidence: leak });

  for (const m of text.matchAll(PRICE)) {
    const quoted = Math.round(Number(m[1]) * 100);
    if (quoted !== ctx.approvedQuoteSen && !(ctx.customerStatedSen ?? []).includes(quoted)) {
      findings.push({ kind: 'UNAUTHORIZED_PRICE', evidence: m[0] });
      break;
    }
  }
  return findings;
}

/* ---------- Enforcement ladder ---------- */

export type EnforcementAction = 'WARN' | 'MICRO_TRAINING' | 'TEMP_RESTRICTION' | 'OWNER_EXCEPTION';

export interface Enforcement {
  action: EnforcementAction;
  /** Whether this is handled without the Owner. */
  routine: boolean;
  trainingModule: string | null;
  restrictionDays: number | null;
  recoveryTaskRequired: boolean;
  recommendedOwnerAction: 'TEMPORARY_FREEZE' | null;
  points: number;
}

const MODULE_FOR: Record<ViolationKind, string> = {
  UNAUTHORIZED_PRICE: 'pricing-discipline',
  UNAUTHORIZED_DISCOUNT: 'pricing-discipline',
  EXACT_REPRODUCTION_PROMISE: 'reference-promise-compliance',
  PERSONAL_PAYMENT_INSTRUCTION: 'payment-policy',
  INTERNAL_INFO_LEAK: 'confidentiality',
};

export interface ViolationHistory {
  /** Violations of any kind in the audit window, before this one. */
  priorInWindow: number;
  /** Personal-payment instructions in the window, before this one. */
  priorPersonalPaymentInWindow: number;
}

/**
 * WARN → MICRO TRAINING → TEMPORARY RESTRICTION (+ recovery task) runs with
 * no Owner involvement. Only repeated personal-payment instructions, which
 * indicate customer money leaving the platform, reach the Owner queue.
 */
export function enforce(kind: ViolationKind, history: ViolationHistory, rules: Rules): Enforcement {
  const a = rules.audit;
  const points = a.violationPoints[kind] ?? 1;
  const trainingModule = MODULE_FOR[kind];

  if (kind === 'PERSONAL_PAYMENT_INSTRUCTION' && history.priorPersonalPaymentInWindow + 1 >= a.personalPaymentEscalateAt) {
    return { action: 'OWNER_EXCEPTION', routine: false, trainingModule, restrictionDays: null, recoveryTaskRequired: false, recommendedOwnerAction: 'TEMPORARY_FREEZE', points };
  }
  const nth = history.priorInWindow + 1;
  if (nth >= a.restrictAt) {
    return { action: 'TEMP_RESTRICTION', routine: true, trainingModule, restrictionDays: a.restrictionDays, recoveryTaskRequired: true, recommendedOwnerAction: null, points };
  }
  if (nth >= a.microTrainingAt) {
    return { action: 'MICRO_TRAINING', routine: true, trainingModule, restrictionDays: null, recoveryTaskRequired: false, recommendedOwnerAction: null, points };
  }
  return { action: 'WARN', routine: true, trainingModule: null, restrictionDays: null, recoveryTaskRequired: false, recommendedOwnerAction: null, points };
}
