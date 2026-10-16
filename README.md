# CubeAppMaker — Coolify

Статический frontend на Next.js/React/Three.js, контейнер Nginx. API с native Workers AI остаётся Cloudflare Worker в `worker/`. Coolify не исполняет Cloudflare bindings. Утверждённый UI и исходный GLB сохранены.

## Установка в Coolify

1. Подключите приватный GitHub-репозиторий через GitHub App или deploy key.
2. Создайте Application, выберите ветку `main`, Build Pack **Dockerfile**, Base Directory `/`, Dockerfile `/Dockerfile`.
3. Exposed Port: **80**, health check: GET `/healthz`, port 80.
4. Build variable `NEXT_PUBLIC_API_BASE_URL=https://api.cubeappmaker.agency` (используется Docker ARG). Это публичный адрес; секреты здесь не задавать. После изменения нужен rebuild.
5. Задайте домен `https://www.cubeappmaker.agency`. DNS www направьте на сервер Coolify; прежнюю привязку www к Worker/cPanel отключите только при переключении. Настройте TLS. api сохраняется на Cloudflare.
6. Deploy. Проверьте главную, вложенные service/solution/project URL, GLB, звук и AI-форму. Для тестового домена добавьте точный origin в `worker/wrangler.json` и перепубликуйте API.

## API

Инструкции и секреты: `worker/SECRETS.md`. Из worker: `npm ci`, `npm run build`, `npm run check:deploy`, затем при готовности `npm run deploy`. Native Workers AI, CRM и секреты на Cloudflare. Пока API не опубликован/не настроен, полноценная работа интеграций не подтверждена. Не добавляйте секреты в Git или frontend.

## Локальная проверка

`npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

Контейнер: `docker build -t cubeappmaker .` и `docker run --rm -p 8080:80 cubeappmaker`.

Статические исходники ранее прошли build и 25 тестов. Docker/Coolify нужно проверить в доступном Docker runtime; этот репозиторий сам по себе ещё не означает выполненную публикацию.

Документация Coolify: https://coolify.io/docs/applications/builds/dockerfile
