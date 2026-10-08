# Module boundaries

GIAM answers who acts, who delegated and baseline access. ACC decides whether this action may run now. GIAM allow is necessary, not sufficient.

| Module | Owns | Must not |
|---|---|---|
| pap | Authoring and lifecycle of action policies (review, version, simulate, publish, rollback) | Hold identity or baseline access policy (GIAM) |
| prp | Serves the published effective policy version, with explicit cache and invalidation | Author policy |
| pip | Trusted attributes with source, freshness, correlation id | Mirror GIAM |
| pdp | Deterministic per-action decision: `ALLOW` `DENY` `OBSERVE` `ESCALATE`, policy version, reason codes, obligations | Delegate the decision to a generative model |
| pep | Enforcement at the execution boundary; normalize action, ask pdp, block or allow; fail closed on high impact | Inherit a prior decision for a different action |
| mgf | Governance evidence across the lifecycle (risk, ownership, oversight, testing, approval, change) | Replace pap/pdp/pep |
| audit | Correlated append-only evidence with integrity controls | Claim MongoDB is immutable |

Flow: GIAM facts to pip; pap publishes to prp; action crosses pep; pdp combines prp and pip; pep enforces; audit records before and after. Each hop re-authenticates.

## Code layout
- Backend: `backend/src/modules/<m>/{controllers,models,services}/` and `backend/src/shared/{controllers,models,services}/` (common ACC capabilities only, no provider adapters).
- Frontend: `frontend/src/modules/<m>/{components,models,services}/`, `frontend/src/shared/{components,models,services}/`. `src/app/` composes.
- Request flow: controller to service/repository to `packages/mongo-compat`. Controllers hold no domain logic or queries.
- A module registers via `ModuleDefinition` in `backend/bin/server.ts`. Frontend services call typed REST only.
- Cross-module calls go through the owning module's service, never its storage.
