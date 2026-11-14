update private.system_settings
set value = jsonb_set(value,'{daily_limits,repeat_customer}','4'::jsonb,true)
where key='ai_policy';
