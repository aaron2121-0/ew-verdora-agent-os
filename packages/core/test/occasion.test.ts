import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canLockStock, displayDate, getTopOccasions30d, getUrgent, occasionSchema,
  occasionVerificationSchema, promoStart, promoWindow, todayKuching,
  type Occasion,
} from '../src/occasion/index';

const base: Occasion = {
  id: '00000000-0000-4000-8000-000000000001',
  date_start: '2026-12-25', date_end: null, estimated_date: null,
  name_zh: '圣诞节', name_en: 'Christmas Day',
  category: 'festival', location_or_audience: 'Kuching',
  flower_demand: 'high', typical_products: ['Roses'],
  order_lead_days: 21, recurrence: 'fixed', date_status: 'confirmed',
  confidence: 'high', past_2024: null, past_2025: null,
  source_url: null, evidence: null, verified_by: null, verified_at: null,
  created_at: '2026-11-15T00:00:00+08:00', updated_at: '2026-11-15T00:00:00+08:00',
};
const withValues = (values: Partial<Occasion>): Occasion => ({ ...base, ...values });

describe('occasion timing', () => {
  it('distinguishes confirmed, pattern and not_found', () => {
    const pattern = withValues({ date_start: null, estimated_date: '2026-12-06', date_status: 'pattern', confidence: 'medium' });
    const missing = withValues({ date_start: null, estimated_date: null, date_status: 'not_found', confidence: 'low' });
    assert.equal(displayDate(base), '2026-12-25');
    assert.equal(displayDate(pattern), '2026-12-06');
    assert.equal(displayDate(missing), null);
    assert.equal(promoStart(missing), null);
    assert.equal(promoWindow(missing), null);
    assert.deepEqual(canLockStock(base), { allowed: true, reason: null });
    assert.deepEqual(canLockStock(pattern), { allowed: false, reason: 'occasion.stock_lock.unconfirmed' });
    assert.deepEqual(canLockStock(missing), { allowed: false, reason: 'occasion.stock_lock.unconfirmed' });
  });
  it('crosses year boundaries using dates, not local server time', () => {
    const event = withValues({ date_start: '2027-01-01', order_lead_days: 14 });
    assert.equal(promoStart(event), '2026-12-18');
    assert.deepEqual(promoWindow(event), { start: '2026-12-18', end: '2027-01-01' });
    assert.equal(todayKuching(new Date('2026-12-31T16:00:00.000Z')), '2027-01-01');
  });
  it('includes both boundary dates and excludes the next day', () => {
    const event = withValues({ date_start: '2027-01-01', order_lead_days: 14 });
    assert.equal(getUrgent([event], '2026-12-18').length, 1);
    assert.equal(getUrgent([event], '2027-01-01').length, 1);
    assert.equal(getUrgent([event], '2027-01-02').length, 0);
  });
  it('ranks high-demand urgent events by nearest occasion and limits to three', () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      withValues({ id: '00000000-0000-4000-8000-' + String(i + 1).padStart(12, '0'),
        date_start: '2026-12-' + String(20 + i).padStart(2, '0') }));
    assert.deepEqual(getUrgent(events.reverse(), '2026-12-15').map((row) => row.date_start),
      ['2026-12-20', '2026-12-21', '2026-12-22']);
    assert.equal(getUrgent([withValues({ flower_demand: 'low' })], '2026-12-15').length, 0);
  });
  it('selects top 30 days without turning an estimate into a confirmation', () => {
    const next = withValues({ id: '00000000-0000-4000-8000-000000000002', date_start: null,
      estimated_date: '2027-01-10', date_status: 'pattern', confidence: 'medium' });
    assert.equal(getTopOccasions30d([next], '2027-01-01')[0]?.date_status, 'pattern');
    assert.equal(getTopOccasions30d([next], '2027-02-01').length, 0);
  });
});

describe('schema guardrails', () => {
  it('requires date and high confidence to mark confirmed', () => {
    assert.equal(occasionSchema.safeParse(withValues({ date_start: null })).success, false);
    assert.equal(occasionSchema.safeParse(withValues({ confidence: 'medium' })).success, false);
  });
  it('requires estimated_date for pattern, but not for not_found', () => {
    assert.equal(occasionSchema.safeParse(withValues({
      date_start: null, date_status: 'pattern', confidence: 'low',
    })).success, false);
    assert.equal(occasionSchema.safeParse(withValues({
      date_start: null, estimated_date: null, date_status: 'not_found', confidence: 'low',
    })).success, true);
  });
  it('requires owner approval metadata for graduation confirmation', () => {
    assert.equal(occasionSchema.safeParse(withValues({ category: 'graduation' })).success, false);
  });
  it('rejects verification date_end before date_start', () => {
    const input = {
      id: '00000000-0000-4000-8000-000000000002',
      occasion_id: base.id, submitted_by: base.id,
      proposed_date_start: '2027-01-02', proposed_date_end: '2027-01-01',
      proof_url: 'https://example.edu.my/announcement',
      note: null, status: 'pending', reviewed_by: null, reviewed_at: null,
      created_at: base.created_at,
    };
    assert.equal(occasionVerificationSchema.safeParse(input).success, false);
  });
});
