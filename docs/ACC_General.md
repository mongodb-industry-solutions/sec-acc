# ACC Business Model, Operating Architecture & Internal Component Flows

- **Document Title:** Agent Control Center (ACC) Business Model, Operating Architecture, and Internal Component Flows  
- **Document Version:** 2.6 (Comprehensive Canonical Specification, Process Sequence Diagrams & SAFR 2026 Integration)  
- **Status:** Canonical Reference Architecture  
- **Target Environments:** Regulated Financial Services, Banking, High-Consequence Agentic Workflows

---

## 1. Executive Summary & Purpose

This document defines the formal business model, system ownership boundaries, logical module specifications, and **internal runtime flows** for the **Agent Control Center (ACC)**.

ACC operates as a specialized control plane and runtime enforcement layer for Agentic AI Systems operating in regulated environments. It governs whether a particular agent, acting with a specific identity and authority, may perform a specific action on a protected resource within a specific business context. ACC implements a two-stage evaluation model, coupling deterministic **ABAC/XACML 3.0** authorization (evaluated locally or via standardized **OpenID AuthZEN Architecture** endpoints exposed by GIAM) with domain-specific, non-deterministic **Context Guardrails (MGF / CGS)** without violating system of record boundaries.

### Core Architectural Separation

-   **General Identity and Access Management (GIAM):** System of Record for human, agent, and workload identities, credential issuance, OAuth 2.0/OIDC authentication, RFC 8693 token exchange, delegation chains, baseline access, canonical deterministic policy storage, and standardized **AuthZEN PEP/PDP API endpoints**.
-   **Agent Control Center (ACC):** Control plane for workspace governance, agent onboarding, policy governance workflows, runtime action interception, risk-based disposition, human-in-the-loop (HITL) escalation coordination, and tamper-evident decision auditing.
-   **Context Guardrail Subsystem (MGF / CGS):** Specialized, non-deterministic AI governance engine assessing whether a proposed action makes semantic and contextual sense within a specific business domain.
-   **Agentic Systems & Protected Targets:** Agentic workloads that request per-action execution permits from ACC and execute approved transactions against protected targets, APIs, tools, or Model Context Protocol (MCP) servers.

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                GIAM Ecosystem                                     │
│  - Identity Lifecycle (SCIM)  - Auth / OIDC / mTLS   - Canonical Policy Store     │
│  - Workload ID (SPIFFE/SPIRE) - RFC 8693 Exchange    - AuthZEN PDP Endpoints      │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │ Identity Claims, AuthZEN Evaluation, Tokens
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           Agent Control Center (ACC)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │     PEP      │  │     PIP      │  │     PRP      │  │          PDP          │  │
│  │ Interception │  │ Attributes   │  │ AuthZEN /    │  │ Stage 1: Deterministic│  │
│  │ & Enforce    │  │ & Context    │  │ GIAM Adapter │  │ Stage 2: Contextual   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └───────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │     PAP      │  │     MGF      │  │    Audit     │  │   HITL / Escalation   │  │
│  │ Authoring    │  │ Governance   │  │ Ledger       │  │ Approval Workflows    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └───────────────────────┘  │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │ Evaluates & Issues Execution Permits
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                            Protected Target Systems                               │
│        (Core Banking, Payment Rails, External APIs, MCP Servers, Databases)       │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Expected Business Outcomes

-   Govern agentic systems _before_ they can perform protected autonomous actions.
-   Evaluate identity, delegation, access policy, hard constraints, and business context as distinct inputs.
-   Block prohibited actions and pause reviewable uncertainty without treating uncertainty as implicit permission.
-   Ensure user-interface and headless REST API integrations are subject to equivalent controls.
-   Preserve evidence of the request, policy references, decision rationale, human review, enforcement, and execution outcome.
-   Keep authoritative identity and canonical policy data in GIAM rather than creating competing sources of truth.

---

## 2. Core Concepts & System Ownership Boundaries

### 2.1 Core Concepts Glossary

