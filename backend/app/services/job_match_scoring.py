import re
from typing import List, Dict, Any, Tuple, Set
from app.schemas.job_match import (
    RequirementMatchItem,
    ScoreBreakdown,
    JobMatchComparison,
)


class JobMatchScoringEngine:
    """Deterministic explainable scoring engine for resume-to-job matching.
    
    Principles:
    1. Normalized 0-100 scales for all scores.
    2. Explicit separation of required vs preferred qualifications.
    3. Unassessable requirements are excluded from the denominator to avoid unfair penalties.
    4. Keyword matches are strictly deduplicated; keyword stuffing does not inflate score.
    5. Clean mathematical breakdown of all weighted components and factors.
    """

    DEFAULT_WEIGHTS = {
        "required_skills": 0.35,
        "preferred_skills": 0.15,
        "experience": 0.25,
        "education": 0.10,
        "keywords": 0.15,
    }

    @staticmethod
    def extract_resume_text_corpus(resume_data: Dict[str, Any]) -> str:
        """Flattens structured resume JSON into a searchable text corpus."""
        tokens: List[str] = []

        basics = resume_data.get("basics") or {}
        tokens.extend([
            str(basics.get("name") or ""),
            str(basics.get("title") or ""),
            str(basics.get("summary") or ""),
        ])

        for exp in resume_data.get("experience") or []:
            tokens.extend([
                str(exp.get("company") or ""),
                str(exp.get("position") or ""),
                " ".join(exp.get("highlights") or []),
            ])

        for edu in resume_data.get("education") or []:
            tokens.extend([
                str(edu.get("institution") or ""),
                str(edu.get("area") or ""),
                str(edu.get("studyType") or ""),
            ])

        for skill in resume_data.get("skills") or []:
            tokens.append(str(skill))

        for cert in resume_data.get("certifications") or []:
            tokens.append(str(cert))

        for proj in resume_data.get("projects") or []:
            tokens.extend([
                str(proj.get("name") or ""),
                str(proj.get("description") or ""),
                " ".join(proj.get("highlights") or []),
            ])

        return " ".join(tokens).lower()

    @classmethod
    def calculate_category_score(
        cls, items: List[RequirementMatchItem]
    ) -> Tuple[int, int, int, int, int]:
        """Calculates score (0-100) and counts for a specific list of requirement items.
        
        Scoring:
        - matched = 1.0 point
        - partial = 0.5 points
        - not_evidenced = 0 points
        - not_assessable = excluded from denominator
        """
        if not items:
            return 100, 0, 0, 0, 0

        matched_count = 0
        partial_count = 0
        not_evidenced_count = 0
        unassessable_count = 0
        points = 0.0

        for it in items:
            st = it.status.lower()
            if st == "matched":
                points += 1.0
                matched_count += 1
            elif st == "partial":
                points += 0.5
                partial_count += 1
            elif st == "not_assessable":
                unassessable_count += 1
            else:
                not_evidenced_count += 1

        assessable_total = len(items) - unassessable_count
        if assessable_total <= 0:
            score = 75  # Neutral baseline when nothing in this section is assessable
        else:
            score = int(round(100.0 * (points / assessable_total)))

        return max(0, min(100, score)), matched_count, partial_count, not_evidenced_count, unassessable_count

    @classmethod
    def evaluate_keywords(
        cls, relevant_keywords: List[str], resume_corpus: str
    ) -> Tuple[int, List[str], List[str]]:
        """Deduplicates and evaluates keyword presence without keyword-stuffing bias."""
        # Deduplicate and normalize keywords
        unique_keywords: Set[str] = set()
        for kw in relevant_keywords:
            cleaned = kw.strip().lower()
            if len(cleaned) >= 2:
                unique_keywords.add(cleaned)

        if not unique_keywords:
            return 100, [], []

        matched: List[str] = []
        missing: List[str] = []

        for kw in sorted(unique_keywords):
            # Check for keyword boundary or substring
            pattern = r'\b' + re.escape(kw) + r'\b'
            if re.search(pattern, resume_corpus) or kw in resume_corpus:
                matched.append(kw)
            else:
                missing.append(kw)

        keyword_score = int(round(100.0 * len(matched) / len(unique_keywords)))
        return max(0, min(100, keyword_score)), matched, missing

    @classmethod
    def compute_scores(
        cls,
        items: List[RequirementMatchItem],
        relevant_keywords: List[str],
        resume_data: Dict[str, Any],
    ) -> JobMatchComparison:
        """Executes the full deterministic explainable scoring pipeline."""
        resume_corpus = cls.extract_resume_text_corpus(resume_data)

        # Categorize requirements
        req_skills_items = [
            i for i in items
            if i.is_required and i.category in ("required_skill", "skill", "qualification", "technical_skill")
        ]
        pref_skills_items = [
            i for i in items
            if not i.is_required or i.category in ("preferred_skill", "preferred_qualification")
        ]
        exp_items = [i for i in items if i.category in ("experience", "responsibility")]
        edu_items = [i for i in items if i.category in ("education", "degree")]

        # Category scores
        req_score, r_m, r_p, r_ne, r_u = cls.calculate_category_score(req_skills_items)
        pref_score, p_m, p_p, p_ne, p_u = cls.calculate_category_score(pref_skills_items)
        exp_score, e_m, e_p, e_ne, e_u = cls.calculate_category_score(exp_items)
        edu_score, ed_m, ed_p, ed_ne, ed_u = cls.calculate_category_score(edu_items)
        kw_score, matched_kws, missing_kws = cls.evaluate_keywords(relevant_keywords, resume_corpus)

        total_reqs = len(items)
        matched_total = r_m + p_m + e_m + ed_m
        partial_total = r_p + p_p + e_p + ed_p
        not_evidenced_total = r_ne + p_ne + e_ne + ed_ne
        unassessable_total = r_u + p_u + e_u + ed_u

        # Dynamic weight normalization: if a category has no requirements, rebalance weights
        weights = dict(cls.DEFAULT_WEIGHTS)
        active_weights = {}
        if req_skills_items:
            active_weights["required_skills"] = weights["required_skills"]
        if pref_skills_items:
            active_weights["preferred_skills"] = weights["preferred_skills"]
        if exp_items:
            active_weights["experience"] = weights["experience"]
        if edu_items:
            active_weights["education"] = weights["education"]
        active_weights["keywords"] = weights["keywords"]

        weight_sum = sum(active_weights.values()) or 1.0
        normalized_weights = {k: v / weight_sum for k, v in active_weights.items()}

        overall = 0.0
        if "required_skills" in normalized_weights:
            overall += req_score * normalized_weights["required_skills"]
        if "preferred_skills" in normalized_weights:
            overall += pref_score * normalized_weights["preferred_skills"]
        if "experience" in normalized_weights:
            overall += exp_score * normalized_weights["experience"]
        if "education" in normalized_weights:
            overall += edu_score * normalized_weights["education"]
        if "keywords" in normalized_weights:
            overall += kw_score * normalized_weights["keywords"]

        overall_score = max(0, min(100, int(round(overall))))

        # Detailed breakdown explanation
        explanation = (
            f"Overall match score of {overall_score}/100 calculated from: "
            f"Required Skills ({req_score}/100, weight {round(normalized_weights.get('required_skills', 0)*100)}%), "
            f"Experience Alignment ({exp_score}/100, weight {round(normalized_weights.get('experience', 0)*100)}%), "
            f"Keyword Coverage ({kw_score}/100, weight {round(normalized_weights.get('keywords', 0)*100)}%), "
            f"Preferred Skills ({pref_score}/100, weight {round(normalized_weights.get('preferred_skills', 0)*100)}%), "
            f"and Education Alignment ({edu_score}/100, weight {round(normalized_weights.get('education', 0)*100)}%). "
            f"Total assessed requirements: {total_reqs} ({matched_total} matched, {partial_total} partial, "
            f"{not_evidenced_total} not evidenced, {unassessable_total} unassessable)."
        )

        breakdown = ScoreBreakdown(
            overall_score=overall_score,
            required_skills_score=req_score,
            preferred_skills_score=pref_score,
            experience_score=exp_score,
            education_score=edu_score,
            keyword_score=kw_score,
            weights={k: round(v, 3) for k, v in normalized_weights.items()},
            total_requirements=total_reqs,
            matched_count=matched_total,
            partial_count=partial_total,
            not_evidenced_count=not_evidenced_total,
            unassessable_count=unassessable_total,
            explanation=explanation,
        )

        # Lists for display
        strongest_evidence = [
            f"{i.requirement}: {i.evidence}"
            for i in items
            if i.status == "matched" and i.evidence
        ][:8]

        missing_reqs = [i.requirement for i in items if i.status == "not_evidenced"]
        partial_reqs = [i.requirement for i in items if i.status == "partial"]
        unassessable_reqs = [i.requirement for i in items if i.status == "not_assessable"]

        return JobMatchComparison(
            score_breakdown=breakdown,
            items=items,
            matched_keywords=matched_kws,
            missing_keywords=missing_kws,
            strongest_evidence=strongest_evidence,
            missing_requirements=missing_reqs,
            partial_requirements=partial_reqs,
            unassessable_requirements=unassessable_reqs,
        )
