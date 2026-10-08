# Roadmap

Each milestone needs acceptance criteria, tests and short docs. No regulatory compliance claims.

| # | Milestone | State |
|---|---|---|
| 0 | Discovery and boundaries (this bootstrap: docs, ADRs) | done |
| 1 | MACH foundation: workspace, two runtimes, `/api/v1` + OpenAPI guard, setup/seed, env, health, Compose, Dockerfiles, skeleton | skeleton done; checks below pending |
| 2 | Governance slice: synthetic action PEP to PDP to PIP/PRP to audit, four dispositions, versioned policy, mocked attributes. Criterion: no protected action reaches its target without enforcement, correlated evidence recorded | not started |
| 3 | GIAM login and console authorization, revocation, agent/decision/policy/audit screens | not started |
| 4 | Assurance: abuse tests, human approval, rate limits, MongoDB profiles | not started |
| 5 | Integrations (MGF, SIEM/SOAR, Leafy Pay) with contract, threat analysis, tests, ADR | not started |

## Pending in milestone 1
- Docker builds run; lockfile policy (ADR 0006); CI (lint, build, tests, OpenAPI check); lint and format config.
- `backend/openapi.json` export; ESLint/Prettier choice; frontend app shell (Next `app/` is a placeholder).
- Capabilities come from mongo-compat rules; none is verified against a real product in ACC (docs/mongodb/compatibility.md).
- Review vendored packages (ADR 0008). Context docs live outside this repo (`../sec-acc2/docs`); decide whether to copy them into `docs/`.

## Recommended next task
Milestone 1 closure: run install, type-check and tests; fix findings; add CI. Then milestone 2 starting with the OpenAPI contract for the decision flow.
