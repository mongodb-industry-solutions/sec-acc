# 0007 GIAM boundary
Status: accepted.
Decision: GIAM owns identity, authentication, delegation, tokens, baseline access and UI login. ACC stores GIAM identifiers, validates tokens through the verifier, and decides per action. Contracts and open questions: docs/architecture/giam-integration.md. `tmp/sec-giam` stays external and read-only.
