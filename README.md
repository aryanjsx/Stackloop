# StackLoop

<p align="center">
  <img src="./assets/banner.png" alt="StackLoop banner" />
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Version-0.1.0-orange.svg" alt="Version" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Status-Alpha-yellow.svg" alt="Status" /></a>
  <a href="docs/"><img src="https://img.shields.io/badge/Docs-Available-brightgreen.svg" alt="Docs" /></a>
</p>

StackLoop is an AI-powered developer discovery platform designed to help developers discover, understand, learn from, and contribute to open-source projects with greater clarity and confidence.

Unlike traditional discovery tools such as GitHub Trending or Daily.dev, StackLoop combines repository intelligence, AI-generated summaries, personalized recommendations, learning paths, contribution opportunities, and repository insights into a single developer experience.

## Vision

StackLoop exists to make open source more approachable, more discoverable, and more rewarding for developers at every stage of their journey. Our goal is to become a central platform where developers can move from discovery to understanding to contribution without friction.

## Features

- AI-generated repository summaries and insights
- Personalized project recommendations based on developer interests and goals
- Beginner-friendly explanations of complex repositories
- Guided learning paths for onboarding into new technologies and communities
- Contribution opportunities tailored to skill level and experience
- Repository health and contribution insights for maintainers and contributors
- A focused experience for discovering meaningful open-source projects

