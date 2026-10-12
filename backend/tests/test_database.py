import pytest
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.analysis import AnalysisHistory
from app.services.analysis_history_service import AnalysisHistoryService


def test_create_analysis_history_record(test_db_session: Session) -> None:
    """Verify creating a valid AnalysisHistory record in the database."""
    record = AnalysisHistoryService.record_analysis(
        db=test_db_session,
        filename="software_engineer_resume.pdf",
        target_role="Full Stack Developer",
        status="completed",
        overall_score=85,
        ats_score=90,
        result_json={"summary": "Great match"},
    )

    assert record.id is not None
    assert record.original_filename == "software_engineer_resume.pdf"
    assert record.target_role == "Full Stack Developer"
    assert record.status == "completed"
    assert record.overall_score == 85
    assert record.ats_score == 90
    assert record.result_json == {"summary": "Great match"}
    assert record.created_at is not None
    assert record.updated_at is not None


def test_get_by_id_and_list_records(test_db_session: Session) -> None:
    """Verify querying records by ID and listing history records."""
    rec1 = AnalysisHistoryService.record_analysis(
        db=test_db_session,
        filename="resume1.pdf",
        target_role="DevOps Engineer",
        status="completed",
        overall_score=78,
    )
    rec2 = AnalysisHistoryService.record_analysis(
        db=test_db_session,
        filename="resume2.pdf",
        target_role="Data Scientist",
        status="completed",
        overall_score=88,
    )

    found = AnalysisHistoryService.get_by_id(test_db_session, rec1.id)
    assert found is not None
    assert found.id == rec1.id
    assert found.target_role == "DevOps Engineer"

    records = AnalysisHistoryService.list_records(test_db_session, limit=10)
    assert len(records) >= 2


def test_score_check_constraints(test_db_session: Session) -> None:
    """Verify that scores outside the 0-100 range violate database check constraints."""
    invalid_record = AnalysisHistory(
        original_filename="bad_score.pdf",
        target_role="QA Lead",
        status="completed",
        overall_score=150,  # Invalid: > 100
    )
    test_db_session.add(invalid_record)
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()