| Concept | Meaning in the ACC Domain | Authority / Boundary |
| --- | --- | --- |
| **GIAM** | Authoritative source for identity lifecycle, authentication, credentials, token delegation, revocation, baseline access, and canonical deterministic policies. | GIAM-managed. ACC consumes claims and policy decisions through supported APIs without creating a duplicate directory. |
| **Business Workspace** | ACC's logical scope for a business model, organization, environment, and governed agent systems. | ACC-managed; linked to a canonical GIAM organization or tenant identifier. |
| **Agentic System** | A software workload using one or more agents to interpret tasks, make decisions, and interact with tools, APIs, or people. | Onboarded and governed in ACC; its authoritative workload identity is managed by GIAM. |
| **Human Principal** | A person who initiates work, delegates authority, or reviews a pending escalated action. | Identity and reviewer authority are verified through GIAM. |
| **Delegation Chain** | Evidence linking the human principal to the workload acting on that principal's behalf. | GIAM-backed token-exchange contract (RFC 8693). Agents must not impersonate humans. |
| **Policy Profile** | Governed set of deterministic access and action rules applicable to a workspace, identities, resources, and actions. | Canonical record and deterministic evaluation belong to GIAM; ACC/PAP manages workflow and references. |
| **Governance Profile** | ACC's operational grouping of policy references, guardrail configuration, risk classifications, review rules, and agent metadata. | ACC-managed metadata linked to GIAM and CGS references. |
| **Target Resource / Protected Target** | The business object, system, tool, API, database, or MCP server being acted upon (e.g., account, wire transfer endpoint). | Owned by target domain. ACC evaluates the request; the target performs business logic only after permit enforcement. |
| **Action** | A named operation on a resource (e.g., `execute_wire_transfer`) explicit enough to evaluate and enforce. | Defined in governance profiles and enforced at the boundary. |
| **Governance Envelope** | Normalized representation of a proposed action and authorization context, formatted as a XACML 3.0 / AuthZEN request. | Constructed at the PEP boundary and evaluated by ACC PDP. |
| **Attribute** | A fact used during evaluation (identity claims, tenant status, account balances, velocity, risk scores). | Fetched via PIPs; requires trusted source, freshness, and correlation data. |
| **Contextual Assessment** | Non-deterministic assessment from CGS regarding semantic fit, prompt injection risk, anomalies, or business intent. | Supplied by CGS; acts as a PIP attribute in Stage 2 PDP evaluation. Cannot override deterministic denial. |
| **Decision / Disposition** | Per-action disposition result: `ALLOW`, `DENY`, `OBSERVE`, or `ESCALATE`. | Synthesized by ACC PDP based on GIAM, SAFR, and CGS inputs. |
| **Execution Permit** | Short-lived, action-scoped, cryptographically signed proof used by PEP to release one approved operation. | Issued by ACC PDP upon `ALLOW`; single-use, non-reusable, and replay-resistant. |
| **Approval Case & PENDING State** | An escalation workflow case created when disposition is `ESCALATE`. `PENDING` is the operational state while awaiting review. | ACC manages workflow state; reviewer identity/authority is verified through GIAM. Execution remains blocked. |
| **Audit Event** | Traceable record of request context, policy references, decision rationale, reviewer decisions, and execution outcomes. | ACC records tamper-evident evidence without retaining raw secrets or sensitive payload content. |

### 2.2 Conceptual Relationship Architecture

```
┌───────────────┐       ┌────────────────┐       ┌────────────────────┐
│     GIAM      │◄──────┤   Workspace    ├──────►│ Context Guardrail  │
│  (Identity &  │       │  (Governance)  │       │     (CGS / MGF)    │
│    Policy)    │       └───────┬────────┘       └─────────┬──────────┘
└───────┬───────┘               │                          │
        │                       ▼                          │
        │               ┌────────────────┐                 │
        ├──────────────►│ Agentic System ├─────────────────┤
        │               │   (Workload)   │                 │
        │               └───────┬────────┘                 │
┌───────▼───────┐               │                          ▼
│     Human     │               │ (Action Request)  ┌────────────────┐
│   Principal   │               ▼                   │      ACC       │
└───────────────┘       ┌────────────────┐          │ (PDP/PAP/Audit)│
                        │   Enforcement  ├─────────►│                │
                        │     (PEP)      │          └────────┬───────┘
                        └───────┬────────┘                   │
                                │ (Valid Permit)             │
                                ▼                            ▼
                        ┌────────────────┐          ┌────────────────┐
                        │   Protected    │          │  Audit Ledger  │
                        │ Target / Tools │          └────────────────┘
                        └────────────────┘
```

### 2.3 GIAM

GIAM is the authoritative identity system. It manages identity lifecycles for humans, agent workloads, and tools. It provides authentication, mTLS/SPIFFE attestation, token issuance, scope management, and canonical deterministic policy storage. Furthermore, **GIAM exposes standardized OpenID AuthZEN 1.0 endpoints** (e.g., `POST /access/v1/evaluation`), allowing ACC to delegate deterministic policy decisions or query GIAM’s PDP via an interoperable, vendor-neutral REST API protocol.

### 2.4 Context Guardrail Subsystem (MGF / CGS)

A specialized agentic or model-based subsystem designed to evaluate business intent, semantic consistency, indirect prompt injections, and contextual risk (e.g., verifying if a payment order aligns with historical client behavior). The CGS is **not** an identity provider, **not** an access control engine, and **cannot** override a deterministic denial or identity failure. Its output acts strictly as a **Policy Information Point (PIP) attribute** during PDP Stage 2 evaluation.

### 2.5 System Ownership Boundaries

