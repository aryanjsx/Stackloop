# StackLoop Repository Audit

- **Date:** 2026-10-13
- **Branch:** `rebuild/phase-0-audit`
- **Auditor:** Staff Product & Systems Architect

---

## 1. Executive Summary

An exhaustive inspection of the `aryanjsx/Stackloop` default branch was performed. The repository contains high-quality, mature architecture specifications and a solid, production-grade authentication and security core in `apps/api`. All 73 existing automated tests pass with 0 failures, and TypeScript compilation passes without errors.

However, significant divergence exists between what is documented in `docs/` and what currently exists in source code:
1. **Frontend (`apps/web`):** Does not exist in code.
2. **AI Service (`services/ai`):** Does not exist in code.
3. **Shared Packages (`packages/*`):** Do not exist in code.
4. **CI/CD (`.github/workflows/`):** Entire workflow directory is absent despite extensive specs.
5. **Docker Infrastructure:** Zero Dockerfiles exist; root `docker-compose.yml` is absent.
6. **Database Testing:** Tests rely entirely on in-memory mock repositories; no integration tests run against real PostgreSQL.
7. **Duplicate Repositories:** Code duplication exists between `src/database/repositories/` (legacy `any`-typed `BaseRepository`) and `src/repositories/repositories/` / `src/auth/repositories/` (strongly typed, active Prisma repositories).

---

## 2. Directory and Service Inventory

### Physical Repository Layout
```text
Stackloop/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── CODEOWNERS
│   └── PULL_REQUEST_TEMPLATE.md
│   (MISSING: workflows/ directory)
├── apps/
│   └── api/
│       ├── prisma/
│       │   ├── migrations/20260922000000_init/migration.sql
│       │   ├── schema.prisma
│       │   └── seed.ts
│       ├── src/
│       │   ├── auth/ (controllers, middleware, providers, repositories, services, tokens, validators)
│       │   ├── config/env.ts
│       │   ├── database/ (base.repository.ts, repositories/ [legacy duplicates])
│       │   ├── middleware/error-handler.ts
│       │   ├── repositories/ (controllers, repositories, services)
│       │   ├── app.ts
│       │   └── server.ts
│       └── tests/ (73 unit and HTTP integration tests)
├── assets/
├── configs/env/.env.example
├── docs/ (16 comprehensive specification documents & ADR-0001)
├── package.json (Turborepo root)
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── turbo.json
```

### Missing Documented Modules
| Path in Docs | Purpose | Current Physical State |
|---|---|---|
| `apps/web` | Next.js App Router Web Application | **Absent** |
| `services/ai` | Python / FastAPI AI summary service | **Absent** |
| `packages/ui` | Reusable React design components | **Absent** |
| `packages/types` | Shared TypeScript domain contracts | **Absent** |
| `infra/docker/` | Dockerfiles and compose definitions | **Absent** |
| `.github/workflows/` | GitHub Actions CI/CD workflows | **Absent** |

---

## 3. Working Features, Stubs, and Defects

### A. Working & Verified
- **GitHub OAuth 2.1 with PKCE:** `apps/api/src/auth/pkce.ts`, `github-oauth.provider.ts`, `routes.ts`. Handles state generation, verification, replay attack prevention, and secure callback.
- **Session & Token Management:** `apps/api/src/auth/tokens/token.service.ts`. Generates stateless access JWTs (HS256 per ADR-0001) and server-tracked, rotated refresh tokens.
- **Security Hardening:** CSRF cookies with double-submit validation, `helmet` security headers, strict body limits (100kb), secure cookie attributes (`HttpOnly`, `SameSite=Lax`, `Secure` in prod).
- **Environment Validation:** `apps/api/src/config/env.ts`. Validates configuration at startup using Zod and fails with clear operator guidance.
- **Prisma Schema & Init Migration:** `apps/api/prisma/schema.prisma` and `20260922000000_init/migration.sql` define a complete 18-table schema matching the documented ER diagram.

