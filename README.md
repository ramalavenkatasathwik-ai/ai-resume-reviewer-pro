# AI Resume Reviewer Pro

[![CI](https://github.com/example/ai-resume-reviewer-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/example/ai-resume-reviewer-pro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.12+](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/)
[![FastAPI: 0.115+](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React: 18.3](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://react.dev/)
[![TypeScript: 5.6](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS: 3.4](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg)](https://tailwindcss.com/)

**AI Resume Reviewer Pro** is a production-grade, full-stack application built for AI-powered resume parsing, ATS scoring heuristics, and career trajectory analysis.

> **Phase 1 Milestone**: Complete, verified foundational architecture including backend REST services, PostgreSQL database configuration, Alembic migration framework, React + Vite frontend SPA, Docker orchestration, and automated test pipelines.

---

## 🚀 Key Highlights & Architecture

- **Bring Your Own Key (BYOK)**: Privacy-centric architecture where users supply their own Google Gemini API keys. Keys are never persisted in the database, logged to files, or committed to version control.
- **Modern Full-Stack Paradigm**: FastAPI (Python 3.12+) backend paired with React 18, TypeScript, and Vite for instant feedback loops.
- **Robust Persistence**: PostgreSQL 16 backed by SQLAlchemy 2.0 ORM with connection pooling and Alembic migration version control.
- **Cloud-Ready Containerization**: Complete Docker & Docker Compose setup supporting single-command environment startup (`docker compose up --build`).
- **Standardized CI/CD**: GitHub Actions workflow running automated testing, linting, formatting checks, and container image builds.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Tooling & Bundler**: Vite
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **Navigation**: React Router v6
- **HTTP Client**: Axios with interceptors
- **Icons**: Lucide React
- **Quality & Testing**: Vitest, React Testing Library, ESLint, Prettier

### Backend
- **Language & Runtime**: Python 3.12+
- **Framework**: FastAPI (ASGI)
- **Server**: Uvicorn
- **Data Modeling & Validation**: Pydantic v2 & Pydantic Settings
- **ORM & Migrations**: SQLAlchemy 2.0 & Alembic
- **Database Driver**: Psycopg 3 (Binary)
- **Testing & HTTP Client**: Pytest, Pytest-Asyncio, HTTPX

### Infrastructure & Operations
- **Containerization**: Docker (multi-stage builds) & Docker Compose
- **Database**: PostgreSQL 16 Alpine
- **Reverse Proxy**: Nginx Alpine
- **Continuous Integration**: GitHub Actions

---

## 📁 Project Structure

```
ai-resume-reviewer-pro/
│
├── frontend/                     # React + TypeScript + Vite Client
│   ├── src/
│   │   ├── components/           # Reusable UI components (Navbar, StatusBadge, Footer)
│   │   ├── pages/                # Route views (LandingPage, DashboardPage, SettingsPage)
│   │   ├── services/             # API client services (healthService)
│   │   ├── types/                # TypeScript interfaces and type definitions
│   │   ├── hooks/                # Custom React hooks (useHealthCheck)
│   │   ├── lib/                  # Library configurations (axios instance)
│   │   ├── test/                 # Vitest test setup and test suites
│   │   ├── App.tsx               # Root application router and layout
│   │   ├── main.tsx              # DOM hydration entry point
│   │   └── index.css             # Tailwind base and custom utilities
│   │
│   ├── public/                   # Static assets and icons
│   ├── package.json              # Frontend scripts and dependencies
│   ├── tsconfig.json             # TypeScript project configuration
│   ├── vite.config.ts            # Vite bundler and proxy configuration
│   ├── nginx.conf                # Nginx SPA reverse proxy configuration
│   ├── Dockerfile                # Production multi-stage frontend Dockerfile
│   └── .env.example              # Frontend environment variable template
│
├── backend/                      # FastAPI Python Application
│   ├── app/
│   │   ├── api/                  # API routers (/api/health)
│   │   ├── core/                 # Configuration and settings (Pydantic BaseSettings)
│   │   ├── database/             # SQLAlchemy engine and session factory
│   │   ├── models/               # Declarative SQLAlchemy models
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   ├── services/             # Business domain services
│   │   └── main.py               # FastAPI application entry point
│   │
│   ├── alembic/                  # Database migration scripts and environment
│   ├── tests/                    # Pytest test suite (test_health.py, fixtures)
│   ├── alembic.ini               # Alembic configuration
│   ├── requirements.txt          # Python dependencies
│   ├── Dockerfile                # Production backend Dockerfile
│   └── .env.example              # Backend environment template
│
├── docs/                         # Technical Architecture Documentation
│   ├── architecture.md           # System design & BYOK security specs
│   ├── development.md            # Local developer onboarding guide
│   └── deployment.md             # Production cloud deployment blueprint
│
├── .github/
│   └── workflows/
│       └── ci.yml                # CI automation workflow
│
├── docker-compose.yml            # Multi-container orchestration (postgres, backend, frontend)
├── .gitignore                    # Git exclusion rules
├── .dockerignore                 # Docker context exclusion rules
├── README.md                     # Project documentation
└── LICENSE                       # MIT License
```

---

## ⚙️ Environment Variables

The project strictly adheres to 12-factor application methodology. Never commit actual `.env` files.

### Backend (`backend/.env.example`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `APP_NAME` | Service name identifier | `ai-resume-reviewer-api` |
| `APP_ENV` | Application runtime environment | `development` |
| `DEBUG` | Enable debug logs and hot reload | `true` |
| `PORT` | API listener port | `8000` |
| `DATABASE_URL` | PostgreSQL connection DSN | `postgresql+psycopg://postgres:postgres@localhost:5432/resume_reviewer` |
| `CORS_ORIGINS` | Permitted browser origins | `http://localhost:5173,http://localhost:3000` |
| `GEMINI_MODEL` | Target Gemini model identifier | `gemini-3.8-flash` |

> **Security Note**: No server-side `GEMINI_API_KEY` is present. Users provide their own keys directly via client requests (BYOK).

### Frontend (`frontend/.env.example`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000` |

---

## 💻 Local Development

### 1. Prerequisites
- Python 3.12+
- Node.js 20+ & npm
- PostgreSQL 16 (or run via Docker)

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS / Linux:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server with reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Base: `http://localhost:8000`
- Swagger Documentation: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/health`

### 3. Frontend Setup
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 🐳 Docker Development

Run the entire full-stack application and PostgreSQL database with a single command:

```bash
docker compose up --build
```

### Container Endpoints
| Component | URL | Port |
| :--- | :--- | :--- |
| **Frontend Web App** | `http://localhost:3000` | 3000 (mapped to 80) |
| **Backend API** | `http://localhost:8000` | 8000 |
| **Swagger UI Docs** | `http://localhost:8000/docs` | 8000 |
| **PostgreSQL Database** | `localhost:5432` | 5432 |

To stop and remove containers:
```bash
docker compose down
```

---

## 🧪 Testing

### Backend Tests (Pytest)
```bash
cd backend
pytest -v
```
Verifies:
- `GET /api/health` response schema, status code 200, and correct payload (`{"status": "healthy", "service": "ai-resume-reviewer-api"}`).
- Synchronous and asynchronous test client fixtures.
- Route aliases.

### Frontend Tests (Vitest)
```bash
cd frontend
npm run test
```
Verifies:
- Health check service invocation and error handling.
- App component rendering, navigation routing, and live connectivity badge states.

---

## 🌿 Git Workflow

1. **Branching Model**:
   - `main`: Production-ready release branch.
   - `develop`: Integration branch for active phase delivery.
   - `feature/<name>`: Topic branches for new capabilities.
2. **Commit Conventions**:
   Follow conventional commits (e.g. `feat:`, `fix:`, `docs:`, `chore:`, `test:`).
3. **Pre-commit Checklist**:
   - Run `pytest`
   - Run `npm run test`
   - Run `npm run lint`
   - Ensure no `.env` or credential files are staged.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
