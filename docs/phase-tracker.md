# StackLoop Phase Tracker

This is the single source of truth for StackLoop's delivery state. **No phase may begin
until the previous phase's exit criterion is met and marked complete in this document.**

If a new feature is required mid-phase, update the [PRD](./prd.md) first, then proceed.
Architecture deviations require an [ADR](./adr/) before implementation.

**Current phase: Phase 4 — Core Backend Development (IN PROGRESS)**

Last updated: 2026-09-22

---

## Status legend

| Label | Meaning |
|---|---|
| COMPLETE | Exit criterion met and evidenced |
| IN PROGRESS | Actively being worked |
| BLOCKED | Cannot proceed; blocker recorded |
| NOT STARTED | No work begun |

---

## Phase summary

| # | Phase | Exit criterion | Status |
|---|---|---|---|
| 0 | Foundation & Product Strategy | Product vision + MVP scope locked, architecture approved | COMPLETE |
| 1 | Brand & Repository Setup | Repo public, professional, contributor-ready | COMPLETE |
| 2 | UI/UX Design | All major screens approved | COMPLETE |
| 3 | Technical Architecture | Architecture finalized, implementation-ready | COMPLETE |
| 4 | Core Backend Development | Core backend services functional (real, not mock) | IN PROGRESS |
| 5 | AI & Discovery Engine | Repos receive AI-generated insights | NOT STARTED |
| 6 | Frontend Development | Frontend fully integrates with backend APIs | NOT STARTED |
| 7 | Personalization | Users receive customized content | NOT STARTED |
| 8 | Open Source Features | Maintainers manage projects, contributors participate | NOT STARTED |
| 9 | Quality Assurance | No critical defects, quality gates pass | NOT STARTED |
| 10 | DevOps & Deployment | Production deployment stable | NOT STARTED |
| 11 | Documentation | A new dev can set up + contribute from docs alone | NOT STARTED |
| 12 | Beta Launch | Stable beta with validated feedback | NOT STARTED |
| 13 | Public Launch | Public launch completed | NOT STARTED |
| 14 | Community Growth | Consistent engagement + external contributions | NOT STARTED |
| 15 | Growth & Scale | Matured beyond MVP into a real ecosystem | NOT STARTED |

---

## Phase 0 — Foundation & Product Strategy

**Exit criterion:** Product vision + MVP scope locked, architecture approved.

**Status: COMPLETE** (retroactively closed 2026-09-22)

| Deliverable | Evidence |
|---|---|
| Product vision statement | [prd.md](./prd.md) §1–2 |
| Target personas | [prd.md](./prd.md) §3 |
| MVP scope, explicitly in and out | [prd.md](./prd.md) §4–5 |
| Success metrics | [prd.md](./prd.md) §6 |
| Architecture approval | [prd.md](./prd.md) §7, referencing the Phase 3 specs |

**Note on retroactive closure.** The vision existed only in `README.md` until 2026-09-22.
The PRD was written then to consolidate it and lock MVP scope. No scope was changed in the
process; the PRD records what the project had already committed to.

---

## Phase 1 — Brand & Repository Setup

**Exit criterion:** Repo public, professional, contributor-ready.

**Status: COMPLETE** (retroactively closed 2026-09-22)

| Deliverable | Evidence |
|---|---|
| Open-source license | [LICENSE](../LICENSE) (Apache-2.0) |
| Code of conduct | [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) |
| Contribution guide | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Security policy | [SECURITY.md](../SECURITY.md) |
| Project README with brand and vision | [README.md](../README.md) |
| Brand asset (banner) | `assets/banner.png` |
| Issue templates | `.github/ISSUE_TEMPLATE/` |
| Pull request template | `.github/PULL_REQUEST_TEMPLATE.md` |
| Code ownership | `.github/CODEOWNERS` |

**Deferred to Phase 10 (DevOps & Deployment), by design:** GitHub Actions CI workflows.
The pipeline is already specified in [cicd-pipeline-spec.md](./cicd-pipeline-spec.md); building
it now would pre-empt Phase 10 and is explicitly out of scope for Phase 1.

---

## Phase 2 — UI/UX Design

**Exit criterion:** All major screens approved.

**Status: COMPLETE** (retroactively closed 2026-09-22)

| Deliverable | Evidence |
|---|---|
| Information architecture | [ia-information-architecture.md](./ia-information-architecture.md) |
| User flows | [ux-user-flows.md](./ux-user-flows.md) |
| Low-fidelity wireframes for all major screens | [wireframes-low-fidelity.md](./wireframes-low-fidelity.md) |
| Design system and UI specification | [design-system-ui-spec.md](./design-system-ui-spec.md) |

---

