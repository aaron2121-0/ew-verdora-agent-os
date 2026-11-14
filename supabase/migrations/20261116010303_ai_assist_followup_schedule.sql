update private.system_settings
set value=jsonb_set(coalesce(value,'{}'::jsonb),'{daily_limits,followup_schedule}','8'::jsonb,true),
    updated_at=now()
where key='ai_policy';
