update private.system_settings
set value = jsonb_set(value,'{daily_limits,today_first}','6'::jsonb,true)
where key='ai_policy';
