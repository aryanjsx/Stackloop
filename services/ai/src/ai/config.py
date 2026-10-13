import os
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Settings:
    port: int = int(os.getenv("PORT", "8000"))
    host: str = os.getenv("HOST", "0.0.0.0")
    environment: str = os.getenv("ENVIRONMENT", os.getenv("NODE_ENV", "development"))
    
    # Gemini / Vertex AI configuration
    gemini_api_key: Optional[str] = os.getenv("GEMINI_API_KEY")
    gcp_project: str = os.getenv("GCP_PROJECT", os.getenv("GOOGLE_CLOUD_PROJECT", "qwiklabs-gcp-04-1a1147d5705a"))
    gcp_location: str = os.getenv("GCP_LOCATION", "us-central1")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    # Security: Cloud Tasks HMAC signing secret
    cloud_tasks_secret: str = os.getenv("CLOUD_TASKS_SECRET", "stackloop-internal-task-secret-key-32chars")
    
    # Backend callback URL
    backend_api_url: str = os.getenv("BACKEND_API_URL", "http://localhost:4000")
    
    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

settings = Settings()
