# ACC Business Model, Operating Architecture & Internal Component Flows

- **Document Title:** Agent Control Center (ACC) Business Model, Operating Architecture, and Internal Component Flows  
- **Document Version:** 2.7 (Labelled Relationship Model, Deterministic vs Contextual Rule Specification, Comparable Systems Study)  
- **Status:** Canonical Reference Architecture  
- **Target Environments:** Regulated Financial Services, Banking, High-Consequence Agentic Workflows

---

## 1. Executive Summary & Purpose

This document defines the formal business model, system ownership boundaries, logical module specifications, and **internal runtime flows** for the **Agent Control Center (ACC)**.

ACC operates as a specialized control plane and runtime enforcement layer for Agentic Artificial Intelligence (AI) Systems operating in regulated environments. It governs whether a particular agent, acting with a specific identity and authority, may perform a specific action on a protected resource within a specific business context. ACC implements a two-stage evaluation model, coupling deterministic **Attribute-Based Access Control (ABAC) / eXtensible Access Control Markup Language (XACML) 3.0** authorization (evaluated locally or via standardized **OpenID AuthZEN Architecture** endpoints exposed by the General Identity and Access Management system, GIAM) with domain-specific, non-deterministic **Context Guardrails (Model AI Governance Framework, MGF, and Context Guardrail Subsystem, CGS)** without violating system of record boundaries.

### Core Architectural Separation

-   **General Identity and Access Management (GIAM):** System of Record for human, agent, and workload identities, credential issuance, Open Authorization (OAuth) 2.0 / OpenID Connect (OIDC) authentication, Request for Comments (RFC) 8693 token exchange, delegation chains, baseline access, canonical deterministic policy storage, and standardized **AuthZEN Policy Enforcement Point / Policy Decision Point (PEP/PDP) Application Programming Interface (API) endpoints**.
-   **Agent Control Center (ACC):** Control plane for workspace governance, agent onboarding, policy governance workflows, runtime action interception, risk-based disposition, human-in-the-loop (HITL) escalation coordination, and tamper-evident decision auditing.
-   **Context Guardrail Subsystem (MGF / CGS):** Specialized, non-deterministic AI governance engine assessing whether a proposed action makes semantic and contextual sense within a specific business domain.
-   **Agentic Systems & Protected Targets:** Agentic workloads that request per-action execution permits from ACC and execute approved transactions against protected targets, APIs, tools, or Model Context Protocol (MCP) servers.

Diagram key: SCIM is the System for Cross-domain Identity Management; mTLS is mutual Transport Layer Security; SPIFFE is the Secure Production Identity Framework for Everyone and SPIRE its SPIFFE Runtime Environment; PEP is the Policy Enforcement Point, PIP the Policy Information Point, PRP the Policy Retrieval Point, PDP the Policy Decision Point and PAP the Policy Administration Point; HITL is human-in-the-loop; ID is identity.

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
-   Ensure user-interface and headless Representational State Transfer (REST) API integrations are subject to equivalent controls.
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
| **Decision / Disposition** | Per-action disposition result: `ALLOW`, `DENY`, `OBSERVE`, or `ESCALATE`. | Synthesized by ACC PDP based on GIAM, Safeguards for Agentic Finance at Runtime (SAFR), and CGS inputs. |
| **Execution Permit** | Short-lived, action-scoped, cryptographically signed proof used by PEP to release one approved operation. | Issued by ACC PDP upon `ALLOW`; single-use, non-reusable, and replay-resistant. |
| **Approval Case & PENDING State** | An escalation workflow case created when disposition is `ESCALATE`. `PENDING` is the operational state while awaiting review. | ACC manages workflow state; reviewer identity/authority is verified through GIAM. Execution remains blocked. |
| **Audit Event** | Traceable record of request context, policy references, decision rationale, reviewer decisions, and execution outcomes. | ACC records tamper-evident evidence without retaining raw secrets or sensitive payload content. |

### 2.2 Conceptual Relationship Architecture

Each edge below is labelled with what actually travels along it. The upper half is **design time** (what an operator configures once, process P1); PSP stands for Payment Service Provider; the lower half is **run time** (what happens per intercepted action, processes P2 to P4).

