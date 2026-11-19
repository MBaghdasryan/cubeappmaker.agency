// Test-only HTTPS service. Never deployed in the runtime image.
import https from 'node:https';
import { readFileSync } from 'node:fs';
const delivered=new Map();
https.createServer({key:readFileSync('/cert/key.pem'),cert:readFileSync('/cert/cert.pem')},async(req,res)=>{
  let text='';for await(const chunk of req)text+=chunk;
  const body=text?JSON.parse(text):{};
  const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  if(req.url==='/stats')return reply(200,{delivered:Object.fromEntries(delivered)});
  if(req.headers.authorization!=='Bearer fixture-only')return reply(401,{});
  if(req.url==='/ai'){
    const input=body.messages?.at(-1)?.content||'';
    if(input.includes('quota-fixture'))return reply(429,{error:'quota'});
    return reply(200,{choices:[{message:{content:JSON.stringify({summary:'Fixture support plan',components:['AI Agent','Knowledge Base']})}}]});
  }
  if(req.url==='/crm'){
    if(body.lead?.problem==='failure-fixture')return reply(500,{});
    const id=req.headers['idempotency-key'];if(!id||id!==body.id)return reply(400,{});
    delivered.set(id,(delivered.get(id)||0)+1);return reply(200,{accepted:true});
  }
  if(req.url==='/notify')return reply(500,{error:'fixture notification failure'});
  reply(404,{});
}).listen(8443,'0.0.0.0');
