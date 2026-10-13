# AI Resume Reviewer Pro — Database Backup & Disaster Recovery Guide
**Phase 12: Production Backups, Retention, and Disaster Recovery**

This guide documents the procedures for backing up and restoring PostgreSQL databases and private document storage for **AI Resume Reviewer Pro**.

---

## 1. Backup Strategy Overview

| Tier | Mechanism | Frequency | Retention | Recovery Time Objective (RTO) | Recovery Point Objective (RPO) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Render Managed DB** | Automated Daily Backups (Paid) or Logical Dumps | Daily | 7 days (Starter) to 30 days (Pro) | < 30 minutes | < 24 hours |
| **Supabase DB** | Automated Daily Backups + PITR | Continuous WAL + Daily snapshot | 7–30 days | < 15 minutes | < 5 minutes (PITR) |
| **Self-Hosted / Docker** | Scheduled `pg_dump` to encrypted S3 | Daily cron job | 30 days | < 20 minutes | < 24 hours |
| **Private Files** | S3 / Supabase Storage Versioning | Continuous | Concurrent with DB | Immediate | Zero loss |

---

## 2. Automated Logical Backup Procedure (`pg_dump`)

For instances without native automated backups, run a logical dump using `pg_dump`:

### Running a Manual or Scheduled Backup
```bash
# 1. Export database credentials securely into session
export PGPASSWORD="your_secure_db_password"

# 2. Execute pg_dump with custom compressed archive format
pg_dump \
  --host="your-db-host.oregon-postgres.render.com" \
  --port=5432 \
  --username="resume_admin" \
  --dbname="resume_reviewer" \
  --format=custom \
  --compress=9 \
  --file="backup_resume_reviewer_$(date +%Y%m%d_%H%M%S).dump"

# 3. Clear sensitive session variable
unset PGPASSWORD
```

### Encrypting and Shipping Backups Offsite
Never store database backups on the same container or host as the live database. Encrypt using AES-256 before uploading to cold storage:
```bash
# Encrypt backup file with GPG or OpenSSL
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in backup_resume_reviewer_20261014.dump \
  -out backup_resume_reviewer_20261014.dump.enc \
  -k "your-offsite-backup-encryption-passphrase"

# Upload to secure offsite object storage (AWS S3 / Cloudflare R2 / GCP Cloud Storage)
aws s3 cp backup_resume_reviewer_20261014.dump.enc s3://my-secure-backups-bucket/db/
```

---

## 3. Database Restoration Procedure

### Restoring from a Custom Dump (`pg_restore`)
```bash
# 1. Create a fresh target database (or clean existing staging database)
createdb -h localhost -U postgres resume_reviewer_recovery

# 2. Restore schema, tables, and data using pg_restore
export PGPASSWORD="your_secure_db_password"
pg_restore \
  --host="localhost" \
  --port=5432 \
  --username="postgres" \
  --dbname="resume_reviewer_recovery" \
  --clean \
  --if-exists \
  --verbose \
  "backup_resume_reviewer_20261014.dump"

unset PGPASSWORD

# 3. Verify Alembic migration version matches expected head
cd backend
alembic current
# Expected output: 008_token_version (head)
```

---

## 4. Disaster Recovery & Consistency Verification

After performing a database restoration:

1. **Verify Table Counts and Row Integrity:**
   ```sql
   SELECT count(*) FROM users;
   SELECT count(*) FROM resumes;
   SELECT count(*) FROM resume_versions;
   SELECT count(*) FROM analysis_history;
   SELECT count(*) FROM job_match_reports;
   ```
2. **Verify Foreign Key Integrity:**
   Ensure orphaned records do not exist between resumes and resume versions:
   ```sql
   SELECT id FROM resume_versions WHERE resume_id NOT IN (SELECT id FROM resumes);
   -- Expected: 0 rows
   ```
3. **Verify Stored Document Alignment:**
   Verify that all `stored_file_id` records in `stored_files` have corresponding physical objects in private storage.
