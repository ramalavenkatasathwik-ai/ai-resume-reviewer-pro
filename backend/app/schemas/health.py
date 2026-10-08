from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Current service health status")
    service: str = Field(default="ai-resume-reviewer-api", description="Service name identifier")
