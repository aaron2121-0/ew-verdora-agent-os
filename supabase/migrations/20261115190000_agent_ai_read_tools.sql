-- Phase 1 only: AI read-only customer-facing projections. No write tools.
-- Called solely by agent-ai using service role AFTER JWT -> agent_id verification.
CREATE OR REPLACE FUNCTION public.agent_ai_read_internal(
  p_agent_id uuid, p_tool text, p_params jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_limit integer := greatest(1,least(30,coalesce(nullif(p_params->>'limit','')::integer,20)));
  v_lead uuid;
  v_query text := left(coalesce(p_params->>'query',''),100);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.agents a WHERE a.id=p_agent_id) THEN
    RAISE EXCEPTION 'agent_not_found' USING errcode='42501';
  END IF;
  IF p_tool='list_my_customers' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.updated_at DESC),'[]'::jsonb)
    INTO v_result FROM (
      SELECT l.id AS lead_id,l.customer_label,l.source,l.occasion,l.sales_category,
        l.budget,l.delivery_date,l.status,l.next_followup_at,l.updated_at
      FROM public.leads l
      WHERE l.agent_id=p_agent_id
        AND (nullif(p_params->>'status','') IS NULL OR l.status=p_params->>'status')
        AND (nullif(p_params->>'source','') IS NULL OR l.source=p_params->>'source')
      ORDER BY l.updated_at DESC LIMIT v_limit
    ) x;
  ELSIF p_tool='get_customer_history' THEN
    IF coalesce(p_params->>'lead_id','') !~ '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' THEN
      RAISE EXCEPTION 'invalid_lead_id' USING errcode='22023';
    END IF;
    v_lead := (p_params->>'lead_id')::uuid;
    SELECT jsonb_build_object(
      'customer',jsonb_build_object('lead_id',l.id,'customer_label',l.customer_label,
        'source',l.source,'occasion',l.occasion,'sales_category',l.sales_category,
        'budget',l.budget,'delivery_date',l.delivery_date,'status',l.status,
        'loss_reason',l.loss_reason,'next_followup_at',l.next_followup_at),
      'events',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb)
       FROM (SELECT e.event_type,e.created_at,e.metadata
        FROM public.lead_events e WHERE e.lead_id=l.id AND e.agent_id=p_agent_id
        ORDER BY e.created_at DESC LIMIT 20) x),
      'quote_requests',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb)
       FROM (SELECT q.id,q.status,q.customer_budget,q.needed_at,q.created_at
        FROM public.quote_requests q WHERE q.lead_id=l.id AND q.agent_id=p_agent_id
        ORDER BY q.created_at DESC LIMIT 10) x),
      'quotes',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb)
       FROM (SELECT q.id,q.status,q.selling_price,q.valid_until,q.created_at
        FROM public.quotes q WHERE q.lead_id=l.id AND q.agent_id=p_agent_id
        ORDER BY q.created_at DESC LIMIT 10) x))
    INTO v_result FROM public.leads l WHERE l.id=v_lead AND l.agent_id=p_agent_id;
    IF v_result IS NULL THEN RAISE EXCEPTION 'lead_not_found' USING errcode='42501'; END IF;
  ELSIF p_tool='get_due_followups' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.next_followup_at),'[]'::jsonb)
    INTO v_result FROM (
      SELECT l.id AS lead_id,l.customer_label,l.occasion,l.sales_category,
        l.status,l.delivery_date,l.next_followup_at,
        CASE WHEN l.next_followup_at < (timezone('Asia/Kuching',now())::date::timestamp AT TIME ZONE 'Asia/Kuching')
          THEN 'overdue' ELSE 'today' END AS urgency
      FROM public.leads l
      WHERE l.agent_id=p_agent_id AND l.next_followup_at IS NOT NULL
        AND l.next_followup_at < ((timezone('Asia/Kuching',now())::date+1)::timestamp AT TIME ZONE 'Asia/Kuching')
        AND l.status NOT IN ('won','lost','archived')
      ORDER BY l.next_followup_at LIMIT v_limit
    ) x;
  ELSIF p_tool='get_quotes_orders' THEN
    SELECT jsonb_build_object(
      'quote_requests',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb)
        FROM (SELECT q.id,q.lead_id,q.status,q.customer_budget,q.needed_at,q.created_at
        FROM public.quote_requests q WHERE q.agent_id=p_agent_id ORDER BY q.created_at DESC LIMIT v_limit) x),
      'orders',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb)
        FROM (SELECT o.id,o.order_code,o.status,o.payment_status,o.created_at,o.completed_at
        FROM public.orders o WHERE o.agent_id=p_agent_id ORDER BY o.created_at DESC LIMIT v_limit) x))
    INTO v_result;
  ELSIF p_tool='search_sales_knowledge' THEN
    SELECT jsonb_build_object(
      'handbook',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)
       FROM (SELECT k.code,k.title_zh,k.title_en,left(k.body_zh,650) AS body_zh,
         left(k.body_en,650) AS body_en
         FROM public.company_knowledge k
         WHERE k.active AND k.visible_to_agent
           AND (v_query='' OR k.title_zh ILIKE '%'||v_query||'%' OR k.title_en ILIKE '%'||v_query||'%'
             OR k.body_zh ILIKE '%'||v_query||'%' OR k.body_en ILIKE '%'||v_query||'%')
         ORDER BY k.sort LIMIT 6) x),
      'selling_kits',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)
       FROM (SELECT s.code,s.category,s.title_zh,s.title_en
         FROM public.selling_kits s WHERE s.active
           AND (v_query='' OR s.title_zh ILIKE '%'||v_query||'%' OR s.title_en ILIKE '%'||v_query||'%')
         LIMIT 6) x),
      'channel_playbooks',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)
       FROM (SELECT p.code,p.title_zh,p.title_en,
         left(p.content_zh::text,600) AS content_zh,left(p.content_en::text,600) AS content_en
         FROM public.channel_playbooks p WHERE p.active
           AND (v_query='' OR p.title_zh ILIKE '%'||v_query||'%' OR p.title_en ILIKE '%'||v_query||'%')
         LIMIT 6) x))
    INTO v_result;
  ELSIF p_tool='find_similar_wins' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO v_result FROM (
      SELECT l.sales_category,l.occasion,
        CASE WHEN q.selling_price < 200 THEN 'under_rm200'
             WHEN q.selling_price < 400 THEN 'rm200_399'
             WHEN q.selling_price < 800 THEN 'rm400_799'
             ELSE 'rm800_plus' END AS sale_price_band,
        l.source AS successful_channel
      FROM public.orders o
      JOIN public.quotes q ON q.id=o.quote_id AND q.agent_id=p_agent_id
      JOIN public.leads l ON l.id=q.lead_id AND l.agent_id=p_agent_id
      WHERE o.agent_id=p_agent_id AND o.status='completed'
        AND (coalesce(p_params->>'category','')='' OR l.sales_category=p_params->>'category')
      ORDER BY o.completed_at DESC NULLS LAST LIMIT 10
    ) x;
  ELSE
    RAISE EXCEPTION 'unsupported_read_tool' USING errcode='22023';
  END IF;
  RETURN coalesce(v_result,'[]'::jsonb);
END;
$function$;

REVOKE ALL ON FUNCTION public.agent_ai_read_internal(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agent_ai_read_internal(uuid,text,jsonb) TO service_role;
