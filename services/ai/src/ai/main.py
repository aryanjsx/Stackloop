import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
import httpx

from .config import settings
from .schemas import (
    AnalyzeRepositoryRequest, 
    AnalyzeRepositoryResponse, 
    RepositoryAnalysis
)
from .security import verify_task_security
from .analyzer import analyzer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("stackloop-ai")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting StackLoop AI Service on environment={settings.environment}, model={settings.gemini_model}")
    yield
    logger.info("Shutting down StackLoop AI Service.")

app = FastAPI(
    title="StackLoop AI Engine",
    version="0.1.0",
    description="Gemini 3.8 powered repository discovery & architectural analysis service",
    lifespan=lifespan,
)

@app.get("/health", tags=["Monitoring"])
async def health_check():
    """Liveness and readiness check for Cloud Run and orchestrators."""
    return {
        "status": "ok",
        "service": "stackloop-ai",
        "environment": settings.environment,
        "gemini_model": settings.gemini_model,
        "client_ready": analyzer.client is not None,
        "gcp_project": settings.gcp_project,
    }

@app.post(
    "/analyze", 
    response_model=AnalyzeRepositoryResponse,
    tags=["Analysis"]
)
async def analyze_repository(request: AnalyzeRepositoryRequest):
    """
    Synchronously analyze a repository using Gemini 3.8.
    Extracts summary, difficulty level, onboarding time, and technology breakdown.
    """
    try:
        analysis = analyzer.analyze(request)
        return AnalyzeRepositoryResponse(
            repository_id=request.repository_id,
            success=True,
            data=analysis,
            model_used=settings.gemini_model,
        )
    except Exception as e:
        logger.error(f"Error analyzing repository {request.full_name}: {e}", exc_info=True)
        return AnalyzeRepositoryResponse(
            repository_id=request.repository_id,
            success=False,
            model_used=settings.gemini_model,
            error=str(e),
        )

@app.post(
    "/tasks/analyze",
    response_model=AnalyzeRepositoryResponse,
    dependencies=[Depends(verify_task_security)],
    tags=["Cloud Tasks"]
)
async def handle_cloud_task(request: AnalyzeRepositoryRequest):
    """
    Asynchronous Cloud Tasks webhook handler for repository enrichment.
    Verifies HMAC security header, runs the Gemini analysis, and reports
    completion back to the StackLoop API.
    """
    logger.info(f"Received Cloud Tasks enrichment job for repository: {request.full_name} ({request.repository_id})")
    
    try:
        analysis = analyzer.analyze(request)
        
        # Optionally notify backend of job completion
        if settings.backend_api_url:
            callback_url = f"{settings.backend_api_url}/internal/repositories/{request.repository_id}/ai-summary"
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.post(
                        callback_url,
                        json={
                            "repository_id": request.repository_id,
                            "summary": analysis.summary,
                            "model": settings.gemini_model,
                            "confidence": analysis.confidence_score,
                            "technologies": [t.model_dump() for t in analysis.detected_technologies],
                        },
                        headers={"X-Internal-Secret": settings.cloud_tasks_secret}
                    )
            except Exception as notify_err:
                logger.warning(f"Failed to notify backend at {callback_url}: {notify_err}")

        return AnalyzeRepositoryResponse(
            repository_id=request.repository_id,
            success=True,
            data=analysis,
            model_used=settings.gemini_model,
        )
    except Exception as e:
        logger.error(f"Failed processing Cloud Task for {request.repository_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )

def main():
    import uvicorn
    uvicorn.run("ai.main:app", host=settings.host, port=settings.port, reload=not settings.is_production)

if __name__ == "__main__":
    main()
