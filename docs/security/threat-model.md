# Threat model (bootstrap baseline)

Scope: ACC as a policy decision/enforcement layer for agent actions. Assets: policies, decisions, audit evidence, GIAM-derived identity claims, MongoDB credentials.

| Threat | Control (target) | State |
|---|---|---|
| Parallel IAM or local credentials in ACC | GIAM only; no users/passwords/reusable tokens stored | rule only |
| Confused deputy, implicit authority inheritance | Re-authenticate and re-authorize each hop; decision bound to one action | not built |
| Bypass of PEP | PEP at the execution boundary; fail closed on high impact | not built |
| Replay and stolen permission | Short-lived, audience/action-scoped, revocable permissions; nonce | not built |
| Prompt injection steering a tool call | Decision never delegated to a generative model; PEP normalizes the action | not built |
| Policy tampering or unauthorized publish | PAP approval and versioning; PRP serves only published versions | not built |
| Tenant crossing | Tenant in every query and decision | not built |
| GIAM or PDP outage | Fail closed for high impact; agreed degraded mode for low impact | pending contract |
| Audit tampering | Restricted write path, hash chain, backup, export. MongoDB alone is not immutable | not built |
| Secret leakage | Root `.env` untracked; `MONGODB_URI` never logged; config errors name variables only; logger redacts authorization and cookie; no secrets in browser bundle | partial |
| Unlisted route or undocumented endpoint | `assertRouteContract` | built |
| Unsupported MongoDB feature silently degraded | Capability registry; reject unsupported combinations | partial |

Open risks: vendored `platform-links` derives demo client secrets (ADR 0008); lockfile not committed (ADR 0006); GIAM contracts unverified at runtime.