### B. Stubs and Incomplete Features
- **Queue Producer:** `apps/api/src/server.ts` lines 62–67 contains a dummy stub returning `{ queued: false }`. Real message queuing for AI and search indexing is unbuilt.
- **Repository Feed & Read APIs:** Only `POST /repositories/sync` and `POST /repositories/sync/batch` are wired in `apps/api/src/repositories/routes.ts`. There are no `GET /repositories` or `GET /repositories/:id` endpoints exposed to consumers.
- **`apps/api/prisma/seed.ts`:** Minimal stub that creates two dummy repositories without technologies, categories, or AI metadata.

### C. Known Defects & Duplication
- **Duplicate Database Layer:**
  - `apps/api/src/database/repositories/repository.repository.ts` uses loose `any` typing extending `BaseRepository`.
  - `apps/api/src/repositories/repositories/prisma-repository.repository.ts` implements the domain `RepositoryRepository` interface with clean mapping.
  - *Action:* Deprecate `src/database/` legacy duplicates and standardize on domain-driven modules.
- **No Linter Configured:** `package.json` specifies `"lint": "turbo run lint"`, but `apps/api` has no `lint` script and no `.eslintrc` or biome configuration.
- **Tests Disconnected from Real DB:** All 73 tests run against `InMemorySessionRepository`, `InMemoryRefreshTokenRepository`, `InMemoryOAuthStateRepository`, and mock Prisma stubs. Constraints and foreign keys in PostgreSQL have not been tested under load.

---

## 4. Code & Documentation Retain / Refactor / Replace Matrix

| Module | Current State | Recommendation | Rationale |
|---|---|---|---|
| `apps/api/src/auth/**` | Tested, secure | **Retain** | Follows all OAuth 2.1, PKCE, CSRF, and token rotation specs with complete test coverage. |
| `apps/api/src/config/env.ts` | Complete | **Retain** | Clean Zod validation, enforces security constraints. |
| `apps/api/prisma/schema.prisma` | Complete | **Retain** | Accurately models the full domain. |
| `apps/api/src/database/**` | Incomplete duplicate | **Replace** | Obsolete legacy layer with `any` types. |
| `apps/api/src/repositories/**` | Partially wired | **Refactor & Expand** | Retain ingestion logic; add `GET` feed, details, filters, and save endpoints. |
| `docs/production-infrastructure-spec.md` | Azure-only | **Supersede by ADR-0002** | Reconcile with GCP deployment target requested for MVP. |
| `docs/cicd-pipeline-spec.md` | Documented without files | **Implement Baseline** | Add `.github/workflows/ci.yml` covering lint, typecheck, and test. |

---

## 5. Security Posture Review

- **Secrets Handling:** Secrets (`JWT_SIGNING_SECRET`, `GITHUB_CLIENT_SECRET`) are never logged or exposed in client bundles. Production mandates `JWT_SIGNING_SECRET` length $\ge 32$ chars.
- **CORS & CSRF:** Strict CORS origin checking against `WEB_APP_ORIGIN`. Mutations using session cookies require matching `X-CSRF-Token` headers.
- **Injection Protection:** Ingestion validates GitHub `owner` and `repo` with regex constraints, preventing path traversal and command injection.
- **AI Untrusted Content:** Specifications correctly mandate that GitHub READMEs must be treated as untrusted text rather than system instructions to avoid prompt injection.

---

## 6. Audit Conclusion & Next Actions

The codebase baseline is remarkably clean and well-architected where implemented. The immediate requirement is to:
1. Approve **ADR-0002** (GCP Cloud Run + Cloud SQL + Vertex AI Gemini decision).
2. Approve **ADR-0003** (Cloud Tasks for asynchronous background execution).
3. Implement Phase 1: Local Docker Compose for PostgreSQL, real DB integration tests, and CI workflow.
4. Deliver Vertical Slice 1 (Phase 3 in Rebuild Plan): End-to-end repository feed, detail, GitHub OAuth, and save flow.
