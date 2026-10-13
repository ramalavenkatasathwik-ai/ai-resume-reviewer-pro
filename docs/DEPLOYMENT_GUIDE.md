# AI Resume Reviewer Pro — Production Deployment Guide
**Phase 12: Production Deployment, GitHub CI/CD, Monitoring, Backups and Launch**

This guide provides the complete, battle-tested operational procedure for deploying **AI Resume Reviewer Pro** to a production cloud environment with zero secret leakage and strict Bring-Your-Own-Key (BYOK) privacy.

---

## 1. Production Architecture Overview

```
                      +---------------------------------------+
                      |               End User                |
                      |   (Modern Web Browser / Mobile Web)   |
                      +-------------------+-------------------+
                                          |
                                          | HTTPS (TLS 1.3)
                                          v
                      +---------------------------------------+
                      |           Vercel Edge Network         |
                      |        Frontend: React 18 + Vite      |
                      |      Global CDN / SPA Client Route    |
                      +-------------------+-------------------+
                                          |
                                          | HTTPS API Calls (Bearer Token / HttpOnly)
                                          v
                      +---------------------------------------+
                      |           Render Web Service          |
                      |          Backend: FastAPI (ASGI)      |
                      |     Uvicorn + Slowapi Rate Limiter    |
                      +---------+-------------------+---------+
                                |                   |
               Internal Network |                   | HTTPS (BYOK)
                                v                   v
     +----------------------------------+   +----------------------------------+
     |        Managed PostgreSQL        |   |       Google Gemini API          |
     |        (Render / Supabase)       |   |      gemini-2.5-flash            |
     |   SQLAlchemy 2.0 + Alembic (008) |   | (User-Supplied Key per Request)  |
     +----------------------------------+   +----------------------------------+
```

### Component Breakdown
| Layer | Service / Host | Technology | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | React 18, TypeScript, Vite, Tailwind CSS | Static SPA hosting, edge CDN caching, client-side routing |
| **Backend** | **Render** | Python 3.12, FastAPI, Uvicorn | High-performance asynchronous REST API |
| **Database** | **Render PostgreSQL** or **Supabase** | PostgreSQL 16, SQLAlchemy, Alembic | Relational data persistence (users, resumes, versions, reports) |
| **File Storage** | **Local Persistent Disk** / **Supabase Storage** | S3-compatible / Private Mount | Encrypted storage for uploaded LinkedIn and resume PDFs |
| **AI Engine** | **Google Cloud (Gemini)** | Gemini 2.5 Flash / 2.0 Flash (BYOK) | Semantic resume critique, job matching, career roadmaps |

---

## 2. Step-by-Step Deployment Instructions

### Step 1: Deploy PostgreSQL Database (Render or Supabase)

#### Option A: Render Managed PostgreSQL
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **PostgreSQL**.
3. Configure the database instance:
   - **Name:** `ai-resume-reviewer-db`
   - **Database Name:** `resume_reviewer`
   - **User:** `resume_admin`
   - **Region:** `Oregon (US West)` (choose the same region as the backend service)
   - **Plan:** `Free` (or `Starter` for automatic daily backups and no sleep mode)
4. Click **Create Database**.
5. Once provisioned, locate the **Internal Database URL** (e.g. `postgres://resume_admin:...@dpg-...-a/resume_reviewer`).
   *Note: For SQLAlchemy, prefix with `postgresql+psycopg://`.*

#### Option B: Supabase PostgreSQL
1. Create a project on [Supabase](https://supabase.com).
2. Under **Project Settings** > **Database**, retrieve the **URI Connection String**.
3. Use the pooled connection URL (Transaction or Session mode on port `5432` / `6543`).

---

### Step 2: Deploy Backend Web Service (Render)

1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your GitHub repository: `ai-resume-reviewer-pro`.
3. Configure settings:
   - **Name:** `ai-resume-reviewer-backend`
   - **Region:** Same region as PostgreSQL (e.g., `Oregon (US West)`)
   - **Branch:** `main`
   - **Root Directory:** *(leave blank or set to `.`)*
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install --upgrade pip && pip install -r backend/requirements.txt`
   - **Start Command:** `cd backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** `Free` (or `Starter`)
4. In **Advanced** > **Health Check Path**, set: `/api/health`.
5. Under **Environment Variables**, add the production configuration:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `APP_NAME` | `ai-resume-reviewer-api` | System service identity |
| `APP_ENV` | `production` | Production environment flag |
| `ENVIRONMENT` | `production` | Toggles OpenAPI/Swagger docs off |
| `DEBUG` | `false` | Disables debug mode and tracebacks |
| `DATABASE_URL` | `postgresql+psycopg://...` | Connection string to PostgreSQL |
| `SECRET_KEY` | *(64-hex generated string)* | Session signing key (`openssl rand -hex 32`) |
| `JWT_ALGORITHM` | `HS256` | JWT signature algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Session lifetime (24 hours) |
| `CORS_ORIGINS` | `https://your-frontend.vercel.app` | Exact production frontend URL (no wildcard) |
| `STORAGE_PROVIDER` | `local` | Private storage engine (`local` or `supabase`) |
| `STORAGE_LOCAL_DIR` | `storage/private` | Directory for private documents |
| `MAX_UPLOAD_SIZE_MB` | `10` | Hard payload cap |
| `RATE_LIMIT_PER_MINUTE` | `60` | Slowapi rate limit ceiling |
| `RATE_LIMIT_ANALYZE_PER_MINUTE` | `15` | Analysis rate limit ceiling |

6. Click **Create Web Service**.
7. Monitor deployment logs: verify `alembic upgrade head` runs through version `008_token_version` and Uvicorn starts on port `$PORT`.
8. Once live, test health:
   ```bash
   curl -I https://ai-resume-reviewer-backend.onrender.com/api/health
   # Expected: HTTP/2 200 OK
   # Header: X-Content-Type-Options: nosniff
   ```

---

### Step 3: Deploy Frontend (Vercel)

1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Import your `ai-resume-reviewer-pro` repository.
4. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` (runs `tsc && vite build`)
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Configure Environment Variables:
   - `VITE_API_URL`: `https://ai-resume-reviewer-backend.onrender.com` (your actual backend URL)
6. Click **Deploy**.
7. Once deployed, verify:
   - Homepage loads with zero console errors.
   - SPA routing works on direct page refresh (e.g. `/dashboard`, `/linkedin`, `/career`).
   - Network requests proxy cleanly to the backend with valid CORS headers.

---

### Step 4: Post-Deployment Verification Checklist

1. [ ] **Health Endpoint:** Verify `GET /api/health` returns `200` with status `healthy`.
2. [ ] **Security Headers:** Verify `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`.
3. [ ] **Auth Flow:** Register a test account, log in, view profile `/api/auth/me`.
4. [ ] **Token Revocation:** Change password and verify the previous token is rejected with `401 TOKEN_REVOKED`.
5. [ ] **Cross-User Isolation (IDOR):** Verify User A cannot view User B's resumes, analyses, or stored files.
6. [ ] **Gemini BYOK:** Provide a valid key in the UI; verify resume analysis executes and scores are displayed without key leakage.
7. [ ] **Document Export:** Export an existing resume version to PDF and DOCX. Verify clean formatting and no path traversal in filename headers.
