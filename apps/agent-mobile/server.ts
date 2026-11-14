const PORT=Number(Bun.env.PORT||3000);
const ROOT=new URL("./public/",import.meta.url);
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".woff2":"font/woff2"};
const CSP=[
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com",
  "style-src 'self'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "upgrade-insecure-requests"
].join("; ");
function headers(extra={}){return {"Content-Security-Policy":CSP,"X-Content-Type-Options":"nosniff","Referrer-Policy":"strict-origin-when-cross-origin","Permissions-Policy":"camera=(), microphone=(), geolocation=()","Cross-Origin-Opener-Policy":"same-origin",...extra}}
Bun.serve({port:PORT,async fetch(req){
  const u=new URL(req.url);
  if(u.pathname==="/config")return Response.json({url:Bun.env.SUPABASE_URL||"",key:Bun.env.SUPABASE_PUBLISHABLE_KEY||"",turnstileSiteKey:Bun.env.TURNSTILE_SITE_KEY||""},{headers:headers({"cache-control":"no-store"})});
  if(u.pathname==="/health"||u.pathname==="/api/health")return Response.json({ok:true,service:"EW VERDORA Agent Mobile",version:"0.6.0-motion"},{headers:headers({"cache-control":"no-store"})});
  let path=u.pathname==="/"?"index.html":u.pathname.replace(/^\//,"");
  if(path.includes(".."))return new Response("Not found",{status:404,headers:headers()});
  const file=path==="vendor/supabase-2.119.0.js"?Bun.file(new URL("../../node_modules/@supabase/supabase-js/dist/umd/supabase.js",import.meta.url)):
    path.startsWith("content/handbook/")?Bun.file(new URL("../../"+path,import.meta.url)):
    Bun.file(new URL(path,ROOT));
  if(!(await file.exists()))return new Response("Not found",{status:404,headers:headers()});
  const ext=path.slice(path.lastIndexOf("."));
  return new Response(file,{headers:headers({"content-type":mime[ext]||"application/octet-stream","cache-control":ext===".html"?"no-store":"public, max-age=300"})});
}});
