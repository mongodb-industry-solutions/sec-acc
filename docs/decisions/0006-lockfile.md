# 0006 Lockfile policy
Status: open.
Context: `.gitignore` excludes `package-lock.json`, so installs and Docker builds are not reproducible. Versions in manifests are pinned (Fastify 5.12.5, `@fastify/swagger` 9.9.1, Next 16.4.0, TypeScript 5.9.3) but not verified against the registry by this bootstrap.
Proposed: commit the lockfile and use `npm ci` in Dockerfiles. Needs owner decision.
