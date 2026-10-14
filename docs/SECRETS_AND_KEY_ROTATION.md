# Secrets Management & Key Rotation Guide — AI Resume Reviewer Pro

**Scope:** Credential Lifecycle, Storage Standards, and Step-by-Step Rotation Playbooks  
**Last Updated:** October 14, 2026  

---

## 1. Secrets Inventory & Storage Standards

The application maintains zero hardcoded secrets. All credentials must reside exclusively in server-side encrypted environment variables or cloud secret managers.

| Secret Name | Purpose | Recommended Rotation Frequency | Storage Location |
|:---|:---|:---|:---|
| `GEMINI_API_KEY` | Google Gemini API server-side evaluation key | Every 90 days (or immediate upon exposure) | Render / Cloud Provider Secret Env |
| `SECRET_KEY` | HMAC-SHA256 signing secret for JWT access tokens | Every 180 days | Render Secret Env (Auto-generated in `render.yaml`) |
| `DATABASE_URL` | PostgreSQL credentials & connection string | Every 90 days | Render Database / Supabase Connection Pooler |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional private Supabase object storage key | Every 90 days | Render Secret Env |
| `SMTP_PASSWORD` / `EMAIL_API_KEY` | Optional outbound email delivery credentials | Every 180 days | Render Secret Env |

---

## 2. Step-by-Step Rotation Procedures

### 2.1. Rotating Google Gemini API Key (`GEMINI_API_KEY`)

1. **Generate New Key:**
   - Log into the [Google AI Studio API Keys Console](https://aistudio.google.com/app/apikey).
   - Click **Create API Key** in your designated Google Cloud project.
   - Note the newly generated key (starts with `AIza...`).
2. **Update Hosting Environment:**
   - Navigate to **Render Dashboard** -> `ai-resume-reviewer-backend` -> **Environment**.
   - Edit `GEMINI_API_KEY` and paste the new key.
   - Click **Save Changes**. Render will execute a zero-downtime rolling restart.
3. **Verify Functionality:**
   - Test key validity via the authenticated API:
     ```bash
     curl -s https://<backend-url>/api/keys/validate | jq .
     ```
   - In the frontend UI: Navigate to **Settings** -> **AI Engine Configuration** -> click **Test Server Connection**. Verify that `gemini-4-argon` reports connected.
4. **Decommission Old Key:**
   - In Google AI Studio, locate the previous API key and click **Delete / Revoke**.

---

### 2.2. Rotating JWT Session Signing Secret (`SECRET_KEY`)

> [!NOTE]
> Rotating `SECRET_KEY` will invalidate all active client sessions, requiring users to log in again. Schedule this during maintenance windows.

1. **Generate High-Entropy Secret:**
   - Generate a cryptographically secure 64-character hex secret using Python:
     ```bash
     python -c "import secrets; print(secrets.token_hex(32))"
     ```
2. **Apply in Hosting Environment:**
   - In Render Dashboard: update `SECRET_KEY` with the generated value.
   - Deploy backend service.
3. **User Impact:**
   - Existing active JWTs will fail signature validation and return HTTP 401 `INVALID_TOKEN`.
   - Frontend `axios` interceptor will automatically clear expired session state and redirect users to the login screen.

---

### 2.3. Rotating PostgreSQL Database Password (`DATABASE_URL`)

1. **Provider-Managed Database (Render / Supabase):**
   - In the database provider dashboard, select **Reset Password**.
   - Copy the updated connection string with the new password.
   - Ensure `?sslmode=require` is appended for encrypted transit.
2. **Update Backend Service:**
   - In Render Dashboard: update `DATABASE_URL` under the web service environment.
   - Save and redeploy.
3. **Verify Migration & Data Access:**
   - Verify `/api/health` reports `"status": "healthy"`.
   - Inspect backend logs to ensure database connection pool initializes cleanly.

---

## 3. Secret Scanning & Git Hygiene

To guarantee no secrets enter Git history:

1. **Verify `.gitignore` rules:**
   - Ensure `.env`, `.env.*`, and `*.pem` are always ignored:
     ```bash
     git check-ignore -v backend/.env frontend/.env .env
     ```
2. **Scan working directory for leaked keys:**
   - Run regex search for Google API keys prior to staging commits:
     ```powershell
     Select-String -Path "backend/**/*.*", "frontend/**/*.*" -Pattern "AIza[0-9A-Za-z\-_]{30,45}"
     ```
3. **Never commit real credentials to `.env.example`:**
   - `.env.example` must only contain placeholder tokens (`GEMINI_API_KEY=`, `SECRET_KEY=change-this...`).
