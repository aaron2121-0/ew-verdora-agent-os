import{element,setButtonLoading,toast}from"./components.js";
import{createIcon}from"./icons.js";
const tx=(l,e,z)=>l==="zh"?z:e;
export function mountConversationAssist({card,state,setState,api,getLang,occasions}){
 const l=getLang(),s=element("section",{className:"ai-coach-panel"});
 s.append(element("h3",{text:tx(l,"Paste customer chat","贴上客人对话")}));
 const a=element("textarea",{className:"ai-chat-input",attrs:{rows:"5",maxlength:"4000","aria-label":tx(l,"Paste customer chat","贴上客人对话")}});
 a.placeholder=tx(l,"Paste what the customer said…","把客人说的话贴在这里…");
 const b=element("button",{className:"btn btn-secondary btn-large",attrs:{type:"button"}});b.append(createIcon("sparkles",{size:20}),element("span",{text:tx(l,"Organise","帮我整理")}));
 b.onclick=async()=>{const conversation=a.value.trim();if(!conversation)return;setButtonLoading(b,true,tx(l,"Working…","整理中…"));try{const j=await api.ai({action:"conversation_extract",conversation}),x=j.content||{},p={};if(x.customer_name)p.customerName=String(x.customer_name).slice(0,120);if(occasions.some(o=>o[0]===x.occasion))p.occasion=x.occasion;if(Number(x.budget)>0)p.budget=Number(x.budget);setState(p);toast(j.provider==="gemini"?tx(l,"Organised — check before continuing.","整理好了，继续前看一下。"):tx(l,"Template used — please check.","这次用模板，继续前看一下。"),{tone:"success"})}catch(e){toast(api.friendlyError(e?.message),{tone:"danger"})}finally{setButtonLoading(b,false,tx(l,"Organise","帮我整理"))}};
 s.append(a,b);card.append(s);
}
