from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import get_gemini_api_key, get_current_active_user, limiter
from app.database.database import get_db
from app.models.user import User
from app.models.job_match import JobMatchReport
from app.models.resume import ResumeDocument, ResumeVersion
from app.schemas.job_match import (
    JobRequirements,
    JobRequirementsExtractRequest,
    JobMatchAnalyzeRequest,
    JobMatchReportSummary,
    JobMatchReportDetail,
    TailorResumeRequest,
    TailoredResumeDraftResponse,
    SaveTailoredResumeRequest,
    JobMatchRecommendation,
)
from app.schemas.resume import ResumeDetail, ResumeVersionDetail
from app.services.job_match_service import JobMatchService
from app.services.resume_document_service import (
    ResumeDocumentService,
    ResumeNotFoundError,
    ResumeAccessDeniedError,
)

router = APIRouter(prefix="/job-matches", tags=["Job Match Analyzer"])


@router.post(
    "/extract",
    response_model=JobRequirements,
    summary="Extract Requirements from Job Description",
    description="Parses qualifications, required/preferred technical skills, and keywords from a pasted job description.",
)
@limiter.limit("10/minute")
async def extract_job_requirements(
    request: Request,
    payload: JobRequirementsExtractRequest,
    api_key: str = Depends(get_gemini_api_key),
) -> JobRequirements:
    return await JobMatchService.extract_requirements(
        api_key=api_key,
        job_description=payload.job_description,
        job_title=payload.job_title,
        company_name=payload.company_name,
        model_name=payload.model,
    )


@router.post(
    "/analyze",
    response_model=JobMatchReportDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Analyze Resume Fit Against Job Description",
    description="Compares the candidate's exact resume version against extracted job requirements, generating explainable scores and tailored recommendations.",
)
@limiter.limit("10/minute")
async def analyze_job_match(
    request: Request,
    payload: JobMatchAnalyzeRequest,
    api_key: str = Depends(get_gemini_api_key),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> JobMatchReportDetail:
    # 1. Verify resume document ownership
    try:
        resume = ResumeDocumentService.get_resume(db=db, resume_id=payload.resume_id, user=current_user)
    except ResumeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "RESUME_NOT_FOUND", "message": "Resume document not found."},
        )
    except ResumeAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "Access denied to requested resume."},
        )

    # 2. Resolve target version
    target_version_id = payload.version_id or resume.current_version_id
    if not target_version_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "NO_RESUME_VERSION", "message": "The selected resume document has no versions."},
        )

    try:
        version = ResumeDocumentService.get_version(
            db=db,
            resume_id=resume.id,
            version_id=target_version_id,
            user=current_user,
        )
    except ResumeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "VERSION_NOT_FOUND", "message": "Resume version not found."},
        )
    except ResumeAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "Access denied to requested resume version."},
        )

    # 3. Extract requirements from job description
    effective_title = payload.job_title or payload.target_role or resume.target_role or "AI Developer"
    requirements = await JobMatchService.extract_requirements(
        api_key=api_key,
        job_description=payload.job_description,
        job_title=effective_title,
        company_name=payload.company_name,
        model_name=payload.model,
    )

    # 4. Compare resume version against requirements
    comparison = await JobMatchService.compare_resume_to_job(
        api_key=api_key,
        requirements=requirements,
        resume_version=version,
        model_name=payload.model,
    )

    # 5. Generate actionable recommendations
    recommendations = await JobMatchService.generate_recommendations(
        api_key=api_key,
        requirements=requirements,
        comparison=comparison,
        resume_version=version,
        model_name=payload.model,
    )

    # 6. Save persistent JobMatchReport
    report = JobMatchService.save_job_match_report(
        db=db,
        user=current_user,
        resume=resume,
        version=version,
        job_title=requirements.job_title,
        company_name=payload.company_name or requirements.company_name,
        job_description_raw=payload.job_description,
        requirements=requirements,
        comparison=comparison,
        recommendations=recommendations,
        model_name=payload.model or "gemini-2.5-flash",
    )

    return JobMatchReportDetail(
        id=report.id,
        resume_id=report.resume_id,
        resume_version_id=report.resume_version_id,
        job_title=report.job_title,
        company_name=report.company_name,
        job_description_raw=report.job_description_raw,
        extracted_requirements=report.extracted_requirements,
        comparison_result=report.comparison_result,
        recommendations=report.recommendations,
        overall_score=report.overall_score,
        required_skills_score=report.required_skills_score,
        keyword_score=report.keyword_score,
        scoring_version=report.scoring_version,
        model_name=report.model_name,
        status=report.status,
        retention_days=report.retention_days,
        created_at=report.created_at,
    )


