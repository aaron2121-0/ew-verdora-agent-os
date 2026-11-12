
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN="https://owner-mobile-production.up.railway.app";
const cors={
  "Access-Control-Allow-Origin":ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":"content-type, apikey",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json",
  "Cache-Control":"no-store",
  "Vary":"Origin"
};
const reply=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:cors});
const enc=new TextEncoder();

async function sha256Hex(v:string){
  const buf=await crypto.subtle.digest("SHA-256",enc.encode(v));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function validCode(v:string){return /^[a-f0-9]{64}$/i.test(v)}

const url=Deno.env.get("SUPABASE_URL")||"";
const pub=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default
  ||Deno.env.get("SUPABASE_ANON_KEY")||"";
const sec=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default
  ||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return reply({error:"method_not_allowed"},405);

  const origin=req.headers.get("Origin");
  if(origin&&origin!==ALLOWED_ORIGIN)return reply({error:"forbidden_origin"},403);
  if(!url||!pub||!sec)return reply({error:"server_config_error"},500);

  let body:any={};try{body=await req.json()}catch{}
  if(body.action!=="invite_session")return reply({error:"unknown_action"},400);
  const code=String(body.code||"").trim();
  if(!validCode(code))return reply({error:"invalid_or_expired_owner_link"},400);

  const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
  const publicClient=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}});
  const codeHash=await sha256Hex(code);

  const {data:consumed,error:consumeError}=await admin.rpc("consume_owner_auth_invite_internal",{p_code_hash:codeHash});
  if(consumeError){
    console.error("OWNER_INVITE_CONSUME",consumeError.code||"",consumeError.message||"");
    return reply({error:"owner_link_failed"},500);
  }
  if(!consumed||consumed.length!==1)return reply({error:"invalid_or_expired_owner_link"},400);

  try{
    const uid=consumed[0].owner_user_id;
    const ownerProbe=await admin.rpc("owner_dashboard_internal",{p_user_id:uid});
    if(ownerProbe.error)return reply({error:"owner_required"},403);

    const {data:userData,error:userError}=await admin.auth.admin.getUserById(uid);
    if(userError||!userData.user?.email)throw userError||new Error("owner_email_missing");
    const email=String(userData.user.email).toLowerCase();

    const {data:linkData,error:linkError}=await admin.auth.admin.generateLink({
      type:"magiclink",
      email
    });
    if(linkError)throw linkError;
    const tokenHash=linkData?.properties?.hashed_token;
    if(!tokenHash)throw new Error("token_generation_failed");

    const {data:verified,error:verifyError}=await publicClient.auth.verifyOtp({
      token_hash:tokenHash,
      type:"email"
    });
    if(verifyError||!verified.session)throw verifyError||new Error("session_generation_failed");

    return reply({
      ok:true,
      access_token:verified.session.access_token,
      refresh_token:verified.session.refresh_token,
      expires_in:verified.session.expires_in,
      token_type:verified.session.token_type,
      user_id:verified.user?.id||uid
    });
  }catch(e:any){
    console.error("OWNER_AUTH_SESSION",e?.message||e);
    return reply({error:"owner_link_failed"},500);
  }
});
