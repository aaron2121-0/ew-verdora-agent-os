import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected_yyyy_mm_dd').refine((value) => {
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'invalid_calendar_date');

const nullableDate = isoDate.nullable();
const uuid = z.string().uuid();
export const occasionCategorySchema = z.enum(['graduation', 'festival', 'cultural', 'business', 'wedding', 'event']);
export const occasionDemandSchema = z.enum(['high', 'medium', 'low']);
export const occasionRecurrenceSchema = z.enum(['fixed', 'lunar', 'variable']);
export const occasionDateStatusSchema = z.enum(['confirmed', 'pattern', 'not_found']);
export const occasionConfidenceSchema = z.enum(['high', 'medium', 'low']);
export const occasionVerificationStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const occasionSchema = z.object({
  id: uuid,
  date_start: nullableDate,
  date_end: nullableDate,
  estimated_date: nullableDate,
  name_zh: z.string().trim().min(1),
  name_en: z.string().trim().min(1),
  category: occasionCategorySchema,
  location_or_audience: z.string().trim().min(1),
  flower_demand: occasionDemandSchema,
  typical_products: z.array(z.string().trim().min(1)),
  order_lead_days: z.number().int().min(0).max(365),
  recurrence: occasionRecurrenceSchema,
  date_status: occasionDateStatusSchema,
  confidence: occasionConfidenceSchema,
  past_2024: z.string().nullable(),
  past_2025: z.string().nullable(),
  source_url: z.string().url().nullable(),
  evidence: z.string().nullable(),
  verified_by: uuid.nullable(),
  verified_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
}).superRefine((row, ctx) => {
  if (row.date_status === 'confirmed' && (row.date_start === null || row.confidence !== 'high')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'confirmed_requires_start_and_high' });
  }
  if (row.date_status === 'pattern' && row.estimated_date === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'pattern_requires_estimated_date' });
  }
  if (row.date_start && row.date_end && row.date_end < row.date_start) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'date_end_before_start' });
  }
  if (row.category === 'graduation' && row.date_status === 'confirmed' && (!row.verified_by || !row.verified_at)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'graduation_requires_owner_review' });
  }
});

export const occasionVerificationSchema = z.object({
  id: uuid,
  occasion_id: uuid,
  submitted_by: uuid,
  proposed_date_start: isoDate,
  proposed_date_end: nullableDate,
  proof_url: z.string().url().refine((value) => value.startsWith('https://'), 'https_required'),
  note: z.string().nullable(),
  status: occasionVerificationStatusSchema,
  reviewed_by: uuid.nullable(),
  reviewed_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }),
}).superRefine((row, ctx) => {
  if (row.proposed_date_end && row.proposed_date_end < row.proposed_date_start) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'date_end_before_start' });
  }
});

export type Occasion = z.infer<typeof occasionSchema>;
export type OccasionVerification = z.infer<typeof occasionVerificationSchema>;
export type OccasionCategory = z.infer<typeof occasionCategorySchema>;
export type OccasionDateStatus = z.infer<typeof occasionDateStatusSchema>;
export type OccasionDemand = z.infer<typeof occasionDemandSchema>;
export type OccasionVerificationStatus = z.infer<typeof occasionVerificationStatusSchema>;
export { isoDate as occasionIsoDateSchema };
