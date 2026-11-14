// Pure validation: shared by the Agent Edge Function and offline tests.
// No NRIC, date of birth or phone values are logged or returned on errors.
export const KYC_CONSENT_VERSION = "v1.0-2026-11";
export const KYC_AREAS = Object.freeze([
  "Kuching","Matang","Batu Kawa","Tabuan Jaya","Petra Jaya",
  "Satok","Padawan","Siburan","Samarahan","Other"
]);
export const KYC_MIME_TYPES = Object.freeze(["image/jpeg","image/png","image/webp"]);
export const KYC_MAX_BYTES = 5 * 1024 * 1024;

export function validateAgentKyc(input, now = new Date()) {
  if (input?.consent !== true) return { ok:false, error:"kyc_consent_required" };
  if (input?.consent_version !== KYC_CONSENT_VERSION)
    return { ok:false, error:"kyc_invalid_consent_version" };
  const legalName = typeof input?.legal_name === "string" ? input.legal_name.trim() : "";
  const preferredName = typeof input?.preferred_name === "string" ? input.preferred_name.trim() : "";
  if (legalName.length < 2 || legalName.length > 120 || preferredName.length < 2 || preferredName.length > 120)
    return { ok:false, error:"kyc_invalid_name" };
  const icRaw = typeof input?.ic_number === "string" ? input.ic_number.trim() : "";
  if (!/^(?:[0-9]{12}|[0-9]{6}-[0-9]{2}-[0-9]{4})$/.test(icRaw))
    return { ok:false, error:"kyc_invalid_ic_format" };
  const ic = icRaw.replace(/-/g,"");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone:"Asia/Kuching", year:"numeric",month:"2-digit",day:"2-digit"
  }).formatToParts(now);
  const year = Number(parts.find(p=>p.type==="year")?.value);
  const month = Number(parts.find(p=>p.type==="month")?.value);
  const day = Number(parts.find(p=>p.type==="day")?.value);
  const yy = Number(ic.slice(0,2));
  const birthYear = yy <= year % 100 ? 2000 + yy : 1900 + yy;
  const birthMonth = Number(ic.slice(2,4));
  const birthDay = Number(ic.slice(4,6));
  const date = new Date(Date.UTC(birthYear,birthMonth-1,birthDay));
  if (date.getUTCFullYear() !== birthYear ||
      date.getUTCMonth() !== birthMonth-1 ||
      date.getUTCDate() !== birthDay)
    return { ok:false, error:"kyc_invalid_ic_date" };
  const age = year-birthYear - (month < birthMonth || (month===birthMonth && day<birthDay) ? 1:0);
  if(age < 18) return { ok:false, error:"kyc_underage" };
  const rawPhone=typeof input?.phone_whatsapp==="string" ? input.phone_whatsapp.replace(/[\s()+-]/g,"") : "";
  const phone=rawPhone.startsWith("0")?"6"+rawPhone:rawPhone;
  if (!/^601[0-9]{8,9}$/.test(phone))
    return { ok:false, error:"kyc_invalid_phone" };
  if(!KYC_AREAS.includes(input?.area))return {ok:false,error:"kyc_invalid_area"};
  return {
    ok:true,
    legal_name:legalName,
    preferred_name:preferredName,
    ic_number:ic,
    phone_whatsapp:phone,
    area:input.area,
    consent_version:KYC_CONSENT_VERSION
  };
}

export function matchesKycImage(bytes,mime) {
  if (!(bytes instanceof Uint8Array) || !KYC_MIME_TYPES.includes(mime))return false;
  if (mime==="image/jpeg")return bytes.length>=3 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff;
  if (mime==="image/png")return bytes.length>=8 && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  return bytes.length>=12 && bytes[0]===82 && bytes[1]===73 &&
    bytes[2]===70 && bytes[3]===70 && bytes[8]===87 &&
    bytes[9]===69 && bytes[10]===66 && bytes[11]===80;
}

/**
 * Shared registration dispatcher. The Edge Function calls this exact path,
 * so offline tests can verify both flag states with mocked privileged RPCs.
 * Never log or return identity fields.
 */
export async function registerAgentWithKycGate({
  body,uid,admin,kycRequired=false,
  cleanName=v=>String(v??"").trim().slice(0,120),
  safeLegacyError=()=> "request_failed",
  safeKycError=()=> "kyc_request_failed"
}) {
  const language=body.language==="zh"?"zh":"en";
  let registration;
  if(kycRequired){
    const valid=validateAgentKyc(body);
    if(!valid.ok)return {status:422,payload:{error:valid.error}};
    registration=await admin.rpc("agent_kyc_register_internal",{
      p_user_id:uid,p_display_name:valid.preferred_name,p_language:language,
      p_legal_name:valid.legal_name,p_preferred_name:valid.preferred_name,
      p_ic_number:valid.ic_number,p_phone_whatsapp:valid.phone_whatsapp,
      p_area:valid.area,p_consent:true,p_consent_version:valid.consent_version
    });
    if(registration.error){
      const error=safeKycError(registration.error);
      return {status:error==="kyc_duplicate_ic"?409:422,payload:{error}};
    }
  }else{
    const displayName=cleanName(body.display_name);
    if(!displayName)return {status:400,payload:{error:"display_name_required"}};
    registration=await admin.rpc("register_agent_internal",{
      p_user_id:uid,p_display_name:displayName,p_language:language
    });
    if(registration.error)return {status:400,payload:{error:safeLegacyError(registration.error)}};
  }
  const {data:agent}=await admin.from("agents").select("id,agent_code")
    .eq("id",registration.data).single();
  const payload={ok:true,agent_id:registration.data,agent_code:agent?.agent_code||null};
  if(kycRequired)payload.kyc_status="draft";
  return {status:200,payload};
}
