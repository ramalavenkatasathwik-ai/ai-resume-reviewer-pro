import html
from io import BytesIO
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and draw total page numbers."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            if num_pages > 1:
                self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#71717A"))
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(self._pagesize[0] - 36, 18, page_text)
        self.restoreState()


class PdfExportService:
    """Enterprise-grade PDF generator for resumes, analysis reports, and job-match reports."""

    @classmethod
    def _sanitize(cls, text: Optional[str]) -> str:
        """HTML-escapes text for safe rendering in ReportLab Paragraphs."""
        if not text:
            return ""
        return html.escape(str(text).strip())

    @classmethod
    def _get_page_size(cls, page_format: Optional[str]):
        fmt = (page_format or "letter").lower()
        return A4 if fmt == "a4" else letter

    # --------------------------------------------------------------------------
    # 1. RESUME PDF EXPORT
    # --------------------------------------------------------------------------
    @classmethod
    def generate_resume_pdf(
        cls,
        resume_data: Dict[str, Any],
        template_name: str = "modern",
        page_format: str = "letter",
    ) -> bytes:
        """Generates a high-fidelity, text-selectable resume PDF.
        Supports 'ats_classic' / 'classic' and 'modern' layout templates.
        """
        buf = BytesIO()
        page_size = cls._get_page_size(page_format)
        margin = 36  # 0.5 inch margins

        doc = SimpleDocTemplate(
            buf,
            pagesize=page_size,
            leftMargin=margin,
            rightMargin=margin,
            topMargin=margin,
            bottomMargin=margin + 10,
        )

        template = template_name.lower().strip()
        is_classic = template in ("classic", "ats_classic", "ats")

        styles = getSampleStyleSheet()

        # Custom Color Palette
        text_primary = colors.HexColor("#111827") if is_classic else colors.HexColor("#0B0B0E")
        text_secondary = colors.HexColor("#4B5563") if is_classic else colors.HexColor("#4A4A55")
        accent_color = colors.HexColor("#000000") if is_classic else colors.HexColor("#C91432")
        divider_color = colors.HexColor("#D1D5DB") if is_classic else colors.HexColor("#E5E7EB")

        name_style = ParagraphStyle(
            "CandidateName",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=20 if is_classic else 22,
            leading=24 if is_classic else 26,
            textColor=accent_color if not is_classic else text_primary,
            alignment=1 if is_classic else 0,
            spaceAfter=4,
        )

        title_style = ParagraphStyle(
            "CandidateTitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=14,
            textColor=text_secondary,
            alignment=1 if is_classic else 0,
            spaceAfter=6,
        )

        contact_style = ParagraphStyle(
            "CandidateContact",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=text_secondary,
            alignment=1 if is_classic else 0,
            spaceAfter=8,
        )

        section_heading_style = ParagraphStyle(
            "SectionHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=text_primary if is_classic else accent_color,
            spaceBefore=8,
            spaceAfter=3,
            keepWithNext=True,
        )

        body_bold = ParagraphStyle(
            "BodyBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=12.5,
            textColor=text_primary,
        )

        body_regular = ParagraphStyle(
            "BodyRegular",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=text_primary,
        )

        body_secondary = ParagraphStyle(
            "BodySecondary",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=text_secondary,
        )

        bullet_style = ParagraphStyle(
            "BulletText",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12.5,
            textColor=text_primary,
            leftIndent=12,
            firstLineIndent=-8,
            spaceAfter=2,
        )

        story = []

        basics = resume_data.get("basics", {}) or {}
        name = cls._sanitize(basics.get("name") or "Candidate Resume")
        title = cls._sanitize(basics.get("title") or "")
        email = cls._sanitize(basics.get("email") or "")
        phone = cls._sanitize(basics.get("phone") or "")
        location = cls._sanitize(basics.get("location") or "")
        linkedin = cls._sanitize(basics.get("linkedin") or "")
        github = cls._sanitize(basics.get("github") or "")
        website = cls._sanitize(basics.get("website") or "")
        summary = cls._sanitize(basics.get("summary") or "")

        # 1. Header (Name, Title, Contacts)
        story.append(Paragraph(name, name_style))
        if title:
            story.append(Paragraph(title, title_style))

        contact_parts = []
        if email:
            contact_parts.append(f'<a href="mailto:{email}">{email}</a>')
        if phone:
            contact_parts.append(phone)
        if location:
            contact_parts.append(location)
        if linkedin:
            contact_parts.append(f'<a href="{linkedin}">LinkedIn</a>')
        if github:
            contact_parts.append(f'<a href="{github}">GitHub</a>')
        if website:
            contact_parts.append(f'<a href="{website}">Portfolio</a>')

        if contact_parts:
            story.append(Paragraph(" &bull; ".join(contact_parts), contact_style))

        story.append(HRFlowable(width="100%", thickness=1, color=divider_color, spaceBefore=2, spaceAfter=8))

        # 2. Professional Summary
        if summary:
            story.append(Paragraph("PROFESSIONAL SUMMARY", section_heading_style))
            if not is_classic:
                story.append(HRFlowable(width="100%", thickness=0.5, color=divider_color, spaceBefore=1, spaceAfter=4))
            story.append(Paragraph(summary, body_regular))
            story.append(Spacer(1, 8))

        # 3. Work Experience
        experiences: List[Dict[str, Any]] = resume_data.get("experience", []) or []
        if experiences:
            story.append(Paragraph("WORK EXPERIENCE", section_heading_style))
            if not is_classic:
                story.append(HRFlowable(width="100%", thickness=0.5, color=divider_color, spaceBefore=1, spaceAfter=4))

            usable_width = page_size[0] - (2 * margin)

            for exp in experiences:
                pos = cls._sanitize(exp.get("position") or "")
                comp = cls._sanitize(exp.get("company") or "")
                start = cls._sanitize(exp.get("startDate") or "")
                end = cls._sanitize(exp.get("endDate") or "Present")
                date_str = f"{start} - {end}" if start else end

                exp_block = []

                # Table row for position/company and date
                left_text = f"<b>{pos}</b>"
                if comp:
                    left_text += f" &mdash; {comp}"
                
                table_data = [
                    [
                        Paragraph(left_text, body_bold),
                        Paragraph(f"<i>{date_str}</i>", ParagraphStyle("DateCol", parent=body_secondary, alignment=2)),
                    ]
                ]
                t = Table(table_data, colWidths=[usable_width * 0.75, usable_width * 0.25])
                t.setStyle(
                    TableStyle([
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 0),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                        ("TOPPADDING", (0, 0), (-1, -1), 1),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ])
                )
                exp_block.append(t)

                # Bullet points
                highlights = exp.get("highlights", []) or []
                for hl in highlights:
                    hl_clean = cls._sanitize(hl)
                    if hl_clean:
                        exp_block.append(Paragraph(f"&bull;&nbsp;&nbsp;{hl_clean}", bullet_style))

                exp_block.append(Spacer(1, 5))
                story.append(KeepTogether(exp_block))

            story.append(Spacer(1, 4))

        # 4. Technical Skills
        skills: List[str] = resume_data.get("skills", []) or []
        if skills:
            story.append(Paragraph("TECHNICAL SKILLS", section_heading_style))
            if not is_classic:
                story.append(HRFlowable(width="100%", thickness=0.5, color=divider_color, spaceBefore=1, spaceAfter=4))

            cleaned_skills = [cls._sanitize(s) for s in skills if s]
            if cleaned_skills:
                skills_text = " &bull; ".join(cleaned_skills)
                story.append(Paragraph(skills_text, body_regular))
            story.append(Spacer(1, 8))

        # 5. Education
        education_list: List[Dict[str, Any]] = resume_data.get("education", []) or []
        if education_list:
            story.append(Paragraph("EDUCATION", section_heading_style))
            if not is_classic:
                story.append(HRFlowable(width="100%", thickness=0.5, color=divider_color, spaceBefore=1, spaceAfter=4))

            usable_width = page_size[0] - (2 * margin)

            for edu in education_list:
                inst = cls._sanitize(edu.get("institution") or "")
                area = cls._sanitize(edu.get("area") or "")
                degree = cls._sanitize(edu.get("studyType") or "")
                start = cls._sanitize(edu.get("startDate") or "")
                end = cls._sanitize(edu.get("endDate") or "")
                date_str = f"{start} - {end}" if start and end else (end or start)
                score = cls._sanitize(edu.get("score") or "")

                edu_block = []
                deg_text = f"<b>{degree}</b>" if degree else ""
                if area:
                    deg_text += f" in {area}" if deg_text else f"<b>{area}</b>"
                if inst:
                    deg_text += f" &mdash; {inst}" if deg_text else inst

                table_data = [
                    [
                        Paragraph(deg_text, body_bold),
                        Paragraph(f"<i>{date_str}</i>", ParagraphStyle("EduDateCol", parent=body_secondary, alignment=2)),
                    ]
                ]
                t = Table(table_data, colWidths=[usable_width * 0.75, usable_width * 0.25])
                t.setStyle(
                    TableStyle([
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 0),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                        ("TOPPADDING", (0, 0), (-1, -1), 1),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ])
                )
                edu_block.append(t)
                if score:
                    edu_block.append(Paragraph(f"Academic Honor / Score: {score}", body_secondary))

                edu_block.append(Spacer(1, 4))
                story.append(KeepTogether(edu_block))

            story.append(Spacer(1, 4))

        # 6. Projects (Optional)
        projects: List[Dict[str, Any]] = resume_data.get("projects", []) or []
        if projects:
            story.append(Paragraph("PROJECTS", section_heading_style))
            if not is_classic:
                story.append(HRFlowable(width="100%", thickness=0.5, color=divider_color, spaceBefore=1, spaceAfter=4))

            for proj in projects:
                p_name = cls._sanitize(proj.get("name") or "")
                p_desc = cls._sanitize(proj.get("description") or "")
                p_url = cls._sanitize(proj.get("url") or "")
                p_highlights = proj.get("highlights", []) or []

                p_block = []
                p_heading = f"<b>{p_name}</b>"
                if p_url:
                    p_heading += f' | <a href="{p_url}"><i>Link</i></a>'
                p_block.append(Paragraph(p_heading, body_bold))
                if p_desc:
                    p_block.append(Paragraph(p_desc, body_regular))

                for ph in p_highlights:
                    ph_clean = cls._sanitize(ph)
                    if ph_clean:
                        p_block.append(Paragraph(f"&bull;&nbsp;&nbsp;{ph_clean}", bullet_style))

                p_block.append(Spacer(1, 4))
                story.append(KeepTogether(p_block))

            story.append(Spacer(1, 4))

        # 7. Certifications (Optional)
        certs: List[str] = resume_data.get("certifications", []) or []
        if certs:
            story.append(Paragraph("CERTIFICATIONS", section_heading_style))
            if not is_classic:
                story.append(HRFlowable(width="100%", thickness=0.5, color=divider_color, spaceBefore=1, spaceAfter=4))

            for cert in certs:
                cert_clean = cls._sanitize(cert)
                if cert_clean:
                    story.append(Paragraph(f"&bull;&nbsp;&nbsp;{cert_clean}", bullet_style))
            story.append(Spacer(1, 4))

        doc.build(story, canvasmaker=NumberedCanvas)
        return buf.getvalue()

    # --------------------------------------------------------------------------
    # 2. ANALYSIS REPORT PDF EXPORT
    # --------------------------------------------------------------------------
    @classmethod
    def generate_analysis_report_pdf(
        cls,
        report_id: str,
        target_role: str,
        original_filename: str,
        created_at: datetime,
        overall_score: Optional[int],
        ats_score: Optional[int],
        result_json: Optional[Dict[str, Any]] = None,
        source_type: str = "pdf",
    ) -> bytes:
        """Generates a professional executive PDF summary of a resume or LinkedIn analysis."""
        buf = BytesIO()
        page_size = letter
        margin = 36

        doc = SimpleDocTemplate(
            buf,
            pagesize=page_size,
            leftMargin=margin,
            rightMargin=margin,
            topMargin=margin,
            bottomMargin=margin + 12,
        )

        styles = getSampleStyleSheet()
        usable_width = page_size[0] - (2 * margin)

        crimson = colors.HexColor("#C91432")
        orange = colors.HexColor("#FF7417")
        dark_bg = colors.HexColor("#141419")
        gray_text = colors.HexColor("#4B5563")

        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=crimson,
            spaceAfter=2,
        )
        subtitle_style = ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=gray_text,
            spaceAfter=8,
        )
        heading_style = ParagraphStyle(
            "ReportHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=crimson,
            spaceBefore=10,
            spaceAfter=4,
            keepWithNext=True,
        )
        body_style = ParagraphStyle(
            "ReportBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12.5,
            textColor=colors.HexColor("#1F2937"),
        )
        bullet_style = ParagraphStyle(
            "ReportBullet",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12.5,
            textColor=colors.HexColor("#1F2937"),
            leftIndent=12,
            firstLineIndent=-8,
            spaceAfter=2,
        )

        story = []

        # Header
        story.append(Paragraph("AI Resume Reviewer Pro &mdash; Executive Analysis Report", title_style))
        date_str = created_at.strftime("%B %d, %Y at %H:%M UTC") if created_at else "Recently"
        story.append(
            Paragraph(
                f"Target Role: <b>{cls._sanitize(target_role)}</b> &bull; Source: <b>{cls._sanitize(original_filename)}</b> ({cls._sanitize(source_type.upper())}) &bull; Date: {date_str}",
                subtitle_style,
            )
        )
        story.append(HRFlowable(width="100%", thickness=1, color=orange, spaceBefore=2, spaceAfter=8))

        # Score Overview Table
        score_val = f"{overall_score}/100" if overall_score is not None else "N/A"
        ats_val = f"{ats_score}/100" if ats_score is not None else "N/A"

        score_table_data = [
            [
                Paragraph("<b>Overall Quality Score</b>", body_style),
                Paragraph(f"<b><font size=14 color='{crimson}'>{score_val}</font></b>", body_style),
                Paragraph("<b>ATS Parseability Benchmark</b>", body_style),
                Paragraph(f"<b><font size=14 color='{orange}'>{ats_val}</font></b>", body_style),
            ]
        ]
        t = Table(score_table_data, colWidths=[usable_width * 0.3, usable_width * 0.2, usable_width * 0.3, usable_width * 0.2])
        t.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F9FAFB")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ])
        )
        story.append(t)
        story.append(Spacer(1, 8))

        data = result_json or {}

        # Executive Summary
        exec_summary = data.get("executive_summary") or data.get("summary")
        if exec_summary:
            story.append(Paragraph("EXECUTIVE SUMMARY", heading_style))
            story.append(Paragraph(cls._sanitize(exec_summary), body_style))
            story.append(Spacer(1, 6))

        # Strengths & Weaknesses
        strengths = data.get("strengths") or []
        weaknesses = data.get("weaknesses") or data.get("areas_for_improvement") or []

        if strengths:
            story.append(Paragraph("KEY STRENGTHS", heading_style))
            for s in strengths:
                s_text = cls._sanitize(s if isinstance(s, str) else s.get("point") or str(s))
                story.append(Paragraph(f"&bull;&nbsp;&nbsp;{s_text}", bullet_style))
            story.append(Spacer(1, 6))

        if weaknesses:
            story.append(Paragraph("AREAS FOR IMPROVEMENT", heading_style))
            for w in weaknesses:
                w_text = cls._sanitize(w if isinstance(w, str) else w.get("point") or str(w))
                story.append(Paragraph(f"&bull;&nbsp;&nbsp;{w_text}", bullet_style))
            story.append(Spacer(1, 6))

        # Keywords / Role Alignment
        missing_kw = data.get("missing_keywords") or []
        if missing_kw:
            story.append(Paragraph("CRITICAL KEYWORD GAPS", heading_style))
            kw_cleaned = [cls._sanitize(k) for k in missing_kw]
            story.append(Paragraph(" &bull; ".join(kw_cleaned), body_style))
            story.append(Spacer(1, 6))

        # Action Plan / Recommendations
        action_plan = data.get("career_action_plan") or data.get("recommendations") or []
        if action_plan:
            story.append(Paragraph("RECOMMENDED ACTION PLAN", heading_style))
            for idx, item in enumerate(action_plan, 1):
                item_text = cls._sanitize(item if isinstance(item, str) else item.get("action") or str(item))
                story.append(Paragraph(f"<b>{idx}.</b>&nbsp;{item_text}", bullet_style))
            story.append(Spacer(1, 8))

        # Disclaimer
        story.append(Spacer(1, 10))
        disclaimer_text = (
            "<i><b>Disclaimer:</b> This analysis report is generated via automated AI models for career guidance. "
            "Scores and metrics are benchmark estimates and do not guarantee ATS ranking, interview invitations, or employment outcomes.</i>"
        )
        story.append(Paragraph(disclaimer_text, ParagraphStyle("Disc", parent=body_style, fontSize=7.5, leading=10, textColor=gray_text)))

        doc.build(story, canvasmaker=NumberedCanvas)
        return buf.getvalue()

    # --------------------------------------------------------------------------
    # 3. JOB MATCH REPORT PDF EXPORT
    # --------------------------------------------------------------------------
    @classmethod
    def generate_job_match_report_pdf(
        cls,
        report_id: str,
        job_title: str,
        company_name: Optional[str],
        overall_score: int,
        required_skills_score: int,
        preferred_skills_score: int,
        experience_score: int,
        keyword_score: int,
        comparison_items: List[Dict[str, Any]],
        recommendations: List[Dict[str, Any]],
        matched_keywords: List[str],
        missing_keywords: List[str],
        created_at: datetime,
    ) -> bytes:
        """Generates an explainable Job Description Fit Analysis PDF report."""
        buf = BytesIO()
        page_size = letter
        margin = 36

        doc = SimpleDocTemplate(
            buf,
            pagesize=page_size,
            leftMargin=margin,
            rightMargin=margin,
            topMargin=margin,
            bottomMargin=margin + 12,
        )

        styles = getSampleStyleSheet()
        usable_width = page_size[0] - (2 * margin)

        crimson = colors.HexColor("#C91432")
        orange = colors.HexColor("#FF7417")
        gray_text = colors.HexColor("#4B5563")

        title_style = ParagraphStyle(
            "JMTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=crimson,
            spaceAfter=2,
        )
        subtitle_style = ParagraphStyle(
            "JMSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=gray_text,
            spaceAfter=8,
        )
        heading_style = ParagraphStyle(
            "JMHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=crimson,
            spaceBefore=8,
            spaceAfter=3,
            keepWithNext=True,
        )
        body_style = ParagraphStyle(
            "JMBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11.5,
            textColor=colors.HexColor("#1F2937"),
        )
        bullet_style = ParagraphStyle(
            "JMBullet",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11.5,
            textColor=colors.HexColor("#1F2937"),
            leftIndent=10,
            firstLineIndent=-6,
            spaceAfter=2,
        )

        story = []

        # Header
        story.append(Paragraph("AI Job Fit & Requirement Alignment Report", title_style))
        company_str = f" at <b>{cls._sanitize(company_name)}</b>" if company_name else ""
        date_str = created_at.strftime("%B %d, %Y") if created_at else "Recent"
        story.append(
            Paragraph(
                f"Target Position: <b>{cls._sanitize(job_title)}</b>{company_str} &bull; Generated: {date_str}",
                subtitle_style,
            )
        )
        story.append(HRFlowable(width="100%", thickness=1, color=orange, spaceBefore=2, spaceAfter=6))

        # Score Breakdown Grid
        score_table_data = [
            [
                Paragraph("<b>Overall Fit</b>", body_style),
                Paragraph("<b>Required Skills</b>", body_style),
                Paragraph("<b>Preferred Skills</b>", body_style),
                Paragraph("<b>Experience</b>", body_style),
                Paragraph("<b>Keywords</b>", body_style),
            ],
            [
                Paragraph(f"<b><font size=12 color='{crimson}'>{overall_score}%</font></b>", body_style),
                Paragraph(f"<b><font size=11 color='{orange}'>{required_skills_score}%</font></b>", body_style),
                Paragraph(f"<b><font size=11>{preferred_skills_score}%</font></b>", body_style),
                Paragraph(f"<b><font size=11>{experience_score}%</font></b>", body_style),
                Paragraph(f"<b><font size=11>{keyword_score}%</font></b>", body_style),
            ],
        ]
        col_w = usable_width / 5
        t = Table(score_table_data, colWidths=[col_w] * 5)
        t.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F9FAFB")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(t)
        story.append(Spacer(1, 8))

        # Keywords Alignment
        story.append(Paragraph("KEYWORDS ANALYSIS", heading_style))
        if matched_keywords:
            story.append(
                Paragraph(
                    f"<b>Evidenced Keywords ({len(matched_keywords)}):</b> " + cls._sanitize(", ".join(matched_keywords)),
                    body_style,
                )
            )
        if missing_keywords:
            story.append(
                Paragraph(
                    f"<b><font color='{crimson}'>Missing / Unemphasized Keywords ({len(missing_keywords)}):</font></b> "
                    + cls._sanitize(", ".join(missing_keywords)),
                    body_style,
                )
            )
        story.append(Spacer(1, 8))

        # Requirements Evidence Matrix
        story.append(Paragraph("REQUIREMENT EVIDENCE MATRIX", heading_style))
        matrix_rows = [
            [
                Paragraph("<b>Requirement</b>", body_style),
                Paragraph("<b>Status</b>", body_style),
                Paragraph("<b>Evidence / Gap</b>", body_style),
            ]
        ]

        for item in comparison_items:
            req = cls._sanitize(item.get("requirement") or "")
            st = str(item.get("status") or "not_evidenced").lower()

            if st == "matched":
                status_cell = "<font color='green'><b>Matched</b></font>"
            elif st == "partial":
                status_cell = "<font color='orange'><b>Partial</b></font>"
            elif st == "not_assessable":
                status_cell = "<font color='gray'><b>Unassessable</b></font>"
            else:
                status_cell = f"<font color='{crimson}'><b>Missing</b></font>"

            ev = cls._sanitize(item.get("evidence") or item.get("gap_analysis") or "No evidence cited.")
            matrix_rows.append([
                Paragraph(req, body_style),
                Paragraph(status_cell, body_style),
                Paragraph(ev, body_style),
            ])

        mt = Table(matrix_rows, colWidths=[usable_width * 0.45, usable_width * 0.15, usable_width * 0.4])
        mt.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(mt)
        story.append(Spacer(1, 8))

        # Tailoring Recommendations
        if recommendations:
            story.append(Paragraph("RECOMMENDED TAILORING ACTIONS", heading_style))
            for r in recommendations:
                if isinstance(r, dict):
                    action = cls._sanitize(r.get("recommended_action") or r.get("action") or "")
                    reason = cls._sanitize(r.get("reason") or "")
                    proposed = cls._sanitize(r.get("proposed_text") or "")
                    requires_conf = r.get("requires_user_confirmation", False)

                    rec_text = f"<b>{action}</b> &mdash; {reason}" if reason else f"<b>{action}</b>"
                    if requires_conf:
                        rec_text += " <i>(Requires candidate truthfulness verification)</i>"
                    if proposed:
                        rec_text += f"<br/>&bull; Proposed: <i>\"{proposed}\"</i>"
                else:
                    rec_text = f"<b>&bull;</b> {cls._sanitize(str(r))}"

                story.append(Paragraph(rec_text, bullet_style))

        # Disclaimer
        story.append(Spacer(1, 10))
        disclaimer_text = (
            "<i><b>Disclaimer:</b> Match calculations are deterministic estimates comparing resume evidence against extracted job criteria. "
            "Unassessable criteria are exempt from score penalties. These scores do not guarantee ATS ranking or hiring decisions.</i>"
        )
        story.append(Paragraph(disclaimer_text, ParagraphStyle("JMDisc", parent=body_style, fontSize=7.5, leading=10, textColor=gray_text)))

        doc.build(story, canvasmaker=NumberedCanvas)
        return buf.getvalue()
