import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.argv[2]||'.next/static';
let count=0;
async function scan(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const name=path.join(dir,entry.name);if(entry.isDirectory())await scan(name);else if(/\.(js|json|html|css)$/.test(name)){count++;const text=await readFile(name,'utf8');assert.ok(!/AI_CHAT_KEY|AI_PROVIDER_KEY|CRM_WEBHOOK_TOKEN|NOTIFICATION_WEBHOOK_TOKEN|fixture-only|BEGIN PRIVATE KEY/.test(text),'Server-only marker in '+name);assert.ok(!text.includes('https://api.cubeappmaker.agency'),'External HYBRID API baked into '+name);}}}
await scan(root);console.log('Browser bundle security scan PASS:',count,'files; no server secret markers or external API base.');
