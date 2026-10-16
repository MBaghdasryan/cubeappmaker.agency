import { z } from "zod";
import { leadSchema, type Lead } from "../../lib/server.ts";
import { recommendHybrid, type AISettings } from "./providers.ts";
export interface LimitBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}
export interface ObjectBinding {
  getByName(name: string): { fetch(request: Request): Promise<Response> };
}
export interface Env extends AISettings {
  ALLOWED_ORIGINS: string;
  RECOMMEND_LIMITER?: LimitBinding;
  LEAD_LIMITER?: LimitBinding;
  AI_BUDGET?: ObjectBinding;
  LEAD_LEDGER?: ObjectBinding;
  AI_DAILY_LIMIT?: string;
  AI_BURST_LIMIT?: string;
  CRM_WEBHOOK_URL?: string;
  CRM_WEBHOOK_TOKEN?: string;
  NOTIFICATION_WEBHOOK_URL?: string;
  NOTIFICATION_WEBHOOK_TOKEN?: string;
}
export function httpsConfigured(value?: string) {
  try {
    return !!value && new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
export async function bodyJSON(request: Request) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw Error("CONTENT_TYPE");
  const reader = request.body?.getReader();
  if (!reader) throw Error("EMPTY");
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 30000) {
        await reader.cancel();
        throw Error("TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(data));
}
function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}
function decorate(response: Response, origin: string | null) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Vary", "Origin");
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Expose-Headers", "Retry-After");
  }
  return new Response(response.body, { status: response.status, headers });
}
export async function handle(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/^\/api\//, "/");
  const origin = request.headers.get("origin");
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const approved = !!origin && allowed.includes(origin);
  if (origin && !approved)
    return decorate(json({ error: "Origin is not permitted." }, 403), null);
  const reply = (r: Response) => decorate(r, approved ? origin : null);
  if (!["/status", "/health", "/recommend", "/leads"].includes(path))
    return reply(json({ error: "Not found" }, 404));
  const expected = path === "/status" || path === "/health" ? "GET" : "POST";
  if (request.method === "OPTIONS") {
    if (
      !approved ||
      request.headers.get("access-control-request-method") !== expected
    )
      return reply(json({ error: "Preflight denied" }, 403));
    const requested = (
      request.headers.get("access-control-request-headers") || ""
    )
      .toLowerCase()
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const permitted =
      path === "/leads"
        ? ["content-type", "idempotency-key"]
        : ["content-type"];
    if (requested.some((h) => !permitted.includes(h)))
      return reply(json({ error: "Header not permitted" }, 403));
    return reply(
      new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Methods": expected,
          "Access-Control-Allow-Headers": permitted.join(", "),
          "Access-Control-Max-Age": "600",
        },
      }),
    );
  }
  if (request.method !== expected)
    return reply(
      new Response(null, { status: 405, headers: { Allow: expected } }),
    );
  if (expected === "GET")
    return reply(
      json({
        healthy: true,
        ai:
          !!(env.AI && env.AI_MODEL && env.AI_ENABLED !== "false") ||
          httpsConfigured(env.AI_PROVIDER_URL),
        aiStatus:
          env.AI && env.AI_MODEL && env.AI_ENABLED !== "false"
            ? "configured"
            : httpsConfigured(env.AI_PROVIDER_URL)
              ? "configured"
              : "not_configured",
        primary: "workers-ai",
        model: env.AI_MODEL || null,
        crm: httpsConfigured(env.CRM_WEBHOOK_URL),
        crmStatus: httpsConfigured(env.CRM_WEBHOOK_URL)
          ? "configured"
          : "not_configured",
        abuseProtection: !!(
          env.RECOMMEND_LIMITER &&
          env.LEAD_LIMITER &&
          env.AI_BUDGET
        ),
        verified: false,
      }),
    );
  if (!approved)
    return reply(json({ error: "An approved Origin is required." }, 403));
  const limiter =
    path === "/recommend" ? env.RECOMMEND_LIMITER : env.LEAD_LIMITER;
  if (!limiter)
    return reply(json({ error: "Protection is not configured." }, 503));
  try {
    if (
      !(
        await limiter.limit({
          key: request.headers.get("cf-connecting-ip") || "local",
        })
      ).success
    )
      return reply(
        new Response(
          JSON.stringify({ error: "Please wait before trying again." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "60",
            },
          },
        ),
      );
  } catch {
    return reply(json({ error: "Protection temporarily unavailable." }, 503));
  }
  let body: unknown;
  try {
    body = await bodyJSON(request);
  } catch (error) {
    return reply(
      json(
        { error: "Invalid JSON or request size." },
        error instanceof Error && error.message === "TOO_LARGE" ? 413 : 400,
      ),
    );
  }
  if (path === "/recommend") {
    const parsed = z
      .object({ problem: z.string().trim().min(1).max(2000) })
      .safeParse(body);
    if (!parsed.success)
      return reply(
        json({ error: "Please enter a valid project request." }, 400),
      );
    if (!env.AI_BUDGET)
      return reply(json({ error: "AI protection not configured." }, 503));
    try {
      const budget = await env.AI_BUDGET.getByName("global-ai-budget").fetch(
        new Request("https://internal/consume", { method: "POST" }),
      );
      if (!budget.ok)
        return reply(
          new Response(
            JSON.stringify({
              error: "Recommendation capacity reached. Please try later.",
            }),
            {
              status: budget.status === 429 ? 429 : 503,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": budget.headers.get("Retry-After") || "60",
              },
            },
          ),
        );
      return reply(json(await recommendHybrid(parsed.data.problem, env)));
    } catch {
      return reply(
        json({ error: "Recommendation service temporarily unavailable." }, 503),
      );
    }
  }
  const parsed = leadSchema.safeParse(body),
    key = request.headers.get("idempotency-key");
  if (!parsed.success || !key || !/^[a-zA-Z0-9-]{16,80}$/.test(key))
    return reply(
      json(
        {
          error:
            "A valid contact, complete brief and submission ID are required.",
        },
        400,
      ),
    );
  if (!httpsConfigured(env.CRM_WEBHOOK_URL))
    return reply(
      json(
        {
          error:
            "Direct delivery is not connected. Download or email your preserved brief.",
        },
        503,
      ),
    );
  if (!env.LEAD_LEDGER)
    return reply(json({ error: "Lead protection is not configured." }, 503));
  try {
    return reply(
      await env.LEAD_LEDGER.getByName(key).fetch(
        new Request("https://internal/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": key,
          },
          body: JSON.stringify(parsed.data),
        }),
      ),
    );
  } catch {
    return reply(
      json(
        {
          error:
            "Could not deliver your brief. Your draft is preserved; retry with the same submission ID.",
        },
        502,
      ),
    );
  }
}
export interface CRMAdapter {
  send(lead: Lead, id: string): Promise<void>;
}
export interface NotificationAdapter {
  notify(lead: Lead, id: string): Promise<void>;
}
export class WebhookCRMAdapter implements CRMAdapter {
  constructor(
    private env: Env,
    private request: typeof fetch = fetch,
  ) {}
  async send(lead: Lead, id: string) {
    if (!httpsConfigured(this.env.CRM_WEBHOOK_URL))
      throw Error("NOT_CONFIGURED");
    const r = await this.request(this.env.CRM_WEBHOOK_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": id,
        ...(this.env.CRM_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${this.env.CRM_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ id, lead }),
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) throw Error("DELIVERY_FAILED");
  }
}
export class WebhookNotificationAdapter implements NotificationAdapter {
  constructor(
    private env: Env,
    private request: typeof fetch = fetch,
  ) {}
  async notify(lead: Lead, id: string) {
    if (!this.env.NOTIFICATION_WEBHOOK_URL) return;
    if (!httpsConfigured(this.env.NOTIFICATION_WEBHOOK_URL))
      throw Error("INVALID_CONFIG");
    const r = await this.request(this.env.NOTIFICATION_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.env.NOTIFICATION_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${this.env.NOTIFICATION_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ id, company: lead.company, goal: lead.goal }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw Error("NOTIFICATION_FAILED");
  }
}
const worker = { fetch: handle };
export default worker;
