# Аудит до перехода на Hostinger/Coolify — 19 ноября 2026

- Репозиторий: https://github.com/MBaghdasryan/cubeappmaker.agency
- Исходная ветка: `main`.
- Подтверждённый через git ls-remote исходный SHA: `5cd75635be12ffd73550e7c8aa657ec104234151`.
- Чистое рабочее дерево на старте. Изменения выполняются в `deploy/hostinger-coolify-node`, не в main, чтобы исключить возможный автодеплой production.

## Фреймворк и исходники

GitHub содержит Next.js 16.3.4, React 19.2.6, TypeScript 5.9.3, Three.js/R3F/Drei, public GLB и все аудио/изображения/шрифты. Frontend до изменения использовал `output: export`, Docker Node builder → Nginx, порт 80. API base был встроен как https://api.cubeappmaker.agency. Исходники всех частей HYBRID находятся в GitHub: frontend, Worker, адаптеры и тесты. Но это НЕ готовое единое Node full-stack приложение: каталог app/api отсутствовал; оригинальные локальные Next API оставались в соседнем проекте cubeapp.

Локальная full-Worker альтернатива использует Vinext/Vite и Wrangler/workerd. В исходном root package.json были @cloudflare/vite-plugin, @cloudflare/workers-types, vinext, vite, wrangler, @vitejs/plugin-react и @vitejs/plugin-rsc. Native AI binding, Rate Limiting и Durable Objects реализованы в worker/src/hybrid/worker. Они не исполняются на обычном Node.js.

## API до миграции

Cloudflare: POST /recommend, POST /leads, GET /status, GET /health, aliases /api/*. Соседний локальный full-Worker проект: /api/recommend, /api/leads, /api/status. Контракты: рекомендация `{summary,components,mode}`, отправка `{delivered}`, статус конфигурации. Лиды проходят Zod-валидацию, CRM/notification — независимые HTTPS webhooks. Старый lib/server.ts содержит in-memory limiter/LeadService; использовать их как production durable state на VPS нельзя.

## Обнаруженные переменные

Frontend: NEXT_PUBLIC_API_BASE_URL; ANALYTICS_PROVIDER в layout. Сервер: AI_PROVIDER_URL, AI_PROVIDER_KEY, CRM_WEBHOOK_URL, CRM_WEBHOOK_TOKEN, NOTIFICATION_WEBHOOK_URL, NOTIFICATION_WEBHOOK_TOKEN. Worker: ALLOWED_ORIGINS, AI_MODEL, AI_ENABLED, AI_TIMEOUT_MS, AI_DAILY_LIMIT, AI_BURST_LIMIT; bindings AI, AI_BUDGET, LEAD_LEDGER, RECOMMEND_LIMITER, LEAD_LIMITER. Значения секретов не читались и в отчёт не включались.

## Требуемые изменения

1. Next.js `output: standalone`, Node.js 24 LTS, стандартный server.js, порт 3000; отказаться от Nginx/static export для основного target.
2. Same-origin `/api/recommend`, `/api/leads`, `/api/status`; добавить `/api/health` и `/healthz`; backend должен работать в том же контейнере.
3. Native Workers AI заменить внешним HTTP/совместимым chat-completions provider, сохранив валидатор и GuidedProvider fallback.
4. SQLite на постоянном локальном volume для лимитов и идемпотентности. Транзакции и резервирование отправки; обязателен idempotency contract у принимающей CRM.
5. Точное сравнение Origin с APP_ORIGIN за reverse proxy; никакого wildcard CORS; ограничение тела по фактическим байтам; safe error responses/logging.
6. Non-root runtime, healthcheck, Docker ignore, secret template, resource limits и инструкции backup/rollback.
7. Проверить Docker build/start, HTTP, сохранность ресурсов, failures/duplicates; внешние AI/CRM отдельно от fixtures.
8. Сохранить worker/ как необязательную альтернативу. Не менять UI, анимации, звук, модель, почту, DNS или существующие приложения VPS.

Основание выбора: [Node releases](https://nodejs.org/en/about/previous-releases), [Next standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), [Coolify Dockerfile](https://coolify.io/docs/applications/builds/dockerfile).

## Security findings во время подготовки

npm audit исходного lockfile после удаления Cloudflare build tooling: 21 finding (2 critical, 6 high, 12 moderate, 1 low). Critical затрагивали Next и react-server-dom-webpack. Принято решение обновить Next/eslint-config-next до 16.4.6, React/ReactDOM до 19.3.1, Zod до 4.6.7, удалить неиспользуемые drizzle-kit/drizzle-orm и прямую зависимость react-server-dom-webpack (Next использует собственную согласованную реализацию). Прочие совместимые transitive fixes выполняются через npm audit fix без --force. Новые версии требуют повторной проверки; финальный результат смотрите в verification report. Исторический worker/package-lock.json относится к необязательной альтернативе и не устанавливается/не попадает в Node runtime image.
