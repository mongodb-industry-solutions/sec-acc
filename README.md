# ACC: Agent Control Center

Per-action governance for AI agents. GIAM stays the identity authority. Status: bootstrap (milestone 1), no business logic yet. See [docs/development/roadmap.md](docs/development/roadmap.md).

## Layout
- `backend/` Fastify API, entry `bin/server.ts`; `bin/setup.ts` and `bin/seed.ts` own the database.
- `frontend/` Next.js console (REST client).
- `packages/mongo-compat` product/version and capability rules; `backend/src/shared/services/mongo.service.ts` the only MongoDB client; `packages/env` resolves the optional root `.env`.
- `tests/`, `docs/`. Rules: [AGENTS.md](AGENTS.md).

## Run
Requires Node 22+ and an external MongoDB (`atlas`, `ea` or `ce`).

```
npm install
npm run build:packages
npm run setup:db      # structure, versioned, run once per deployment
npm run seed:db       # idempotent baseline
npm run dev:backend   # http://127.0.0.1:3001/api/v1/health
npm run dev:frontend  # http://localhost:3000
npm test
docker compose up --build   # two services, build context = repo root
```

Configuration: optional root `.env` (template `.env.example`), see [docs/decisions/0005-root-env.md](docs/decisions/0005-root-env.md). Required: `MONGODB_TYPE`, `MONGODB_VERSION`, `MONGODB_URI`. OpenAPI: `GET /api/v1/openapi`.
