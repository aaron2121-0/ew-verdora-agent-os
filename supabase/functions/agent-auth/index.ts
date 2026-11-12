
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN="https://agent-mobile-production.up.railway.app";
const cors={
  "Access-Control-Allow-Origin":ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":"content-type, apikey",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json"
};
const reply=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:cors});
const enc=new TextEncoder();
async function sha256Hex(v:string){
  const buf=await crypto.subtle.digest("SHA-256",enc.encode(v));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function validEmail(v:string){const at=v.indexOf("@"),dot=v.lastIndexOf(".");return at>0&&dot>at+1&&dot<v.length-1&&!v.includes(" ")}
