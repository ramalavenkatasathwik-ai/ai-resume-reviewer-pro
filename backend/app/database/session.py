"""Backward-compatibility module re-exporting from database and base."""
from app.database.base import Base, TimestampMixin
from app.database.database import SessionLocal, engine, get_db, check_db_connection

__all__ = ["Base", "TimestampMixin", "SessionLocal", "engine", "get_db", "check_db_connection"]
