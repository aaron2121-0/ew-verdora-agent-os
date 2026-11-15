import type { Occasion } from './schema';

export type OccasionTiming = Pick<Occasion, 'date_status' | 'date_start' | 'estimated_date' | 'order_lead_days'>;

const DAY_MS = 86_400_000;

/** Use ISO calendar dates; UTC arithmetic avoids server-local DST and timezone drift. */
function utcDay(value: string): number {
  const date = new Date(value + 'T00:00:00.000Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError('invalid_occasion_date');
  }
  return date.getTime();
}

function offsetDate(value: string, days: number): string {
  return new Date(utcDay(value) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Date in Kuching, never in the application server's timezone. */
export function todayKuching(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuching', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (name: Intl.DateTimeFormatPartTypes): string =>
    parts.find((value) => value.type === name)?.value ?? '';
  return part('year') + '-' + part('month') + '-' + part('day');
}

/** A missing event date is never invented from a previous year's date. */
export function displayDate(occasion: Pick<Occasion, 'date_status' | 'date_start' | 'estimated_date'>): string | null {
  return occasion.date_status === 'not_found' ? null : occasion.date_start ?? occasion.estimated_date;
}

export function promoStart(occasion: OccasionTiming): string | null {
  const start = displayDate(occasion);
  return start ? offsetDate(start, -occasion.order_lead_days) : null;
}

export interface OccasionPromoWindow { start: string; end: string }
export function promoWindow(occasion: OccasionTiming): OccasionPromoWindow | null {
  const end = displayDate(occasion);
  const start = promoStart(occasion);
  return end && start ? { start, end } : null;
}

export type StockLockReason = 'occasion.stock_lock.unconfirmed' | 'occasion.stock_lock.date_missing';
export type StockLockResult =
  | { allowed: true; reason: null }
  | { allowed: false; reason: StockLockReason };

export function canLockStock(occasion: Pick<Occasion, 'date_status' | 'date_start'>): StockLockResult {
  if (occasion.date_status !== 'confirmed') return { allowed: false, reason: 'occasion.stock_lock.unconfirmed' };
  if (!occasion.date_start) return { allowed: false, reason: 'occasion.stock_lock.date_missing' };
  return { allowed: true, reason: null };
}

export function getUrgent(occasions: readonly Occasion[], today: string = todayKuching()): Occasion[] {
  utcDay(today);
  return occasions.filter((event) => {
    if (event.flower_demand !== 'high') return false;
    const window = promoWindow(event);
    return window !== null && window.start <= today && today <= window.end;
  }).sort((a, b) => {
    const aDate = displayDate(a);
    const bDate = displayDate(b);
    return (aDate ?? '').localeCompare(bDate ?? '') || a.id.localeCompare(b.id);
  }).slice(0, 3);
}

/** Top three within the next 30 calendar days; verified dates rank above estimates. */
export function getTopOccasions30d(occasions: readonly Occasion[], today: string = todayKuching()): Occasion[] {
  utcDay(today);
  const end = offsetDate(today, 30);
  const demandScore: Record<Occasion['flower_demand'], number> = { high: 3, medium: 2, low: 1 };
  return occasions.filter((row) => {
    const date = displayDate(row);
    return date !== null && date >= today && date <= end;
  }).sort((a, b) =>
    demandScore[b.flower_demand] - demandScore[a.flower_demand] ||
    Number(b.date_status === 'confirmed') - Number(a.date_status === 'confirmed') ||
    (displayDate(a) ?? '').localeCompare(displayDate(b) ?? '') ||
    a.id.localeCompare(b.id)
  ).slice(0, 3);
}
