# EW VERDORA Agent OS — AI Assist Roadmap

## Product principle
The Agent App is a selling assistant, not a learning portal. The default experience should answer four questions before the Agent has to think:
1. Who should I contact now?
2. What should I say?
3. What should I do next?
4. When should I follow up?

Training stays only where certification is mandatory. Everywhere else, coaching is embedded at the moment of work.

## Guardrails
- AI suggests; the Agent must tap Copy / Open WhatsApp before anything is sent.
- AI never invents price, discount, flower availability, exact-copy promises, fake reviews, fake scarcity, private payment instructions, suppliers, internal cost or margin.
- Customer phone/email/NRIC/KYC paths are redacted before model calls.
- AI may access only the signed-in Agent's data.
- Every Gemini action has a deterministic template fallback and a daily quota.
- UI words are plain-language and bilingual; no technical terms such as lead, pipeline, token or AI score.

## Ranked opportunities

| Rank | AI assist | Agent pain solved | Where / tap | Data + algorithm | Approx Gemini/day |
|---|---|---|---|---|---:|
| 1 | WhatsApp conversation → customer card | Agent must retype occasion, budget, date and area from chat | Customers → “Paste customer chat” → “Read chat” → “Create customer” | Gemini JSON extraction after redact; deterministic keyword fallback | 8–12 |
| 2 | “Today first” contact queue | Agent does not know which customers deserve attention first | Today → “Who should I contact first?” | Existing lead_score + best_followup_time + next_best_action; Gemini writes one message for top 3 | 3–6 |
| 3 | One-tap next follow-up time | Agent forgets when to contact again after replying | Customer → generated reply → “Set next follow-up” | Existing next_message hours + schedule_followup; rules clamp 4–72h | 5–10 |
| 4 | Objection helper with 3 reply styles | “Too expensive / think first / exact same” causes agents to freeze | Customer → “Customer says…” → choose objection → “Give me 3 replies” | Gemini constrained JSON + rule templates | 5–10 |
| 5 | In-context micro coaching | Agent repeats personal weak points but does not want lessons | Before copy/send on quote/follow-up | profileBrief weaknesses + current action; Gemini 1-sentence tip + deterministic weakness rule | 2–5 |
| 6 | One-tap tri-language reply | Agent understands customer intent but struggles to answer in the customer's language | Customer reply card → 中文 / English / BM | Gemini translation preserving meaning and policy; deterministic safe fallback | 3–8 |
| 7 | Festival selling planner | Agent notices seasonal demand too late | Today, 7 days before local festival | Kuching/Sarawak calendar rules + old customer occasions + Gemini copy | 1–3 |
| 8 | Previous-customer repurchase reminder | Agent forgets people who bought last year | Today → “People worth checking in with” | historical orders/occasions + date window + Gemini greeting | 2–5 |
| 9 | Weekly performance explanation | Dashboards show numbers but not what to change | Performance → “What should I do next week?” | channel conversion statistics + Gemini summary | 1 |
| 10 | Photo post writer | Agent has EW VERDORA work photos but cannot write platform-native captions | Selling → choose approved photo → platform | approved asset metadata + Gemini platform copy | 2–5 |
| 11 | Quote-send checklist | Agent misses one key detail before sending | Quote screen before Copy / WhatsApp | deterministic rules + one optional Gemini micro-tip | 0–2 |
| 12 | No-reply rescue | Agent either gives up too early or spams | Customer → “No reply” | event timestamps + rules + next_message | 2–5 |
| 13 | Conversation summary | Long WhatsApp threads are hard to remember | Customer detail → “Summarise” | redacted customer chat + Gemini structured summary | 2–4 |
| 14 | Channel recommendation | Agent posts everywhere without knowing what works | Selling home | own 30/90-day channel conversion statistics; rules first, Gemini explanation | 1–2 |

## First six selected
The first six are selected by **sales impact × implementation speed × low operational risk**.

1. **WhatsApp conversation → customer card** — removes the biggest data-entry friction and makes every later AI feature better because customer data becomes structured.
2. **Today first contact queue** — turns existing intelligence into an immediately executable selling list rather than another dashboard.
3. **One-tap next follow-up time** — closes the loop after every AI-written message and directly improves follow-up discipline.
4. **Objection helper with 3 reply styles** — high-frequency blocker, fast to ship because the existing coach and safety rules can be reused.
5. **In-context micro coaching** — replaces extra training screens with one timely sentence tied to the Agent's own weakness.
6. **One-tap tri-language reply** — directly useful in Kuching's mixed-language customer conversations and reduces hesitation.

## Free Gemini budget
At normal use, the six features are expected to add about **26–51 Gemini calls per active Agent per day** at the upper end. Each action has its own quota, while deterministic fallback remains available when Gemini is unavailable or a daily cap is reached. Existing caching should be used wherever a result is reusable for the same day.

## Auntie test
A first-time 50-year-old user should be able to:
- open Today and see exactly who to contact first;
- tap one customer and see the exact next message;
- copy it or open WhatsApp herself;
- paste an incoming customer chat and create a customer without typing the same details again;
- understand “Template” when Gemini is unavailable;
- never see words such as token, lead score, pipeline, JSON, model or API.

Potential sticking points to watch in usability testing:
- “Budget” may be unknown in early chats; creating a customer must still work.
- Mixed Chinese/English/Malay dates such as “next Sat” need a clear confirmation if extraction is uncertain.
- A generated follow-up time must show an exact local time before the Agent confirms.
- Translation buttons must say the destination language plainly.
- Any AI-generated text must look editable/copied, never like it was already sent.
