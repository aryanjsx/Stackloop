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
| 4.1 | Workspace scaffolding: pnpm + Turborepo root, `tsconfig.base.json`, `.env.example` | COMPLETE |
| 4.2 | Express server with a single composed entrypoint (`apps/api/src/server.ts`) | COMPLETE |
| 4.3 | Real signed JWTs: HS256, verified signature, `exp`, `iss`, `aud` | COMPLETE |
| 4.4 | Real GitHub OAuth: env-driven credentials, S256 PKCE, code exchange, profile fetch | COMPLETE |
| 4.5 | Database-backed OAuth state store with TTL | COMPLETE |
| 4.6 | Database-backed sessions with refresh-token hashing, rotation, and reuse detection | COMPLETE |
| 4.7 | User upsert on login | COMPLETE |
| 4.8 | Working middleware chain: auth, authorization, CSRF, rate limiting | COMPLETE |
| 4.9 | Repository collector wired to `PrismaRepositoryRepository` | COMPLETE |
| 4.10 | Prisma migration generated and applied | **PARTIAL — generated, never applied** |
| 4.11 | HTTP-level tests covering auth failure paths, not just happy paths | COMPLETE |
| 4.12 | README and docs corrected to match the implementation | COMPLETE |

Deliverable 4.7 was narrowed from "user upsert and account linking" to "user upsert". The
`account_links` table in [auth-security-spec.md](./auth-security-spec.md) §15 exists to support
multiple identity providers, and the [PRD](./prd.md) §5 puts non-GitHub providers out of MVP
scope. The unique `github_id` on `users` is sufficient while GitHub is the only provider.
Revisit when a second provider is added.

### Known defects carried into this phase

Recorded from the 2026-09-22 codebase audit. All must be closed before the exit criterion is met.

| ID | Severity | Defect | Status |
|---|---|---|---|
| D-01 | Critical | Token format is `base64url(payload) + "." + signingSecret`, leaking `JWT_SIGNING_SECRET` to every client | FIXED (T3) |
| D-02 | Critical | No signature, `exp`, `iss`, or `aud` verification; `role: "admin"` can be forged by any anonymous caller | FIXED (T3) |
| D-03 | Critical | `/auth/logout` accepts `session_id` from an unauthenticated request body (IDOR) | FIXED (T10) |
| D-04 | High | OAuth callback never contacts GitHub; the user profile is hardcoded | FIXED (T7) |
| D-05 | High | `loadUser()` returns a hardcoded user for every id | FIXED (T8) |
| D-06 | High | Sessions and OAuth state are in-memory `Map`s; nothing reaches PostgreSQL | FIXED (T5, T6) |
| D-07 | High | Middleware is invoked with a no-op `next()`; auth does not gate `/auth/me` | FIXED (T9) |
| D-08 | High | CSRF middleware is constructed but applied to no route | FIXED (T9) |
| D-09 | Medium | PKCE `code_challenge` is random bytes, not `S256(code_verifier)`; the verifier is never checked | FIXED (T5) |
| D-10 | Medium | `validateSession` resolves by user id, not by the session the token was issued for | FIXED (T6) |
| D-11 | Medium | No refresh-token reuse detection or session-chain revocation | FIXED (T6) |
| D-12 | Medium | `client_id` is the hardcoded string `'github-client-id'` | FIXED (T2) |
| D-13 | Medium | OAuth state store has no TTL | FIXED (T5) |
| D-14 | Low | Prisma `Session` stores `*_Encrypted` columns while the spec and code use hashes | FIXED (T4) |
| D-15 | Low | README documents `/repositories/sync/batch`; the code registers `/repositories/batch-sync` | FIXED (T11) |

All fifteen defects are closed, each with a regression test naming the defect it guards.

### Accepted risks

**AR-01 — Concurrent refresh revokes the session (accepted 2026-09-22).**

Refresh-token rotation is strict: the first request to present a token rotates it, and any later
presentation of that same token is treated as replay, which revokes the whole session.

Two browser tabs refreshing at the same moment, or a client that retries after a network
timeout, therefore sign the user out everywhere. Reproduced by issuing two simultaneous
`POST /auth/refresh` calls with the same token: one returns 200, the other returns
`401 REFRESH_TOKEN_REUSE`, and the session is revoked.

This is the behaviour [auth-security-spec.md](./auth-security-spec.md) §7 asks for ("If a refresh
token is reused, revoke the entire session chain and force re-login"), and it is being kept
deliberately rather than weakened. The usual mitigation is a short grace window in which the
immediately preceding token returns the already-issued successor pair instead of revoking.

Accepted for now. Expect user reports of unexplained sign-outs once the frontend ships in
Phase 6; revisit then, and do **not** resolve it by disabling reuse detection.

### Deferred beyond Phase 4

- **Redis.** [system-architecture.md](./system-architecture.md) includes Redis for caching and
  fast session lookup. Sessions are durable in PostgreSQL, which
  [auth-security-spec.md](./auth-security-spec.md) §5 permits, and caching is a performance
  concern rather than a functional one. Scheduled for Phase 10.

### Blockers

- **No PostgreSQL available on the development machine.** Neither a local install nor Docker is
  present, and an attempt to install PostgreSQL 17 via winget was not completed. The initial
  migration was generated offline with `prisma migrate diff` and has never been applied.

  **This is the single remaining item standing between Phase 4 and its exit criterion.** Phase 4
  requires "core backend services functional (real, not mock)". The production code paths are
  real — `PrismaOAuthStateRepository`, `PrismaSessionRepository`,
  `PrismaRefreshTokenRepository`, `PrismaAuthUserRepository`, and `PrismaRepositoryRepository`
  are what `server.ts` wires — but the automated tests exercise them through in-memory doubles
  that implement the same ports. So the *behaviour* is verified while the *SQL* is not.

  Specifically unverified until a database exists:
  - the migration applies cleanly;
  - `updateManyAndReturn` gives single-use OAuth state semantics on PostgreSQL;
  - the conditional `usedAt` update detects refresh-token reuse under real concurrency;
  - `upsert` on `githubId` behaves as expected across the BigInt boundary.

  **Phase 4 is therefore NOT complete and Phase 5 must not begin.**

  To close it: install PostgreSQL, set `DATABASE_URL`, run
  `pnpm --filter @stackloop/api exec prisma migrate deploy`, then add an integration test suite
  that runs the same scenarios against the real database.

### Resolved blockers

- Node.js was absent from the development machine. Node 24.19.0 LTS and pnpm 12.5.1 installed 2026-09-22.

---

## Phases 5–15

Not started. Exit criteria are listed in the phase summary above and will be expanded into
deliverables when each phase is opened.
