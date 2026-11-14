update private.system_settings
set value=jsonb_set(coalesce(value,'{}'::jsonb),'{daily_limits,repeat_customer}','4'::jsonb,true),
    updated_at=now()
where key='ai_policy';
