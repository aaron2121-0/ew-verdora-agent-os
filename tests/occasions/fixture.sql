-- Minimal disposable database prerequisites; never a live Supabase project.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to public;
create schema auth;
create schema private;
create table auth.users(id uuid primary key);
create table public.agents(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id));
create table private.user_roles(user_id uuid primary key references auth.users(id),role text not null);
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'), -- owner
 ('22222222-2222-4222-8222-222222222222'), -- agent A
 ('33333333-3333-4333-8333-333333333333'), -- agent B
 ('44444444-4444-4444-8444-444444444444'), -- outsider
 ('55555555-5555-4555-8555-555555555555'); -- admin (not owner)
insert into public.agents(user_id) values ('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333');
insert into private.user_roles values ('11111111-1111-4111-8111-111111111111','owner'),('55555555-5555-4555-8555-555555555555','admin');
create function pg_temp.assert(p_ok boolean,p_message text) returns void language plpgsql as $$ begin if p_ok is distinct from true then raise exception 'assertion failed: %',p_message; end if; end $$;
create function pg_temp.expect_error(p_sql text,p_expected text) returns void language plpgsql as $$ declare v_error text; begin begin execute p_sql; exception when others then v_error:=sqlerrm; end; if v_error is null or position(p_expected in v_error)=0 then raise exception 'Expected %, got %',p_expected,v_error; end if; end $$;
