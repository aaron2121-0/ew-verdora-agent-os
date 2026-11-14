// EW VERDORA Agent: public static files only. Never cache session/PII/API responses.
const CACHE_NAME="ew-agent-static-v1";
const STATIC_FILES=new Set([
  "/styles.css","/app.js","/pwa-install.js","/i18n.js","/icons.js",
  "/components.js","/phase1.js","/order.js","/date.js","/draft.js",
  "/performance.js","/training.js","/motion.js","/handbook.js",
  "/approved-content.js","/ai-ui.js","/ai-chat.js","/kyc.js",
  "/unlock.js","/brand-loader.js","/brand-mark.svg","/favicon.svg",
  "/manifest.json","/icons/brand-192.png","/icons/brand-512.png"
]);
const STATIC_PREFIXES=[
  "/fonts/","/vendor/motion-pack-v1/","/ew-verdora-content/motion/"
];
function cacheable(url,request){
  if(request.method!=="GET"||request.mode==="navigate"||url.origin!==self.location.origin||url.search)return false;
  if(url.pathname.startsWith("/config")||url.pathname.startsWith("/api/")||
     url.pathname.startsWith("/functions/")||url.pathname.startsWith("/rest/")||
     url.pathname.startsWith("/auth/")||url.pathname.startsWith("/storage/"))return false;
  if(STATIC_FILES.has(url.pathname))return true;
  return STATIC_PREFIXES.some(p=>url.pathname.startsWith(p)) &&
    /\.(?:js|css|woff2|svg|png|webp|gif)$/.test(url.pathname);
}
self.addEventListener("install",event=>{
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(n=>n.startsWith("ew-agent-static-")&&n!==CACHE_NAME).map(n=>caches.delete(n)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch",event=>{
  const req=event.request,url=new URL(req.url);
  if(!cacheable(url,req))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const hit=await cache.match(req);
    if(hit)return hit;
    const response=await fetch(req,{cache:"no-store"});
    if(response.ok&&response.type==="basic"&&response.status===200){
      const type=response.headers.get("content-type")||"";
      if(/javascript|css|font|image|json/.test(type))await cache.put(req,response.clone());
    }
    return response;
  })());
});
