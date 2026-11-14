# EW VERDORA Agent OS — AI Assist Roadmap

## Product direction

Agent OS is a selling assistant, not an exam-first product. The default experience should answer three questions immediately: **who should I contact, what should I say, and what should I do next?** Certification remains required for taking orders, but learning is embedded as one-line guidance inside real selling actions.

All AI assists must obey the existing AI safety rules: never invent prices or discounts, never promise an exact replica, never direct payment to a private account, never reveal suppliers/cost/profit, never fabricate reviews or scarcity, redact customer phone/email before Gemini, never send IC data/images to AI, and never auto-send on behalf of an Agent.

## Ranked opportunities

| Rank | AI assist | Agent pain solved | Where / tap | Data + method | Approx. Gemini calls / Agent / day |
|---|---|---|---|---|---:|
| 1 | **Today First — 今日先联系谁** | Agents do not know which customer to contact first or what to say. | Home first screen → “今天先联系” → each customer card has “帮我写这一句” / “Copy message”. | Existing `lead_score`, `next_best_action`, `best_followup_time`; deterministic ranking first, Gemini only to generate the personalized next line, with template fallback. | 3–5 |
| 2 | **Conversation → Customer — 对话变客人** | Copying WhatsApp details into a customer record is slow and error-prone. | Customer screen → “贴上对话，帮我整理” → review extracted occasion/date/area/budget → “建立客人”. | Redacted pasted conversation; Gemini structured extraction + strict schema validation; template/manual form fallback. | 1–3 |
| 3 | **Objection Helper — 客人这样说，我怎么回** | Agents freeze on “太贵 / 再想想 / 要一样的 / 已经问别人”. | Customer conversation tools → “不知道怎么回” → choose objection or paste message → 3 reply styles → copy. | Redacted latest customer message + Agent `profileBrief()` + RULES; Gemini constrained generation; curated fallback replies. | 1–4 |
| 4 | **Follow-up Scheduler — 下次什么时候找他** | Agents forget follow-ups or contact at the wrong time. | After generating/copying a reply → “提醒我下次联系” → one-tap suggested date/time. | Existing `best_followup_time` + recent interaction timing + deterministic rules; Gemini only when context is ambiguous. | 0–1 |
| 5 | **Repeat Customer Nudge — 旧客回购提醒** | Previous buyers are forgotten even though they are easier to convert. | Home → “旧客可以再问” → event/season cards → “写一句问候”. | Order/customer history, prior occasion/date, local season calendar; rules to find candidates, Gemini to write the greeting; template fallback. | 1–3 |
| 6 | **Micro Coach — 做的时候教一句** | Training feels separate from earning; Agents repeat weak selling habits. | Inline above quote/reply/post buttons, one short tip only, e.g. “先确认日期，再谈款式”. | `profileBrief()` weaknesses + current action + rule library; mostly rules, Gemini only for a personalized tip when useful. | 0–1 |
| 7 | **Festival Opportunity — 节日前该找谁** | Agents react too late to seasonal demand. | Home 7 days before major Kuching/Malaysia occasions → “这周可以先做” → customer list + ready post. | Curated Malaysia/Sarawak calendar + old-customer/order history; rule matching; Gemini for copy only. | 1–2 |
| 8 | **Weekly Plain-Language Review — 这星期哪里最有效** | Agents see numbers but do not know what they mean. | Weekly review card → “告诉我下周怎么做”. | Channel/contact/order counts + simple statistics; Gemini explains in plain Chinese/English with actions. | 1 |
| 9 | **One-tap Trilingual Reply — 中英马来文一键转换** | Agents may understand the customer but struggle to write naturally in another language. | Beside reply draft → 中文 / English / BM buttons. | Redacted message + approved draft; Gemini translation with policy preservation; phrasebook fallback. | 1–3 |
| 10 | **Post From Product/Photo — 用作品直接写贴文** | Agents waste time thinking of captions for FB/IG/XHS/WA Status. | Selling kit/product detail → “帮我写贴文” → choose platform → copy. | Approved product metadata/photo description/reference analysis, platform choice, Agent style; Gemini + approved template fallback. | 1–2 |
| 11 | **Quote Readiness Check — 报价前还缺什么** | Quotes stall because date, location, budget, size or reference details are missing. | Before “申请报价” → “还缺 2 个资料” → tap to copy a question. | Required-field rules + conversation context; no Gemini unless wording is needed. | 0–1 |
| 12 | **Lost Lead Rescue — 还有机会追回吗** | Agents abandon quiet customers too early or chase hopeless ones too often. | Customer idle card → “要不要再跟一次” → recommended action + one message. | Days since reply, follow-up count, prior intent, existing lead intelligence; rule gate then Gemini copy. | 0–1 |
| 13 | **Channel Match — 这条内容发哪里更适合** | Agents post the same content everywhere and get weak response. | Content card → “适合发哪里” → WA Status / FB Group / IG / XHS recommendation. | Agent historical channel outcomes + content type; statistics/rules, Gemini only for platform-specific rewrite. | 0–1 |
| 14 | **Customer Summary — 这个客人现在到哪里了** | Long chats become hard to remember. | Customer header → “帮我整理一下” → 4-line summary: occasion, date, wants, next step. | Redacted conversation + structured customer/order data; Gemini summarization + deterministic fallback. | 1–2 |

## First 6 selected for implementation

### 1. Today First — 今日先联系谁
**Why first:** highest direct impact on orders and can reuse the existing customer intelligence fields. Ranking can be deterministic, so Gemini is only spent on the message itself.

### 2. Conversation → Customer — 对话变客人
**Why first:** removes the biggest data-entry friction. Better customer records also improve every later AI feature.

### 3. Objection Helper — 客人这样说，我怎么回
**Why first:** occurs at the exact moment a sale can be won or lost, and can reuse the existing safety layer and `profileBrief()`.

### 4. Follow-up Scheduler — 下次什么时候找他
**Why first:** cheap to run because rules and existing `best_followup_time` do most of the work; it prevents missed follow-ups without adding another “training” screen.

### 5. Repeat Customer Nudge — 旧客回购提醒
**Why first:** targets customers with existing trust, so the expected conversion lift is high and the UI can be simple: candidate → ready greeting → copy.

### 6. Micro Coach — 做的时候教一句
**Why first:** directly implements the Owner direction to hide learning inside work. It can be mostly rule-based, costs almost no Gemini quota, and improves the quality of quotes/replies/posts without blocking the Agent.

## Quota design principle

The six selected features are designed to stay within free Gemini usage by using rules/statistics for ranking, timing, eligibility and validation, and calling Gemini only for language generation or ambiguous extraction. A typical active Agent should generate roughly **6–15 Gemini calls/day across these six assists**, not one call for every screen view. Each new action must have its own `ai_policy.daily_limits` entry and must fail gracefully to a clearly labelled **“模板 / Template”** result when Gemini is unavailable or the daily limit is reached.

## UX acceptance rule (“Auntie test”)

For a first-time, 50-year-old phone user, every screen must make the next action obvious without technical terms. Use “客人 / 今天先联系 / 成交机会高 / 下次联系” instead of “lead / score / pipeline / token”. Minimum body text is 16px, primary tap targets are at least 48px, and one screen should ask for only one decision. AI output is always a suggestion with explicit “复制 / Copy” or “打开 WhatsApp / Open WhatsApp”; nothing is auto-sent.
