# ACC Governance Envelope & Execution Permit Specification

**Document Title:** Agent Control Center (ACC) Governance Envelope, HTTP API & Execution Permit Specification
**Document Version:** 3.2 (Comprehensive Schema Definitions, REST API Contracts & HITL Approval Workflows)
**Status:** Canonical Reference Architecture
**Standards Integration:** OpenID AuthZEN 1.0, XACML 3.0, Google AP2, RFC 8693 (Token Exchange), SPIFFE, RFC 7515 (Detached JWS), RFC 8785 (JCS)

---

## 1\. Executive Summary & Purpose

The **Governance Envelope** is the foundational data structure within the **Agent Control Center (ACC)** architecture. It securely packages the contextual attributes required to evaluate an authorization request prior to the execution of an agentic action.

To ensure robust security, non-repudiation, and high-performance querying in Document Databases (e.g., MongoDB), the ACC architecture strictly separates the authorization lifecycle into two distinct cryptographic artifacts:

1.  **Request Envelope (ACC_Governance_Request):** Constructed by the Policy Enforcement Point (PEP) or the Agent. It guarantees the immutability of the business intent, reasoning trace, and the action's payload, preventing tampering by the ACC or interceptors.
2.  **Execution Permit (ACC\_Execution\_Permit / EPT):** Emitted exclusively by the Policy Decision Point (PDP) upon a successful evaluation. It serves as a short-lived, unforgeable capability token that binds the PDP's decision to the exact parameters of the original request, which the Target System validates before execution.

This design utilizes a **Standards Composition Pattern**, ensuring compliance with established security and identity frameworks while optimizing for the unique requirements of Agentic AI Systems in regulated environments (e.g., latency, non-determinism handling, and BSON indexing).

---

## 2\. Problem Statement & Technical Justification (Research Contribution)

### 2.1 Problematic: Why a Governance Envelope is Required

As financial institutions deploy autonomous AI agents capable of initiating actions—such as executing wire transfers, placing trades, or modifying credit profiles—traditional security frameworks reach their operational limits. Conventional access control systems evaluate identity and grant authorization at the session boundary or token issuance stage. However, generative AI agents introduce unique vulnerabilities:

-   **Non-Deterministic & Adaptive Behavior:** An agent may interpret user instructions correctly but generate anomalous, hallucinated, or uncalibrated tool execution calls.
-   **Indirect Prompt Injections & Context Poisoning:** Malicious inputs embedded in external data feeds can manipulate an agent into exfiltrating sensitive data or escalating execution parameters.
-   **Lack of Pre-Execution Assurance & Repudiation Risks:** Model Risk Management frameworks evaluate models pre-deployment, while audit logs operate retrospectively. By the time an unauthorized action is recorded in traditional logs, the transaction has already cleared. Without a cryptographic link between human delegation and agent action, non-repudiation cannot be legally guaranteed.

Therefore, a dedicated **Governance Envelope** operating at the point of action is essential. It ensures that no agentic action reaches execution without being explicitly declared, contextually validated, cryptographically bound, and immutably recorded before value moves.

### 2.2 Technical Justification for Extending Existing Standards

An exhaustive analysis of established security standards reveals that no single specification independently covers the complete lifecycle required for enterprise agent governance:

-   **XACML 3.0 / OpenID AuthZEN 1.0:** Excellent for Attribute-Based Access Control (ABAC) and evaluation APIs, but treats evaluation as a static, stateless attribute check. They do not define cryptographic payload binding, non-repudiation signatures, or structures for AI reasoning traces.
-   **Google AP2 (Agent Payments Protocol):** Provides cryptographically signed mandates for payment non-repudiation, but is narrowly scoped to financial payment rails. It lacks general enterprise ABAC semantics, multi-tenant RBAC, and AI guardrail telemetry.
-   **OAuth 2.0 RFC 8693 (Token Exchange):** Standardizes delegation chains (subject vs. actor tokens), but operates at the token layer and cannot validate specific runtime parameter payloads (e.g., verifying if a $4,500 transfer exceeds velocity limits).
-   **Standard JWS (RFC 7515):** Enclosing an entire JSON document inside a Base64-encoded JWS string (`header.payload.signature`) makes the payload opaque. This completely destroys native BSON indexing, querying, and aggregation capabilities in MongoDB (e.g., Atlas Search, B-Tree indexes) for security analytics and compliance auditing.

### 2.3 The ACC Research Contribution: Detached Signatures over Canonical JSON

