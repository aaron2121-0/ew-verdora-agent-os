import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(root,"index.ts"),"utf8");
for (const signature of [
  "Content-Security-Policy",
  "owner.js",
  "OWNER_QUOTE_STATUS_ACTIONS_ENABLED",
  "quoteStatusActionsEnabled",
  "escapeHtml"
]) {
  if (!source.includes(signature)) throw Error("Missing Owner security/feature flag: "+signature);
}
if (!source.includes("export default")) throw Error("Owner Railway Function must export a Bun fetch handler");
const dist=path.join(root,"dist");
fs.mkdirSync(dist,{recursive:true});
fs.writeFileSync(path.join(dist,"railway-function.ts"),source);
console.log("Owner Railway Function bundle verified; bytes="+Buffer.byteLength(source,"utf8"));
