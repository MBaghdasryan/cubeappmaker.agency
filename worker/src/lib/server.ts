import { z } from "zod";
export const leadSchema = z.object({
  intent: z.string().max(2000).optional(),
  company: z.string().max(300).optional(),
  industry: z.string().max(300).optional(),
  problem: z.string().min(1).max(2000),
  stack: z.string().max(2000).optional(),
  timeline: z.string().max(500).optional(),
  budgetRange: z.string().max(500).optional(),
  contact: z.string().email(),
  goal: z.string().max(100).optional(),
  recommendedServices: z.array(z.string().max(100)).max(10),
  recommendedArchitecture: z.string().max(1500),
  conversationSummary: z.string().max(20000),
  source: z.literal("cubeapp-website"),
  timestamp: z.string().datetime(),
});
export type Lead = z.infer<typeof leadSchema>;
const hits = new Map<string, { count: number; expires: number }>();
export function guard(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json(
      { error: "This request origin is not permitted." },
      { status: 403 },
    );
  const ip = request.headers.get("cf-connecting-ip") || "local",
    now = Date.now();
  for (const [k, v] of hits) if (v.expires < now) hits.delete(k);
  const key = ip + new URL(request.url).pathname,
    entry = hits.get(key) || { count: 0, expires: now + 60000 };
  if (++entry.count > 12)
    return Response.json(
      { error: "Please wait a minute before trying again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  hits.set(key, entry);
  if (Number(request.headers.get("content-length")) > 30000)
    return Response.json(
      { error: "Your brief is too large." },
      { status: 413 },
    );
  return null;
}
export async function readJSON(request: Request) {
  const text = await request.text();
  if (text.length > 30000) throw new Error("Request too large");
  return JSON.parse(text);
}
export interface CRMAdapter {
  send(lead: Lead, id: string): Promise<void>;
}
export class WebhookCRMAdapter implements CRMAdapter {
  constructor(private request: typeof fetch = fetch) {}
  async send(lead: Lead, id: string) {
    const url = process.env.CRM_WEBHOOK_URL;
    if (!url) throw new Error("NOT_CONFIGURED");
    if (!url.startsWith("https://")) throw new Error("INVALID_CONFIG");
    const response = await this.request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": id,
        ...(process.env.CRM_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.CRM_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ id, lead }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("DELIVERY_FAILED");
  }
}
export interface NotificationAdapter {
  notify(lead: Lead, id: string): Promise<void>;
}
export class WebhookNotificationAdapter implements NotificationAdapter {
  constructor(private request: typeof fetch = fetch) {}
  async notify(lead: Lead, id: string) {
    const url = process.env.NOTIFICATION_WEBHOOK_URL;
    if (!url) return;
    if (!url.startsWith("https://")) throw new Error("INVALID_CONFIG");
    const r = await this.request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.NOTIFICATION_WEBHOOK_TOKEN
          ? {
              Authorization: `Bearer ${process.env.NOTIFICATION_WEBHOOK_TOKEN}`,
            }
          : {}),
      },
      body: JSON.stringify({ id, company: lead.company, goal: lead.goal }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error("NOTIFICATION_FAILED");
  }
}
const completed = new Map<string, { expires: number; hash: string }>(),
  pending = new Map<string, Promise<void>>();
export class LeadService {
  constructor(
    private crm: CRMAdapter = new WebhookCRMAdapter(),
    private notifications: NotificationAdapter = new WebhookNotificationAdapter(),
  ) {}
  async submit(lead: Lead, id: string) {
    const now = Date.now();
    for (const [k, v] of completed) if (v.expires < now) completed.delete(k);
    const hash = JSON.stringify({ ...lead, timestamp: undefined });
    const prior = completed.get(id);
    if (prior) {
      if (prior.hash !== hash) throw new Error("IDEMPOTENCY_CONFLICT");
      return;
    }
    if (pending.has(id)) {
      await pending.get(id);
      if (completed.get(id)?.hash !== hash)
        throw new Error("IDEMPOTENCY_CONFLICT");
      return;
    }
    const job = (async () => {
      await this.crm.send(lead, id);
      completed.set(id, { expires: now + 3600000, hash });
      try {
        await this.notifications.notify(lead, id);
      } catch {
        /* CRM already owns the lead; never report an unsuccessful delivery. */
      }
    })();
    pending.set(id, job);
    try {
      await job;
    } finally {
      pending.delete(id);
    }
  }
}