To resolve the conflict between cryptographic non-repudiation and operational database queryability, the ACC architecture introduces a **Detached JWS Signature over JSON Canonicalization Scheme (RFC 8785)**.

The structured business payload remains native, unencoded, and fully indexable BSON within MongoDB collections (`accGovernanceRequest`), while the `agentProof.jwsSignature` contains a cryptographic signature calculated over the canonical SHA-256 hash of the payload. This achieves **100% cryptographic non-repudiation** without degrading database query performance or requiring secondary data transformation pipelines.

---

## 3\. Standards Alignment Mapping

The ACC Governance Envelope maps its internal components to established industry standards through a Standards Composition Pattern:

| Standard / Protocol | Role in ACC Architecture | Envelope / Token Implementation |
| --- | --- | --- |
| **OpenID AuthZEN 1.0 & XACML 3.0** | Normalized interface for PDP/PEP evaluation (ABAC). | 1:1 mapping of payloads: `subject`, `action`, `resource`, and `context` (Environment). Support for formal decisions (`Permit`, `Deny`, `Indeterminate`) and `Obligations`. |
| **Google AP2 (Agent Payments Protocol)** | Non-repudiation of intent in human-agent interactions. | Implementation of explicit Mandate Chaining (`INTENT` → `QUOTE` → `EXECUTION`). |
| **OAuth 2.0 RFC 8693 (Token Exchange)** | Multi-hop delegation and attribution. | Explicit separation of the `subject_token` (Delegating Human) and the `actor_token` (Acting Agent). |
| **SPIFFE / WIMSE** | Cryptographic Workload Identity. | Validation of `spiffe://...` identifiers via runtime attestation (GIAM PIP). |
| **Capability-Based Security & JWT (RFC 7519)** | Unforgeable, single-use execution tokens. | The Execution Permit incorporates the `req_hash` claim, securely binding the PDP decision to the unaltered Request Envelope. |
| **RFC 7515 (JWS) & RFC 8785 (JCS)** | Cryptographic proof without obscuring database payloads. | `agentProof` and `accProof` utilize detached signatures over the canonical hash (RFC 8785), keeping the JSON natively indexable in MongoDB. |

---

## 4\. Non-Binary Decisions: Approval Tickets & Human-in-the-Loop (HITL) Workflows

### 4.1 The Security Invariant: Why ESCALATE / PENDING Cannot Emit an EPT

A fundamental security invariant of capability-based architectures is that an **Execution Permit Token (EPT)** constitutes an unforgeable, binding authorization to execute an action. Therefore, when an action evaluation yields a non-binary decision—such as an `ESCALATE` disposition resulting from a Stage 1 velocity warning or a Stage 2 Context Guardrail risk alert—**ACC MUST NEVER issue an EPT**.

Issuing an EPT during an escalated state would introduce a severe capability leak. If an agent or interceptor obtained an EPT while a transaction was undergoing review, that token could be presented to the Target System to execute the transaction prior to human sign-off.

### 4.2 The Approval Ticket as an Intermediate Workflow Artifact

When an evaluation yields `Decision: "Indeterminate"` (ACC Disposition: `ESCALATE`), the ACC PDP produces an **Approval Ticket** (`ApprovalTicket`) instead of an EPT. The Approval Ticket represents an _intermediate, stateful workflow handle_:

-   **Execution Block:** The PEP intercepts the `Indeterminate` response and hard-blocks downstream transmission to the Target System. No permit header is attached.
-   **Stateful Storage:** ACC persists the pending request parameters, context, reasoning trace, and the `ApprovalTicket` in the Governance Ledger under state `PENDING_HUMAN_APPROVAL`.
-   **Human Review Notification:** The ticket is routed to the ACC UI or an external human review queue (e.g., ServiceNow, Slack, or enterprise dashboard) based on required GIAM reviewer entitlements.

### 4.3 Post-Approval Resolution & Permit Delivery Lifecycle

The EPT is generated **strictly post-approval** through a secure claim protocol:

