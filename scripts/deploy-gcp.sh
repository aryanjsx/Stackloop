#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# StackLoop GCP Deployment Script
# Provisions serverless infrastructure on Google Cloud Platform:
# - Cloud Run (stackloop-web, stackloop-api, stackloop-ai) with min-instances=0
# - Cloud Tasks (stackloop-ai-queue) with rate limiting
# - Artifact Registry (stackloop-repo)
# - Vertex AI / Gemini 3.8 access
# ==============================================================================

PROJECT_ID="${1:-${GOOGLE_CLOUD_PROJECT:-qwiklabs-gcp-04-1a1147d5705a}}"
REGION="${REGION:-us-central1}"
REPO_NAME="stackloop-repo"
QUEUE_NAME="stackloop-ai-queue"

echo "==========================================================="
echo " Deploying StackLoop to Google Cloud Platform"
echo " Project ID : ${PROJECT_ID}"
echo " Region     : ${REGION}"
echo "==========================================================="

# 1. Set Project
echo "[1/6] Configuring GCP project..."
gcloud config set project "${PROJECT_ID}"

# 2. Enable Required APIs
echo "[2/6] Enabling required GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudtasks.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com

# 3. Create Artifact Registry Repository (if not exists)
echo "[3/6] Ensuring Artifact Registry repository exists..."
if ! gcloud artifacts repositories describe "${REPO_NAME}" --location="${REGION}" &>/dev/null; then
  gcloud artifacts repositories create "${REPO_NAME}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="StackLoop Docker container repository"
  echo "Created Artifact Registry repository: ${REPO_NAME}"
else
  echo "Artifact Registry repository already exists."
fi

# 4. Create Cloud Tasks Queue (if not exists)
echo "[4/6] Ensuring Cloud Tasks queue exists..."
if ! gcloud tasks queues describe "${QUEUE_NAME}" --location="${REGION}" &>/dev/null; then
  gcloud tasks queues create "${QUEUE_NAME}" \
    --location="${REGION}" \
    --max-dispatches-per-second=5 \
    --max-concurrent-dispatches=10 \
    --max-attempts=5
  echo "Created Cloud Tasks queue: ${QUEUE_NAME}"
else
  echo "Cloud Tasks queue already exists."
fi

REGISTRY_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

# 5. Build & Deploy Services
# A. Deploy StackLoop AI Microservice
echo "[5/6] Building and deploying AI microservice (services/ai)..."
AI_IMAGE="${REGISTRY_URL}/stackloop-ai:latest"
gcloud builds submit services/ai --tag "${AI_IMAGE}"

gcloud run deploy stackloop-ai \
  --image="${AI_IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=3 \
  --cpu=1 \
  --memory=1Gi \
  --set-env-vars="ENVIRONMENT=production,GEMINI_MODEL=gemini-2.5-flash,GCP_PROJECT=${PROJECT_ID}"

AI_SERVICE_URL=$(gcloud run services describe stackloop-ai --region="${REGION}" --format='value(status.url)')
echo "AI Microservice deployed at: ${AI_SERVICE_URL}"

# B. Deploy StackLoop Core API
echo "Building and deploying Core API (apps/api)..."
API_IMAGE="${REGISTRY_URL}/stackloop-api:latest"
gcloud builds submit --config=apps/api/cloudbuild.yaml . || \
gcloud builds submit --tag "${API_IMAGE}" -f apps/api/Dockerfile .

gcloud run deploy stackloop-api \
  --image="${API_IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=5 \
  --cpu=1 \
  --memory=512Mi \
  --set-env-vars="NODE_ENV=production,AI_SERVICE_URL=${AI_SERVICE_URL}"

API_SERVICE_URL=$(gcloud run services describe stackloop-api --region="${REGION}" --format='value(status.url)')
echo "Core API deployed at: ${API_SERVICE_URL}"

# C. Deploy StackLoop Web Frontend
echo "Building and deploying Web Frontend (apps/web)..."
WEB_IMAGE="${REGISTRY_URL}/stackloop-web:latest"
gcloud builds submit --tag "${WEB_IMAGE}" -f apps/web/Dockerfile .

gcloud run deploy stackloop-web \
  --image="${WEB_IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=5 \
  --cpu=1 \
  --memory=512Mi \
  --set-env-vars="NODE_ENV=production,NEXT_PUBLIC_API_URL=${API_SERVICE_URL}"

WEB_SERVICE_URL=$(gcloud run services describe stackloop-web --region="${REGION}" --format='value(status.url)')

# 6. Summary
echo "==========================================================="
echo " StackLoop Deployment Complete! ✅"
echo " All services configured with min-instances=0 (Scales to 0)"
echo ""
echo " Web Frontend   : ${WEB_SERVICE_URL}"
echo " Core API       : ${API_SERVICE_URL}"
echo " AI Service     : ${AI_SERVICE_URL}"
echo "==========================================================="
