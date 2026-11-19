import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Store } from "../lib/node/store.ts";
import { guard, bodyJSON } from "../lib/node/security.ts";
import { recommend } from "../lib/node/providers.ts";
import type { Lead } from "../lib/server.ts";
const lead:Lead={problem:"Support",contact:"test@example.com",recommendedServices:[],recommendedArchitecture:"AI Agent",conversationSummary:"Test",source:"cubeapp-website",timestamp:new Date().toISOString()};
test("SQLite limits and lead delivery records survive connections and restarts",()=>{
  const dir=mkdtempSync(path.join(tmpdir(),"cube-store-"));
  const a=new Store(path.join(dir,"state.sqlite")),b=new Store(path.join(dir,"state.sqlite"));
  try {
    assert.equal(a.limit("test",2,60000),true);assert.equal(b.limit("test",2,60000),true);assert.equal(a.limit("test",2,60000),false);
    assert.equal(a.reserve("id",lead),true);assert.throws(()=>b.reserve("id",lead),/IN_PROGRESS/);
    assert.throws(()=>b.reserve("id",{...lead,problem:"Other"}),/IDEMPOTENCY_CONFLICT/);
    a.complete("id");assert.equal(b.reserve("id",lead),false);
    assert.equal(a.reserve("retry",lead),true);a.release("retry");assert.equal(b.reserve("retry",lead),true);b.complete("retry");
    const c=new Store(path.join(dir,"state.sqlite"));try{assert.equal(c.reserve("retry",lead),false);}finally{c.db.close();}
  }finally{a.db.close();b.db.close();rmSync(dir,{recursive:true,force:true});}
});
test("request body cap counts streamed UTF-8 bytes without Content-Length",async()=>{
  const request=new Request("https://example.com",{method:"POST",body:JSON.stringify({text:"Я".repeat(16000)})});
  await assert.rejects(bodyJSON(request),/TOO_LARGE/);
  assert.deepEqual(await bodyJSON(new Request("https://example.com",{method:"POST",body:'{"ok":true}'})),{ok:true});
});
test("Node API rejects cross-origin, missing origin, non-JSON and oversized input before storage",()=>{
  const old=process.env.APP_ORIGIN;process.env.APP_ORIGIN="https://www.cubeappmaker.agency";
  const check=(headers:Record<string,string>)=>guard(new Request("http://internal:3000/api/leads",{method:"POST",headers}),"leads")?.status;
  try{assert.equal(check({origin:"https://evil.example"}),403);assert.equal(check({}),403);assert.equal(check({origin:process.env.APP_ORIGIN}),415);assert.equal(check({origin:process.env.APP_ORIGIN,"content-type":"application/json","content-length":"30001"}),413);}finally{if(old===undefined)delete process.env.APP_ORIGIN;else process.env.APP_ORIGIN=old;}
});
test("external Node AI returns structured output and falls back on upstream or schema failures",async()=>{
  const keys=["AI_CHAT_URL","AI_CHAT_KEY","AI_MODEL","AI_PROVIDER_URL"];
  const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  try{
    process.env.AI_CHAT_URL="https://ai.example/chat/completions";process.env.AI_MODEL="configurable-model";process.env.AI_CHAT_KEY="fixture-only";
    const success:typeof fetch=async(_,init)=>{assert.equal(new Headers(init?.headers).get("authorization"),"Bearer fixture-only");assert.equal(JSON.parse(init?.body as string).model,"configurable-model");return Response.json({choices:[{message:{content:JSON.stringify({summary:"Support plan",components:["AI Agent"]})}}]});};
    assert.equal((await recommend("Support",success)).mode,"ai");
    assert.equal((await recommend("Support",async()=>new Response(null,{status:429}))).mode,"guided");
    assert.equal((await recommend("Support",async()=>Response.json({choices:[{message:{content:'{"bad":true}'}}]}))).mode,"guided");
    delete process.env.AI_CHAT_URL;process.env.AI_PROVIDER_URL="https://adapter.example/recommend";
    assert.equal((await recommend("Support",async()=>Response.json({summary:"HTTP plan",components:["Knowledge Base"]}))).mode,"ai");
    assert.equal((await recommend("Support",async()=>{throw new Error("Timeout");})).mode,"guided");
  }finally{for(const k of keys){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
