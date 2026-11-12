import { z } from 'zod';
import { ROLEPLAY_CATEGORIES, type Rules } from '../config/rules';
import { auditMessage, pricesIn, type Finding } from '../engine/audit';
import { gradeExam, type ExamResult, type RoleplayScores } from '../engine/lifecycle';
import { assertAgentSafe } from '../engine/visibility';
import type { Locale } from '../i18n';
import { formatRM, type Sen } from '../money';
import type { AiProvider, ChatMessage } from './provider';

const LANGUAGE: Record<Locale, string> = { en: 'English', zh: 'Simplified Chinese (中文)' };

const POLICY = `EW VERDORA rules you must always follow:
- Never invent, change or hint at a price or discount. Only the approved quote may be stated.
- Never promise an exact copy of a reference photo. Designs are "similar / adapted", flowers depend on availability.
- Customer payment goes to EW VERDORA through the official payment route only, never to an Agent personally.
- Never mention costs, suppliers, partner florists, margins or how prices are calculated.`;

function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('AI reply contained no JSON object');
  return JSON.parse(text.slice(start, end + 1));
}

/* ---------- Roleplay exam ---------- */

export interface RoleplayScenario {
  id: string;
  /** Customer persona and situation, written for the model. */
  brief: string;
  openingLine: Record<Locale, string>;
}

export const ROLEPLAY_SCENARIOS: readonly RoleplayScenario[] = [
  {
    id: 'budget-rm300-reference',
    brief: 'A customer in Kuching sends a reference photo of a large bouquet and asks if RM300 can do it. They want it to look the same and will push for a discount once.',
    openingLine: { en: 'Hi, this one RM300 can do?', zh: '你好，这个 RM300 可以做吗？' },
  },
  {
    id: 'same-day-condolence',
    brief: 'A customer needs a condolence stand delivered today. They are stressed, short on detail, and ask to pay the Agent directly to save time.',
    openingLine: { en: 'I need a condolence stand today. Can?', zh: '我今天需要一个吊唁花架，可以吗？' },
  },
  {
    id: 'think-first-anniversary',
    brief: 'A customer wants an anniversary bouquet, compares with a cheaper competitor and then says they will think about it first.',
    openingLine: { en: 'How much for an anniversary bouquet? Another shop quoted cheaper.', zh: '周年纪念花束多少钱？别家报得比较便宜。' },
  },
];

export async function roleplayCustomerTurn(ai: AiProvider, scenario: RoleplayScenario, locale: Locale, transcript: ChatMessage[]): Promise<string> {
  return ai.complete({
    system: `You are role-playing a florist customer for a sales training exam. Stay in character as the customer only.
Scenario: ${scenario.brief}
Write short, natural chat messages in ${LANGUAGE[locale]}, the way people in Kuching text. Never reveal that you are an AI or that this is a test, and never coach the Agent.`,
    // From the model's point of view the Agent is the "user".
    messages: transcript,
    temperature: 0.8,
    maxTokens: 200,
  });
}

const scoreSchema = z.object({
  requirementDiscovery: z.number(),
  customerHandling: z.number(),
  closingAbility: z.number(),
  pricingDiscipline: z.number(),
  policyCompliance: z.number(),
  feedback: z.string().default(''),
});

export interface ScoredExam {
  result: ExamResult;
  feedback: string;
  /** Policy breaches found by the rule engine in the Agent's own messages. */
  findings: Finding[];
}

/**
 * The model proposes category scores and feedback. The rule engine then
 * (1) zeroes the relevant category for any deterministic policy breach and
 * (2) applies the configured pass mark. The model cannot certify anyone.
 */
export async function scoreRoleplay(ai: AiProvider, input: { transcript: ChatMessage[]; locale: Locale; rules: Rules }): Promise<ScoredExam> {
  const max = input.rules.certification.categoryMax;
  const raw = await ai.complete({
    system: `You grade a florist sales roleplay. In the transcript, "user" is the Agent being examined and "assistant" is the customer.
${POLICY}
Score each category from 0 to ${max}: ${ROLEPLAY_CATEGORIES.join(', ')}.
Return JSON with those five numeric keys and "feedback": two short, specific sentences in ${LANGUAGE[input.locale]}.`,
    messages: [{ role: 'user', content: input.transcript.map((m) => `${m.role === 'user' ? 'AGENT' : 'CUSTOMER'}: ${m.content}`).join('\n') }],
    json: true,
    temperature: 0,
  });
  const parsed = scoreSchema.parse(extractJson(raw));
  const scores: RoleplayScores = {
    requirementDiscovery: parsed.requirementDiscovery,
    customerHandling: parsed.customerHandling,
    closingAbility: parsed.closingAbility,
    pricingDiscipline: parsed.pricingDiscipline,
    policyCompliance: parsed.policyCompliance,
  };
  const customerStatedSen = input.transcript.filter((m) => m.role === 'assistant').flatMap((m) => pricesIn(m.content));
  const findings = input.transcript
    .filter((m) => m.role === 'user')
    .flatMap((m) => auditMessage(m.content, { approvedQuoteSen: null, customerStatedSen }));
  for (const f of findings) {
    if (f.kind === 'UNAUTHORIZED_PRICE' || f.kind === 'UNAUTHORIZED_DISCOUNT') scores.pricingDiscipline = 0;
    else scores.policyCompliance = 0;
  }
  return { result: gradeExam(scores, input.rules), feedback: parsed.feedback, findings };
}

