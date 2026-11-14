// EW VERDORA Agent Mobile — Railway Function loader.
// Railway Functions cap source at 96KB; the bundle is ~450KB.
// This loader fetches the bundle from an immutable GitHub commit, verifies its
// SHA-256, and parses ONLY the ASSETS/TYPES JSON data (no remote code is executed).
// To release a new bundle: update BUNDLE_COMMIT + BUNDLE_SHA256 + VERSION, then redeploy.
const BUNDLE_COMMIT="5b1d5fa0b79c1f9190c6fbebd9eee7f47449c14c";
const BUNDLE_SHA256="5d706e14879526c0e863a94516bb252b2c744a31ebc607db35b81847f4890d77";
const BUNDLE_URL=`https://raw.githubusercontent.com/aaron2121-0/ew-verdora-agent-os/${BUNDLE_COMMIT}/apps/agent-mobile/dist/railway-function.ts`;
const VERSION="1.1.3";

async function loadBundle(){
  let lastErr="";
  for(let i=0;i<3;i++){
    try{
      const r=await fetch(BUNDLE_URL,{signal:AbortSignal.timeout(15000)});
      if(!r.ok)throw new Error("http_"+r.status);
      const text=await r.text();
      const hash=new Bun.CryptoHasher("sha256").update(text).digest("hex");
      if(hash!==BUNDLE_SHA256)throw new Error("bundle_hash_mismatch");
      const lines=text.split("\n");
      const pick=(prefix:string)=>{const l=lines.find(x=>x.startsWith(prefix));if(!l)throw new Error("bundle_missing_"+prefix);return JSON.parse(l.slice(prefix.length).replace(/;\s*$/,""));};
      return {assets:pick("const ASSETS=") as Record<string,string>,types:pick("const TYPES=") as Record<string,string>,csp:pick("const CSP=") as string};
    }catch(e){lastErr=String((e as Error)?.message||e);await Bun.sleep(1000*(i+1));}
  }
  throw new Error("bundle_load_failed:"+lastErr);
}

const {assets:ASSETS,types:TYPES,csp:BUNDLE_CSP}=await loadBundle();
// Motion pack (brand background, AI orb, cards) renders style="" attributes.
// Allow inline STYLES only; script-src stays strict (no inline scripts).
const CSP=BUNDLE_CSP.replace("style-src 'self'","style-src 'self' 'unsafe-inline'");
const decoded=new Map<string,Uint8Array>();
function bodyFor(path:string,compressed=false){
  const key=path+(compressed?"|gzip":"|plain");
  const hit=decoded.get(key);if(hit)return hit;
  const raw=ASSETS[path];
  if(raw===undefined)return null;
  const packed=Buffer.from(raw,"base64");
  const value=compressed?packed:Bun.gunzipSync(packed);
  decoded.set(key,value);
  return value;
}
function headers(extra:Record<string,string>={}){return {"Content-Security-Policy":CSP,"X-Content-Type-Options":"nosniff","Referrer-Policy":"strict-origin-when-cross-origin","Permissions-Policy":"camera=(), microphone=(), geolocation=()","Cross-Origin-Opener-Policy":"same-origin",...extra}}
export default {fetch(req:Request){
  const u=new URL(req.url);
  if(u.pathname==="/config")return Response.json({url:Bun.env.SUPABASE_URL||"",key:Bun.env.SUPABASE_PUBLISHABLE_KEY||""},{headers:headers({"cache-control":"no-store"})});
  if(u.pathname==="/health"||u.pathname==="/api/health")return Response.json({ok:true,service:"EW VERDORA Agent Mobile",version:VERSION,source:"github-pinned-loader",bundle:BUNDLE_COMMIT.slice(0,8)},{headers:headers({"cache-control":"no-store"})});
  const compressed=/\bgzip\b/.test(req.headers.get("accept-encoding")||"");
  const body=bodyFor(u.pathname,compressed);
  if(body===null)return new Response("Not found",{status:404,headers:headers({"content-type":"text/plain; charset=utf-8"})});
  return new Response(body,{headers:headers({"content-type":TYPES[u.pathname]||"application/octet-stream","cache-control":u.pathname==="/"||u.pathname==="/index.html"?"no-store":"public, max-age=300","vary":"Accept-Encoding",...(compressed?{"content-encoding":"gzip"}:{})})});
}};
