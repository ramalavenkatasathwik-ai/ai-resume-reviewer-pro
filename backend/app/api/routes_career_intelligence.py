from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import (
    get_current_active_user,
    get_optional_gemini_api_key,
    limiter,
)
from app.database.database import get_db
from app.models.user import User
from app.schemas.career_intelligence import (
    GenerateRoleVariantRequest,
    RoleVariantDraftResponse,
    SaveRoleVariantRequest,
    CompareVariantsRequest,
    VariantComparisonResponse,
    WritingSuggestionRequest,
    WritingSuggestionResponse,
    GenerateRoadmapRequest,
    SaveRoadmapRequest,
    CareerRoadmapResponse,
    MultiRoleCompareRequest,
    MultiRoleCompareResponse,
    SaveMultiRoleCompareRequest,
    ProjectRecommendRequest,
    ProjectRecommendResponse,
)
from app.schemas.resume import ResumeDetail, ResumeVersionDetail
from app.services.career_intelligence_service import CareerIntelligenceService
from app.services.resume_document_service import ResumeDocumentService

router = APIRouter(prefix="/career", tags=["Career Intelligence"])


# ---------------------------------------------------------------------------
# 1. Multi-Version Resume Generator
# ---------------------------------------------------------------------------

@router.post(
    "/variants/generate",
    response_model=RoleVariantDraftResponse,
    summary="Generate Role-Specific Resume Variant",
    description="Creates a tailored resume draft optimized for a target role without fabricating credentials.",
)
@limiter.limit("15/minute")
async def generate_role_variant(
    request: Request,
    payload: GenerateRoleVariantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    api_key: Optional[str] = Depends(get_optional_gemini_api_key),
) -> RoleVariantDraftResponse:
    return await CareerIntelligenceService.generate_role_variant(
        db=db,
        user=current_user,
        resume_id=payload.resume_id,
        target_role=payload.target_role,
        resume_version_id=payload.resume_version_id,
        job_description=payload.job_description,
        focus_areas=payload.focus_areas,
        api_key=api_key,
        model_name=payload.model_name,
    )