```
                                      ┌─────────────────────────┐
                                      │   Business Workspace    │
                                      │  governance scope and   │
                                      │   profile authoring     │
                                      └──┬──────────┬────────┬──┘
        links the GIAM tenant and        │          │        │    configures the guardrail
        submits approved policy          │          │        │    profile, thresholds and
        profiles through the PAP         │          │        │    review rules
           ┌─────────────────────────────┘          │        └───────────────────────┐
           │                                        │                                │
           ▼                                        │ onboards the agent,            ▼
 ┌─────────────────────────┐                        │ declares its tools   ┌─────────────────────────┐
 │          GIAM           │                        │ and risk class       │    Context Guardrail    │
 │  Identity, delegation,  │                        │                      │       (CGS / MGF)       │
 │  tokens, canonical      │                        ▼                      │  Semantic intent,       │
 │  deterministic policy,  │            ┌─────────────────────────┐        │  anomaly and injection  │
 │  AuthZEN PDP            │            │     Agentic System      │        │  assessment             │
 └──┬──────────────────┬───┘            │       (Workload)        │        └─────────────────────────┘
    │                  │ issues the     │                         │
    │ authenticates    │ workload       │                         │
    │ the person,      │ identity and   │                         │
    │ verifies review  │ delegated token│                         │
    │ authority        └───────────────►│                         │
    ▼                                   │                         │
 ┌─────────────────────┐  delegates     │                         │
 │   Human Principal   │  authority for │                         │
 │   initiates work,   │  a bounded task│                         │
 │   reviews pending   ├───────────────►│                         │
 │   escalations       │  (RFC 8693)    │                         │
 └─────────────────────┘                └────────────┬────────────┘
                                                     │ proposes a protected action
                                                     │ (tool call, PSP payment)
                                                     ▼
                                        ┌─────────────────────────┐   releases the approved
                                        │    Enforcement (PEP)    │   call, carrying a single
                                        │  intercepts at the real ├───use execution permit───┐
                                        │  execution boundary     │                          │
                                        └──┬───────────────────▲──┘                          │
                            governance     │                   │  disposition and            │
                            envelope       │                   │  single-use permit          │
                            (subject,      │                   │  or a hard block            ▼
                            action,        ▼                   │                ┌─────────────────────┐
                            resource,  ┌─────────────────────────┐              │  Protected Target   │
                            context)   │    ACC Control Plane    │              │  PSP API, core      │
   from GIAM, Stage 1:                 │     PDP / PAP / Audit   │              │  banking, MCP tools │
   deterministic decision ────────────►│                         │              └─────────────────────┘
   obligations and claims              │                         │
                                       │                         │      writes correlated
   from CGS, Stage 2:                  │                         ├─────decision provenance──┐
   contextual risk score ─────────────►│                         │      and evidence        │
   as a PIP attribute                  └─────────────────────────┘                          ▼
                                                                                ┌─────────────────────┐
                                                                                │    Audit Ledger     │
                                                                                │  tamper-evident,    │
                                                                                │  correlated records │
                                                                                └─────────────────────┘
```

### 2.3 GIAM

GIAM is the authoritative identity system. It manages identity lifecycles for humans, agent workloads, and tools. It provides authentication, mTLS/SPIFFE attestation, token issuance, scope management, and canonical deterministic policy storage. Furthermore, **GIAM exposes standardized OpenID AuthZEN 1.0 endpoints** (e.g., `POST /access/v1/evaluation`), allowing ACC to delegate deterministic policy decisions or query GIAM’s PDP via an interoperable, vendor-neutral REST API protocol.

Everything GIAM decides is **deterministic**: the same request against the same policy version returns the same answer, and the answer can be re-derived from written rules during an audit. This property is what makes GIAM the authoritative half of the two-stage model, and it is the reason the non-deterministic assessment in 2.4 is kept strictly outside it.

#### 2.3.1 Structure of a Deterministic Rule

A canonical policy is one flat record with one effect. Two rules are two policies, so each is separately versionable and separately approvable.

| Field | Meaning | Notes |
| --- | --- | --- |
| `policyId`, `name`, `version` | Identity of the rule. `version` is numeric so it compares and increments correctly. | The deciding version is carried into the decision and into audit. |
| `status` | `draft`, `active` or `retired`. Only `active` is evaluated. | Replaces an enabled flag; a retired rule stays readable as evidence. |
| `effectiveFrom` | Date the rule starts deciding. | A rule approved today for next Monday decides nothing today. |
| `effect` | `allow` or `deny`. | There is no conditional or partial effect. |
| `resource` | Selector naming what the rule governs, by `ids` or by `pattern`. | `ids` is an indexed membership test; `pattern` is a linear-time regular expression. `ids` wins when both are present. |
| `permission` | Selector over `resource:action` strings. | The single spelling shared by roles, entitlements and policies. |
| `role` | Roles whose currently expanded permissions are folded into this rule. | Provenance for building a permission set, re-resolved when a role changes shape. |
| `principal` | Selector naming who the rule governs. | Absent matches anyone. |
| `resolvedPermissions` | Flat, pre-resolved union of `permission` and every permission the named roles grant. | Resolved at save time, never mid-decision, so the decision path takes no extra read. |
| `conditions` | Identity-context predicates. **All** must hold. | Closed vocabulary, see 2.3.2. An empty list is a rule with no conditions, not a rule that never applies. |
| `obligations` | What the enforcing side must do when the rule allows. | Carried, not executed by GIAM. ACC is what can actually enforce them. |
| `approvedBy`, `reason` | Governance and explainability. | A decision an audit log cannot explain is not auditable. |

#### 2.3.2 The Closed Condition Vocabulary and the Materiality Boundary

Conditions are deliberately a small, closed set covering **identity context only**:

| Condition | Asks |
| --- | --- |
| `assuranceAtLeast` | Authentication strength reached (`aal1`, `aal2`, `aal3`). |
| `ipInRange` | Network origin matches an allowed prefix. |
| `timeOfDayUtc` | The request falls inside a permitted Coordinated Universal Time (UTC) window (wraps midnight). |
| `tenantIs` | The request belongs to a named tenant. |
| `attestationRequired` | The workload is cryptographically attested (SPIFFE/SPIRE). |
| `heldRole` | The subject holds **at least one** of the named roles. |
| `heldPermission` | The subject holds **every** one of the named permissions. |

The vocabulary is closed on purpose. An open expression language here would let an identity rule express a business rule, and that line must not blur. Therefore:

> **A canonical GIAM policy never names an amount, a balance, a velocity window or any other business threshold.** That judgement belongs to the system that can observe the business inputs. An identity authority making it would be answering a question whose inputs it cannot see.

