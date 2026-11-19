# CubeAppMaker — Hostinger VPS + Coolify

Единое Next.js-приложение: frontend, SSR/SSG и API работают в одном Node.js-контейнере. Cloudflare runtime, cPanel для сайта и static export не требуются. Утверждённые UI, Three.js, GLB, анимации и звук сохранены.

## Точные параметры

| Параметр | Значение |
|---|---|
| GitHub | https://github.com/MBaghdasryan/cubeappmaker.agency |
| Ветка для проверки | deploy/hostinger-coolify-node |
| Build pack | Dockerfile |
| Dockerfile | /Dockerfile |
| Build context / Base directory | / (корень репозитория) |
| Build | Dockerfile выполняет npm ci --no-audit, typecheck, lint, tests, npm run build |
| Runtime | Node.js 24 LTS, node server.js (Next standalone) |
| Внутренний порт | 3000 |
| Health check | GET /api/health/ (альтернатива /healthz/) |
| Production domain | https://www.cubeappmaker.agency |
| Persistent volume | /app/data; владелец UID/GID 1000:1000 |
| Реплики | 1; один VPS, один локальный volume |

Ветка main специально не изменяется: её push мог бы вызвать ранее настроенный автодеплой. Эта инструкция не означает, что production уже опубликован. Подтверждённый SHA и проверки — docs/GITHUB-SYNC.md и docs/VERIFICATION-COOLIFY-RU.md.

## Настройка нового приложения (при готовности к публикации)

