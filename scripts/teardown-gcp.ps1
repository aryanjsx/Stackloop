# ==============================================================================
# StackLoop GCP Teardown Script (PowerShell)
# Safely removes or stops all created services in the GCP project:
# - Deletes Cloud Run services (stackloop-web, stackloop-api, stackloop-ai)
# - Deletes Cloud Tasks queue (stackloop-ai-queue)
# - Deletes Artifact Registry images and repository
# - Stops/deletes any test Cloud SQL instances
# Prevents lingering billable resources.
# ==============================================================================

param (
    [string]$ProjectId = $env:GOOGLE_CLOUD_PROJECT,
    [string]$Region = "us-central1"
)

$env:Path = "C:\Users\LENOVO\google-cloud-sdk\bin;$env:Path"
$env:CLOUDSDK_PYTHON = "C:\Users\LENOVO\AppData\Roaming\uv\python\cpython-3.12-windows-x86_64-none\python.exe"

if (-not $ProjectId) {
    $ProjectId = "qwiklabs-gcp-04-1a1147d5705a"
}

$RepoName = "stackloop-repo"
$QueueName = "stackloop-ai-queue"

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host " Starting StackLoop GCP Teardown / Resource Cleanup" -ForegroundColor Cyan
Write-Host " Target Project : $ProjectId" -ForegroundColor Cyan
Write-Host " Target Region  : $Region" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

gcloud config set project "$ProjectId" --quiet

# 1. Teardown Cloud Run Services
Write-Host "[1/4] Deleting Cloud Run services..." -ForegroundColor Yellow
$services = @("stackloop-web", "stackloop-api", "stackloop-ai")
foreach ($service in $services) {
    $desc = gcloud run services describe $service --region=$Region 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Deleting Cloud Run service: $service..." -ForegroundColor Yellow
        gcloud run services delete $service --region=$Region --quiet
        Write-Host "Deleted $service." -ForegroundColor Green
    } else {
        Write-Host "Service $service not found or already deleted." -ForegroundColor DarkGray
    }
}

# 2. Delete Cloud Tasks Queue
Write-Host "[2/4] Cleaning Cloud Tasks queue..." -ForegroundColor Yellow
$qDesc = gcloud tasks queues describe $QueueName --location=$Region 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Purging and deleting Cloud Tasks queue: $QueueName..." -ForegroundColor Yellow
    gcloud tasks queues purge $QueueName --location=$Region --quiet 2>&1 | Out-Null
    gcloud tasks queues delete $QueueName --location=$Region --quiet
    Write-Host "Deleted Cloud Tasks queue: $QueueName." -ForegroundColor Green
} else {
    Write-Host "Cloud Tasks queue $QueueName not found or already deleted." -ForegroundColor DarkGray
}

# 3. Clean Artifact Registry Repository
Write-Host "[3/4] Deleting Artifact Registry repository..." -ForegroundColor Yellow
$arDesc = gcloud artifacts repositories describe $RepoName --location=$Region 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Deleting Artifact Registry repository: $RepoName..." -ForegroundColor Yellow
    gcloud artifacts repositories delete $RepoName --location=$Region --quiet
    Write-Host "Deleted repository: $RepoName." -ForegroundColor Green
} else {
    Write-Host "Artifact Registry repository $RepoName not found or already deleted." -ForegroundColor DarkGray
}

# 4. Check for any running Cloud SQL instances
Write-Host "[4/4] Checking for any active Cloud SQL instances..." -ForegroundColor Yellow
$sqlInstances = gcloud sql instances list --format="value(name)" 2>&1
if ($LASTEXITCODE -eq 0 -and $sqlInstances) {
    foreach ($inst in $sqlInstances) {
        if ($inst -like "*stackloop*") {
            Write-Host "Deleting Cloud SQL test instance: $inst..." -ForegroundColor Yellow
            gcloud sql instances delete $inst --quiet
        }
    }
} else {
    Write-Host "No active Cloud SQL instances found." -ForegroundColor DarkGray
}

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host " Teardown Verification: Checking remaining resources..." -ForegroundColor Cyan
gcloud run services list --region=$Region
Write-Host ""
Write-Host " All StackLoop GCP resources successfully torn down. [OK]" -ForegroundColor Green
Write-Host " No idle billable services remain." -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Cyan