@router.post(
    "/variants/save",
    summary="Save Role-Specific Resume Variant",
    description="Saves a tailored draft either as a new version or as an independent new document.",
)
async def save_role_variant(
    payload: SaveRoleVariantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if payload.save_as_new_document or not payload.resume_id:
        # Create brand-new resume document
        resume = ResumeDocumentService.create_resume(
            db=db,
            user=current_user,
            title=payload.title,
            target_role=payload.target_role,
            resume_data=payload.resume_data,
            version_notes=payload.version_notes or f"Generated variant for {payload.target_role}",
        )
        return {
            "status": "created",
            "document_id": resume.id,
            "title": resume.title,
            "target_role": resume.target_role,
            "current_version_id": resume.current_version_id,
        }
    else:
        # Append as a new version of the existing document
        version = ResumeDocumentService.create_version(
            db=db,
            resume_id=payload.resume_id,
            user=current_user,
            resume_data=payload.resume_data,
            version_notes=payload.version_notes or f"Role variant: {payload.target_role}",
        )
        return {
            "status": "version_appended",
            "document_id": payload.resume_id,
            "version_id": version.id,
            "version_number": version.version_number,
            "version_notes": version.version_notes,
        }


@router.post(
    "/variants/compare",
    response_model=VariantComparisonResponse,
    summary="Compare Two Resume Variants Side-by-Side",
    description="Returns a structured diff highlighting changes between base resume and a variant.",
)
async def compare_variants(
    payload: CompareVariantsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> VariantComparisonResponse:
    return CareerIntelligenceService.compare_variants(
        db=db,
        user=current_user,
        base_version_id=payload.base_version_id,
        variant_version_id=payload.variant_version_id,
        base_resume_data=payload.base_resume_data,
        variant_resume_data=payload.variant_resume_data,
    )


# ---------------------------------------------------------------------------
# 2. Advanced AI Writing Assistant
# ---------------------------------------------------------------------------

@router.post(
    "/writing/suggest",
    response_model=WritingSuggestionResponse,
    summary="Get Writing Assistant Suggestions",
    description="Refines career content for any of the 8 supported sections with action verbs and metric validation.",
)
@limiter.limit("20/minute")
async def get_writing_suggestions(
    request: Request,
    payload: WritingSuggestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    api_key: Optional[str] = Depends(get_optional_gemini_api_key),
) -> WritingSuggestionResponse:
    return await CareerIntelligenceService.generate_writing_suggestions(
        db=db,
        user=current_user,
        section=payload.section,
        target_role=payload.target_role,
        current_text=payload.current_text,
        resume_id=payload.resume_id,
        resume_version_id=payload.resume_version_id,
        job_description=payload.job_description,
        instruction=payload.instruction,
        api_key=api_key,
        model_name=payload.model_name,
    )


# ---------------------------------------------------------------------------
# 3. Personalized Career Roadmap
# ---------------------------------------------------------------------------

@router.post(
    "/roadmap/generate",
    response_model=CareerRoadmapResponse,
    summary="Generate Personalized Career Roadmap",
    description="Builds an actionable progression plan including skill gaps, learning objectives, and milestones.",
)
@limiter.limit("10/minute")
async def generate_career_roadmap(
    request: Request,
    payload: GenerateRoadmapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    api_key: Optional[str] = Depends(get_optional_gemini_api_key),
) -> CareerRoadmapResponse:
    return await CareerIntelligenceService.generate_career_roadmap(
        db=db,
        user=current_user,
        target_role=payload.target_role,
        resume_id=payload.resume_id,
        resume_version_id=payload.resume_version_id,
        current_level=payload.current_level,
        target_level=payload.target_level,
        job_description=payload.job_description,
        api_key=api_key,
        model_name=payload.model_name,
    )


@router.post(
    "/roadmap/save",
    response_model=CareerRoadmapResponse,
    summary="Save Career Roadmap",
    description="Persists a generated career roadmap to the database.",
)
async def save_career_roadmap(
    payload: SaveRoadmapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CareerRoadmapResponse:
    roadmap = CareerIntelligenceService.save_roadmap(
        db=db,
        user=current_user,
        target_role=payload.target_role,
        strengths=payload.strengths,
        skill_gaps=payload.skill_gaps,
        potential_undocumented_skills=payload.potential_undocumented_skills,
        learning_topics=payload.learning_topics,
        practical_projects=payload.practical_projects,
        portfolio_improvements=payload.portfolio_improvements,
        certifications=payload.certifications,
        action_items=payload.action_items,
        short_term_milestones=payload.short_term_milestones,
        medium_term_milestones=payload.medium_term_milestones,
        resume_id=payload.resume_id,
        resume_version_id=payload.resume_version_id,
        current_level=payload.current_level,
        target_level=payload.target_level,
        disclaimer=payload.disclaimer,
    )
    return CareerRoadmapResponse(
        id=roadmap.id,
        user_id=roadmap.user_id,
        resume_id=roadmap.resume_id,
        resume_version_id=roadmap.resume_version_id,
        target_role=roadmap.target_role,
        current_level=roadmap.current_level,
        target_level=roadmap.target_level,
        strengths=roadmap.strengths,
        skill_gaps=roadmap.skill_gaps,
        potential_undocumented_skills=roadmap.potential_undocumented_skills,
        learning_topics=roadmap.learning_topics,
        practical_projects=roadmap.practical_projects,
        portfolio_improvements=roadmap.portfolio_improvements,
        certifications=roadmap.certifications,
        action_items=roadmap.action_items,
        short_term_milestones=roadmap.short_term_milestones,
        medium_term_milestones=roadmap.medium_term_milestones,
        disclaimer=roadmap.disclaimer,
        created_at=roadmap.created_at,
    )


@router.get(
    "/roadmaps",
    response_model=List[CareerRoadmapResponse],
    summary="List User Roadmaps",
    description="Retrieves all career roadmaps created by the authenticated user.",
)
async def list_roadmaps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[CareerRoadmapResponse]:
    roadmaps = CareerIntelligenceService.list_roadmaps(db=db, user=current_user)
    return [
        CareerRoadmapResponse(
            id=r.id,
            user_id=r.user_id,
            resume_id=r.resume_id,
            resume_version_id=r.resume_version_id,
            target_role=r.target_role,
            current_level=r.current_level,
            target_level=r.target_level,
            strengths=r.strengths,
            skill_gaps=r.skill_gaps,
            potential_undocumented_skills=r.potential_undocumented_skills,
            learning_topics=r.learning_topics,
            practical_projects=r.practical_projects,
            portfolio_improvements=r.portfolio_improvements,
            certifications=r.certifications,
            action_items=r.action_items,
            short_term_milestones=r.short_term_milestones,
            medium_term_milestones=r.medium_term_milestones,
            disclaimer=r.disclaimer,
            created_at=r.created_at,
        )
        for r in roadmaps
    ]


@router.get(
    "/roadmaps/{roadmap_id}",
    response_model=CareerRoadmapResponse,
    summary="Get Career Roadmap Details",
    description="Retrieves a specific career roadmap owned by the authenticated user.",
)
async def get_roadmap(
    roadmap_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CareerRoadmapResponse:
    r = CareerIntelligenceService.get_roadmap(db=db, user=current_user, roadmap_id=roadmap_id)
    return CareerRoadmapResponse(
        id=r.id,
        user_id=r.user_id,
        resume_id=r.resume_id,
        resume_version_id=r.resume_version_id,
        target_role=r.target_role,
        current_level=r.current_level,
        target_level=r.target_level,
        strengths=r.strengths,
        skill_gaps=r.skill_gaps,
        potential_undocumented_skills=r.potential_undocumented_skills,
        learning_topics=r.learning_topics,
        practical_projects=r.practical_projects,
        portfolio_improvements=r.portfolio_improvements,
        certifications=r.certifications,
        action_items=r.action_items,
        short_term_milestones=r.short_term_milestones,
        medium_term_milestones=r.medium_term_milestones,
        disclaimer=r.disclaimer,
        created_at=r.created_at,
    )


@router.delete(
    "/roadmaps/{roadmap_id}",
    summary="Delete Career Roadmap",
    description="Deletes a career roadmap owned by the authenticated user.",
)
async def delete_roadmap(
    roadmap_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    CareerIntelligenceService.delete_roadmap(db=db, user=current_user, roadmap_id=roadmap_id)
    return {"status": "deleted", "id": roadmap_id}


# ---------------------------------------------------------------------------
# 4. Multi-Role Comparison Engine
# ---------------------------------------------------------------------------

@router.post(
    "/multi-role/compare",
    response_model=MultiRoleCompareResponse,
    summary="Compare Resume Across Multiple Target Roles",
    description="Simultaneously evaluates a resume against 2-4 target roles using deterministic scoring.",
)
@limiter.limit("15/minute")
async def compare_multi_role(
    request: Request,
    payload: MultiRoleCompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> MultiRoleCompareResponse:
    return await CareerIntelligenceService.compare_multi_role(
        db=db,
        user=current_user,
        resume_id=payload.resume_id,
        target_roles=payload.target_roles,
        resume_version_id=payload.resume_version_id,
        model_name=payload.model_name,
    )


@router.post(
    "/multi-role/save",
    response_model=MultiRoleCompareResponse,
    summary="Save Multi-Role Comparison Matrix",
    description="Persists a multi-role evaluation matrix to user account history.",
)
async def save_multi_role_comparison(
    payload: SaveMultiRoleCompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> MultiRoleCompareResponse:
    comp = CareerIntelligenceService.save_multi_role_comparison(
        db=db,
        user=current_user,
        resume_id=payload.resume_id,
        resume_version_id=payload.resume_version_id,
        roles_evaluated=payload.roles_evaluated,
        role_results={k: v.model_dump() for k, v in payload.role_results.items()},
        best_fit_role=payload.best_fit_role,
        trade_offs_summary=payload.trade_offs_summary,
    )
    return MultiRoleCompareResponse(
        id=comp.id,
        user_id=comp.user_id,
        resume_id=comp.resume_id,
        resume_version_id=comp.resume_version_id,
        roles_evaluated=comp.roles_evaluated,
        role_results=payload.role_results,
        best_fit_role=comp.best_fit_role,
        trade_offs_summary=comp.trade_offs_summary,
        scoring_version=comp.scoring_version,
        created_at=comp.created_at,
    )


@router.get(
    "/multi-role",
    response_model=List[MultiRoleCompareResponse],
    summary="List Saved Multi-Role Comparisons",
    description="Returns all multi-role comparison matrices saved by the user.",
)
async def list_multi_role_comparisons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[MultiRoleCompareResponse]:
    comps = CareerIntelligenceService.list_multi_role_comparisons(db=db, user=current_user)
    return [
        MultiRoleCompareResponse(
            id=c.id,
            user_id=c.user_id,
            resume_id=c.resume_id,
            resume_version_id=c.resume_version_id,
            roles_evaluated=c.roles_evaluated,
            role_results=c.role_results,
            best_fit_role=c.best_fit_role,
            trade_offs_summary=c.trade_offs_summary,
            scoring_version=c.scoring_version,
            created_at=c.created_at,
        )
        for c in comps
    ]


@router.get(
    "/multi-role/{comparison_id}",
    response_model=MultiRoleCompareResponse,
    summary="Get Multi-Role Comparison Details",
    description="Retrieves a specific multi-role comparison matrix.",
)
async def get_multi_role_comparison(
    comparison_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> MultiRoleCompareResponse:
    c = CareerIntelligenceService.get_multi_role_comparison(
        db=db, user=current_user, comparison_id=comparison_id
    )
    return MultiRoleCompareResponse(
        id=c.id,
        user_id=c.user_id,
        resume_id=c.resume_id,
        resume_version_id=c.resume_version_id,
        roles_evaluated=c.roles_evaluated,
        role_results=c.role_results,
        best_fit_role=c.best_fit_role,
        trade_offs_summary=c.trade_offs_summary,
        scoring_version=c.scoring_version,
        created_at=c.created_at,
    )


@router.delete(
    "/multi-role/{comparison_id}",
    summary="Delete Multi-Role Comparison",
    description="Deletes a saved multi-role comparison.",
)
async def delete_multi_role_comparison(
    comparison_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    CareerIntelligenceService.delete_multi_role_comparison(
        db=db, user=current_user, comparison_id=comparison_id
    )
    return {"status": "deleted", "id": comparison_id}


# ---------------------------------------------------------------------------
# 5. Project & Portfolio Recommendations
# ---------------------------------------------------------------------------

@router.post(
    "/projects/recommend",
    response_model=ProjectRecommendResponse,
    summary="Recommend Portfolio Projects",
    description="Generates actionable portfolio project blueprints demonstrating in-demand role competencies.",
)
@limiter.limit("15/minute")
async def recommend_projects(
    request: Request,
    payload: ProjectRecommendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    api_key: Optional[str] = Depends(get_optional_gemini_api_key),
) -> ProjectRecommendResponse:
    return await CareerIntelligenceService.recommend_projects(
        db=db,
        user=current_user,
        target_role=payload.target_role,
        resume_id=payload.resume_id,
        resume_version_id=payload.resume_version_id,
        skill_gaps=payload.skill_gaps,
        api_key=api_key,
        model_name=payload.model_name,
    )
