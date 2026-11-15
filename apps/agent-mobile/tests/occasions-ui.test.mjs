import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
test('occasion feature and all scene families are lazy and whitelisted without relaxing budgets',async()=>{
 const builder=await read('build-railway-function.mjs'),phase=await read('public/phase1.js');
 assert.match(phase,/import\("\.\/occasions\.js"\)/);
 for(const f of ['occasions.js','occasions.css','occasion-scenes.js','occasion-scene-graduation.js','occasion-scene-condolence.js'])assert.ok(builder.includes('"'+f+'"'),f);
 assert.match(builder,/!lazyOccasionJs\.has\(n\)/);assert.match(builder,/jsBytes>156\*1024/);
});
test('calendar renders data safely, scopes reminders by actor and cleans up scene/dialog lifecycle',async()=>{
 const source=await read('public/occasions.js');
 assert.doesNotMatch(source,/\.innerHTML\s*=|insertAdjacentHTML|eval\(|requestAnimationFrame|from ['"](?:react|motion)/);
 assert.match(source,/getDailyAlertStorageKey\(today\(\)\)\+'_'\+getUserId\(\)/);
 assert.match(source,/uid!==getUserId\(\)/);assert.match(source,/splitAlertBatch\(items,3\)/);
 assert.match(source,/scene\?\.destroy\(\)/);assert.match(source,/removeEventListener\('keydown'/);
 assert.match(source,/Array\.isArray\(result\?\.occasions\)/);
 assert.doesNotMatch(source,/Demo Agent|6 天连胜|11111111-000/);
});
