import assert from 'node:assert/strict';
import { test } from 'node:test';
import { anthropicProvider, mockProvider, openAiProvider, providerFromEnv, type FetchLike } from '../src/ai/provider';
import { classifyEnquiry, coachReply, scoreRoleplay, type CoachContext } from '../src/ai/services';
import { DEFAULT_RULES } from '../src/config/rules';
import { dictionaries, resolveLocale, t } from '../src/i18n';
import { rm } from '../src/money';
import { runSimulation } from '../src/sim/simulate';

const rules = DEFAULT_RULES;

function fakeFetch(body: unknown, capture: { url?: string; headers?: Record<string, string>; body?: Record<string, unknown> } = {}): FetchLike {
  return async (url, init) => {
    capture.url = url;
    capture.headers = init.headers;
    capture.body = JSON.parse(init.body) as Record<string, unknown>;
    return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
  };
}

test('ai: the same request works through OpenAI and Anthropic adapters', async () => {
  const seenOpenAi: { url?: string; headers?: Record<string, string>; body?: Record<string, unknown> } = {};
  const openai = openAiProvider({ apiKey: 'test-key', model: 'model-x', fetch: fakeFetch({ choices: [{ message: { content: 'hello' } }] }, seenOpenAi) });
  assert.equal(await openai.complete({ system: 's', messages: [{ role: 'user', content: 'hi' }], json: true }), 'hello');
  assert.match(seenOpenAi.url ?? '', /\/chat\/completions$/);
  assert.equal(seenOpenAi.body?.model, 'model-x');

  const seenAnthropic: { url?: string; headers?: Record<string, string>; body?: Record<string, unknown> } = {};
  const anthropic = anthropicProvider({ apiKey: 'test-key', model: 'model-y', fetch: fakeFetch({ content: [{ type: 'text', text: 'hello' }] }, seenAnthropic) });
  assert.equal(await anthropic.complete({ system: 's', messages: [{ role: 'user', content: 'hi' }] }), 'hello');
  assert.match(seenAnthropic.url ?? '', /\/v1\/messages$/);
  assert.equal(seenAnthropic.body?.system, 's');
});

test('ai: provider is chosen from environment, and missing config fails loudly', () => {
  assert.equal(providerFromEnv({ AI_PROVIDER: 'mock' }).name, 'mock');
  assert.equal(providerFromEnv({ AI_PROVIDER: 'anthropic', AI_MODEL: 'm', ANTHROPIC_API_KEY: 'k' }).name, 'anthropic');
  assert.equal(providerFromEnv({ AI_MODEL: 'm', OPENAI_API_KEY: 'k' }).name, 'openai');
  assert.throws(() => providerFromEnv({ AI_PROVIDER: 'openai', AI_MODEL: 'm' }), /OPENAI_API_KEY/);
  assert.throws(() => providerFromEnv({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'k' }), /AI_MODEL/);
});

test('ai: roleplay — the model scores, the rule engine certifies', async () => {
  const generous = mockProvider(JSON.stringify({ requirementDiscovery: 20, customerHandling: 20, closingAbility: 20, pricingDiscipline: 20, policyCompliance: 20, feedback: 'Great.' }));
  const clean = await scoreRoleplay(generous, {
    locale: 'en', rules,
    transcript: [
      { role: 'assistant', content: 'Hi, this one RM300 can do?' },
      { role: 'user', content: 'Thanks for asking! For RM300 I can request an official quote. What is the occasion and delivery date? The design will be similar / adapted.' },
    ],
  });
  assert.equal(clean.result.passed, true);
  assert.deepEqual(clean.findings, []);

  // Same generous model, but the Agent overpromised and invented a price.
  const breached = await scoreRoleplay(generous, {
    locale: 'en', rules,
    transcript: [
      { role: 'assistant', content: 'Hi, this one RM300 can do?' },
      { role: 'user', content: 'Yes 100% same as the photo, I do RM250 for you.' },
    ],
  });
  assert.equal(breached.result.passed, false);
  assert.equal(breached.result.total, 60);
  assert.deepEqual(breached.result.assignedModules.sort(), ['pricing-discipline', 'reference-promise-compliance']);
});

const coachCtx = (o: Partial<CoachContext> = {}): CoachContext => ({
  locale: 'en', agentTier: 'ACTIVE',
  lead: { occasion: 'BIRTHDAY', budgetSen: rm(300), deliveryDate: '2026-11-14', deliveryTime: '15:00', referenceImageNote: 'pink roses, round', status: 'QUOTED', source: 'INSTAGRAM' },
  approvedQuoteSen: rm(320), sellingKitNotes: null, campaignNotes: null, question: 'Customer says too expensive, what do I reply?', recentMessages: [], ...o,
});

test('ai coach: a compliant suggestion passes through', async () => {
  const ai = mockProvider('Totally understand! The RM320 quote covers premium fresh roses arranged similar to your reference. Shall I lock the 3pm slot for you?');
  const reply = await coachReply(ai, coachCtx());
  assert.equal(reply.blocked, false);
});

