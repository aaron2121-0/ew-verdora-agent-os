/**
 * All money is integer sen (RM 1.00 = 100). All rates are basis points
 * (1% = 100 bps). No floating point money anywhere in the rule engine.
 */
export type Sen = number;
export type Bps = number;

export function assertSen(value: number, label = 'amount'): Sen {
  if (!Number.isInteger(value)) throw new Error(`${label} must be integer sen, got ${value}`);
  return value;
}

/** amount × rate, rounded half-up to the nearest sen. */
export function applyBps(amount: Sen, rate: Bps): Sen {
  return Math.round((amount * rate) / 10_000);
}

/** part / whole expressed in bps; 0 when whole is 0. */
export function ratioBps(part: number, whole: number): Bps {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 10_000);
}

export function rm(ringgit: number): Sen {
  return Math.round(ringgit * 100);
}

export function formatRM(sen: Sen): string {
  return `RM ${(sen / 100).toFixed(2)}`;
}

export function formatPct(rate: Bps): string {
  const pct = rate / 100;
  return `${Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(1)}%`;
}
