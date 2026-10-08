# GIAM integration

GIAM is authoritative for people and systems, authentication, delegation, tokens and baseline access, including UI access. ACC keeps no users, passwords or reusable tokens and references GIAM's canonical identifiers.

## Verified from `tmp/sec-giam/docs/issuer-contract.md` (read selectively, not run)
- One configured value: the realm issuer URL `https://<authority>/api/v1/realms/<realm>`. Other paths are discovered.
- Discovery at `${issuer}/.well-known/openid-configuration` (also RFC 8414): `issuer`, `jwks_uri`, `token_endpoint`, `authorization_endpoint`. Compare `iss` to the configured value exactly.
- Verification is local against the published public key set; the verifier is `packages/giam-client` (vendored, see ADR 0008).
- Private token members `roles` and `permissions` exist; optional members are used only if present.

## Pending contracts (do not invent)
1. Which claims and audiences ACC validates, and the ACC audience value.
2. Revocation checking model and freshness bound.
3. Behavior when GIAM is unavailable: proposed fail closed for administrative and high-impact actions; to be agreed.
4. Delegation representation for agent and workload identities; mapping of GIAM roles to ACC console permissions.
5. UI session flow (authorization code with PKCE exists in GIAM; token exposure in the browser to be minimized).

Nothing here has been tested against a running GIAM.