## Phase 3 — Technical Architecture

**Exit criterion:** Architecture finalized, implementation-ready.

**Status: COMPLETE** (retroactively closed 2026-09-22)

| Deliverable | Evidence |
|---|---|
| Monorepo structure and package boundaries | [monorepo-architecture.md](./monorepo-architecture.md) |
| System architecture | [system-architecture.md](./system-architecture.md) |
| Database schema | [database-schema.md](./database-schema.md) |
| REST API contract | [api-rest-spec.md](./api-rest-spec.md) |
| Authentication and authorization design | [auth-security-spec.md](./auth-security-spec.md) |
| Data flow architecture | [data-flow-architecture-spec.md](./data-flow-architecture-spec.md) |
| Container architecture | [docker-architecture-spec.md](./docker-architecture-spec.md) |
| Production infrastructure design | [production-infrastructure-spec.md](./production-infrastructure-spec.md) |
| CI/CD pipeline design | [cicd-pipeline-spec.md](./cicd-pipeline-spec.md) |

These specs are binding. Phase 4 onward must implement them as written, or amend them via an ADR.

---

## Phase 4 — Core Backend Development

**Exit criterion:** Core backend services functional (real, not mock).

**Status: IN PROGRESS**

"Real, not mock" is interpreted as: every core service persists to PostgreSQL through Prisma,
authenticates against GitHub's live OAuth endpoints, and is exercised by tests that run against
the real HTTP surface rather than hand-written doubles.

### Deliverables

| # | Deliverable | Status |
|---|---|---|
| 4.1 | Workspace scaffolding: pnpm + Turborepo root, `tsconfig.base.json`, `.env.example` | NOT STARTED |
| 4.2 | Express server with a single composed entrypoint (`apps/api/src/server.ts`) | NOT STARTED |
| 4.3 | Real signed JWTs: HS256, verified signature, `exp`, `iss`, `aud` | NOT STARTED |
| 4.4 | Real GitHub OAuth: env-driven credentials, S256 PKCE, code exchange, profile fetch | NOT STARTED |
| 4.5 | Database-backed OAuth state store with TTL | NOT STARTED |
| 4.6 | Database-backed sessions with refresh-token hashing, rotation, and reuse detection | NOT STARTED |
| 4.7 | User upsert and account linking on login | NOT STARTED |
| 4.8 | Working middleware chain: auth, authorization, CSRF, rate limiting | NOT STARTED |
| 4.9 | Repository collector wired to `PrismaRepositoryRepository` | NOT STARTED |
| 4.10 | Prisma migration generated and applied | NOT STARTED |
| 4.11 | HTTP-level tests covering auth failure paths, not just happy paths | NOT STARTED |
| 4.12 | README and docs corrected to match the implementation | NOT STARTED |

### Known defects carried into this phase

Recorded from the 2026-09-22 codebase audit. All must be closed before the exit criterion is met.

| ID | Severity | Defect |
|---|---|---|
| D-01 | Critical | Token format is `base64url(payload) + "." + signingSecret`, leaking `JWT_SIGNING_SECRET` to every client |
| D-02 | Critical | No signature, `exp`, `iss`, or `aud` verification; `role: "admin"` can be forged by any anonymous caller |
| D-03 | Critical | `/auth/logout` accepts `session_id` from an unauthenticated request body (IDOR) |
| D-04 | High | OAuth callback never contacts GitHub; the user profile is hardcoded |
| D-05 | High | `loadUser()` returns a hardcoded user for every id |
| D-06 | High | Sessions and OAuth state are in-memory `Map`s; nothing reaches PostgreSQL |
| D-07 | High | Middleware is invoked with a no-op `next()`; auth does not gate `/auth/me` |
| D-08 | High | CSRF middleware is constructed but applied to no route |
| D-09 | Medium | PKCE `code_challenge` is random bytes, not `S256(code_verifier)`; the verifier is never checked |
| D-10 | Medium | `validateSession` resolves by user id, not by the session the token was issued for |
| D-11 | Medium | No refresh-token reuse detection or session-chain revocation |
| D-12 | Medium | `client_id` is the hardcoded string `'github-client-id'` |
| D-13 | Medium | OAuth state store has no TTL |
| D-14 | Low | Prisma `Session` stores `*_Encrypted` columns while the spec and code use hashes |
| D-15 | Low | README documents `/repositories/sync/batch`; the code registers `/repositories/batch-sync` |

### Blockers

None currently. (Resolved 2026-09-22: Node.js was absent from the development machine; Node 24.19.0 LTS installed.)

---

## Phases 5–15

Not started. Exit criteria are listed in the phase summary above and will be expanded into
deliverables when each phase is opened.