```
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│  Agent / PEP     │          │     ACC PDP      │          │ Human Approver   │          │  Target System   │
└────────┬─────────┘          └────────┬─────────┘          └────────┬─────────┘          └────────┬─────────┘
         │                             │                             │                             │
         │ 1. POST /governance/evaluate│                             │                             │
         ├────────────────────────────►│                             │                             │
         │                             │ 2. Stage 1/2 Check          │                             │
         │                             │    yields ESCALATE          │                             │
         │                             │                             │                             │
         │ 3. 200 OK (Indeterminate)   │ 4. Persist ApprovalTicket   │                             │
         │    + ApprovalTicket JSON    │    (State: PENDING)         │                             │
         │◄────────────────────────────┤                             │                             │
         │                             │                             │                             │
         │ [EXECUTION BLOCKED]       │ 5. Route to Review Queue    │                             │
         │                             ├────────────────────────────►│                             │
         │                             │                             │ 6. Authenticate via GIAM    │
         │                             │                             │    & Submit APPROVE         │
         │                             │◄────────────────────────────┤                             │
         │                             │                             │                             │
         │                             │ 7. TOCTOU Re-evaluation     │                             │
         │                             │    (Re-checks Policy/Tokens)│                             │
         │                             │                             │                             │
         │ 8. GET /approvals/{id}/permit                             │                             │
         ├────────────────────────────►│                             │                             │
         │ 9. 200 OK + Signed EPT      │                             │                             │
         │◄────────────────────────────┤                             │                             │
         │                             │                             │                             │
         │ 10. Execute Transaction + Attach EPT Token                │                             │
         ├───────────────────────────────────────────────────────────┴────────────────────────────►│

```
1.  **Reviewer Decision:** An authorized human reviewer authenticates via GIAM OIDC and submits an approval decision (`APPROVE` or `REJECT`) along with a mandatory written justification.
2.  **TOCTOU Re-evaluation:** Prior to issuing an EPT, ACC executes a **Time-of-Check to Time-of-Use (TOCTOU)** re-evaluation. It verifies that:
    -   The agent or delegating user identity has not been revoked in GIAM during the review window.
    -   The active policy set in PRP has not changed.
    -   The Ticket TTL has not expired.
3.  **Permit Generation & Retrieval:** Upon passing TOCTOU re-evaluation, ACC transitions the ticket state to `RESOLVED_APPROVED`, generates the signed `ACC_Execution_Permit` (EPT), and exposes it for the PEP/Agent to claim via `GET /v1/approvals/{ticketId}/permit`.

\---

## 5\. HTTP REST API Endpoint & Payload Specifications

All ACC governance evaluations interact via the standardized REST endpoint: `POST /v1/governance/evaluate`.

### 5.1 Request Envelope Payload (`ACC_Governance_Request`)

Submitted by the PEP or Agent runtime to `POST /v1/governance/evaluate`.

```
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "envelopeType": "ACC_GOVERNANCE_REQUEST",
  "requestId": "req_8817263_v1",
  "correlationId": "txn_payment_9921",
  "version": "2.1-safr-ap2",
  
  "mandateChain": {
    "mandateId": "mnd_112233",
    "mandateType": "EXECUTION_MANDATE",
    "parentMandateId": "mnd_quote_112232",
    "issuedAt": "2026-10-09T14:28:00Z",
    "expiresAt": "2026-10-09T14:35:00Z"
  },
  
  "principal": {
    "subjectId": "usr_9928310a",
    "authAssuranceLevel": "AAL2_FIDO2",
    "tenantId": "bank_emea_retail"
  },
  
  "agent": {
    "agentId": "payment-agent-v2",
    "spiffeId": "spiffe://prod.leafypay.com/ns/finance/sa/payment-agent",
    "workloadHash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  
  "action": {
    "targetResource": "urn:leafypay:account:acc_8817263",
    "actionName": "execute_wire_transfer",
    "parametersHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "payload": {
      "amount": 4500.00,
      "currency": "EUR",
      "recipientIban": "ES9121000418450200051384"
    }
  },
  
  "reasoningTrace": {
    "traceHash": "a8f5f167f44f4964e6c998dee827110c",
    "stepSequence": ["tool:check_balance", "tool:verify_iban", "tool:propose_transfer"]
  },
  
  "agentProof": {
    "type": "JsonWebSignature2020",
    "created": "2026-10-09T14:30:00Z",
    "nonce": "nonce_7f8a9b1c2d3e",
    "verificationMethod": "spiffe://prod.leafypay.com/ns/finance/sa/payment-agent#key-1",
    "proofPurpose": "assertionMethod",
    "jwsSignature": "eyJhbGciOiJSUzI1NiIs...[Detached Signature over Payload Hash]"
  }
}
```

#### Field Breakdown: `ACC_Governance_Request`

