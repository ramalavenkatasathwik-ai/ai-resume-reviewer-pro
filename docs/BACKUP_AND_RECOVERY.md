# Backup & Disaster Recovery Guide

This document outlines the backup, data integrity, and disaster recovery strategy for **AI Resume Reviewer Pro**, focusing on Phase 7 persistent storage: analysis reports, user resume libraries, version histories, and private file storage.

---

## 1. Architecture Overview

AI Resume Reviewer Pro stores data across two primary subsystems:
1. **Relational Database (PostgreSQL / Supabase)**:
   - `users`: User identity and salted password hashes.
   - `resumes`: Parent resume documents, target roles, and archive flags.
   - `resume_versions`: Immutable incremental version snapshots with structured JSON resumes.
   - `analysis_history` / `analysis_reports`: Evaluation scores, token metrics, and audit results.
   - `stored_files`: Metadata for privately stored files.
   - `password_reset_tokens`: Ephemeral hashed reset tokens with automated expiration.
2. **Private File Storage**:
   - **Local Storage Provider**: High-security local directory (`backend/storage/private`) using random UUID keys (never original filenames).
   - **Supabase Storage Provider**: Private, authenticated cloud bucket (`resumes-private`).

> [!IMPORTANT]
> **Zero-Persistence BYOK Security Policy**: User Gemini API keys are strictly transient (ephemeral memory only). They are **never** persisted to PostgreSQL, stored files, log files, or backup archives.

---

## 2. PostgreSQL Database Backup Procedures

### 2.1 Automated Daily Logical Dumps (`pg_dump`)

Automated cron or scheduled task execution generates compressed custom-format dumps:

```bash
# Create timestamped dump
BACKUP_DIR="/var/backups/ai-resume-reviewer"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

pg_dump -Fc --no-acl --no-owner \
  -h "${DB_HOST:-localhost}" \
  -p "${DB_PORT:-5432}" \
  -U "${DB_USER:-postgres}" \
  -d "${DB_NAME:-resume_reviewer}" \
  -f "${BACKUP_DIR}/db_backup_${TIMESTAMP}.dump"
```

### 2.2 Point-In-Time Recovery (PITR) & Supabase

When running on managed PostgreSQL (such as Supabase or AWS RDS):
- **Continuous Archiving**: Continuous WAL (Write-Ahead Logging) archiving is enabled by default.
- **Recovery Point Objective (RPO)**: Under 5 minutes.
- **Recovery Time Objective (RTO)**: Under 30 minutes.

### 2.3 Database Restoration Drill

To restore a database snapshot into a clean target:

```bash
# Terminate existing active connections to target database
psql -h "${DB_HOST}" -U "${DB_USER}" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'resume_reviewer' AND pid <> pg_backend_pid();"

# Restore using pg_restore
pg_restore --clean --if-exists --no-acl --no-owner \
  -h "${DB_HOST:-localhost}" \
  -p "${DB_PORT:-5432}" \
  -U "${DB_USER:-postgres}" \
  -d "${DB_NAME:-resume_reviewer}" \
  "${BACKUP_DIR}/db_backup_${TIMESTAMP}.dump"

# Run alembic migrations to verify schema parity
cd backend
alembic upgrade head
```

---

## 3. Private File Storage Backup

### 3.1 Local Storage Provider (`storage/private/`)

For self-hosted instances utilizing `STORAGE_PROVIDER=local`:

```bash
# Synchronize private storage directory to encrypted off-site backup storage
rsync -avz --delete \
  backend/storage/private/ \
  s3://your-encrypted-backup-bucket/private-storage/
```

- Storage keys are random UUIDs (e.g., `3f7b2a9e...bin`), preventing predictable file discovery.
- Path traversal prevention is enforced at the service level.

### 3.2 Supabase Private Bucket

When configured with `STORAGE_PROVIDER=supabase`:
- Cross-region bucket replication is configured via the cloud provider console.
- S3 versioning ensures deleted or mutated objects remain recoverable for 30 days.

---

## 4. Disaster Recovery Checklist

| Step | Action | Responsible System | Verification |
|------|--------|--------------------|--------------|
| 1 | Restore PostgreSQL database schema & records | `pg_restore` / Supabase PITR | Verify table counts in `resumes`, `resume_versions` |
| 2 | Restore private files | S3 sync / rsync | Match checksums with `stored_files` table |
| 3 | Apply pending migrations | `alembic upgrade head` | `alembic current` confirms revision `004` |
| 4 | Run integration test suite | `pytest -q` | All 100+ tests pass |
| 5 | Verify auth and session isolation | Test login & token refresh | Unauthenticated requests receive HTTP 401 |
| 6 | Verify BYOK key validation | Check API request headers | Ensure headers are redacted from server logs |

---

## 5. Routine Recovery Drills

Simulated disaster recovery drills must be executed quarterly:
1. Spin up an ephemeral staging environment.
2. Restore the latest database dump and storage directory snapshot.
3. Run automated regression test suites against the restored staging database.
4. Verify resume version tree immutability: ensuring historical snapshots remain byte-for-byte identical to their original state.