This is the most frequently misread part of the architecture, so it is stated explicitly: *deterministic* and *owned by GIAM* are not synonyms. Hard financial limits are deterministic too, and they are evaluated by ACC, not by GIAM. They reach the decision through two supported channels:

1. **Bound into the credential.** An RFC 9396 `authorization_details` entry constrains what the token itself may authorize (for example a per-transaction ceiling). A resource server that does not recognise the constraint type must refuse the token rather than ignore it, so a ceiling can never be silently dropped.
2. **Carried as an obligation.** GIAM returns an obligation such as `urn:acc:obligation:enforce-safr-velocity-limit` alongside a permit. GIAM states the duty; ACC's PDP enforces it in Stage 1 against PIP attributes (balance, daily aggregate, velocity) and denies when the limit is breached.

#### 2.3.3 Design Time and Run Time

The split that resolves most confusion about PRP and PDP:

- **Design time (P1).** A business domain specialist authors rules through the ACC PAP. On approval, ACC submits them to GIAM, where each rule is stored **bound to the resources and permissions it governs**. ACC keeps the workflow evidence and the reference, not a copy of the rule.
- **Run time (P2 to P4).** The PRP sends only the subject (implicit in the token), the action, the resource and the context. It does **not** send a list of policy identifiers. GIAM uses the binding created at design time to narrow to the applicable subset with an indexed lookup, evaluates that subset, applies **deny-wins then allow then default-deny**, and returns one decision with its obligations and the deciding policy reference.

Combination is order independent by construction, so adding a rule can only ever make the outcome more restrictive, and an evaluator with no opinion never overrides one that has an opinion.

#### 2.3.4 Worked Example: Agent-Initiated Transfer Through a PSP API

A human principal asks an onboarded payment agent to settle a supplier invoice. The agent intends to call the PSP endpoint `POST /payments/transfers` for euro (EUR) 4,500 to Acme Supplies. The PEP intercepts the call and ACC's PRP asks GIAM to decide.

**Rules registered at design time (two of the subset GIAM will find):**

```json
{
  "policyId": "pol_psp_transfer_agent",
  "name": "payment-agent-v2-may-execute-emea-transfers",
  "version": 3,
  "status": "active",
  "effect": "allow",
  "effectiveFrom": "2026-09-01T00:00:00Z",
  "resource":   { "ids": ["urn:leafypay:psp:transfer"] },
  "permission": { "ids": ["transfer:execute"] },
  "principal":  { "ids": ["spiffe://prod.leafypay.com/ns/finance/sa/payment-agent-v2"] },
  "conditions": [
    {
      "assuranceAtLeast": "aal2",
      "attestationRequired": true,
      "tenantIs": "leafypay-emea-retail",
      "timeOfDayUtc": { "from": 6, "to": 20 },
      "heldRole": ["payments.initiator"]
    }
  ],
  "obligations": [
    { "type": "urn:acc:obligation:enforce-safr-velocity-limit", "severity": "high" },
    { "type": "urn:acc:obligation:require-contextual-assessment", "severity": "high" }
  ],
  "approvedBy": "usr_risk_officer_04",
  "reason": "Approved for Europe, Middle East and Africa (EMEA) retail supplier settlement"
}
```

```json
{
  "policyId": "pol_psp_transfer_retired_agent_deny",
  "name": "deny-all-psp-transfers-from-retired-agent-v1",
  "version": 1,
  "status": "active",
  "effect": "deny",
  "resource":   { "pattern": "^urn:leafypay:psp:" },
  "permission": { "pattern": "^transfer:" },
  "principal":  { "ids": ["spiffe://prod.leafypay.com/ns/finance/sa/payment-agent-v1"] },
  "conditions": [],
  "reason": "payment-agent-v1 is retired and must not transact"
}
```

**What GIAM deterministically establishes for this request:**

| Check | Question answered | Outcome if it fails |
| --- | --- | --- |
| Token integrity | Signature against the published key set, `alg` is the one the authority published, no key injection header, `iss` matches exactly, `aud` names ACC, not expired, `jti` not revoked. | `DENY`, generic auth error. |
| Constraint recognition | Every RFC 9396 `authorization_details` type on the token is one this deployment understands. | `DENY`. An unenforceable constraint is never ignored. |
| Delegation chain | RFC 8693 `subject_token` (the human) and `actor_token` (the agent) form a valid, non-repudiable chain. The agent is not impersonating the human. | `DENY`. |
| Workload attestation | The caller presents an attested SPIFFE identity matching the onboarded agent. | `DENY`. |
| Entitlement (Role-Based Access Control, RBAC) | The subject's roles expand to include `transfer:execute`. | No opinion from this evaluator, default-deny applies if nothing else allows. |
| Policy targeting (ABAC) | An active, in-effect rule governs `urn:leafypay:psp:transfer` for permission `transfer:execute` and this principal. | Default-deny if no rule matches. |
| Conditions | Assurance at least `aal2`, workload attested, tenant is `leafypay-emea-retail`, UTC hour within 06:00 to 20:00, subject holds `payments.initiator`. | `DENY`, with the deciding policy named. |
| Combination | Any matching `deny` rule wins outright, including the retired-agent rule above. | `DENY`. |

**Response returned to ACC:**

