from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_optional_current_user, get_current_active_user
from app.database.database import get_db
from app.models.user import User
from app.schemas.analysis import (
    AnalysisReportSummary,
    AnalysisReportDetail,
    AnalysisReportListResponse,
)
from app.services.analysis_history_service import AnalysisHistoryService

router = APIRouter(prefix="/analyses", tags=["Analysis Reports"])


@router.get(
    "",
    response_model=AnalysisReportListResponse,
    summary="List Analysis Reports (Paginated)",
    description="Lists analysis reports for the authenticated user (or unauthenticated sessions) with search and filters.",
)
async def list_analyses(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term across filename or target role"),
    analysis_type: Optional[str] = Query(None, description="Filter: 'resume' or 'linkedin'"),
    source_type: Optional[str] = Query(None, description="Filter: 'pdf', 'url', 'text'"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter: 'completed', 'failed', 'processing'"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> AnalysisReportListResponse:
    user_id = current_user.id if current_user else None
    only_unauthenticated = current_user is None
    offset = (page - 1) * page_size

    total = AnalysisHistoryService.count_records(
        db=db,
        analysis_type=analysis_type,
        source_type=source_type,
        status=status_filter,
        search=search,
        user_id=user_id,
        only_unauthenticated=only_unauthenticated,
    )

    records = AnalysisHistoryService.list_records(
        db=db,
        limit=page_size,
        offset=offset,
        analysis_type=analysis_type,
        source_type=source_type,
        status=status_filter,
        search=search,
        user_id=user_id,
        only_unauthenticated=only_unauthenticated,
    )

    items = [
        AnalysisReportSummary(
            id=r.id,
            original_filename=r.original_filename,
            filename=r.original_filename,
            source_type=r.source_type or "pdf",
            analysis_type=r.analysis_type or "resume",
            target_role=r.target_role,
            status=r.status,
            overall_score=r.overall_score,
            ats_score=r.ats_score,
            model_name=r.model_name,
            created_at=r.created_at,
            completed_at=r.completed_at,
        )
        for r in records
    ]

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return AnalysisReportListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/latest",
    response_model=AnalysisReportDetail,
    summary="Get Latest Analysis Report",
    description="Retrieves the single most recent analysis record for the current session or user.",
)
async def get_latest_analysis(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> AnalysisReportDetail:
    user_id = current_user.id if current_user else None
    only_unauthenticated = current_user is None

    record = AnalysisHistoryService.get_latest(
        db=db,
        user_id=user_id,
        only_unauthenticated=only_unauthenticated,
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "REPORT_NOT_FOUND", "message": "No recent analysis reports found."},
        )

    return AnalysisReportDetail(
        id=record.id,
        original_filename=record.original_filename,
        filename=record.original_filename,
        source_type=record.source_type or "pdf",
        analysis_type=record.analysis_type or "resume",
        target_role=record.target_role,
        status=record.status,
        overall_score=record.overall_score,
        ats_score=record.ats_score,
        model_name=record.model_name,
        created_at=record.created_at,
        completed_at=record.completed_at,
        result_json=record.result_json,
        prompt_version=record.prompt_version,
        token_usage=record.token_usage,
        estimated_cost=record.estimated_cost,
        error_category=record.error_category,
        error_message=record.error_message,
        stored_file_id=record.stored_file_id,
    )


@router.get(
    "/{report_id}",
    response_model=AnalysisReportDetail,
    summary="Get Analysis Report Details",
    description="Retrieves complete structured analysis evaluation report by ID.",
)
async def get_analysis_report(
    report_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> AnalysisReportDetail:
    user_id = current_user.id if current_user else None
    record = AnalysisHistoryService.get_by_id(db=db, record_id=report_id, user_id=user_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "REPORT_NOT_FOUND", "message": "Analysis report not found or access denied."},
        )

    return AnalysisReportDetail(
        id=record.id,
        original_filename=record.original_filename,
        filename=record.original_filename,
        source_type=record.source_type or "pdf",
        analysis_type=record.analysis_type or "resume",
        target_role=record.target_role,
        status=record.status,
        overall_score=record.overall_score,
        ats_score=record.ats_score,
        model_name=record.model_name,
        created_at=record.created_at,
        completed_at=record.completed_at,
        result_json=record.result_json,
        prompt_version=record.prompt_version,
        token_usage=record.token_usage,
        estimated_cost=record.estimated_cost,
        error_category=record.error_category,
        error_message=record.error_message,
        stored_file_id=record.stored_file_id,
    )


@router.delete(
    "/{report_id}",
    summary="Delete Analysis Report",
    description="Deletes an analysis report owned by the authenticated user.",
)
async def delete_analysis_report(
    report_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    deleted = AnalysisHistoryService.delete_record(db=db, record_id=report_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "REPORT_NOT_FOUND", "message": "Analysis report not found or access denied."},
        )
    return {"success": True, "message": "Analysis report deleted successfully."}
