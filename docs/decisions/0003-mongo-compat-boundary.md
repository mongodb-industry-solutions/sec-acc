# 0003 `packages/mongo-compat` is the only MongoDB boundary
Status: accepted (existing design preserved).
Decision: product/version resolution and capabilities live only in the package. Since 3.3.0 the package is pure and vendored identically across repos, so the driver and session moved to `backend/src/shared/services/mongo.service.ts`, the only `mongodb` import. No `backend/src/vendors/mongo`.
Note: workspace packages use the `@ist-sec/` scope.
Pending: all capabilities unverified; tests against real products not run.
