# EW VERDORA Agent OS — AI Assist Roadmap

Goal: the Agent opens the app and immediately knows **who to contact, what to say, and what to do next**. Certification stays mandatory, but learning is embedded in real work instead of adding more exams.

## Ranking method
Priority = direct effect on conversion × speed to ship × free-Gemini affordability. The first six are the implementation set for v1.

| Rank | AI assist | Agent pain solved | Where / what Agent presses | Data + method | Approx Gemini calls / Agent / day |
|---|---|---|---|---|---:|
| **1** | **Paste chat → create customer draft** | Re-typing WhatsApp details is slow and people miss occasion/date/budget/area | New customer: paste conversation → **“帮我整理” / “Organise for me”** → review → save | Redacted pasted text → Gemini JSON extraction; deterministic regex/template fallback; never extracts/sends IC | 2–4 |
| **2** | **Today first contacts** | Agent does not know which customer deserves attention first | Today screen → **“今天先联系谁” / “Who first today”**; each card already contains a suggested message | Own leads only; existing lead_score / next_best_action / best_followup_time + rules; one Gemini call to phrase top messages, deterministic ordering fallback | 1–2 |
| **3** | **Next follow-up time** | Agent gets a reply, then forgets when to follow up | Customer detail after suggested reply → **“安排下次跟进” / “Set next follow-up”** → confirm | Own lead state + latest outcome + existing best_followup_time; Gemini suggests human-readable reason/time bucket, rules fallback | 2–5 |
| **4** | **Objection reply helper** | “Too expensive / think first / want same” causes weak or unsafe replies | Customer detail → **“客人这样说” / “Customer said this”** → paste → get 3 reply choices → copy | Redacted customer message + own agent profile; Gemini produces 3 compliant variants; scenario templates fallback | 2–6 |
| **5** | **Translate customer + reply** | Many Agents can sell but hesitate across BM/EN/中文 | Customer detail → **“翻译并帮我回” / “Translate + reply”** → copy | Redacted text + target language; Gemini translation/reply; safe phrasebook fallback | 2–5 |
| **6** | **Work-time micro tip** | Weaknesses are learned too late in training instead of at the point of sale | Before quote/follow-up/send: one short tip appears; **“知道了” / “Got it”** | Own AI profile weakness + current screen/action; Gemini one-sentence coaching; rules fallback; no scoring | 1–3 |
| 7 | Old-customer comeback | Agent forgets previous buyers who may need flowers again | Today → “旧客可以问谁” | Own historical won orders + event date windows; rules shortlist + Gemini greeting | 1–2 |
| 8 | Festival opportunity planner | Agents start festive selling too late | Today card 7 days before key Kuching/Malaysia occasions | Curated calendar + own previous customers; rules + Gemini copy | 0–1 |
| 9 | Weekly performance explanation | Dashboards are hard for ordinary users to interpret | Performance → “告诉我下周做什么” | Own channel/order/follow-up stats; rule summary + Gemini explanation | 1/week |
| 10 | Photo → posting angle | Agent has approved artwork but does not know how to post it | Selling Kit → choose approved EW VERDORA work → “帮我写贴文” | Approved image metadata/reference analysis + platform rules + Gemini; caption template fallback | 1–3 |
| 11 | Voice-note brief organiser | Agent receives messy voice-note notes and misses details | New customer → paste transcript → organise | Device/user transcript text only, redacted before Gemini; same extraction as #1 | 1–2 |
| 12 | Quote-send checklist | Agent forgets delivery/date/official-payment wording | Before opening WhatsApp quote message | Rule engine first; Gemini only if wording needs adaptation | 0–1 |
| 13 | Lost-customer recovery prompt | Agent marks “lost” but does not know whether to retry later | Lost customer detail → “以后还能怎么跟” | Existing lost_review + own history + rule timing | 0–1 |

## v1 selected six — why
1. **Paste chat → create customer draft**: removes the biggest mobile friction at the very first sales step.
2. **Today first contacts**: converts existing intelligence into a concrete “do this now” queue instead of showing scores.
3. **Next follow-up time**: prevents warm enquiries from disappearing after one reply.
4. **Objection reply helper**: directly improves the moments where a sale is most likely to be lost and enforces pricing/reference rules.
5. **Translate customer + reply**: high impact in Kuching’s mixed-language conversations and very fast to ship.
6. **Work-time micro tip**: turns learning into one sentence at the moment of work, matching the product direction without adding exams.

## Safety / product invariants for all six
- Only the signed-in Agent's own rows may be read.
- Phone/email are redacted before Gemini. NRIC/IC numbers and KYC photo paths must never be sent.
- Gemini may suggest only. Agent must press **Copy** or **Open WhatsApp**.
- No invented prices/discounts, exact-copy promises, personal payment accounts, supplier/cost/margin disclosure, fake reviews, or fake scarcity.
- Every Gemini path has a deterministic template fallback. Fallback cards must show **Template / 模板**.
- Every new action gets a daily quota in `private.system_settings.ai_policy.daily_limits`.
- UI copy avoids “lead / pipeline / AI score / token”; minimum 16px text and 48px tap targets.
- English + Malaysian-Chinese wording for every new surface.
- Commission, tier, bonus and profit-guard logic remain untouched.

## Initial free-tier call budget
Expected v1 usage is about **10–25 Gemini calls per active Agent/day** if the Agent actively uses all six. Quotas should be set per action so one feature cannot consume the whole allowance. Cached/rule-only results should not consume Gemini. If Gemini is unavailable or quota is exhausted, the task must still be usable with the labelled template fallback.
