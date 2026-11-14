-- AI assist: pasted conversation organiser quota.
-- Updates only the AI policy JSON; no customer/identity data is stored here.
update private.system_settings
set value = jsonb_set(
  coalesce(value, '{}'::jsonb),
  '{daily_limits,conversation_extract}',
  '8'::jsonb,
  true
),
updated_at = now()
where key = 'ai_policy';
