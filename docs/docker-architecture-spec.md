# StackLoop Docker Architecture Specification

## 1. Purpose

This document defines a production-ready and developer-friendly Docker architecture for StackLoop. It covers container design, service boundaries, Dockerfiles, Compose configuration, networking, volumes, environment variables, secrets, health checks, scaling, and deployment best practices.

---

## 2. Architecture Goals

The Docker architecture should support:

- Fast local development with minimal friction
- Production-grade containerization for web, API, and worker services
- Clear service boundaries between frontend, backend, AI processing, and data services
- Secure configuration and secret handling
- Health checks and resilience
- Scalable deployment across development and production environments

---

## 3. Recommended Service Topology

### Core Services
- web: Next.js frontend application
- api: Node.js/Express backend API
- worker: background job processor for indexing, ingestion, or recommendation workflows
- ai: Python/FastAPI service for AI summarization and enrichment tasks
- postgres: PostgreSQL database
- redis: Redis cache and queue support
- nginx or reverse proxy: optional edge routing for local development or production ingress

### Container Relationships

```mermaid
flowchart LR
    User[Developer / Browser] --> Web[web container]
    Web --> API[api container]
    API --> DB[(postgres container)]
    API --> Cache[(redis container)]
    API --> Worker[worker container]
    Worker --> DB
    Worker --> Cache
    Web --> AI[ai container]
    API --> AI
```

---

## 4. Dockerfile Strategy

### General Principles
- Use multi-stage builds for smaller production images
- Separate build-time dependencies from runtime dependencies
- Avoid installing unnecessary packages
- Use non-root users where possible
- Pin versions for consistency
- Use .dockerignore to reduce build context size

### Recommended Dockerfile Pattern

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM base AS build
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm build

FROM base AS runtime
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package.json ./
RUN corepack enable && pnpm install --prod --frozen-lockfile
USER node
EXPOSE 3000
CMD ["pnpm", "start"]
```

### Notes
The exact Dockerfile will vary by service, but the same principles should be applied across web, API, and AI containers.

---

## 5. Service Definitions

### 5.1 Web Service

Purpose:
- Serves the Next.js frontend
- Handles SSR, static assets, and user interaction

Recommended runtime:
- Node.js container with production build output

Docker responsibilities:
- Build the app in a multi-stage image
- Expose port 3000
- Use environment variables for API base URL, app domain, and analytics config

Recommended environment variables:
- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_APP_URL
- NODE_ENV

Health check:
- HTTP GET on /healthz or /

### 5.2 API Service

Purpose:
- Exposes backend REST endpoints
- Handles authentication, repository data, recommendations, and business logic

Recommended runtime:
- Node.js/Express container

Docker responsibilities:
- Install runtime dependencies only
- Expose port 4000 or 8080
- Connect to PostgreSQL and Redis over internal networking

Recommended environment variables:
- PORT
- DATABASE_URL
- REDIS_URL
- JWT_SECRET
- GITHUB_CLIENT_ID
- GITHUB_CLIENT_SECRET

Health check:
- GET /healthz

### 5.3 Worker Service

Purpose:
- Runs background jobs such as indexing, sync tasks, repository processing, and notifications

Recommended runtime:
- Node.js container or a dedicated worker image

Docker responsibilities:
- Run the worker process with no public ports
- Use the same runtime dependencies as the API service
- Consume Redis queues or DB-backed job tables

Recommended environment variables:
- WORKER_MODE=true
- DATABASE_URL
- REDIS_URL

Health check:
- Internal heartbeat or process-based health reporting

### 5.4 AI Service

Purpose:
- Hosts AI processing logic for summarization, enrichment, ranking, or explanation generation

Recommended runtime:
- Python/FastAPI container

Docker responsibilities:
- Install Python dependencies only
- Expose port 8000 internally or externally depending on need
- Use environment variables for model providers and secrets

Recommended environment variables:
- PORT
- OPENAI_API_KEY
- MODEL_PROVIDER
- DATABASE_URL

Health check:
- GET /health

### 5.5 PostgreSQL Service

Purpose:
- Stores application and platform data

Recommended runtime:
- Official PostgreSQL image

Docker responsibilities:
- Mount a named volume for database persistence
- Set credentials through environment variables or secrets
- Expose internally only for non-development setups

Recommended environment variables:
- POSTGRES_DB
- POSTGRES_USER
- POSTGRES_PASSWORD

Health check:
- pg_isready

### 5.6 Redis Service

Purpose:
- Caches data and supports transient queues or high-speed state

Recommended runtime:
- Official Redis image

Docker responsibilities:
- Mount a named volume if persistence is needed
- Expose internally only in production-like setups

Recommended environment variables:
- REDIS_PASSWORD (optional)

Health check:
- redis-cli ping

---

## 6. Development Environment

### Goal
Provide a fast, developer-friendly environment that is close to production without requiring a full cloud deployment.

### Development Compose Setup

```yaml
version: "3.9"
services:
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000
      NODE_ENV: development
    volumes:
      - ./apps/web:/app
      - /app/node_modules
    depends_on:
      - api

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile.dev
    ports:
      - "4000:4000"
    environment:
      PORT: 4000
      DATABASE_URL: postgres://stackloop:stackloop@postgres:5432/stackloop
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
    volumes:
      - ./apps/api:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis

  worker:
    build:
      context: ./services/worker
      dockerfile: Dockerfile.dev
    environment:
      DATABASE_URL: postgres://stackloop:stackloop@postgres:5432/stackloop
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
    depends_on:
      - postgres
      - redis

  ai:
    build:
      context: ./services/ai
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    environment:
      PORT: 8000
      OPENAI_API_KEY: ${OPENAI_API_KEY:-dummy}
      DATABASE_URL: postgres://stackloop:stackloop@postgres:5432/stackloop
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: stackloop
      POSTGRES_USER: stackloop
      POSTGRES_PASSWORD: stackloop
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Development Environment Notes
- Mount source code into containers for fast iteration
- Use development Dockerfiles with hot reloading
- Keep database ports exposed for local debugging
- Use dummy or local secrets for convenience

