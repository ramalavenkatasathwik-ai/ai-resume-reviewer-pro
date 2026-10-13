# AI Resume Reviewer Pro — Production Environment Reference
**Phase 12: Production Environment Variables & Secret Management**

This document specifies the exact environment variables used across the application. **Never commit actual secrets or production `.env` files to git.**

---

## 1. Backend Environment Variables (FastAPI)

Set these variables in your hosting provider's dashboard (e.g. Render, Railway, AWS ECS) or private secrets manager.

### Core Application Settings
| Variable Name | Required | Default | Allowed Values | Description |
| :--- | :---: | :--- | :--- | :--- |
| `APP_NAME` | No | `ai-resume-reviewer-api` | String | Application identifier for logging and metrics |
| `APP_ENV` | **Yes** | `development` | `production`, `staging`, `test`, `development` | Deployment environment tier |
| `ENVIRONMENT` | **Yes** | `development` | `production`, `staging`, `development` | Disables `/docs`, `/redoc`, and `/openapi.json` in production |
| `DEBUG` | **Yes** | `false` | `true`, `false` | Must be `false` in production to prevent stack trace leaks |
| `HOST` | No | `0.0.0.0` | IP Address | Host interface binding |
| `PORT` | **Yes** | `8000` | Integer (Render sets `$PORT`) | Network port for Uvicorn |
| `API_PREFIX` | No | `/api` | String | URL prefix for all REST endpoints |

---

### Security, JWT & Session Management
| Variable Name | Required | Default | Production Requirement |
| :--- | :---: | :--- | :--- |
| `SECRET_KEY` | **Yes** | *None* | Must be a strong, randomly generated 64-character hex string. Generated via `openssl rand -hex 32` or `python -c "import secrets; print(secrets.token_hex(32))"`. Never reuse development keys. |
| `JWT_ALGORITHM` | No | `HS256` | Cryptographic signature algorithm for access tokens. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` | Token expiration in minutes (default: 24 hours / 1440 min). |
| `AUTH_COOKIE_NAME` | No | `resume_pro_session` | Name of the HttpOnly session cookie. |
| `CORS_ORIGINS` | **Yes** | `http://localhost:5173` | Comma-separated list of exact allowed origins (e.g. `https://resume-pro.vercel.app`). **Wildcard (`*`) is strictly rejected in production.** |

---

### Database Connection (PostgreSQL)
| Variable Name | Required | Example | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | `postgresql+psycopg://user:pass@host:5432/dbname` | Full SQLAlchemy connection URI using the modern `psycopg` (v3) driver. If using Supabase, append `?sslmode=require`. |

---

### Private Document Storage
| Variable Name | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `STORAGE_PROVIDER` | No | `local` | Storage driver: `local` (disk volume) or `supabase` (object bucket). |
| `STORAGE_LOCAL_DIR` | If local | `storage/private` | Path to persistent directory on disk. Must be backed by a persistent mount in containers. |
| `SUPABASE_URL` | If supabase | *None* | Supabase project URL (e.g. `https://xyz.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | If supabase | *None* | High-privilege service key used strictly server-side for private bucket read/write. |
| `SUPABASE_STORAGE_BUCKET` | If supabase | `resumes-private` | Private bucket name with public access disabled. |

---

### Gemini AI Engine (BYOK Architecture)
| Variable Name | Required | Default | Note |
| :--- | :---: | :--- | :--- |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Default Gemini model identifier. Valid options: `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`. |
| *User API Key* | *Request* | *None* | **Never stored in environment variables.** Users supply their own Gemini key per request via the `X-Gemini-API-Key` header. |

---

### Rate Limiting & Resource Caps
| Variable Name | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `RATE_LIMIT_PER_MINUTE` | No | `60` | Global Slowapi request limit per minute per IP. |
| `RATE_LIMIT_ANALYZE_PER_MINUTE` | No | `15` | Burst limit on heavy AI analysis endpoints. |
| `MAX_UPLOAD_SIZE_MB` | No | `10` | Hard cap on uploaded resume and profile PDFs (10 MB). |
| `REDIS_URL` | No | *None* | Optional Redis instance for distributed rate limiting (`redis://host:6379/0`). |

---

### Outgoing Email Delivery (Optional)
| Variable Name | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `EMAIL_PROVIDER` | No | `none` | `smtp`, `resend`, `sendgrid`, or `none`. |
| `EMAIL_FROM_ADDRESS` | If email | *None* | Verified sender email (e.g. `deliveries@resumereviewer.com`). |
| `EMAIL_FROM_NAME` | No | `AI Resume Reviewer Pro` | Display sender name. |
| `SMTP_HOST` | If smtp | *None* | SMTP server hostname. |
| `SMTP_PORT` | If smtp | `587` | Standard TLS port. |
| `SMTP_USER` | If smtp | *None* | SMTP authentication username. |
| `SMTP_PASSWORD` | If smtp | *None* | SMTP authentication password or app password. |
| `SMTP_USE_TLS` | If smtp | `true` | Enforces STARTTLS encryption. |

---

## 2. Frontend Environment Variables (Vite)

These variables are injected at **build time** into client bundles.

| Variable Name | Required | Production Value | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | **Yes** | `https://ai-resume-reviewer-backend.onrender.com` | Base URL of the deployed FastAPI backend. |

> [!CAUTION]
> **Zero Credential Exposure Rule**: NEVER prefix database passwords, private keys, or API tokens with `VITE_`. Everything prefixed with `VITE_` is compiled into the public JavaScript bundle and visible to any client inspecting the source.