| Concern / Area | System of Record / Authority | ACC Role & Responsibility Boundary |
| --- | --- | --- |
| **Human & Workload Identities** | GIAM (SCIM / OIDC / SPIFFE) | Consumes canonical identifiers (`spiffe://...`, `subject_id`); does not create a parallel identity directory. |
| **Authentication & Delegation** | GIAM (OAuth 2.1, RFC 8693) | Introspects tokens and validates `actor_token` / `subject_token` delegation chains. Never issues competing credentials. |
| **Canonical Deterministic Policies** | GIAM (Exposed via AuthZEN API) | PAP manages authoring workflows; PRP adapts to GIAM Policy APIs / AuthZEN endpoints. ACC maintains no duplicate rule base. |
| **Workspace & Agent Metadata** | ACC | Stores workspace scope, purpose, tool/resource mappings, governance status, and risk metadata linked to GIAM IDs. |
| **Contextual Intent Assessment** | Context Guardrail Subsystem (CGS) | Requests and evaluates non-deterministic assessments separately; records response metadata. CGS cannot grant baseline access. |
| **Per-Action Authorization & Enforcement** | ACC (PDP / PEP) | Evaluates Governance Envelopes, issues ephemeral single-use Execution Permits, and enforces decisions at the boundary. |
| **Business Transaction Execution** | Agentic System & Protected Target | Executes business logic target operations _only_ after PEP permits it; returns execution outcomes for audit correlation. |
| **Human Reviewer Authority** | GIAM | Obtains and verifies reviewer identity and 4-eyes approval authority via GIAM. ACC manages review workflow cases. |

---

## 3. ACC Module Responsibilities & Component Architecture

ACC modules align strictly with the **XACML 3.0 Reference Architecture** (using the _JSON Profile of XACML 3.0_), the **OpenID AuthZEN 1.0 Specification**, and **SAFR (Safeguards for Agentic Finance at Runtime)** runtime standards.
```
                    ┌────────────────────────────────────────┐
                    │     Policy Enforcement Point (PEP)     │
                    │   (Intercepts Action / Builds JSON)    │
                    └───────────────────┬────────────────────┘
                                        │ 1. XACML / AuthZEN Request
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          Policy Decision Point (PDP)                             │
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │ STAGE 1: Short-Circuit Deterministic Evaluation (Low Latency <15ms)      │   │
│   │                                                                          │   │
│   │    [PIP: GIAM Identity]  ──► Token & SPIFFE Validation                   │   │
│   │    [PRP / AuthZEN]       ──► Query GIAM AuthZEN API (or local XACML)     │   │
│   └──────────────────────────────────┬───────────────────────────────────────┘   │
│                                      │                                           │
│                     Stage 1 Result:  │                                           │
│                 ┌────────────────────┴────────────────────┐                      │
│                 │                                         │                      │
│         DENY / ESCALATE                            ALLOW Prelim                  │
│                 │                                         │                      │
│                 ▼                                         ▼                      │
│       [Return Final Decision]         ┌──────────────────────────────────────┐   │
│       (Skip Stage 2 CGS Call)         │ STAGE 2: Contextual Guardrail Check  │   │
│                                       │ (High Cost / Deep Context Inspection)│   │
│                                       │                                      │   │
│                                       │ [PIP: CGS/MGF Engine] ──► Risk Score │   │
│                                       └───────────────────┬──────────────────┘   │
│                                                           │                      │
└───────────────────────────────────────────────────────────┼──────────────────────┘
                                                            │
                                                            ▼
                                                 [Synthesize Final Response]
                                                (Permit / Deny / Indeterminate)
```

### 3.1 ACC Module Responsibilities Breakdown

| Module Name | Core Responsibility | Key Operational Constraints & Boundaries |
| --- | --- | --- |
| **PEP (Policy Enforcement Point)** | Intercepts calls at SDKs, gateways, MCP proxies, or API boundaries. Builds Governance Envelope requests and enforces final decisions. | Sits at the actual execution boundary. Blocks by default. Requires a valid permit before releasing call. Never reuses approval across actions. |
| **PIP (Policy Information Point)** | Fetches dynamic attributes (GIAM identity claims, SAFR account balances, spending velocity, CGS risk scores). | Tracks attribute source, freshness, and correlation data. Does not duplicate GIAM directory. CGS signal is an attribute, not identity proof. |
| **PRP (Policy Retrieval Point)** | Adapter layer communicating with GIAM AuthZEN endpoints (e.g., `POST /access/v1/evaluation`) or retrieving active XACML policies. | Not an independent policy database or duplicate rule evaluator. Caching must follow strict GIAM versioning and invalidation hooks. |
| **PDP (Policy Decision Point)** | Orchestrates 2-stage decision evaluation, combines deterministic checks and contextual risk signals into an ACC disposition. | Does not delegate final decision to generative models. Preserves separation between deterministic rules and non-deterministic CGS signals. |
| **PAP (Policy Administration Point)** | Provides policy authoring, review, governance, and submission workflows in ACC. | Registers approved canonical policy changes through GIAM services. ACC stores workflow evidence, not a competing rule store. |
| **MGF & Audit Module** | Connects agent lifecycle governance (MGF) and records tamper-evident, correlated decision and enforcement provenance. | Preserves non-repudiable audit trails while minimizing raw secrets, tokens, prompts, or sensitive payloads. |

