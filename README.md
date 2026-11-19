# CubeAppMaker — Hostinger + Coolify

Full-stack Next.js standalone on Node.js 24 LTS. Frontend, SSR/SSG and `/api/*` run in one non-root container on port 3000. No Cloudflare runtime or static export required. Approved UI, Three.js, audio and assets are preserved.

- [Installation / Coolify / rollback (Russian)](INSTALL-COOLIFY-RU.md)
- [Pre-migration audit](docs/AUDIT-HOSTINGER-RU.md)
- [Verification report](docs/VERIFICATION-COOLIFY-RU.md)
- [GitHub sync report](docs/GITHUB-SYNC.md)
- Runtime variables: `.env.example` (no secrets)
- Health: `/api/health/`; persistent volume: `/app/data` (UID 1000)
- Build: `npm ci && npm run typecheck && npm run lint && npm test && npm run build`
- Docker: `docker build -t cubeappmaker-node .`

Cloudflare backend remains available as an optional alternative in `worker/`. Corporate email and DNS are outside this change. This branch is prepared for review; no production deployment has been performed.
