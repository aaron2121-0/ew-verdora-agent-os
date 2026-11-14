-- AI assist: today's first contacts
update private.system_settings
set value = jsonb_set(
  coalesce(value, '{}'::jsonb),
  '{daily_limits,today_priority}',
  '6'::jsonb,
  true
)
where key = 'ai_policy';