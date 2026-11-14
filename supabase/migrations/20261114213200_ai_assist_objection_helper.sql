update private.system_settings
set value = jsonb_set(value,'{daily_limits,objection_helper}','8'::jsonb,true)
where key='ai_policy';
