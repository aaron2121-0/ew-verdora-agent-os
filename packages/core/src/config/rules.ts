import { z } from 'zod';

/**
 * The single, versioned business-rule document. Every threshold the rule
 * engine uses comes from here; nothing financial is hard-coded elsewhere.
 * A rule set is stored as one immutable row in `rule_sets` (jsonb) and the
 * Owner edits it through admin configuration, producing a new version.
 */

const bps = z.number().int().min(0).max(10_000);
const sen = z.number().int().min(0);

export const TIER_CODES = ['STARTER', 'ACTIVE', 'PRO', 'ELITE'] as const;
export type TierCode = (typeof TIER_CODES)[number];

export const ROLEPLAY_CATEGORIES = [
  'requirementDiscovery',
  'customerHandling',
  'closingAbility',
  'pricingDiscipline',
  'policyCompliance',
] as const;
export type RoleplayCategory = (typeof ROLEPLAY_CATEGORIES)[number];

export const KPI_COMPONENTS = [
  'completedOrders',
  'qualifiedLeads',
  'quoteConversion',
  'followUp',
  'activity',
  'quality',
  'compliance',
] as const;
export type KpiComponent = (typeof KPI_COMPONENTS)[number];

export const REVENUE_COMPONENTS = ['flower', 'delivery', 'tax', 'passThrough'] as const;
export type RevenueComponent = (typeof REVENUE_COMPONENTS)[number];

const tierSchema = z.object({
  code: z.enum(TIER_CODES),
  rateBps: bps,
  minOrders30d: z.number().int().min(0),
  minScore: z.number().min(0).max(100),
  requiresQuality: z.boolean(),
  requiresNoSeriousViolation: z.boolean(),
});

const bonusSchema = z.object({
  code: z.string().min(1),
  orders: z.number().int().min(1),
  windowDays: z.number().int().min(1),
  amountSen: sen,
  stackGroup: z.string().nullable(),
  discretionary: z.boolean(),
  requiresZeroUpheldComplaints: z.boolean(),
});

const modeNumbers = z.object({ NORMAL: bps, PROTECTION: bps, PROFIT_RECOVERY: bps });

export const rulesSchema = z
  .object({
    version: z.string().min(1),
    certification: z.object({
      passScore: z.number().min(0).max(100),
      categoryMax: z.number().int().min(1),
      weakCategoryScore: z.number().min(0),
      categoryModules: z.record(z.enum(ROLEPLAY_CATEGORIES), z.string()),
    }),
    kpi: z.object({
      weights: z.record(z.enum(KPI_COMPONENTS), z.number().min(0)),
      targets: z.object({
        orders30d: z.number().positive(),
        qualifiedLeads30d: z.number().positive(),
        quoteConversionBps: bps,
        activeDays30d: z.number().positive(),
        maxComplaintRateBps: bps,
        maxViolationPoints30d: z.number().positive(),
      }),
    }),
    tiers: z.array(tierSchema).length(TIER_CODES.length),
    tierPolicy: z.object({
      graceDays: z.number().int().min(0),
      recoveryDays: z.number().int().min(0),
      qualityMaxComplaintRateBps: bps,
    }),
    commission: z.object({
      includedComponents: z.array(z.enum(REVENUE_COMPONENTS)).min(1),
      subtractRefunds: z.boolean(),
    }),
    bonuses: z.array(bonusSchema),
    profitGuard: z.object({
      targetNetMarginBps: bps,
      protectionBandBps: bps,
      paymentProcessingBps: bps,
      riskAllowanceBps: bps,
      refundAllowanceBps: bps,
      bonusAllocationBps: bps,
      minContributionMarginBps: modeNumbers,
    }),
    audit: z.object({
      windowDays: z.number().int().min(1),
      warnAt: z.number().int().min(1),
      microTrainingAt: z.number().int().min(1),
      restrictAt: z.number().int().min(1),
      personalPaymentEscalateAt: z.number().int().min(1),
      restrictionDays: z.number().int().min(1),
      violationPoints: z.record(z.string(), z.number().min(0)),
    }),
    dormancy: z.object({
      restartMissionDays: z.number().int().min(1),
      recoveryMissionDays: z.number().int().min(1),
      reactivationTrainingDays: z.number().int().min(1),
      dormantDays: z.number().int().min(1),
    }),
    mission: z.object({
      orderTarget: z.number().int().min(0),
      qualifiedLeads: z.number().int().min(0),
      quotes: z.number().int().min(0),
      followUps: z.number().int().min(0),
      warmOutreach: z.number().int().min(0),
      minConversations: z.number().int().min(0),
      channelMinSample: z.number().int().min(1),
    }),
  })
  .superRefine((r, ctx) => {
    const total = Object.values(r.kpi.weights).reduce((a, b) => a + (b ?? 0), 0);
    if (total !== 100) ctx.addIssue({ code: 'custom', message: `KPI weights must total 100, got ${total}` });
    for (const c of KPI_COMPONENTS) {
      if (r.kpi.weights[c] === undefined) ctx.addIssue({ code: 'custom', message: `KPI weight missing: ${c}` });
    }
    for (const c of ROLEPLAY_CATEGORIES) {
      if (!r.certification.categoryModules[c]) ctx.addIssue({ code: 'custom', message: `Module missing: ${c}` });
    }
    r.tiers.forEach((t, i) => {
      if (t.code !== TIER_CODES[i]) ctx.addIssue({ code: 'custom', message: 'Tiers must be listed lowest to highest' });
      const prev = r.tiers[i - 1];
      if (prev && (t.rateBps < prev.rateBps || t.minOrders30d < prev.minOrders30d)) {
        ctx.addIssue({ code: 'custom', message: `Tier ${t.code} must not be below ${prev.code}` });
      }
    });
    const d = r.dormancy;
    if (!(d.restartMissionDays < d.recoveryMissionDays && d.recoveryMissionDays < d.reactivationTrainingDays && d.reactivationTrainingDays < d.dormantDays)) {
      ctx.addIssue({ code: 'custom', message: 'Dormancy stages must be strictly increasing' });
    }
  });

