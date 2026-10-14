# Security Incident Response Plan — AI Resume Reviewer Pro

**Document Owner:** Senior Application Security & DevOps Engineer  
**Scope:** AI Resume Reviewer Pro Production Environment  
**Last Updated:** October 14, 2026  

---

## 1. Incident Classification & Severity Levels

| Severity | Definition | Target Initial Response | Examples |
|:---|:---|:---|:---|
| **P1 — Critical** | Active exploit of production credentials, confirmed data breach of candidate PII, or complete system compromise. | Immediate (< 15 mins) | Exposed `GEMINI_API_KEY`, database credentials leaked, public resume exposure. |
| **P2 — High** | Exploitable vulnerability identified in production, runaway AI spending/DDoS, or single-tenant data leak. | < 1 hour | Spike in unauthorized IDOR attempts, Gemini quota exhausted by abusive IP, prompt injection bypassing guards. |
| **P3 — Medium** | Non-exploitative failure of security controls, transient rate limit failures, or dependency CVE. | < 4 hours | Slow response on PDF extraction, elevated 500 error rates, minor header misconfiguration. |
| **P4 — Low** | Minor logging anomaly, low-severity dependency warning, or theoretical security flaw. | < 24 hours | Deprecation warning in crypto library, UI cosmetic sanitization bug. |

---

## 2. Emergency Operational Playbooks

### Playbook A: Compromised Gemini API Key or Runaway AI Costs

**Trigger:** Unusual spike in Google AI Studio billing, key exposed in public forum/commit, or upstream 429 quota exhaustion.

1. **Step 1: Activate Emergency Killswitch (Immediate)**
   - In Render Dashboard -> `ai-resume-reviewer-backend` -> **Environment**:
     - Set `AI_EMERGENCY_DISABLE = true`
     - Save changes (triggers immediate rolling restart).
   - *Result:* All incoming AI calls are immediately short-circuited with HTTP 503 `AI_SERVICE_SUSPENDED`. No further upstream Gemini tokens are consumed.

2. **Step 2: Revoke and Rotate Key in Google AI Studio**
   - Log in to [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Locate the compromised API key and click **Delete / Revoke**.
   - Click **Create API Key** to provision a fresh, high-entropy key.
   - Configure quota and budget alerts in Google Cloud Platform Console for the project.

3. **Step 3: Update Production Environment Variable**
   - In Render Dashboard:
     - Update `GEMINI_API_KEY` with the new key.
     - Reset `AI_EMERGENCY_DISABLE = false`.
     - Save and deploy.

4. **Step 4: Verification**
   - Open `/api/health` -> verify status is healthy.
   - In the frontend Settings page -> AI Engine Configuration -> click **Test Connection**.
   - Verify connection succeeds with `gemini-4-argon`.

---

### Playbook B: Suspected Account Breach or Unauthorized Data Access

**Trigger:** Multiple failed logins from unusual IPs, user report of suspicious resume changes, or IDOR attempts detected in logs.

1. **Step 1: Global Session Invalidation**
   - To revoke all active sessions for a specific user:
     - Run backend administrative script or direct database query:
       ```sql
       UPDATE users SET token_version = token_version + 1 WHERE email = 'target_user@example.com';
       ```
   - *Result:* All active JWT bearer tokens and session cookies for this user are instantly rejected with HTTP 401 `TOKEN_REVOKED`.

2. **Step 2: Force Password Reset**
   - Generate a secure password reset token or set user `is_active = false` temporarily while investigating:
     ```sql
     UPDATE users SET is_active = false WHERE id = 'compromised_user_id';
     ```

3. **Step 3: Forensic Log Inspection**
   - Correlate access using `X-Request-ID` and user ID in Render application logs:
     ```bash
     # Search logs for suspicious user ID requests
     grep -E "req_id=.*user_id=target_user_id" /path/to/logs
     ```

---

### Playbook C: Malicious File Upload or Parser DoS

**Trigger:** Backend pods experiencing OOM (Out of Memory) kills or 100% CPU utilization from PDF parsing.

1. **Step 1: Identify Abusive IP or User**
   - Inspect web server access logs for repeated `POST /api/analyze` or `POST /api/files/upload`.
2. **Step 2: Block Abusive IP at Reverse Proxy**
   - In Render / Cloudflare firewall settings:
     - Add IP address or CIDR range to Block list.
3. **Step 3: Temporary Limit Reduction**
   - In backend environment variables, reduce `MAX_UPLOAD_PAGES` from 30 to 10 and `MAX_UPLOAD_SIZE_MB` from 10 to 5.
   - Trigger restart.

---

## 3. Communication and Escalation Path

| Role | Responsibility | Contact |
|:---|:---|:---|
| **Incident Commander** | Coordinates containment, communication, and resolution. | Lead Architect |
| **Security Engineer** | Conducts technical forensics, key rotation, and patch deployment. | Security Team |
| **Infrastructure Lead** | Manages cloud providers, database backups, and reverse proxies. | DevOps |

---

## 4. Post-Incident Review (Blameless Post-Mortem)

Within 48 hours of resolving any P1 or P2 incident, the team must complete a post-mortem documenting:
1. **Summary:** Brief description of what occurred and customer impact.
2. **Timeline:** Chronological breakdown from initial trigger to full recovery.
3. **Root Cause Analysis:** 5 Whys analysis identifying systemic factors.
4. **Corrective Actions:** Specific Jira/GitHub issues created to prevent recurrence.
5. **Lessons Learned:** What went well, what could be improved, and where defenses succeeded.
