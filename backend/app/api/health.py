"""Backward-compatibility module re-exporting router from routes_health."""
from app.api.routes_health import router

__all__ = ["router"]
