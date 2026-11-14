let p;
export async function mountBrandBg(t,o){
  if(!t)return;
  if(!window.VerdoraMotion?.mountBrandBg)p??=import("/vendor/motion-pack-v1/brand-bg.js");
  if(p)await p;
  if(t.isConnected)window.VerdoraMotion?.mountBrandBg?.(t,o);
}