@router.get(
    "",
    response_model=List[JobMatchReportSummary],
    summary="List User Job Match Reports",
    description="Retrieves a list of previous job description match analyses for the authenticated user.",
)
async def list_job_matches(
    search: Optional[str] = Query(None, description="Search term for job title or company"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[JobMatchReportSummary]:
    items, _ = JobMatchService.list_reports(
        db=db,
        user=current_user,
        search=search,
        limit=limit,
        offset=offset,
    )
    return [
        JobMatchReportSummary(
            id=r.id,
            resume_id=r.resume_id,
            resume_version_id=r.resume_version_id,
            job_title=r.job_title,
            company_name=r.company_name,
            overall_score=r.overall_score,
            required_skills_score=r.required_skills_score,
            keyword_score=r.keyword_score,
            status=r.status,
            scoring_version=r.scoring_version,
            created_at=r.created_at,
        )
        for r in items
    ]


@router.get(
    "/{report_id}",
    response_model=JobMatchReportDetail,
    summary="Get Job Match Report Details",
    description="Retrieves complete report including extracted qualifications, score breakdown, and recommendations.",
)
async def get_job_match_report(
    report_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> JobMatchReportDetail:
    report = JobMatchService.get_report(db=db, report_id=report_id, user=current_user)
    return JobMatchReportDetail(
        id=report.id,
        resume_id=report.resume_id,
        resume_version_id=report.resume_version_id,
        job_title=report.job_title,
        company_name=report.company_name,
        job_description_raw=report.job_description_raw,
        extracted_requirements=report.extracted_requirements,
        comparison_result=report.comparison_result,
        recommendations=report.recommendations,
        overall_score=report.overall_score,
        required_skills_score=report.required_skills_score,
        keyword_score=report.keyword_score,
        scoring_version=report.scoring_version,
        model_name=report.model_name,
        status=report.status,
        retention_days=report.retention_days,
        created_at=report.created_at,
    )


@router.delete(
    "/{report_id}",
    summary="Delete Job Match Report",
    description="Deletes a saved job match report owned by the authenticated user.",
)
async def delete_job_match_report(
    report_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    JobMatchService.delete_report(db=db, report_id=report_id, user=current_user)
    return {"success": True, "message": "Job match report deleted successfully."}


@router.post(
    "/{report_id}/tailor",
    response_model=TailoredResumeDraftResponse,
    summary="Synthesize Tailored Resume Draft",
    description="Applies selected accepted recommendations to produce a customized draft with before-and-after diff.",
)
async def tailor_resume_draft(
    report_id: str,
    payload: TailorResumeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> TailoredResumeDraftResponse:
    report = JobMatchService.get_report(db=db, report_id=report_id, user=current_user)

    # Fetch original resume version
    try:
        version = ResumeDocumentService.get_version(
            db=db,
            resume_id=report.resume_id,
            version_id=report.resume_version_id,
            user=current_user,
        )
    except ResumeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "VERSION_NOT_FOUND", "message": "Resume version not found."},
        )
    except ResumeAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "Access denied to requested resume version."},
        )

    recs_models = [JobMatchRecommendation.model_validate(r) for r in report.recommendations]

    tailored_data, applied, diffs = JobMatchService.synthesize_tailored_draft(
        original_resume_data=version.resume_data,
        accepted_recommendation_ids=payload.accepted_recommendation_ids,
        all_recommendations=recs_models,
        custom_edits=payload.custom_edits,
        confirmed_missing_facts=payload.confirmed_missing_facts,
    )

    return TailoredResumeDraftResponse(
        report_id=report.id,
        resume_id=report.resume_id,
        resume_version_id=report.resume_version_id,
        original_resume_data=version.resume_data,
        tailored_resume_data=tailored_data,
        applied_recommendations=applied,
        diff_summary=diffs,
    )


@router.post(
    "/{report_id}/save-tailored",
    response_model=ResumeDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Save Tailored Draft as New Version or Document",
    description="Saves the tailored resume without overwriting original versions.",
)
async def save_tailored_resume(
    report_id: str,
    payload: SaveTailoredResumeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ResumeDetail:
    report = JobMatchService.get_report(db=db, report_id=report_id, user=current_user)

    if payload.action == "new_version":
        target_resume_id = payload.target_resume_id or report.resume_id
        # Verify ownership
        try:
            ResumeDocumentService.get_resume(db=db, resume_id=target_resume_id, user=current_user)
        except ResumeNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "RESUME_NOT_FOUND", "message": "Resume document not found."},
            )
        except ResumeAccessDeniedError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "ACCESS_DENIED", "message": "Access denied to requested resume."},
            )

        try:
            new_version = ResumeDocumentService.create_version(
                db=db,
                resume_id=target_resume_id,
                user=current_user,
                resume_data=payload.tailored_resume_data,
                template_name=payload.template_name or "modern",
                page_format=payload.page_format or "letter",
                source_analysis_id=report.id,
                version_notes=payload.version_notes or f"Tailored for {report.job_title}",
            )
        except ResumeNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "RESUME_NOT_FOUND", "message": "Resume document not found."},
            )
        except ResumeAccessDeniedError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "ACCESS_DENIED", "message": "Access denied to requested resume."},
            )
        updated_resume = ResumeDocumentService.get_resume(db=db, resume_id=target_resume_id, user=current_user)
        versions_count = db.query(ResumeVersion).filter(ResumeVersion.resume_id == updated_resume.id).count()

        return ResumeDetail(
            id=updated_resume.id,
            user_id=updated_resume.user_id,
            title=updated_resume.title,
            target_role=updated_resume.target_role,
            current_version_id=updated_resume.current_version_id,
            is_archived=updated_resume.is_archived,
            versions_count=versions_count,
            created_at=updated_resume.created_at,
            updated_at=updated_resume.updated_at,
            current_version=ResumeVersionDetail(
                id=new_version.id,
                resume_id=new_version.resume_id,
                version_number=new_version.version_number,
                template_name=new_version.template_name,
                page_format=new_version.page_format,
                version_notes=new_version.version_notes,
                created_at=new_version.created_at,
                resume_data=new_version.resume_data,
                source_analysis_id=new_version.source_analysis_id,
                job_description_metadata=new_version.job_description_metadata,
            ),
        )

    else:
        # Create as brand new ResumeDocument
        new_title = payload.title or f"Tailored: {report.job_title}"
        created = ResumeDocumentService.create_resume(
            db=db,
            user=current_user,
            title=new_title,
            target_role=report.job_title,
            resume_data=payload.tailored_resume_data,
            template_name=payload.template_name or "modern",
            page_format=payload.page_format or "letter",
            source_analysis_id=report.id,
            version_notes=payload.version_notes or f"Tailored for {report.job_title}",
        )
        current_v = db.query(ResumeVersion).filter(ResumeVersion.id == created.current_version_id).first()

        return ResumeDetail(
            id=created.id,
            user_id=created.user_id,
            title=created.title,
            target_role=created.target_role,
            current_version_id=created.current_version_id,
            is_archived=created.is_archived,
            versions_count=1,
            created_at=created.created_at,
            updated_at=created.updated_at,
            current_version=ResumeVersionDetail(
                id=current_v.id,
                resume_id=current_v.resume_id,
                version_number=current_v.version_number,
                template_name=current_v.template_name,
                page_format=current_v.page_format,
                version_notes=current_v.version_notes,
                created_at=current_v.created_at,
                resume_data=current_v.resume_data,
                source_analysis_id=current_v.source_analysis_id,
                job_description_metadata=current_v.job_description_metadata,
            ) if current_v else None,
        )
