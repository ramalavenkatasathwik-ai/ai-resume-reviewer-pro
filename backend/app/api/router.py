from fastapi import APIRouter

from app.api.routes_health import router as health_router
from app.api.routes_models import router as models_router
from app.api.routes_keys import router as keys_router
from app.api.routes_analysis import router as analysis_router

api_router = APIRouter()

# Mount all endpoint routers
api_router.include_router(health_router)
api_router.include_router(models_router)
api_router.include_router(keys_router)
api_router.include_router(analysis_router)
