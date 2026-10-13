from unittest.mock import MagicMock
import pytest
from ai.analyzer import RepositoryAnalyzer
from ai.schemas import AnalyzeRepositoryRequest, RepositoryAnalysis

def test_analyzer_mocked_gemini_call():
    analyzer = RepositoryAnalyzer()
    
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = '''{
        "summary": "FastAPI is a modern, fast web framework for building APIs with Python.",
        "target_audience": "Backend and API engineers building Python microservices.",
        "architecture_overview": "Asynchronous ASGI framework based on Starlette and Pydantic.",
        "difficulty_level": "Beginner",
        "onboarding_time_hours": 1,
        "detected_technologies": [
            {"name": "Python", "category": "Language", "confidence": 0.99},
            {"name": "FastAPI", "category": "Framework", "confidence": 0.98},
            {"name": "Pydantic", "category": "Library", "confidence": 0.95}
        ],
        "suggested_topics": ["python", "api", "rest", "fastapi"],
        "confidence_score": 0.98
    }'''
    mock_client.models.generate_content.return_value = mock_response
    analyzer.client = mock_client
    
    req = AnalyzeRepositoryRequest(
        repository_id="repo-fastapi",
        full_name="tiangolo/fastapi",
        description="FastAPI framework, high performance, easy to learn, fast to code, ready for production",
        language="Python",
        topics=["api", "python"]
    )
    
    result = analyzer.analyze(req)
    assert isinstance(result, RepositoryAnalysis)
    assert result.difficulty_level == "Beginner"
    assert result.onboarding_time_hours == 1
    assert len(result.detected_technologies) == 3
    assert result.detected_technologies[0].name == "Python"
    assert mock_client.models.generate_content.called

def test_analyzer_heuristic_fallback_on_exception():
    analyzer = RepositoryAnalyzer()
    
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = RuntimeError("Vertex AI Quota Exceeded")
    analyzer.client = mock_client
    
    req = AnalyzeRepositoryRequest(
        repository_id="repo-fallback",
        full_name="org/project",
        language="Go",
        topics=["go", "cli"]
    )
    
    result = analyzer.analyze(req)
    assert isinstance(result, RepositoryAnalysis)
    assert "org/project" in result.summary
    assert result.confidence_score > 0.5
