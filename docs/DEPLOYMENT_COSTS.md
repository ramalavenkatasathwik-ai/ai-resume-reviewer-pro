# AI Resume Reviewer Pro — Deployment Cost & Free Tier Analysis
**Phase 12: Infrastructure Pricing, Free Tier Quotas, and TCO Analysis**

This document provides a realistic, transparent accounting of hosting costs, free-tier limitations, and scalability options for **AI Resume Reviewer Pro**.

---

## 1. Hosting Architecture Cost Comparison

### Tier 1: Zero-Dollar Launch Tier ($0 / month)
Best for portfolio showcase, testing, and initial beta users.

| Component | Provider | Plan | Monthly Cost | Quotas & Inclusions | Limitations & Caveats |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Frontend** | Vercel | Hobby (Free) | **$0.00** | 100 GB bandwidth / month, unlimited deployments | Non-commercial use policy |
| **Backend API** | Render | Free Web Service | **$0.00** | 750 instance hours / month, 512 MB RAM | **Spins down after 15 min of inactivity** (causes ~45s cold start on first request) |
| **Database** | Supabase | Free Tier | **$0.00** | 500 MB PostgreSQL database, 2 projects | **Pauses project after 7 days of inactivity** (requires manual unpause in dashboard) |
| **Private Files** | Supabase Storage | Free Tier | **$0.00** | 1 GB file storage, 2 GB egress / month | Hard quota at 1 GB |
| **AI Processing** | Google Cloud (Gemini) | BYOK (User Key) | **$0.00** *(to app owner)* | User's personal quota (e.g. 15 RPM free on Google AI Studio) | Users supply their own API key; application owner incurs **$0.00** in AI compute |
| **Monitoring** | Better Stack | Free Tier | **$0.00** | 10 uptime monitors, 3-min intervals, email alerts | Basic alerting only |
| **Total** | | | **$0.00 / mo** | | Cold starts and inactivity pausing |

---

### Tier 2: Production-Grade Always-On Tier ($14 – $21 / month)
Best for production users, commercial operation, and zero cold starts.

| Component | Provider | Plan | Monthly Cost | Quotas & Benefits |
| :--- | :--- | :--- | :---: | :--- |
| **Frontend** | Vercel | Pro (or Hobby) | **$0.00 – $20.00** | Custom domains, DDoS protection, edge caching |
| **Backend API** | Render | Starter | **$7.00** | **Always-on** (zero cold starts), 512 MB RAM, 0.5 CPU |
| **Database** | Render PostgreSQL | Starter | **$7.00** | **Persistent PostgreSQL**, automated daily backups, 1 GB storage, no 30-day expiration |
| **Private Files** | Render Persistent Disk | 10 GB Mount | **$2.50** | Fully private local disk mounted to backend service |
| **AI Processing** | Google Cloud (Gemini) | BYOK (User Key) | **$0.00** | Shifted to user API keys |
| **Total** | | | **$16.50 / mo** | High availability, automated backups, zero cold starts |

---

## 2. Deep Dive: Free Tier Operational Behaviors

### Render Free Web Service Cold Starts
- **Behavior:** If no HTTP requests are received within 15 minutes, the web container is stopped.
- **Wakeup Time:** The next inbound request wakes the container, resulting in a **30 to 50 second latency delay**.
- **Mitigation:** The frontend features a reactive health checker (`useHealthCheck`) that pings `/api/health` on initial page load and shows a warm-up indicator if the backend is initializing.

### Supabase Free Tier Inactivity Pause
- **Behavior:** Supabase free databases pause after 7 consecutive days of zero database queries.
- **Mitigation:** Setting up an automated uptime ping or running scheduled tests keeps the database active, or upgrade to Render PostgreSQL Starter ($7/mo) which never pauses.

---

## 3. Gemini BYOK Cost Advantage
Because AI Resume Reviewer Pro was designed from Phase 1 with Bring-Your-Own-Key (BYOK) architecture:
1. **Zero LLM Billing Liability:** The application owner never pays for model tokens.
2. **Quota Isolation:** If a heavy user exceeds their Gemini quota (HTTP 429), it only affects that individual user, preventing a noisy-neighbor outage for other users.
3. **Model Choice:** Users can select between `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`, and `gemini-1.5-pro` depending on their preferred balance of speed and depth.