```json
{
  "decision": true,
  "context": {
    "policy_id": "pol_psp_transfer_agent",
    "policy_version": 3,
    "reason_admin": "Subject holds transfer:execute, is attested, and all conditions hold.",
    "obligations": [
      { "id": "urn:acc:obligation:enforce-safr-velocity-limit", "params": { "max_daily_ceiling": 10000.00, "currency": "EUR" } },
      { "id": "urn:acc:obligation:require-contextual-assessment" }
    ]
  }
}
```

ACC then completes Stage 1 deterministically on its own side: it resolves the daily aggregate for the account through a PIP and compares it against the ceiling the obligation names. If EUR 4,500 would breach it, ACC denies. **GIAM permitted the identity and the access; it did not permit the amount.**

#### 2.3.5 What GIAM Deliberately Does Not Decide

Stated as a boundary so no future rule is written in the wrong place:

- Whether EUR 4,500 is too much for this account today. That is a SAFR hard limit, deterministic, enforced by ACC.
- Whether Acme Supplies is a plausible counterparty for this principal. That is contextual, non-deterministic, assessed by the CGS.
- Whether the instruction genuinely came from the human rather than from content the agent read. That is injection provenance, assessed by the CGS.
- Whether the action makes business sense at all. GIAM answers `may this subject perform this action on this resource`, and nothing beyond it.

### 2.4 Context Guardrail Subsystem (CGS)

A specialized agentic or model-based subsystem designed to evaluate business intent, semantic consistency, indirect prompt injections, and contextual risk (e.g., verifying if a payment order aligns with historical client behavior). The CGS is **not** an identity provider, **not** an access control engine, and **cannot** override a deterministic denial or identity failure. Its output acts strictly as a **Policy Information Point (PIP) attribute** during PDP Stage 2 evaluation.

The CGS exists because of a specific gap. GIAM answers `may this subject perform this action on this resource`, and ACC's SAFR limits answer `is this value within the authorised envelope`. Neither can answer `is this particular payment, to this particular counterparty, at this moment, a sensible thing for this principal to be doing`. Every signal below is in the CGS precisely because it cannot be written as a reproducible rule over identity attributes.

#### 2.4.1 Why the Agent Case Is Not the Human Case

A point that reframes the whole subsystem: in human-initiated banking, the richest scam-detection signals are **behavioural biometrics**. Hesitation, typing cadence, unusual dwell time, signs of coaching or coercion. Vendors such as BioCatch and LexisNexis BehavioSec build authorized-push-payment scam detection largely on these cognitive signals.

**None of those signals exist when an agent is the one acting.** There is no hesitation to measure and no human under pressure at the keyboard. This is the single largest detection capability lost when a human is replaced by an agent, and it is why the CGS must substitute a different family of evidence: **instruction provenance and intent correspondence**. The question moves from *how is this person behaving* to *where did this instruction actually come from, and does the action match it*.

#### 2.4.2 What the CGS Evaluates

For the same transfer introduced in 2.3.4, the CGS assesses:

| Signal | Question | Why it cannot be a deterministic rule |
| --- | --- | --- |
| **Instruction and action correspondence** | Do the payee, amount and currency in the PSP call match what the human actually asked for? | Requires interpreting natural language intent against structured parameters. A signed mandate proves the transaction was signed, not that the underlying decision reflected the human's intent. |
| **Instruction provenance** | Did the payee or the amount first appear in content the agent *read* (a retrieved document, a tool result, an email, a web page) rather than in the human's own turn? | Requires tracing data flow through unstructured content. This is the primary indirect prompt injection detection for a payment agent. |
| **Counterparty novelty** | Is this beneficiary new to this principal, recently created, or never previously paid? | The per-counterparty historical baseline is comparative and statistical, not a threshold anyone writes down. |
| **Behavioural fit** | Does the amount, timing, frequency and category fit this principal's history? | Learned distribution, not a fixed rule. Overlaps with classical payment-fraud scoring. |
| **Social-engineering pattern in the instruction** | Does the originating request carry urgency framing, authority impersonation or secrecy pressure? | Substitutes for the behavioural biometrics that are unavailable here. |
| **Goal drift across the plan** | Has the agent's multi-step plan diverged from the task it was delegated? Did an unrelated tool result redirect it? | Requires reasoning over a sequence of actions, not a single request. Maps to the Open Worldwide Application Security Project (OWASP) Top 10 for Agentic Applications entries ASI01 Agent Goal Hijack and ASI10 Rogue Agents (ASI is the Agentic Security Initiative prefix). |
| **Exposure posture** | Is this action simultaneously exposed to untrusted content and an outbound value channel? | The "lethal trifecta" combination of private data, untrusted content and an exfiltration channel. A payment agent has all three by construction. |
| **Semantic consistency with the business domain** | Does a supplier settlement of this shape make sense for this workspace at all? | Domain judgement, which is the defining competence of the CGS. |

#### 2.4.3 Output Contract

The CGS returns an assessment, never a decision:

```json
{
  "verdict": "WARNING",
  "contextRiskScore": 0.71,
  "signals": [
    { "id": "counterparty.novel", "weight": 0.34, "detail": "beneficiary first seen 2 hours ago" },
    { "id": "provenance.injected_candidate", "weight": 0.28, "detail": "International Bank Account Number (IBAN) first appears in a retrieved invoice in Portable Document Format (PDF), not in the human turn" },
    { "id": "behaviour.amount_fit", "weight": 0.09, "detail": "within historical range" }
  ],
  "assessedAt": "2026-10-14T09:14:22Z",
  "modelVersion": "cgs-intent-2026.09",
  "policyProfile": "gp_emea_supplier_settlement_v4"
}
```

