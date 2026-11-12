-- Owner OS V2 Phase A: isolated privileged operations; no pricing or agent lifecycle modifications.
-- This migration is deliberately NOT deployed until the Owner authorizes release.

alter table public.quote_requests drop constraint if exists quote_requests_status_check;
alter table public.quote_requests add constraint quote_requests_status_check
  check (status in ('awaiting_reference','analysis_pending','underwritten',
                   'manual_review','quote_created','cancelled','needs_info','rejected'));

create or replace function public.owner_quote_queue_internal(p_user_id uuid, p_limit integer default 40)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_result jsonb;
begin
  select role into v_role from private.user_roles where user_id=p_user_id;
  if coalesce(v_role,'') not in ('owner','admin') then raise exception 'forbidden' using errcode='42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) into v_result
  from (
    select q.id,q.agent_id,a.agent_code,a.display_name as agent_name,q.lead_id,
           l.customer_label,q.reference_object_path,q.customer_budget,q.design_commitment,
           q.needed_at,q.status,q.classification,q.created_at,
           ra.size_band,ra.density_band,ra.premium_intensity,ra.complexity_band,
           ra.confidence,ra.analysis_provider,ra.analysis_model,
           ra.visual_features,
           case
             when ra.quote_request_id is null then 'no_analysis'
             when coalesce(ra.confidence,0)<0.6 then 'low_confidence'
             when q.classification='RED' then 'pricing_or_cost_guard'
             else 'requires_manual_review'
           end as review_reason
    from public.quote_requests q
    join public.agents a on a.id=q.agent_id
    left join public.leads l on l.id=q.lead_id
    left join private.reference_analysis ra on ra.quote_request_id=q.id
    where q.status='manual_review'
    order by q.created_at asc
    limit least(greatest(coalesce(p_limit,40),1),100)
  ) t;
  return v_result;
end $$;

-- The function is one PostgreSQL transaction; any failure rolls back the finalizer and audit.
-- No baseline writes, no alternative pricing, no change to frozen quote finalizer.
create or replace function public.owner_review_quote_internal(
  p_user_id uuid, p_request_id uuid, p_decision text,
  p_size text default null, p_density text default null,
  p_premium text default null, p_complexity text default null,
  p_flexibility text default 'moderate', p_note text default null
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_before public.quote_requests; v_after public.quote_requests;
        v_result jsonb; v_before_json jsonb; v_after_json jsonb;
begin
  select role into v_role from private.user_roles where user_id=p_user_id;
  if coalesce(v_role,'') not in ('owner','admin') then raise exception 'forbidden' using errcode='42501'; end if;
  if p_decision not in ('approve','request_info','reject') then raise exception 'invalid decision'; end if;
  select * into v_before from public.quote_requests where id=p_request_id for update;
  if not found then raise exception 'not found'; end if;
  if v_before.status <> 'manual_review' then raise exception 'quote not pending review'; end if;
  if p_decision='approve' then
    if p_size not in ('small','medium','large','xl','structure')
       or p_density not in ('light','medium','full','very_full')
       or p_premium not in ('low','medium','high','very_high')
       or p_complexity not in ('low','medium','high','special')
    then raise exception 'invalid classification'; end if;
    select * into v_after from public.finalize_quote_request_internal(
      p_request_id,p_size,p_density,p_premium,p_complexity,
      coalesce(nullif(p_flexibility,''),'moderate'),
      jsonb_build_object('owner_review',true),
      'owner_manual','none',
      jsonb_build_object('owner_review',true)
    );
    if v_after.id is distinct from p_request_id then raise exception 'finalize failed'; end if;
  elsif p_decision='request_info' then
    update public.quote_requests
       set status='needs_info',customer_note_en='Please provide more reference details so we can prepare an accurate quotation.',
           customer_note_zh='请补充参考图或花艺需求资料，以便我们准确报价。',
           updated_at=now()
     where id=p_request_id returning * into v_after;
  else
    update public.quote_requests
       set status='rejected',customer_note_en='This reference cannot be quoted at this time. Please submit a new request if needed.',
           customer_note_zh='这张参考图目前无法提供报价。如有需要，请重新提交申请。',
           updated_at=now()
     where id=p_request_id returning * into v_after;
  end if;
  v_before_json:=jsonb_build_object('status',v_before.status,'classification',v_before.classification,
    'recommended_price',v_before.recommended_price,'budget_version_price',v_before.budget_version_price);
  v_after_json:=jsonb_build_object('status',v_after.status,'classification',v_after.classification,
    'recommended_price',v_after.recommended_price,'budget_version_price',v_after.budget_version_price,
    'owner_classification',case when p_decision='approve' then
      jsonb_build_object('size',p_size,'density',p_density,'premium',p_premium,'complexity',p_complexity)
    else null end,
    'note',left(coalesce(p_note,''),500));
  insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state)
  values(p_user_id,'owner','quote_review_'||p_decision,'quote_request',p_request_id::text,v_before_json,v_after_json);
  return jsonb_build_object('id',v_after.id,'status',v_after.status,'classification',v_after.classification,
    'budget_version_price',v_after.budget_version_price,'recommended_price',v_after.recommended_price,
    'budget_version_commitment',v_after.budget_version_commitment,
    'customer_note_en',v_after.customer_note_en,'customer_note_zh',v_after.customer_note_zh);
