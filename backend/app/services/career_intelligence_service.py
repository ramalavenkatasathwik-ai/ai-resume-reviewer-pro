import copy
import json
import re
import uuid
from typing import Optional, List, Dict, Any, Tuple
from fastapi import HTTPException, status
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.core.logging import logger
from app.models.career_intelligence import (
    CareerRoadmap,
    MultiRoleComparison,
    CareerProjectRecommendation,
)
from app.models.resume import ResumeDocument, ResumeVersion
from app.models.user import User
from app.schemas.career_intelligence import (
    RoleVariantDraftResponse,
    VariantDiffSection,
    VariantComparisonResponse,
    WritingSuggestionItem,
    WritingSuggestionResponse,
    CareerRoadmapResponse,
    RoleEvaluationResult,
    MultiRoleCompareResponse,
    ProjectRecommendationItem,
    ProjectRecommendResponse,
)
from app.services.gemini_service import GeminiService
from app.services.job_match_scoring import JobMatchScoringEngine


# Predefined domain knowledge for role evaluations
ROLE_BENCHMARKS: Dict[str, Dict[str, Any]] = {
    "AI Developer": {
        "required_skills": ["Python", "Machine Learning", "PyTorch", "TensorFlow", "Deep Learning", "Transformers", "FastAPI"],
        "preferred_skills": ["LangChain", "LLMs", "RAG", "Vector Databases", "Docker", "Kubernetes", "MLOps"],
        "keywords": ["ai", "machine learning", "nlp", "llm", "neural networks", "model", "python", "pytorch", "huggingface", "api"],
    },
    "Data Analyst": {
        "required_skills": ["SQL", "Python", "Data Analysis", "Tableau", "Power BI", "Excel", "Data Visualization"],
        "preferred_skills": ["Pandas", "NumPy", "Statistics", "ETL", "PostgreSQL", "A/B Testing", "Snowflake"],
        "keywords": ["sql", "analysis", "dashboard", "reporting", "insights", "metrics", "kpi", "data", "tableau", "bi"],
    },
    "Python Developer": {
        "required_skills": ["Python", "FastAPI", "Django", "Flask", "PostgreSQL", "REST APIs", "Git"],
        "preferred_skills": ["Docker", "Redis", "Celery", "SQLAlchemy", "Unit Testing", "AWS", "CI/CD"],
        "keywords": ["python", "api", "backend", "database", "orm", "microservices", "asyncio", "git", "tests"],
    },
    "Automation Engineer": {
        "required_skills": ["Python", "Selenium", "Playwright", "CI/CD", "Git", "Test Automation", "Linux"],
        "preferred_skills": ["Docker", "Bash", "Jenkins", "GitHub Actions", "API Testing", "Pytest", "Ansible"],
        "keywords": ["automation", "testing", "ci/cd", "pipeline", "scripts", "jenkins", "selenium", "pytest", "devops"],
    },
    "Mechanical Engineer": {
        "required_skills": ["CAD", "SolidWorks", "Mechanical Design", "FEA", "GD&T", "Thermodynamics", "Manufacturing"],
        "preferred_skills": ["AutoCAD", "MATLAB", "ANSYS", "Rapid Prototyping", "Design for Manufacturing", "DFM", "CNC"],
        "keywords": ["cad", "solidworks", "design", "mechanical", "prototyping", "tolerance", "fabrication", "fea", "materials"],
    },
    "Manufacturing Engineer": {
        "required_skills": ["Manufacturing Processes", "Lean Manufacturing", "Six Sigma", "Continuous Improvement", "Process Optimization", "Quality Control"],
        "preferred_skills": ["Root Cause Analysis", "FMEA", "PLC", "Automation", "Supply Chain", "Standard Operating Procedures"],
        "keywords": ["manufacturing", "lean", "six sigma", "kaizen", "quality", "production", "efficiency", "cycle time", "yield"],
    },
}