| Attribute Name | Data Type | Requirement | Brief Description |
| --- | --- | --- | --- |
| `envelopeType` | String | Mandatory | Static discriminator identifying the envelope structure. Value: `"ACC_GOVERNANCE_REQUEST"`. |
| `requestId` | String | Mandatory | Unique primary key for the authorization request (UUIDv4 or MongoDB ObjectId). |
| `correlationId` | String | Mandatory | Distributed tracing identifier correlating multi-step agent actions across systems. |
| `version` | String | Mandatory | Protocol specification version (e.g., `"2.1-safr-ap2"`). |
| `mandateChain` | Object | Mandatory | AP2-compliant container tracking authorization lineage. |
| `mandateChain.mandateId` | String | Mandatory | Unique identifier for the current active mandate. |
| `mandateChain.mandateType` | String | Mandatory | Mandate lifecycle stage: `INTENT_MANDATE`, `QUOTE_MANDATE`, or `EXECUTION_MANDATE`. |
| `mandateChain.parentMandateId` | String | Optional | Link to preceding quote or intent mandate in the chain. |
| `principal.subjectId` | String | Mandatory | Canonical GIAM user identifier on whose behalf the agent acts (RFC 8693 Subject). |
| `principal.authAssuranceLevel` | String | Mandatory | NIST SP 800-63 authentication assurance level (e.g., `AAL2_FIDO2`). |
| `agent.agentId` | String | Mandatory | Registered ACC agent catalog identifier. |
| `agent.spiffeId` | String | Mandatory | SPIFFE Uniform Resource Identifier proving workload identity. |
| `action.targetResource` | String | Mandatory | URN identifying the target system or data entity. |
| `action.actionName` | String | Mandatory | Operational verb requested (e.g., `execute_wire_transfer`). |
| `action.parametersHash` | String | Mandatory | SHA-256 hash of the canonicalized payload object for rapid tamper checking. |
| `action.payload` | Object | Mandatory | Dictionary of parameter values, stored natively as indexable BSON in MongoDB. |
| `reasoningTrace` | Object | Optional | Telemetry block detailing intermediate agent reasoning steps. |
| `agentProof.jwsSignature` | String | Mandatory | Detached JWS signature (RFC 7515) calculated over the payload hash (RFC 8785). |

---

### 5.2 Evaluation REST Response Payloads (HTTP 200 OK)

The endpoint `POST /v1/governance/evaluate` returns an HTTP 200 OK containing an `ACC_Evaluation_Response` wrapper. The payload varies based on the XACML decision.

#### Response Option A: Immediate Authorization (`ALLOW` / `Decision: "Permit"`)

Delivers the signed Execution Permit Token (EPT) directly in the response body.

```
{
  "evaluationId": "eval_991823_v1",
  "requestIdRef": "req_8817263_v1",
  "decision": "Permit",
  "disposition": "ALLOW",
  "evaluatedPolicyVersion": "pol_finance_transfers_v3.2",
  "evaluatedAt": "2026-10-09T14:30:01Z",
  
  "executionPermit": {
    "permitToken": "eyJhbGciOiJFZERTQSI...[Signed EPT JWT]...",
    "expiresAt": "2026-10-09T14:31:01Z"
  },
  
  "approvalTicket": null,
  "refusalNotice": null,
  
  "obligations": [
    {
      "id": "urn:acc:obligation:enforce-single-use",
      "params": { "idempotencyKey": "idempotency_7f8a9b1c2d3e" }
    }
  ]
}
```

#### Response Option B: Escalation / Pending Review (`ESCALATE` / `Decision: "Indeterminate"`)

Hard-blocks execution and delivers the intermediate `ApprovalTicket` metadata. **No permit token is included.**

```
{
  "evaluationId": "eval_991824_v1",
  "requestIdRef": "req_8817263_v1",
  "decision": "Indeterminate",
  "disposition": "ESCALATE",
  "evaluatedPolicyVersion": "pol_finance_transfers_v3.2",
  "evaluatedAt": "2026-10-09T14:30:01Z",
  
  "executionPermit": null,
  
  "approvalTicket": {
    "ticketId": "tkt_88172_hitl",
    "status": "PENDING",
    "requiredRole": "Compliance_Officer_L2",
    "escalationReason": "SAFR_VELOCITY_CEILING_EXCEEDED",
    "expiresAt": "2026-10-09T15:30:01Z",
    "claimUrl": "https://acc.leafypay.com/v1/approvals/tkt_88172_hitl/permit"
  },
  
  "refusalNotice": null,
  
  "obligations": [
    {
      "id": "urn:acc:obligation:hold-execution",
      "params": { "reviewQueue": "queue_finance_compliance" }
    }
  ]
}
```

