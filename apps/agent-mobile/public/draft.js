const LOCAL_KEY="ew_phase1_order_draft_v1";
const DB_NAME="ew-verdora-agent-mobile";
const DB_VERSION=1;
const STORE="draft_files";
const FILE_KEY="order-reference";

function localGet(){
  try{
    const raw=localStorage.getItem(LOCAL_KEY);
    return raw?JSON.parse(raw):null;
  }catch{return null}
}

export function loadOrderDraft(){
  return localGet();
}

export function saveOrderDraft(draft){
  try{localStorage.setItem(LOCAL_KEY,JSON.stringify(draft));return true}catch{return false}
}

export function clearOrderDraftText(){
  try{localStorage.removeItem(LOCAL_KEY)}catch{}
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

export async function saveOrderReference(file){
  try{
    const db=await openDb();
    if(!db)return false;
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).put(file,FILE_KEY);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
    return true;
  }catch{return false}
}

export async function loadOrderReference(){
  try{
    const db=await openDb();
    if(!db)return null;
    const value=await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readonly");
      const req=tx.objectStore(STORE).get(FILE_KEY);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error);
    });
    db.close();
    return value instanceof Blob?value:null;
  }catch{return null}
}

export async function clearOrderDraft(){
  clearOrderDraftText();
  try{
    const db=await openDb();
    if(!db)return;
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).delete(FILE_KEY);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }catch{}
}
