from typing import List, Optional
from pydantic import BaseModel, Field

class TechnologyItem(BaseModel):
    name: str = Field(..., description="Name of the detected programming language, library, framework, or tool")
    category: str = Field(..., description="Category, e.g. Language, Framework, Database, Infrastructure, Library, Testing")
    confidence: float = Field(default=0.9, ge=0.0, le=1.0, description="Confidence score from 0.0 to 1.0")

class RepositoryAnalysis(BaseModel):
    summary: str = Field(..., description="Executive architectural summary and key capabilities of the repository")
    target_audience: str = Field(..., description="Ideal developer audience or user persona")
    architecture_overview: str = Field(..., description="High-level architectural pattern (e.g. Microservices, Monorepo, Jamstack)")
    difficulty_level: str = Field(default="Intermediate", description="Complexity: Beginner, Intermediate, Advanced")
    onboarding_time_hours: int = Field(default=2, ge=1, le=100, description="Estimated hours to set up and run locally")
    detected_technologies: List[TechnologyItem] = Field(default_factory=list, description="Extracted technologies and tools")
    suggested_topics: List[str] = Field(default_factory=list, description="Taxonomy topics or tags for discovery")
    confidence_score: float = Field(default=0.92, ge=0.0, le=1.0, description="Overall confidence score")

class AnalyzeRepositoryRequest(BaseModel):
    repository_id: str
    full_name: str
    description: Optional[str] = None
    readme_content: Optional[str] = None
    language: Optional[str] = None
    topics: List[str] = Field(default_factory=list)

class AnalyzeRepositoryResponse(BaseModel):
    repository_id: str
    success: bool
    data: Optional[RepositoryAnalysis] = None
    model_used: str
    error: Optional[str] = None
