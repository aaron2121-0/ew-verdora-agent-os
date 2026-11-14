-- AI assist: one-tap tri-language reply translation
update private.system_settings
set value=jsonb_set(coalesce(value,'{}'::jsonb),'{daily_limits,translate_reply}','8'::jsonb,true),
    updated_at=now()
where key='ai_policy';
