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
- GitHub OAuth authentication with PKCE, state validation, refresh-token rotation, and protected session routes
- Repository ingestion and metadata collection for GitHub repositories
- Prisma-backed persistence scaffolding for users, repositories, collections, recommendations, and activity
- Modular API structure for auth, repository collection, and data access layers

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

- Node.js 18 or later
- Python 3.10 or later
- Docker Desktop
- PostgreSQL
- Redis

### Clone the Repository

```bash
git clone https://github.com/your-org/stackloop.git
cd stackloop
```

### Install Dependencies

```bash
npm install
npm --prefix apps/api install
```

### Run the API Module

```bash
npm --prefix apps/api install
npm --prefix apps/api test
npm --prefix apps/api run build
```

If you plan to connect to a PostgreSQL database locally, initialize Prisma and run migrations:

```bash
cd apps/api
npx prisma generate --schema prisma/schema.prisma
npx prisma migrate dev --name init
```

### Start the Application

```bash
npm run dev
```

### Start the AI Service

```bash
cd services/ai
pip install -r requirements.txt
uvicorn main:app --reload
```

## Environment Variables

Create a local environment file for the application and configure the required values before running the stack.

Example:

```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/stackloop
REDIS_URL=redis://localhost:6379
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
OPENAI_API_KEY=your_api_key_here
```

> Note: The exact environment variable names may evolve as the project matures. Please review the repository configuration files for the latest requirements.

## Project Structure

```text
.
├── apps/
│   ├── web/                # Next.js frontend
│   └── api/                # TypeScript API package with auth and repository modules
│       ├── prisma/         # Prisma schema and seed data
│       ├── src/auth/       # Controllers, services, middleware, DTOs, validators
│       ├── src/repositories/ # GitHub repository collector and enrichment services
│       ├── src/database/   # Prisma client and repository abstractions
│       └── tests/          # Auth, collector, and repository unit tests
├── services/
│   └── ai/                 # FastAPI AI service
├── docs/                   # Project documentation
├── docker/                 # Docker configuration
├── .github/                # GitHub workflows and automation
└── README.md
```

### Current API surface

The current API surface includes:

- /auth/github/login
- /auth/github/callback
- /auth/logout
- /auth/refresh
- /auth/me
- /repositories/sync
- /repositories/sync/batch

### Current implementation status

The repository now includes working scaffolding for:

- GitHub OAuth login, callback handling, session creation, and refresh-token rotation
- Repository ingestion and enrichment from GitHub metadata
- Prisma schema and repository abstractions for core platform entities
- Automated tests for auth, repository collection, and database repository behavior

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

### Product Design Documents

- [Information Architecture Specification](docs/ia-information-architecture.md)
- [UX Flow Specification](docs/ux-user-flows.md)
- [Low-Fidelity Wireframe Specification](docs/wireframes-low-fidelity.md)
- [UI and Design System Specification](docs/design-system-ui-spec.md)
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