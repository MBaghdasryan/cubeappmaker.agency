import assert from 'node:assert/strict';
const base=process.env.API_BASE||'http://127.0.0.1:8788';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:8080';
const call=(path,init={})=>fetch(base+path,{...init,headers:{Origin:origin,...init.headers}});
let r=await call('/status'); assert.equal(r.status,200); console.log('status:',await r.json());
r=await call('/leads',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,idempotency-key'}});
assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),origin);
r=await call('/leads',{method:'OPTIONS',headers:{Origin:'https://unapproved.example','Access-Control-Request-Method':'POST'}});assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);
r=await call('/recommend',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization'}});assert.equal(r.status,403);
r=await call('/recommend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({problem:'Automate customer support and build a knowledge base'})});
assert.equal(r.status,200);const result=await r.json();assert.ok(result.summary);assert.ok(Array.isArray(result.components));console.log('recommend provider:',result.provider,'mode:',result.mode);
if(process.env.EXPECT_PROVIDER)assert.equal(result.provider,process.env.EXPECT_PROVIDER);
if(process.env.TEST_ABUSE==='1'){
 const codes=[];for(let i=0;i<8;i++){r=await call('/recommend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({problem:'Support automation'})});codes.push(r.status)}
 assert.ok(codes.includes(429)); console.log('rate-limit:',codes);
}
if(process.env.EXPECT_CRM_UNCONFIGURED==='1'){
 r=await call('/leads',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':'hybrid-smoke-unconfigured'},body:JSON.stringify({problem:'Smoke test',contact:'test@example.com',recommendedServices:[],recommendedArchitecture:'Test',conversationSummary:'Test',source:'cubeapp-website',timestamp:new Date().toISOString()})});assert.equal(r.status,503);console.log('CRM unconfigured: honest 503');
}
console.log('API smoke PASS (no lead sent to a configured CRM).');
