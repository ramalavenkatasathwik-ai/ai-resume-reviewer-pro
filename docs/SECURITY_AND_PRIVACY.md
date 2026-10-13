# AI Resume Reviewer Pro — Security & Privacy Architecture
**Phases 11 & 12: Comprehensive Security, Privacy, and BYOK Standards**

---

## 1. Zero-Key-Persistence (BYOK Architecture)

AI Resume Reviewer Pro operates under a strict **Bring Your Own Key (BYOK)** security standard:

1. **No Disk Persistence:** Google Gemini API keys are NEVER written to server log files, local files, caches, or database tables.
2. **No Persistent Client Storage:** API keys are never saved in `localStorage`, `sessionStorage`, or unencrypted cookies.
3. **Request-Scoped Headers:** The client transmits the key using the secure HTTP header:
   ```
   X-Gemini-API-Key: AIzaSy...
   ```
4. **Immediate Lifecycle Disposal:** Once the Gemini SDK call completes, the key reference is garbage collected from memory.
5. **Key Masking:** When displaying verification hints in the UI, keys are masked to show only the first 4 and last 4 characters: `AIza...****`.

---

## 2. Authentication & Session Security

### Password Storage
- Passwords are encrypted using **bcrypt** with a work factor of 12 rounds (`bcrypt.gensalt(12)`).
- Verification uses constant-time comparison to prevent timing attacks.
- Registration requires minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one special character.

### Token Revocation via `token_version`
- Stateless JWT access tokens carry a version payload field (`"v": user.token_version`).
- The dependency `get_current_user` validates that `"v"` matches the current database record for that user.
- Calling `/auth/change-password`, `/auth/reset-password`, or `/auth/logout` increments `user.token_version += 1`, immediately invalidating all active JWTs on all devices.

---

## 3. Cross-Tenant Isolation (Anti-IDOR Protection)

All private resources enforce strict authenticated ownership:

| Resource | Service Check | Mismatch Action |
| :--- | :--- | :---: |
| **Analysis Reports** | `user_id == current_user.id` or `user_id is None` (unauth only) | HTTP 404 / 403 |
| **Resumes & Versions** | `ResumeDocument.user_id == current_user.id` | HTTP 403 |
| **Job Match Reports** | `JobMatchReport.user_id == current_user.id` | HTTP 403 |
| **Stored Files (PDFs)** | `StoredFile.user_id == current_user.id` | HTTP 403 |
| **Document Exports** | Verified against parent document ownership | HTTP 403 |
| **Email Deliveries** | Verified against document owner | HTTP 403 |

---

## 4. Prompt Injection Defense
User-provided resumes and job descriptions are treated as untrusted data:
- Wrapped in explicit delimiters: `<UNTRUSTED_CANDIDATE_DOCUMENT>`, `<UNTRUSTED_JOB_DESCRIPTION>`, `<UNTRUSTED_LINKEDIN_PROFILE>`.
- System prompts include mandatory directives instructing the model to ignore any embedded commands or system role overrides.
- Model output is strictly constrained to typed JSON schemas verified by Pydantic models.
