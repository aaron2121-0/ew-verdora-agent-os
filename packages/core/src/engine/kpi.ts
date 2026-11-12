import { KPI_COMPONENTS, type KpiComponent, type Rules } from '../config/rules';

export interface KpiFacts {
  completedOrders30d: number;
  qualifiedLeads30d: number;
  quotes30d: number;
  followUpsDue30d: number;
  followUpsDone30d: number;
  activeDays30d: number;
  upheldComplaints30d: number;
  violationPoints30d: number;
  /** 0..1 share of required training completed. */
  trainingCompletion: number;
}

export interface KpiResult {
  score: number;
  components: Record<KpiComponent, { ratio: number; weight: number; points: number }>;
  ruleVersion: string;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));

/** Agent Performance Score out of 100, weights and targets from config. */
export function performanceScore(f: KpiFacts, rules: Rules): KpiResult {
  const t = rules.kpi.targets;
  const conversion = f.quotes30d > 0 ? f.completedOrders30d / f.quotes30d : 0;
  const complaintRate = f.completedOrders30d > 0 ? f.upheldComplaints30d / f.completedOrders30d : 0;
  const ratios: Record<KpiComponent, number> = {
    completedOrders: clamp01(f.completedOrders30d / t.orders30d),
    qualifiedLeads: clamp01(f.qualifiedLeads30d / t.qualifiedLeads30d),
    quoteConversion: clamp01(conversion / (t.quoteConversionBps / 10_000)),
    followUp: f.followUpsDue30d > 0 ? clamp01(f.followUpsDone30d / f.followUpsDue30d) : 1,
    activity: clamp01(f.activeDays30d / t.activeDays30d),
    quality: clamp01(1 - complaintRate / (t.maxComplaintRateBps / 10_000)),
    compliance: clamp01(1 - f.violationPoints30d / t.maxViolationPoints30d) * clamp01(f.trainingCompletion),
  };
  const components = {} as KpiResult['components'];
  let total = 0;
  for (const c of KPI_COMPONENTS) {
    const weight = rules.kpi.weights[c] ?? 0;
    const points = ratios[c] * weight;
    components[c] = { ratio: ratios[c], weight, points: Math.round(points * 10) / 10 };
    total += points;
  }
  return { score: Math.round(total * 10) / 10, components, ruleVersion: rules.version };
}

/* ---------- Outcome vs leading KPI: why was there no order? ---------- */

export type Diagnosis = 'HEALTHY' | 'ACTIVITY_PROBLEM' | 'QUALIFICATION_PROBLEM' | 'CLOSING_PROBLEM';

export interface FunnelFacts {
  conversations: number;
  qualifiedLeads: number;
  quotes: number;
  orders: number;
}

export interface DiagnosisResult {
  diagnosis: Diagnosis;
  /** Training module or mission the system assigns automatically. */
  remedy: 'NONE' | 'ACQUISITION_MISSION' | 'requirement-discovery' | 'objection-handling';
}

/**
 * Zero orders is never punished on its own. The funnel decides which
 * problem the Agent has, and each problem gets a different remedy.
 */
export function diagnoseFunnel(f: FunnelFacts, rules: Rules): DiagnosisResult {
  const m = rules.mission;
  if (f.orders >= m.orderTarget && m.orderTarget > 0) return { diagnosis: 'HEALTHY', remedy: 'NONE' };
  if (f.conversations < m.minConversations) return { diagnosis: 'ACTIVITY_PROBLEM', remedy: 'ACQUISITION_MISSION' };
  if (f.quotes >= m.quotes) return { diagnosis: 'CLOSING_PROBLEM', remedy: 'objection-handling' };
  if (f.qualifiedLeads < Math.ceil(f.conversations / 2)) {
    return { diagnosis: 'QUALIFICATION_PROBLEM', remedy: 'requirement-discovery' };
  }
  return f.quotes > 0 ? { diagnosis: 'CLOSING_PROBLEM', remedy: 'objection-handling' } : { diagnosis: 'QUALIFICATION_PROBLEM', remedy: 'requirement-discovery' };
}
