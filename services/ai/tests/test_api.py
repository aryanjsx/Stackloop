import time
import pytest
from fastapi.testclient import TestClient
from ai.main import app
from ai.config import settings
from ai.security import compute_hmac_signature
from ai.schemas import AnalyzeRepositoryRequest

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "stackloop-ai"
    assert "gemini_model" in data

def test_analyze_repository_synchronous():
    payload = {
        "repository_id": "repo-12345",
        "full_name": "facebook/react",
        "description": "The library for web and native user interfaces",
        "readme_content": "# React\nReact is a JavaScript library for building user interfaces.",
        "language": "JavaScript",
        "topics": ["javascript", "frontend", "ui", "react"]
    }
    
    response = client.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["repository_id"] == "repo-12345"
    assert data["success"] is True
    assert data["data"] is not None
    
    analysis = data["data"]
    assert "summary" in analysis
    assert len(analysis["summary"]) > 10
    assert analysis["difficulty_level"] in ["Beginner", "Intermediate", "Advanced"]
    assert analysis["onboarding_time_hours"] >= 1
    assert len(analysis["detected_technologies"]) > 0

def test_cloud_tasks_security_hmac_verification():
    payload_dict = {
        "repository_id": "repo-task-99",
        "full_name": "astral-sh/uv",
        "description": "An extremely fast Python package and project manager, written in Rust.",
        "language": "Rust",
        "topics": ["python", "rust", "packaging"]
    }
    import json
    raw_payload = json.dumps(payload_dict).encode("utf-8")
    
    # Generate timestamped signature
    timestamp = int(time.time())
    signed_content = f"{timestamp}.".encode("utf-8") + raw_payload
    import hmac
    import hashlib
    sig = hmac.new(settings.cloud_tasks_secret.encode("utf-8"), signed_content, hashlib.sha256).hexdigest()
    sig_header = f"t={timestamp},v1={sig}"
    
    response = client.post(
        "/tasks/analyze",
        content=raw_payload,
        headers={
            "Content-Type": "application/json",
            "X-StackLoop-Signature": sig_header
        }
    )
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["repository_id"] == "repo-task-99"
    assert res_data["success"] is True

def test_cloud_tasks_security_rejects_bad_signature():
    payload = {
        "repository_id": "repo-bad-sig",
        "full_name": "malicious/repo",
    }
    response = client.post(
        "/tasks/analyze",
        json=payload,
        headers={
            "X-StackLoop-Signature": "t=12345,v1=badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadb"
        }
    )
    assert response.status_code == 403
