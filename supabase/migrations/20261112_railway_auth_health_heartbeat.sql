-- Periodically exercises the existing Railway Agent OS auth-health endpoint.
-- Uses existing Supabase pg_cron + pg_net; no extra Railway service is created.

create extension if not exists pg_net;

select cron.schedule(
  'ew_railway_auth_health',
  '*/5 * * * *',
  $$
    select net.http_get(
      url := 'https://agent-os-core-production.up.railway.app/api/auth-health',
      timeout_milliseconds := 10000
    ) as request_id;
  $$
);
