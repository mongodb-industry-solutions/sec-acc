# API contract and capability parity

## Rules
- Contract first: define the OpenAPI schema, then implement.
- Paths start with `/api/v1`, lowercase, short English, meaning by hierarchy (`/api/v1/work/place`, never `/workPlace`).
- REST verbs and status codes. CRUD where the resource and security model allow it; immutable events (audit) and action workflows (decide, approve) are not forced into CRUD.
- `@fastify/swagger` generates the spec at `GET /api/v1/openapi`. `assertRouteContract` (backend/src/shared/services/api-app.service.ts) rejects any route outside `/api/v1`, without a response schema, or hidden from the spec. Tested in `tests/backend/integration/shared/api-app.test.ts`. `backend/openapi.json` export is pending.
- Authorization is enforced in the backend, never only by hiding UI controls.

## Parity
Every UI operation has a REST equivalent and every product REST capability has an authorized UI workflow. Both use the same services, rules, GIAM authorization, decision and audit. The API works with no browser.

| Capability | REST | UI | Status |
|---|---|---|---|
| Liveness | `GET /api/v1/health` | n/a technical | implemented |
| Readiness | `GET /api/v1/ready` | n/a technical | implemented |
| OpenAPI document | `GET /api/v1/openapi` | n/a technical | implemented |

Technical endpoints (health, ready, machine callbacks) sit outside the matrix. Add a row with the endpoint, never after it. Parity tests (same use case via both channels) start with the first business capability.
