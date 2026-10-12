# AI Resume Reviewer Pro — Developer Guide

This guide covers local environment setup, PostgreSQL database operations, Alembic migrations, testing procedures, and API usage.

---

## 1. Prerequisites

- **Python**: Version 3.12 or higher
- **Node.js**: Version 20 LTS or higher (`npm` included)
- **Git**: Installed and available in PATH
- **Docker & Docker Compose**: (Required for containerized database and Redis)

---

## 2. Environment Configuration

### 2.1 Backend Environment Setup
Copy the environment example template:
```bash
# On Linux / macOS:
cp backend/.env.example backend/.env

# On Windows (PowerShell):
Copy-Item backend\.env.example backend\.env
```

Ensure variables are set:
```env
APP_NAME=ai-resume-reviewer-api
APP_ENV=development
DEBUG=true
PORT=8000
HOST=0.0.0.0
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/resume_reviewer
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
GEMINI_MODEL=gemini-2.5-flash
MAX_UPLOAD_SIZE_MB=10
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_ANALYZE_PER_MINUTE=10
REDIS_URL=
```

> **BYOK Security Rule**: Never add a `GEMINI_API_KEY` to `.env` or application source code. All requests require client-provided keys in the `X-Gemini-API-Key` header.

---

## 3. Database & Alembic Migrations

### 3.1 Running PostgreSQL & Redis with Docker Compose
To run only the database and cache services locally:
```bash
docker compose up -d postgres redis
```

### 3.2 Running Alembic Migrations
Alembic migrations are configured relative to the repository.

Apply all migrations to head:
```bash
# From root directory:
.\backend\.venv\Scripts\alembic.exe -c backend\alembic.ini upgrade head

# Or from backend directory:
cd backend
alembic upgrade head
```

Revert the most recent migration:
```bash
alembic downgrade -1
```

Generate a new migration revision:
```bash
alembic revision --autogenerate -m "describe_change"
```

---

## 4. Running the Backend Application

Activate your virtual environment and start the Uvicorn ASGI server:

```bash
# Windows PowerShell:
.\backend\.venv\Scripts\Activate.ps1
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# macOS / Linux:
source backend/.venv/bin/activate
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API Base: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/health`
- Supported Models: `http://localhost:8000/api/models`

---

## 5. API Endpoints Reference

### 5.1 `GET /api/health`
Probes application and service availability.
- **Headers**: None
- **Response**:
  ```json
  {
    "status": "healthy",
    "service": "ai-resume-reviewer-api"
  }
  ```

### 5.2 `GET /api/models`
Returns the server-side allowlist of supported Gemini models.
- **Headers**: None
- **Response**:
  ```json
  {
    "models": [
      {
        "id": "gemini-2.5-flash",
        "name": "Gemini 2.5 Flash",
        "description": "Latest flagship Flash model with enhanced reasoning and high-fidelity structured output.",
        "recommended": true,
        "is_default": true,
        "context_window": "1M tokens"
      },
      {
        "id": "gemini-2.0-flash",
        "name": "Gemini 2.0 Flash",
        "description": "Ultra-fast multimodal model engineered for high-throughput, low-latency evaluation.",
        "recommended": false,
        "is_default": false,
        "context_window": "1M tokens"
      }
    ],
    "default_model": "gemini-2.5-flash"
  }
  ```

### 5.3 `POST /api/keys/validate`
Validates a user's Gemini API key by making a lightweight probe request.
- **Required Header**: `X-Gemini-API-Key: <your_gemini_api_key>`
- **Body (optional JSON)**:
  ```json
  {
    "model": "gemini-2.5-flash"
  }
  ```
- **Response**:
  ```json
  {
    "valid": true,
    "model": "gemini-2.5-flash",
    "message": "Successfully validated API key with gemini-2.5-flash."
  }
  ```

