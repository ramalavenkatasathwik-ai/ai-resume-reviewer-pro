# AI Resume Reviewer Pro

[![CI](https://github.com/example/ai-resume-reviewer-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/example/ai-resume-reviewer-pro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.12+](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/)
[![FastAPI: 0.115+](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React: 18.3](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://react.dev/)
[![TypeScript: 5.6](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg)](https://www.typescriptlang.org/)
[![Google GenAI SDK](https://img.shields.io/badge/Google_GenAI_SDK-Official-4285F4.svg)](https://github.com/googleapis/python-genai)

**AI Resume Reviewer Pro** is a production-grade application for AI-powered resume analysis, ATS scoring heuristics, and career trajectory optimization built with FastAPI, React, PostgreSQL, and Google Gemini.

> **Phase 2 Milestone**: Production-oriented backend architecture, PostgreSQL database persistence layer with Alembic migrations, official Google GenAI SDK integration with Bring Your Own Key (BYOK) security, in-memory PDF validation, rate limiting, and an automated test suite.

---

## 🚀 Key Highlights & Architecture

- **Zero-Storage BYOK (Bring Your Own Key)**: Users supply their own Google Gemini API key via the `X-Gemini-API-Key` HTTP header. Keys are never persisted in the database, logged to disk, or committed to version control.
- **Official Google GenAI SDK**: Integrates directly with `google-genai` using confirmed Generally Available (GA) models (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`).
- **In-Memory PDF Validation**: Resumes are parsed and validated strictly in RAM using `pypdf`. Raw resume PDFs and candidate PII are never retained on disk.
- **Robust Persistence**: PostgreSQL 16 backed by SQLAlchemy 2.0 ORM with connection pooling and versioned Alembic schema migrations (`analysis_history` table).
- **Abuse Prevention & Secret Masking**: Centralized log redaction filter scrubs API key patterns, combined with Slowapi rate limiting (backed by Redis or in-memory ring buffers).
- **Single-Command Orchestration**: Docker Compose spins up PostgreSQL, Redis, FastAPI backend, and React/Nginx frontend.

---

## 🛠️ Technology Stack

### Backend
- **Language & Runtime**: Python 3.12+
- **Framework**: FastAPI (ASGI) & Uvicorn
- **AI / LLM Engine**: Official `google-genai` Python SDK
- **PDF Processing**: `pypdf` (in-memory extraction & structure validation)
- **Data Modeling**: Pydantic v2 & Pydantic Settings
- **ORM & Migrations**: SQLAlchemy 2.0 & Alembic
- **Database Driver**: Psycopg 3 (Binary)
- **Rate Limiting**: Slowapi & Redis
- **Testing**: Pytest, Pytest-Asyncio, HTTPX

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Tailwind CSS & Lucide React
- **Navigation**: React Router v6
- **HTTP Client**: Axios with interceptors
- **Testing**: Vitest & React Testing Library

### Infrastructure & Operations
- **Containerization**: Docker (multi-stage builds) & Docker Compose
- **Database**: PostgreSQL 16 Alpine
- **Cache / Rate Limiter**: Redis 7 Alpine
- **Web Server**: Nginx Alpine (Reverse Proxy)

---

## 📁 Project Structure

```
ai-resume-reviewer-pro/
│
├── frontend/                     # React + TypeScript + Vite Client
│   ├── src/
│   │   ├── components/           # Navbar, StatusBadge, Footer
│   │   ├── pages/                # LandingPage, DashboardPage, SettingsPage
│   │   ├── services/             # healthService
│   │   ├── hooks/                # useHealthCheck
│   │   ├── lib/                  # axios configuration
│   │   ├── test/                 # Vitest test suite
│   │   └── App.tsx               # App router and layout
│   └── Dockerfile                # Production multi-stage frontend Dockerfile
│
├── backend/                      # FastAPI Python Application
│   ├── app/
│   │   │   ├── routes_health.py  # GET /api/health
│   │   │   ├── routes_models.py  # GET /api/models
│   │   │   ├── routes_keys.py    # POST /api/keys/validate
│   │   │   ├── routes_analysis.py# POST /api/analyze
│   │   │   ├── routes_linkedin.py# POST /api/linkedin/analyze-url, analyze-pdf, analyze-text
│   │   │   └── router.py         # Router aggregation
│   │   ├── core/
│   │   │   ├── config.py         # Pydantic Settings & model allowlist
│   │   │   ├── logging.py        # Secret redaction filter & logger setup
│   │   │   └── security.py       # Header dependency & Slowapi limiter
│   │   ├── database/
│   │   │   ├── database.py       # Engine & SessionLocal factory
│   │   │   └── base.py           # DeclarativeBase & TimestampMixin
│   │   ├── models/
│   │   │   └── analysis.py       # AnalysisHistory SQLAlchemy model (resume & linkedin)
│   │   ├── schemas/
│   │   │   ├── analysis.py       # AnalysisResult & CandidateInformation
│   │   │   ├── linkedin.py       # LinkedInAnalysisResult & 10 section score schemas
│   │   │   ├── models.py         # ModelsListResponse & ModelInfo
│   │   │   ├── keys.py           # KeyValidationRequest & Response
│   │   │   └── errors.py         # Standardized ErrorResponse
│   │   ├── services/
│   │   │   ├── gemini_service.py # Google GenAI SDK integration & retries
│   │   │   ├── resume_service.py # In-memory PDF validation & extraction
│   │   │   ├── linkedin_service.py # LinkedIn profile evaluation & scoring
│   │   │   ├── linkedin_url_service.py # Secure URL probing & authwall handling
│   │   │   ├── analysis_history_service.py # Isolated DB data access
│   │   │   └── health.py         # Health service
│   │   └── main.py               # Application factory & CORS
│   │
│   ├── alembic/                  # Alembic migration environment
│   │   ├── versions/             # Migration revisions (001_create_analysis_history_table.py)
│   │   └── env.py                # Migration runner
│   ├── tests/                    # Pytest test suite (30 automated tests)
│   ├── requirements.txt          # Python dependencies
│   └── Dockerfile                # Production backend Dockerfile
│
├── docs/                         # Technical Architecture Documentation
│   ├── architecture.md           # BYOK security, operator access, data policies
│   ├── development.md            # Local developer onboarding & API reference
│   └── deployment.md             # Production cloud deployment blueprint
│
├── docker-compose.yml            # Multi-container orchestration (postgres, redis, backend, frontend)
├── .gitignore                    # Git exclusion rules (strictly ignores .env)
└── README.md
```

---

## 🔒 Bring Your Own Key (BYOK) Security

This application enforces a zero-knowledge BYOK architecture:
1. **Never Hardcode or Commit Keys**: No master or developer key exists on the server.
2. **Request-Scoped Header**: Clients transmit their key via the `X-Gemini-API-Key` HTTP header over TLS.
3. **No Key Storage**: Keys are never written to PostgreSQL, disk files, browser cookies, analytics, or persistent storage.
4. **Log Redaction**: A custom logging filter (`SecretMaskingFilter`) strips Google API key patterns (`AIza...`) and header tokens before logs are emitted.
5. **No Response Leaks**: Keys are never returned in response bodies or response headers.

> **Security Disclosure**: While BYOK prevents database persistence of user keys, the backend operator technically has transient access in RAM while requests are processed. See [`docs/architecture.md`](docs/architecture.md) for architectural discussion on direct browser vs. backend proxy tradeoffs.

---

## 🤖 Supported Gemini Models

Models are controlled by a server-side allowlist (`GET /api/models`). Arbitrary model strings are rejected.

- **`gemini-2.5-flash`** *(Default & Recommended)*: Flagship Flash model with enhanced reasoning and high-fidelity structured output.
- **`gemini-2.0-flash`**: Next-generation ultra-fast multimodal processing.
- **`gemini-1.5-flash`**: High-efficiency model for high-frequency text parsing.
- **`gemini-1.5-pro`**: Advanced reasoning model for extensive multi-page evaluations.

---

## ⚙️ Environment Variables

### Backend Configuration (`backend/.env.example`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `APP_NAME` | Service name identifier | `ai-resume-reviewer-api` |
| `APP_ENV` | Application environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+psycopg://postgres:postgres@localhost:5432/resume_reviewer` |
| `CORS_ORIGINS` | Permitted origins (no wildcard in prod) | `http://localhost:5173,http://localhost:3000` |
| `GEMINI_MODEL` | Default Gemini model | `gemini-2.5-flash` |
| `MAX_UPLOAD_SIZE_MB` | Maximum PDF upload size in MB | `10` |
| `RATE_LIMIT_PER_MINUTE` | General endpoint rate limit | `60` |
| `RATE_LIMIT_ANALYZE_PER_MINUTE`| Resume analysis rate limit | `10` |
| `REDIS_URL` | Optional Redis cache for distributed rate limits | `redis://localhost:6379/0` |

---

## 💻 Local Development

### 1. Database & Migrations
```bash
# Start PostgreSQL & Redis via Docker Compose
docker compose up -d postgres redis

# Run Alembic migrations
alembic upgrade head
```

### 2. Backend Server
```bash
cd backend
python -m venv .venv
# Activate: .\backend\.venv\Scripts\Activate.ps1 (Windows) or source .venv/bin/activate (Linux/macOS)
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Base: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/health`

### 3. Frontend Client
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 🧪 Testing

### Automated Backend Test Suite (Pytest)
```bash
# Run 30 unit & security tests with mocked external calls
pytest -v
```

Tests cover:
- Health check endpoint and aliases
- Model allowlist and rejection of arbitrary models
- API key validation endpoint (valid, invalid credentials, rate limit)
- Resume analysis endpoint (valid analysis, oversized files, corrupt PDFs, empty PDFs, invalid target roles)
- Upstream Gemini errors (401 auth, 429 rate limit, 502/503 service outage, malformed JSON recovery)
- Database model, constraints, and service isolation
- Log redaction filters and zero key persistence

### Optional Live Gemini Integration Test
```bash
$env:GEMINI_INTEGRATION_TEST_KEY = "your-real-key"
pytest -m integration -v
```

### Frontend Tests (Vitest)
```bash
cd frontend
npm run test
```

---

## 🐳 Docker Deployment

```bash
docker compose up --build
```
Services:
- **Frontend SPA**: `http://localhost:3000`
- **FastAPI API**: `http://localhost:8000`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
