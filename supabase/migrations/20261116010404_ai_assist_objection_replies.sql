update private.system_settings
set value=jsonb_set(coalesce(value,'{}'::jsonb),'{daily_limits,objection_replies}','12'::jsonb,true),
    updated_at=now()
where key='ai_policy';
