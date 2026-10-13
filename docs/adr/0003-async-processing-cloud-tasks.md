# ADR-0003: Asynchronous Job Processing (Cloud Tasks vs Pub/Sub)

- **Status:** Accepted
- **Date:** 2026-10-13
- **Phase:** 0 (Audit and Decisions)
- **Amends:** [system-architecture.md](../system-architecture.md) §4.3

---

## Context

StackLoop requires asynchronous execution for two critical workflows:
1. **Repository Ingestion:** Fetching metadata, README, languages, and commit history from the GitHub REST API without blocking the HTTP caller.
2. **AI Summarization & Analysis:** Generating structured summaries, technology tags, and difficulty ratings using Gemini LLM models.

We must decide between **Google Cloud Tasks** and **Google Cloud Pub/Sub** as the asynchronous dispatch mechanism for MVP.

---

## Comparison: Cloud Tasks vs Pub/Sub

| Feature | Google Cloud Tasks | Google Cloud Pub/Sub |
|---|---|---|
| **Invocation Model** | **Targeted HTTP POST** directly to service URL | Publisher/Subscriber fan-out messaging |
| **Worker Model** | Direct push to Cloud Run HTTP endpoints (scales on demand) | Pull subscriber daemon or Push subscription |
| **Concurrency Control** | Built-in `max_concurrent_dispatches` and `max_dispatches_per_second` | Requires application-level flow control |
| **Rate Limiting** | **Native** (prevents exhausting GitHub API or Gemini rate limits) | Not native (subscriber handles throttling) |
| **Deduplication** | **Native** by Task Name (idempotent enqueueing) | Message ID tracking in external DB |
| **Task Scheduling** | Native delayed execution (`schedule_time`) | Supported via Cloud Scheduler / delay hacks |
| **Operational Cost** | First 1,000,000 tasks/month free; zero idle cost | First 10 GB/month free; requires running receiver |

---

## Decision

We adopt **Google Cloud Tasks** as the primary asynchronous task execution engine for StackLoop MVP.

### Rationale:
1. **GitHub API & Model Rate Protection:** Cloud Tasks queues allow strict enforcement of dispatch rates (e.g., max 5 tasks/sec), guaranteeing that batch ingestion does not exceed GitHub API quotas (5,000 req/hr) or Gemini token rate limits.
2. **Point-to-Point Execution:** The AI summarization pipeline is a point-to-point task (1 repository = 1 summary job directed to the AI service endpoint). It does not require multi-consumer event fan-out.
3. **Task Deduplication:** Cloud Tasks uniquely names tasks based on the repository ID (`repo-summary-<repoId>-<commitHash>`), natively preventing duplicate concurrent AI jobs.
4. **Serverless Invocation:** Cloud Tasks invokes Cloud Run services over standard HTTP with OIDC authentication tokens, removing the need for a continuously running worker daemon.

---

## Consequences

- Pub/Sub is deferred until multi-subscriber event streams (e.g., public webhooks, analytics telemetry fan-out) are required.
- The `queueProducer` stub in `apps/api/src/server.ts` will be implemented as a Cloud Tasks client in production and a local in-process queue during development and testing.
