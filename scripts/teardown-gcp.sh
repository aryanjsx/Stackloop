#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# StackLoop GCP Teardown Script
# Safely removes or stops all created services in the GCP project:
# - Deletes Cloud Run services (stackloop-web, stackloop-api, stackloop-ai)
# - Deletes Cloud Tasks queue (stackloop-ai-queue)
# - Deletes Artifact Registry images and repository
# - Stops/deletes any test Cloud SQL instances
# Prevents lingering billable resources.
# ==============================================================================

PROJECT_ID="${1:-${GOOGLE_CLOUD_PROJECT:-qwiklabs-gcp-04-1a1147d5705a}}"
REGION="${REGION:-us-central1}"
REPO_NAME="stackloop-repo"
QUEUE_NAME="stackloop-ai-queue"

echo "==========================================================="
echo " Starting StackLoop GCP Teardown / Resource Cleanup"
echo " Target Project : ${PROJECT_ID}"
echo " Target Region  : ${REGION}"
echo "==========================================================="

gcloud config set project "${PROJECT_ID}" --quiet

# 1. Teardown Cloud Run Services
echo "[1/4] Deleting Cloud Run services..."
for service in stackloop-web stackloop-api stackloop-ai; do
  if gcloud run services describe "${service}" --region="${REGION}" &>/dev/null; then
    echo "Deleting Cloud Run service: ${service}..."
    gcloud run services delete "${service}" --region="${REGION}" --quiet
    echo "Deleted ${service}."
  else
    echo "Service ${service} not found or already deleted."
  fi
done

# 2. Delete Cloud Tasks Queue
echo "[2/4] Cleaning Cloud Tasks queue..."
if gcloud tasks queues describe "${QUEUE_NAME}" --location="${REGION}" &>/dev/null; then
  echo "Purging and deleting Cloud Tasks queue: ${QUEUE_NAME}..."
  gcloud tasks queues purge "${QUEUE_NAME}" --location="${REGION}" --quiet || true
  gcloud tasks queues delete "${QUEUE_NAME}" --location="${REGION}" --quiet
  echo "Deleted Cloud Tasks queue: ${QUEUE_NAME}."
else
  echo "Cloud Tasks queue ${QUEUE_NAME} not found or already deleted."
fi

# 3. Clean Artifact Registry Repository
echo "[3/4] Deleting Artifact Registry repository..."
if gcloud artifacts repositories describe "${REPO_NAME}" --location="${REGION}" &>/dev/null; then
  echo "Deleting Artifact Registry repository: ${REPO_NAME}..."
  gcloud artifacts repositories delete "${REPO_NAME}" --location="${REGION}" --quiet
  echo "Deleted repository: ${REPO_NAME}."
else
  echo "Artifact Registry repository ${REPO_NAME} not found or already deleted."
fi

# 4. Check for any running Cloud SQL instances
echo "[4/4] Checking for any active Cloud SQL instances..."
SQL_INSTANCES=$(gcloud sql instances list --format="value(name)" 2>/dev/null || true)
if [ -n "${SQL_INSTANCES}" ]; then
  for inst in ${SQL_INSTANCES}; do
    if [[ "${inst}" == *"stackloop"* ]]; then
      echo "Deleting Cloud SQL test instance: ${inst}..."
      gcloud sql instances delete "${inst}" --quiet
    fi
  done
else
  echo "No active Cloud SQL instances found."
fi

echo "==========================================================="
echo " Teardown Verification: Checking remaining resources..."
gcloud run services list --region="${REGION}"
echo ""
echo " All StackLoop GCP resources successfully torn down. ✅"
echo " No idle billable services remain."
echo "==========================================================="
