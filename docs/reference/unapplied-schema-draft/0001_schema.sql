-- EW VERDORA Agent OS — core schema.
-- Money is integer sen. Rates are basis points. Enum values and keys are
-- stable identifiers and are never translated; display text lives in the
-- i18n dictionaries or in {"en": ..., "zh": ...} jsonb columns.

create schema if not exists app;

create type public.app_role as enum ('AGENT', 'OWNER', 'SYSTEM');
create type public.agent_status as enum ('REGISTERED', 'PROFILE_COMPLETE', 'IN_TRAINING', 'EXAM_READY', 'RETRAINING', 'ACTIVE', 'RESTRICTED', 'DORMANT', 'FROZEN');
create type public.tier_code as enum ('STARTER', 'ACTIVE', 'PRO', 'ELITE');
create type public.lead_source as enum ('INSTAGRAM', 'FACEBOOK', 'THREADS', 'XIAOHONGSHU', 'WHATSAPP', 'PERSONAL_NETWORK', 'REFERRAL', 'PREVIOUS_CUSTOMER', 'CORPORATE_OUTREACH', 'OTHER');
create type public.lead_status as enum ('NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST');
create type public.occasion as enum ('BIRTHDAY', 'ANNIVERSARY', 'CONDOLENCE', 'OPENING', 'PROPOSAL', 'GRADUATION', 'CORPORATE', 'WEDDING_ENQUIRY', 'GENERAL_BOUQUET');
create type public.quote_status as enum ('PENDING', 'APPROVED', 'NEEDS_REPRICE', 'EXPIRED');
create type public.order_status as enum ('PENDING_PAYMENT', 'PAID', 'COMPLETED', 'CANCELLED', 'REFUNDED');
create type public.ledger_type as enum ('COMMISSION_EARNED', 'COMMISSION_REVERSED', 'BONUS');
create type public.bonus_status as enum ('APPROVED', 'PENDING_PROFIT_QUALIFICATION', 'PAUSED_BY_PROFIT_GUARD');
create type public.violation_kind as enum ('UNAUTHORIZED_PRICE', 'UNAUTHORIZED_DISCOUNT', 'EXACT_REPRODUCTION_PROMISE', 'PERSONAL_PAYMENT_INSTRUCTION', 'INTERNAL_INFO_LEAK', 'REPEATED_CANCELLATION', 'HIGH_COMPLAINT_RATE', 'SUSPICIOUS_PATTERN');
create type public.enforcement_action as enum ('WARN', 'MICRO_TRAINING', 'TEMP_RESTRICTION', 'OWNER_EXCEPTION');
create type public.exception_status as enum ('OPEN', 'FROZEN', 'DISMISSED', 'REVIEW_REQUESTED');
create type public.profit_mode as enum ('NORMAL', 'PROTECTION', 'PROFIT_RECOVERY');
create type public.task_status as enum ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED');

-- ---------------------------------------------------------------- identity

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'AGENT',
  display_name text not null default '',
  locale text not null default 'en' check (locale in ('en', 'zh')),
  created_at timestamptz not null default now()
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  code text not null unique,
  status public.agent_status not null default 'REGISTERED',
  tier public.tier_code not null default 'STARTER',
  tier_grace_started_at timestamptz,
  tier_recovery_until timestamptz,
  preferred_channels public.lead_source[] not null default '{}',
  phone text,
  last_active_at timestamptz,
  certified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.agent_status_history (
  id bigint generated always as identity primary key,
  agent_id uuid not null references public.agents (id),
  from_status public.agent_status,
  to_status public.agent_status not null,
  event text not null,
  actor public.app_role not null,
  actor_id uuid,
  rule_version text,
  created_at timestamptz not null default now()
);

