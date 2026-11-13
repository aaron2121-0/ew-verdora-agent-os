-- Isolated CI-only Postgres scaffold for the four handbook migrations.
-- This is intentionally NOT a Supabase migration, never run against live DB.
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists private;

do $$begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;

create table auth.users(id uuid primary key);
create table storage.buckets(id text primary key,name text not null,public boolean not null default false);
create table private.user_roles(user_id uuid not null references auth.users(id), role text not null);
create table private.audit_events(
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,actor_type text not null,action text not null,
  entity_type text not null,entity_id text not null,
  before_state jsonb,after_state jsonb,created_at timestamptz not null default now()
);
create table public.training_modules (
  code text primary key,required boolean not null default false,
  active boolean not null default true
);
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001');
insert into private.user_roles(user_id,role)
values ('00000000-0000-4000-8000-000000000001','owner');
insert into public.training_modules(code,required,active) values
('CORE-BRAND',true,true),('LEAD-FINDING',true,true),('QUALIFY',true,true),
('REFERENCE',true,true),('OBJECTION',true,true),('CLOSING',true,true),('PAYMENT',true,true);