---

## 4. Two-Stage PDP Decision Engine & Truth Table

### 4.1 How an ACC Action Decision Works

The runtime evaluation strictly separates deterministic authorization from contextual assessment in four sequential steps:

1.  **GIAM Identity & Delegation Check (Deterministic):** Confirms caller workload identity, token validity, audience, expiration, SPIFFE attestation, and RFC 8693 delegation chains.
2.  **Deterministic Policy & Hard Constraint Check (Deterministic):** Evaluates canonical ABAC/XACML policies via GIAM AuthZEN endpoints and validates SAFR hard financial limits (e.g., max daily transaction ceiling, account limits).
3.  **Contextual Intent Verification (Non-Deterministic):** If and only if Stage 1 yields a preliminary permit, PDP queries the CGS PIP to assess semantic consistency, prompt injection risk, and domain anomalies.
4.  **ACC Disposition Synthesis & Enforcement:** PDP translates evaluation outputs into an ACC disposition (`ALLOW`, `DENY`, `OBSERVE`, `ESCALATE`) and issues a single-use Execution Permit if approved. PEP enforces the decision at the boundary.

### 4.2 Truth Table (PDP Disposition Logic)

| GIAM Identity & Token | PRP / AuthZEN Policy | SAFR Hard Limits | CGS / MGF Result | XACML / AuthZEN Decision | ACC Disposition | PEP Execution Action |
| --- | --- | --- | --- | --- | --- | --- |
| **Invalid / Revoked** | Any | Any | _Not Evaluated_ | `Deny` / `false` | `DENY` | Hard Block. Generic auth error returned. |
| Valid | **Expired / Missing** | Any | _Not Evaluated_ | `Deny` / `false` | `DENY` | Hard Block (Fail Closed). |
| Valid | Active (Permit) | **Breached** (e.g., >$10k) | _Not Evaluated_ | `Deny` / `false` | `DENY` | Hard Block. Limit violation audited. |
| Valid | Active (Permit) | Pass (Requires HITL) | _Not Evaluated_ | `Indeterminate` | `ESCALATE` | Pause execution. Ticket set to `PENDING` in HITL queue. |
| Valid | Active (Permit) | Pass | **`DENY`** (Insecure) | `Deny` / `false` | `DENY` | Hard Block. Contextual threat detected. |
| Valid | Active (Permit) | Pass | **`WARNING`** / Anomaly | `Indeterminate` | `ESCALATE` | Pause execution. Ticket set to `PENDING` in HITL queue. |
| Valid | Active (Permit) | Pass | **`ALLOW`** | `Permit` / `true` | `ALLOW` | Issue Single-Use Execution Permit. |
| Valid | Active (Permit) | Pass | **`ALLOW`** (New Pattern) | `Permit` (+Obligation) | `OBSERVE` | Issue Permit + enforce detailed telemetry logging. |

---

## 5. Detailed Internal Component Flows & Business Processes

**Architectural Distinction (ESCALATE vs. PENDING):**  
In ACC, `ESCALATE` is the official decision disposition returned by the PDP when policy rules or guardrails require human intervention (mapping to `Decision: "Indeterminate"` in XACML/AuthZEN). `PENDING` is **not** a decision code or SAFR framework state; it is strictly the _operational lifecycle state_ of a transaction ticket paused in the HITL review queue while awaiting human reviewer resolution.

### 5.1 Step-by-Step Internal Execution Protocol

1.  **Interception:** The Agentic System invokes a tool/API. The **PEP Gateway** intercepts the call at the boundary.
2.  **Envelope Construction:** PEP converts the request into a Governance Envelope formatted as a XACML 3.0 JSON or AuthZEN REST payload containing subject, resource, action, and context attributes.
3.  **Identity & Context Enrichment:** PDP queries **PIP (GIAM)** to validate OAuth claims, RFC 8693 `actor_token` / `subject_token` delegation integrity, and SPIFFE workload attestation.
4.  **Policy Retrieval / AuthZEN Call:** PDP queries **PRP / GIAM AuthZEN API** (`POST /access/v1/evaluation`). GIAM evaluates canonical deterministic rules and returns a structured decision.
5.  **Stage 1 Evaluation:** PDP combines GIAM AuthZEN output with SAFR hard financial limits and velocity rules.
    -   _Branch A (Stage 1 Fail):_ PDP generates `Decision: "Deny"`, writes an audit event to the Ledger, and returns a `DENY` disposition to the PEP. **Execution terminates (<15ms).**
    -   _Branch B (Stage 1 Escalate):_ PDP generates `Decision: "Indeterminate"`, maps this to an **`ESCALATE`** disposition, creates a HITL ticket, writes an audit event, and returns a **`PENDING`** operational state to the PEP. **Execution halts awaiting human review.**
    -   _Branch C (Stage 1 Pass):_ PDP advances to Stage 2 contextual evaluation.