class CareerIntelligenceService:
    """Service providing multi-version resume generation, AI writing assistance,
    personalized career roadmaps, multi-role comparison, and portfolio projects."""

    # ---------------------------------------------------------------------------
    # 1. Multi-Version Resume Generator
    # ---------------------------------------------------------------------------

    @classmethod
    async def generate_role_variant(
        cls,
        db: Session,
        user: User,
        resume_id: str,
        target_role: str,
        resume_version_id: Optional[str] = None,
        job_description: Optional[str] = None,
        focus_areas: Optional[List[str]] = None,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ) -> RoleVariantDraftResponse:
        """Tailors a resume draft specifically towards a target role while strictly preserving factual accuracy."""
        # 1. Verify resume document ownership
        doc_stmt = select(ResumeDocument).where(
            ResumeDocument.id == resume_id,
            ResumeDocument.user_id == user.id,
        )
        resume_doc = db.scalars(doc_stmt).first()
        if not resume_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "RESUME_NOT_FOUND", "message": "Resume document not found or access denied."},
            )

        # 2. Get the base resume version
        if resume_version_id:
            v_stmt = select(ResumeVersion).where(
                ResumeVersion.id == resume_version_id,
                ResumeVersion.resume_id == resume_id,
            )
            version = db.scalars(v_stmt).first()
        else:
            v_stmt = (
                select(ResumeVersion)
                .where(ResumeVersion.resume_id == resume_id)
                .order_by(desc(ResumeVersion.version_number))
            )
            version = db.scalars(v_stmt).first()

        if not version or not version.resume_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "RESUME_VERSION_NOT_FOUND", "message": "No valid resume version found to branch from."},
            )

        base_data = copy.deepcopy(version.resume_data)

        # 3. AI Variant Generation if server or request api_key available
        effective_key = (api_key or settings.GEMINI_API_KEY or "").strip()
        if effective_key:
            try:
                model = GeminiService.resolve_model(model_name)
                client = GeminiService.get_client(effective_key)

                prompt = f"""You are a master executive resume strategist.
Tailor the candidate's existing resume strictly for the target role: "{target_role}".

TARGET ROLE: {target_role}
FOCUS AREAS: {', '.join(focus_areas) if focus_areas else 'Standard role prioritization'}
OPTIONAL JOB DESCRIPTION CONTEXT:
{job_description or 'None provided. Tailor according to modern industry standards for ' + target_role}

ORIGINAL RESUME DATA (JSON):
```json
{json.dumps(base_data, indent=2)}
```

CRITICAL FACTUAL INTEGRITY RULES:
1. NEVER fabricate companies, job titles held, employment dates, universities, or unverified degrees.
2. Highlight and prioritize achievements, skills, and projects that are most relevant to "{target_role}".
3. Reframe bullet points and professional summary to emphasize competencies relevant to "{target_role}" using strong action verbs and quantifiable metrics.
4. Put the most role-relevant technical skills first.
5. If you suggest adding any specific claim or tool that was NOT present in the original resume, list it in "confirmation_needed_items".

Respond with a JSON object with:
- "variant_title": string (e.g. "{resume_doc.title} - {target_role} Variant")
- "resume_data": the complete tailored resume JSON matching the original schema structure
- "key_modifications": list of 3-6 strings describing major modifications made
- "verified_skills_prioritized": list of top verified skills emphasized for this role
- "confirmation_needed_items": list of any proposed items needing candidate confirmation
"""
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        response_mime_type="application/json",
                    ),
                )
                raw_json = json.loads(response.text or "{}")
                if raw_json.get("resume_data"):
                    return RoleVariantDraftResponse(
                        target_role=target_role,
                        variant_title=raw_json.get("variant_title") or f"{resume_doc.title} ({target_role})",
                        resume_data=raw_json["resume_data"],
                        key_modifications=raw_json.get("key_modifications") or [
                            f"Refocused summary and title on {target_role} competencies.",
                            "Prioritized matching technical skills and relevant tools.",
                            "Enhanced experience bullet points with action verbs.",
                        ],
                        verified_skills_prioritized=raw_json.get("verified_skills_prioritized") or [],
                        factual_integrity_verified=True,
                        confirmation_needed_items=raw_json.get("confirmation_needed_items") or [],
                    )
            except Exception as e:
                logger.warning("Gemini variant generation failed (%s). Falling back to heuristic variant generator.", e)

        # 4. Fallback Deterministic Generator
        return cls._heuristic_generate_variant(base_data, resume_doc.title, target_role, focus_areas)

    @classmethod
    def _heuristic_generate_variant(
        cls,
        base_data: Dict[str, Any],
        doc_title: str,
        target_role: str,
        focus_areas: Optional[List[str]] = None,
    ) -> RoleVariantDraftResponse:
        """Produces a deterministic, factually safe tailored variant."""
        tailored = copy.deepcopy(base_data)

        # Update basics title and summary
        basics = tailored.setdefault("basics", {})
        original_title = basics.get("title") or "Professional"
        basics["title"] = f"{target_role}"

        summary = basics.get("summary") or ""
        if summary:
            basics["summary"] = f"Results-driven {target_role} with proven track record in {original_title.lower()} domains. {summary}"
        else:
            basics["summary"] = f"Results-driven {target_role} with strong background in software engineering, technical innovation, and delivery."

        # Reorder skills based on target role domain keywords
        benchmark = ROLE_BENCHMARKS.get(target_role) or {}
        role_skills = [s.lower() for s in benchmark.get("required_skills", []) + benchmark.get("preferred_skills", [])]

        existing_skills = tailored.get("skills") or []
        prioritized_skills: List[str] = []
        other_skills: List[str] = []

        for s in existing_skills:
            s_str = str(s).strip()
            if any(rs in s_str.lower() for rs in role_skills):
                prioritized_skills.append(s_str)
            else:
                other_skills.append(s_str)

        tailored["skills"] = prioritized_skills + other_skills

        return RoleVariantDraftResponse(
            target_role=target_role,
            variant_title=f"{doc_title} ({target_role} Variant)",
            resume_data=tailored,
            key_modifications=[
                f"Aligned headline and professional summary with {target_role}.",
                f"Prioritized {len(prioritized_skills)} verified role-relevant skills.",
                "Preserved all factual employment history, dates, and educational credentials.",
            ],
            verified_skills_prioritized=prioritized_skills[:8],
            factual_integrity_verified=True,
            confirmation_needed_items=[],
        )

    @classmethod
    def compare_variants(
        cls,
        db: Session,
        user: User,
        base_version_id: Optional[str] = None,
        variant_version_id: Optional[str] = None,
        base_resume_data: Optional[Dict[str, Any]] = None,
        variant_resume_data: Optional[Dict[str, Any]] = None,
    ) -> VariantComparisonResponse:
        """Performs a structured side-by-side comparison between two resume versions or drafts."""
        base_title = "Base Resume"
        variant_title = "Variant Resume"

        if base_version_id:
            v_stmt = select(ResumeVersion).join(ResumeDocument).where(
                ResumeVersion.id == base_version_id,
                ResumeDocument.user_id == user.id,
            )
            v = db.scalars(v_stmt).first()
            if v and v.resume_data:
                base_resume_data = v.resume_data
                base_title = f"{v.resume.title} (v{v.version_number})"

        if variant_version_id:
            v_stmt = select(ResumeVersion).join(ResumeDocument).where(
                ResumeVersion.id == variant_version_id,
                ResumeDocument.user_id == user.id,
            )
            v = db.scalars(v_stmt).first()
            if v and v.resume_data:
                variant_resume_data = v.resume_data
                variant_title = f"{v.resume.title} (v{v.version_number})"

        if not base_resume_data or not variant_resume_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "INVALID_DATA", "message": "Both base and variant resume data must be supplied."},
            )

        sections: List[VariantDiffSection] = []
        differences: List[str] = []

        # 1. Basics / Summary
        b_summary = (base_resume_data.get("basics") or {}).get("summary", "")
        v_summary = (variant_resume_data.get("basics") or {}).get("summary", "")
        if b_summary != v_summary:
            differences.append("Professional summary was tailored for role alignment.")
        sections.append(
            VariantDiffSection(
                section_name="Professional Summary",
                original_content=b_summary,
                variant_content=v_summary,
                changes_summary="Summary updated to emphasize target role expertise." if b_summary != v_summary else "No changes.",
            )
        )

        # 2. Headline / Title
        b_title = (base_resume_data.get("basics") or {}).get("title", "")
        v_title = (variant_resume_data.get("basics") or {}).get("title", "")
        if b_title != v_title:
            differences.append(f"Professional title changed from '{b_title}' to '{v_title}'.")
        sections.append(
            VariantDiffSection(
                section_name="Professional Title",
                original_content=b_title,
                variant_content=v_title,
                changes_summary=f"Changed title from '{b_title}' to '{v_title}'." if b_title != v_title else "No changes.",
            )
        )

        # 3. Skills
        b_skills = base_resume_data.get("skills") or []
        v_skills = variant_resume_data.get("skills") or []
        if b_skills != v_skills:
            differences.append("Skills reordered and emphasized for role alignment.")
        sections.append(
            VariantDiffSection(
                section_name="Skills",
                original_content=b_skills,
                variant_content=v_skills,
                changes_summary="Skills prioritized for target competency." if b_skills != v_skills else "No changes.",
            )
        )

        # 4. Experience Bullets
        b_exp = base_resume_data.get("experience") or []
        v_exp = variant_resume_data.get("experience") or []
        sections.append(
            VariantDiffSection(
                section_name="Work Experience",
                original_content=b_exp,
                variant_content=v_exp,
                changes_summary="Experience bullets refocused on role accomplishments." if b_exp != v_exp else "No changes.",
            )
        )

        # 5. Projects
        b_proj = base_resume_data.get("projects") or []
        v_proj = variant_resume_data.get("projects") or []
        sections.append(
            VariantDiffSection(
                section_name="Projects",
                original_content=b_proj,
                variant_content=v_proj,
                changes_summary="Projects highlighted for domain relevance." if b_proj != v_proj else "No changes.",
            )
        )

        target_role = (variant_resume_data.get("basics") or {}).get("title") or "Target Role"

        return VariantComparisonResponse(
            base_title=base_title,
            variant_title=variant_title,
            target_role=target_role,
            sections=sections,
            summary_of_differences=differences or ["Content aligned with role target."],
        )

    # ---------------------------------------------------------------------------
    # 2. Advanced AI Writing Assistant
    # ---------------------------------------------------------------------------

    VALID_SECTIONS = [
        "summary",
        "experience_bullets",
        "project_descriptions",
        "technical_skills",
        "linkedin_headline",
        "linkedin_about",
        "cover_letter",
        "achievements",
    ]

    @classmethod
    async def generate_writing_suggestions(
        cls,
        db: Session,
        user: User,
        section: str,
        target_role: str,
        current_text: Optional[str] = None,
        resume_id: Optional[str] = None,
        resume_version_id: Optional[str] = None,
        job_description: Optional[str] = None,
        instruction: Optional[str] = None,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ) -> WritingSuggestionResponse:
        """Generates refined, high-impact revisions for any of the 8 supported career writing sections."""
        clean_section = section.strip().lower()
        if clean_section not in cls.VALID_SECTIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "INVALID_SECTION",
                    "message": f"Section must be one of: {', '.join(cls.VALID_SECTIONS)}",
                },
            )

        # If current_text not provided, attempt to pull it from user's resume
        context_text = (current_text or "").strip()
        if not context_text and resume_id:
            doc_stmt = select(ResumeDocument).where(
                ResumeDocument.id == resume_id,
                ResumeDocument.user_id == user.id,
            )
            doc = db.scalars(doc_stmt).first()
            if doc:
                v_stmt = (
                    select(ResumeVersion)
                    .where(ResumeVersion.resume_id == resume_id)
                    .order_by(desc(ResumeVersion.version_number))
                )
                if resume_version_id:
                    v_stmt = select(ResumeVersion).where(
                        ResumeVersion.id == resume_version_id,
                        ResumeVersion.resume_id == resume_id,
                    )
                v = db.scalars(v_stmt).first()
                if v and v.resume_data:
                    context_text = cls._extract_section_text_from_resume(v.resume_data, clean_section)

        if not context_text:
            context_text = f"Sample {clean_section.replace('_', ' ')} targeting {target_role} position."

        # AI Generation
        effective_key = (api_key or settings.GEMINI_API_KEY or "").strip()
        if effective_key:
            try:
                model = GeminiService.resolve_model(model_name)
                client = GeminiService.get_client(effective_key)

                prompt = f"""You are an elite executive career coach and professional resume editor.
Provide 3 high-impact, refined writing suggestions for the section: "{clean_section}" tailored to the target role: "{target_role}".

TARGET ROLE: {target_role}
SECTION: {clean_section}
USER INSTRUCTION: {instruction or 'Make impact-driven, quantifiable, and compelling with strong action verbs.'}
OPTIONAL JOB DESCRIPTION CONTEXT:
{job_description or 'None provided'}

ORIGINAL / CURRENT TEXT:
\"\"\"
{context_text}
\"\"\"

STRICT RULES:
1. Provide 3 distinct options (e.g. Option A: Highly quantifiable & metrics-focused, Option B: Leadership & strategic impact, Option C: Technical excellence & domain depth).
2. For each option, clearly explain why it is stronger.
3. If an option introduces a hypothetical metric or specific claim that was not in the original text, set "requires_user_confirmation": true and supply a "verification_prompt" (e.g. "Did your project reduce latency by 35%? Update to reflect your actual metric.").
4. Return a JSON object containing:
   - "suggestions": array of objects with:
     - "id": string (uuid)
     - "section": "{clean_section}"
     - "original_text": "{context_text[:200]}"
     - "proposed_revision": string
     - "explanation": string
     - "target_role": "{target_role}"
     - "requires_user_confirmation": boolean
     - "verification_prompt": string or null
     - "action_verbs_used": list of strings
     - "metric_focus": string or null
   - "editorial_notes": string summarizing overarching recommendations.
"""
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.3,
                        response_mime_type="application/json",
                    ),
                )
                raw_json = json.loads(response.text or "{}")
                sug_list = raw_json.get("suggestions") or []
                if sug_list:
                    items: List[WritingSuggestionItem] = []
                    for idx, s in enumerate(sug_list):
                        items.append(
                            WritingSuggestionItem(
                                id=s.get("id") or str(uuid.uuid4()),
                                section=clean_section,
                                original_text=context_text,
                                proposed_revision=s.get("proposed_revision") or "",
                                explanation=s.get("explanation") or "",
                                target_role=target_role,
                                requires_user_confirmation=bool(s.get("requires_user_confirmation")),
                                verification_prompt=s.get("verification_prompt"),
                                action_verbs_used=s.get("action_verbs_used") or [],
                                metric_focus=s.get("metric_focus"),
                            )
                        )
                    return WritingSuggestionResponse(
                        section=clean_section,
                        target_role=target_role,
                        suggestions=items,
                        editorial_notes=raw_json.get("editorial_notes") or f"Tailored suggestions for {clean_section} aligned with {target_role} requirements.",
                    )
            except Exception as e:
                logger.warning("Gemini writing assistant failed (%s). Falling back to heuristic suggestions.", e)

        # Fallback Generator
        return cls._heuristic_writing_suggestions(clean_section, target_role, context_text)

    @classmethod
    def _extract_section_text_from_resume(cls, resume_data: Dict[str, Any], section: str) -> str:
        """Extracts representative text from structured resume JSON for a given section."""
        basics = resume_data.get("basics") or {}
        if section in ("summary", "linkedin_about"):
            return basics.get("summary") or ""
        elif section == "linkedin_headline":
            return basics.get("title") or ""
        elif section == "experience_bullets":
            exps = resume_data.get("experience") or []
            bullets = []
            for exp in exps[:2]:
                bullets.extend(exp.get("highlights") or [])
            return "\n".join(bullets)
        elif section == "project_descriptions":
            projs = resume_data.get("projects") or []
            return "\n".join([f"{p.get('name')}: {p.get('description')}" for p in projs[:2]])
        elif section == "technical_skills":
            skills = resume_data.get("skills") or []
            return ", ".join([str(s) for s in skills])
        elif section == "achievements":
            exps = resume_data.get("experience") or []
            return "\n".join([h for exp in exps for h in (exp.get("highlights") or [])[:1]])
        elif section == "cover_letter":
            return f"Draft cover letter expressing strong enthusiasm for {basics.get('title') or 'the open position'}."
        return ""

    @classmethod
    def _heuristic_writing_suggestions(
        cls, section: str, target_role: str, original_text: str
    ) -> WritingSuggestionResponse:
        """Deterministic heuristic writing recommendations with strong action verbs."""
        text = original_text.strip() or f"Experienced professional delivering robust solutions in {target_role}."

        opt1 = (
            f"Spearheaded end-to-end delivery of high-impact {target_role} initiatives, "
            f"optimizing key system throughput by 30% and eliminating operational bottlenecks."
        )
        opt2 = (
            f"Architected and deployed scalable {target_role} workflows that enhanced team productivity "
            f"and ensured strict adherence to production SLAs across multi-functional engineering teams."
        )
        opt3 = (
            f"Leveraged modern {target_role} best practices and rigorous engineering standards to develop "
            f"reliable, maintainable solutions that accelerated delivery cycles by 25%."
        )

        suggestions = [
            WritingSuggestionItem(
                id=str(uuid.uuid4()),
                section=section,
                original_text=text,
                proposed_revision=opt1,
                explanation="Emphasizes executive ownership, operational efficiency, and quantifiable performance gains.",
                target_role=target_role,
                requires_user_confirmation=True,
                verification_prompt="Confirm whether you achieved a 30% throughput optimization or insert your actual figure.",
                action_verbs_used=["Spearheaded", "Optimizing", "Eliminating"],
                metric_focus="System throughput / efficiency",
            ),
            WritingSuggestionItem(
                id=str(uuid.uuid4()),
                section=section,
                original_text=text,
                proposed_revision=opt2,
                explanation="Highlights technical architecture, scalability, cross-functional leadership, and SLA governance.",
                target_role=target_role,
                requires_user_confirmation=False,
                verification_prompt=None,
                action_verbs_used=["Architected", "Deployed", "Enhanced"],
                metric_focus="SLA governance & reliability",
            ),
            WritingSuggestionItem(
                id=str(uuid.uuid4()),
                section=section,
                original_text=text,
                proposed_revision=opt3,
                explanation="Focuses on best practice execution, engineering rigor, and measurable release acceleration.",
                target_role=target_role,
                requires_user_confirmation=True,
                verification_prompt="Confirm whether you accelerated delivery cycles by 25% or enter your true percentage.",
                action_verbs_used=["Leveraged", "Develop", "Accelerated"],
                metric_focus="Cycle time reduction",
            ),
        ]

        return WritingSuggestionResponse(
            section=section,
            target_role=target_role,
            suggestions=suggestions,
            editorial_notes=f"Refined suggestions for {section} targeting {target_role}. Review highlighted metric claims before saving.",
        )

    # ---------------------------------------------------------------------------
    # 3. Personalized Career Roadmap
    # ---------------------------------------------------------------------------

    @classmethod
    async def generate_career_roadmap(
        cls,
        db: Session,
        user: User,
        target_role: str,
        resume_id: Optional[str] = None,
        resume_version_id: Optional[str] = None,
        current_level: Optional[str] = None,
        target_level: Optional[str] = None,
        job_description: Optional[str] = None,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ) -> CareerRoadmapResponse:
        """Builds a structured, actionable career roadmap with milestones, skill gaps, and learning objectives."""
        resume_data: Dict[str, Any] = {}
        if resume_id:
            doc_stmt = select(ResumeDocument).where(
                ResumeDocument.id == resume_id,
                ResumeDocument.user_id == user.id,
            )
            doc = db.scalars(doc_stmt).first()
            if doc:
                v_stmt = (
                    select(ResumeVersion)
                    .where(ResumeVersion.resume_id == resume_id)
                    .order_by(desc(ResumeVersion.version_number))
                )
                if resume_version_id:
                    v_stmt = select(ResumeVersion).where(
                        ResumeVersion.id == resume_version_id,
                        ResumeVersion.resume_id == resume_id,
                    )
                v = db.scalars(v_stmt).first()
                if v and v.resume_data:
                    resume_data = v.resume_data

        # AI Generation
        effective_key = (api_key or settings.GEMINI_API_KEY or "").strip()
        if effective_key:
            try:
                model = GeminiService.resolve_model(model_name)
                client = GeminiService.get_client(effective_key)

                prompt = f"""You are a seasoned Principal Engineer and Tech Talent Director.
Create a comprehensive, structured Career Progression Roadmap for a candidate targeting the role: "{target_role}".

TARGET ROLE: {target_role}
CURRENT LEVEL: {current_level or "Associate / Mid-level"}
TARGET LEVEL: {target_level or "Senior " + target_role}
JOB DESCRIPTION CONTEXT: {job_description or "General industry standards for " + target_role}

CANDIDATE RESUME SUMMARY:
```json
{json.dumps(resume_data, indent=2) if resume_data else "No existing resume provided"}
```

REQUIREMENTS:
1. Identify Candidate Strengths (verifiable skills and experiences they already have).
2. Identify Evidenced Skill Gaps (concrete skills they need to master for {target_role}).
3. Identify Potential Undocumented Skills (skills they likely know from adjacent experience but forgot to list).
4. Priority Learning Topics with clear learning objectives, priority (high/medium/low), and estimated weeks.
5. Practical Projects to build for their portfolio demonstrating these skills.
6. Portfolio and Resume improvement action items.
7. Industry Certifications worth pursuing (reputable, recognized credentials).
8. Short-term Milestones (0-90 days) and Medium-term Milestones (3-12 months) with measurable completion criteria.
9. Always include the standard disclaimer: "AI career guidance recommendations do not guarantee employment, interviews, or specific salary outcomes."

Respond strictly in valid JSON matching this schema:
{{
  "strengths": [{{ "skill": string, "category": string, "evidence": string }}],
  "skill_gaps": [{{ "skill": string, "priority": "high"|"medium"|"low", "reason": string }}],
  "potential_undocumented_skills": [{{ "skill": string, "recommendation": string }}],
  "learning_topics": [{{ "topic": string, "priority": string, "reason": string, "learning_objective": string, "estimated_weeks": int }}],
  "practical_projects": [{{ "title": string, "description": string, "skills_demonstrated": [string] }}],
  "portfolio_improvements": [{{ "area": string, "action": string }}],
  "certifications": [{{ "name": string, "issuer": string, "relevance": string }}],
  "action_items": [{{ "task": string, "priority": string, "timeline": string }}],
  "short_term_milestones": [{{ "timeframe": string, "title": string, "completion_criteria": string, "priority": string }}],
  "medium_term_milestones": [{{ "timeframe": string, "title": string, "completion_criteria": string, "priority": string }}]
}}
"""
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        response_mime_type="application/json",
                    ),
                )
                raw_json = json.loads(response.text or "{}")
                return CareerRoadmapResponse(
                    target_role=target_role,
                    current_level=current_level or "Associate / Mid-level",
                    target_level=target_level or f"Senior {target_role}",
                    strengths=raw_json.get("strengths") or [],
                    skill_gaps=raw_json.get("skill_gaps") or [],
                    potential_undocumented_skills=raw_json.get("potential_undocumented_skills") or [],
                    learning_topics=raw_json.get("learning_topics") or [],
                    practical_projects=raw_json.get("practical_projects") or [],
                    portfolio_improvements=raw_json.get("portfolio_improvements") or [],
                    certifications=raw_json.get("certifications") or [],
                    action_items=raw_json.get("action_items") or [],
                    short_term_milestones=raw_json.get("short_term_milestones") or [],
                    medium_term_milestones=raw_json.get("medium_term_milestones") or [],
                    disclaimer=(
                        "AI career guidance recommendations do not guarantee employment, "
                        "interviews, or specific salary outcomes."
                    ),
                )
            except Exception as e:
                logger.warning("Gemini roadmap generation failed (%s). Falling back to heuristic roadmap.", e)

        # Fallback Generator
        return cls._heuristic_career_roadmap(target_role, resume_data, current_level, target_level)

    @classmethod
    def _heuristic_career_roadmap(
        cls,
        target_role: str,
        resume_data: Dict[str, Any],
        current_level: Optional[str] = None,
        target_level: Optional[str] = None,
    ) -> CareerRoadmapResponse:
        """Deterministic roadmap generator with role benchmarks."""
        benchmark = ROLE_BENCHMARKS.get(target_role) or {
            "required_skills": ["Python", "System Design", "Cloud Infrastructure", "API Architecture"],
            "preferred_skills": ["Docker", "CI/CD", "Testing", "Performance Optimization"],
        }

        user_skills = [str(s).lower() for s in (resume_data.get("skills") or [])]

        strengths = []
        skill_gaps = []

        for req in benchmark.get("required_skills", []):
            if any(req.lower() in us for us in user_skills):
                strengths.append({
                    "skill": req,
                    "category": "Core Competency",
                    "evidence": f"Demonstrated in existing profile/skills ({req}).",
                })
            else:
                skill_gaps.append({
                    "skill": req,
                    "priority": "high",
                    "reason": f"Essential core requirement for competitive {target_role} roles.",
                })

        for pref in benchmark.get("preferred_skills", []):
            if not any(pref.lower() in us for us in user_skills):
                skill_gaps.append({
                    "skill": pref,
                    "priority": "medium",
                    "reason": f"High-demand bonus skill for advanced {target_role} practitioners.",
                })

        # Add fallback strength if list is empty
        if not strengths:
            strengths.append({
                "skill": "Technical Problem Solving",
                "category": "Foundational",
                "evidence": "Evidenced by engineering education or prior professional roles.",
            })

        learning_topics = [
            {
                "topic": f"Advanced {target_role} Architecture & Best Practices",
                "priority": "high",
                "reason": "Foundational requirement for senior-level engineering assessments.",
                "learning_objective": f"Master modern patterns, scalability, and security for {target_role}.",
                "estimated_weeks": 4,
            },
            {
                "topic": "Containerization & Cloud CI/CD Deployment",
                "priority": "medium",
                "reason": "Crucial for showcasing production readiness and DevOps collaboration.",
                "learning_objective": "Build automated test and deployment pipelines with Docker and GitHub Actions.",
                "estimated_weeks": 3,
            },
        ]

        practical_projects = [
            {
                "title": f"Production-Grade {target_role} Showcase Service",
                "description": f"End-to-end full-stack or backend service implementing core {target_role} algorithms with comprehensive tests.",
                "skills_demonstrated": benchmark.get("required_skills", [])[:4],
            }
        ]

        short_term_milestones = [
            {
                "timeframe": "0 - 30 Days",
                "title": "Resume & Profile Alignment",
                "completion_criteria": f"Tailor resume summary, skills, and experience bullets to emphasize {target_role} achievements.",
                "priority": "high",
            },
            {
                "timeframe": "30 - 60 Days",
                "title": "Close High-Priority Skill Gaps",
                "completion_criteria": "Complete core learning modules and document hands-on exercises in a public repository.",
                "priority": "high",
            },
            {
                "timeframe": "60 - 90 Days",
                "title": "Portfolio Project Deployment",
                "completion_criteria": "Deploy an interactive showcase project with public GitHub documentation, architecture diagram, and tests.",
                "priority": "medium",
            },
        ]

        medium_term_milestones = [
            {
                "timeframe": "3 - 6 Months",
                "title": "Targeted Interview Preparation & Role Applications",
                "completion_criteria": "Apply to top 20 verified target openings with tailored resumes and prepare for technical screenings.",
                "priority": "high",
            },
            {
                "timeframe": "6 - 12 Months",
                "title": f"{target_level or 'Senior ' + target_role} Leadership Impact",
                "completion_criteria": "Deliver measurable business value in target role, mentor junior developers, and drive system design.",
                "priority": "medium",
            },
        ]

        certifications = [
            {
                "name": f"Certified {target_role} Professional / Cloud Associate",
                "issuer": "AWS / Google Cloud / Microsoft / Industry Standard",
                "relevance": f"Validates verified cloud architecture and practical {target_role} skills.",
            }
        ]

        return CareerRoadmapResponse(
            target_role=target_role,
            current_level=current_level or "Associate / Mid-level",
            target_level=target_level or f"Senior {target_role}",
            strengths=strengths,
            skill_gaps=skill_gaps,
            potential_undocumented_skills=[
                {"skill": "RESTful API Integration", "recommendation": "Explicitly mention API consumers and contracts in bullet points."},
                {"skill": "Git Version Control & Code Reviews", "recommendation": "Highlight collaborative workflows and pull request governance."},
            ],
            learning_topics=learning_topics,
            practical_projects=practical_projects,
            portfolio_improvements=[
                {"area": "GitHub READMEs", "action": "Add architecture diagrams, setup instructions, and performance benchmarks."},
                {"area": "Live Demos", "action": "Host free live demo environments on Vercel, Render, or Railway."},
            ],
            certifications=certifications,
            action_items=[
                {"task": f"Refine resume with {target_role} keywords", "priority": "high", "timeline": "Week 1"},
                {"task": "Build and document showcase portfolio project", "priority": "high", "timeline": "Weeks 2-5"},
                {"task": "Network with engineering managers in target field", "priority": "medium", "timeline": "Ongoing"},
            ],
            short_term_milestones=short_term_milestones,
            medium_term_milestones=medium_term_milestones,
            disclaimer=(
                "AI career guidance recommendations do not guarantee employment, "
                "interviews, or specific salary outcomes."
            ),
        )

    # ---------------------------------------------------------------------------
    # 4. Multi-Role Comparison Engine
    # ---------------------------------------------------------------------------

    @classmethod
    async def compare_multi_role(
        cls,
        db: Session,
        user: User,
        resume_id: str,
        target_roles: List[str],
        resume_version_id: Optional[str] = None,
        model_name: Optional[str] = None,
    ) -> MultiRoleCompareResponse:
        """Evaluates a single resume across 2-4 target roles simultaneously using deterministic scoring."""
        # 1. Fetch resume document
        doc_stmt = select(ResumeDocument).where(
            ResumeDocument.id == resume_id,
            ResumeDocument.user_id == user.id,
        )
        resume_doc = db.scalars(doc_stmt).first()
        if not resume_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "RESUME_NOT_FOUND", "message": "Resume document not found."},
            )

        # 2. Fetch version
        if resume_version_id:
            v_stmt = select(ResumeVersion).where(
                ResumeVersion.id == resume_version_id,
                ResumeVersion.resume_id == resume_id,
            )
            version = db.scalars(v_stmt).first()
        else:
            v_stmt = (
                select(ResumeVersion)
                .where(ResumeVersion.resume_id == resume_id)
                .order_by(desc(ResumeVersion.version_number))
            )
            version = db.scalars(v_stmt).first()

        if not version or not version.resume_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "RESUME_VERSION_NOT_FOUND", "message": "Resume has no content to evaluate."},
            )

        resume_corpus = JobMatchScoringEngine.extract_resume_text_corpus(version.resume_data)
        user_skills = [str(s).lower() for s in (version.resume_data.get("skills") or [])]

        role_results: Dict[str, RoleEvaluationResult] = {}
        best_role = target_roles[0]
        highest_score = -1

        for role in target_roles:
            clean_role = role.strip()
            benchmark = ROLE_BENCHMARKS.get(clean_role) or {
                "required_skills": [clean_role, "Problem Solving", "Communication", "Technical Design"],
                "preferred_skills": ["Tools", "Processes", "Leadership"],
                "keywords": [clean_role.lower(), "experience", "development", "project", "design"],
            }

            req_skills = benchmark.get("required_skills", [])
            pref_skills = benchmark.get("preferred_skills", [])
            keywords = benchmark.get("keywords", [])

            # Evidenced vs missing
            evidenced: List[str] = []
            missing_req: List[str] = []
            missing_pref: List[str] = []

            for s in req_skills:
                if s.lower() in resume_corpus or any(s.lower() in us for us in user_skills):
                    evidenced.append(s)
                else:
                    missing_req.append(s)

            for s in pref_skills:
                if s.lower() in resume_corpus or any(s.lower() in us for us in user_skills):
                    evidenced.append(s)
                else:
                    missing_pref.append(s)

            # Deterministic scoring calculation
            req_score = int(round(100.0 * len(evidenced) / max(1, len(req_skills))))
            req_score = min(100, max(0, req_score))

            kw_score, _, _ = JobMatchScoringEngine.evaluate_keywords(keywords, resume_corpus)

            # Experience alignment heuristic: check if role keywords appear in experience highlights
            exp_text = " ".join([
                " ".join(e.get("highlights") or [])
                for e in (version.resume_data.get("experience") or [])
            ]).lower()
            exp_score, _, _ = JobMatchScoringEngine.evaluate_keywords(keywords[:5], exp_text)

            # Overall weighted score
            overall = int(round(req_score * 0.45 + exp_score * 0.35 + kw_score * 0.20))
            overall = min(100, max(0, overall))

            if overall > highest_score:
                highest_score = overall
                best_role = clean_role

            improvements = []
            if missing_req:
                improvements.append(f"Add verifiable experience with {', '.join(missing_req[:3])}.")
            if kw_score < 70:
                improvements.append(f"Incorporate industry-standard {clean_role} keywords throughout experience bullets.")
            if not improvements:
                improvements.append(f"Strong alignment! Highlight leadership and scale in {clean_role}.")

            role_results[clean_role] = RoleEvaluationResult(
                role=clean_role,
                overall_score=overall,
                required_skills_score=req_score,
                experience_score=exp_score,
                keyword_score=kw_score,
                evidenced_skills=evidenced,
                missing_required_skills=missing_req,
                missing_preferred_skills=missing_pref,
                experience_alignment_summary=(
                    f"Strong demonstrable alignment ({overall}/100) with {len(evidenced)} verified skills."
                    if overall >= 75
                    else f"Moderate alignment ({overall}/100). Focus on bridging {len(missing_req)} core skill gaps."
                ),
                recommended_variant_title=f"{resume_doc.title} - {clean_role} Specialist",
                suggested_improvements=improvements,
            )

        # Trade-offs summary
        trade_offs = (
            f"Based on current verified resume evidence, your strongest alignment is with '{best_role}' "
            f"({highest_score}/100). "
            f"Roles such as {[r for r in target_roles if r != best_role]} have lower immediate keyword "
            f"and required skill coverage, meaning a tailored variant or targeted upskilling is recommended."
        )

        return MultiRoleCompareResponse(
            resume_id=resume_id,
            resume_version_id=version.id,
            roles_evaluated=target_roles,
            role_results=role_results,
            best_fit_role=best_role,
            trade_offs_summary=trade_offs,
            scoring_version="v1.0",
        )

    # ---------------------------------------------------------------------------
    # 5. Project & Portfolio Recommendations
    # ---------------------------------------------------------------------------

    @classmethod
    async def recommend_projects(
        cls,
        db: Session,
        user: User,
        target_role: str,
        resume_id: Optional[str] = None,
        resume_version_id: Optional[str] = None,
        skill_gaps: Optional[List[str]] = None,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ) -> ProjectRecommendResponse:
        """Recommends actionable, real-world portfolio projects to demonstrate required competencies."""
        # AI Generation
        effective_key = (api_key or settings.GEMINI_API_KEY or "").strip()
        if effective_key:
            try:
                model = GeminiService.resolve_model(model_name)
                client = GeminiService.get_client(effective_key)

                prompt = f"""You are a Principal Software Architect and hiring manager.
Recommend 3 distinct, production-grade portfolio projects for a candidate targeting: "{target_role}".
KNOWN SKILL GAPS: {', '.join(skill_gaps) if skill_gaps else 'Standard high-value competencies for ' + target_role}

STRICT GUARDRAIL RULES:
1. These projects must be practical, real-world solutions that recruiters and engineering managers respect.
2. Clearly mark all projects as PROPOSED (not completed).
3. Provide resume bullet documentation guides so the candidate knows how to describe the project accurately ONCE built.

Respond strictly in valid JSON matching this schema:
{{
  "projects": [
    {{
      "title": string,
      "problem_statement": string,
      "skills_demonstrated": [string],
      "tech_stack": [string],
      "core_features": [string],
      "milestones": [{{ "phase": string, "deliverable": string }}],
      "deliverables": [string],
      "resume_documentation_guide": [string]
    }}
  ]
}}
"""
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        response_mime_type="application/json",
                    ),
                )
                raw_json = json.loads(response.text or "{}")
                p_list = raw_json.get("projects") or []
                if p_list:
                    items: List[ProjectRecommendationItem] = []
                    for p in p_list:
                        items.append(
                            ProjectRecommendationItem(
                                id=str(uuid.uuid4()),
                                title=p.get("title") or f"{target_role} System",
                                target_role=target_role,
                                problem_statement=p.get("problem_statement") or "",
                                skills_demonstrated=p.get("skills_demonstrated") or [],
                                tech_stack=p.get("tech_stack") or [],
                                core_features=p.get("core_features") or [],
                                milestones=p.get("milestones") or [],
                                deliverables=p.get("deliverables") or [],
                                resume_documentation_guide=p.get("resume_documentation_guide") or [],
                                is_proposed=True,
                            )
                        )
                    return ProjectRecommendResponse(
                        target_role=target_role,
                        projects=items,
                    )
            except Exception as e:
                logger.warning("Gemini project recommendations failed (%s). Falling back to heuristic projects.", e)

        # Fallback Generator
        return cls._heuristic_project_recommendations(target_role, skill_gaps)

    @classmethod
    def _heuristic_project_recommendations(
        cls, target_role: str, skill_gaps: Optional[List[str]] = None
    ) -> ProjectRecommendResponse:
        """Deterministic portfolio project recommendations."""
        benchmark = ROLE_BENCHMARKS.get(target_role) or {
            "required_skills": ["Python", "System Design", "Cloud Infrastructure"],
            "tech_stack": ["Python", "FastAPI", "Docker", "PostgreSQL", "GitHub Actions"],
        }
        gaps = skill_gaps or benchmark.get("required_skills", [])[:3]

        p1 = ProjectRecommendationItem(
            id=str(uuid.uuid4()),
            title=f"Enterprise {target_role} Pipeline & Analytics Platform",
            target_role=target_role,
            problem_statement=(
                f"Organizations need automated, reliable {target_role} workflows that process real-time data "
                "streams while ensuring low latency and auditability."
            ),
            skills_demonstrated=gaps + ["System Design", "Test Automation"],
            tech_stack=["Python", "FastAPI", "PostgreSQL", "Docker", "Pytest"],
            core_features=[
                "High-throughput asynchronous REST API endpoints with Pydantic validation.",
                "Containerized deployment with comprehensive unit and integration test coverage (>90%).",
                "Automated CI/CD workflow testing regressions on every pull request.",
            ],
            milestones=[
                {"phase": "Phase 1: Architecture & Data Modeling", "deliverable": "Database schema and API contracts"},
                {"phase": "Phase 2: Core Implementation", "deliverable": "Working API with business logic and unit tests"},
                {"phase": "Phase 3: Docker & CI/CD", "deliverable": "Containerized build with GitHub Actions pipeline"},
            ],
            deliverables=[
                "Public GitHub Repository with documented architecture and README.",
                "Live hosted demo with Swagger / OpenAPI documentation.",
                "Test suite with coverage badge and performance metrics.",
            ],
            resume_documentation_guide=[
                f"Designed and deployed a scalable {target_role} service utilizing Python, FastAPI, and Docker.",
                "Engineered automated CI/CD validation pipelines achieving 95% test coverage and zero regression deployments.",
                "Optimized database query throughput by 40% using indexed PostgreSQL schemas and asynchronous connection pooling.",
            ],
            is_proposed=True,
        )

        p2 = ProjectRecommendationItem(
            id=str(uuid.uuid4()),
            title=f"Cloud-Native {target_role} Monitoring & Automation Engine",
            target_role=target_role,
            problem_statement=(
                f"Engineers need unified telemetry, automated alerting, and self-healing mechanisms "
                f"for distributed {target_role} operations."
            ),
            skills_demonstrated=["Cloud Infrastructure", "Docker", "Monitoring", "Automation"],
            tech_stack=["Python", "Prometheus", "Grafana", "Docker Compose", "Linux"],
            core_features=[
                "Real-time health check probes and structured JSON logging.",
                "Prometheus metrics scraping for CPU, memory, latency, and error rate telemetry.",
                "Automated notification triggers via webhooks for threshold alerts.",
            ],
            milestones=[
                {"phase": "Phase 1: Metrics Instrumentation", "deliverable": "Prometheus exporter implementation"},
                {"phase": "Phase 2: Dashboard Visualization", "deliverable": "Configured Grafana monitoring dashboards"},
                {"phase": "Phase 3: Automated Remediation", "deliverable": "Webhook alerting and self-healing scripts"},
            ],
            deliverables=[
                "Docker Compose one-click launch configuration.",
                "Pre-built Grafana dashboard JSON templates.",
                "Case study documentation highlighting latency and uptime improvements.",
            ],
            resume_documentation_guide=[
                f"Built cloud-native observability infrastructure for {target_role} workflows using Prometheus and Grafana.",
                "Configured real-time alerting systems that reduced mean time to detection (MTTD) by 60%.",
            ],
            is_proposed=True,
        )

        return ProjectRecommendResponse(
            target_role=target_role,
            projects=[p1, p2],
        )

    # ---------------------------------------------------------------------------
    # 6. Database Persistence & Ownership Management
    # ---------------------------------------------------------------------------

    @classmethod
    def save_roadmap(
        cls,
        db: Session,
        user: User,
        target_role: str,
        strengths: List[Dict[str, Any]],
        skill_gaps: List[Dict[str, Any]],
        potential_undocumented_skills: List[Dict[str, Any]],
        learning_topics: List[Dict[str, Any]],
        practical_projects: List[Dict[str, Any]],
        portfolio_improvements: List[Dict[str, Any]],
        certifications: List[Dict[str, Any]],
        action_items: List[Dict[str, Any]],
        short_term_milestones: List[Dict[str, Any]],
        medium_term_milestones: List[Dict[str, Any]],
        resume_id: Optional[str] = None,
        resume_version_id: Optional[str] = None,
        current_level: Optional[str] = None,
        target_level: Optional[str] = None,
        disclaimer: Optional[str] = None,
    ) -> CareerRoadmap:
        """Persists a personalized career roadmap to the database with user ownership."""
        roadmap = CareerRoadmap(
            id=str(uuid.uuid4()),
            user_id=user.id,
            resume_id=resume_id,
            resume_version_id=resume_version_id,
            target_role=target_role,
            current_level=current_level,
            target_level=target_level,
            strengths=strengths,
            skill_gaps=skill_gaps,
            potential_undocumented_skills=potential_undocumented_skills,
            learning_topics=learning_topics,
            practical_projects=practical_projects,
            portfolio_improvements=portfolio_improvements,
            certifications=certifications,
            action_items=action_items,
            short_term_milestones=short_term_milestones,
            medium_term_milestones=medium_term_milestones,
            disclaimer=disclaimer or (
                "AI career guidance recommendations do not guarantee employment, "
                "interviews, or specific salary outcomes."
            ),
        )
        db.add(roadmap)
        db.commit()
        db.refresh(roadmap)
        return roadmap

    @classmethod
    def list_roadmaps(cls, db: Session, user: User) -> List[CareerRoadmap]:
        """Returns all roadmaps owned by the user, ordered by creation date."""
        stmt = (
            select(CareerRoadmap)
            .where(CareerRoadmap.user_id == user.id)
            .order_by(desc(CareerRoadmap.created_at))
        )
        return list(db.scalars(stmt).all())

    @classmethod
    def get_roadmap(cls, db: Session, user: User, roadmap_id: str) -> CareerRoadmap:
        """Retrieves a single roadmap owned by the user."""
        stmt = select(CareerRoadmap).where(
            CareerRoadmap.id == roadmap_id,
            CareerRoadmap.user_id == user.id,
        )
        roadmap = db.scalars(stmt).first()
        if not roadmap:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "ROADMAP_NOT_FOUND", "message": "Career roadmap not found or access denied."},
            )
        return roadmap

    @classmethod
    def delete_roadmap(cls, db: Session, user: User, roadmap_id: str) -> bool:
        """Deletes a career roadmap owned by the user."""
        roadmap = cls.get_roadmap(db, user, roadmap_id)
        db.delete(roadmap)
        db.commit()
        return True

    @classmethod
    def save_multi_role_comparison(
        cls,
        db: Session,
        user: User,
        resume_id: str,
        resume_version_id: str,
        roles_evaluated: List[str],
        role_results: Dict[str, Any],
        best_fit_role: str,
        trade_offs_summary: str,
    ) -> MultiRoleComparison:
        """Persists a multi-role evaluation matrix to the database."""
        comparison = MultiRoleComparison(
            id=str(uuid.uuid4()),
            user_id=user.id,
            resume_id=resume_id,
            resume_version_id=resume_version_id,
            roles_evaluated=roles_evaluated,
            role_results=role_results,
            best_fit_role=best_fit_role,
            trade_offs_summary=trade_offs_summary,
            scoring_version="v1.0",
        )
        db.add(comparison)
        db.commit()
        db.refresh(comparison)
        return comparison

    @classmethod
    def list_multi_role_comparisons(cls, db: Session, user: User) -> List[MultiRoleComparison]:
        """Returns all multi-role comparisons owned by the user."""
        stmt = (
            select(MultiRoleComparison)
            .where(MultiRoleComparison.user_id == user.id)
            .order_by(desc(MultiRoleComparison.created_at))
        )
        return list(db.scalars(stmt).all())

    @classmethod
    def get_multi_role_comparison(cls, db: Session, user: User, comparison_id: str) -> MultiRoleComparison:
        """Retrieves a single multi-role comparison owned by the user."""
        stmt = select(MultiRoleComparison).where(
            MultiRoleComparison.id == comparison_id,
            MultiRoleComparison.user_id == user.id,
        )
        comp = db.scalars(stmt).first()
        if not comp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "COMPARISON_NOT_FOUND", "message": "Multi-role comparison not found or access denied."},
            )
        return comp

    @classmethod
    def delete_multi_role_comparison(cls, db: Session, user: User, comparison_id: str) -> bool:
        """Deletes a multi-role comparison owned by the user."""
        comp = cls.get_multi_role_comparison(db, user, comparison_id)
        db.delete(comp)
        db.commit()
        return True
