# Server configuration

Production public configuration is in `wrangler.json`. Only `api.cubeappmaker.agency` is routed to this Worker. There is no assets binding.

| Name | Purpose |
|---|---|
| AI | Native Workers AI binding, not a browser API key |
| AI_MODEL | Model supporting JSON schema output; default `@cf/meta/llama-3.1-8b-instruct` |
| AI_ENABLED | `false` disables native inference; optional HTTP then guided fallback remain |
| AI_TIMEOUT_MS | Native response wait; default 6500 ms, maximum 8000 ms |
| ALLOWED_ORIGINS | Exact comma-separated origins; production defaults to HTTPS www only |
| AI_DAILY_LIMIT | Global UTC-day recommendation attempt limit, default 200 |
| AI_BURST_LIMIT | Global per-minute attempt limit, default 12 |
| CRM_WEBHOOK_URL / CRM_WEBHOOK_TOKEN | HTTPS CRM endpoint and optional bearer token, Worker secrets |
| NOTIFICATION_WEBHOOK_URL / NOTIFICATION_WEBHOOK_TOKEN | Optional HTTPS notification endpoint/token, Worker secrets |
| AI_PROVIDER_URL / AI_PROVIDER_KEY | Optional HTTP fallback, Worker secrets |

Set secrets using `npx wrangler secret put NAME --config wrangler.json`. The command prompts for the value; do not place it in a shell command or frontend environment. Delete unused secrets with `wrangler secret delete NAME` after confirming they are no longer needed. Native Workers AI needs the binding and account access, not AI_PROVIDER_KEY.

CRM receives `{id, lead}` JSON with `Idempotency-Key: id` and optional `Authorization: Bearer ...`. Durable Objects retain successful submission fingerprints for 30 days, suppress concurrent duplicates and return 409 if a key is reused for different content. The receiving CRM must also deduplicate this key: a process failure between CRM acceptance and recording delivery can require a retry. Failed deliveries remain retryable. Notification failure does not resubmit the CRM lead and has no automatic delivery queue.

Rate Limiting bindings enforce 6 recommendation requests and 3 lead requests per IP per minute at each Cloudflare location. They are eventually consistent, not global exact counters. A singleton Durable Object additionally reserves a global recommendation attempt before any inference. At exhaustion it returns 429. Missing protection fails closed with 503. This limits attempts, not exact billed neurons; native timeout does not guarantee cancellation of already started inference. CORS is browser policy, not authentication: scripted requests can spoof Origin. Use Cloudflare monitoring and adjust the conservative limits before campaigns; add WAF/Turnstile if sustained abuse requires it. Do not put personal data into limiter keys or logs.

`/status` reports configuration, not proven connectivity (`verified:false`). The UI accurately shows unconfigured CRM and guided fallback. Actual live model/CRM verification is a deployment acceptance step.

`npm run dev` uses `wrangler.local.json`: local-only origins, no native AI binding, guided mode. Never deploy that config. Run `node smoke.mjs`; optional `TEST_ABUSE=1` consumes local recommendation attempts. Do not run abuse checks against production without an agreed test window.
