# ACC (Agent Control Center): agent rules

ACC governs each agent action. GIAM owns identities, authentication, delegation, tokens and baseline access (UI login included). ACC never builds a login, directory, token issuer or IAM.

## Security
- Never read, print or search `.env` or `.env.*`. Stop if you meet credentials. `tmp/sec-giam` is external: read selectively, never copy or edit.
- Secure by default: one decision per action, PEP at the execution boundary, fail closed on high impact, short-lived revocable permissions, distinct person/agent/workload identities, minimal data, correlated audit. MongoDB is not inherently immutable.

## Structure (details: docs/architecture/module-boundaries.md)
- Exactly two runtimes: `frontend/` (Next.js) and `backend/` (Fastify). Modules `pap pep pip prp pdp mgf audit` are in-process code. No `backend/apps/`, extra services or per-module deploys without an ADR (docs/decisions/0001).
- Backend module and `backend/src/shared/`: sibling `controllers/ models/ services/`. Frontend module and `frontend/src/shared/`: sibling `components/ models/ services/`. `app/` is routing and composition only.
- Entry points: `backend/bin/server.ts`, `setup.ts`, `seed.ts`. Seed JSON in `backend/data/seed/`. Tests live in `tests/<backend|frontend|packages>/<unit|integration|e2e>/`.

## API (docs/api/capability-parity.md)
- Contract first. Every route is under `/api/v1`, short lowercase English resource hierarchies (`/api/v1/work/place`). CRUD only where it fits; not on immutable events or action workflows.
- Every route has schemas and appears in the `@fastify/swagger` spec (enforced by `assertRouteContract`).
- UI and REST have parity both ways and share services, rules and audit. The API works headless.

## MongoDB (docs/mongodb/)
- `packages/mongo-compat` (vendored, pure, shared with PSP/bankcore/GIAM) owns product/version and capability rules. `backend/src/shared/services/mongo.service.ts` is the only driver import and client; everything else uses its session. No product/version conditional outside mongo-compat. Fix compatibility upstream in mongo-compat, re-vendor, add a focused test and a row in `docs/mongodb/compatibility.md`.
- `MONGODB_TYPE=atlas|ea|ce`, `MONGODB_VERSION=9.0.0`. Never claim unverified support.
- `setup.ts` is the sole versioned source of collections, validators and indexes (append-only steps). `seed.ts` is idempotent. Nothing mutates the database at server start.

## Environment
- Optional root `.env`, loaded with `dotenv` from the repo root (backend `env.service.ts`, `frontend/next.config.ts`), shared by both apps. Runtime variables win. No per-project env files. Validate each variable and name it in errors, never its value. Only `NEXT_PUBLIC_` reaches the browser.

## Code
- Strict TypeScript. OOP by default (classes, interfaces, injected ports); inheritance only for a real is-a. Small pure helpers are fine.
- Reuse before creating. Add only what a documented requirement needs. Do not implement a later milestone's scope.
- Comments are short and explain rationale or invariants. No em dash.
- Docs change in the same commit as the code they describe.

## Where to look
`docs/decisions/` (ADRs), `docs/development/roadmap.md` (milestones and pending items), `docs/security/threat-model.md`.