create table public.agent_tier_history (
  id bigint generated always as identity primary key,
  agent_id uuid not null references public.agents (id),
  from_tier public.tier_code not null,
  to_tier public.tier_code not null,
  change text not null,
  facts jsonb not null,
  rule_version text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------ configuration

-- One immutable row per rule-set version (see packages/core/src/config/rules.ts).
create table public.rule_sets (
  version text primary key,
  rules jsonb not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Small key/value settings, e.g. {"key": "active_rule_set", "value": "2026.11.0"}.
create table public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- training

create table public.training_modules (
  code text primary key,
  kind text not null check (kind in ('CORE', 'MICRO', 'REACTIVATION')),
  title jsonb not null,
  content jsonb not null,
  sort int not null default 0,
  active boolean not null default true
);

create table public.training_progress (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  module_code text not null references public.training_modules (code),
  status public.task_status not null default 'ASSIGNED',
  reason text not null default 'CORE',
  assigned_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index training_progress_open on public.training_progress (agent_id, module_code) where status <> 'COMPLETED';

create table public.roleplay_sessions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  scenario_id text not null,
  locale text not null check (locale in ('en', 'zh')),
  transcript jsonb not null default '[]',
  scores jsonb,
  total numeric(5, 1),
  passed boolean,
  feedback text,
  rule_version text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ----------------------------------------------------------------- missions

create table public.daily_missions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  mission_date date not null,
  focus text not null,
  targets jsonb not null,
  recommended_channels public.lead_source[] not null default '{}',
  ai_summary jsonb,
  rule_version text not null,
  created_at timestamptz not null default now(),
  unique (agent_id, mission_date)
);

create table public.mission_items (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.daily_missions (id) on delete cascade,
  agent_id uuid not null references public.agents (id) on delete cascade,
  kind text not null,
  target int not null check (target >= 0),
  progress int not null default 0 check (progress >= 0),
  label_key text not null,
  ref text
);

-- ------------------------------------------------- campaigns & selling kits

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title jsonb not null,
  notes jsonb not null default '{}',
  priority_source public.lead_source,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true
);

-- Margin classification is internal; Agents never read this table.
create table public.campaign_internals (
  campaign_id uuid primary key references public.campaigns (id) on delete cascade,
  low_margin boolean not null default false,
  paused_by_profit_guard boolean not null default false
);

create table public.selling_kits (
  id uuid primary key default gen_random_uuid(),
  occasion public.occasion not null,
  title jsonb not null,
  short_caption jsonb not null,
  long_caption jsonb not null,
  story_copy jsonb not null,
  dm_opening jsonb not null,
  follow_up jsonb not null,
  objection_response jsonb not null,
  persona jsonb not null,
  suggested_platforms public.lead_source[] not null default '{}',
  -- How the Agent gets a price: always the official quote route.
  price_entry jsonb not null default '{"route": "REQUEST_OFFICIAL_QUOTE"}',
  campaign_id uuid references public.campaigns (id),
  active boolean not null default true
);

create table public.selling_kit_assets (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.selling_kits (id) on delete cascade,
  storage_path text not null,
  alt jsonb not null default '{}',
  sort int not null default 0
);

-- -------------------------------------------------------------------- leads

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id),
  source public.lead_source not null,
  customer_name text not null,
  customer_contact text,
  occasion public.occasion,
  budget_sen bigint check (budget_sen >= 0),
  reference_image_path text,
  delivery_date date,
  delivery_time text,
  requirements text,
  status public.lead_status not null default 'NEW',
  follow_up_at timestamptz,
  loss_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_agent on public.leads (agent_id, status);
create index leads_follow_up on public.leads (agent_id, follow_up_at) where follow_up_at is not null;

-- Timeline of a lead: Agent messages, notes, follow-ups done, AI classification.
create table public.lead_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads (id) on delete cascade,
  agent_id uuid not null references public.agents (id),
  kind text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index lead_events_lead on public.lead_events (lead_id, created_at);

-- ------------------------------------------------------------------- quotes

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id),
  agent_id uuid not null references public.agents (id),
  current_version int not null default 1,
  created_at timestamptz not null default now()
);

-- Agent-visible part of a quote version, including the commission lock.
create table public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  agent_id uuid not null references public.agents (id),
  version int not null,
  flower_price_sen bigint not null check (flower_price_sen > 0),
  delivery_fee_sen bigint not null default 0 check (delivery_fee_sen >= 0),
  status public.quote_status not null default 'PENDING',
  commission_rule_version text,
  commission_rate_locked_bps int check (commission_rate_locked_bps between 0 and 10000),
  tier_at_lock public.tier_code,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (quote_id, version),
  check (status <> 'APPROVED' or (commission_rule_version is not null and commission_rate_locked_bps is not null and tier_at_lock is not null and approved_at is not null))
);

-- INTERNAL: costs, margin and floor. Owner / service role only.
create table public.quote_version_internals (
  quote_version_id uuid primary key references public.quote_versions (id) on delete cascade,
  procurement_ceiling_sen bigint not null check (procurement_ceiling_sen >= 0),
  other_variable_cost_sen bigint not null default 0,
  contribution_sen bigint not null,
  contribution_margin_bps int not null,
  required_margin_bps int not null,
  minimum_flower_price_sen bigint not null,
  maximum_buy_cost_sen bigint not null,
  breakdown jsonb not null,
  profit_mode public.profit_mode not null,
  external_florist text,
  rule_version text not null
);

-- ------------------------------------------------------------------- orders

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  quote_version_id uuid not null unique references public.quote_versions (id),
  lead_id uuid not null references public.leads (id),
  agent_id uuid not null references public.agents (id),
  status public.order_status not null default 'PENDING_PAYMENT',
  flower_revenue_sen bigint not null check (flower_revenue_sen >= 0),
  delivery_fee_sen bigint not null default 0,
  tax_sen bigint not null default 0,
  pass_through_sen bigint not null default 0,
  refunded_flower_sen bigint not null default 0,
  upheld_complaint boolean not null default false,
  profit_verified_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index orders_agent_completed on public.orders (agent_id, completed_at);

