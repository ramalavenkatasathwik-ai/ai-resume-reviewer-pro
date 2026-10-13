# AI Resume Reviewer Pro — Automated Testing Guide
**Phases 11 & 12: Developer & CI Testing Runbook**

This guide provides instructions for executing the automated test suite locally and in Continuous Integration (CI).

---

## 1. Running Backend Tests (pytest)

### Prerequisites
Activate the Python virtual environment:
```bash
# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### Running All Tests
```bash
cd backend
pytest -v
```

### Running Specific Test Suites
```bash
# Security & Hardening Suite (IDOR, Token Revocation, Headers, Traversal)
pytest -v tests/test_phase11_security.py

# Authentication & Password Security
pytest -v tests/test_auth.py

# Resume Library & Versioning
pytest -v tests/test_resumes.py

# Job Match Fit Analyzer
pytest -v tests/test_job_match.py

# Career Intelligence (Variants, Roadmaps, Matrix)
pytest -v tests/test_career_intelligence.py

# Document Export (PDF & DOCX)
pytest -v tests/test_export.py
```

### Running Fast Suite (Quiet Mode)
```bash
pytest -q
```

---

## 2. Running Frontend Tests (Vitest & ESLint)

Navigate to the `frontend/` directory:
```bash
cd frontend
```

### 1. Code Quality & Linting
```bash
npm run lint
```

### 2. Unit and Component Tests
```bash
npm test
```

### 3. Type Checking & Production Build
```bash
npm run build
# Runs: tsc && vite build
```

---

## 3. Running Local Integration with Docker Compose

To test the entire containerized stack locally with PostgreSQL and Redis:

```bash
# Build and run containers in detached mode
docker compose up --build -d

# Check service health
docker compose ps

# View backend logs
docker compose logs -f backend

# Tear down containers and volumes
docker compose down -v
```
