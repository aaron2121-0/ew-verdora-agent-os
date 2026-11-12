import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.dirname(fileURLToPath(import.meta.url));
const publicDir=path.join(root,"public");
const names=["index.html","styles.css","app.js","i18n.js","icons.js","components.js"];
const files=Object.fromEntries(names.map(name=>[name,fs.readFileSync(path.join(publicDir,name),"utf8")]));

const CSP=[
  "default-src 'self'",
  "script-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "upgrade-insecure-requests"
].join("; ");

const assets={
  "/":files["index.html"],
  "/index.html":files["index.html"],
  "/styles.css":files["styles.css"],
  "/app.js":files["app.js"],
  "/i18n.js":files["i18n.js"],
  "/icons.js":files["icons.js"],
  "/components.js":files["components.js"]
};
const types={
  "/":"text/html; charset=utf-8",
  "/index.html":"text/html; charset=utf-8",
  "/styles.css":"text/css; charset=utf-8",
  "/app.js":"text/javascript; charset=utf-8",
  "/i18n.js":"text/javascript; charset=utf-8",
  "/icons.js":"text/javascript; charset=utf-8",
  "/components.js":"text/javascript; charset=utf-8"
};

const output=`const ASSETS=${JSON.stringify(assets)};
const TYPES=${JSON.stringify(types)};
const CSP=${JSON.stringify(CSP)};
function headers(extra={}){return {"Content-Security-Policy":CSP,"X-Content-Type-Options":"nosniff","Referrer-Policy":"strict-origin-when-cross-origin","Permissions-Policy":"camera=(), microphone=(), geolocation=()","Cross-Origin-Opener-Policy":"same-origin",...extra}}
export default {
  fetch(req){
    const u=new URL(req.url);
    if(u.pathname==="/config")return Response.json({url:Bun.env.SUPABASE_URL||"",key:Bun.env.SUPABASE_PUBLISHABLE_KEY||""},{headers:headers({"cache-control":"no-store"})});
    if(u.pathname==="/health")return Response.json({ok:true,service:"EW VERDORA Agent Mobile",version:"0.3.0-phase0",source:"split-static-bundle"},{headers:headers({"cache-control":"no-store"})});
    const body=ASSETS[u.pathname];
    if(body===undefined)return new Response("Not found",{status:404,headers:headers({"content-type":"text/plain; charset=utf-8"})});
    return new Response(body,{headers:headers({"content-type":TYPES[u.pathname]||"application/octet-stream","cache-control":u.pathname==="/"||u.pathname==="/index.html"?"no-store":"public, max-age=300"})});
  }
};
`;

const outDir=path.join(root,"dist");
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,"railway-function.ts"),output);
console.log(`Generated ${output.length} bytes from ${names.length} split assets`);