#### Response Option C: Hard Denial (`DENY` / `Decision: "Deny"`)

Hard-blocks execution and supplies non-sensitive refusal codes.

```
{
  "evaluationId": "eval_991825_v1",
  "requestIdRef": "req_8817263_v1",
  "decision": "Deny",
  "disposition": "DENY",
  "evaluatedPolicyVersion": "pol_finance_transfers_v3.2",
  "evaluatedAt": "2026-10-09T14:30:01Z",
  
  "executionPermit": null,
  "approvalTicket": null,
  
  "refusalNotice": {
    "reasonCode": "ERR_POLICY_RESTRICTED_RECIPIENT",
    "userMessage": "The requested transfer recipient is not permitted under active workspace policy."
  },
  
  "obligations": []
}
```

#### Field Breakdown: `ACC_Evaluation_Response`

| Attribute Name | Data Type | Requirement | Brief Description |
| --- | --- | --- | --- |
| `evaluationId` | String | Mandatory | Unique primary key for the evaluation instance generated by PDP. |
| `requestIdRef` | String | Mandatory | Cross-reference to the `requestId` of the evaluated request. |
| `decision` | String | Mandatory | Formal XACML 3.0 decision: `"Permit"`, `"Deny"`, or `"Indeterminate"`. |
| `disposition` | String | Mandatory | ACC operational outcome: `"ALLOW"`, `"DENY"`, `"ESCALATE"`, or `"OBSERVE"`. |
| `evaluatedPolicyVersion` | String | Mandatory | Exact PRP/GIAM policy version utilized during evaluation for auditability. |
| `executionPermit` | Object | Conditional | Present **ONLY** when `decision == "Permit"`. Contains the signed EPT JWT. |
| `executionPermit.permitToken` | String | Conditional | Compact, signed JWS JWT containing capability claims for the Target System. |
| `approvalTicket` | Object | Conditional | Present **ONLY** when `decision == "Indeterminate"` (`ESCALATE`). Contains review ticket. |
| `refusalNotice` | Object | Conditional | Present **ONLY** when `decision == "Deny"`. Contains non-sensitive failure reason codes. |
| `obligations` | Array[Object] | Optional | XACML 3.0 obligations binding the PEP or Target System behavior. |

---

### 5.3 Post-Approval Permit Claim Endpoint (`GET /v1/approvals/{ticketId}/permit`)

Once an authorized human signs off on an Approval Ticket, the PEP or Agent claims the issued EPT by calling `GET /v1/approvals/{ticketId}/permit`.

```
{
  "ticketId": "tkt_88172_hitl",
  "status": "RESOLVED_APPROVED",
  "resolvedBy": "usr_compliance_officer_44",
  "resolvedAt": "2026-10-09T14:45:00Z",
  
  "executionPermit": {
    "permitToken": "eyJhbGciOiJFZERTQSI...[Signed EPT JWT]...",
    "expiresAt": "2026-10-09T14:46:00Z"
  }
}
```

---

### 5.4 Execution Permit Token Claims (EPT / JWT Structure)

The `permitToken` is a short-lived JWS JWT issued by ACC PDP.

```
{
  "header": {
    "alg": "EdDSA",
    "typ": "JWT",
    "kid": "acc-pdp-key-2026-v1"
  },
  "payload": {
    "jti": "prm_9938102_v1",
    "iss": "https://acc.leafypay.com/pdp",
    "aud": "urn:leafypay:target:core-banking",
    "sub": "spiffe://prod.leafypay.com/ns/finance/sa/payment-agent",
    "act": {
      "sub": "usr_9928310a"
    },
    "req_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "iat": 1791556200,
    "nbf": 1791556200,
    "exp": 1791556260,
    "decision": "Permit",
    "policy_version": "pol_finance_v3.2",
    "obligations": {
      "idempotency_key": "idempotency_7f8a9b1c2d3e",
      "max_amount": 4500.00,
      "currency": "EUR"
    }
  },
  "signature": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk..."
}
```

#### Field Breakdown: EPT Claims

