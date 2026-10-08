# 0008 Vendored LeafyPay packages
Status: open, review required.
Context: `packages/eventbus`, `packages/giam-client`, `packages/platform-links` were committed from the LeafyPay/GIAM repo. They are outside the bootstrap structure and are not used by ACC code yet.
Risks: `platform-links` derives demo OAuth client secrets and carries LeafyPay hosts, which is not ACC scope. `eventbus` brings Kafka/RabbitMQ transports and a Mongo event store that must go through `mongo-compat` before use. `giam-client` is the likely verifier but its fit with ACC audiences is unverified.
Proposed: keep `giam-client`, remove `platform-links`, decide on `eventbus` at milestone 2. Not changed here.
