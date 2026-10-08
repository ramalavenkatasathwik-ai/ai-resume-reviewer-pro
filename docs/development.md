# AI Resume Reviewer Pro — Developer Guide

This guide covers local setup, tooling, testing, and day-to-day development workflows.

---

## 1. Prerequisites

Ensure you have installed:
- **Python**: Version 3.12 or higher
- **Node.js**: Version 20 LTS or higher (`npm` included)
- **Git**: Installed and available in your PATH
- **Docker & Docker Compose**: (Optional for local hybrid mode, required for full containerized stack)

---

## 2. Repository Setup

Clone and initialize the repository:

```bash
git clone <repository-url>
cd ai-resume-reviewer-pro
```

Verify that `.env` files are ignored:
```bash
git status --ignored
```

---

## 3. Backend Development Setup

### 3.1 Virtual Environment
From the project root:

```bash
cd backend
python -m venv .venv

# On Linux / macOS:
source .venv/bin/activate

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
```

### 3.2 Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3.3 Configure Local Environment
Copy the example environment template:
```bash
cp .env.example .env
```
*(On Windows: `Copy-Item .env.example .env`)*

Configure variables in `.env` as appropriate:
```env
APP_NAME=ai-resume-reviewer-api
APP_ENV=development
DEBUG=true
PORT=8000
HOST=0.0.0.0
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/resume_reviewer
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
GEMINI_MODEL=gemini-3.8-flash
```

> **Note on BYOK**: Do NOT add any `GEMINI_API_KEY` to `.env`. This project enforces Bring Your Own Key architecture.

### 3.4 Database Migrations (Alembic)
To apply database migrations:
```bash
alembic upgrade head
```

To generate a new migration revision:
```bash
alembic revision --autogenerate -m "create_initial_models"
```

### 3.5 Run Backend Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Base: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/health`

### 3.6 Run Backend Tests
```bash
pytest -v
```

---

## 4. Frontend Development Setup

### 4.1 Install Node Packages
From the `frontend` folder:

```bash
cd frontend
npm install
```

### 4.2 Configure Local Environment
```bash
cp .env.example .env
```
*(On Windows: `Copy-Item .env.example .env`)*

Ensure `VITE_API_URL` points to your backend instance:
```env
VITE_API_URL=http://localhost:8000
```

### 4.3 Run Frontend Dev Server
```bash
npm run dev
```
- Frontend application will launch at: `http://localhost:5173`

### 4.4 Run Frontend Tests & Linter
```bash
# Run Vitest test suite
npm run test

# Run ESLint
npm run lint

# Format with Prettier
npm run format

# Production build check
npm run build
```

---

## 5. Docker Development Workflow

To launch the complete containerized stack (PostgreSQL + FastAPI + React SPA with Nginx reverse proxy):

```bash
docker compose up --build
```

### Services Access
- **Frontend SPA**: `http://localhost:3000` (or `http://localhost:5173`)
- **Backend API**: `http://localhost:8000`
- **PostgreSQL**: `localhost:5432`

To shut down containers and tear down volumes:
```bash
docker compose down -v
```
