-- AI assist: WhatsApp conversation -> customer card
-- Keep every existing ai_policy setting and add only this action's daily limit.
update private.system_settings
set value = jsonb_set(
  coalesce(value, '{}'::jsonb),
  '{daily_limits,lead_intake_parse}',
  '12'::jsonb,
  true
)
where key = 'ai_policy';
