<#
.SYNOPSIS
  StackLoop GCP Deployment Script for PowerShell / Windows
#>
param(
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
Write-Host " Deploying StackLoop to Google Cloud Platform" -ForegroundColor Cyan
Write-Host " Project ID : $ProjectId" -ForegroundColor Green
Write-Host " Region     : $Region" -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Cyan

# 1. Set Project
Write-Host "[1/6] Configuring GCP project..." -ForegroundColor Yellow
gcloud config set project $ProjectId --quiet

# 2. Enable APIs
Write-Host "[2/6] Enabling required GCP APIs..." -ForegroundColor Yellow
gcloud services enable `
  run.googleapis.com `
  cloudtasks.googleapis.com `
  artifactregistry.googleapis.com `
  aiplatform.googleapis.com `
  secretmanager.googleapis.com `
  cloudbuild.googleapis.com `
  --quiet

# 3. Artifact Registry
Write-Host "[3/6] Ensuring Artifact Registry repository exists..." -ForegroundColor Yellow
gcloud artifacts repositories describe $RepoName --location=$Region --quiet 2>$null
if ($LASTEXITCODE -ne 0) {
  gcloud artifacts repositories create $RepoName --repository-format=docker --location=$Region --description="StackLoop Docker repository" --quiet
}

# 4. Cloud Tasks Queue
Write-Host "[4/6] Ensuring Cloud Tasks queue exists..." -ForegroundColor Yellow
gcloud tasks queues describe $QueueName --location=$Region --quiet 2>$null
if ($LASTEXITCODE -ne 0) {
  gcloud tasks queues create $QueueName --location=$Region --max-dispatches-per-second=5 --max-concurrent-dispatches=10 --max-attempts=5 --quiet
}

$RegistryUrl = "${Region}-docker.pkg.dev/${ProjectId}/${RepoName}"

# 5. Build and Deploy AI Microservice
Write-Host "[5/6] Building and Deploying AI microservice (services/ai)..." -ForegroundColor Yellow
$AiImage = "${RegistryUrl}/stackloop-ai:latest"
gcloud builds submit services/ai --tag $AiImage --quiet

gcloud run deploy stackloop-ai `
  --image=$AiImage `
  --region=$Region `
  --platform=managed `
  --allow-unauthenticated `
  --min-instances=0 `
  --max-instances=3 `
  --cpu=1 `
  --memory=1Gi `
  --set-env-vars="ENVIRONMENT=production,GEMINI_MODEL=gemini-2.5-flash,GCP_PROJECT=$ProjectId" `
  --quiet

$AiServiceUrl = (gcloud run services describe stackloop-ai --region=$Region --format='value(status.url)')
Write-Host "AI Service deployed at: $AiServiceUrl" -ForegroundColor Green

# 6. Deploy Core API
Write-Host "Building and Deploying Core API (apps/api)..." -ForegroundColor Yellow
$ApiImage = "${RegistryUrl}/stackloop-api:latest"
gcloud builds submit --tag $ApiImage -f apps/api/Dockerfile . --quiet

gcloud run deploy stackloop-api `
  --image=$ApiImage `
  --region=$Region `
  --platform=managed `
  --allow-unauthenticated `
  --min-instances=0 `
  --max-instances=5 `
  --cpu=1 `
  --memory=512Mi `
  --set-env-vars="NODE_ENV=production,AI_SERVICE_URL=$AiServiceUrl,GCP_PROJECT=$ProjectId,CLOUD_TASKS_QUEUE=$QueueName" `
  --quiet

$ApiServiceUrl = (gcloud run services describe stackloop-api --region=$Region --format='value(status.url)')
Write-Host "Core API deployed at: $ApiServiceUrl" -ForegroundColor Green

# 7. Deploy Web Frontend
Write-Host "Building and Deploying Web Frontend (apps/web)..." -ForegroundColor Yellow
$WebImage = "${RegistryUrl}/stackloop-web:latest"
gcloud builds submit --tag $WebImage -f apps/web/Dockerfile . --quiet

gcloud run deploy stackloop-web `
  --image=$WebImage `
  --region=$Region `
  --platform=managed `
  --allow-unauthenticated `
  --min-instances=0 `
  --max-instances=5 `
  --cpu=1 `
  --memory=512Mi `
  --set-env-vars="NODE_ENV=production,NEXT_PUBLIC_API_URL=$ApiServiceUrl" `
  --quiet

$WebServiceUrl = (gcloud run services describe stackloop-web --region=$Region --format='value(status.url)')

# Update API service with Web App Origin and Frontend Redirect URI
gcloud run services update stackloop-api `
  --region=$Region `
  --update-env-vars="WEB_APP_ORIGIN=$WebServiceUrl,GITHUB_REDIRECT_URI=${WebServiceUrl}/auth/callback" `
  --quiet

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host " StackLoop Deployment Complete! All services min-instances=0" -ForegroundColor Green
Write-Host " Web Frontend : $WebServiceUrl" -ForegroundColor White
Write-Host " Core API     : $ApiServiceUrl" -ForegroundColor White
Write-Host " AI Service   : $AiServiceUrl" -ForegroundColor White
Write-Host "===========================================================" -ForegroundColor Cyan