6.  **Stage 2 Evaluation:** PDP queries **PIP (CGS)**, passing action parameters and reasoning traces. CGS runs semantic validation, prompt injection analysis, and context anomaly scoring. Returns a `contextRiskScore`.
7.  **Final Synthesis:** PDP combines Stage 1 and Stage 2 outputs:
    -   If CGS passes → `Decision: "Permit"`. PDP signs a single-use Execution Permit containing `nonce`, `hash(params)`, `expiry`, and `policy_version`.
    -   If CGS fails → `Decision: "Deny"` (`DENY` disposition).
    -   If CGS flags a warning → `Decision: "Indeterminate"` (`ESCALATE` disposition → `PENDING` operational state).
8.  **Audit Logging:** PDP asynchronously writes complete decision provenance and evaluation traces to the **Audit Ledger**.
9.  **Enforcement:** PEP receives response. If `Permit`, PEP appends the signed Execution Permit header and routes call to Protected Target. If `Deny` or `Pending`, PEP firmly blocks call.

### 5.2 Sequence Diagrams for Core Business Processes

#### Process P1: Configure a Business Workspace

```
Admin / Operator        ACC PAP            GIAM Services         CGS Engine         Audit Ledger
       │                   │                     │                   │                   │
       │─1. Create WS─────►│                     │                   │                   │
       │   + Tenant Ref    │─2. Enroll WS Tenant►│                   │                   │
       │                   │◄──3. Tenant Linked──│                   │                   │
       │                   │                     │                   │                   │
       │─4. Register Agent►│                     │                   │                   │
       │   + Purpose/Tools │─5. Provision ID────►│                   │                   │
       │                   │◄──6. SPIFFE ID──────│                   │                   │
       │                   │                     │                   │                   │
       │─7. Author Policy─►│                     │                   │                   │
       │   Profiles        │─8. Submit Canon.───►│                   │                   │
       │                   │    Policy Profile   │                   │                   │
       │                   │◄──9. Ack Registered─│                   │                   │
       │                   │                     │                   │                   │
       │─10. Config CGS───►│────────────────────────────────────────►│                   │
       │    Guardrails     │◄────────────────────────────────────────│                   │
       │                   │                                         │                   │
       │─11. Activate WS──►│──12. Log Workspace Config Event────────────────────────────►│
       │    (Set READY)    │◄──13. Audit Ack─────────────────────────────────────────────│
```
#### Process P2: Successful Authorization & Execution

```
Agentic System     PEP Gateway       PDP Engine       PIP / GIAM       CGS Engine     Protected Target    Audit Ledger
      │                 │                 │                │               │                 │                 │
      │─1. Tool Call───►│                 │                │               │                 │                 │
      │   + OAuth Token │─2. Build Env.──►│                │               │                 │                 │
      │                 │                 │─3. Check Identity─────────────►│                 │                 │
      │                 │                 │    & AuthZEN Stage 1           │                 │                 │
      │                 │                 │◄──4. Stage 1 ALLOW─────────────│                 │                 │
      │                 │                 │                │               │                 │                 │
      │                 │                 │─5. Stage 2 Context Check──────►│                 │                 │
      │                 │                 │◄──6. Risk Score ALLOW──────────│                 │                 │
      │                 │                 │                                │                 │                 │
      │                 │                 │─7. Synthesize ALLOW + Sign Permit ───────────────┼────────────────►│
      │                 │◄─8. Permit Disp.│                                                  │ 8b. Log Permit  │
      │                 │    + Signed Pmt │                                                  │     Event       │
      │                 │                 │                                                  │                 │
      │                 │─9. Execute Call + Signed Execution Permit─────────────────────────►│                 │
      │                 │◄─10. Return Business Execution Outcome─────────────────────────────│                 │
      │◄─11. Result─────│                                                                                      │
```

#### Process P3: Denied Authorization