---

## 7. Production Environment

### Goal
Create a secure and efficient container runtime that can be deployed in a production environment such as Azure Container Apps or another orchestrator.

### Production Compose Example

```yaml
version: "3.9"
services:
  web:
    image: ghcr.io/your-org/stackloop-web:latest
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    ports:
      - "3000:3000"
    depends_on:
      - api
    restart: unless-stopped

  api:
    image: ghcr.io/your-org/stackloop-api:latest
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
    expose:
      - "4000"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  worker:
    image: ghcr.io/your-org/stackloop-worker:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  ai:
    image: ghcr.io/your-org/stackloop-ai:latest
    environment:
      NODE_ENV: production
      PORT: 8000
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      DATABASE_URL: ${DATABASE_URL}
    expose:
      - "8000"
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Production Notes
- Use immutable images from a container registry
- Avoid mounting the source tree into production containers
- Use environment variables or secrets rather than baked-in values
- Keep the runtime minimal and resilient

---

## 8. Networking Design

### Network Strategy
Use a dedicated Docker network so services can communicate by service name.

### Recommended Network Layout
- frontend and backend communicate over an internal bridge network
- database and Redis remain private to the application stack
- only the web/API entry points are published to the host or ingress layer

### Example Network Definition

```yaml
networks:
  stackloop-net:
    driver: bridge
```

### Best Practices
- Do not expose database ports publicly in production
- Keep service-to-service communication internal where possible
- Use container names or service names rather than localhost for cross-container access

---

## 9. Volumes and Persistence

### Required Persistent Volumes
- PostgreSQL data volume
- Redis data volume
- Optional uploaded asset volume for local development

### Example Volume Configuration

```yaml
volumes:
  postgres_data:
  redis_data:
  uploads_data:
```

### Best Practices
- Use named volumes rather than bind mounts in production
- Keep data outside container layers
- Consider backup and retention policies for persistent volumes

---

## 10. Environment Variables

### Categories
- Application configuration
- Database connection strings
- Redis connection strings
- Secrets and tokens
- Feature flags

### Recommended Pattern
- Use .env for local development
- Use CI/CD-provided environment variables in CI and deployment pipelines
- Keep defaults minimal and safe

### Example Variables

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://stackloop:stackloop@postgres:5432/stackloop
REDIS_URL=redis://redis:6379
NEXT_PUBLIC_API_URL=http://localhost:4000
OPENAI_API_KEY=dummy
```

