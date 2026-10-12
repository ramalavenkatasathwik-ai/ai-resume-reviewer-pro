from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.analysis import AnalysisHistory


class AnalysisHistoryService:
    """Isolated data-access layer for persisting and retrieving resume review records."""

    @staticmethod
    def record_analysis(
        db: Session,
        filename: str,
        target_role: str,
        status: str = "completed",
        overall_score: Optional[int] = None,
        ats_score: Optional[int] = None,
        result_json: Optional[Dict[str, Any]] = None,
    ) -> AnalysisHistory:
        """Creates and commits an analysis history record in the database."""
        record = AnalysisHistory(
            original_filename=filename,
            target_role=target_role,
            status=status,
            overall_score=overall_score,
            ats_score=ats_score,
            result_json=result_json,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get_by_id(db: Session, record_id: str) -> Optional[AnalysisHistory]:
        """Retrieves a single review record by its primary key ID."""
        statement = select(AnalysisHistory).where(AnalysisHistory.id == record_id)
        return db.scalar(statement)

    @staticmethod
    def list_records(
        db: Session,
        limit: int = 20,
        offset: int = 0,
    ) -> List[AnalysisHistory]:
        """Lists historical review records ordered by creation date descending."""
        statement = (
            select(AnalysisHistory)
            .order_by(AnalysisHistory.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(db.scalars(statement).all())
