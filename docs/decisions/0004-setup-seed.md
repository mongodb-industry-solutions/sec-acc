# 0004 setup.ts and seed.ts own the database
Status: accepted (existing design preserved).
Decision: `setup.ts` is the only versioned, append-only source of structure; `seed.ts` upserts minimal JSON from `backend/data/seed/` by `_id`; the server never mutates the database. Setup is not safe for concurrent runs: run it from one deployment job.
Pending: guarded destructive mode, validators and indexes arrive with the first module collections.
