-- Run ONLY after the D1 migration in a disposable/staging DB.
-- If an existing owner and Agent are present, all fixtures are rolled back.
BEGIN;
DO $$
DECLARE
 v_owner uuid; v_agent uuid; v_lead uuid; v_quote uuid; v_order uuid;
 v_c1 uuid; v_c2 uuid; v_result jsonb; v_rejected boolean;
BEGIN
 SELECT user_id INTO v_owner FROM private.user_roles WHERE role='owner' LIMIT 1;
 SELECT id INTO v_agent FROM public.agents LIMIT 1;
 IF v_owner IS NULL OR v_agent IS NULL THEN RAISE EXCEPTION 'fixture_requires_existing_owner_and_agent'; END IF;

 INSERT INTO public.leads(agent_id,source,status)
 VALUES(v_agent,'other','new') RETURNING id INTO v_lead;
 INSERT INTO public.quotes(lead_id,agent_id,selling_price,status,commission_rate_locked,commission_rule_version)
 VALUES(v_lead,v_agent,200,'draft',0.1,'d1-test-rollback') RETURNING id INTO v_quote;
 INSERT INTO public.orders(order_code,quote_id,agent_id,status,commissionable_revenue,delivery_fee,payment_status)
 VALUES('D1-ROLLBACK-'||left(gen_random_uuid()::text,8),v_quote,v_agent,'completed',200,0,'paid')
 RETURNING id INTO v_order;
 INSERT INTO public.commissions(order_id,agent_id,commissionable_revenue,rate_locked,amount,status,payable_at)
 VALUES(v_order,v_agent,200,0.1,20,'payable',now()) RETURNING id INTO v_c1;

 -- Test 1: payable -> paid, date saved and audit created.
 SELECT public.owner_mark_commissions_paid_internal(v_owner,array[v_c1],'D1-TEST-REF-001') INTO v_result;
 IF (SELECT status FROM public.commissions WHERE id=v_c1)<>'paid'
    OR (SELECT paid_at FROM public.commissions WHERE id=v_c1) IS NULL
    OR (v_result->>'amount')::numeric<>20
    OR NOT EXISTS(SELECT 1 FROM private.audit_events
        WHERE action='owner_commission_paid' AND entity_id=v_agent::text)
 THEN RAISE EXCEPTION 'FAIL: payable_to_paid'; END IF;
 RAISE NOTICE 'PASS 1/4: payable -> paid and audited';

 -- Test 2: second click cannot pay the same commission twice.
 v_rejected:=false;
 BEGIN
   PERFORM public.owner_mark_commissions_paid_internal(v_owner,array[v_c1],'D1-TEST-REF-002');
 EXCEPTION WHEN OTHERS THEN
   v_rejected:=position('commission_not_payable' in sqlerrm)>0;
 END;
 IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL: duplicate_payment'; END IF;
 RAISE NOTICE 'PASS 2/4: duplicate payout rejected';

 -- Test 3: non-Owner rejected, even if a payable commission exists.
 v_rejected:=false;
 BEGIN
   PERFORM public.owner_mark_commissions_paid_internal(gen_random_uuid(),array[v_c1],'D1-TEST-REF-003');
 EXCEPTION WHEN OTHERS THEN
   v_rejected:=position('forbidden' in sqlerrm)>0;
 END;
 IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL: non_owner'; END IF;
 RAISE NOTICE 'PASS 3/4: non-Owner rejected';

 -- Test 4: earned cannot be paid.
 UPDATE public.commissions SET status='earned',paid_at=null WHERE id=v_c1;
 v_rejected:=false;
 BEGIN
   PERFORM public.owner_mark_commissions_paid_internal(v_owner,array[v_c1],'D1-TEST-REF-004');
 EXCEPTION WHEN OTHERS THEN
   v_rejected:=position('commission_not_payable' in sqlerrm)>0;
 END;
 IF NOT v_rejected OR (SELECT status FROM public.commissions WHERE id=v_c1)<>'earned'
 THEN RAISE EXCEPTION 'FAIL: earned_status'; END IF;
 RAISE NOTICE 'PASS 4/4: earned status rejected';
END;
$$;
ROLLBACK;