1. В Coolify создайте НОВОЕ приложение из указанного GitHub-репозитория и ветки. Не редактируйте существующие приложения VPS. Укажите Dockerfile build pack и параметры таблицы. Сборка не требует build-time секретов.
2. Добавьте persistent storage /app/data. При bind mount заранее создайте каталог и назначьте UID/GID 1000:1000; при named volume Docker переносит владельца каталога из образа. Неправильные права приводят к 503 healthcheck — это намеренная защита от запуска без durable state.
3. Настройте runtime env из .env.example. APP_ORIGIN — точный origin сайта, без завершающего слеша. Для staging укажите реальный staging origin. В frontend API base оставьте пустым: NEXT_PUBLIC_API_BASE_URL не задавать. Код обращается к /api/* этого же сайта.
4. Внутренний порт 3000; не публикуйте его напрямую в Интернет. Доступ к приложению — через прокси Coolify. Health check GET /api/health/, interval 30s, timeout 5s, start period 30s, retries 3.
5. Ограничения runtime: пример 2 CPU, 2 GiB RAM, PID limit 256; проверить фактическую нагрузку. Сборке желательно выделить не менее 3–4 GiB свободной RAM. compose.yaml демонстрирует эти лимиты; при Dockerfile build pack задавайте их в Coolify, compose автоматически не применяется. Runtime работает как непривилегированный node (UID 1000).
6. Запускайте Deploy только в выбранное вами окно. После запуска проверьте health, страницу, вложенные URL, реальные AI/CRM. Рекомендуется сначала отдельный staging-домен с APP_ORIGIN этого домена.

## Runtime переменные

Обязательные для production: APP_ORIGIN=https://www.cubeappmaker.agency; DATA_DIR=/app/data. NODE_ENV=production, PORT=3000, HOSTNAME=0.0.0.0 заданы образом. Секреты задавать только runtime в Coolify, не Docker build args, не Git, не NEXT_PUBLIC_.

Вариант AI №1: AI_CHAT_URL (полный HTTPS URL chat/completions), AI_CHAT_KEY, AI_MODEL. Подходит внешний API с совместимым messages/choices контрактом и JSON object output. Конкретный поставщик не зашит в UI. Вариант №2: AI_PROVIDER_URL и AI_PROVIDER_KEY — существующий adapter, принимающий POST `{problem,allowedComponents}` и возвращающий `{summary,components}`. Если оба варианта заданы, chat provider имеет приоритет. При его отказе используется GuidedProvider; переключение на другой платный endpoint автоматически не выполняется. При quota/timeout/невалидном ответе также guided fallback. Без настроек AI работает guided-режим.

CRM_WEBHOOK_URL — HTTPS URL принимающей CRM; CRM_WEBHOOK_TOKEN — необязательный bearer. NOTIFICATION_WEBHOOK_URL / NOTIFICATION_WEBHOOK_TOKEN — необязательные уведомления. CRM получает `{id,lead}` с Idempotency-Key; получатель должен дедуплицировать ключ. CRM timeout 10s, notification timeout 3s. Ошибка уведомления не отменяет уже принятую CRM заявку; durable notification queue не реализована. /api/status сообщает configured/not_configured, а не проверенную связь; verified всегда false.

TRUST_PROXY=false по умолчанию: лимит общий для всех посетителей, безопасен даже при поддельном X-Forwarded-For. Значение true допустимо ТОЛЬКО после проверки, что непосредственный доверенный прокси добавляет/перезаписывает правый IP X-Forwarded-For и порт 3000 недоступен извне. При true ключ — хеш правого IP. Если заголовок отсутствует/невалиден, общий ключ. При дополнительных прокси сначала проверьте реальную цепочку; не доверяйте левому пользовательскому IP. CORS/Origin не является аутентификацией против ботов.

RECOMMEND_LIMIT_PER_MINUTE=12, LEAD_LIMIT_PER_MINUTE=5, AI_DAILY_LIMIT=200 — начальные ограничения. Дневной лимит общий, UTC, сохраняется после рестартов. Это число допущенных запросов, а не точный денежный бюджет. На границах fixed windows допустим удвоенный краткий burst. При отсутствии доступа к SQLite запросы fail closed 503. Настройте лимиты под посещаемость и upstream AI quota.

## Надёжность и постоянные данные

SQLite /app/data/cubeapp.sqlite (+ WAL/SHM) хранит счётчики и отпечатки успешных отправок, не полный текст лидов. Pending lease 60s, successful dedup 30 дней. Конкурентный повтор получает 409/Retry-After, завершённый повтор — 200 duplicate; другой payload с тем же ключом — 409. После неуспешного webhook ключ освобождается. При падении между приёмом CRM и записью результата возможен повтор после истечения lease: receiving CRM ОБЯЗАНА дедуплицировать Idempotency-Key. Exactly-once доставка не обещается.

Volume должен быть локальным диском VPS, не NFS. Не запускать реплики на разных серверах с независимыми копиями SQLite. Краткое перекрытие контейнеров на одном диске поддерживается SQLite-транзакциями; для простого первого запуска используйте stop/start deployment с коротким перерывом. Для горизонтального масштабирования потребуется общее серверное хранилище.

Backup: остановить только это приложение и копировать весь /app/data, затем запустить обратно; или использовать SQLite online backup через административный инструмент. Не копировать только .sqlite в момент активного WAL без согласованного snapshot. Защитите backup как служебные данные и проверьте восстановление на staging.

## Проверки после установки

- /api/health/ → 200; при недоступном хранилище → 503.
- Главная, /services/ai-agents/, /solutions/customer-support/, /projects/travel-ai-platform/, sitemap.xml, robots.txt, 404 для неизвестной страницы.
- Canonical/social URL остаётся www.cubeappmaker.agency. Не меняйте production canonical ради временного staging.
- Куб, все 7 WebM и 3 пользовательских MP3; звук выключен до согласия; мобильная версия, reduced motion, сохранение черновика.
- POST /api/recommend/ с Origin=APP_ORIGIN: реальный AI при настройке, иначе guided. Ошибка API провайдера должна давать guided, не вымышленный AI-успех.
- Отправьте тестовый лид в тестовый CRM; повторите тот же Idempotency-Key и payload, убедитесь в одной записи. Проверьте 500 CRM и сохранённый черновик. Автоматические fixtures не доказывают связь с вашим CRM.
- Кросс-origin POST и отсутствующий Origin → 403; неверный JSON/поля → 400, неверный MIME → 415, более 30000 байт → 413, лимит → 429.

## Разработка и контейнер локально

Node 24: npm ci → npm run typecheck → npm run lint → npm test → npm run build. npm run dev — development; npm start — обычный Node Next server после build. Production Docker использует standalone server.js.

Docker: `docker build -t cubeappmaker-node .`; `docker run --rm -p 127.0.0.1:3000:3000 -e APP_ORIGIN=http://127.0.0.1:3000 -v cubeapp-data:/app/data cubeappmaker-node`. Либо скопировать .env.example в .env, настроить APP_ORIGIN и выполнить `docker compose up --build -d`. Секреты .env игнорируются Git и Docker build context. Не переносить Windows node_modules в Linux build.

## Откат

Сохраните текущий SHA, image tag/digest, runtime env и backup volume. В Coolify выберите предыдущий проверенный образ/коммит ЭТОГО Node target и redeploy с прежним volume. При будущих миграциях схемы сначала проверяйте обратную совместимость; при необходимости восстанавливайте согласованный backup. Предыдущий main 5cd7563 — СТАТИЧЕСКИЙ frontend с внешним Cloudflare API, не взаимозаменяемый Node rollback: для него нужна старая инфраструктура и порт 80. Не переключайтесь на него без отдельного плана.

## Cloudflare-альтернатива

worker/ сохраняет отдельный backend и собственный package-lock/wrangler config. Старые frontend Dockerfile/next.config сохранены в coolify/alternatives. Для альтернативной сборки в ОТДЕЛЬНОМ checkout используйте старую main-версию или согласованно восстановите эти файлы и static frontend без Node app/api; не копируйте их поверх работающего Node production. В текущем Node runtime никакие Workers bindings не требуются.

## DNS и корпоративная почта

В рамках подготовки DNS НЕ меняется. Регистратор name.am остаётся прежним. MX, SPF, DKIM, DMARC, mail/autodiscover и настройки cPanel почты не менять. При будущем отдельном согласованном переключении сайта меняются только необходимые web A/AAAA/CNAME после проверки VPS/TLS; если почта использует apex/IP хостинга, сначала изучить зависимости. Не менять nameservers ради этого deployment.

Документы: https://nextjs.org/docs/app/api-reference/config/next-config-js/output ; https://coolify.io/docs/applications/builds/dockerfile ; https://coolify.io/docs/applications/configuration/persistent-storage

Проверенные версии для этого target: Next 16.4.6, React/ReactDOM 19.3.1, Zod 4.6.7. Docker base при проверке: Node 24.22.3. npm audit выполнен отдельно от установки зависимостей в Docker; флаг --no-audit экономит повторный сетевой запрос, а не заменяет security pass.
