import { test } from "node:test";
import assert from "node:assert/strict";
import { LeadService, leadSchema, guard } from "../lib/server.ts";
import { recommend } from "../lib/catalog.ts";
const lead = {
  problem: "Automate support",
  contact: "test@example.com",
  recommendedServices: ["AI Agent"],
  recommendedArchitecture: "AI Agent → Knowledge Base",
  conversationSummary: "Test fixture",
  source: "cubeapp-website" as const,
  timestamp: new Date().toISOString(),
};
test("English and Russian support queries resolve to support", () => {
  assert.equal(recommend("Automate customer support"), 1);
  assert.equal(recommend("Нужна поддержка клиентов"), 1);
});
test("invalid email and oversized problem are rejected", () => {
  assert.equal(
    leadSchema.safeParse({ ...lead, contact: "invalid" }).success,
    false,
  );
  assert.equal(
    leadSchema.safeParse({ ...lead, problem: "a".repeat(2001) }).success,
    false,
  );
});
test("parallel duplicate submissions reach CRM only once", async () => {
  let calls = 0;
  const service = new LeadService(
    {
      async send() {
        calls++;
        await new Promise((r) => setTimeout(r, 15));
      },
    },
    { async notify() {} },
  );
  await Promise.all([
    service.submit(lead, "test-duplicate-001"),
    service.submit(lead, "test-duplicate-001"),
  ]);
  assert.equal(calls, 1);
  await assert.rejects(
    () =>
      service.submit({ ...lead, problem: "Different" }, "test-duplicate-001"),
    /IDEMPOTENCY_CONFLICT/,
  );
});
test("failed delivery remains retryable", async () => {
  let calls = 0;
  const service = new LeadService(
    {
      async send() {
        if (++calls === 1) throw new Error("offline");
      },
    },
    { async notify() {} },
  );
  await assert.rejects(() => service.submit(lead, "test-retry-001"));
  await service.submit(lead, "test-retry-001");
  assert.equal(calls, 2);
});
test("notification failure does not duplicate a delivered lead", async () => {
  let calls = 0;
  const service = new LeadService(
    {
      async send() {
        calls++;
      },
    },
    {
      async notify() {
        throw new Error("offline");
      },
    },
  );
  await service.submit(lead, "test-notify-001");
  await service.submit(lead, "test-notify-001");
  assert.equal(calls, 1);
});
test("cross-origin submissions are rejected", () => {
  const r = guard(
    new Request("https://example.test/api/leads", {
      headers: { origin: "https://other.test" },
    }),
  );
  assert.equal(r?.status, 403);
});
