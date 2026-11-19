# Production verification — Node/Coolify

Дата: 19 ноября 2026. Отчёт относится к отдельной ветке deploy/hostinger-coolify-node. Проверки выполняются локально, не на VPS. Финальные Docker/HTTP проверки завершены успешно.

Исходный аудит выявил 21 npm finding; после обновления Next 16.4.6, React/ReactDOM 19.3.1, Zod 4.6.7 и совместимых transitive fixes npm сообщает 0 vulnerabilities в основном Node-проекте. Это результат npm advisory audit, не гарантия отсутствия любых уязвимостей и не аудит базовой ОС контейнера. Отдельный исторический worker/package-lock.json не включён в этот результат и требует собственного аудита перед использованием Cloudflare-альтернативы.

Новые тесты: SQLite shared counters, restart persistence, in-flight duplicate/conflict/retry, streamed byte limit, Origin/MIME/body guards, structured external AI и guided fallback. Существующие 26 тестов UI behaviour/аудиоуправления/провайдеров также сохранены; всего 30.

UI/Three.js/audio source diff: отсутствует. Все изменения ограничены deployment/backend, зависимостями, тестами и документацией. Утверждённый GLB не заменён.

Live AI и реальный CRM пользователя не подключались. Интеграционные успешные/неуспешные сценарии проверяются изолированным локальным HTTPS fixture с доверенным тестовым сертификатом; TLS verification не отключается. DNS, cPanel, email, VPS и production не изменялись.


## Выполненные проверки

| Проверка | Результат | Доказательство |
|---|---|---|
| Чистая Linux установка из lockfile | PASS | npm ci --no-audit внутри Docker build |
| npm run typecheck | PASS | Финальный Docker build, TypeScript без исключения ошибок |
| npm run lint | PASS | Финальный Docker build, без отключения правил проекта |
| npm test | PASS | 30/30 тестов в финальном Linux builder |
| npm run build | PASS | Next 16.4.6, standalone; API/healthz отмечены dynamic |
| Docker build | PASS | Образ cubeappmaker-node:verify успешно создан |
| Startup/health | PASS | Next standalone готов, Docker health healthy |
| Non-root / limits | PASS | UID 1000, user=node; 2 CPU, 2147483648 bytes memory, PID limit 256 |
| Отсутствие Cloudflare runtime | PASS | require.resolve для wrangler, vinext, @cloudflare/vite-plugin возвращает MODULE_NOT_FOUND |
| HTTP страницы/SSR-HTML/SEO | PASS | Главная, service/solution/project, sitemap/robots, неизвестная страница 404 |
| CSS/JS/fonts | PASS | Все /_next ссылки из homepage возвращают непустые ресурсы 200 |
| GLB/audio/social | PASS | SHA256 каждого HTTP-ответа совпадает с public; исходный GLB, 7 WebM + 3 MP3 |
| AI structured success | PASS, fixture | Настоящий Node API обращается к локальному доверенному HTTPS fixture |
| AI quota failure → GuidedProvider | PASS, fixture | Fixture 429 → HTTP 200 с mode=guided |
| Без AI/CRM env | PASS | Второй контейнер: guided, configured=false, CRM 503 |
| CRM success/duplicate/conflict/failure | PASS, fixture | 200 delivered, 200 duplicate, 409 conflict, 502 upstream failure |
| Notification failure | PASS, fixture | Fixture 500 не отменяет уже доставленный CRM lead |
| Persistence после пересоздания | PASS | Контейнер удалён/создан из финального образа с прежним volume; duplicate=true; fixture получил lead ровно один раз |
| Rate protection | PASS | Реальные POST через HTTP переходят в 429; durable/shared storage unit tests |
| Origin / missing Origin | PASS | Чужой/отсутствующий Origin → 403, wildcard ACAO отсутствует |
| Validation / request limits | PASS | Невалидные поля/email → 400; 31000+ bytes → 413; stream byte cap без Content-Length unit test |
| Отказ записи в DATA_DIR | PASS | DATA_DIR=/root/cubeapp-unwritable: /api/health и /healthz → 503, recommendation guard → 503 |
| Секреты в браузерных bundles | PASS | scripts/verify-security.mjs: 37 JS/CSS/JSON файлов; нет server-secret markers, fixture tokens, старого external API base |
| Прямой доступ к служебным файлам | PASS | /.env и /data/cubeapp.sqlite → 404 |
| npm advisory audit | PASS | Основной lockfile: 0 vulnerabilities после security fixes |
| git diff --check | PASS | Нет ошибок whitespace |

Финальный локальный Docker image ID: `sha256:fde16f7d775c9dcdc0a238876104d6d379a10b78e73db328009c5129807aaa09` (436248119 bytes). Runtime: Node v24.22.3 / Next 16.4.6. Полный журнал успешного build: verification-build.log.

HTTP проверки: scripts/smoke-node.mjs; fixtures: scripts/fixture-server.mjs; browser bundle scan: scripts/verify-security.mjs. Тестовый TLS-сертификат создавался отдельно в /tmp и доверялся через NODE_EXTRA_CA_CERTS только тестовому контейнеру. Сертификат/ключ не включены в Git и production image. TLS verification не отключалась.

## Не проверено / не выполнено

- Реальный API-аккаунт AI и CRM/уведомления пользователя — не настроены и не выдаются за PASS.
- Развёртывание на Hostinger/Coolify, публичный TLS и DNS — не выполнялись.
- Нагрузочное тестирование, OS image vulnerability scan и реальный backup/restore на VPS — не выполнялись; npm audit не заменяет их.
- Новая визуальная/слуховая браузерная регрессия не выполнялась. UI/Three/audio source и public assets не менялись; HTTP integrity и 30 автоматических тестов прошли.
- Исторический Cloudflare target сохранён как альтернатива; его отдельный lockfile не входит в security PASS основного Node target.
