update private.system_settings
set value = jsonb_set(value,'{daily_limits,conversation_extract}','5'::jsonb,true)
where key='ai_policy';