Three properties are contractual:

1. **It is an attribute, not a verdict on authority.** The PDP consumes it as a PIP input. `ALLOW` from the CGS grants nothing on its own.
2. **It is versioned.** `modelVersion` is recorded because the same action can score differently across model revisions. The score is evidence of what was assessed, not a rule that can be re-run to the same number.
3. **It carries its signals.** A bare score is not auditable. The contributing signals are what a reviewer reads in the HITL queue.

#### 2.4.4 Worked Example Continued

GIAM permitted the transfer in 2.3.4 and ACC confirmed EUR 4,500 sits below the daily ceiling of EUR 10,000. Stage 1 therefore yields a preliminary permit, and only now is the CGS called.

The CGS observes that the destination IBAN does not appear anywhere in the human's instruction. It first appears inside a supplier invoice PDF that the agent retrieved from a shared mailbox, and the beneficiary record was created two hours ago. The amount itself is unremarkable.

No deterministic rule is violated. The agent is the right agent, holds the right entitlement, is attested, is inside its time window, and the amount is inside the authorised envelope. **A deterministic-only control plane would have allowed this payment.** The CGS returns `WARNING` with `contextRiskScore: 0.71`, the PDP maps that to `Decision: "Indeterminate"`, the ACC disposition is `ESCALATE`, a ticket enters the HITL queue in `PENDING` state, and the PEP blocks execution pending human review.

Note what the CGS did **not** do: it did not grant anything, and it could not have rescued the payment had GIAM denied it.

#### 2.4.5 Honest Limitations

These constraints are recorded in the architecture because designing around them is mandatory, and because a guardrail believed to be stronger than it is becomes a liability.

- **Detection does not transfer between settings.** Replay studies across agent benchmarks report that injection detectors which score well on their own evaluation set collapse on others, in the worst measured cases catching a low single-digit percentage of attacks at a 1% false-positive rate, while false-positive rates on benign tool output ranged from near zero to over 90% depending on the detector. Vendor recall figures measured on static text sets do not predict behaviour inside an agent loop.
- **False positives have a direct business cost.** In payments, an over-blocking guardrail is a declined legitimate transfer and an escalation queue nobody can clear. Threshold tuning is a business decision, not a security default.
- **The CGS is not a safety boundary.** It is a risk-raising and escalation signal. What actually bounds loss is the deterministic layer: capability-style signed mandates, scoped and amount-bound credentials, and hard limits the agent cannot reach or influence. Security by construction bounds the damage; semantic assessment widens the coverage.
- **Non-determinism complicates audit.** Because the score is not reproducible across model versions, the audit record must preserve the inputs, the model and prompt version, and the signals, and the deterministic layer must remain the part of the decision that can be re-derived years later.
- **Latency and cost are real.** This is why Stage 2 is skipped entirely on Stage 1 failure, and why the active governance profile decides whether a contextual assessment is required at all.

#### 2.4.6 Division of Labour, Side by Side

The same transfer, split across the two layers:

| Question | Layer | Owner | Reproducible |
| --- | --- | --- | --- |
| Is the token authentic, unexpired and unrevoked? | Deterministic | GIAM | Yes |
| Is the delegation chain from the human to the agent valid? | Deterministic | GIAM | Yes |
| Is the workload attested and is it the onboarded agent? | Deterministic | GIAM | Yes |
| May this agent execute `transfer:execute` on the PSP resource? | Deterministic | GIAM | Yes |
| Are assurance, tenant, network and time-window conditions met? | Deterministic | GIAM | Yes |
| Is EUR 4,500 within the per-action and daily aggregate ceiling? | Deterministic | ACC PDP, from a GIAM obligation | Yes |
| Is the action rate within its limit? | Deterministic | ACC PDP | Yes |
| Does the payment match what the human actually asked for? | Semantic | CGS | No |
| Did the payee originate from injected content? | Semantic | CGS | No |
| Is this counterparty novel or implausible for this principal? | Semantic | CGS | No |
| Has the agent's plan drifted from its delegated task? | Semantic | CGS | No |

The rule that binds the two columns: **the right column can only ever subtract authority, never add it.** Any `DENY` in the left column terminates evaluation before the right column is consulted.

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

### 2.6 Comparable Systems in Current Practice

This section records how the industry currently splits deterministic authorization from probabilistic assessment, so the choices above can be read against real practice rather than asserted. Claims below reflect the position as of October 2026 and should be re-verified before each major revision.

#### 2.6.1 The Deterministic Half

**The standards position.** OpenID AuthZEN Authorization API 1.0 reached Final in January 2026. It standardizes the PEP to PDP decision interface (`/access/v1/evaluation`, `/access/v1/evaluations`, and subject/resource/action search) and states that *the policy language, architecture, and state management aspects of a PDP are beyond the scope of this specification*. It does not mention the PRP at all. The accurate reading, and the one this document relies on, is that AuthZEN fixes the decision interface and is **silent** on how a PDP obtains policy. That silence is exactly the space ACC's PRP occupies as an adapter to GIAM, and it is why delegating evaluation rather than retrieving rule sets does not conflict with the specification. Note also that XACML's own PRP, PIP and PEP terms are non-normative, following RFC 2904, with only the PAP normatively defined.