/* ---------- Live sales coach ---------- */

/** Everything the coach may know. Built from Agent-safe data only. */
export interface CoachContext {
  locale: Locale;
  agentTier: string;
  lead: {
    occasion: string | null;
    budgetSen: Sen | null;
    deliveryDate: string | null;
    deliveryTime: string | null;
    referenceImageNote: string | null;
    status: string;
    source: string;
  };
  approvedQuoteSen: Sen | null;
  sellingKitNotes: string | null;
  campaignNotes: string | null;
  question: string;
  recentMessages: ChatMessage[];
}

export interface CoachReply {
  suggestion: string;
  /** True when the model's draft broke policy and was replaced. */
  blocked: boolean;
  findings: Finding[];
}

const SAFE_FALLBACK: Record<Locale, string> = {
  en: 'Thank the customer, confirm the occasion, budget, delivery date and time, and tell them you will send the official EW VERDORA quotation shortly. Do not state a price or promise an exact copy.',
  zh: '先感谢顾客，确认场合、预算、送货日期和时间，并告诉对方您会尽快发送 EW VERDORA 的正式报价。请不要自行报价，也不要承诺一模一样。',
};

export async function coachReply(ai: AiProvider, ctx: CoachContext): Promise<CoachReply> {
  assertAgentSafe(ctx);
  const quoteLine = ctx.approvedQuoteSen !== null
    ? `Approved quote (the only price that may be stated): ${formatRM(ctx.approvedQuoteSen)}`
    : 'There is no approved quote yet: no price may be stated. Guide the Agent to request an official quote.';
  const draft = await ai.complete({
    system: `You are the EW VERDORA AI Sales Coach for a commission sales Agent.
${POLICY}
Reply in ${LANGUAGE[ctx.locale]}. Give one ready-to-send message for the customer, then one line on when to follow up. Keep it short.
Lead: ${JSON.stringify(ctx.lead)}
Agent tier: ${ctx.agentTier}
${quoteLine}
Selling kit: ${ctx.sellingKitNotes ?? 'none'}
Campaign: ${ctx.campaignNotes ?? 'none'}`,
    messages: [...ctx.recentMessages, { role: 'user', content: ctx.question }],
    temperature: 0.5,
    maxTokens: 400,
  });
  const findings = auditMessage(draft, { approvedQuoteSen: ctx.approvedQuoteSen });
  if (findings.length > 0) return { suggestion: SAFE_FALLBACK[ctx.locale], blocked: true, findings };
  return { suggestion: draft, blocked: false, findings };
}

/* ---------- Lead classification ---------- */

const classificationSchema = z.object({
  occasion: z.enum(['BIRTHDAY', 'ANNIVERSARY', 'CONDOLENCE', 'OPENING', 'PROPOSAL', 'GRADUATION', 'CORPORATE', 'WEDDING_ENQUIRY', 'GENERAL_BOUQUET']),
  budgetRm: z.number().nonnegative().nullable(),
  urgency: z.enum(['SAME_DAY', 'THIS_WEEK', 'LATER', 'UNKNOWN']),
  qualified: z.boolean(),
});
export type LeadClassification = z.infer<typeof classificationSchema>;

/** AI-assisted classification of a free-text enquiry. Advisory only. */
export async function classifyEnquiry(ai: AiProvider, text: string): Promise<LeadClassification> {
  const raw = await ai.complete({
    system: `Classify a florist customer enquiry. Return JSON: occasion (BIRTHDAY, ANNIVERSARY, CONDOLENCE, OPENING, PROPOSAL, GRADUATION, CORPORATE, WEDDING_ENQUIRY or GENERAL_BOUQUET), budgetRm (number or null), urgency (SAME_DAY, THIS_WEEK, LATER or UNKNOWN), qualified (true only if occasion, budget and delivery date are all known).`,
    messages: [{ role: 'user', content: text }],
    json: true,
    temperature: 0,
  });
  return classificationSchema.parse(extractJson(raw));
}