end $$;

create or replace function public.owner_patch_setting_internal(
  p_user_id uuid, p_path text, p_value jsonb
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_key text; v_old jsonb; v_next jsonb; v_old_leaf jsonb; v_limit integer;
begin
  select role into v_role from private.user_roles where user_id=p_user_id;
  if v_role is distinct from 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
  if p_path not in (
    'ai_policy.daily_limits.chat','ai_policy.daily_limits.coach',
    'ai_policy.daily_limits.daily_content','ai_policy.daily_limits.daily_greeting',
    'ai_policy.daily_limits.roleplay_score','ai_policy.daily_limits.roleplay_generate',
    'ai_policy.daily_limits.reference_analysis'
  ) then raise exception 'setting not editable'; end if;
  if jsonb_typeof(p_value) <> 'number' or p_value::text !~ '^[0-9]{1,3}$' then raise exception 'invalid value'; end if;
  v_limit:=(p_value::text)::integer;
  if v_limit<0 or v_limit>200 then raise exception 'invalid value'; end if;
  v_key:=split_part(p_path,'.',3);
  select value into v_old from private.system_settings where key='ai_policy' for update;
  if not found then raise exception 'setting not found'; end if;
  v_old_leaf:=v_old #> array['daily_limits',v_key];
  v_next:=jsonb_set(v_old,array['daily_limits',v_key],to_jsonb(v_limit),true);
  update private.system_settings set value=v_next,updated_at=now() where key='ai_policy';
  insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state)
  values(p_user_id,'owner','setting_patch','system_setting',p_path,
    jsonb_build_object('value',v_old_leaf),jsonb_build_object('value',v_limit));
  return jsonb_build_object('path',p_path,'value',v_limit);
end $$;

create or replace function public.owner_audit_action_internal(
 p_user_id uuid, p_action text, p_entity_type text, p_entity_id text,
 p_before jsonb default null, p_after jsonb default null
) returns void language plpgsql security definer set search_path = ''
as $$
declare v_role text;
begin
 select role into v_role from private.user_roles where user_id=p_user_id;
 if coalesce(v_role,'') not in ('owner','admin') then raise exception 'forbidden' using errcode='42501'; end if;
 if p_action not in ('agent_invite_created','owner_recovery_created') then raise exception 'invalid action'; end if;
 if p_action='owner_recovery_created' and v_role <> 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
 insert into private.audit_events(actor_user_id,actor_type,action,entity_type,entity_id,before_state,after_state)
 values(p_user_id,'owner',p_action,left(p_entity_type,60),left(p_entity_id,200),p_before,p_after);
end $$;

revoke all on function public.owner_quote_queue_internal(uuid,integer) from public,anon,authenticated;
revoke all on function public.owner_review_quote_internal(uuid,uuid,text,text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.owner_patch_setting_internal(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.owner_audit_action_internal(uuid,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.owner_quote_queue_internal(uuid,integer) to service_role;
grant execute on function public.owner_review_quote_internal(uuid,uuid,text,text,text,text,text,text,text) to service_role;
grant execute on function public.owner_patch_setting_internal(uuid,text,jsonb) to service_role;
grant execute on function public.owner_audit_action_internal(uuid,text,text,text,jsonb,jsonb) to service_role;