test('ai coach: invented discounts, exact-copy promises and cost talk are blocked', async () => {
  for (const bad of [
    'Tell her: ok I give you discount, RM280 only.',
    'Tell her it will be 100% same as the photo.',
    'Explain that our supplier raised the cost price.',
    'Ask her to transfer to my account directly.',
  ]) {
    const reply = await coachReply(mockProvider(bad), coachCtx());
    assert.equal(reply.blocked, true, bad);
    assert.ok(!reply.suggestion.includes('discount, RM280'));
  }
  const zh = await coachReply(mockProvider('告诉她保证一模一样'), coachCtx({ locale: 'zh' }));
  assert.equal(zh.blocked, true);
  assert.match(zh.suggestion, /正式报价/);
});

test('ai coach: the prompt never contains internal fields, and internal context is refused', async () => {
  let seen = '';
  const ai = mockProvider((req) => {
    seen = req.system;
    return 'Follow up tomorrow morning.';
  });
  await coachReply(ai, coachCtx());
  assert.doesNotMatch(seen, /procurement|maximum buy|ceiling/i);
  const poisoned = { ...coachCtx(), lead: { ...coachCtx().lead, procurementCeilingSen: 6000 } } as unknown as CoachContext;
  await assert.rejects(() => coachReply(ai, poisoned), /Internal fields/);
});

test('ai: enquiry classification is validated', async () => {
  const ok = await classifyEnquiry(mockProvider('Sure: {"occasion":"OPENING","budgetRm":300,"urgency":"THIS_WEEK","qualified":true}'), 'Need opening stand Friday, RM300');
  assert.equal(ok.occasion, 'OPENING');
  await assert.rejects(() => classifyEnquiry(mockProvider('{"occasion":"PARTY","budgetRm":1,"urgency":"UNKNOWN","qualified":false}'), 'x'));
});

test('i18n: English and 中文 dictionaries have identical keys and placeholders', () => {
  const enKeys = Object.keys(dictionaries.en).sort();
  assert.deepEqual(Object.keys(dictionaries.zh).sort(), enKeys);
  const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();
  for (const key of enKeys as (keyof typeof dictionaries.en)[]) {
    assert.ok(dictionaries.zh[key].trim().length > 0, key);
    assert.deepEqual(placeholders(dictionaries.zh[key]), placeholders(dictionaries.en[key]), key);
  }
  assert.equal(t('en', 'mission.item.followUp', { n: 8 }), '8 follow-ups');
  assert.equal(t('zh', 'mission.item.followUp', { n: 8 }), '跟进 8 位客户');
  assert.equal(resolveLocale('zh', 'en-US'), 'zh');
  assert.equal(resolveLocale(null, 'zh-CN,zh;q=0.9'), 'zh');
  assert.equal(resolveLocale('fr', 'en-GB'), 'en');
});

test('simulation: 10 agents × 5 enquiries runs through the real engine', () => {
  const r = runSimulation();
  assert.equal(r.agents.length, 10);
  assert.equal(r.totals.enquiries, 50);
  assert.ok(r.totals.quotes > 0 && r.totals.quotes <= r.totals.qualified);
  assert.ok(r.totals.orders > 0 && r.totals.orders <= r.totals.quotes);
  // Totals are derived, not hard-coded.
  assert.equal(r.totals.orders, r.agents.reduce((s, a) => s + a.orders, 0));
  assert.equal(r.totals.commissionSen, r.agents.reduce((s, a) => s + a.commissionSen, 0));
  // Same seed → same day; different seed → a different day.
  assert.deepEqual(runSimulation(), r);
  assert.notDeepEqual(runSimulation({ seed: 7 }).totals, r.totals);
});

test('simulation: routine situations are automatic; only the serious case reaches the Owner', () => {
  for (const seed of [20261112, 1, 2, 3, 99]) {
    const r = runSimulation({ seed });
    assert.equal(r.agentsHandledAutomatically, 9, `seed ${seed}`);
    assert.deepEqual(r.exceptions.map((e) => e.agentCode), ['A10']);
    assert.equal(r.exceptions[0]?.recommendedAction, 'TEMPORARY_FREEZE');
    assert.ok(r.situations.filter((s) => s.handledBy === 'OWNER').every((s) => s.agentCode === 'A10'));
    const byCode = Object.fromEntries(r.agents.map((a) => [a.code, a]));
    // Overpromise: warned, trained, restricted, then restored — no Owner.
    assert.deepEqual(byCode.A05?.enforcement, ['WARN', 'MICRO_TRAINING', 'TEMP_RESTRICTION']);
    assert.equal(byCode.A05?.status, 'ACTIVE');
    assert.ok(byCode.A05?.trainingAssigned.includes('reference-promise-compliance'));
    // Quality gap keeps PRO despite Elite-level volume.
    assert.equal(byCode.A08?.tierAfter, 'PRO');
    assert.ok(byCode.A08?.missingForNext.includes('quality'));
    assert.equal(byCode.A01?.dormancy, 'RECOVERY_MISSION');
    // Every duplicated payment event was ignored.
    assert.equal(r.totals.duplicateEventsIgnored, r.agents.filter((a) => a.orders > 0).length);
    // Today's bonuses wait for profit verification.
    assert.ok(r.agents.flatMap((a) => a.bonuses).every((b) => b.status === 'PENDING_PROFIT_QUALIFICATION'));
  }
});
