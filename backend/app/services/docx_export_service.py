from io import BytesIO
from typing import Dict, Any, List, Optional
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE


def _add_hyperlink(paragraph, url: str, text: str, color_hex: str = "C91432"):
    """Appends an active clickable hyperlink to a python-docx paragraph."""
    part = paragraph.part
    r_id = part.relate_to(url, RELATIONSHIP_TYPE.HYPERLINK, is_external=True)

    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), r_id)

    new_run = OxmlElement("w:r")
    rPr = OxmlElement("w:rPr")

    color_el = OxmlElement("w:color")
    color_el.set(qn("w:val"), color_hex)
    rPr.append(color_el)

    u_el = OxmlElement("w:u")
    u_el.set(qn("w:val"), "single")
    rPr.append(u_el)

    new_run.append(rPr)
    new_run.text = text
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)


class DocxExportService:
    """Generates genuine, editable Microsoft Word (.docx) documents from structured resume data."""

    @classmethod
    def generate_resume_docx(
        cls,
        resume_data: Dict[str, Any],
        template_name: str = "modern",
        page_format: str = "letter",
    ) -> bytes:
        """Constructs a valid DOCX document preserving headings, bullet lists, dates, and hyperlinks."""
        doc = docx.Document()

        # Set 0.5 in margins
        for section in doc.sections:
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.5)
            section.right_margin = Inches(0.5)
            if (page_format or "").lower() == "a4":
                section.page_width = Inches(8.27)
                section.page_height = Inches(11.69)
            else:
                section.page_width = Inches(8.5)
                section.page_height = Inches(11.0)

        is_classic = (template_name or "").lower() in ("classic", "ats_classic", "ats")
        primary_color = RGBColor(17, 24, 39) if is_classic else RGBColor(11, 11, 14)
        accent_color = RGBColor(0, 0, 0) if is_classic else RGBColor(201, 20, 50)  # Crimson
        secondary_color = RGBColor(107, 114, 128)

        basics = resume_data.get("basics", {}) or {}
        name = (basics.get("name") or "Candidate Resume").strip()
        title = (basics.get("title") or "").strip()
        email = (basics.get("email") or "").strip()
        phone = (basics.get("phone") or "").strip()
        location = (basics.get("location") or "").strip()
        linkedin = (basics.get("linkedin") or "").strip()
        github = (basics.get("github") or "").strip()
        website = (basics.get("website") or "").strip()
        summary = (basics.get("summary") or "").strip()

        # 1. Candidate Name (Heading 1)
        name_para = doc.add_paragraph()
        if is_classic:
            name_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        name_run = name_para.add_run(name)
        name_run.font.name = "Arial"
        name_run.font.size = Pt(20 if is_classic else 22)
        name_run.font.bold = True
        name_run.font.color.rgb = accent_color if not is_classic else primary_color
        name_para.paragraph_format.space_after = Pt(2)

        # Title
        if title:
            title_para = doc.add_paragraph()
            if is_classic:
                title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            title_run = title_para.add_run(title)
            title_run.font.name = "Arial"
            title_run.font.size = Pt(11)
            title_run.font.color.rgb = secondary_color
            title_para.paragraph_format.space_after = Pt(4)

        # Contact info
        contact_para = doc.add_paragraph()
        if is_classic:
            contact_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        contact_para.paragraph_format.space_after = Pt(10)

        parts = []
        if email:
            _add_hyperlink(contact_para, f"mailto:{email}", email)
            parts.append(email)
        if phone:
            if parts:
                run_sep = contact_para.add_run("  •  ")
                run_sep.font.color.rgb = secondary_color
            r = contact_para.add_run(phone)
            r.font.name = "Arial"
            r.font.size = Pt(9)
            r.font.color.rgb = secondary_color
            parts.append(phone)
        if location:
            if parts:
                run_sep = contact_para.add_run("  •  ")
                run_sep.font.color.rgb = secondary_color
            r = contact_para.add_run(location)
            r.font.name = "Arial"
            r.font.size = Pt(9)
            r.font.color.rgb = secondary_color
            parts.append(location)
        if linkedin:
            if parts:
                run_sep = contact_para.add_run("  •  ")
                run_sep.font.color.rgb = secondary_color
            _add_hyperlink(contact_para, linkedin, "LinkedIn")
            parts.append("LinkedIn")
        if github:
            if parts:
                run_sep = contact_para.add_run("  •  ")
                run_sep.font.color.rgb = secondary_color
            _add_hyperlink(contact_para, github, "GitHub")
            parts.append("GitHub")
        if website:
            if parts:
                run_sep = contact_para.add_run("  •  ")
                run_sep.font.color.rgb = secondary_color
            _add_hyperlink(contact_para, website, "Portfolio")
            parts.append("Portfolio")

        def add_section_heading(heading_text: str):
            h_para = doc.add_paragraph()
            h_para.paragraph_format.space_before = Pt(12)
            h_para.paragraph_format.space_after = Pt(4)
            h_run = h_para.add_run(heading_text.upper())
            h_run.font.name = "Arial"
            h_run.font.size = Pt(11)
            h_run.font.bold = True
            h_run.font.color.rgb = primary_color if is_classic else accent_color

        # 2. Professional Summary
        if summary:
            add_section_heading("Professional Summary")
            s_para = doc.add_paragraph()
            s_para.paragraph_format.space_after = Pt(6)
            s_run = s_para.add_run(summary)
            s_run.font.name = "Arial"
            s_run.font.size = Pt(9.5)
            s_run.font.color.rgb = primary_color

        # 3. Work Experience
        experiences: List[Dict[str, Any]] = resume_data.get("experience", []) or []
        if experiences:
            add_section_heading("Work Experience")
            for exp in experiences:
                pos = (exp.get("position") or "").strip()
                comp = (exp.get("company") or "").strip()
                start = (exp.get("startDate") or "").strip()
                end = (exp.get("endDate") or "Present").strip()
                date_str = f"{start} - {end}" if start else end

                # Job title and company
                role_para = doc.add_paragraph()
                role_para.paragraph_format.space_before = Pt(4)
                role_para.paragraph_format.space_after = Pt(2)

                r_pos = role_para.add_run(pos)
                r_pos.font.name = "Arial"
                r_pos.font.size = Pt(10)
                r_pos.font.bold = True
                r_pos.font.color.rgb = primary_color

                if comp:
                    r_comp = role_para.add_run(f" — {comp}")
                    r_comp.font.name = "Arial"
                    r_comp.font.size = Pt(10)
                    r_comp.font.color.rgb = primary_color

                if date_str:
                    r_date = role_para.add_run(f"\t{date_str}")
                    r_date.font.name = "Arial"
                    r_date.font.size = Pt(9)
                    r_date.font.italic = True
                    r_date.font.color.rgb = secondary_color

                # Bullets
                highlights: List[str] = exp.get("highlights", []) or []
                for hl in highlights:
                    if hl and hl.strip():
                        b_para = doc.add_paragraph(style="List Bullet")
                        b_para.paragraph_format.space_after = Pt(1.5)
                        b_run = b_para.add_run(hl.strip())
                        b_run.font.name = "Arial"
                        b_run.font.size = Pt(9.5)
                        b_run.font.color.rgb = primary_color

        # 4. Technical Skills
        skills: List[str] = resume_data.get("skills", []) or []
        if skills:
            add_section_heading("Technical Skills")
            cleaned_skills = [s.strip() for s in skills if s and s.strip()]
            if cleaned_skills:
                sk_para = doc.add_paragraph()
                sk_para.paragraph_format.space_after = Pt(6)
                sk_run = sk_para.add_run("  •  ".join(cleaned_skills))
                sk_run.font.name = "Arial"
                sk_run.font.size = Pt(9.5)
                sk_run.font.color.rgb = primary_color

        # 5. Education
        education_list: List[Dict[str, Any]] = resume_data.get("education", []) or []
        if education_list:
            add_section_heading("Education")
            for edu in education_list:
                inst = (edu.get("institution") or "").strip()
                area = (edu.get("area") or "").strip()
                degree = (edu.get("studyType") or "").strip()
                start = (edu.get("startDate") or "").strip()
                end = (edu.get("endDate") or "").strip()
                date_str = f"{start} - {end}" if start and end else (end or start)
                score = (edu.get("score") or "").strip()

                edu_para = doc.add_paragraph()
                edu_para.paragraph_format.space_before = Pt(3)
                edu_para.paragraph_format.space_after = Pt(1)

                deg_str = f"{degree} in {area}" if (degree and area) else (degree or area)
                if deg_str:
                    e_deg = edu_para.add_run(deg_str)
                    e_deg.font.name = "Arial"
                    e_deg.font.size = Pt(10)
                    e_deg.font.bold = True
                    e_deg.font.color.rgb = primary_color

                if inst:
                    e_inst = edu_para.add_run(f" — {inst}")
                    e_inst.font.name = "Arial"
                    e_inst.font.size = Pt(10)
                    e_inst.font.color.rgb = primary_color

                if date_str:
                    e_date = edu_para.add_run(f"\t{date_str}")
                    e_date.font.name = "Arial"
                    e_date.font.size = Pt(9)
                    e_date.font.italic = True
                    e_date.font.color.rgb = secondary_color

                if score:
                    sc_para = doc.add_paragraph()
                    sc_para.paragraph_format.space_after = Pt(3)
                    sc_run = sc_para.add_run(f"Academic Honor / Score: {score}")
                    sc_run.font.name = "Arial"
                    sc_run.font.size = Pt(8.5)
                    sc_run.font.color.rgb = secondary_color

        # 6. Projects (Optional)
        projects: List[Dict[str, Any]] = resume_data.get("projects", []) or []
        if projects:
            add_section_heading("Projects")
            for proj in projects:
                p_name = (proj.get("name") or "").strip()
                p_desc = (proj.get("description") or "").strip()
                p_url = (proj.get("url") or "").strip()
                p_highlights = proj.get("highlights", []) or []

                p_para = doc.add_paragraph()
                p_para.paragraph_format.space_before = Pt(3)
                p_para.paragraph_format.space_after = Pt(1)

                p_run = p_para.add_run(p_name)
                p_run.font.name = "Arial"
                p_run.font.size = Pt(10)
                p_run.font.bold = True
                p_run.font.color.rgb = primary_color

                if p_url:
                    p_para.add_run(" | ")
                    _add_hyperlink(p_para, p_url, "Project Link")

                if p_desc:
                    d_para = doc.add_paragraph()
                    d_para.paragraph_format.space_after = Pt(2)
                    d_run = d_para.add_run(p_desc)
                    d_run.font.name = "Arial"
                    d_run.font.size = Pt(9)
                    d_run.font.color.rgb = primary_color

                for ph in p_highlights:
                    if ph and ph.strip():
                        b_para = doc.add_paragraph(style="List Bullet")
                        b_para.paragraph_format.space_after = Pt(1.5)
                        b_run = b_para.add_run(ph.strip())
                        b_run.font.name = "Arial"
                        b_run.font.size = Pt(9.5)
                        b_run.font.color.rgb = primary_color

        # 7. Certifications (Optional)
        certs: List[str] = resume_data.get("certifications", []) or []
        if certs:
            add_section_heading("Certifications")
            for cert in certs:
                if cert and cert.strip():
                    c_para = doc.add_paragraph(style="List Bullet")
                    c_para.paragraph_format.space_after = Pt(1.5)
                    c_run = c_para.add_run(cert.strip())
                    c_run.font.name = "Arial"
                    c_run.font.size = Pt(9.5)
                    c_run.font.color.rgb = primary_color

        buf = BytesIO()
        doc.save(buf)
        return buf.getvalue()
