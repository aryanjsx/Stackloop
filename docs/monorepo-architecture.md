# StackLoop Monorepo Architecture Specification

## 1. Architecture Goals

StackLoop is designed as a scalable, multi-team monorepo that supports web product development, backend services, AI workflows, infrastructure, documentation, and shared platform capabilities.

### Primary Goals
- Support rapid development across web, API, AI, and infrastructure layers
- Keep code ownership clear and boundaries explicit
- Make onboarding easy for 100+ contributors
- Prevent circular dependencies and coupling between domains
- Enable independent test, build, and deployment workflows
- Be compatible with Next.js, Express.js, FastAPI, PostgreSQL, Redis, Docker, Azure Container Apps, GitHub Actions, pnpm, and Turborepo

### Architectural Principles
- One repository, multiple products and services
- Clear package ownership and dependency direction
- Prefer shared packages over duplicated logic
- Keep apps thin and domain-focused
- Make infrastructure and configuration explicit and reusable
- Favor stable interfaces over internal implementation shortcuts

---

## 2. Monorepo Structure

```text
stackloop/
├── .github/
├── .vscode/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── ui/
│   ├── design-system/
│   ├── config/
│   ├── eslint-config/
│   ├── types/
│   ├── utils/
│   ├── auth/
│   ├── data-access/
│   ├── domain/
│   ├── analytics/
│   └── sdk/
├── services/
│   └── ai/
├── docs/
├── scripts/
├── configs/
├── infra/
│   ├── docker/
│   ├── azure/
│   └── terraform/
├── db/
│   ├── migrations/
│   └── seeds/
├── tests/
│   ├── e2e/
│   ├── integration/
│   └── fixtures/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── tsconfig.base.json
└── README.md
```

---

## 3. Root-Level Purpose and Responsibilities

### .github/
Purpose: CI/CD, issue templates, pull request templates, and workflow definitions.

Why it exists:
- Centralizes automation for the entire monorepo
- Makes contributor workflows consistent
- Keeps GitHub-specific configuration near the repository root

### .vscode/
Purpose: Shared editor settings and workspace recommendations.

Why it exists:
- Improves developer experience for contributors
- Reduces setup friction
- Encourages consistency in formatting and tooling

### apps/
Purpose: End-user-facing applications.

Why it exists:
- Separates product surfaces from shared libraries
- Keeps application code independent from platform infrastructure
- Supports future growth into additional frontends or admin tools

### packages/
Purpose: Reusable internal libraries used across apps and services.

Why it exists:
- Prevents duplicate logic
- Makes cross-cutting concerns shareable and testable
- Enforces modularity and better ownership boundaries

### services/
Purpose: Backend or background services that are not part of the main application shell.

Why it exists:
- Keeps AI services and other non-HTTP runtime workers isolated
- Allows independent deployment and scaling
- Prevents the main API app from becoming monolithic

### docs/
Purpose: Product design, architecture, engineering, and contributor documentation.

Why it exists:
- Supports long-term maintainability
- Makes onboarding and handoffs easier
- Keeps design and architecture artifacts close to implementation

### scripts/
Purpose: Repository automation, code generation, seed scripts, and release helpers.

Why it exists:
- Encapsulates operational tasks in a consistent location
- Avoids polluting app code with tooling logic
- Makes automation reproducible across contributors

### configs/
Purpose: Tooling and shared configuration files for linting, formatting, build, TypeScript, and environment conventions.

Why it exists:
- Centralizes cross-project conventions
- Reduces configuration drift
- Makes environment setup predictable

### infra/
Purpose: Deployment, cloud resources, containerization, and environment configuration.

Why it exists:
- Keeps operational concerns separate from application code
- Supports reproducible deployments and environment management
- Enables future infrastructure expansion

### db/
Purpose: Database schema, migrations, and seeds.

Why it exists:
- Keeps data definitions under version control
- Makes schema evolution explicit and reviewable
- Supports local development and production parity

### tests/
Purpose: Shared test utilities and higher-level test suites.

Why it exists:
- Avoids duplication of test scaffolding
- Makes end-to-end and integration testing consistent
- Supports cross-package validation

---

## 4. Application Structure

## 4.1 apps/web

Purpose: The main StackLoop web application.

Responsibilities:
- Next.js app router and page layer
- UI composition and route-level layouts
- Frontend state and client-side interactions
- Integration with platform APIs and search experiences

Why it exists:
- Keeps the user-facing experience isolated from shared platform logic
- Allows the frontend to evolve independently
- Simplifies deployment and performance tuning

Suggested structure:

```text
apps/web/
├── app/
│   ├── (marketing)
│   ├── (app)
│   ├── api/
│   └── globals.css
├── components/
├── hooks/
├── lib/
├── services/
├── styles/
├── public/
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 4.2 apps/api

Purpose: The primary backend API for the platform.

Responsibilities:
- Express.js server and route definitions
- Auth orchestration and permission checks
- Repository and discovery domain services
- Search indexing coordination
- API integration with PostgreSQL and Redis

Why it exists:
- Keeps the backend runtime isolated from the frontend app
- Enables independent deployment and scaling
- Makes internal API boundaries clearer

Suggested structure:

```text
apps/api/
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   ├── repositories/
│   ├── models/
│   ├── utils/
│   └── server.ts
├── package.json
└── tsconfig.json
```

---

## 5. Package Structure

## 5.1 packages/ui

Purpose: Shared UI primitives and composition components for applications.

Responsibilities:
- Buttons, cards, headers, forms, layout primitives, modal shell, drawer shell
- Shared page composition patterns
- Theme-aware UI primitives

Why it exists:
- Prevents duplication between web app screens
- Makes the UI consistent across apps and future surfaces

Dependencies:
- Can depend on design-system and utils
- Should not depend on app-specific modules

## 5.2 packages/design-system

Purpose: Styling tokens, theme definitions, and design primitives.

Responsibilities:
- Color tokens, spacing scale, radius, typography, motion tokens
- Theme definitions for light and dark modes
- Shared style helpers and CSS variables

Why it exists:
- Makes visual language consistent and implementation-friendly
- Enables design and engineering alignment

Dependencies:
- Should not depend on app code

## 5.3 packages/config

Purpose: Shared build, lint, test, and bundler configuration.

Responsibilities:
- Shared tsconfig, ESLint config, Tailwind config, test config
- Build helpers and common tool settings

Why it exists:
- Avoids repetitive config management
- Keeps tooling behavior consistent across packages

Dependencies:
- No dependency on business logic packages

## 5.4 packages/eslint-config

Purpose: Repository-wide linting rules.

Why it exists:
- Keeps code style consistent across packages
- Makes onboarding and CI simpler

## 5.5 packages/types

Purpose: Shared TypeScript types and DTOs used across apps and services.

Responsibilities:
- API request/response types
- Domain entity types
- Shared enums and interfaces

Why it exists:
- Prevents duplication and drift between frontend and backend typing
- Makes cross-service contracts explicit

Dependencies:
- Must not depend on implementation packages

## 5.6 packages/utils

Purpose: Small reusable utility functions.

Responsibilities:
- Formatting helpers, date utilities, string utilities, URL helpers, validation helpers

Why it exists:
- Offers low-level reuse without creating large domain packages
- Keeps app code clean

Dependencies:
- Must avoid domain-specific imports

## 5.7 packages/auth

Purpose: Authentication and identity rules.

Responsibilities:
- OAuth helpers
- Session validation utilities
- Permission rules and access checks

Why it exists:
- Keeps auth logic centralized and reusable
- Reduces duplication across frontend and backend

Dependencies:
- Can depend on types and utils
- Should avoid depending on app-specific code

## 5.8 packages/data-access

Purpose: Shared data access abstractions and client utilities.

Responsibilities:
- API client wrappers
- Query helpers
- Cache access abstraction
- Shared repository and user data logic

Why it exists:
- Keeps data fetching consistent across the web app and future clients
- Reduces boilerplate across the frontend application

Dependencies:
- Can depend on types, utils, and auth
- Should not depend on UI components

## 5.9 packages/domain

Purpose: Shared domain logic and business rules.

Responsibilities:
- Repository ranking rules
- Recommendation scoring logic
- Contribution opportunity matching logic
- Platform domain models and service interfaces

Why it exists:
- Keeps important product logic reusable and testable
- Enables the frontend and backend to share business rules without copying code

Dependencies:
- Can depend on types and utils
- Should remain free of framework-specific imports

## 5.10 packages/analytics

Purpose: Analytics and event instrumentation helpers.

Responsibilities:
- Event tracking abstractions
- Product analytics helpers
- Feature flag integration helpers

Why it exists:
- Keeps analytics implementation standardized
- Prevents event logic from being scattered across apps

## 5.11 packages/sdk

Purpose: Public or internal SDK for third-party or future platform integration.

Responsibilities:
- Client library for StackLoop APIs
- Optional public-facing developer SDK

Why it exists:
- Prepares the monorepo for future public API consumption
- Makes platform integration explicit and versioned

---

## 6. Services Structure

## 6.1 services/ai

Purpose: AI service layer for generating summaries, recommendations, and learning guidance.

Responsibilities:
- FastAPI application
- LLM prompt orchestration
- Repository summary generation
- Recommendation explanation generation
- Learning path generation

Why it exists:
- Keeps AI logic isolated from core API and web app code
- Makes model and prompt infrastructure independent
- Supports separate deployment and scaling if needed

Suggested structure:

```text
services/ai/
├── app/
│   ├── api/
│   ├── services/
│   ├── prompts/
│   ├── models/
│   └── main.py
├── requirements.txt
└── Dockerfile
```

---

## 7. Shared Libraries and Utilities

### Shared Libraries
- ui: interface primitives
- design-system: styling tokens and foundational primitives
- config: tooling and shared config
- types: cross-cutting types
- utils: common helpers
- auth: identity and permission models
- data-access: API integration helpers
- domain: product rules
- analytics: instrumentation and tracking
- sdk: future API facing client layer

### Why Shared Libraries Matter
- They reduce duplication and accelerate development
- They make cross-team collaboration easier
- They create a stable platform layer for product growth

---

## 8. Environment Configuration

### Environment Strategy
Use a layered configuration approach:
- Shared defaults in config packages
- Runtime environment variables per app or service
- Secret management through CI/CD and deployment environment systems

### Recommended Files

```text
configs/
├── env/
│   ├── .env.example
│   ├── .env.development
│   ├── .env.staging
│   └── .env.production
```

### Environment Variables by Area
- Web app: Next.js public vars and app-specific settings
- API: database, auth, Redis, queue, and service endpoints
- AI service: model provider keys, prompt config, rate limits
- Infra: Azure resource names, container settings, secret references

### Environment Rules
- Never hardcode secrets in source code
- Keep defaults minimal and safe
- Document required variables in the repo and deployment docs

---

## 9. Testing Strategy and Structure

```text
tests/
├── e2e/
│   └── web/
├── integration/
│   └── api/
├── fixtures/
│   └── sample-data/
```

### Testing Responsibilities
- Unit tests: packages and shared logic
- Integration tests: API routes, service boundaries, and data access
- End-to-end tests: critical user journeys such as discovery, authentication, save flow, and contribution flow

### Why Tests Are Part of the Architecture
- Scale requires reliability
- Shared packages need tests to avoid regressions across apps
- CI should enforce quality with minimal manual intervention

---

## 10. Infrastructure Structure

```text
infra/
├── docker/
│   ├── docker-compose.yml
│   └── Dockerfiles/
├── azure/
│   ├── container-apps/
│   └── bicep/
└── terraform/
    └── modules/
