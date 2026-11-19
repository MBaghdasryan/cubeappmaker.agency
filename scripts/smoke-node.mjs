import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const base=process.env.TEST_BASE||'http://127.0.0.1:5317';
const origin=process.env.TEST_ORIGIN||'https://www.cubeappmaker.agency';
const post=(endpoint,body,extra={})=>fetch(base+endpoint+'/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
const lead={problem:'Support fixture',contact:'test@example.com',recommendedServices:[],recommendedArchitecture:'AI Agent',conversationSummary:'Fixture only',source:'cubeapp-website',timestamp:new Date().toISOString()};
const id='node-fixture-lead-123456789';
if(process.env.RECHECK_DUPLICATE==='1'){
 const r=await post('/api/leads',lead,{'Idempotency-Key':id});assert.equal(r.status,200);assert.equal((await r.json()).duplicate,true);console.log('Restart-persistent lead duplicate PASS');process.exit(0);
}
for(const endpoint of ['/','/services/ai-agents/','/solutions/customer-support/','/projects/travel-ai-platform/','/sitemap.xml','/robots.txt','/api/health/','/healthz/']){
 const r=await fetch(base+endpoint);assert.equal(r.status,200,endpoint);await r.arrayBuffer();
}
assert.equal((await fetch(base+'/nonexistent-page/')).status,404);
const home=await (await fetch(base+'/')).text();
assert.ok(home.includes('https://www.cubeappmaker.agency'));
const assets=new Set([...home.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]).filter(s=>s.startsWith('/_next/')));
assert.ok(assets.size>0);
for(const asset of assets){const r=await fetch(base+asset);assert.equal(r.status,200,asset);assert.ok((await r.arrayBuffer()).byteLength>0);}
assert.equal((await fetch(base+'/.env')).status,404);
assert.equal((await fetch(base+'/data/cubeapp.sqlite')).status,404);

for(const asset of ['models/cube.glb','images/social-card.png',...['cube-hover.webm','cube-release.webm','pointer-energy.webm','scroll-tick.webm','ai-activate.webm','ai-processing.webm','ai-result.webm','cube-ambient.mp3','ui-click.mp3','ui-hover.mp3'].map(n=>'audio/'+n)]){
 const r=await fetch(base+'/'+asset);assert.equal(r.status,200,asset);const b=Buffer.from(await r.arrayBuffer());assert.equal(createHash('sha256').update(b).digest('hex'),createHash('sha256').update(readFileSync('public/'+asset)).digest('hex'));
}
const status=await (await fetch(base+'/api/status/')).json();assert.equal(status.verified,false);
let r=await post('/api/recommend',{problem:'Support automation'});assert.equal(r.status,200);let data=await r.json();assert.equal(data.mode,process.env.FIXTURES==='1'?'ai':'guided');assert.ok(data.components.length);
r=await post('/api/recommend',{problem:'quota-fixture'});assert.equal(r.status,200);assert.equal((await r.json()).mode,'guided');
r=await post('/api/recommend',{problem:'x'},{Origin:'https://evil.example'});assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);
r=await fetch(base+'/api/recommend/',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"problem":"test"}'});assert.equal(r.status,403);
r=await post('/api/recommend',{problem:''});assert.equal(r.status,400);
r=await post('/api/recommend',{problem:'x'.repeat(31000)});assert.equal(r.status,413);
r=await post('/api/leads',{...lead,contact:'invalid'},{'Idempotency-Key':id});assert.equal(r.status,400);
if(process.env.FIXTURES==='1'){
 r=await post('/api/leads',lead,{'Idempotency-Key':id});assert.equal(r.status,200);assert.equal((await r.json()).delivered,true);
 r=await post('/api/leads',lead,{'Idempotency-Key':id});assert.equal(r.status,200);assert.equal((await r.json()).duplicate,true);
 r=await post('/api/leads',{...lead,problem:'different'},{'Idempotency-Key':id});assert.equal(r.status,409);
 r=await post('/api/leads',{...lead,problem:'failure-fixture'},{'Idempotency-Key':'failure-fixture-123456'});assert.equal(r.status,502);
}else{r=await post('/api/leads',lead,{'Idempotency-Key':id});assert.equal(r.status,503);}
const codes=[];for(let i=0;i<15;i++){r=await post('/api/recommend',{problem:'Support'});codes.push(r.status);await r.arrayBuffer();}
assert.ok(codes.includes(429));console.log('HTTP smoke PASS: pages, API success/fallback, origins, validation, size, leads, rate limit, exact GLB/audio/social assets. External integration is fixture-only:',process.env.FIXTURES==='1');
