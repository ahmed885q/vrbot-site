# VRBOT Platform (vrbot.me) — Backend Foundation (Stage 1)

Production-minded starter repo for:
- NestJS API + Prisma
- PostgreSQL + Redis
- Docker Compose
- Caddy reverse proxy (domain-ready: vrbot.me)

## Quick start (local)
1) Copy env:
```bash
cp .env.example .env
```

2) Start infra + api:
```bash
docker compose up -d --build
```

3) Run migrations + seed:
```bash
docker compose exec api npm run prisma:migrate
docker compose exec api npm run prisma:seed
```

4) Open:
- API: http://localhost:8080/api
- Swagger: http://localhost:8080/api/docs
- Health: http://localhost:8080/api/health

## Notes
- Domain `vrbot.me` is prewired in `infra/Caddyfile` (TLS later).
- Stage 2 (dashboard) and Stage 3 (worker/agent) are stubbed in `/apps`.
