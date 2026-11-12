/**
 * Provider-neutral AI interface. Application code depends only on this;
 * switching OpenAI ↔ Anthropic ↔ any OpenAI-compatible endpoint is an
 * environment change (AI_PROVIDER / AI_MODEL), not a code change.
 * Server-side only: these modules read API keys and must never be bundled
 * for the browser.
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  system: string;
  messages: ChatMessage[];
  /** Ask for a single JSON object as the whole reply. */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface AiProvider {
  readonly name: string;
  complete(req: CompletionRequest): Promise<string>;
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export class AiProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number,
    detail: string,
  ) {
    super(`${provider} request failed (${status}): ${detail.slice(0, 200)}`);
  }
}

/** OpenAI Chat Completions, and any endpoint compatible with it. */
export function openAiProvider(opts: { apiKey: string; model: string; baseUrl?: string; fetch?: FetchLike }): AiProvider {
  const doFetch = opts.fetch ?? (globalThis.fetch as unknown as FetchLike);
  const base = (opts.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  return {
    name: 'openai',
    async complete(req) {
      const res = await doFetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${opts.apiKey}` },
        body: JSON.stringify({
          model: opts.model,
          messages: [{ role: 'system', content: req.system }, ...req.messages],
          ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
          ...(req.maxTokens !== undefined ? { max_completion_tokens: req.maxTokens } : {}),
          ...(req.json ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (!res.ok) throw new AiProviderError('openai', res.status, await res.text());
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (typeof text !== 'string') throw new AiProviderError('openai', res.status, 'empty completion');
      return text;
    },
  };
}

/** Anthropic Messages API. */
export function anthropicProvider(opts: { apiKey: string; model: string; fetch?: FetchLike }): AiProvider {
  const doFetch = opts.fetch ?? (globalThis.fetch as unknown as FetchLike);
  return {
    name: 'anthropic',
    async complete(req) {
      const system = req.json ? `${req.system}\n\nReply with one JSON object and nothing else.` : req.system;
      const res = await doFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': opts.apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: opts.model,
          system,
          messages: req.messages,
          max_tokens: req.maxTokens ?? 1024,
          ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        }),
      });
      if (!res.ok) throw new AiProviderError('anthropic', res.status, await res.text());
      const data = (await res.json()) as { content?: { type: string; text?: string }[] };
      const text = data.content?.find((b) => b.type === 'text')?.text;
      if (typeof text !== 'string') throw new AiProviderError('anthropic', res.status, 'empty completion');
      return text;
    },
  };
}

/** Deterministic provider for tests, the simulation and keyless local runs. */
export function mockProvider(reply: string | ((req: CompletionRequest) => string)): AiProvider {
  return {
    name: 'mock',
    async complete(req) {
      return typeof reply === 'function' ? reply(req) : reply;
    },
  };
}

export function providerFromEnv(env: Record<string, string | undefined>, fetchImpl?: FetchLike): AiProvider {
  const kind = (env.AI_PROVIDER ?? 'openai').toLowerCase();
  if (kind === 'mock') return mockProvider('{}');
  const model = env.AI_MODEL;
  if (!model) throw new Error('AI_MODEL is not set');
  if (kind === 'openai') {
    if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
    return openAiProvider({ apiKey: env.OPENAI_API_KEY, model, baseUrl: env.OPENAI_BASE_URL || undefined, fetch: fetchImpl });
  }
  if (kind === 'anthropic') {
    if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
    return anthropicProvider({ apiKey: env.ANTHROPIC_API_KEY, model, fetch: fetchImpl });
  }
  throw new Error(`Unknown AI_PROVIDER: ${kind}`);
}