```
Agentic System     PEP Gateway       PDP Engine       PIP / GIAM       CGS Engine     Protected Target    Audit Ledger
      │                 │                 │                │               │                 │                 │
      │─1. Tool Call───►│                 │                │               │                 │                 │
      │   + OAuth Token │─2. Build Env.──►│                │               │                 │                 │
      │                 │                 │─3. Check Identity─────────────►│                 │                 │
      │                 │                 │    & AuthZEN Stage 1           │                 │                 │
      │                 │                 │                                │                 │                 │
      │                 │                 ├── [BRANCH A: Identity/Policy Fail/Limit Breached]┼────────────────►│
      │                 │                 │   (Stage 2 Bypassed completely)                  │ 4a. Log DENY    │
      │                 │                 │                                                  │                 │
      │                 │                 ├── [BRANCH B: Stage 1 Passes, Stage 2 CGS DENY]───┼────────────────►│
      │                 │                 │   (Threat / Injection Detected)                  │ 4b. Log DENY    │
      │                 │                 │                                                  │                 │
      │                 │◄─5. Return DENY │                                                  │                 │
      │                 │    (No Permit)  │                                                  │                 │
      │                 │                                                                    │                 │
      │                 │─6. PEP Hard Blocks Request (Target Call Bypassed) ─────────────────X                 │
      │◄─7. Error Res.──│    (Generic non-sensitive auth error returned)                                       │
```

#### Process P4: Warning Escalation and Human Review (HITL)

```
Agentic System     PEP Gateway       PDP Engine       HITL Queue       GIAM Auth       Human Reviewer     Audit Ledger
      │                 │                 │                │               │                 │                 │
      │─1. Tool Call───►│                 │                │               │                 │                 │
      │                 │─2. Build Env.──►│                │               │                 │                 │
      │                 │                 │─3. Evaluate────│               │                 │                 │
      │                 │                 │    (Warning / Anomaly)         │                 │                 │
      │                 │                 │                │               │                 │                 │
      │                 │                 │─4. Disp: ESCALATE (Create Ticket, state: PENDING)─────────────────►│
      │                 │◄─5. PENDING─────│                                                  │ 4b. Log Escalation
      │                 │    (Pause Exec) │                                                  │                 │
      │                 │                 │                                                  │                 │
      │                 │                 │                │◄──6. Fetch Pending Ticket───────│                 │
      │                 │                 │                │─7. Authenticate & Verify Auth──►│                 │
      │                 │                 │                │◄──8. Reviewer Validated─────────│                 │
      │                 │                 │                │                                 │                 │
      │                 │                 │                │◄──9. Submit Review Decision─────│                 │
      │                 │                 │                │    (APPROVE or REJECT)          │                 │
      │                 │                 │                │                                 │                 │
      │                 │                 │◄─10. Revalidate current Policy/State             │                 │
      │                 │                 │                                                  │                 │
      │                 │                 ├── [IF APPROVED] ─────────────────────────────────┼────────────────►│
      │                 │◄─11a. ALLOW─────│   Issue Single-Use Execution Permit              │ 12a. Audit Appr.│
      │                 │─12a. Forward Target Call + Signed Permit ────────────────────────► │                 │
      │                 │                 │                                                  │                 │
      │                 │                 └── [IF REJECTED / EXPIRED] ───────────────────────┼────────────────►│
      │                 │◄─11b. DENY──────│   Hard Block Request                             │ 12b. Audit Rej. │
      │◄─13. Outcome────│─12b. Return Final Error ───────────────────────────────────────────┘                 │
```

### 5.3 Core Business Processes Detailed Descriptions

#### P1. Configure a Business Workspace

1.  Create the workspace in ACC and link it to the canonical GIAM organization or tenant.
2.  Register each Agentic System in ACC with its purpose, owner, environment, agents, tools/resources, and risk/governance metadata.
3.  Enroll the system in GIAM so GIAM provisions and governs its authoritative workload identity and credentials.
4.  Define applicable policy and governance profiles. Review and approve policy changes through ACC/PAP.
5.  Submit approved canonical policy changes through GIAM services and retain references and workflow evidence in ACC.
6.  Configure and review the required CGS profile and integration.
7.  Mark the workspace ready for protected autonomous actions only when required identity references, policy enrollment, guardrail configuration, and approvals are complete and auditable.

#### P2. Successful Authorization and Execution

1.  The agentic workload requests an access token from GIAM.
2.  It submits an action/resource request and token to the ACC API or PEP.
3.  The PEP intercepts the call; ACC validates identity, claims, delegation, and token state with GIAM.
4.  ACC obtains the deterministic policy result and evaluates required hard constraints.
5.  If Stage 1 permits, ACC obtains contextual assessment (CGS) when required by the active profile.
6.  If all required checks permit, ACC returns the `ALLOW` disposition and permit information; the PEP enforces it at the target boundary.
7.  The agentic workload executes the transaction. ACC correlates and records the decision and execution outcome.

#### P3. Denied Authorization

