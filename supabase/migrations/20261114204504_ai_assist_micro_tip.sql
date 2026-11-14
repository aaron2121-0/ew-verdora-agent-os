-- AI assist: in-context micro coaching
update private.system_settings
set value = jsonb_set(
  coalesce(value, '{}'::jsonb),
  '{daily_limits,micro_tip}',
  '5'::jsonb,
  true
)
where key = 'ai_policy';
