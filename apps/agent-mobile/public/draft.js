const LOCAL_PREFIX="ew_phase1_order_draft_v2:";
const LEGACY_KEY="ew_phase1_order_draft_v1";
const DB_NAME="ew-verdora-agent-mobile";
const DB_VERSION=1;
const STORE="draft_files";
const FILE_PREFIX="order-reference:";

function userId(value){
  const id=String(value||"").trim();
  return id||null;
}
function localKey(id){return LOCAL_PREFIX+id}
function fileKey(id){return FILE_PREFIX+id}

function localGet(id){
  const uid=userId(id);if(!uid)return null;
  try{
    const raw=localStorage.getItem(localKey(uid));
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    if(!parsed||parsed.__user_id!==uid){
      localStorage.removeItem(localKey(uid));
      return null;
    }
    return parsed;
  }catch{return null}
}

export function loadOrderDraft(id){
  return localGet(id);
}

export function saveOrderDraft(id,draft){
  const uid=userId(id);if(!uid)return false;
  try{
    localStorage.setItem(localKey(uid),JSON.stringify({...draft,__user_id:uid}));
    return true;
  }catch{return false}
}

export function clearOrderDraftText(id){
  const uid=userId(id);
  try{
    if(uid)localStorage.removeItem(localKey(uid));
    localStorage.removeItem(LEGACY_KEY);
  }catch{}
}

function openDb(){
  if(!("indexedDB" in window))return Promise.resolve(null);
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error("indexeddb_unavailable"));
  });
}

async function deleteFileKeys(predicate){
  try{
    const db=await openDb();
    if(!db)return;
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");
      const store=tx.objectStore(STORE);
      const req=store.getAllKeys();
      req.onsuccess=()=>{
        for(const key of req.result||[]){
          if(predicate(String(key)))store.delete(key);
        }
      };
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }catch{}
}

export async function prepareOrderDraftForUser(id){
  const uid=userId(id);if(!uid)return;
  try{
    localStorage.removeItem(LEGACY_KEY);
    const current=localGet(uid);
    if(current&&current.__user_id!==uid)localStorage.removeItem(localKey(uid));
    const foreign=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i)||"";
      if(key.startsWith(LOCAL_PREFIX)&&key!==localKey(uid))foreign.push(key);
    }
    for(const key of foreign)localStorage.removeItem(key);
  }catch{}
  await deleteFileKeys(key=>key.startsWith(FILE_PREFIX)&&key!==fileKey(uid));
}

export async function saveOrderReference(id,file){
  const uid=userId(id);if(!uid)return false;
  try{
    const db=await openDb();
    if(!db)return false;
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).put(file,fileKey(uid));
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
    return true;
  }catch{return false}
}

export async function loadOrderReference(id){
  const uid=userId(id);if(!uid)return null;
  try{
    const db=await openDb();
    if(!db)return null;
    const value=await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readonly");
      const req=tx.objectStore(STORE).get(fileKey(uid));
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error);
    });
    db.close();
    return value instanceof Blob?value:null;
  }catch{return null}
}

export async function clearOrderDraft(id){
  const uid=userId(id);
  clearOrderDraftText(uid);
  if(!uid)return;
  await deleteFileKeys(key=>key===fileKey(uid));
}
