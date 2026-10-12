from typing import List
from pydantic import BaseModel, Field


class ModelInfo(BaseModel):
    """Metadata describing a supported Gemini model option."""
    id: str = Field(..., description="API identifier for the model, e.g. gemini-2.5-flash")
    name: str = Field(..., description="Display name for the model")
    description: str = Field(..., description="Summary of capabilities and recommended use cases")
    recommended: bool = Field(default=False, description="Whether this model is recommended by default")
    is_default: bool = Field(default=False, description="Whether this is the currently configured server default")
    context_window: str = Field(default="1M tokens", description="Context window size")


class ModelsListResponse(BaseModel):
    """Response containing supported models and current default."""
    models: List[ModelInfo] = Field(..., description="List of allowed Gemini models")
    default_model: str = Field(..., description="Current default model ID")
