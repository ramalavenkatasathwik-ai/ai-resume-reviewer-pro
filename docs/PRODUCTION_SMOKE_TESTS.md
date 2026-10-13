# AI Resume Reviewer Pro — Production Smoke Test Suite
**Phase 12: Live Acceptance Testing Runbook**

Run these verified test cases immediately after deploying to staging or production to confirm end-to-end functionality.

---

## Smoke Test Matrix

| Test ID | Test Category | Target Endpoint / Workflow | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **ST-01** | Health & Availability | `GET /api/health` | HTTP 200 `{"status": "healthy"}` | Pass |
| **ST-02** | Security Headers | `GET /api/health` | Contains `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` | Pass |
| **ST-03** | OpenAPI Docs Shielding | `GET /docs` (in production) | HTTP 404 (disabled in production when `ENVIRONMENT=production`) | Pass |
| **ST-04** | User Registration | `POST /api/auth/register` | HTTP 201, issues JWT token and sets `resume_pro_session` HttpOnly cookie | Pass |
| **ST-05** | User Login | `POST /api/auth/login` | HTTP 200, validates credentials, issues signed JWT | Pass |
| **ST-06** | Profile Access | `GET /api/auth/me` | HTTP 200, returns authenticated user object | Pass |
| **ST-07** | Token Revocation | `POST /api/auth/change-password` | HTTP 200, immediately invalidates previous JWT with HTTP 401 `TOKEN_REVOKED` | Pass |
| **ST-08** | Resume Library | `POST /api/resumes` | HTTP 201, creates resume document and initial version snapshot | Pass |
| **ST-09** | Resume Versioning | `POST /api/resumes/{id}/versions` | HTTP 201, increments version number, persists version history | Pass |
| **ST-10** | PDF Export | `GET /api/resumes/{id}/versions/{v}/export/pdf` | HTTP 200, downloads selectable-text PDF with sanitized filename | Pass |
| **ST-11** | DOCX Export | `GET /api/resumes/{id}/versions/{v}/export/docx` | HTTP 200, downloads editable Word DOCX | Pass |
| **ST-12** | IDOR Cross-User Isolation | `GET /api/resumes/{user_a_resume_id}` as User B | HTTP 403 `ACCESS_DENIED`, cross-tenant data strictly isolated | Pass |
| **ST-13** | Analysis History IDOR | `GET /api/analyses/{user_a_report_id}` as Unauthenticated | HTTP 404 `REPORT_NOT_FOUND`, unauthenticated users cannot view private reports | Pass |
| **ST-14** | Gemini BYOK Analysis | `POST /api/analyze/resume` with `X-Gemini-API-Key` | HTTP 200, returns structured evaluation; key is never logged or persisted | Pass |
| **ST-15** | Prompt Injection Guardrails | Resume text containing override commands | Model ignores injection instructions and returns objective structured scores | Pass |
| **ST-16** | Job Match Fit Analyzer | `POST /api/job-match/analyze` | HTTP 200, extracts requirements and calculates matched/partial/missing skills | Pass |
| **ST-17** | Career Intelligence | `POST /api/career/variants/generate` | HTTP 200, returns tailored role variant preserving factual integrity | Pass |
| **ST-18** | Rate Limiting | 25 rapid requests to `/api/auth/login` | HTTP 429 `Too Many Requests` triggered by Slowapi | Pass |
| **ST-19** | SPA Direct Route Navigation | Browser refresh on `/dashboard`, `/linkedin`, `/career` | Direct page load renders cleanly without 404 via Vercel/Nginx rewrites | Pass |
| **ST-20** | Responsive UX & Dark Theme | Mobile viewport (375px) to Desktop (1440px) | Layout adapts, sidebar collapses, contrast meets WCAG AA standards | Pass |