> These describe the product StackLoop is being built to deliver. For what actually works today,
> see [Current implementation status](#current-implementation-status).

## Why StackLoop?

Open source can be difficult to navigate, especially for beginners. Many projects are hard to understand, poorly documented, and difficult to evaluate before contributing. StackLoop addresses that challenge by making repository discovery smarter, more contextual, and more actionable.

StackLoop is built for:

- Beginner developers looking for a clear entry point into open source
- Software engineers seeking better project discovery
- DevOps and AI engineers exploring relevant ecosystems
- Contributors who want to find the right project faster
- Maintainers who want to improve project visibility and engagement

<!-- ## Screenshots

<p align="center">
  <img src="https://via.placeholder.com/1200x680?text=StackLoop%20Dashboard%20Preview" alt="StackLoop dashboard preview" />
</p> -->

## Demo

A live demo will be available soon. In the meantime, the project is being developed with a focus on a polished developer experience and strong documentation standards.

## Tech Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- TypeScript
- Prisma ORM

### AI Layer
- Python
- FastAPI
- Large Language Models

### Data & Infrastructure
- PostgreSQL
- Redis
- Docker
- Azure Container Apps
- GitHub Actions

## Architecture Overview

StackLoop is composed of a modern web frontend, service-oriented backend APIs, an AI processing layer, and supporting data infrastructure.

### High-Level Architecture

- The frontend provides the user experience for browsing repositories, reading insights, and exploring recommendations.
- The API layer now includes modular authentication, repository collection, and Prisma-backed persistence services.
- The AI layer generates summaries, learning paths, and contribution guidance from repository context.
- PostgreSQL stores core application data, while Redis provides caching and performance optimization.
- Docker and Azure Container Apps support containerized deployment and scalable hosting.

### Design Principles

- Developer-first experience
- Clear and explainable AI outputs
- Fast, intuitive repository discovery
- Extensible architecture for future capabilities
- Strong contributor and maintainer ergonomics

## Getting Started

StackLoop is currently under active development. The following instructions are intended to help contributors get a local environment running quickly.

## Local Installation

### Prerequisites

- Node.js 20 or later
- pnpm 10 or later (`npm install -g pnpm`)
- PostgreSQL 14 or later

Python, Docker, and Redis are listed in the architecture documents but are not yet needed:
the AI service and container configuration have not been built.

### Clone and install

```bash
git clone https://github.com/your-org/stackloop.git
cd stackloop
pnpm install
```

This repository uses pnpm workspaces. Installing with npm or yarn will not link the workspace
correctly.

### Configure the environment

```bash
cp configs/env/.env.example .env
```

Then fill in the required values. Every variable is documented inline in that file.

To obtain the GitHub credentials, register an OAuth application at
**GitHub → Settings → Developer settings → OAuth Apps**. Set the authorization callback URL to
exactly the value you use for `GITHUB_REDIRECT_URI`.

Generate a signing secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The API validates its configuration on startup and exits with a list of every problem if
anything is missing or unsafe, rather than starting with insecure defaults.

### Set up the database

```bash
createdb stackloop

cd apps/api
pnpm exec prisma migrate deploy   # apply the checked-in migration
pnpm exec prisma generate         # generate the typed client
```

Use `pnpm exec prisma migrate dev` instead when you are changing the schema and want a new
migration generated.

### Run the API

```bash
pnpm --filter @stackloop/api dev
```

The API listens on `PORT` (default 3001). Check it is up:

```bash
curl http://localhost:3001/health
```

### Run the checks

```bash
pnpm test        # all workspace tests
pnpm typecheck   # TypeScript, no emit
pnpm build       # compile
```

## Environment Variables

The single source of truth is [`configs/env/.env.example`](configs/env/.env.example), which
documents each variable inline. Summary:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development`, `test`, or `production` |
| `PORT` | no | `3001` | Port the API listens on |
| `WEB_APP_ORIGIN` | no | `http://localhost:3000` | Origin of the web app |
| `DATABASE_URL` | **yes** | — | PostgreSQL connection string |
| `GITHUB_CLIENT_ID` | **yes** | — | OAuth app client id |
| `GITHUB_CLIENT_SECRET` | **yes** | — | OAuth app client secret |
| `GITHUB_REDIRECT_URI` | **yes** | — | Must match the callback URL registered with GitHub |
| `GITHUB_TOKEN` | no | — | PAT for repository ingestion; raises the rate limit to 5000/hour |
| `GITHUB_API_BASE_URL` | no | `https://api.github.com` | GitHub REST base URL |
| `JWT_SIGNING_SECRET` | **yes** | — | HS256 secret, minimum 32 characters |
| `JWT_ISSUER` | no | `stackloop` | Token `iss` claim, validated on every request |
| `JWT_AUDIENCE` | no | `stackloop-api` | Token `aud` claim, validated on every request |
| `ACCESS_TOKEN_TTL_SECONDS` | no | `900` | Access token lifetime |
| `REFRESH_TOKEN_TTL_SECONDS` | no | `2592000` | Refresh token lifetime |
| `OAUTH_STATE_TTL_SECONDS` | no | `600` | How long an unfinished login stays valid |

In production the API additionally refuses to start if `JWT_SIGNING_SECRET` is a known
placeholder, or if `GITHUB_REDIRECT_URI` or `WEB_APP_ORIGIN` use plain `http`.

`REDIS_URL` and `OPENAI_API_KEY` appeared in earlier versions of this file but are not read by
any code yet. They will return with Phase 10 and Phase 5 respectively.

## Project Structure

This is what the repository contains today. The larger target layout, including `apps/web`,
`packages/*`, `services/ai`, and `infra/`, is described in the
[monorepo architecture spec](docs/monorepo-architecture.md).

```text
.
├── apps/
│   └── api/                        # Express API (TypeScript, ESM)
│       ├── prisma/
│       │   ├── schema.prisma       # 23 models
│       │   └── migrations/         # Checked-in SQL migrations
│       ├── src/
│       │   ├── auth/               # OAuth, tokens, sessions, middleware
│       │   ├── config/             # Validated environment configuration
│       │   ├── database/           # Prisma client and repository abstractions
│       │   ├── middleware/         # Error handling
│       │   ├── repositories/       # GitHub ingestion
│       │   ├── app.ts              # Application composition
│       │   └── server.ts           # Process entrypoint
│       └── tests/
├── configs/env/                    # Environment templates
├── docs/                           # Product, architecture, and delivery documents
├── .github/                        # Issue and PR templates, CODEOWNERS
├── pnpm-workspace.yaml
└── turbo.json
```

### Current API surface

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | none | Liveness check |
| `GET` | `/auth/github/login` | none | Begin GitHub OAuth |
| `GET` | `/auth/github/callback` | none | Complete OAuth, create session |
| `POST` | `/auth/refresh` | refresh token | Rotate tokens |
| `POST` | `/auth/logout` | required | Revoke the caller's session |
| `GET` | `/auth/me` | required | Current user |
| `POST` | `/repositories/sync` | admin | Ingest one repository |
| `POST` | `/repositories/sync/batch` | admin | Ingest up to 50 repositories |

Full request and response shapes, error codes, cookie flags, and rate limits are documented in
the [Authentication Endpoints reference](docs/api-auth-endpoints.md).

### Current implementation status

StackLoop is in **Phase 4 (Core Backend Development)**. The
[Phase Tracker](docs/phase-tracker.md) is the authoritative status of every deliverable.

Implemented and tested:

- GitHub OAuth with server-side, single-use, expiring authorization state and S256 PKCE
- HS256 access and refresh tokens with verified signatures and enforced `exp`, `iss`, and `aud`
- PostgreSQL-backed sessions and refresh tokens, with rotation on every use and session
  revocation when a spent token is replayed
- Authentication, role-based authorization, CSRF, and rate-limiting middleware on the routes
- Repository ingestion from the GitHub API, persisted through Prisma
- Prisma schema and a checked-in initial migration

Still outstanding in this phase:

- The migration has not been applied to a live PostgreSQL instance, so the database-backed paths
  are verified by their contracts and tests rather than against a running database.
- The summary and search-index job queues are stubs; they report `queued: false`.

Not started: the web frontend, the AI service, Redis, container configuration, and CI workflows.

## Development Workflow

1. Create a feature branch from main.
2. Make focused changes with clear intent.
3. Write or update tests where applicable.
4. Run linting and relevant checks locally.
5. Open a pull request with a clear summary and validation details.

Example:

```bash
git checkout -b feature/your-feature
git commit -m "feat: add repository insight summary"
git push origin feature/your-feature
```

## Roadmap

StackLoop is planned to evolve through the following stages:

- Phase 1: Repository discovery and AI summaries
- Phase 2: Personalized recommendations and learning pathways
- Phase 3: Contribution opportunity matching and onboarding flows
- Phase 4: Community engagement and maintainer insights
- Phase 5: Expanded integrations and richer intelligence

## Contributing

Contributions are welcome. Whether you are fixing a bug, improving documentation, or proposing a new idea, we appreciate thoughtful and well-scoped contributions.

Before contributing, please review the project guidelines and open an issue for discussion when appropriate.

### Contribution Guidelines

- Follow the existing code style and project conventions
- Keep changes focused and well documented
- Write clear commit messages
- Include tests where practical
- Be respectful and constructive in discussions

## Community

Join the StackLoop community to share feedback, ask questions, and help shape the platform.

- GitHub Discussions
- Issues and feature requests
- Community updates and announcements

## Documentation

Documentation is an essential part of the StackLoop project. As the platform evolves, the documentation will expand to cover:

- Architecture and system design
- Contributor onboarding
- API references
- Deployment guides
- Product and usage documentation

### Product and Delivery Documents

- [Product Requirements Document](docs/prd.md)
- [Phase Tracker](docs/phase-tracker.md) — the source of truth for what is built and what is planned
- [Architecture Decision Records](docs/adr/)

### Product Design Documents

- [Information Architecture Specification](docs/ia-information-architecture.md)
- [UX Flow Specification](docs/ux-user-flows.md)
- [Low-Fidelity Wireframe Specification](docs/wireframes-low-fidelity.md)
- [UI and Design System Specification](docs/design-system-ui-spec.md)
- [Authentication Endpoints Reference](docs/api-auth-endpoints.md)
- [Monorepo Architecture Specification](docs/monorepo-architecture.md)
- [System Architecture Specification](docs/system-architecture.md)
- [Database Schema Specification](docs/database-schema.md)
- [REST API Specification](docs/api-rest-spec.md)
- [Authentication and Authorization Specification](docs/auth-security-spec.md)
- [Production Infrastructure Specification](docs/production-infrastructure-spec.md)
- [CI/CD Pipeline Specification](docs/cicd-pipeline-spec.md)
- [Docker Architecture Specification](docs/docker-architecture-spec.md)
- [Data Flow Architecture Specification](docs/data-flow-architecture-spec.md)

## License

StackLoop is licensed under the Apache License 2.0.

See the [LICENSE](LICENSE) file for more details.

## Acknowledgements

StackLoop is inspired by the broader open-source ecosystem and the many developers who contribute to software every day. We are grateful to the communities, tools, and platforms that continue to make open source possible.