-- --------------------------------------------------------- money: immutable

create table public.bonus_awards (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  agent_id uuid not null references public.agents (id),
  code text not null,
  amount_sen bigint not null check (amount_sen > 0),
  status public.bonus_status not null,
  rule_version text not null,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

-- Append-only. `idempotency_key` makes every financial event apply once.
create table public.ledger_entries (
  id bigint generated always as identity primary key,
  idempotency_key text not null unique,
  agent_id uuid not null references public.agents (id),
  type public.ledger_type not null,
  amount_sen bigint not null,
  order_id uuid references public.orders (id),
  bonus_award_id uuid references public.bonus_awards (id),
  rule_version text not null,
  rate_bps int,
  base_sen bigint,
  created_at timestamptz not null default now()
);
create index ledger_agent on public.ledger_entries (agent_id, created_at);

-- -------------------------------------------------------------- performance

create table public.kpi_snapshots (
  id bigint generated always as identity primary key,
  agent_id uuid not null references public.agents (id) on delete cascade,
  snapshot_date date not null,
  score numeric(5, 1) not null,
  components jsonb not null,
  facts jsonb not null,
  diagnosis text,
  rule_version text not null,
  unique (agent_id, snapshot_date)
);

-- ------------------------------------------------------- audit & enforcement

create table public.violations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id),
  kind public.violation_kind not null,
  evidence text not null,
  lead_id uuid references public.leads (id),
  detected_by text not null default 'RULE' check (detected_by in ('RULE', 'AI')),
  action public.enforcement_action not null,
  points int not null default 0,
  serious boolean not null default false,
  resolved_at timestamptz,
  rule_version text not null,
  created_at timestamptz not null default now()
);
create index violations_agent on public.violations (agent_id, created_at);

create table public.restrictions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id),
  violation_id uuid references public.violations (id),
  reason text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  lifted_at timestamptz
);

create table public.recovery_tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id),
  kind text not null check (kind in ('RESTRICTION', 'DORMANCY')),
  restriction_id uuid references public.restrictions (id),
  module_code text references public.training_modules (code),
  status public.task_status not null default 'ASSIGNED',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- The Owner's queue. Only serious cases are ever inserted here.
create table public.owner_exceptions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id),
  risk public.violation_kind not null,
  affected_orders int not null default 0,
  ai_summary text,
  evidence jsonb not null default '[]',
  recommended_action text not null,
  status public.exception_status not null default 'OPEN',
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);

-- Who / what / when / before / after / rule version, for every important action.
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_role public.app_role not null,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text not null,
  before jsonb,
  after jsonb,
  rule_version text,
  created_at timestamptz not null default now()
);
create index audit_log_entity on public.audit_log (entity, entity_id, created_at);

-- ------------------------------------------------------------ company profit

create table public.opex_entries (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  amount_sen bigint not null check (amount_sen >= 0),
  incurred_on date not null,
  note text
);

create table public.profit_snapshots (
  id bigint generated always as identity primary key,
  snapshot_date date not null unique,
  window_totals jsonb not null,
  net_profit_sen bigint not null,
  net_margin_bps int not null,
  mode public.profit_mode not null,
  rule_version text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- immutability

create function app.forbid_change() returns trigger language plpgsql as $$
begin
  raise exception '% on % is not allowed: records are immutable', tg_op, tg_table_name using errcode = 'P0001';
end $$;

create trigger ledger_entries_immutable before update or delete on public.ledger_entries for each row execute function app.forbid_change();
create trigger audit_log_immutable before update or delete on public.audit_log for each row execute function app.forbid_change();
create trigger agent_status_history_immutable before update or delete on public.agent_status_history for each row execute function app.forbid_change();
create trigger agent_tier_history_immutable before update or delete on public.agent_tier_history for each row execute function app.forbid_change();
create trigger rule_sets_immutable before update or delete on public.rule_sets for each row execute function app.forbid_change();

-- Quote lock: once a version is approved, its price and commission terms are frozen.
create function app.protect_quote_lock() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'APPROVED' then raise exception 'approved quote versions cannot be deleted' using errcode = 'P0001'; end if;
    return old;
  end if;
  if old.status = 'APPROVED' and (
    new.flower_price_sen is distinct from old.flower_price_sen or
    new.delivery_fee_sen is distinct from old.delivery_fee_sen or
    new.commission_rule_version is distinct from old.commission_rule_version or
    new.commission_rate_locked_bps is distinct from old.commission_rate_locked_bps or
    new.tier_at_lock is distinct from old.tier_at_lock or
    new.approved_at is distinct from old.approved_at or
    new.agent_id is distinct from old.agent_id or
    new.version is distinct from old.version
  ) then
    raise exception 'approved quote version is locked' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger quote_versions_lock before update or delete on public.quote_versions for each row execute function app.protect_quote_lock();

create function app.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger leads_touch before update on public.leads for each row execute function app.touch_updated_at();
