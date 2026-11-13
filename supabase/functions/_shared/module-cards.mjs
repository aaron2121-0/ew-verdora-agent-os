// Owner-approved handbook card codes for a required training module.
// Database reads happen through a server-side service_role client only.
// Importantly, an unapproved/import-pending card is never returned.
const REQUIRED_MODULES=new Set([
  "CORE-BRAND","LEAD-FINDING","QUALIFY","REFERENCE","OBJECTION","CLOSING","PAYMENT"
]);
const SECTIONS=new Set([
  "story","product_line","service_rule","delivery","script","announcement","faq"
]);

export async function getApprovedModuleCardCodes(admin,moduleCode){
  if(typeof moduleCode!=="string"||!REQUIRED_MODULES.has(moduleCode)){
    return {error:"invalid_module_code",status:400};
  }
  try{
    const {data:module,error:moduleError}=await admin.from("training_modules")
      .select("code,handbook_section")
      .eq("code",moduleCode).eq("required",true).eq("active",true)
      .maybeSingle();
    if(moduleError)return {error:"module_cards_unavailable",status:503};
    if(!module)return {error:"module_not_found",status:404};

    // No approved matching cards: empty list is an intentional valid state,
    // not a reason to invent placeholder cards or expose pending entries.
    const section=module.handbook_section;
    if(!section||!SECTIONS.has(section)){
      return {ok:true,module_code:moduleCode,card_codes:[]};
    }
    const {data:rows,error}=await admin.from("company_knowledge")
      .select("code")
      .eq("kind","card")
      .eq("section",section)
      .eq("active",true)
      .eq("visible_to_agent",true)
      .eq("needs_owner_confirm",false)
      .order("sort",{ascending:true})
      .limit(200);
    if(error)return {error:"module_cards_unavailable",status:503};
    const codes=[...new Set((Array.isArray(rows)?rows:[])
      .map(row=>row?.code).filter(code=>typeof code==="string"&&code.length>0))];
    return {ok:true,module_code:moduleCode,card_codes:codes};
  }catch{
    // Fail closed. Never include raw database error or any secret in response.
    return {error:"module_cards_unavailable",status:503};
  }
}