---

## 11. Secrets Management

### Local Development
- Use a .env file or docker compose environment files
- Keep secrets out of version control
- Use .env.example as a safe template

### Production
- Inject secrets from a secure secret manager such as Azure Key Vault, GitHub Actions secrets, or a cloud-native secret store
- Avoid baking secrets into images

### Best Practices
- Use environment variables for runtime secrets
- Prefer secret injection over file-based secrets when supported
- Rotate credentials regularly

---

## 12. Health Checks

### Why They Matter
Health checks allow orchestrators to understand whether a container is ready and healthy before routing traffic to it.

### Example Health Check for API

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:4000/healthz || exit 1
```

### Example Health Check for Web

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1
```

### Best Practices
- Keep health endpoints lightweight
- Distinguish readiness from liveness
- Fail fast when the service is unhealthy

---

## 13. Image Optimization

### Build Optimization Practices
- Use a minimal base image such as alpine or distroless where appropriate
- Use multi-stage builds to separate build dependencies from runtime dependencies
- Combine RUN instructions to reduce layer count
- Remove package manager caches after install
- Avoid copying unnecessary directories

### Example Optimizations
- Node images: use node:20-alpine
- Python images: use python:3.12-slim
- Remove apt lists after package install
- Use .dockerignore to keep build context small

---

## 14. Multi-Stage Builds

### Why Multi-Stage Builds Matter
Multi-stage builds reduce image size, improve build speed, and avoid shipping toolchains or build artifacts unnecessarily.

### Recommended Pattern
- Stage 1: install dependencies and build the app
- Stage 2: copy the built output and install only runtime packages
- Stage 3: run the app as a minimal runtime container

### Example Benefits
- Smaller attack surface
- Faster deployment times
- Cleaner production images

---

## 15. Scaling Strategy

### Local Development
- Compose can scale individual services when needed
- Useful for testing background workers or multiple API instances

### Production Scaling
- Scale web and API containers horizontally based on CPU, memory, or request load
- Keep workers independently scalable
- Use external services for stateful data stores rather than relying on container-local state

### Example Scaling Commands

```bash
docker compose up --scale api=2
docker compose up --scale worker=3
```

### Best Practices
- Keep stateless services horizontally scalable
- Push stateful components like PostgreSQL and Redis to dedicated services
- Avoid storing session state in ephemeral container memory in production

---

## 16. Recommended Dockerfile Examples

### Web Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM base AS build
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm build

FROM base AS runtime
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package.json ./
RUN corepack enable && pnpm install --prod --frozen-lockfile
USER node
EXPOSE 3000
CMD ["pnpm", "start"]
```

### API Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM base AS build
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm build

FROM base AS runtime
COPY --from=build /app/dist ./dist
COPY package.json ./
RUN corepack enable && pnpm install --prod --frozen-lockfile
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

### AI Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 17. Recommended Best Practices

- Use separate Dockerfiles for development and production where appropriate
- Keep images small and minimal
- Use non-root users
- Prefer health checks over blind restarts
- Use environment variables for all runtime configuration
- Avoid storing secrets in Dockerfiles or source control
- Use named volumes for stateful services
- Keep network boundaries clear and intentional
- Build once, deploy many times using immutable image tags
- Run containerized services behind a reverse proxy or ingress layer in production

---

## 18. Production Recommendations

### Suggested Production Layout
- web and api as stateless services
- worker as background task processor
- ai as an independent service with its own scaling profile
- postgres and redis as dedicated stateful services
- ingress or edge service in front of web/api

### Operational Strategy
- Deploy container images from a private registry
- Use image tags tied to Git commit or semantic version
- Collect logs and metrics from each container
- Configure restart policies and resource limits

---

## 19. Final Recommendation

StackLoop should use a modular Docker architecture with a clear separation between web, API, worker, AI, PostgreSQL, and Redis services. Development should emphasize fast iteration with bind mounts and hot reload, while production should emphasize immutable images, minimal runtime layers, private networking, health checks, secrets injection, and resilient persistence. This structure is practical for local development, straightforward to scale, and strong enough for production deployment.