1.  Follow P2 through the required checks.
2.  If GIAM rejects identity/token validation, deterministic policy denies, a hard constraint is breached, or CGS returns a definitive denial, ACC returns a `DENY` disposition.
3.  PEP blocks execution and issues no usable execution permit.
4.  ACC records non-sensitive reason codes and relevant policy/profile references. The Agentic System communicates an appropriate, non-sensitive outcome to the initiating user or system.
5.  _A definitive denial is not converted into an approval through the normal HITL path._

#### P4. Warning Escalation and Human Review (HITL)

1.  Follow P2 until a required check returns a warning or indeterminate result that policy explicitly allows to be reviewed.
2.  ACC creates or links an approval case (triggering the `ESCALATE` disposition) and sets the ticket to `PENDING` operational state; PEP blocks execution.
3.  A human reviewer acts through the ACC UI or supported REST API. The agent may relay a human decision only when human identity and authority are verifiable.
4.  ACC verifies the reviewer's identity and authority through GIAM and binds the decision to the pending request.
5.  Before execution, ACC revalidates the request and current identity/policy state, and refreshes contextual evidence where required.
6.  Human denial blocks execution. Expiry, cancellation, or changed request data cannot resume automatically. All outcomes are audited.

#### 5.4 UI, API, and Headless Operation

The ACC UI is a client of the backend REST API; it is not a separate authority or a privileged bypass. Every supported business operation available in the UI must also be available through the backend REST API. HITL decisions and governance workflows must be callable through REST APIs so agentic solutions can integrate headlessly. All callers remain subject to identical identity, authorization, policy, audit, and enforcement controls.

#### 5.5 Lifecycle State Diagram

```
[Draft] ──► [Configuring] ──► [Governed] ──► [Ready]
                                                │
                                                ▼
                ┌──────────────────────── [Evaluating] ────────────────────────┐
                │  (Protected action intercepted by PEP)                       │
                │                                                              │
                │ ├─► [Permitted] ───────────────► [Executed]                  │
                │ │   (All checks pass)            (PEP releases to target)    │
                │ │                                                            │
                │ ├─► [Denied] ──────────────────► (End / Blocked)             │
                │ │   (Hard denial or failure)                                 │
                │ │                                                            │
                │ └─► [Pending Review] ─┬─► (Human Approval) ────► [Reval.] ─┐ │
                │     (ACC Oper. State) │                                    │ │
                │                       └─► (Human Denial) ──────► [Denied]  │ │
                │                                                            │ │
                │         ┌──────────────────────────────────────────────────┘ │
                │         │                                                    │
                │         └─► [Permitted] ──► [Executed]                       │
                └──────────────────────────────────────────────────────────────┘
``` 
---

## 6. Data Contracts & Payload Specifications

### 6.1 Governance Envelope Data Contract

| Envelope Area | Example Information Elements | Handling Principle |
| --- | --- | --- |
| **Request Identity** | Request ID, correlation ID, idempotency key, timestamp. | Unique enough to bind evaluation, review, permit, and execution evidence. |
| **Subject & Actor** | Workload identity (SPIFFE), delegating user ID, RFC 8693 token chain. | Validate through GIAM. Do not retain raw tokens in audit records. |
| **Action & Target** | Action name (e.g., `execute_wire_transfer`), target URI, parameter hash. | Must express actual operation; bind permit to evaluated parameters. |
| **Workspace & Profile** | Workspace ID, GIAM tenant reference, policy & governance profile IDs. | ACC identifiers must not impersonate GIAM identity or policy identifiers. |
| **Context Attributes** | Account balance, velocity, counterparty risk, CGS risk score. | Record source, freshness, and correlation metadata for dynamic attributes. |

### 6.2 OpenID AuthZEN 1.0 Evaluation Request Payload (PDP → GIAM AuthZEN API)

```
{
  "subject": {
    "type": "agent",
    "id": "spiffe://prod.leafypay.com/ns/finance/sa/payment-agent-v2",
    "identity": {
      "delegating_user": "usr_9928310a",
      "rfc8693_actor_token": "eyJhbGciOiJSUzI1NiIs..."
    }
  },
  "action": {
    "name": "execute_wire_transfer"
  },
  "resource": {
    "type": "account",
    "id": "urn:leafypay:account:acc_8817263",
    "properties": {
      "transaction_amount": 4500.00,
      "currency": "EUR"
    }
  },
  "context": {
    "workspace_id": "ws_emea_retail_01",
    "idempotency_key": "idempotency_7f8a9b1c2d3e"
  }
}
```

### 6.3 OpenID AuthZEN 1.0 Evaluation Response Payload (GIAM AuthZEN API → PDP)

```
{
  "decision": true,
  "context": {
    "policy_id": "pol_finance_transfers_v3.2",
    "reason_admin": "Subject holds wire transfer scope and user delegation is valid.",
    "obligations": [
      {
        "id": "urn:acc:obligation:enforce-safr-velocity-limit",
        "params": {
          "max_daily_ceiling": 10000.00
        }
      }
    ]
  }
}
```

