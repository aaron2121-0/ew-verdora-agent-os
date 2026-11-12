import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {fileURLToPath} from "node:url";

const root=path.dirname(fileURLToPath(import.meta.url));
const publicDir=path.join(root,"public");
const names=["index.html","styles.css","app.js","i18n.js","icons.js","components.js","phase1.js","order.js","date.js","draft.js","performance.js","training.js","motion.js","ai-ui.js","ai-chat.js"];
const files=Object.fromEntries(names.map(name=>[name,fs.readFileSync(path.join(publicDir,name),"utf8")]));
const sdkCandidates=[path.join(root,"node_modules","@supabase","supabase-js","dist","umd","supabase.js"),path.join(root,"..","..","node_modules","@supabase","supabase-js","dist","umd","supabase.js")];
const sdkPath=sdkCandidates.find(p=>fs.existsSync(p));
if(!sdkPath)throw new Error("Pinned Supabase SDK 2.119.0 missing: run npm install before building");
files["vendor/supabase-2.119.0.js"]=fs.readFileSync(sdkPath,"utf8");
const sdkPkg=JSON.parse(fs.readFileSync(path.resolve(path.dirname(sdkPath),"../../package.json"),"utf8"));
if(sdkPkg.version!=="2.119.0")throw new Error("Supabase SDK version mismatch: "+sdkPkg.version);
const gzip=text=>zlib.gzipSync(Buffer.from(text,"utf8"),{level:9}).toString("base64");

const CSP=[
  "default-src 'self'",
  "script-src 'self'",
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

const encoded={"/":gzip(files["index.html"]),"/index.html":gzip(files["index.html"])};
const types={"/":"text/html; charset=utf-8","/index.html":"text/html; charset=utf-8"};
for(const name of [...names.slice(1),"vendor/supabase-2.119.0.js"]){
  encoded["/"+name]=gzip(files[name]);
  types["/"+name]=name.endsWith(".css")?"text/css; charset=utf-8":"text/javascript; charset=utf-8";
}

const output=`const ASSETS=${JSON.stringify(encoded)};
const TYPES=${JSON.stringify(types)};
const CSP=${JSON.stringify(CSP)};
const decoded=new Map();
function bodyFor(path){
  if(decoded.has(path))return decoded.get(path);
  const raw=ASSETS[path];
  if(raw===undefined)return null;
  const value=Bun.gunzipSync(Buffer.from(raw,"base64"));
  decoded.set(path,value);
  return value;
}
function headers(extra={}){return {"Content-Security-Policy":CSP,"X-Content-Type-Options":"nosniff","Referrer-Policy":"strict-origin-when-cross-origin","Permissions-Policy":"camera=(), microphone=(), geolocation=()","Cross-Origin-Opener-Policy":"same-origin",...extra}}
export default {fetch(req){
  const u=new URL(req.url);
  if(u.pathname==="/config")return Response.json({url:Bun.env.SUPABASE_URL||"",key:Bun.env.SUPABASE_PUBLISHABLE_KEY||""},{headers:headers({"cache-control":"no-store"})});
  if(u.pathname==="/health"||u.pathname==="/api/health")return Response.json({ok:true,service:"EW VERDORA Agent Mobile",version:"0.6.0-motion",source:"native-motion-gzip-bundle"},{headers:headers({"cache-control":"no-store"})});
  const body=bodyFor(u.pathname);
  if(body===null)return new Response("Not found",{status:404,headers:headers({"content-type":"text/plain; charset=utf-8"})});
  return new Response(body,{headers:headers({"content-type":TYPES[u.pathname]||"application/octet-stream","cache-control":u.pathname==="/"||u.pathname==="/index.html"?"no-store":"public, max-age=300"})});
}};`;

const outDir=path.join(root,"dist");
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,"railway-function.ts"),output);
const jsNames=Object.keys(files).filter(n=>n.endsWith(".js"));
const jsBytes=jsNames.reduce((sum,n)=>sum+zlib.gzipSync(Buffer.from(files[n]),{level:9}).length,0);
if(jsBytes>150*1024)throw new Error(`JS gzip budget exceeded: ${jsBytes} bytes`);
console.log(`Generated ${output.length} bytes from ${Object.keys(files).length} assets; JS gzip ${jsBytes} bytes`);
