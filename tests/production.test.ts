import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CUBE_STATES,
  SECTIONS,
  SECTION_ORDER,
  influenceAt,
  sectionSample,
  segmentationSupport,
  stateWithInfluence,
} from "../components/three/cube-controller.ts";
import {
  createAnalyticsAdapter,
  sanitizeProperties,
} from "../lib/analytics.ts";
import { HTTPAIProvider, GuidedProvider } from "../lib/ai-provider.ts";
import { technologyFor } from "../lib/technology.ts";
import { SITE_URL, pageMetadata } from "../lib/seo.ts";
import {
  WebhookCRMAdapter,
  WebhookNotificationAdapter,
} from "../lib/server.ts";
test("all states centralize behavior and only processing has stronger bloom/trails", () => {
  assert.equal(Object.keys(CUBE_STATES).length, 6);
  assert.ok(Math.abs(CUBE_STATES.IDLE.rotation * 15 - Math.PI * 2) < 1e-9);
  for (const [state, cfg] of Object.entries(CUBE_STATES)) {
    if (state !== "PROCESSING") {
      assert.ok(cfg.bloom < CUBE_STATES.PROCESSING.bloom);
      assert.ok(cfg.trail < CUBE_STATES.PROCESSING.trail);
    }
    assert.ok(cfg.scale <= 1.02);
  }
});
test("pointer influence is smooth, bounded, strongest at the center", () => {
  assert.equal(influenceAt(0, 0), 1);
  assert.equal(influenceAt(2, 2), 0);
  assert.ok(influenceAt(0.2, 0) > influenceAt(0.6, 0));
  assert.equal(
    stateWithInfluence("PROCESSING", 0).rotation,
    CUBE_STATES.PROCESSING.rotation,
  );
  assert.equal(
    stateWithInfluence("IDLE", 0).rotation,
    CUBE_STATES.IDLE.rotation,
  );
});
test("section interpolation visits every section without global scroll constants", () => {
  const positions = Object.fromEntries(
    SECTION_ORDER.map((s, i) => [s, i * 500]),
  );
  for (let i = 0; i < SECTION_ORDER.length - 1; i++) {
    const sample = sectionSample(positions, i * 500 + 250);
    assert.equal(sample.from, SECTION_ORDER[i]);
    assert.equal(sample.to, SECTION_ORDER[i + 1]);
    assert.equal(sample.mix, 0.5);
  }
  assert.equal(sectionSample(positions, 9999).to, "contact");
  assert.deepEqual(SECTIONS.contact, SECTIONS.hero);
});
test("one mesh never claims explode support, future segments remain opt-in", () => {
  assert.equal(segmentationSupport(["tripo"]).supported, false);
  assert.equal(segmentationSupport(["a", "b"]).supported, false);
  assert.deepEqual(segmentationSupport(["a", "b"], ["a", "b"]).enabled, false);
});
test("contextual technology responds to goal and component selection", () => {
  assert.ok(technologyFor(3, [0, 3]).items.includes("Runway"));
  assert.ok(!technologyFor(1, [0, 1]).items.includes("Runway"));
  assert.ok(technologyFor(4, [4]).items.includes("React"));
});
test("all provider adapters map only safe properties", () => {
  const calls: unknown[][] = [];
  const globals = {
    gtag: (...args: unknown[]) => calls.push(args),
    plausible: (...args: unknown[]) => calls.push(args),
    posthog: { capture: (...args: unknown[]) => calls.push(args) },
  };
  for (const p of ["ga4", "plausible", "posthog"]) {
    const adapter = createAnalyticsAdapter(p, globals);
    assert.equal(adapter.ready(), true);
    adapter.track("goal_selected", { goal: "Support", componentCount: 3 });
  }
  assert.equal(calls.length, 3);
  assert.deepEqual(
    sanitizeProperties({
      goal: "Support",
      email: "private@example.com",
      query: "private",
    } as never),
    { goal: "Support" },
  );
  assert.equal(createAnalyticsAdapter("none", {}).ready(), false);
});
test("all SEO URLs and social images use the production domain", () => {
  assert.equal(SITE_URL, "https://www.cubeappmaker.agency");
  const metadata = pageMetadata(
    "Support",
    "Description",
    "/solutions/customer-support",
  );
  assert.equal(
    metadata.alternates?.canonical,
    SITE_URL + "/solutions/customer-support",
  );
  assert.equal(
    (metadata.twitter as { card?: string })?.card,
    "summary_large_image",
  );
  assert.ok(
    JSON.stringify(metadata).includes(SITE_URL + "/images/social-card.png"),
  );
});
test("AI provider failures and invalid output never become successful recommendations", async () => {
  const failed: typeof fetch = async () =>
    new Response("unavailable", { status: 503 });
  await assert.rejects(
    () =>
      new HTTPAIProvider("https://test.invalid", "test", failed).recommend(
        "Support",
      ),
    /AI_PROVIDER_FAILED/,
  );
  const invalid: typeof fetch = async () =>
    Response.json({ summary: "hello", components: ["execute arbitrary code"] });
  await assert.rejects(() =>
    new HTTPAIProvider("https://test.invalid", "test", invalid).recommend(
      "Support",
    ),
  );
  const guided = await new GuidedProvider().recommend("Customer support");
  assert.equal(guided.mode, "guided");
});
test("CRM and notification adapters expose unsuccessful HTTP delivery", async () => {
  const before = process.env.CRM_WEBHOOK_URL,
    beforeNotify = process.env.NOTIFICATION_WEBHOOK_URL;
  process.env.CRM_WEBHOOK_URL = "https://test.invalid";
  process.env.NOTIFICATION_WEBHOOK_URL = "https://test.invalid";
  const failed: typeof fetch = async () =>
    new Response("unavailable", { status: 503 });
  const lead = {
    problem: "QA",
    contact: "qa@example.com",
    recommendedServices: ["AI Agent"],
    recommendedArchitecture: "Agent",
    conversationSummary: "Test",
    source: "cubeapp-website" as const,
    timestamp: new Date().toISOString(),
  };
  try {
    await assert.rejects(
      () => new WebhookCRMAdapter(failed).send(lead, "test-id"),
      /DELIVERY_FAILED/,
    );
    await assert.rejects(
      () => new WebhookNotificationAdapter(failed).notify(lead, "test-id"),
      /NOTIFICATION_FAILED/,
    );
  } finally {
    if (before === undefined) delete process.env.CRM_WEBHOOK_URL;
    else process.env.CRM_WEBHOOK_URL = before;
    if (beforeNotify === undefined) delete process.env.NOTIFICATION_WEBHOOK_URL;
    else process.env.NOTIFICATION_WEBHOOK_URL = beforeNotify;
  }
});
