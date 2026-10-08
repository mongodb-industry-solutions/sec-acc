# 0002 REST and OpenAPI contract
Status: accepted.
Decision: contract first; all routes under `/api/v1`, lowercase short hierarchies; CRUD only where fitting; `@fastify/swagger` spec at `/api/v1/openapi`; `assertRouteContract` rejects routes outside the prefix, without response schema or hidden from the spec. UI and REST parity maintained in docs/api/capability-parity.md.
Pending: export `backend/openapi.json` and contract tests in CI.
