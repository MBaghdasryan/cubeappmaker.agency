import { configured, json } from "@/lib/node/security";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export function GET() {
  const ai=configured(process.env.AI_PROVIDER_URL)||(configured(process.env.AI_CHAT_URL)&&!!process.env.AI_MODEL);
  const crm=configured(process.env.CRM_WEBHOOK_URL);
  return json({ai,crm,aiStatus:ai?"configured":"not_configured",crmStatus:crm?"configured":"not_configured",verified:false});
}
