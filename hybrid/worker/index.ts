import {
  handle,
  WebhookCRMAdapter,
  WebhookNotificationAdapter,
  type Env,
} from "./api.ts";
import { leadSchema } from "../../lib/server.ts";
export class AIBudget {
  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {}
  async fetch() {
    const now = Date.now(),
      day = Math.floor(now / 86400000),
      minute = Math.floor(now / 60000);
    const daily = Math.max(1, Number(this.env.AI_DAILY_LIMIT) || 200),
      burst = Math.max(1, Number(this.env.AI_BURST_LIMIT) || 12);
    const accepted = await this.ctx.storage.transaction(async (tx) => {
      const prior = await tx.get<{
        day: number;
        minute: number;
        total: number;
        recent: number;
      }>("budget");
      const v = {
        day,
        minute,
        total: prior?.day === day ? prior.total : 0,
        recent: prior?.minute === minute ? prior.recent : 0,
      };
      if (v.total >= daily || v.recent >= burst) return false;
      v.total++;
      v.recent++;
      await tx.put("budget", v);
      return true;
    });
    return Response.json(
      { accepted },
      { status: accepted ? 200 : 429, headers: { "Retry-After": "60" } },
    );
  }
}
export class LeadLedger {
  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {}
  async fetch(request: Request): Promise<Response> {
    return this.ctx.blockConcurrencyWhile(async () => {
      const lead = leadSchema.parse(await request.json()),
        id = request.headers.get("Idempotency-Key")!;
      const bytes = new TextEncoder().encode(
        JSON.stringify({ ...lead, timestamp: undefined }),
      );
      const fingerprint = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      )
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
      const prior = await this.ctx.storage.get<string>("delivered");
      if (prior)
        return Response.json(
          prior === fingerprint
            ? { delivered: true, duplicate: true }
            : { error: "Submission ID already belongs to another brief." },
          { status: prior === fingerprint ? 200 : 409 },
        );
      try {
        await new WebhookCRMAdapter(this.env).send(lead, id);
      } catch {
        return Response.json(
          { error: "CRM delivery failed. Retry with the same submission ID." },
          { status: 502 },
        );
      }
      await this.ctx.storage.put("delivered", fingerprint);
      await this.ctx.storage.setAlarm(Date.now() + 30 * 86400000);
      this.ctx.waitUntil(
        new WebhookNotificationAdapter(this.env).notify(lead, id).catch(() => {
          console.warn("notification_delivery_failed");
        }),
      );
      return Response.json({ delivered: true });
    });
  }
  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
const worker = { fetch: handle };
export default worker;
