import { leadSchema, WebhookCRMAdapter, WebhookNotificationAdapter } from "@/lib/server";
import { guard, bodyJSON, json, configured } from "@/lib/node/security";
import { store } from "@/lib/node/store";
export const runtime="nodejs";
export async function POST(request:Request) {
  const denied=guard(request,"leads");if(denied)return denied;
  let lead;
  try {lead=leadSchema.parse(await bodyJSON(request));}
  catch(e){return json({error:"Please include a valid contact email and complete brief."},e instanceof Error&&e.message==="TOO_LARGE"?413:400);}
  const id=request.headers.get("idempotency-key");
  if(!id||!/^[a-zA-Z0-9-]{16,80}$/.test(id))return json({error:"A valid submission ID is required."},400);
  if(!configured(process.env.CRM_WEBHOOK_URL))return json({error:"Direct delivery is not connected. Download or email your brief."},503);
  try {
    const db=store();
    if(!db.reserve(id,lead))return json({delivered:true,duplicate:true});
    try {await new WebhookCRMAdapter((url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(10000) })).send(lead,id);}
    catch {db.release(id);return json({error:"We could not deliver your brief. Please retry or email it."},502);}
    db.complete(id);
    try {await new WebhookNotificationAdapter((url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(3000) })).notify(lead,id);}catch{/* CRM already owns the lead. */}
    return json({delivered:true});
  }catch(e){
    const conflict=e instanceof Error&&["IDEMPOTENCY_CONFLICT","IN_PROGRESS"].includes(e.message);
    return json({error:conflict?"This submission is already processing or the key belongs to another brief.":"Delivery temporarily unavailable. Your draft is preserved."},conflict?409:503);
  }
}