---

## 7. Essential Business Rules & Operational Invariants

1.  **GIAM & AuthZEN Authority:** GIAM is the sole authority for identities, credentials, tokens, delegation, revocation, baseline access, and canonical deterministic policies. GIAM exposes AuthZEN endpoints for standard authorization evaluation. ACC does not create parallel user directories or token issuers.
2.  **No Duplicate Policy Evaluator:** ACC manages policy governance workflows (PAP) but submits approved policy changes through GIAM services. PRP is an adapter to GIAM APIs, not a repository or local copy of GIAM rules.
3.  **Strict Two-Stage Evaluation:** PDP must perform Stage 1 deterministic evaluations (via GIAM AuthZEN / SAFR) before Stage 2 CGS calls. Stage 2 must be bypassed on Stage 1 failure to minimize latencies and compute costs.
4.  **Fail-Closed Default:** Any system failure, API timeout, unhandled exception, missing policy, or stale attribute state in PDP/PEP/AuthZEN must result in an immediate `DENY` (`Decision: "Deny"` / `decision: false`).
5.  **Single-Use Execution Permits:** A successful ACC evaluation produces an ephemeral, cryptographically signed permit bound to `hash(parameters)`, target audience, and explicit expiry TTL. Permits cannot be reused, transferred, or applied to replay transactions.
6.  **Non-Repudiable Delegation:** All agent requests executed on behalf of humans must present an RFC 8693 token exchange chain containing both `subject_token` (human principal) and `actor_token` (acting agent workload).
7.  **Non-Deterministic Boundary Constraint:** CGS outputs are advisory risk signals evaluated as XACML/AuthZEN PIP attributes. CGS can trigger a `DENY` or `ESCALATE`, but can **never** override a deterministic identity denial or policy rejection.
8.  **Block Execution Default:** Both `DENY` and `PENDING` block execution. Neither is an allow.
9.  **Action Independence:** Evaluate each action independently. Prior approval does not automatically authorize a later action, a different resource, or another agent.
10.  **Complete API-UI Parity:** Every business operation supported in the ACC UI must be exposed via headless REST APIs enforcing identical identity, policy, audit, and enforcement controls.
11.  **Data Minimization in Audit:** Audit preserves decision provenance and traceability without unnecessarily retaining tokens, credentials, prompts, or sensitive business payloads.

A2A_Published = GIAM_Active ∧ ACC_Onboarding_Approved ∧ Runtime_Attested ∧ Endpoint_Healthy

---

## 8. Referencias Bibliográficas y Estándares

La elaboración de esta arquitectura formal de referencia se fundamenta en los siguientes marcos normativos, estándares y especificaciones de la industria:

| Estándar / Marco | Rol en la Arquitectura ACC | Enlace de Referencia Oficial |
| --- | --- | --- |
| **OpenID AuthZEN 1.0** | API estandarizada REST para delegación de evaluación de autorización interoperable entre ACC PDP y GIAM. | [OpenID AuthZEN Authorization API Implementer's Draft](https://openid.net/specs/authorization-api-1_0-02.html) |
| **OASIS XACML 3.0 (JSON Profile)** | Perfil estructurado JSON para el intercambio de solicitudes, atributos PIP y respuestas de decisiones (Permit/Deny/Indeterminate). | [OASIS JSON Profile of XACML 3.0 Version 1.1](https://docs.oasis-open.org/xacml/xacml-json-http/v1.1/xacml-json-http-v1.1.html) |
| **RFC 8693 (OAuth 2.0 Token Exchange)** | Protocolo estándar para validar cadenas de delegación no repudiables entre el usuario humano delegante y el agente actuante. | [RFC 8693 - OAuth 2.0 Token Exchange](https://www.rfc-editor.org/rfc/rfc8693.html) |
| **SAFR Framework (MAS 2026)** | Safeguards for Agentic Finance at Runtime. Marco regulatorio para salvaguardas y límites duros financieros en tiempo de ejecución. | [MAS - Safeguards for Agentic Finance at Runtime (SAFR 2026)](https://www.mas.gov.sg/publications/monographs-or-information-paper/2026/safeguards-for-agentic-finance-at-runtime) |
| **SPIFFE / SPIRE** | Estándar de atestación criptográfica e identidad de cargas de trabajo (Workload Identities) en entornos de ejecución. | [SPIFFE Identity Standard](https://spiffe.io/docs/latest/spiffe-about/overview/) |
| **Model Context Protocol (MCP)** | Protocolo de comunicación e intercepción para herramientas y servidores donde opera el punto de enforzamiento (PEP). | [Model Context Protocol Specification](https://modelcontextprotocol.io/) |