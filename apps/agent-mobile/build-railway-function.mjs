import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {createHash} from "node:crypto";
import subsetFont from "subset-font";
import {fileURLToPath} from "node:url";

const root=path.dirname(fileURLToPath(import.meta.url));
const publicDir=path.join(root,"public");
const names=["index.html","styles.css","app.js","i18n.js","icons.js","components.js","phase1.js","order.js","date.js","draft.js","performance.js","training.js","motion.js","ai-ui.js","ai-chat.js","unlock.js","guide.js","brand-mark.svg","favicon.svg"];
const files=Object.fromEntries(names.map(name=>[name,fs.readFileSync(path.join(publicDir,name),"utf8")]));
const fontModuleRoots=[path.join(root,"node_modules"),path.join(root,"..","..","node_modules")];
const fontFile=(packageName,filename)=>{
 const found=fontModuleRoots.map(base=>path.join(base,packageName,"files",filename)).find(p=>fs.existsSync(p));
 if(!found)throw new Error("Missing font asset: "+packageName+"/"+filename);
 return found;
};
const inter=fs.readFileSync(fontFile("@fontsource-variable/inter","inter-latin-wght-normal.woff2"));
const notoSource=fs.readFileSync(fontFile("@fontsource/noto-sans-sc","noto-sans-sc-chinese-simplified-400-normal.woff2"));
const fixedText=Object.entries(files).filter(([name])=>name.endsWith(".js")||name.endsWith(".html")).map(([,value])=>value).join("\n");
const glyphs=[...new Set((fixedText.match(/[\u3400-\u9FFF\uF900-\uFAFF]/gu)||[]))].join("");
const noto=await subsetFont(notoSource,glyphs,{targetFormat:"woff2"});
const ranges=[...glyphs].map(ch=>"U+"+ch.codePointAt(0).toString(16).toUpperCase()).join(",");
if(inter.length+noto.length>350*1024)throw new Error("Font asset budget exceeded: "+(inter.length+noto.length));
const generatedFonts=path.join(publicDir,"fonts");
fs.mkdirSync(generatedFonts,{recursive:true});
fs.writeFileSync(path.join(generatedFonts,"inter-latin.woff2"),inter);
fs.writeFileSync(path.join(generatedFonts,"noto-app-subset.woff2"),noto);
files["styles.css"]+=`\n@font-face{font-family:Inter;src:url("/fonts/inter-latin.woff2") format("woff2");font-style:normal;font-weight:100 900;font-display:swap;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}\n@font-face{font-family:"Noto Sans SC";src:url("/fonts/noto-app-subset.woff2") format("woff2");font-style:normal;font-weight:400;font-display:swap;unicode-range:${ranges}}\n`;
// E2E serves the exact CSS after font-face injection, matching the Railway asset.
const outDirForTests=path.join(root,"dist");
fs.mkdirSync(outDirForTests,{recursive:true});
fs.writeFileSync(path.join(outDirForTests,"styles.test.css"),files["styles.css"]);
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
  types["/"+name]=name.endsWith(".css")?"text/css; charset=utf-8":name.endsWith(".svg")?"image/svg+xml":"text/javascript; charset=utf-8";
}

encoded["/fonts/inter-latin.woff2"]=zlib.gzipSync(inter,{level:9}).toString("base64");
encoded["/fonts/noto-app-subset.woff2"]=zlib.gzipSync(noto,{level:9}).toString("base64");
types["/fonts/inter-latin.woff2"]="font/woff2";
types["/fonts/noto-app-subset.woff2"]="font/woff2";
const output=`const ASSETS=${JSON.stringify(encoded)};
const TYPES=${JSON.stringify(types)};
const CSP=${JSON.stringify(CSP)};
const decoded=new Map();
function bodyFor(path,compressed=false){
  const key=path+(compressed?"|gzip":"|plain");
  if(decoded.has(key))return decoded.get(key);
  const raw=ASSETS[path];
  if(raw===undefined)return null;
  const packed=Buffer.from(raw,"base64");
  const value=compressed?packed:Bun.gunzipSync(packed);
  decoded.set(key,value);
  return value;
}
function headers(extra={}){return {"Content-Security-Policy":CSP,"X-Content-Type-Options":"nosniff","Referrer-Policy":"strict-origin-when-cross-origin","Permissions-Policy":"camera=(), microphone=(), geolocation=()","Cross-Origin-Opener-Policy":"same-origin",...extra}}
export default {fetch(req){
  const u=new URL(req.url);
  if(u.pathname==="/config")return Response.json({url:Bun.env.SUPABASE_URL||"",key:Bun.env.SUPABASE_PUBLISHABLE_KEY||""},{headers:headers({"cache-control":"no-store"})});
  if(u.pathname==="/health"||u.pathname==="/api/health")return Response.json({ok:true,service:"EW VERDORA Agent Mobile",version:"0.6.1-motion",source:"native-motion-gzip-bundle"},{headers:headers({"cache-control":"no-store"})});
  const compressed=/\\bgzip\\b/.test(req.headers.get("accept-encoding")||"");
  const body=bodyFor(u.pathname,compressed);
  if(body===null)return new Response("Not found",{status:404,headers:headers({"content-type":"text/plain; charset=utf-8"})});
  return new Response(body,{headers:headers({"content-type":TYPES[u.pathname]||"application/octet-stream","cache-control":u.pathname==="/"||u.pathname==="/index.html"?"no-store":"public, max-age=300","vary":"Accept-Encoding",...(compressed?{"content-encoding":"gzip"}:{})})});
}};`;

const outDir=path.join(root,"dist");
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,"railway-function.ts"),output);
const jsNames=Object.keys(files).filter(n=>n.endsWith(".js"));
const jsBytes=jsNames.reduce((sum,n)=>sum+zlib.gzipSync(Buffer.from(files[n]),{level:9}).length,0);
if(jsBytes>150*1024)throw new Error(`JS gzip budget exceeded: ${jsBytes} bytes`);
console.log(`Generated ${output.length} bytes from ${Object.keys(files).length+2} assets; JS gzip ${jsBytes} bytes; font raw ${inter.length+noto.length} bytes`);
console.log("BUNDLE_SHA256 "+createHash("sha256").update(output,"utf8").digest("hex"));