**Engines in production for agent authorization.** Amazon Web Services (AWS) publishes a Cedar pattern for multi-agent delegation chains whose explicit purpose is preventing scope expansion across hops, and which states that Cedar evaluates but does not establish identity. Cerbos ships policy-decision middleware enforcing authorization per MCP tool call. CrowdStrike acquired SGNL in early 2026, bringing Continuous Access Evaluation Protocol (CAEP) based continuous re-evaluation and just-in-time access into an agent gateway. The dominant deployment shape across all of them is the same one ACC uses: a gateway validates the token, calls an external decision point, and only then forwards the call.

**Identity and delegation.** There is a converging pattern but no ratified consensus: RFC 8693 token exchange for the delegation hop, RFC 9396 Rich Authorization Requests to carry the constraint payload, Demonstrating Proof of Possession (DPoP) for proof of possession, and short-lived audience-restricted tokens, with the agent's client identity kept distinct from the delegated subject. One flaw is directly relevant to ACC: RFC 8693 nested `act` claims are informational and carry no cryptographic attenuation guarantee, and a token-splicing concern raised on the OAuth working group list in February 2026 notes that a compromised intermediary may present a `subject_token` and an `actor_token` originating from different delegation contexts. **This is a direct argument for ACC re-validating authority at the point of action rather than trusting a presented chain**, which is what invariant 9 (Action Independence) already requires. SPIFFE answers *which workload is this* and never *is this action permitted*, so it is a PIP input and not a substitute for a decision. Internet Engineering Task Force (IETF) work specific to agent delegation remains at individual-draft stage. On the product side, Okta shipped Agent single sign-on (SSO) with Cross App Access in August 2026; other vendor offerings in this space are at early access or unconfirmed general availability and should not be treated as settled.

**Agentic payment rails converge on capabilities, not on judgement.** Across Visa Intelligent Commerce, Mastercard Agent Pay, the Agent Payments Protocol (donated by Google to the Fast Identity Online (FIDO) Alliance in April 2026), the Agentic Commerce Protocol and x402, the pattern is identical and worth stating plainly: **user-granted authority is expressed as an unforgeable, pre-issued, cryptographically bound credential carrying an amount ceiling, a merchant or category scope and a validity window, enforced by a party the agent cannot influence.** Visa's model converts a passkey-confirmed consumer instruction into a rule stored on the Visa network, and an attempt to exceed the authorised amount is declined at network level before processing. Mastercard binds an agentic token to both the operator and the end user under least privilege with a maximum amount and time frame. The Agentic Commerce Protocol's shared payment token is bound to a specific merchant and amount, time-bounded and single use.

**None of these systems score the agent's reasoning in order to decide whether to permit a payment.** This validates the ACC boundary: the deterministic layer is where loss is bounded. A published gap worth noting is that some of these credentials lack a cumulative budget across multiple agents, which is precisely the kind of aggregate ceiling ACC enforces as a SAFR hard limit in Stage 1.

#### 2.6.2 The Probabilistic Half

Most products marketed as AI guardrails are **content filters**, and describing them as agent action control is a category error. AWS Bedrock Guardrails, Azure AI Content Safety with Prompt Shields and Google Model Armor all inspect text and return categorical severity levels or booleans rather than an action verdict. Only a minority evaluate a *proposed action*: NVIDIA NeMo Guardrails through its execution rails, and gateway products that intercept model and MCP calls and can match flows across a sequence of tool calls before execution. Bedrock Automated Reasoning checks are a notable outlier in using formal verification rather than classification, though against a defined policy rather than open-ended intent. The sector has consolidated heavily, with Lakera acquired by Check Point, Protect AI and an AI gateway vendor acquired by Palo Alto, and Cisco's AI Defense built on Robust Intelligence.

Classical payment fraud scoring is the mature prior art and transfers directly. Stripe Radar is the clearest published specification, producing a 0 to 99 risk score per payment with a default elevated-risk threshold at 65, built from a large feature set plus cross-network data. Vendors positioning specifically around agent oversight make the architecturally useful observation that detection of agent-era attacks depends on **per-counterparty historical baselines**, because the fraudulent instruction contains no malicious artifact to detect. Feature-level documentation for most fraud platforms is not public, so their internals should not be cited as precedent.

Published 2026 evidence on detector reliability is sobering and is reflected in 2.4.5. Benchmarks that replay tool calls across different agent evaluation suites show that injection detectors do not transfer between settings, and that false-positive rates on benign tool output vary enormously by detector. The strongest design-level response in the literature is not better classification but **capability and provenance tracking**, where every value carries its origin and tool calls are checked against policy at call time, accepting a measurable reduction in task completion in exchange for a security property that can be argued rather than measured.

#### 2.6.3 Where ACC Sits Relative to SAFR

The SAFR framework, published by the Monetary Authority of Singapore (MAS), is the closest published artifact to this architecture, and it arrives independently at a comparable shape: a pre-execution governance checkpoint producing a binding disposition for every consequential action, built from an agent identity component, a controls repository, a disposition engine and a tamper-evident audit log, bound together by a governance envelope. SAFR states that generic controls such as authorization checks and exposure limits are typically deterministic, that AI-specific controls may involve probabilistic or semantic assessment, that the disposition engine evaluates deterministically against retrieved controls, and that an agent cannot extend the scope of a mandate through its own reasoning or inference. It grounds mandates in capability-based security, and its control categories (authorization, exposure limits, rate limits, evidence quality) map closely onto ACC's Stage 1.

Three deliberate positions follow:

1. **SAFR does not use XACML or AuthZEN vocabulary.** It names no PEP, PDP or PRP. The mapping of SAFR's runtime checkpoint onto XACML 3.0 component separation and AuthZEN transport is this architecture's own contribution, not a restatement of SAFR.
2. **ACC is stricter than SAFR on the probabilistic boundary.** SAFR permits probabilistic assessment inside the disposition engine, and allows a multi-factor risk assessment to realise a disposition. ACC confines non-deterministic signals to a PIP attribute that can restrict but never authorize. The precedent for this strengthening is SAFR's own Evidence Quality control, which uses a confidence threshold solely to route an action to human review and never to grant one.
3. **SAFR's stated gaps are ACC's problem statement.** It names the absence of a consistent standard for when a human must be in the loop, the assumption in existing governance that human review precedes action, and the fragmentation of per-deployment guardrails that do not interoperate.

SAFR is a voluntary industry reference model rather than binding regulation. Of the binding regimes, the European Union (EU) AI Act remains the most relevant, with human oversight obligations (the ability to intervene, override and shut down) directly applicable, while the high-risk obligation deadlines for Annex III systems were deferred by the 2026 Digital Omnibus. Dates and deadlines in this area have moved more than once and must be verified against the Official Journal text rather than secondary summaries.

---

## 3. ACC Module Responsibilities & Component Architecture

ACC modules align strictly with the **XACML 3.0 Reference Architecture** (using the _JavaScript Object Notation (JSON) Profile of XACML 3.0_), the **OpenID AuthZEN 1.0 Specification**, and **SAFR (Safeguards for Agentic Finance at Runtime)** runtime standards.
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

1. **Interception:** The Agentic System invokes a tool/API. The **PEP Gateway** intercepts the call at the boundary.
2. **Envelope Construction:** PEP converts the request into a Governance Envelope formatted as a XACML 3.0 JSON or AuthZEN REST payload containing subject, resource, action, and context attributes.
3. **Identity & Context Enrichment:** PDP queries **PIP (GIAM)** to validate OAuth claims, RFC 8693 `actor_token` / `subject_token` delegation integrity, and SPIFFE workload attestation.
4. **Policy Retrieval & AuthZEN Call:** PDP invokes the **PRP (Policy Retrieval Point)**, which submits the envelope to the **GIAM AuthZEN API** (`POST /access/v1/evaluation`). The PRP sends subject, action, resource and context; it does **not** send a list of policy identifiers and does not evaluate anything itself. GIAM resolves the applicable policy subset from the bindings created at design time via the **PAP (Policy Administration Point)** by business domain specialists, evaluates that subset, and returns one decision with its obligations and the deciding policy reference. See 2.3.3.
5. **Stage 1 Evaluation (Deterministic & Hard Limits):** PDP combines the GIAM decision with the hard constraints ACC owns. Canonical identity and access rules are decided by GIAM; SAFR financial ceilings and velocity limits are deterministic but evaluated by ACC against PIP attributes, driven by the obligations GIAM returned and by any RFC 9396 constraint carried on the token. See 2.3.2.
    - _Branch A (Stage 1 Fail):_ If GIAM denies, or a SAFR financial limit or velocity threshold is breached, PDP generates `Decision: "Deny"`, writes an audit event to the Ledger, and returns a `DENY` disposition to the PEP. **Execution terminates (<15ms).**
    - _Branch B (Stage 1 Escalate):_ If ambiguity or escalation triggers are met, PDP generates `Decision: "Indeterminate"`, maps this to an **`ESCALATE`** disposition, creates a HITL ticket, writes an audit event, and returns a **`PENDING`** operational state to the PEP. **Execution halts awaiting human review.**
    - _Branch C (Stage 1 Pass):_ If all Stage 1 deterministic guardrails pass, PDP advances to Stage 2 contextual evaluation.
6. **Stage 2 Evaluation:** PDP queries **PIP (CGS)**, passing action parameters and reasoning traces. CGS runs semantic validation, prompt injection analysis, and context anomaly scoring. Returns a `contextRiskScore`.
7. **Final Synthesis:** PDP combines Stage 1 and Stage 2 outputs:
    - If CGS passes → `Decision: "Permit"`. PDP signs a single-use Execution Permit containing `nonce`, `hash(params)`, `expiry`, and `policy_version`.
    - If CGS fails → `Decision: "Deny"` (`DENY` disposition).
    - If CGS flags a warning → `Decision: "Indeterminate"` (`ESCALATE` disposition → `PENDING` operational state).
8. **Audit Logging:** PDP asynchronously writes complete decision provenance and evaluation traces to the **Audit Ledger**.
9. **Enforcement:** PEP receives the response. If `Permit`, PEP appends the signed Execution Permit header and routes the call to the Protected Target. If `Deny` or `Pending`, PEP firmly blocks the call.

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
3.  A human reviewer acts through the ACC user interface (UI) or supported REST API. The agent may relay a human decision only when human identity and authority are verifiable.
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
| **Action & Target** | Action name (e.g., `execute_wire_transfer`), target Uniform Resource Identifier (URI), parameter hash. | Must express actual operation; bind permit to evaluated parameters. |
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
5.  **Single-Use Execution Permits:** A successful ACC evaluation produces an ephemeral, cryptographically signed permit bound to `hash(parameters)`, target audience, and explicit expiry time-to-live (TTL). Permits cannot be reused, transferred, or applied to replay transactions.
6.  **Non-Repudiable Delegation:** All agent requests executed on behalf of humans must present an RFC 8693 token exchange chain containing both `subject_token` (human principal) and `actor_token` (acting agent workload).
7.  **Non-Deterministic Boundary Constraint:** CGS outputs are advisory risk signals evaluated as XACML/AuthZEN PIP attributes. CGS can trigger a `DENY` or `ESCALATE`, but can **never** override a deterministic identity denial or policy rejection.
8.  **Block Execution Default:** Both `DENY` and `PENDING` block execution. Neither is an allow.
9.  **Action Independence:** Evaluate each action independently. Prior approval does not automatically authorize a later action, a different resource, or another agent.
10.  **Complete API-UI Parity:** Every business operation supported in the ACC UI must be exposed via headless REST APIs enforcing identical identity, policy, audit, and enforcement controls.
11.  **Data Minimization in Audit:** Audit preserves decision provenance and traceability without unnecessarily retaining tokens, credentials, prompts, or sensitive business payloads.

