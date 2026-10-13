from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_

from app.models.analysis import AnalysisHistory, AnalysisReport


class AnalysisHistoryService:
    """Isolated data-access layer for persisting and retrieving resume review records."""

    @staticmethod
    def record_analysis(
        db: Session,
        filename: str,
        target_role: str,
        status: str = "completed",
        analysis_type: str = "resume",
        overall_score: Optional[int] = None,
        ats_score: Optional[int] = None,
        result_json: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        source_type: str = "pdf",
        model_name: Optional[str] = None,
        prompt_version: Optional[str] = None,
        token_usage: Optional[Dict[str, Any]] = None,
        estimated_cost: Optional[float] = None,
        error_category: Optional[str] = None,
        error_message: Optional[str] = None,
        completed_at: Optional[datetime] = None,
        stored_file_id: Optional[str] = None,
    ) -> AnalysisHistory:
        """Creates and commits an analysis history record in the database."""
        if status == "completed" and completed_at is None:
            completed_at = datetime.now(timezone.utc)

        record = AnalysisHistory(
            original_filename=filename,
            target_role=target_role,
            status=status,
            analysis_type=analysis_type,
            source_type=source_type,
            overall_score=overall_score,
            ats_score=ats_score,
            result_json=result_json,
            user_id=user_id,
            model_name=model_name,
            prompt_version=prompt_version,
            llm_usage=token_usage,
            estimated_cost=estimated_cost,
            error_category=error_category,
            error_message=error_message,
            completed_at=completed_at,
            stored_file_id=stored_file_id,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get_by_id(db: Session, record_id: str, user_id: Optional[str] = None) -> Optional[AnalysisHistory]:
        """Retrieves a single review record by ID, optionally verifying ownership."""
        statement = select(AnalysisHistory).where(AnalysisHistory.id == record_id)
        if user_id is not None:
            statement = statement.where(
                or_(AnalysisHistory.user_id == user_id, AnalysisHistory.user_id.is_(None))
            )
        return db.scalar(statement)

    @staticmethod
    def get_latest(db: Session, user_id: Optional[str] = None, only_unauthenticated: bool = False) -> Optional[AnalysisHistory]:
        """Retrieves the most recent analysis record."""
        statement = select(AnalysisHistory).order_by(AnalysisHistory.created_at.desc())
        if user_id is not None:
            statement = statement.where(AnalysisHistory.user_id == user_id)
        elif only_unauthenticated:
            statement = statement.where(AnalysisHistory.user_id.is_(None))
        return db.scalars(statement).first()

    @staticmethod
    def list_records(
        db: Session,
        limit: int = 20,
        offset: int = 0,
        analysis_type: Optional[str] = None,
        source_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        user_id: Optional[str] = None,
        only_unauthenticated: bool = False,
    ) -> List[AnalysisHistory]:
        """Lists historical review records ordered by creation date descending with filters."""
        statement = select(AnalysisHistory).order_by(AnalysisHistory.created_at.desc())
        if user_id is not None:
            statement = statement.where(AnalysisHistory.user_id == user_id)
        elif only_unauthenticated:
            statement = statement.where(AnalysisHistory.user_id.is_(None))

        if analysis_type:
            statement = statement.where(AnalysisHistory.analysis_type == analysis_type)
        if source_type:
            statement = statement.where(AnalysisHistory.source_type == source_type)
        if status:
            statement = statement.where(AnalysisHistory.status == status)
        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            statement = statement.where(
                or_(
                    func.lower(AnalysisHistory.original_filename).like(term),
                    func.lower(AnalysisHistory.target_role).like(term),
                )
            )

        statement = statement.offset(offset).limit(limit)
        return list(db.scalars(statement).all())

    @staticmethod
    def count_records(
        db: Session,
        analysis_type: Optional[str] = None,
        source_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        user_id: Optional[str] = None,
        only_unauthenticated: bool = False,
    ) -> int:
        """Counts historical review records matching the specified filters."""
        statement = select(func.count(AnalysisHistory.id))
        if user_id is not None:
            statement = statement.where(AnalysisHistory.user_id == user_id)
        elif only_unauthenticated:
            statement = statement.where(AnalysisHistory.user_id.is_(None))

        if analysis_type:
            statement = statement.where(AnalysisHistory.analysis_type == analysis_type)
        if source_type:
            statement = statement.where(AnalysisHistory.source_type == source_type)
        if status:
            statement = statement.where(AnalysisHistory.status == status)
        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            statement = statement.where(
                or_(
                    func.lower(AnalysisHistory.original_filename).like(term),
                    func.lower(AnalysisHistory.target_role).like(term),
                )
            )

        return db.scalar(statement) or 0

    @staticmethod
    def delete_record(db: Session, record_id: str, user_id: Optional[str] = None) -> bool:
        """Deletes an analysis record, verifying ownership if user_id is provided."""
        record = db.query(AnalysisHistory).filter(AnalysisHistory.id == record_id).first()
        if not record:
            return False
        if user_id is not None and record.user_id != user_id:
            return False
        db.delete(record)
        db.commit()
        return True
