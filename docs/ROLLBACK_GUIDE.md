# AI Resume Reviewer Pro — Production Rollback Guide
**Phase 12: Application and Database Rollback Procedures**

This guide provides operational runbooks for safely rolling back code releases, container builds, and database migrations in the event of an incident or deployment defect.

---

## 1. Fast Rollback Decision Matrix

| Incident Type | Action Required | Expected Recovery Time | Data Loss Risk |
| :--- | :--- | :--- | :--- |
| **Frontend UI Regression / Styling Bug** | Instant rollback via Vercel Dashboard | < 60 seconds | Zero |
| **Backend API Bug / Crash Loop** | Redeploy previous successful Render commit | < 2 minutes | Zero |
| **Faulty Database Migration** | Controlled Alembic downgrade | < 5 minutes | Low to Medium (new schema columns only) |
| **Catastrophic Data Corruption** | Restore from last verified database backup | 15–30 minutes | Changes since last backup |

---

## 2. Frontend Rollback Procedure (Vercel)

Vercel maintains immutable deployments for every build. To roll back:

1. Open your project in the [Vercel Dashboard](https://vercel.com).
2. Navigate to the **Deployments** tab.
3. Locate the last known good deployment (marked by a green checkmark).
4. Click the **three dots menu (`...`)** next to that deployment and select **Instant Rollback**.
5. Confirm the action. Traffic is immediately redirected to the previous immutable build without a rebuild step.

---

## 3. Backend Rollback Procedure (Render)

Render allows pinning or rolling back to any previous commit:

1. Open your service in the [Render Dashboard](https://dashboard.render.com).
2. Go to the **Events** or **Deploys** tab.
3. Locate the previous stable deploy.
4. Click **Rollback to this deploy**.
5. If the failure was due to an environment variable change, revert the variable under **Environment** and click **Save Changes** (triggers an automated redeploy).

---

## 4. Database Schema Rollback (Alembic)

> [!WARNING]
> Only roll back migrations if the newly introduced schema change is the root cause of failures. Destructive downgrades will drop newly created columns and tables.

### Step 1: Check Current Database Migration State
```bash
cd backend
alembic current
```

### Step 2: Roll Back Exactly One Revision
To roll back the most recent migration (e.g. from `008_token_version` back to `007_career_intelligence`):
```bash
alembic downgrade -1
```

### Step 3: Roll Back to a Specific Known Good Revision
```bash
alembic downgrade 007_career_intelligence
```

### Step 4: Verify Schema Consistency
```bash
alembic current
# Verify that the current revision matches your target
```

---

## 5. Post-Rollback Validation Checklist

1. [ ] Confirm `GET /api/health` returns `200 OK`.
2. [ ] Verify user authentication and login with existing accounts.
3. [ ] Verify resume history and job match reports load without database errors.
4. [ ] Verify that error rates in logs have returned to baseline zero.