| Claim Name | Data Type | Requirement | Brief Description |
| --- | --- | --- | --- |
| `jti` | String | Mandatory | JWT ID: Unique single-use identifier for the execution permit token. |
| `iss` | String | Mandatory | Issuer: HTTPS URN of the ACC PDP that evaluated and signed the permit. |
| `aud` | String | Mandatory | Audience: Target System URN authorized to accept this token. |
| `sub` | String | Mandatory | Subject: SPIFFE ID of the authorized agent workload. |
| `act.sub` | String | Mandatory | Actor Claim (RFC 8693): Canonical GIAM ID of the human delegator. |
| `req_hash` | String | Mandatory | SHA-256 hash of the canonical Request Envelope, binding decision to exact payload. |
| `iat` / `nbf` / `exp` | Numeric (UNIX) | Mandatory | Issued At, Not Before, Expiration. Defines ultra-short TTL (e.g., 60 seconds). |
| `decision` | String | Mandatory | Formal decision: Must evaluate to `"Permit"`. |
| `obligations` | Object | Optional | Constraints enforced at Target System boundary (e.g., maximum ceiling, idempotency key). |

---

## 6\. Target System Validation Modes

The issuance of the signed **Execution Permit Token (EPT)** allows the Target System to implement flexible validation strategies based on latency requirements and risk profiles:

### A) Decentralized Validation (Offline / Local / JWKS)

The Target System validates the legitimacy of the action locally in memory (**< 1 ms latency**):

1.  Fetches the ACC’s public key from the standard JWKS endpoint (`/.well-known/jwks.json`) and verifies the token's signature.
2.  Calculates the SHA-256 hash of the received transaction body (Request Envelope) and verifies it exactly matches the `req_hash` claim in the EPT.
3.  Verifies temporal validity (`iat ≤ CurrentTime ≤ exp`) considering the ultra-short TTL (e.g., 30-60 seconds).
4.  Verifies the `aud` claim matches its own system identifier.

_Use Case: High-frequency microservices, internal APIs, real-time payment execution. Highly resilient to control-plane network partitions._

### B) Centralized Validation (Online / Introspection / AuthZEN)

The Target System queries the ACC Introspection endpoint or GIAM AuthZEN API (`POST /v1/permits/introspect`) to confirm real-time status (**10 - 50 ms latency**).

1.  The control plane verifies the permit ID (`jti`) against the centralized MongoDB ledger.
2.  Returns `{ "active": true }` if the permit has not been manually revoked or previously consumed.

_Use Case: High-value financial transactions (e.g., >$100k), critical infrastructure configuration changes requiring guaranteed centralized idempotency and instant revocation capabilities._

---

## 7\. Official Standards References & Documentation Links

The ACC Governance Envelope architecture is formally anchored in the following official standards, regulatory frameworks, and specifications:

### 7.1 Identity & Authorization Standards

-   **OpenID AuthZEN 1.0 Implementer's Draft:** [https://openid.net/specs/authorization-api-1\_0-02.html](https://openid.net/specs/authorization-api-1_0-02.html)
-   **OASIS XACML 3.0 JSON Profile v1.1:** [https://docs.oasis-open.org/xacml/xacml-json-http/v1.1/xacml-json-http-v1.1.html](https://docs.oasis-open.org/xacml/xacml-json-http/v1.1/xacml-json-http-v1.1.html)
-   **IETF RFC 8693 - OAuth 2.0 Token Exchange:** [https://datatracker.ietf.org/doc/html/rfc8693](https://datatracker.ietf.org/doc/html/rfc8693)
-   **IETF RFC 7515 - JSON Web Signature (JWS):** [https://datatracker.ietf.org/doc/html/rfc7515](https://datatracker.ietf.org/doc/html/rfc7515)
-   **IETF RFC 8785 - JSON Canonicalization Scheme (JCS):** [https://datatracker.ietf.org/doc/html/rfc8785](https://datatracker.ietf.org/doc/html/rfc8785)
-   **SPIFFE Standards & Workload Identity Overview:** [https://spiffe.io/docs/latest/spiffe-about/overview/](https://spiffe.io/docs/latest/spiffe-about/overview/)

### 7.2 Regulatory Frameworks & Agent Governance Documents

-   **IMDA Model AI Governance Framework (MGF) for Agentic AI:** [https://go.gov.sg/mgfagentic-feedback](https://go.gov.sg/mgfagentic-feedback)
-   **Monetary Authority of Singapore (MAS) / BuildFin.ai SAFR Framework:** [https://www.mas.gov.sg/](https://www.mas.gov.sg/)
-   **NIST NCCoE Software and AI Agent Identity and Authorization Project:** [https://www.nccoe.nist.gov/projects/software-and-ai-agent-identity-and-authorization](https://www.nccoe.nist.gov/projects/software-and-ai-agent-identity-and-authorization)