```

### Why This Exists
- Keeps deployment definitions separate from application code
- Enables reproducible environments across local, staging, and production
- Supports container-based deployment on Azure Container Apps

---

## 11. Database Structure

```text
db/
├── migrations/
├── seeds/
└── schema/
```

### Responsibilities
- Versioned database schema changes
- Seed data for development and testing
- Clear ownership of relational models

### Why This Exists
- Database changes should be reviewable and reproducible
- Schema evolution must be explicit and safe
- Multi-service environments require consistent change management

---

## 12. Naming Conventions

### General Rules
- Use lowercase kebab-case for folders and package names
- Use PascalCase for React components and TypeScript classes
- Use camelCase for functions, variables, and methods
- Use UPPER_SNAKE_CASE for environment variables and constants where appropriate

### Folder Naming
- apps/web for the web application
- apps/api for the backend application
- packages/ui for shared UI primitives
- packages/domain for business logic
- services/ai for the AI service

### File Naming
- Components: Example.tsx or Example.ts
- Hooks: useExample.ts
- Utilities: formatDate.ts or buildPath.ts
- Routes: routes.ts or route.ts
- Tests: Example.test.ts or Example.spec.ts

### Package Naming
Use the workspace package naming pattern:

```text
@stackloop/ui
@stackloop/design-system
@stackloop/types
@stackloop/utils
@stackloop/auth
@stackloop/data-access
@stackloop/domain
@stackloop/analytics
@stackloop/sdk
```

### Why Naming Matters
- It reduces cognitive load for contributors
- It improves discoverability across the repository
- It makes code navigation predictable at scale

---

## 13. Import Strategy

### Import Rules
- Apps may import shared packages and internal services
- Shared packages may import other shared packages only if they are lower in the dependency hierarchy
- Avoid importing from apps into packages
- Avoid importing UI components into domain packages
- Use package-level entry points rather than deep relative imports

### Recommended Import Pattern
```ts
import { Button } from '@stackloop/ui';
import type { RepositorySummary } from '@stackloop/types';
import { formatDate } from '@stackloop/utils';
```

### Import Boundaries
- UI packages should contain presentation-only code
- Domain packages should contain business rules and not import UI dependencies
- Data access packages should fetch data but not render UI
- Applications should orchestrate and compose, not contain business logic in route files

### Why This Matters
- It keeps architecture understandable and prevents accidental coupling
- It reduces circular dependency issues
- It supports package-level testing and independent evolution

---

## 14. Package Boundaries

### Allowed Dependencies

| Area | Can Depend On |
|---|---|
| apps/web | ui, design-system, data-access, auth, types, utils, domain, analytics |
| apps/api | auth, types, utils, domain, data-access, analytics |
| services/ai | types, utils, domain, analytics |
| packages/ui | design-system, types, utils |
| packages/design-system | none or config only |
| packages/types | none |
| packages/utils | none |
| packages/auth | types, utils |
| packages/data-access | types, utils, auth |
| packages/domain | types, utils |
| packages/analytics | types, utils |
| packages/sdk | types, utils |

### Forbidden Dependencies
- apps/web should not import from apps/api
- packages/ui should not import from apps/web
- packages/domain should not import from packages/ui
- services/ai should not import from apps/web
- packages/auth should not import from app-specific route code

### Why Boundaries Matter
- Boundaries make the monorepo predictable and maintainable
- They reduce merge conflicts and accidental coupling
- They make refactoring safer

---

## 15. Dependency Rules

### Dependency Rule 1: Dependency Direction Must Flow Inward
- Apps depend on packages
- Packages may depend on lower-level packages
- Lower-level packages should not depend on higher-level application code

### Dependency Rule 2: Avoid Shared Package Bloat
- Do not move every utility into a shared package immediately
- Start with stable, cross-cutting values and move only when reused by multiple teams

### Dependency Rule 3: Package APIs Should Be Stable
- Shared packages should expose stable entry points
- Avoid frequent breaking changes without versioning or migration plans

### Dependency Rule 4: Keep Domain Logic Framework-Agnostic
- Domain packages should not import Next.js or Express-specific constructs
- UI packages should be independent of backend concerns

### Dependency Rule 5: Feature-Level Code Should Stay Near Usage
- App-specific features can live inside apps/web or apps/api rather than in a generic shared package
- Shared packages should handle truly reusable concerns, not feature-specific implementation

---

## 16. Tooling and Workflow

### Package Manager
- pnpm

### Monorepo Tool
- Turborepo

### Build and Task Runner
Use Turborepo pipelines for:
- lint
- test
- build
- typecheck
- dev

### Suggested Turborepo Pipeline
```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "lint": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "dev": { "cache": false }
  }
}
```

### Why This Works
- It speeds up local development and CI
- It ensures dependency-aware builds
- It reduces redundant work and improves contributor efficiency

---

## 17. Contributor Workflow for 100+ Engineers

### Repository Governance
- Use CODEOWNERS to assign package ownership
- Require pull request reviews from relevant areas
- Protect main branches with required checks
- Use changesets for package release management if shared packages evolve independently

### Team Ownership Model
- Web team owns apps/web and packages/ui
- API team owns apps/api and data integration packages
- AI team owns services/ai and prompt/domain packages
- Platform team owns infra, config, and deployment workflows

### Contribution Guidelines
- Keep feature work scoped to a small set of packages
- Add tests for new shared logic
- Update docs when architecture changes
- Avoid introducing cross-package dependencies without review

### Why This Scales
- Ownership is visible and clear
- Changes are easier to review and reason about
- Shared packages do not become bottlenecks for every team

---

## 18. Implementation Recommendations

### Recommended Root-Level Scripts
```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck"
  }
}
```

### Recommended Repository Standards
- Use strict TypeScript for all packages
- Prefer ESM or consistent module interop rules across apps
- Enforce formatting with Prettier
- Use ESLint with shared rules across the repo
- Keep environment-specific configuration explicit

---

## 19. Summary

The StackLoop monorepo is designed as a scalable platform architecture that balances product delivery, shared code reuse, and long-term maintainability. It separates applications, shared libraries, services, infrastructure, and documentation into clear areas of responsibility while preserving a consistent developer experience for a large contributor base.

This structure supports:
- fast product development
- strong package boundaries
- clear ownership
- future growth into new apps, services, and integrations
- reliable collaboration across 100+ contributors
