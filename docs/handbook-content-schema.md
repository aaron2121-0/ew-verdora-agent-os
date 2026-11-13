# EW VERDORA — Grok Handbook Content JSON Schema (v1.0)

This contract defines the **handbook_content.json** produced by Grok and imported by the Owner. It is not the MCQ question-bank schema.

## Example

\`\`\`json
{
  "schema_version": "1.0",
  "source": "grok",
  "entries": [
    {
      "section": "product_line",
      "title_en": "Condolence",
      "title_zh": "帛事花圈",
      "body_en": "Describe only Owner-confirmed services; ask the team to confirm availability, price and delivery.",
      "body_zh": "仅描述 Owner 已确认的服务；库存、价格及配送必须向团队核实。",
      "sort": 20
    }
  ]
}
\`\`\`

This is a structural example, **not an authorization to publish product claims**. Production imports must use Owner-confirmed source facts.

## Root object

| Field | Type | Required | Rule |
| --- | --- | --- | --- |
| schema_version | string | Yes | Exactly \`"1.0"\` |
| source | string | Yes | Exactly \`"grok"\` |
| entries | array | Yes | 1–100 handbook entries |
| generated_at | string | No | ISO 8601 UTC timestamp (e.g. \`2026-11-13T06:00:00Z\`) |

No unknown root fields are accepted. UTF-8 JSON payload is limited to **256 KiB**.

## Entry object

| Field | Type | Required | Rule |
| --- | --- | --- | --- |
| section | enum | Yes | \`story\`, \`product_line\`, \`service_rule\`, \`delivery\`, \`script\`, \`announcement\` |
| title_en / title_zh | string | Yes | Non-empty, trim whitespace, max 120 characters each |
| body_en / body_zh | string | Yes | Non-empty, trim whitespace, max 10,000 characters each |
| sort | integer | No | From -10,000 to 10,000; default \`0\` |

No unknown entry fields. In particular, Grok must **not** submit \`id\`, \`active\`, \`visible_to_agent\`, \`needs_owner_confirm\`, \`updated_by\`, approval states or authorisation fields. These are server-controlled.

## Import API and security

The existing authenticated \`owner-session\` Edge Function accepts:

\`\`\`json
{"action":"handbook_import","content":{"schema_version":"1.0","source":"grok","entries":[]}}
\`\`\`

The example above shows the API envelope only; an **empty entries array is invalid**.

- Only \`owner\` may import, review or publish; \`admin\`, \`agent\`, unassigned and anonymous users receive **403/401** as appropriate.
- Validate the whole payload **before** database writes. Reject the entire batch on malformed JSON, unsupported schema, oversized input or bad fields. Never trust the source label as authority.
- Imported entries are created with \`active=false\`, \`visible_to_agent=false\`, \`needs_owner_confirm=true\`. They are **not** included in Agent handbook responses or AI retrieval.
- Owner reviews \`handbook_pending\` and sends \`{"action":"handbook_review","id":"<uuid>","decision":"approve"}\` or \`"reject"\`.
- Approval requires explicit Owner action and an audit event; only then set \`active=true\`, \`visible_to_agent=true\`, \`needs_owner_confirm=false\`.
- Rejection stays invisible to Agents. Every Agent read must filter **all three flags**, independently of any UI visibility state.
- For the Owner UI, upload a local \`.json\` file and send its parsed content in the above request. No secret key or service role credential is exposed to the client.

**Owner review checklist:** verify every product/service and geographic claim, no invented stock, flower quality, price, delivery promises, testimonials, ratings, or addresses. The file is draft knowledge until approved.

## Required course linkage

\`public.training_modules.handbook_section\` is a \`public.handbook_section\` enum. Required active courses must have a non-null section. Agent training displays a bilingual “Read handbook first / 先看手册” button and loads only approved entries in the linked section.

Existing seven required modules are linked without creating or changing any MCQ \`skill_code\`:

| training_modules.code | handbook_section |
| --- | --- |
| CORE-BRAND | story |
| LEAD-FINDING | product_line |
| QUALIFY | product_line |
| REFERENCE | service_rule |
| OBJECTION | script |
| CLOSING | script |
| PAYMENT | service_rule |

## MCQ is separate

Product-handbook MCQs use the **existing** \`scripts/training-bank-import.mjs\` and its existing \`bank_type\`, \`skill_code\` and question format. Valid \`skill_code\` values remain exactly \`LEAD-FINDING\`, \`QUALIFY\`, \`REFERENCE\`, \`OBJECTION\`, \`CLOSING\`, \`PAYMENT\`; \`CORE-BRAND\` is a required **course**, not a new MCQ skill code. Do not change the exam/pass/unlock rules. Run validation before importing, and do not apply a formal bank unless its required question counts pass existing checks.

## Review gate

This supplement is review-only. Keep the existing Phase A → Claude approval → Phase B → Claude approval → Phase C delivery flow. Do not apply migrations, deploy Edge Functions, build/redeploy Railway bundles or publish Agent UI before explicit approval.