export type Rules = z.infer<typeof rulesSchema>;
export type TierRule = z.infer<typeof tierSchema>;
export type BonusRule = z.infer<typeof bonusSchema>;

export function parseRules(input: unknown): Rules {
  return rulesSchema.parse(input);
}

export const DEFAULT_RULES: Rules = parseRules({
  version: '2026.11.0',
  certification: {
    passScore: 80,
    categoryMax: 20,
    weakCategoryScore: 12,
    categoryModules: {
      requirementDiscovery: 'requirement-discovery',
      customerHandling: 'customer-handling',
      closingAbility: 'objection-handling',
      pricingDiscipline: 'pricing-discipline',
      policyCompliance: 'reference-promise-compliance',
    },
  },
  kpi: {
    weights: {
      completedOrders: 30,
      qualifiedLeads: 15,
      quoteConversion: 15,
      followUp: 10,
      activity: 10,
      quality: 10,
      compliance: 10,
    },
    targets: {
      orders30d: 30,
      qualifiedLeads30d: 100,
      quoteConversionBps: 4000,
      activeDays30d: 22,
      maxComplaintRateBps: 1000,
      maxViolationPoints30d: 10,
    },
  },
  tiers: [
    { code: 'STARTER', rateBps: 500, minOrders30d: 0, minScore: 0, requiresQuality: false, requiresNoSeriousViolation: false },
    { code: 'ACTIVE', rateBps: 700, minOrders30d: 15, minScore: 70, requiresQuality: false, requiresNoSeriousViolation: false },
    { code: 'PRO', rateBps: 850, minOrders30d: 30, minScore: 80, requiresQuality: false, requiresNoSeriousViolation: false },
    { code: 'ELITE', rateBps: 1000, minOrders30d: 45, minScore: 90, requiresQuality: true, requiresNoSeriousViolation: true },
  ],
  tierPolicy: { graceDays: 7, recoveryDays: 14, qualityMaxComplaintRateBps: 300 },
  commission: { includedComponents: ['flower'], subtractRefunds: true },
  bonuses: [
    { code: 'STREAK_7_IN_7', orders: 7, windowDays: 7, amountSen: 3000, stackGroup: null, discretionary: true, requiresZeroUpheldComplaints: false },
    { code: 'ORDERS_30', orders: 30, windowDays: 30, amountSen: 10000, stackGroup: 'monthly_milestone', discretionary: false, requiresZeroUpheldComplaints: false },
    { code: 'ORDERS_45', orders: 45, windowDays: 30, amountSen: 25000, stackGroup: 'monthly_milestone', discretionary: false, requiresZeroUpheldComplaints: false },
    { code: 'ORDERS_60', orders: 60, windowDays: 30, amountSen: 50000, stackGroup: 'monthly_milestone', discretionary: false, requiresZeroUpheldComplaints: false },
    { code: 'ZERO_COMPLAINT_30', orders: 30, windowDays: 30, amountSen: 5000, stackGroup: null, discretionary: true, requiresZeroUpheldComplaints: true },
  ],
  profitGuard: {
    targetNetMarginBps: 5000,
    protectionBandBps: 500,
    paymentProcessingBps: 150,
    riskAllowanceBps: 200,
    refundAllowanceBps: 200,
    bonusAllocationBps: 150,
    minContributionMarginBps: { NORMAL: 6000, PROTECTION: 6300, PROFIT_RECOVERY: 6600 },
  },
  audit: {
    windowDays: 30,
    warnAt: 1,
    microTrainingAt: 2,
    restrictAt: 3,
    personalPaymentEscalateAt: 2,
    restrictionDays: 3,
    violationPoints: {
      UNAUTHORIZED_PRICE: 2,
      UNAUTHORIZED_DISCOUNT: 2,
      EXACT_REPRODUCTION_PROMISE: 2,
      PERSONAL_PAYMENT_INSTRUCTION: 5,
      INTERNAL_INFO_LEAK: 5,
    },
  },
  dormancy: { restartMissionDays: 2, recoveryMissionDays: 5, reactivationTrainingDays: 10, dormantDays: 21 },
  mission: {
    orderTarget: 1,
    qualifiedLeads: 5,
    quotes: 3,
    followUps: 8,
    warmOutreach: 5,
    minConversations: 5,
    channelMinSample: 5,
  },
});

export function tierRule(rules: Rules, code: TierCode): TierRule {
  const t = rules.tiers.find((x) => x.code === code);
  if (!t) throw new Error(`Unknown tier ${code}`);
  return t;
}
