# StackLoop Product Requirements Document

Status: **Locked** (Phase 0 closed 2026-09-22)

This document is the authoritative statement of what StackLoop is and what the MVP includes.
Scope changes require an edit to this document *before* any implementation work begins.

---

## 1. Vision

StackLoop exists to make open source approachable, discoverable, and rewarding for developers
at every stage of their journey. It is a central platform where a developer moves from
**discovery** to **understanding** to **contribution** without friction.

## 2. Problem

Open source is hard to navigate. Projects are difficult to evaluate before committing time to
them: READMEs vary wildly in quality, a repository's real difficulty is invisible until you
clone it, and there is no reliable signal about whether a project is welcoming to newcomers.

Existing tools do not close this gap. GitHub Trending ranks by popularity, which surfaces large
projects that are usually the worst entry points for a newcomer. Daily.dev aggregates articles
rather than repositories. Neither explains *what a project is*, *how hard it is*, or *where you
could start contributing*.

The result is that developers who want to participate in open source frequently cannot find a
project that matches their skill level and interests, and maintainers who want contributors
cannot reach the developers who would be a good fit.

## 3. Target personas

| Persona | Need |
|---|---|
| Beginner developer | A clear, non-intimidating entry point into open source with an honest difficulty signal |
| Practising software engineer | Faster, higher-signal discovery of relevant projects than popularity rankings provide |
| DevOps / AI engineer | Ecosystem-scoped exploration of tooling in their specialty |
| Prospective contributor | To find the right project and a specific, achievable first task |
| Maintainer | Improved project visibility and better-matched contributors |

## 4. MVP scope (in)

These are the capabilities the MVP must ship. Each maps to the phase that delivers it.

| Capability | Description | Phase |
|---|---|---|
| Repository feed | A browsable, filterable feed of GitHub repositories | 4, 6 |
| Repository ingestion | Collection of repository metadata, README, topics, languages, and contributors from the GitHub API | 4 |
| GitHub authentication | Sign-in via GitHub OAuth with secure server-side sessions | 4 |
| AI summaries | Plain-language explanation of what a repository does and who it is for | 5 |
| Difficulty rating | An AI-assessed difficulty level for approaching the project | 5 |
| Technology detection | Identification of the stack and frameworks a repository uses | 5 |
| Learning-time estimate | An estimate of the time needed to become productive in the project | 5 |
| Recommendations | Personalized repository suggestions based on stated interests and activity | 7 |
| Learning paths | Ordered sequences of repositories for onboarding into a technology | 7 |
| Contribution matching | Surfacing contribution opportunities matched to skill level | 8 |
| Collections | User-curated sets of saved repositories | 7 |
| Maintainer tools | Repository claiming and verification for maintainers | 8 |

## 5. Explicitly out of scope for MVP

Recording these prevents scope creep by making the boundary explicit. Each may be reconsidered
in Phase 15 (Growth & Scale).

- Authentication providers other than GitHub (GitLab, Bitbucket, email/password)
- Organization and team accounts
- In-app messaging between contributors and maintainers
- Code review or pull request workflows inside StackLoop
- Paid tiers, billing, or any monetization
- Native mobile applications
- A public API or third-party SDK (`packages/sdk` is scaffolded for the future, not shipped)
- Content moderation tooling and the `moderator` role
- Self-hosting support

## 6. Success metrics

These define whether the MVP worked, and are evaluated at Phase 12 (Beta) and Phase 13 (Public Launch).

| Metric | Target |
|---|---|
| Activation | 40% of signed-up users save or open at least one repository in their first session |
| Discovery quality | 60% of users rate AI summaries as accurate or better |
| Contribution conversion | 10% of active users open a contribution opportunity on GitHub via StackLoop |
| Retention | 25% of beta users return in the following week |
| Ingestion coverage | 10,000 repositories with complete AI insights before public launch |
| Reliability | 99% API availability across the beta period |

## 7. Approved architecture

The Phase 3 specifications are approved as the binding architecture for implementation.
Phase 4 onward implements them as written; deviations require an ADR.

| Area | Decision | Specification |
|---|---|---|
| Repository layout | pnpm workspaces + Turborepo monorepo | [monorepo-architecture.md](./monorepo-architecture.md) |
| Frontend | Next.js, TypeScript, Tailwind CSS | [system-architecture.md](./system-architecture.md) |
| Backend | Node.js, TypeScript, Express.js | [monorepo-architecture.md](./monorepo-architecture.md) §4.2 |
| AI layer | Python, FastAPI | [system-architecture.md](./system-architecture.md) |
| Persistence | PostgreSQL via Prisma ORM | [database-schema.md](./database-schema.md) |
| Caching | Redis | [system-architecture.md](./system-architecture.md) |
| API style | REST | [api-rest-spec.md](./api-rest-spec.md) |
| Authentication | GitHub OAuth 2.1 with PKCE, server-side sessions, rotated refresh tokens | [auth-security-spec.md](./auth-security-spec.md) |
| Deployment | Docker on Azure Container Apps, GitHub Actions CI/CD | [production-infrastructure-spec.md](./production-infrastructure-spec.md) |

### Amendments

Architecture decisions that deviate from or refine the Phase 3 specs are recorded as ADRs:

- [ADR-0001: JWT signing algorithm](./adr/0001-jwt-signing-algorithm.md)

## 8. Delivery model

StackLoop is delivered in 16 sequential phases (0–15). A phase begins only after the previous
phase's exit criterion is met and recorded in the [Phase Tracker](./phase-tracker.md), which is
the single source of truth for delivery state.
