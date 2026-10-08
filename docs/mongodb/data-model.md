# Data model decisions

Authority: `backend/bin/setup.ts` (append-only versioned steps). Baselines: `backend/data/seed/*.json` (`requiresSchema`, upsert by `_id`). No startup mutation, no second migration mechanism. Destructive changes need an explicit guarded mode (pending).

## Current schema (version 1)
- `meta`: schema version document (`_id: "schema"`) and reference data (`dispositions`: ALLOW, DENY, OBSERVE, ESCALATE).

## Principles (apply when a module adds collections)
- Model from verified access patterns, recorded here with the query that needs each index. No speculative indexes.
- Embed bounded data read or updated together; reference independent, high-cardinality or shared entities; no unbounded arrays.
- `$jsonSchema` validators and an explicit `schemaVersion` per document.
- Transactions only where multi-document atomicity is required, after the capability is verified for the product.
- TTL for temporary permissions, time series for high-frequency events, Change Streams, Aggregation, Atlas Search: only where the capability is verified (compatibility.md).
- audit: append-only write path, hash chaining, restricted roles, backup and export; MongoDB is not claimed immutable.
- Identity data stays in GIAM; ACC stores GIAM identifiers only.

## Planned collections (not created)
Defined per milestone 2, with access pattern, indexes and validator, before any step is added to setup.ts.
