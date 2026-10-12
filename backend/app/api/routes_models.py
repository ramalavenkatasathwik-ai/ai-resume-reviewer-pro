from fastapi import APIRouter, status

from app.core.config import get_settings
from app.schemas.models import ModelInfo, ModelsListResponse

settings = get_settings()

router = APIRouter(tags=["Models"])

MODEL_METADATA = {
    "gemini-2.5-flash": {
        "name": "Gemini 2.5 Flash",
        "description": "Latest flagship Flash model with enhanced reasoning and high-fidelity structured output.",
        "recommended": True,
        "context_window": "1M tokens",
    },
    "gemini-2.0-flash": {
        "name": "Gemini 2.0 Flash",
        "description": "Ultra-fast multimodal model engineered for high-throughput, low-latency evaluation.",
        "recommended": False,
        "context_window": "1M tokens",
    },
    "gemini-1.5-flash": {
        "name": "Gemini 1.5 Flash",
        "description": "High-efficiency multimodal model for rapid parsing and resume scoring.",
        "recommended": False,
        "context_window": "1M tokens",
    },
    "gemini-1.5-pro": {
        "name": "Gemini 1.5 Pro",
        "description": "Deep reasoning model suited for comprehensive career strategy and executive dossiers.",
        "recommended": False,
        "context_window": "2M tokens",
    },
}


@router.get(
    "/models",
    response_model=ModelsListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Supported Gemini Models",
    description="Returns the server allowlist of permitted Gemini model identifiers and default model.",
)
async def list_models() -> ModelsListResponse:
    """Returns supported Gemini models for user selection."""
    models_list = []
    for model_id in settings.SUPPORTED_MODELS:
        meta = MODEL_METADATA.get(
            model_id,
            {
                "name": model_id,
                "description": "Verified Google Gemini model option.",
                "recommended": False,
                "context_window": "1M tokens",
            },
        )
        models_list.append(
            ModelInfo(
                id=model_id,
                name=meta["name"],
                description=meta["description"],
                recommended=meta["recommended"],
                is_default=(model_id == settings.GEMINI_MODEL),
                context_window=meta["context_window"],
            )
        )

    return ModelsListResponse(
        models=models_list,
        default_model=settings.GEMINI_MODEL,
    )
