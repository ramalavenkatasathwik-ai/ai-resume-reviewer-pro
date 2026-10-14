# Data Retention and Deletion Policy — AI Resume Reviewer Pro

**Document Owner:** Data Protection & Security Compliance Lead  
**Applicability:** GDPR (Articles 15 & 17), CCPA/CPRA, and General Data Minimization Principles  
**Last Updated:** October 14, 2026  

---

## 1. Data Inventory & Retention Schedules

The application stores candidate career artifacts and evaluation data strictly for the operational necessity of providing resume analysis and career intelligence.

| Category | Description | Storage Medium | Default Retention Period | Deletion Method |
|:---|:---|:---|:---|:---|
| **Account Credentials** | Email, display name, password bcrypt hash | PostgreSQL (`users`) | Until account deletion | Cascade hard deletion on user delete |
| **Resume Documents & Snapshots** | Formatted resume JSON, sections, work history | PostgreSQL (`resume_documents`, `resume_versions`) | Until user deletes document or account | Hard deletion via `/api/resumes/{id}` |
| **Uploaded PDF Files** | Raw binary resume/LinkedIn PDFs | Private Storage (`storage/private/` or Supabase) | Until file deletion or account deletion | Physical unlinking via `StorageService.delete_user_file()` |
| **Analysis Evaluation Reports** | ATS scores, breakdown metrics, action plan JSON | PostgreSQL (`analysis_history`) | 90 days for anonymous sessions; until user deletes for accounts | Hard deletion via `/api/analyses/{id}` |
| **Job Description Matches** | Extracted JD requirements, gap analysis | PostgreSQL (`job_match_reports`) | 90 days (configurable `retention_days`) | Automated retention purge or user deletion |
| **Career Roadmaps** | Skill gap milestones, recommended projects | PostgreSQL (`career_roadmaps`) | Until user deletes roadmap or account | Hard deletion via `/api/career/roadmaps/{id}` |
| **Password Reset Tokens** | High-entropy SHA-256 token hashes | PostgreSQL (`password_reset_tokens`) | 15 minutes TTL | Auto-invalidated upon use or expiry |

---

## 2. Right to Erasure (Complete Account Deletion)

Users retain unconditional control over their personal data and may permanently delete their account at any time via the API (`DELETE /api/auth/account`) or UI (**Settings** -> **Account** -> **Delete Account**).

### 2.1. Account Deletion Execution Workflow

When a deletion request is authenticated with the user's current password:

1. **Authentication Verification:** The caller's password is verified against `hashed_password` using constant-time bcrypt verification.
2. **Physical File Storage Purge:** All `StoredFile` records for the user are queried, and their underlying binary files on physical storage are purged:
   ```python
   for file in user_files:
       provider.delete(file.storage_key)
   ```
3. **Database Cascading Deletion:** The following entities belonging to the user are deleted:
   - `resume_versions` and `resume_documents`
   - `analysis_history`
   - `job_match_reports`
   - `career_roadmaps`
   - `multi_role_comparisons`
   - `career_projects`
   - `stored_files` metadata
   - `password_reset_tokens`
   - `users` account record
4. **Session Cookie Invalidation:** The HttpOnly session cookie (`auth_token`) is cleared via `Set-Cookie: auth_token=; Max-Age=0`.
5. **Audit Logging:** An audit entry records that the account was permanently deleted, logging only the timestamp and user ID (no candidate personal details).

---

## 3. Ephemeral In-Memory Processing for Direct Analysis

When a user submits a PDF via `/api/analyze` or `/api/linkedin/analyze-pdf`:
- PDF text extraction occurs entirely in volatile memory (`io.BytesIO`).
- The raw uploaded file bytes are not written to public web directories.
- If the user is unauthenticated, no personal identity profile is linked to the record.

---

## 4. Automated Retention Maintenance Script

For production deployments, the scheduled retention purge job removes expired job match reports and unauthenticated analysis records older than 90 days:

```sql
-- Purge unauthenticated analysis records older than 90 days
DELETE FROM analysis_history 
WHERE user_id IS NULL 
  AND created_at < NOW() - INTERVAL '90 days';

-- Purge expired job match reports
DELETE FROM job_match_reports 
WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
```
