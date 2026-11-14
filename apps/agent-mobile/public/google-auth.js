// Isolated Google sign-in UX; invite login and the registration form remain untouched.
export const googleStrings = {
  en: {
    googleContinue:"Continue with Google",
    googleChecking:"Checking security…",
    googleRedirecting:"Redirecting to Google…",
    googleVerify:"Complete the security check to continue.",
    googleCaptchaFailed:"Security check failed or expired. Please try again.",
    googleCaptchaUnavailable:"Google sign-in is not ready. Please contact the Owner.",
    googleFailed:"Google sign-in failed. Please try again.",
    googleCancelled:"Google sign-in was cancelled. You can try again.",
    googleSessionFailed:"Could not complete Google sign-in. Please try again.",
    inviteOnlyTitle:"Registration is by invitation only",
    inviteOnlyBody:"New Agent registration is currently closed. Please ask the Owner for an invitation link.",
    ownerBlockedTitle:"This account belongs to an Owner",
    ownerBlockedBody:"Please use the Owner dashboard. This account cannot register as an Agent."
  },
  zh: {
    googleContinue:"用 Google 继续",
    googleChecking:"正在进行安全验证…",
    googleRedirecting:"正在前往 Google…",
    googleVerify:"请先完成安全验证，再继续。",
    googleCaptchaFailed:"安全验证失败或已过期，请再试一次。",
    googleCaptchaUnavailable:"Google 登录暂时未开放，请联系 Owner。",
    googleFailed:"Google 登录失败，请重试。",
    googleCancelled:"已取消 Google 登录，随时可以再试。",
    googleSessionFailed:"Google 登录无法完成，请重试。",
    inviteOnlyTitle:"目前只接受邀请注册",
    inviteOnlyBody:"新 Agent 注册目前尚未开放。请向 Owner 索取邀请链接。",
    ownerBlockedTitle:"此帐号是 Owner",
    ownerBlockedBody:"请使用 Owner 后台。Owner 帐号不能注册成 Agent。"
  }
};
export function googleText(lang,key){
  return (googleStrings[lang==="zh"?"zh":"en"]||googleStrings.en)[key]||key;
}
export function oauthReturnError(search){
  const params=new URLSearchParams(String(search||"").replace(/^\?/,""));
  const code=params.get("error");
  if(!code)return null;
  if(code==="access_denied"||code==="user_cancelled"||/cancel/i.test(params.get("error_description")||""))
    return "googleCancelled";
  return "googleFailed";
}

export function createGoogleLogin({getClient,getConfig,getLang}){
  const button=document.getElementById("googleLoginBtn");
  const message=document.getElementById("googleLoginMsg");
  const target=document.getElementById("googleTurnstile");
  let widgetId=null,token="",messageKey="",working=false;
  const t=key=>googleText(getLang(),key);
  function show(key){
    messageKey=key||"";
    if(message)message.textContent=key?t(key):"";
  }
  function localize(){
    document.querySelectorAll("[data-google-i18n]").forEach(el=>{
      el.textContent=t(el.dataset.googleI18n);
    });
    if(messageKey)show(messageKey);
    if(button)button.textContent=working?t("googleChecking"):t("googleContinue");
  }
  function reset(){
    token="";
    if(button)button.disabled=true;
    if(widgetId!==null&&window.turnstile)window.turnstile.reset(widgetId);
  }
  async function loadTurnstile(){
    if(window.turnstile)return window.turnstile;
    await new Promise((resolve,reject)=>{
      const script=document.createElement("script");
      script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async=true;script.crossOrigin="anonymous";
      const timer=setTimeout(()=>reject(new Error("turnstile_timeout")),15000);
      script.onload=()=>{clearTimeout(timer);resolve()};
      script.onerror=()=>{clearTimeout(timer);reject(new Error("turnstile_unavailable"))};
      document.head.appendChild(script);
    });
    if(!window.turnstile)throw new Error("turnstile_unavailable");
    return window.turnstile;
  }
  async function init(){
    localize();
    if(!button||!target)return;
    button.disabled=true;
    button.addEventListener("click",async()=>{
      if(working)return;
      if(!token){show("googleVerify");return;}
      const challenge=token;
      working=true;button.disabled=true;button.textContent=t("googleChecking");show("");
      try{
        const cfg=getConfig();
        const response=await fetch(cfg.url+"/functions/v1/agent-auth",{
          method:"POST",
          headers:{"content-type":"application/json","apikey":cfg.key},
          body:JSON.stringify({action:"google_captcha_verify",token:challenge}),
          cache:"no-store"
        });
        if(!response.ok)throw new Error("captcha_failed");
        const verified=await response.json();
        if(verified.ok!==true)throw new Error("captcha_failed");
        show("googleRedirecting");
        const {error}=await getClient().auth.signInWithOAuth({
          provider:"google",
          options:{redirectTo:window.location.origin+"/"}
        });
        if(error)throw new Error("google_failed");
      }catch(e){
        show(e?.message==="captcha_failed"?"googleCaptchaFailed":"googleFailed");
      }finally{
        working=false;button.textContent=t("googleContinue");reset();
      }
    });
    const siteKey=String(getConfig()?.turnstileSiteKey||"");
    if(!siteKey){show("googleCaptchaUnavailable");return;}
    try{
      const turnstile=await loadTurnstile();
      widgetId=turnstile.render(target,{
        sitekey:siteKey,
        action:"google_signup",
        callback:value=>{token=value;if(button)button.disabled=false;show("")},
        "expired-callback":()=>{token="";if(button)button.disabled=true;show("googleCaptchaFailed")},
        "error-callback":()=>{token="";if(button)button.disabled=true;show("googleCaptchaFailed")}
      });
    }catch{show("googleCaptchaUnavailable");}
  }
  return {init,localize,show};
}
