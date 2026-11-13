import test from "node:test";
import assert from "node:assert/strict";
import {getApprovedModuleCardCodes} from "../../../supabase/functions/_shared/module-cards.mjs";

function fakeDb(modules,knowledge){
  const calls=[];
  return {
    calls,
    from(table){
      const filters=[],project={table};
      calls.push({table,filters});
      const rows=table==="training_modules"?modules:table==="company_knowledge"?knowledge:[];
      const select=()=>({
        eq(field,value){filters.push([field,value]);return this;},
        maybeSingle:async()=>({data:rows.find(r=>filters.every(([k,v])=>r[k]===v))??null,error:null}),
        order(field){project.sort=field;return this;},
        limit:async(limit)=>({
          data:rows.filter(r=>filters.every(([k,v])=>r[k]===v))
            .sort((a,b)=>(a[project.sort]??0)-(b[project.sort]??0))
            .slice(0,limit),
          error:null
        })
      });
      return {select};
    }
  };
}

test("module_cards returns only Owner-approved card codes for the requested required course",async()=>{
  const db=fakeDb(
    [{code:"QUALIFY",active:true,required:true,handbook_section:"product_line"}],
    [
      {code:"BOUQ-2",kind:"card",section:"product_line",sort:20,active:true,visible_to_agent:true,needs_owner_confirm:false},
      {code:"COND-1",kind:"card",section:"product_line",sort:10,active:true,visible_to_agent:true,needs_owner_confirm:false},
      {code:"HIDDEN-1",kind:"card",section:"product_line",sort:1,active:false,visible_to_agent:false,needs_owner_confirm:true},
      {code:"PENDING-1",kind:"card",section:"product_line",sort:2,active:false,visible_to_agent:false,needs_owner_confirm:true},
      {code:"NOT-FOR-AGENT",kind:"card",section:"product_line",sort:3,active:true,visible_to_agent:false,needs_owner_confirm:false},
      {code:"FAQ-01",kind:"faq",section:"faq",sort:0,active:true,visible_to_agent:true,needs_owner_confirm:false},
      {code:"SRV-1",kind:"seed",section:"service_rule",sort:0,active:true,visible_to_agent:true,needs_owner_confirm:false}
    ]
  );
  const result=await getApprovedModuleCardCodes(db,"QUALIFY");
  assert.deepEqual(result,{ok:true,module_code:"QUALIFY",card_codes:["COND-1","BOUQ-2"]});
  assert.ok(db.calls.some(c=>c.table==="company_knowledge"&&c.filters.some(([k,v])=>k==="needs_owner_confirm"&&v===false)));
});

test("module_cards returns empty cards for a course without approved matching handbook cards",async()=>{
  const db=fakeDb(
    [{code:"CORE-BRAND",required:true,active:true,handbook_section:"story"}],
    [{code:"COND-1",kind:"card",section:"product_line",active:true,visible_to_agent:true,needs_owner_confirm:false}]
  );
  assert.deepEqual(await getApprovedModuleCardCodes(db,"CORE-BRAND"),{ok:true,module_code:"CORE-BRAND",card_codes:[]});
});

test("module_cards rejects unknown, inactive and unrequired courses without exposing card codes",async()=>{
  const db=fakeDb([{code:"QUALIFY",active:false,required:true,handbook_section:"product_line"}],
    [{code:"COND-1",kind:"card",section:"product_line",active:true,visible_to_agent:true,needs_owner_confirm:false}]);
  assert.deepEqual(await getApprovedModuleCardCodes(db,"QUALIFY"),{error:"module_not_found",status:404});
  assert.deepEqual(await getApprovedModuleCardCodes(db,"../QUALIFY"),{error:"invalid_module_code",status:400});
  assert.deepEqual(await getApprovedModuleCardCodes(db,""),{error:"invalid_module_code",status:400});
  assert.equal(db.calls.filter(c=>c.table==="company_knowledge").length,0);
});

test("module_cards fails closed on database errors",async()=>{
  const db={from(table){
    if(table==="training_modules")return {select:()=>({eq(){return this},maybeSingle:async()=>({data:null,error:{message:"oops"}})})};
    throw new Error("should not be reached");
  }};
  assert.deepEqual(await getApprovedModuleCardCodes(db,"QUALIFY"),{error:"module_cards_unavailable",status:503});
});
