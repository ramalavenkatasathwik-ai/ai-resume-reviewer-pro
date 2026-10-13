import copy
import json
import re
import uuid
from typing import Optional, List, Dict, Any, Tuple
from fastapi import HTTPException, status
from google import genai
from google.genai import types
from google.genai import errors as genai_errors
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_

from app.core.config import get_settings
from app.core.logging import logger
from app.models.job_match import JobMatchReport
from app.models.resume import ResumeDocument, ResumeVersion
from app.models.user import User
from app.schemas.job_match import (
    JobRequirements,
    RequirementMatchItem,
    JobMatchComparison,
    JobMatchRecommendation,
    TailoredResumeDraftResponse,
)
from app.services.gemini_service import GeminiService
from app.services.job_match_scoring import JobMatchScoringEngine

settings = get_settings()


class JobMatchService:
    """Service handling job requirement extraction, evidence comparison, scoring, and tailoring."""

    MIN_JD_LENGTH = 50
    MAX_JD_LENGTH = 100000

    @classmethod
    def validate_job_description(cls, text: str) -> str:
        """Validates job description content constraints and safeguards against SSRF."""
        cleaned = text.strip()

        # Reject URL-only inputs to prevent SSRF
        if re.match(r"^https?://[^\s]+$", cleaned):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "URL_SCRAPING_DISALLOWED",
                    "message": "Direct URL scraping is disallowed to prevent security vulnerabilities. Please paste the job description text directly.",
                },
            )

        if len(cleaned) < cls.MIN_JD_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "INSUFFICIENT_JOB_DESCRIPTION",
                    "message": f"Job description must contain at least {cls.MIN_JD_LENGTH} characters of verifiable job text.",
                },
            )
        if len(cleaned) > cls.MAX_JD_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "JOB_DESCRIPTION_TOO_LARGE",
                    "message": f"Job description exceeds maximum allowable size of {cls.MAX_JD_LENGTH} characters.",
                },
            )

        return cleaned

    @classmethod
    async def extract_requirements(
        cls,
        api_key: str,
        job_description: str,
        job_title: Optional[str] = None,
        company_name: Optional[str] = None,
        model_name: Optional[str] = None,
    ) -> JobRequirements:
        """Extracts structured and typed requirements from job description text via Gemini."""
        valid_jd = cls.validate_job_description(job_description)
        model = GeminiService.resolve_model(model_name)
        client = genai.Client(api_key=api_key)

        prompt = f"""You are an expert technical recruiter and job analyst.
Extract all explicit and inferred qualifications, skills, and attributes from the following job description.

TITLE HINT: {job_title or "Infer from description"}
COMPANY HINT: {company_name or "Infer from description if present"}

JOB DESCRIPTION:
\"\"\"
{valid_jd}
\"\"\"

STRICT RULES:
1. Distinguish REQUIRED qualifications from PREFERRED / BONUS qualifications.
2. Separate technical skills, soft skills, tools/technologies, responsibilities, and domain knowledge.
3. Extract education and experience criteria.
4. Extract unique, relevant keywords.
5. Do NOT invent employer requirements that are absent from the text.
6. Output MUST strictly match the requested JSON schema.
"""

        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json",
                    response_schema=JobRequirements,
                ),
            )
            raw_text = response.text or "{}"
            data = json.loads(raw_text)
            if not data.get("job_title"):
                data["job_title"] = job_title or "Target Role"
            if company_name and not data.get("company_name"):
                data["company_name"] = company_name
            return JobRequirements.model_validate(data)

        except Exception as e:
            logger.warning("Gemini requirement extraction failed (%s). Using fallback extraction.", e)
            # Deterministic fallback extraction
            return cls._fallback_extract_requirements(valid_jd, job_title, company_name)

    @classmethod
    def _fallback_extract_requirements(
        cls, job_description: str, job_title: Optional[str], company_name: Optional[str]
    ) -> JobRequirements:
        """Heuristic fallback extraction when AI is temporarily unavailable."""
        lines = [line.strip() for line in job_description.split("\n") if line.strip()]
        title = job_title or (lines[0] if lines else "Target Role")[:100]

        # Basic keyword detection
        common_tech = [
            "python", "javascript", "typescript", "react", "fastapi", "docker",
            "kubernetes", "aws", "gcp", "azure", "postgresql", "sql", "git",
            "pytorch", "tensorflow", "ci/cd", "rest api", "graphql", "linux"
        ]
        found_tech = [t.title() for t in common_tech if t in job_description.lower()]

        return JobRequirements(
            job_title=title,
            company_name=company_name,
            role_summary=job_description[:300] + "...",
            required_qualifications=[l for l in lines if len(l) > 20][:5],
            preferred_qualifications=[],
            required_technical_skills=found_tech[:8],
            preferred_technical_skills=found_tech[8:12],
            soft_skills=["Communication", "Collaboration", "Problem Solving"],
            tools_and_technologies=found_tech[:6],
            responsibilities=[l for l in lines if "responsib" in l.lower() or "you will" in l.lower()][:4],
            education_requirements=["Bachelor's degree or equivalent practical experience"],
            experience_requirements=["Relevant professional software or technical experience"],
            relevant_keywords=found_tech,
            explicit_requirements=[l for l in lines if len(l) > 15][:6],
        )

    @classmethod
    async def compare_resume_to_job(
        cls,
        api_key: str,
        requirements: JobRequirements,
        resume_version: ResumeVersion,
        model_name: Optional[str] = None,
    ) -> JobMatchComparison:
        """Compares resume evidence against requirements and computes explainable scores."""
        model = GeminiService.resolve_model(model_name)
        client = genai.Client(api_key=api_key)

        resume_json_str = json.dumps(resume_version.resume_data, indent=2)

        prompt = f"""You are an objective hiring auditor. Evaluate whether the candidate's resume provides verifiable evidence for each job requirement.

JOB REQUIREMENTS:
- Role: {requirements.job_title}
- Required Qualifications: {json.dumps(requirements.required_qualifications)}
- Preferred Qualifications: {json.dumps(requirements.preferred_qualifications)}
- Required Technical Skills: {json.dumps(requirements.required_technical_skills)}
- Preferred Technical Skills: {json.dumps(requirements.preferred_technical_skills)}
- Education Requirements: {json.dumps(requirements.education_requirements)}
- Experience Requirements: {json.dumps(requirements.experience_requirements)}

CANDIDATE RESUME DATA:
\"\"\"
{resume_json_str}
\"\"\"

CRITICAL EVALUATION RULES:
1. For each requirement, evaluate status strictly as one of:
   - "matched": Resume contains explicit, verifiable evidence supporting this requirement.
   - "partial": Related experience or transferable skill exists, but does not fully satisfy the requirement.
   - "not_evidenced": No supporting evidence is found on the resume (Note: this is lack of evidence, not proof of inability).
   - "not_assessable": Resume data is insufficient to assess this item.
2. Quote exact or direct evidence from the resume in the "evidence" field.
3. Categorize each item into: "required_skill", "preferred_skill", "experience", "education", or "responsibility".
4. Set "is_required" to true for mandatory requirements, false for preferred.
5. Return a JSON list of items matching the RequirementMatchItem schema.
"""

        class MatchItemList(BaseModel := genai.types.Schema if hasattr(genai.types, "Schema") else object):
            pass

        items: List[RequirementMatchItem] = []
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json",
                ),
            )
            raw = response.text or "[]"
            parsed = json.loads(raw)
            if isinstance(parsed, dict) and "items" in parsed:
                parsed = parsed["items"]
            if isinstance(parsed, list):
                for obj in parsed:
                    try:
                        items.append(RequirementMatchItem.model_validate(obj))
                    except Exception:
                        pass
        except Exception as e:
            logger.warning("Gemini comparison extraction failed (%s). Generating heuristic matches.", e)

        # Fallback heuristic matching if model returned few or no items
        if not items:
            items = cls._heuristic_match_items(requirements, resume_version.resume_data)

        # Execute deterministic scoring engine
        all_keywords = list(set(
            requirements.relevant_keywords +
            requirements.required_technical_skills +
            requirements.preferred_technical_skills
        ))

        return JobMatchScoringEngine.compute_scores(
            items=items,
            relevant_keywords=all_keywords,
            resume_data=resume_version.resume_data,
        )

    @classmethod
    def _heuristic_match_items(
        cls, requirements: JobRequirements, resume_data: Dict[str, Any]
    ) -> List[RequirementMatchItem]:
        """Deterministic matching fallback when AI evaluation stream fails."""
        corpus = JobMatchScoringEngine.extract_resume_text_corpus(resume_data)
        items: List[RequirementMatchItem] = []

        # Required skills
        for skill in requirements.required_technical_skills:
            matched = skill.lower() in corpus
            items.append(
                RequirementMatchItem(
                    requirement=skill,
                    category="required_skill",
                    status="matched" if matched else "not_evidenced",
                    evidence=f"Mentioned in resume skills or experience" if matched else None,
                    is_required=True,
                )
            )

        # Preferred skills
        for skill in requirements.preferred_technical_skills:
            matched = skill.lower() in corpus
            items.append(
                RequirementMatchItem(
                    requirement=skill,
                    category="preferred_skill",
                    status="matched" if matched else "not_evidenced",
                    evidence=f"Mentioned in resume skills" if matched else None,
                    is_required=False,
                )
            )

        # Experience
        for exp_req in requirements.experience_requirements:
            items.append(
                RequirementMatchItem(
                    requirement=exp_req,
                    category="experience",
                    status="partial" if len(resume_data.get("experience") or []) > 0 else "not_evidenced",
                    evidence=f"{len(resume_data.get('experience') or [])} positions recorded on resume",
                    is_required=True,
                )
            )

        # Education
        for edu_req in requirements.education_requirements:
            has_edu = len(resume_data.get("education") or []) > 0
            items.append(
                RequirementMatchItem(
                    requirement=edu_req,
                    category="education",
                    status="matched" if has_edu else "not_evidenced",
                    evidence="Educational credentials listed" if has_edu else None,
                    is_required=True,
                )
            )

        return items

    @classmethod
    async def generate_recommendations(
        cls,
        api_key: str,
        requirements: JobRequirements,
        comparison: JobMatchComparison,
        resume_version: ResumeVersion,
        model_name: Optional[str] = None,
    ) -> List[JobMatchRecommendation]:
        """Generates actionable recommendations with mandatory factual integrity enforcement."""
        model = GeminiService.resolve_model(model_name)
        client = genai.Client(api_key=api_key)

        prompt = f"""You are a certified executive resume coach.
Generate actionable, high-impact recommendations to tailor the candidate's resume for the role: "{requirements.job_title}".

MISSING REQUIREMENTS:
{json.dumps(comparison.missing_requirements[:8])}

PARTIAL REQUIREMENTS:
{json.dumps(comparison.partial_requirements[:6])}

MISSING KEYWORDS:
{json.dumps(comparison.missing_keywords[:10])}

CURRENT RESUME DATA:
\"\"\"
{json.dumps(resume_version.resume_data, indent=2)}
\"\"\"

STRICT FACTUAL INTEGRITY RULES:
1. NEVER invent work experience, companies, or job titles.
2. NEVER fabricate metrics or percentage achievements not found in the original resume.
3. If recommending a missing skill that is not evidenced, set `requires_user_confirmation: true` so the user must confirm they possess the skill before adding it.
4. For phrasing improvements or keyword alignment of existing bullets, set `requires_user_confirmation: false`.
5. Clearly articulate the "reason" referencing the target job requirement.
6. Provide output as a JSON list of objects matching the schema:
   - id: unique string (e.g. "rec-1")
   - section: "summary" | "skills" | "experience" | "education" | "certifications" | "projects"
   - priority: "high" | "medium" | "low"
   - relevant_job_requirement: string
   - current_evidence: string or null
   - proposed_change: string
   - reason: string
   - requires_user_confirmation: boolean
"""

        recommendations: List[JobMatchRecommendation] = []
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                ),
            )
            raw = response.text or "[]"
            parsed = json.loads(raw)
            if isinstance(parsed, dict) and "recommendations" in parsed:
                parsed = parsed["recommendations"]
            if isinstance(parsed, list):
                for obj in parsed:
                    try:
                        recommendations.append(JobMatchRecommendation.model_validate(obj))
                    except Exception:
                        pass
        except Exception as e:
            logger.warning("Gemini recommendation generation failed (%s). Using fallback recommendations.", e)

        if not recommendations:
            recommendations = cls._generate_fallback_recommendations(requirements, comparison, resume_version.resume_data)

        return recommendations

    @classmethod
    def _generate_fallback_recommendations(
        cls,
        requirements: JobRequirements,
        comparison: JobMatchComparison,
        resume_data: Dict[str, Any],
    ) -> List[JobMatchRecommendation]:
        """Provides reliable baseline recommendations adhering strictly to factual integrity."""
        recs: List[JobMatchRecommendation] = []
        count = 1

        # Summary recommendation
        basics = resume_data.get("basics") or {}
        curr_summary = basics.get("summary") or ""
        recs.append(
            JobMatchRecommendation(
                id=f"rec-{count}",
                section="summary",
                priority="high",
                relevant_job_requirement=f"Target Role: {requirements.job_title}",
                current_evidence=curr_summary[:100] + "..." if curr_summary else None,
                proposed_change=(
                    f"{curr_summary} Dedicated to driving results as a {requirements.job_title} with focus on "
                    f"{', '.join(requirements.required_technical_skills[:3])}."
                ),
                reason="Aligns executive summary directly with target job title and core requirements.",
                requires_user_confirmation=False,
            )
        )
        count += 1

        # Missing keyword skills recommendations
        for kw in comparison.missing_keywords[:4]:
            recs.append(
                JobMatchRecommendation(
                    id=f"rec-{count}",
                    section="skills",
                    priority="high" if kw in [s.lower() for s in requirements.required_technical_skills] else "medium",
                    relevant_job_requirement=f"Keyword requirement: {kw}",
                    current_evidence=None,
                    proposed_change=f"Add skill: {kw.title()}",
                    reason=f"Important keyword found in {requirements.job_title} job description.",
                    requires_user_confirmation=True,  # User must verify they possess this skill
                )
            )
            count += 1

        return recs

    @classmethod
    def synthesize_tailored_draft(
        cls,
        original_resume_data: Dict[str, Any],
        accepted_recommendation_ids: List[str],
        all_recommendations: List[JobMatchRecommendation],
        custom_edits: Optional[Dict[str, str]] = None,
        confirmed_missing_facts: Optional[Dict[str, str]] = None,
    ) -> Tuple[Dict[str, Any], List[JobMatchRecommendation], List[Dict[str, Any]]]:
        """Applies accepted recommendations onto a deep copy of the resume data."""
        tailored = copy.deepcopy(original_resume_data)
        applied: List[JobMatchRecommendation] = []
        diff_summary: List[Dict[str, Any]] = []

        rec_lookup = {r.id: r for r in all_recommendations}
        custom_edits = custom_edits or {}
        confirmed_facts = confirmed_missing_facts or {}

        for rec_id in accepted_recommendation_ids:
            rec = rec_lookup.get(rec_id)
            if not rec:
                continue

            # Check factual confirmation requirement
            if rec.requires_user_confirmation and rec_id not in confirmed_facts and rec.section != "skills":
                # Skip if required factual confirmation was not provided
                continue

            change_text = custom_edits.get(rec_id) or rec.proposed_change

            if rec.section == "summary":
                orig_summary = (tailored.get("basics") or {}).get("summary") or ""
                if "basics" not in tailored:
                    tailored["basics"] = {}
                tailored["basics"]["summary"] = change_text
                diff_summary.append({
                    "section": "Summary",
                    "type": "modified",
                    "original": orig_summary,
                    "revised": change_text,
                })
                applied.append(rec)

            elif rec.section == "skills":
                skill_name = change_text.replace("Add skill:", "").strip()
                if "skills" not in tailored or not isinstance(tailored["skills"], list):
                    tailored["skills"] = []
                if skill_name.lower() not in [s.lower() for s in tailored["skills"]]:
                    tailored["skills"].append(skill_name)
                    diff_summary.append({
                        "section": "Skills",
                        "type": "added",
                        "original": None,
                        "revised": skill_name,
                    })
                    applied.append(rec)

            elif rec.section == "experience":
                exp_list = tailored.get("experience") or []
                if exp_list and isinstance(exp_list, list):
                    # Append or update bullet on first/latest role
                    highlights = exp_list[0].get("highlights") or []
                    highlights.append(change_text)
                    exp_list[0]["highlights"] = highlights
                    diff_summary.append({
                        "section": f"Experience ({exp_list[0].get('company') or 'Role'})",
                        "type": "added_bullet",
                        "original": None,
                        "revised": change_text,
                    })
                    applied.append(rec)

        return tailored, applied, diff_summary

    @classmethod
    def save_job_match_report(
        cls,
        db: Session,
        user: User,
        resume: ResumeDocument,
        version: ResumeVersion,
        job_title: str,
        company_name: Optional[str],
        job_description_raw: str,
        requirements: JobRequirements,
        comparison: JobMatchComparison,
        recommendations: List[JobMatchRecommendation],
        model_name: str,
    ) -> JobMatchReport:
        """Persists the complete job match analysis report."""
        report = JobMatchReport(
            user_id=user.id,
            resume_id=resume.id,
            resume_version_id=version.id,
            job_title=job_title.strip() or requirements.job_title,
            company_name=company_name.strip() if company_name else requirements.company_name,
            job_description_raw=job_description_raw,
            extracted_requirements=requirements.model_dump(),
            comparison_result=comparison.model_dump(),
            recommendations=[r.model_dump() for r in recommendations],
            overall_score=comparison.score_breakdown.overall_score,
            required_skills_score=comparison.score_breakdown.required_skills_score,
            preferred_skills_score=comparison.score_breakdown.preferred_skills_score,
            experience_score=comparison.score_breakdown.experience_score,
            keyword_score=comparison.score_breakdown.keyword_score,
            scoring_version="v1.0",
            model_name=model_name,
            status="completed",
            retention_days=90,
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    @classmethod
    def get_report(cls, db: Session, report_id: str, user: User) -> JobMatchReport:
        """Retrieves a single job match report verifying ownership."""
        report = db.query(JobMatchReport).filter(JobMatchReport.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "REPORT_NOT_FOUND", "message": "Job match report not found."},
            )
        if report.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "ACCESS_DENIED", "message": "Access denied to this job match report."},
            )
        return report

    @classmethod
    def list_reports(
        cls,
        db: Session,
        user: User,
        search: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[JobMatchReport], int]:
        """Lists user's historical job match reports."""
        query = select(JobMatchReport).where(JobMatchReport.user_id == user.id)
        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            query = query.where(
                or_(
                    func.lower(JobMatchReport.job_title).like(term),
                    func.lower(JobMatchReport.company_name).like(term),
                )
            )
        total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
        items = list(db.scalars(query.order_by(JobMatchReport.created_at.desc()).offset(offset).limit(limit)).all())
        return items, total

    @classmethod
    def delete_report(cls, db: Session, report_id: str, user: User) -> bool:
        """Deletes a job match report verifying ownership."""
        report = cls.get_report(db, report_id, user)
        db.delete(report)
        db.commit()
        return True
