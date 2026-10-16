import { test } from "node:test";
import assert from "node:assert/strict";
import {
  handle,
  WebhookCRMAdapter,
  WebhookNotificationAdapter,
  type Env,
} from "../hybrid/worker/api.ts";
import { recommendHybrid } from "../hybrid/worker/providers.ts";
import { AIBudget, LeadLedger } from "../hybrid/worker/index.ts";
import { apiURL } from "../lib/api-client.ts";
const origin = "https://www.cubeappmaker.agency";
function state() {
  const map = new Map<string, unknown>();
  let queue = Promise.resolve();
  const storage = {
    get: async (k: string) => map.get(k),
    put: async (k: string, v: unknown) => {
      map.set(k, v);
    },
    setAlarm: async () => {},
    deleteAll: async () => map.clear(),
    transaction: async <T>(f: (s: unknown) => Promise<T>) => f(storage),
  };
  return {
    storage,
    blockConcurrencyWhile: <T>(f: () => Promise<T>) => {
      const job = queue.then(f);
      queue = job.then(
        () => {},
        () => {},
      );
      return job;
    },
    waitUntil: (job: Promise<unknown>) => {
      void job;
    },
  } as unknown as DurableObjectState;
}
function env(): Env {
  return {
    ALLOWED_ORIGINS: origin,
    AI_MODEL: "fixture-model",
    AI: {
      run: async () => ({
        response: {
          summary: "Grounded support workflow.",
          components: ["AI Agent", "Knowledge Base"],
        },
      }),
    },
    RECOMMEND_LIMITER: { limit: async () => ({ success: true }) },
    LEAD_LIMITER: { limit: async () => ({ success: true }) },
    AI_BUDGET: {
      getByName: () => ({
        fetch: async () => Response.json({ accepted: true }),
      }),
    },
  };
}
const lead = {
  problem: "Support workflow",
  contact: "qa@example.com",
  recommendedServices: ["AI Agents"],
  recommendedArchitecture: "Agent and knowledge",
  conversationSummary: "Test",
  source: "cubeapp-website",
  timestamp: new Date().toISOString(),
};
const req = (
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  new Request("https://api.cubeappmaker.agency" + path, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
test("HYBRID API base is centralized and full-Worker relative mode remains supported", () => {
  assert.equal(
    apiURL("/api/recommend", "https://api.cubeappmaker.agency"),
    "https://api.cubeappmaker.agency/recommend",
  );
  assert.equal(apiURL("/api/leads", ""), " /api/leads".trim());
  assert.equal(
    apiURL("/status", "http://127.0.0.1:8788"),
    "http://127.0.0.1:8788/status",
  );
  assert.throws(() => apiURL("/leads", "http://remote.invalid"));
});
test("Workers AI structured binding success uses configurable model", async () => {
  const e = env();
  let model = "";
  e.AI = {
    run: async (m) => {
      model = m;
      return {
        response: JSON.stringify({
          summary: "A useful architecture",
          components: ["AI Agent"],
        }),
      };
    },
  };
  const out = await recommendHybrid("Support", e);
  assert.equal(out.provider, "workers-ai");
  assert.equal(model, "fixture-model");
});
test("AI invalid output, quota failure and timeout end in GuidedProvider", async () => {
  for (const run of [
    async () => ({
      response: { summary: "bad", components: ["execute code"] },
    }),
    async () => {
      throw Error("QUOTA");
    },
    () => new Promise(() => {}),
  ]) {
    const out = await recommendHybrid("Support", {
      ...env(),
      AI: { run },
      AI_TIMEOUT_MS: "100",
    });
    assert.equal(out.provider, "guided");
    assert.equal(out.mode, "guided");
  }
});
test("optional HTTP provider is used after native AI failure, before guided", async () => {
  const e = env();
  e.AI = {
    run: async () => {
      throw Error("offline");
    },
  };
  e.AI_PROVIDER_URL = "https://adapter.invalid";
  const out = await recommendHybrid("Support", e, async () =>
    Response.json({ summary: "HTTP recommendation", components: ["AI Agent"] }),
  );
  assert.equal(out.provider, "http");
});
test("CORS handles exact origins and required preflight only", async () => {
  const e = env();
  const good = await handle(
    new Request("https://api.cubeappmaker.agency/leads", {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,idempotency-key",
      },
    }),
    e,
  );
  assert.equal(good.status, 204);
  assert.equal(good.headers.get("Access-Control-Allow-Origin"), origin);
  const bad = await handle(
    req("/leads", lead, { Origin: "https://evil.invalid" }),
    e,
  );
  assert.equal(bad.status, 403);
  assert.equal(bad.headers.get("Access-Control-Allow-Origin"), null);
  const noOrigin = await handle(
    new Request("https://api.cubeappmaker.agency/recommend", {
      method: "POST",
    }),
    e,
  );
  assert.equal(noOrigin.status, 403);
});
test("native binding limiter rejects before model inference and missing protection fails closed", async () => {
  const e = env();
  let calls = 0;
  e.AI = {
    run: async () => {
      calls++;
      return {};
    },
  };
  e.RECOMMEND_LIMITER = { limit: async () => ({ success: false }) };
  assert.equal(
    (await handle(req("/recommend", { problem: "Support" }), e)).status,
    429,
  );
  assert.equal(calls, 0);
  delete e.RECOMMEND_LIMITER;
  assert.equal(
    (await handle(req("/recommend", { problem: "Support" }), e)).status,
    503,
  );
});
test("global Durable Object AI budget enforces durable aggregate cap", async () => {
  const e = { ...env(), AI_DAILY_LIMIT: "2" };
  const ctx = state();
  const a = new AIBudget(ctx, e);
  assert.equal((await a.fetch()).status, 200);
  assert.equal((await new AIBudget(ctx, e).fetch()).status, 200);
  assert.equal((await a.fetch()).status, 429);
});
test("Worker validates input, aliases, body size and AI fallback response", async () => {
  const e = env();
  assert.equal(
    (await handle(req("/recommend", { problem: "" }), e)).status,
    400,
  );
  assert.equal(
    (await handle(req("/recommend", { problem: "x".repeat(31000) }), e)).status,
    413,
  );
  const result = await handle(req("/api/recommend", { problem: "Support" }), e);
  assert.equal(result.status, 200);
  assert.equal(((await result.json()) as {provider:string}).provider, "workers-ai");
});
test("CRM and notification retain server-only auth and idempotency headers", async () => {
  let id = "";
  const e = {
    ...env(),
    CRM_WEBHOOK_URL: "https://crm.invalid",
    CRM_WEBHOOK_TOKEN: "server-only",
  };
  await new WebhookCRMAdapter(e, async (_url, init) => {
    id = new Headers(init?.headers).get("Idempotency-Key")!;
    return new Response(null, { status: 204 });
  }).send(lead as never, "test-id-123456789");
  assert.equal(id, "test-id-123456789");
  await assert.rejects(() =>
    new WebhookNotificationAdapter(
      { ...e, NOTIFICATION_WEBHOOK_URL: "https://notify.invalid" },
      async () => new Response(null, { status: 500 }),
    ).notify(lead as never, "test-id-123456789"),
  );
});
test("LeadLedger persists success across instances, suppresses concurrent duplicates, allows failed retries", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(null, { status: 204 });
  };
  const e = { ...env(), CRM_WEBHOOK_URL: "https://crm.invalid" };
  const ctx = state();
  const ledger = new LeadLedger(ctx, e);
  const submit = () =>
    req("/leads", lead, { "Idempotency-Key": "test-id-123456789" });
  try {
    const results = await Promise.all([
      ledger.fetch(submit()),
      ledger.fetch(submit()),
    ]);
    assert.deepEqual(
      results.map((r) => r.status),
      [200, 200],
    );
    assert.equal(calls, 1);
    assert.equal((await new LeadLedger(ctx, e).fetch(submit())).status, 200);
    assert.equal(calls, 1);
    assert.equal(
      (
        await ledger.fetch(
          req(
            "/leads",
            { ...lead, problem: "Changed" },
            { "Idempotency-Key": "test-id-123456789" },
          ),
        )
      ).status,
      409,
    );
    const retry = new LeadLedger(state(), e);
    globalThis.fetch = async () => new Response(null, { status: 503 });
    assert.equal((await retry.fetch(submit())).status, 502);
    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal((await retry.fetch(submit())).status, 200);
  } finally {
    globalThis.fetch = original;
  }
});
