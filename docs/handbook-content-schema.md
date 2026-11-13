# EW VERDORA — Reviewed Grok Handbook Import Contract

**Source of truth:** `content/handbook/handbook_content.json` on `main`, already reviewed by Claude. **Never rewrite this file** to match the importer. The importer must accept it directly.

## Production JSON shape

```json
{
  "source_version": "grok-2026-11-13-claude-reviewed",
  "cards": [
    {
      "code": "COND-1",
      "product_line": "condolence",
      "order": 1,
      "title_en": "What it is",
      "title_zh": "这是什么",
      "body_en": "Use the exact source text in the reviewed JSON.",
      "body_zh": "以已审核的 JSON 原文为准",
      "key_points_en": ["Point one", "Point two", "Point three"],
      "key_points_zh": ["重点一", "重点二", "重点三"],
      "icon_hint": "wreath"
    }
  ],
  "scripts": [
    {
      "code": "SCR-COND-1",
      "product_line": "condolence",
      "situation_en": "Hearing of a funeral",
      "situation_zh": "听到丧事",
      "text_en": "Use the exact source text.",
      "text_zh": "使用原文件的已审核内容"
    }
  ],
  "faqs": [
    {
      "code": "FAQ-01",
      "q_en": "Question",
      "q_zh": "问题",
      "a_en": "Owner-reviewed answer.",
      "a_zh": "Owner 已审核的答案"
    }
  ]
}
```

The JSON above is a **shape illustration**, not a substitute for the full reviewed JSON. The original file contains **20 cards, 15 scripts and 12 FAQs**; it must be imported without textual modification.

The root has exactly `source_version`, `cards`, `scripts`, `faqs`. Other root keys are rejected. JSON is UTF-8 and limited to 256 KiB. Each array has 1–100 items (the reviewed source has 20/15/12). Duplicate `code` values across all arrays are rejected. Titles and situation/question strings are required in both English and Chinese (1–120 chars); bodies/answers in both languages are required (1–10,000 chars). Card key-point arrays each contain **exactly three nonempty strings** (1–240 chars each). `order` is an integer 1–100, `icon_hint` is a nonempty string (max 60), and `code` uses uppercase letters/numbers/dashes (max 64). Unknown entry keys are rejected.

`product_line` is one of `condolence`, `opening`, `bouquet`, `wedding_event`, `wholesale`; FAQs have no `product_line` and are stored as null.

## Mapping to company_knowledge

| JSON source | kind | section | title fields | body fields | key points | sort |
| --- | --- | --- | --- | --- | --- | --- |
| cards | card | product_line | title_en / title_zh | body_en / body_zh | key_points_en / key_points_zh | order |
| scripts | script | script | situation_en / situation_zh | text_en / text_zh | [] / [] | source array position |
| faqs | faq | faq | q_en / q_zh | a_en / a_zh | [] / [] | source array position |

`icon_hint` is stored only for cards. `code` is a globally unique stable key for imported handbook entries. Old Phase A confirmed seeds remain `kind='seed'` with a null code, preserving their content. All imports require Owner authentication, and the **client cannot set published flags**.

Migration order, all in separate committed transactions:

1. `20261113145300_product_handbook.sql` — Claude-approved Phase A knowledge tables, seed, private bucket.
2. `20261113145900_product_handbook_faq_enum.sql` — isolated `ALTER TYPE public.handbook_section ADD VALUE 'faq'`.
3. `20261113150100_handbook_training_links.sql` — seven required courses mapped to sections.
4. `20261113150200_handbook_import_workflow.sql` — `code`, `kind`, `product_line`, key-point fields, `icon_hint`, import batches and atomic RPCs.

**Do not execute any migration until Owner grants deployment approval.**

## API operations and confirmation

All actions use the authenticated `owner-session` Edge Function, which checks the DB Owner role on **every action**, and the database RPC checks Owner role again. Agent/admin/unassigned users cannot import or approve.

```json
{"action":"handbook_import","content":{"source_version":"grok-2026-11-13-claude-reviewed","cards":[],"scripts":[],"faqs":[]}}
```

The envelope above describes request routing; empty arrays are invalid. Send the **complete source JSON** for an actual import.

- `handbook_import`: strict validate first, then transactional code-key upsert. Return `{batch_id,inserted,updated,unchanged,pending_owner_review,counts}`. New or changed rows are set to `active=false,visible_to_agent=false,needs_owner_confirm=true`. **Identical rows are skipped** (no new batch); updated rows are unpublished and require fresh approval. All operations and audit events share one database transaction.
- `handbook_pending`: list pending rows, `import_batch_id` and grouped batch metadata. Owner UI displays by batch then product line (plus a general FAQ group).
- `handbook_update`: `{"action":"handbook_update","id":"<uuid>","title_en":"...","title_zh":"...","body_en":"...","body_zh":"..."}`. Edit only a pending entry; validates bilingual nonempty strings; stays hidden until approved.
- `handbook_bulk_approve`: `{"action":"handbook_bulk_approve","batch_id":"<uuid>","confirm":true}`. One batch button, then explicit Owner confirmation. Atomically approve **all currently pending items of that batch**, recording the batch UUID as audit entity ID.
- `handbook_review`: `{"action":"handbook_review","id":"<uuid>","decision":"approve"}` or `reject`, both audited atomically.

Agent uses authenticated `agent-session`:
`{"action":"handbook","section":"product_line","product_line":"condolence"}`. Section **or** product_line may be supplied; filters may be combined. Always enforce server-side:

```text
active = true AND visible_to_agent = true AND needs_owner_confirm = false
```

Response includes `code,kind,section,product_line,sort,title_en,title_zh,body_en,body_zh,key_points_en,key_points_zh,icon_hint`. No client direct grants to `company_knowledge` or `handbook_import_batches`; service_role remains server-only.

## Review tests (no production DDL)

- Unit test loads **the original** `content/handbook/handbook_content.json`, validates 20+15+12 and confirms source file hash is unchanged.
- Integration test script `scripts/handbook-import-integration-test.mjs` uses `DATABASE_URL` only **after migrations have been approved and applied** in a suitable test database. Within a single rollback transaction it asserts 47 pending, hidden from Agent filters, batch approval reveals all 47, repeated import inserts/updates zero, and Owner-edited content survives approval.
- Authenticated Agent/Owner API and 403 role matrix should be tested in staging once Edge Functions are deployed, not against the production schema now.

## Training MCQ: unchanged importer

The six `skill_code` values are exactly `LEAD-FINDING`, `QUALIFY`, `REFERENCE`, `OBJECTION`, `CLOSING`, `PAYMENT`; `CORE-BRAND` is a required course but **not a seventh MCQ skill_code**. Do not modify `scripts/training-bank-import.mjs`.

Only after explicit deployment approval, run:

```bash
node scripts/training-bank-import.mjs content/handbook/training_questions_handbook.json --apply
```

No PR #10 migration/deploy/Phase B/Phase C action is authorized yet.
