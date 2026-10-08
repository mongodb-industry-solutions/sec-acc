# Deployment model

MACH applied without fragmentation: API-first, cloud-native, headless; "microservices" realized as module boundaries (ADR 0001).

- Two runtimes only: `frontend` (Next.js, port 3000) and `backend` (Fastify, port 3001). No `backend/apps/`, no per-module deployment.
- One root `docker-compose.yml`, one Dockerfile per app, `context: .` so workspace manifests and `packages/` are available. No per-app Compose files. MongoDB is external; Atlas is not containerized, EA and CE images depend on licensing and are not declared.
- Config: environment only; optional root `.env` (ADR 0005). Compose forwards only the variables each service needs. Ports bind to 127.0.0.1.
- Backend: `/api/v1/health` (liveness), `/api/v1/ready` (MongoDB ping, fails closed, no cause leaked), graceful shutdown on SIGTERM/SIGINT.
- Database lifecycle is a separate step (`setup:db`, `seed:db`), never server start.

Pending (not verified): Docker build and image tags, lockfile reproducibility (ADR 0006), observability stack, CI pipeline.