### 5.4 `POST /api/analyze`
Uploads a resume PDF in-memory and evaluates it against a target role.
- **Required Header**: `X-Gemini-API-Key: <your_gemini_api_key>`
- **Multipart Form Data**:
  - `file`: Resume file (must be `.pdf`, max 10MB)
  - `target_role`: Desired job title (e.g. `Senior Cloud Engineer`)
  - `model` *(optional)*: Chosen Gemini model (must be in allowed list)
- **Response**:
  ```json
  {
    "candidate_information": {
      "name": "Candidate Name",
      "email": "user@example.com",
      "location": "City, Country"
    },
    "overall_score": 85,
    "ats_score": 90,
    "skills_score": 82,
    "content_score": 86,
    "experience_score": 84,
    "formatting_score": 92,
    "professional_summary": "Executive summary...",
    "strengths": ["Strong architectural background..."],
    "weaknesses": ["Lacks explicit cloud migration metrics..."],
    "missing_skills": ["Terraform", "Kafka"],
    "ats_keywords": ["FastAPI", "Kubernetes", "PostgreSQL"],
    "grammar_issues": [],
    "formatting_issues": [],
    "recommended_skills": ["Event-driven architectures"],
    "recommended_certifications": ["AWS Solutions Architect Professional"],
    "recommended_courses": ["Advanced Distributed Systems"],
    "interview_questions": ["Explain how you scaled your database connection pool."],
    "career_suggestions": ["Target Lead or Staff Backend roles."],
    "final_assessment": "Strong candidate well positioned for senior positions.",
    "target_role": "Senior Cloud Engineer",
    "model_used": "gemini-2.5-flash",
    "disclaimer": "Scores and observations are AI-generated estimates based on provided resume evidence and do not guarantee ATS passage or employment decisions."
  }
  ```

---

## 6. Running the Test Suite

Execute the complete backend test suite:
```bash
# From repository root:
.\backend\.venv\Scripts\pytest.exe -v -c backend\pytest.ini backend\tests

# From backend folder:
cd backend
pytest -v
```

### Live Gemini Integration Tests (Optional)
To run live network calls against Google Gemini using a test key:
```bash
$env:GEMINI_INTEGRATION_TEST_KEY = "AIzaSyD-YourRealTestKey"
pytest -m integration -v
```
*(Unit tests never require a real key and mock all external API calls by default).*

---

---

## 7. LinkedIn Profile Analyzer API Endpoints

### 7.1 Analyze LinkedIn Profile URL
```bash
curl -X POST "http://localhost:8000/api/linkedin/analyze-url" \
  -H "Content-Type: application/json" \
  -H "X-Gemini-API-Key: AIzaSyYourGeminiApiKey" \
  -d '{
    "url": "https://www.linkedin.com/in/username",
    "target_role": "AI Developer",
    "model": "gemini-2.5-flash"
  }'
```

### 7.2 Analyze LinkedIn PDF Export
```bash
curl -X POST "http://localhost:8000/api/linkedin/analyze-pdf" \
  -H "X-Gemini-API-Key: AIzaSyYourGeminiApiKey" \
  -F "file=@Profile.pdf;type=application/pdf" \
  -F "target_role=AI Developer" \
  -F "model=gemini-2.5-flash"
```

### 7.3 Analyze Pasted Profile Text
```bash
curl -X POST "http://localhost:8000/api/linkedin/analyze-text" \
  -H "Content-Type: application/json" \
  -H "X-Gemini-API-Key: AIzaSyYourGeminiApiKey" \
  -d '{
    "profile_text": "Experienced Senior AI Engineer with extensive experience in LLMs...",
    "target_role": "AI Developer"
  }'
```

---

## 8. Frontend Development

```bash
cd frontend
npm install
npm run dev
```
- Home Landing Page: `http://localhost:5173`
- LinkedIn Profile Analyzer: `http://localhost:5173/linkedin`
- Dashboard: `http://localhost:5173/dashboard`
- Settings: `http://localhost:5173/settings`
- Vitest test suite: `npm run test`
- Production bundle build: `npm run build`
