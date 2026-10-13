# ADR-0002: Cloud Hosting Platform Selection (GCP vs Azure)

- **Status:** Accepted
- **Date:** 2026-10-13
- **Phase:** 0 (Audit and Decisions)
- **Amends:** [production-infrastructure-spec.md](../production-infrastructure-spec.md) §3

---

## Context

The initial infrastructure specification (`docs/production-infrastructure-spec.md`) specified Microsoft Azure (Azure Container Apps, Azure Database for PostgreSQL, Azure Blob Storage, Azure Front Door).

The project sponsor and user have requested deploying and evaluating on **Google Cloud Platform (GCP)** with Gemini AI integration. A concrete hosting decision is required before provisioning cloud resources.

---

## Options Considered

### Option A: Microsoft Azure (Documented Target)
- **Compute:** Azure Container Apps (ACA)
- **Database:** Azure Database for PostgreSQL Flexible Server
- **AI Integration:** Azure OpenAI Service or external model calls
- **Pros:** Matches existing markdown spec in `docs/production-infrastructure-spec.md`.
- **Cons:** Higher idle cost (Flexible Server minimum ~$15–30/mo without burstable stop), cold starts on ACA consumption tier, separate billing/network routing for Gemini model inference.

### Option B: Google Cloud Platform (Recommended Candidate)
- **Compute:** Google Cloud Run (Fully managed serverless containers)
- **Database:** Google Cloud SQL for PostgreSQL (or disposable container / Neon serverless for low-cost dev)
- **AI Integration:** Native Vertex AI / Google GenAI SDK (Gemini 3.8 / 2.5) with direct IAM / ADC integration
- **Async Execution:** Google Cloud Tasks for HTTP-based retryable worker tasks
- **Secrets:** Google Secret Manager
- **Pros:**
  1. **True Scale-to-Zero:** Cloud Run scales completely to zero instances when idle, incurring $0 compute cost.
  2. **Native Gemini Synergy:** Vertex AI and Gemini APIs authenticate transparently via GCP Application Default Credentials without external API key management.
  3. **Zero Maintenance Queues:** Cloud Tasks eliminates the need to run and pay for a dedicated Redis/Celery/RabbitMQ cluster for asynchronous worker jobs.
  4. **Direct Qwiklabs Alignment:** Seamless execution inside the user's allocated Qwiklabs project (`qwiklabs-gcp-04-1a1147d5705a`).
- **Cons:** Requires updating infrastructure specs and configuring GCP IAM service accounts.

---

## Decision

We adopt **Google Cloud Platform (GCP)** as the primary cloud hosting environment for StackLoop MVP.

### Component Mapping:
| Architectural Role | Azure Documented | GCP Adopted |
|---|---|---|
| Web App | Azure Container Apps | Google Cloud Run (`apps/web`) |
| API Backend | Azure Container Apps | Google Cloud Run (`apps/api`) |
| AI Service | Azure Container Apps | Google Cloud Run (`services/ai`) |
| Database | Azure PostgreSQL Flexible | Cloud SQL for PostgreSQL / Dev DB |
| Asynchronous Jobs | Azure Queue Storage / Redis | Google Cloud Tasks |
| Secrets | Azure Key Vault | Google Secret Manager |
| AI Inference | Azure OpenAI | Vertex AI / Gemini 3.8 / 2.5 Flash |

---

## Consequences

- **Cost Optimization:** Serverless containers and pay-per-token model inference avoid ongoing idle bills during low activity.
- **Teardown Simplicity:** Stopping the MVP services is as simple as deleting or scaling down Cloud Run services and pausing Cloud SQL.
- **Documentation:** `docs/production-infrastructure-spec.md` is preserved as historical reference and superseded by this ADR for all active deployment scripts.
