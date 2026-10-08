# 0001 Two runtimes, in-process modules
Status: accepted. Supersedes the scaffold that composed four services (`ACC_SERVICE`, `backend/apps/*`, per-service Compose includes).
Context: the agreed scope is Next.js frontend plus Fastify backend. The scaffold referenced `backend/apps/*` that never existed and a Compose `include` that could not run.
Decision: one backend process (`bin/server.ts`) registers `pap pep pip prp pdp mgf audit` as `ModuleDefinition`s. No `backend/apps/`, extra services or per-module deployments. One root Compose, one Dockerfile per app.
Consequence: module isolation is by code boundary and tests. Any change to the runtime count needs a new ADR.
