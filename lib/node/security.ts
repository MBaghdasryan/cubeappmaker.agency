import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { store, limitValue } from "./store.ts";
export function json(body: unknown, status=200) {
  return Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...(status===429||status===409?{"Retry-After":"60"}:{})}});
}
export function configured(url?: string) {
  try { const u=new URL(url||""); return u.protocol==="https:" && !u.username && !u.password; } catch { return false; }
}
export function guard(request: Request, type: "recommend"|"leads") {
  const origin=process.env.APP_ORIGIN || (process.env.NODE_ENV==="production" ? "https://www.cubeappmaker.agency" : new URL(request.url).origin);
  if(request.headers.get("origin")!==origin || request.headers.get("sec-fetch-site")==="cross-site") return json({error:"Origin is not permitted."},403);
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({error:"JSON is required."},415);
  if(Number(request.headers.get("content-length"))>30000) return json({error:"Request too large."},413);
  let client="global";
  if(process.env.TRUST_PROXY==="true") {
    // Rightmost entry must be appended/overwritten by the trusted direct proxy. Never trust user-supplied leftmost entries.
    const ip=request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
    if(ip && isIP(ip)) client=createHash("sha256").update(ip).digest("hex");
  }
  try {
    if(!store().limit(`${type}:${client}`,limitValue(type==="recommend"?"RECOMMEND_LIMIT_PER_MINUTE":"LEAD_LIMIT_PER_MINUTE",type==="recommend"?12:5),60000)) return json({error:"Please wait before trying again."},429);
  } catch { return json({error:"Request protection temporarily unavailable."},503); }
  return null;
}
export async function bodyJSON(request: Request) {
  const reader=request.body?.getReader(); if(!reader) throw Error("INVALID_JSON");
  const chunks:Uint8Array[]=[];let length=0;
  try { for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>30000){await reader.cancel();throw Error("TOO_LARGE");}chunks.push(value);} }
  finally {reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
