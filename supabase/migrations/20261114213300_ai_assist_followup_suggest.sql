update private.system_settings
set value = jsonb_set(value,'{daily_limits,followup_suggest}','5'::jsonb,true)
where key='ai_policy';
