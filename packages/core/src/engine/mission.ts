import type { Rules } from '../config/rules';
import { diagnoseFunnel, type Diagnosis, type FunnelFacts } from './kpi';
import type { DormancyStage } from './lifecycle';

export const LEAD_SOURCES = [
  'INSTAGRAM',
  'FACEBOOK',
  'THREADS',
  'XIAOHONGSHU',
  'WHATSAPP',
  'PERSONAL_NETWORK',
  'REFERRAL',
  'PREVIOUS_CUSTOMER',
  'CORPORATE_OUTREACH',
  'OTHER',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export interface ChannelStats {
  source: LeadSource;
  leads: number;
  quotes: number;
  orders: number;
}

export interface MissionInput {
  agentId: string;
  date: string;
  /** Yesterday's (or the most recent active day's) funnel. */
  recentFunnel: FunnelFacts;
  channels: readonly ChannelStats[];
  preferredChannels: readonly LeadSource[];
  pendingFollowUps: number;
  dormancy: DormancyStage;
  requiredTrainingModules: readonly string[];
  /** Source the active campaign pushes, if any. */
  campaignPriority: LeadSource | null;
}

export type MissionItemKind = 'WARM_OUTREACH' | 'FOLLOW_UP' | 'QUALIFIED_QUOTE' | 'POST_STORY' | 'TRAINING' | 'RESTART';

export interface MissionItem {
  kind: MissionItemKind;
  target: number;
  /** i18n key; never free text, so the UI can render EN or 中文. */
  labelKey: string;
  ref: string | null;
}

export interface DailyMission {
  agentId: string;
  date: string;
  focus: Diagnosis;
  targets: { orders: number; qualifiedLeads: number; quotes: number; followUps: number };
  recommendedChannels: LeadSource[];
  items: MissionItem[];
  ruleVersion: string;
}

/**
 * Rank channels by the Agent's own Lead → Order conversion. Channels with
 * too few leads to judge borrow a neutral prior so new channels still get
 * tried, and a campaign priority breaks ties.
 */
export function rankChannels(input: Pick<MissionInput, 'channels' | 'preferredChannels' | 'campaignPriority'>, rules: Rules): LeadSource[] {
  const prior = 0.15;
  const k = rules.mission.channelMinSample;
  const scored = new Map<LeadSource, number>();
  for (const c of input.channels) scored.set(c.source, (c.orders + prior * k) / (c.leads + k));
  for (const p of input.preferredChannels) if (!scored.has(p)) scored.set(p, prior);
  if (input.campaignPriority) scored.set(input.campaignPriority, (scored.get(input.campaignPriority) ?? prior) + 0.02);
  if (scored.size === 0) return ['PERSONAL_NETWORK', 'INSTAGRAM'];
  return [...scored.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([s]) => s);
}

/**
 * The deterministic mission. The AI only rewrites it in a friendly tone in
 * the Agent's language; targets and focus come from here.
 */
export function buildMission(input: MissionInput, rules: Rules): DailyMission {
  const m = rules.mission;
  const { diagnosis } = diagnoseFunnel(input.recentFunnel, rules);
  const channels = rankChannels(input, rules);
  const items: MissionItem[] = [];

  if (input.dormancy !== 'NONE') {
    items.push({ kind: 'RESTART', target: 1, labelKey: `mission.restart.${input.dormancy}`, ref: null });
  }
  for (const mod of input.requiredTrainingModules) {
    items.push({ kind: 'TRAINING', target: 1, labelKey: 'mission.item.training', ref: mod });
  }

  let outreach = m.warmOutreach;
  let quotes = m.quotes;
  let followUps = Math.min(m.followUps, Math.max(input.pendingFollowUps, 0));
  if (diagnosis === 'ACTIVITY_PROBLEM') outreach = m.warmOutreach * 2;
  if (diagnosis === 'CLOSING_PROBLEM') {
    followUps = Math.max(followUps, Math.min(m.followUps, input.recentFunnel.quotes));
    outreach = Math.ceil(m.warmOutreach / 2);
  }
  if (diagnosis === 'QUALIFICATION_PROBLEM') quotes = Math.max(1, m.quotes - 1);
  if (input.dormancy === 'RESTART_MISSION' || input.dormancy === 'RECOVERY_MISSION') {
    outreach = Math.min(outreach, 3);
    quotes = 1;
  }

  items.push({ kind: 'WARM_OUTREACH', target: outreach, labelKey: 'mission.item.warmOutreach', ref: channels[0] ?? null });
  if (followUps > 0) items.push({ kind: 'FOLLOW_UP', target: followUps, labelKey: 'mission.item.followUp', ref: null });
  items.push({ kind: 'QUALIFIED_QUOTE', target: quotes, labelKey: 'mission.item.quote', ref: null });
  if (channels.includes('INSTAGRAM') || channels.includes('FACEBOOK')) {
    items.push({ kind: 'POST_STORY', target: 1, labelKey: 'mission.item.story', ref: channels.includes('INSTAGRAM') ? 'INSTAGRAM' : 'FACEBOOK' });
  }

  return {
    agentId: input.agentId,
    date: input.date,
    focus: diagnosis,
    targets: { orders: m.orderTarget, qualifiedLeads: m.qualifiedLeads, quotes, followUps },
    recommendedChannels: channels,
    items,
    ruleVersion: rules.version,
  };
}