A2A_Published (A2A is Agent-to-Agent) = GIAM_Active ∧ ACC_Onboarding_Approved ∧ Runtime_Attested ∧ Endpoint_Healthy

---

## 8. References and Standards

This reference architecture is grounded in the following normative frameworks, standards and industry specifications:

| Standard / Framework | Role in the ACC Architecture | Official Reference |
| --- | --- | --- |
| **OpenID AuthZEN 1.0 (Final)** | Standardized REST API for interoperable authorization evaluation delegation between ACC PDP and GIAM. Fixes the PEP to PDP interface and leaves the PDP's policy language, architecture and state management out of scope, which is the space ACC's PRP occupies (see 2.6.1). | [OpenID AuthZEN Authorization API 1.0 Final](https://openid.net/specs/authorization-api-1_0-final.html) |
| **Organization for the Advancement of Structured Information Standards (OASIS) XACML 3.0 (JSON Profile)** | Structured JSON profile for exchanging requests, PIP attributes and decision responses (Permit/Deny/Indeterminate). | [OASIS JSON Profile of XACML 3.0 Version 1.1](https://docs.oasis-open.org/xacml/xacml-json-http/v1.1/xacml-json-http-v1.1.html) |
| **RFC 8693 (OAuth 2.0 Token Exchange)** | Standard protocol for validating non-repudiable delegation chains between the delegating human user and the acting agent. | [RFC 8693 - OAuth 2.0 Token Exchange](https://www.rfc-editor.org/rfc/rfc8693.html) |
| **SAFR Framework (MAS, v1.1, October 2026)** | Safeguards for Agentic Finance at Runtime. A voluntary industry reference model, not binding regulation. Source of the pre-execution checkpoint, the four dispositions and the taxonomy of deterministic versus probabilistic controls (see 2.6.3). | [MAS - Safeguards for Agentic Finance at Runtime](https://www.mas.gov.sg/news/media-releases/2026/mas-partners-industry-to-develop-safeguards-for-ai-agents-in-finance) |
| **RFC 9396 (Rich Authorization Requests)** | Mechanism to cryptographically constrain what a token may authorize, including amount ceilings. An unrecognized constraint type is refused, never ignored (see 2.3.2). | [RFC 9396 - OAuth 2.0 Rich Authorization Requests](https://www.rfc-editor.org/rfc/rfc9396.html) |
| **SPIFFE / SPIRE** | Standard for cryptographic attestation and workload identity in runtime environments. It answers which workload this is, never whether the action is permitted: it is a PIP input, not a substitute for a decision. | [SPIFFE Identity Standard](https://spiffe.io/docs/latest/spiffe-about/overview/) |
| **Model Context Protocol (MCP)** | Communication and interception protocol for the tools and servers where the enforcement point (PEP) operates. | [Model Context Protocol Specification](https://modelcontextprotocol.io/) |
| **OWASP Top 10 for Agentic Applications (2026)** | Agentic threat taxonomy. ASI01 Goal Hijack, ASI02 Tool Misuse, ASI06 Memory & Context Poisoning and ASI10 Rogue Agents delimit the CGS scope (see 2.4.2). | [OWASP GenAI Security Project](https://genai.owasp.org/) |
| **CaMeL (Debenedetti et al.)** | Per-value capability and provenance tracking, with policy checks at tool-call time. Basis for instruction provenance and for the security-by-construction principle (see 2.4.5). | [arXiv:2503.18813](https://arxiv.org/abs/2503.18813) |
| **Agent Payments Protocol (AP2)** | Signed mandates for agent-initiated payments. Donated by Google to the FIDO Alliance in April 2026. Canonical example of authority expressed as a bounded capability (see 2.6.1). | [FIDO Alliance - AP2 donation](https://fidoalliance.org/google-donates-agent-payments-protocol-to-fido-alliance/) |
| **Stripe Radar** | Payment risk scoring prior art: a 0 to 99 score per transaction with a default elevated-risk threshold of 65. Reference for the shape of the CGS output (see 2.4.3). | [Stripe Radar risk evaluations](https://docs.stripe.com/radar/risk-evaluation) |

> **Currency note.** The dates, versions and adoption states in this table reflect October 2026 and have changed more than once in this domain. Verify against the primary source before relying on any of them. Items still to confirm: the current AP2 v0.2 mandate schema, the normative PRP wording in the OASIS XACML 3.0 core specification and whether XACML 4.0 (Committee Specification Draft 01, CSD01, February 2026) changes its semantics, and the publication status of the National Institute of Standards and Technology (NIST) agent profiles.
