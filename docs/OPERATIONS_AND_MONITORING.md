# AI Resume Reviewer Pro — Operations & Monitoring Guide
**Phase 12: Production Observability, Alerting, and Privacy-Conscious Logging**

This guide outlines the production monitoring, health checking, and logging architecture for **AI Resume Reviewer Pro**.

---

## 1. Zero-Leakage Privacy-Conscious Logging Standards

To maintain compliance with privacy regulations (GDPR, CCPA) and prevent security vulnerabilities:

1. **API Keys:** NEVER log Google Gemini API keys in full. The backend strictly masks keys (e.g. `AIza...****`) or omits them entirely from log messages.
2. **Passwords & Tokens:** Passwords, reset tokens, and JWT tokens are NEVER printed in application logs or exception tracebacks.
3. **Candidate Personal Data:** Resumes, contact phone numbers, physical addresses, and candidate names are excluded from informational logs.
4. **Structured Error Logs:** Production exception handlers return generalized JSON errors (`{"error": "INTERNAL_SERVER_ERROR", "message": "An internal server error occurred."}`) without dumping raw tracebacks to clients.

---

## 2. Health & Readiness Probes

### Primary Health Check (`GET /api/health`)
- **Endpoint:** `GET /api/health`
- **Response:**
  ```json
  {
    "status": "healthy",
    "service": "ai-resume-reviewer-api"
  }
  ```
- **HTTP Code:** `200 OK`
- **Orchestration Config:**
  - In Docker Compose: checked every 15s with 5s timeout.
  - In Render: configured as health check path `/api/health`.

---

## 3. Uptime Monitoring & Alerting (Low-Cost / Free Setup)

To monitor availability and receive instant notifications if the application degrades:

### Setting up Free Uptime Checks (Better Stack / UptimeRobot)
1. Create a free account on [Better Stack](https://betterstack.com) or [UptimeRobot](https://uptimerobot.com).
2. Create two HTTP monitors:
   - **Frontend Monitor:** `https://your-app.vercel.app` (Checks every 3–5 minutes)
   - **Backend API Monitor:** `https://your-api.onrender.com/api/health` (Checks every 1–3 minutes)
3. Configure Alert Destinations:
   - Email notifications
   - Slack / Discord webhook notifications
   - SMS / Push notifications for downtime

---

## 4. Operational Metrics & Thresholds

| Metric | Target / SLA | Warning Threshold | Critical Alert Threshold |
| :--- | :--- | :--- | :--- |
| **API Availability** | > 99.5% | < 99.0% | < 98.0% |
| **CRUD Request Latency (p95)** | < 250 ms | > 600 ms | > 1500 ms |
| **AI Analysis Latency (p95)** | < 6.0 s | > 12.0 s | > 20.0 s |
| **5xx Error Rate** | < 0.1% | > 1.0% | > 5.0% |
| **Rate Limit Triggers (429)** | Baseline normal | > 50 / hour | > 500 / hour (potential DoS) |
| **Database Disk Usage** | < 60% | > 75% | > 90% |

---

## 5. Routine Maintenance Runbook

1. **Weekly Log Review:** Check Render service logs for recurrent 502 or 429 errors from Google Gemini.
2. **Monthly Migration Audit:** Verify Alembic heads and verify schema compatibility before releasing new features.
3. **Quarterly Dependency Updates:** Run `npm audit` and `pip list --outdated` to patch vulnerabilities.
