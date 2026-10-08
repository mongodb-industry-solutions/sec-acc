# MongoDB compatibility

Owner: `packages/mongo-compat` (ADR 0003). Selection: `MONGODB_TYPE=atlas|ea|ce`, `MONGODB_VERSION=9.0.0`, `MONGODB_URI` (secret, never logged). The product is never inferred from the URI. Unsupported combinations are rejected with an actionable error; security guarantees are never silently degraded.

## Split
- `packages/mongo-compat` (3.3.0, vendored copy, pure, no driver): `declaredDeployment`, `detectDeployment`, `capabilitiesOf`, `capabilityFindings`, QE profiles, crypt_shared resolution. Byte-for-byte identical to the other repos; change it upstream, never locally.
- `backend/src/shared/services/mongo.service.ts`: the only `mongodb` import. `MongoConfigReader` (strict, rejects unknown `MONGODB_TYPE` instead of the package's atlas fallback), `createMongoSession` returning a `MongoSession` (`connect` probes the cluster, `ping`, `close`, `collection(name)`, `schema` for setup only, `deployment`, `capabilities`), `requireCapability`. Contracts in `shared/models/mongo.model.ts`; driver types never cross it.

## Consumer rules
Everything uses the session: `bin/server.ts` (ping only), `setup.ts` (also reports `capabilityFindings`), `seed.ts`, services/repositories. Controllers do not query. No other driver import, client or product/version conditional. Tests: `tests/packages/unit/mongo-compat/`, `tests/backend/unit/shared/`.

## Matrix
Capabilities are derived by `capabilitiesOf` (mongo-compat `MongoCapabilities`): queryableEncryption, automaticEncryption, qeRange, qeTextSearchProfile, changeStreams, transactions, timeSeries, timeSeriesExpiry, atlasSearch, serverAuditLog, supportsAtlasAdminApi. These are the package's rules, not ACC evidence.

| Capability | atlas | ea | ce | Evidence |
|---|---|---|---|---|
| all of the above | unverified in ACC | unverified in ACC | unverified in ACC | none yet; no test ran against a real product |

Rule: a row becomes `verified` only with a test that ran against that product and version. Vector Search may support investigation, never authorization. Atlas Search, QE and Vector Search need per-product verification of availability and licensing. Version 9.0.0 is configurable and not assumed to exist on any product.

Data model: [data-model.md](data-model.md).
