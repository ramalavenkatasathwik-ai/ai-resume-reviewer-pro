from fastapi import APIRouter

from app.api.routes_health import router as health_router
from app.api.routes_models import router as models_router
from app.api.routes_keys import router as keys_router
from app.api.routes_analysis import router as analysis_router
from app.api.routes_analyses import router as analyses_router
from app.api.routes_linkedin import router as linkedin_router
from app.api.routes_auth import router as auth_router
from app.api.routes_resumes import router as resumes_router
from app.api.routes_files import router as files_router
from app.api.routes_job_match import router as job_match_router

api_router = APIRouter()

# Mount all endpoint routers
api_router.include_router(health_router)
api_router.include_router(models_router)
api_router.include_router(keys_router)
api_router.include_router(analysis_router)
api_router.include_router(analyses_router)
api_router.include_router(linkedin_router)
api_router.include_router(auth_router)
api_router.include_router(resumes_router)
api_router.include_router(files_router)
api_router.include_router(job_match_router)
