import re
import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
import httpx

from app.core.config import get_settings
from app.core.logging import logger
from app.models.user import User
from app.models.email_log import EmailDeliveryLog

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class EmailNotConfiguredError(Exception):
    """Raised when email delivery is requested but no provider is configured."""
    pass


class EmailValidationError(Exception):
    """Raised when recipient address, headers, or attachment violates security limits."""
    pass


class EmailDuplicateSendError(Exception):
    """Raised when an identical send is attempted within the cooldown window."""
    pass


class EmailDeliveryError(Exception):
    """Raised when provider call or network communication fails."""
    pass


class EmailService:
    """Service managing transactional email delivery with attachment support."""

    @classmethod
    def validate_recipient(cls, recipient: str) -> str:
        """Validates recipient email address and prevents header injection."""
        if not recipient or not recipient.strip():
            raise EmailValidationError("Recipient email address is required.")

        clean_email = recipient.strip()
        if "\r" in clean_email or "\n" in clean_email:
            raise EmailValidationError("Recipient email contains forbidden newline characters (header injection protection).")

        if not EMAIL_REGEX.match(clean_email):
            raise EmailValidationError(f"Invalid email address format: '{clean_email}'.")

        return clean_email

    @classmethod
    def sanitize_header(cls, text: str) -> str:
        """Removes newlines to prevent header injection in subject or sender name."""
        if not text:
            return ""
        return re.sub(r"[\r\n]+", " ", str(text)).strip()

    @classmethod
    def check_duplicate_send(
        cls,
        db: Session,
        user_id: str,
        document_id: str,
        recipient_email: str,
        window_seconds: int = 30,
    ) -> bool:
        """Checks if a duplicate email was already dispatched in the cooldown window."""
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)
        existing = (
            db.query(EmailDeliveryLog)
            .filter(
                EmailDeliveryLog.user_id == user_id,
                EmailDeliveryLog.document_id == document_id,
                EmailDeliveryLog.recipient_email == recipient_email,
                EmailDeliveryLog.created_at >= cutoff,
            )
            .first()
        )
        return existing is not None

    @classmethod
    async def send_document_email(
        cls,
        db: Session,
        user: User,
        recipient_email: str,
        document_type: str,  # 'resume_pdf', 'resume_docx', 'analysis_pdf', 'job_match_pdf'
        document_id: str,
        filename: str,
        file_bytes: bytes,
        subject: Optional[str] = None,
        custom_message: Optional[str] = None,
    ) -> EmailDeliveryLog:
        """Dispatches an email with the attached document via configured provider."""
        settings = get_settings()

        # 1. Verify provider configuration
        if not settings.is_email_configured:
            raise EmailNotConfiguredError(
                "Email delivery is not configured on this server. "
                "Please configure EMAIL_PROVIDER (smtp, resend, or sendgrid) and associated credentials in the backend environment."
            )

        # 2. Security validations
        clean_recipient = cls.validate_recipient(recipient_email)
        if subject and ("\r" in subject or "\n" in subject):
            raise EmailValidationError("Subject contains forbidden newline characters (header injection protection).")

        clean_filename = cls.sanitize_header(filename or "document.pdf")
        clean_subject = cls.sanitize_header(
            subject or f"Your Document from AI Resume Reviewer Pro: {clean_filename}"
        )

        # Enforce size limit
        max_bytes = settings.MAX_EMAIL_ATTACHMENT_SIZE_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise EmailValidationError(
                f"Attachment size ({len(file_bytes) / (1024*1024):.1f} MB) exceeds maximum allowed size ({settings.MAX_EMAIL_ATTACHMENT_SIZE_MB} MB)."
            )

        # 3. Duplicate send check
        if cls.check_duplicate_send(db, user.id, document_id, clean_recipient):
            raise EmailDuplicateSendError(
                "A document was already sent to this recipient within the last 30 seconds. Please wait before retrying."
            )

        provider = (settings.EMAIL_PROVIDER or "smtp").strip().lower()
        from_address = settings.EMAIL_FROM_ADDRESS or settings.SMTP_FROM_EMAIL or "noreply@resume-reviewer.local"
        from_name = cls.sanitize_header(settings.EMAIL_FROM_NAME or "AI Resume Reviewer Pro")
        from_header = f"{from_name} <{from_address}>"

        body_text = (
            custom_message.strip()
            if custom_message and custom_message.strip()
            else (
                f"Hello,\n\nPlease find attached your document ({clean_filename}) generated using AI Resume Reviewer Pro.\n\n"
                f"Best regards,\n{from_name}"
            )
        )

        message_id: Optional[str] = None

        # 4. Dispatch via chosen provider
        if provider == "resend":
            message_id = await cls._send_via_resend(
                api_key=settings.EMAIL_API_KEY or "",
                from_header=from_header,
                to_address=clean_recipient,
                subject=clean_subject,
                text_content=body_text,
                filename=clean_filename,
                file_bytes=file_bytes,
            )
        elif provider == "sendgrid":
            message_id = await cls._send_via_sendgrid(
                api_key=settings.EMAIL_API_KEY or "",
                from_address=from_address,
                from_name=from_name,
                to_address=clean_recipient,
                subject=clean_subject,
                text_content=body_text,
                filename=clean_filename,
                file_bytes=file_bytes,
            )
        elif provider == "smtp":
            message_id = await cls._send_via_smtp(
                settings=settings,
                from_header=from_header,
                from_address=from_address,
                to_address=clean_recipient,
                subject=clean_subject,
                text_content=body_text,
                filename=clean_filename,
                file_bytes=file_bytes,
            )
        else:
            raise EmailNotConfiguredError(f"Unsupported email provider '{provider}'. Supported: smtp, resend, sendgrid.")

        # 5. Persist audit log
        log_entry = EmailDeliveryLog(
            user_id=user.id,
            recipient_email=clean_recipient,
            document_type=document_type,
            document_id=document_id,
            filename=clean_filename,
            subject=clean_subject,
            provider=provider,
            provider_message_id=message_id,
            status="accepted",  # Provider accepted for delivery
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        logger.info(
            "Dispatched document email (log_id=%s, recipient=%s, provider=%s, msg_id=%s)",
            log_entry.id,
            clean_recipient,
            provider,
            message_id,
        )
        return log_entry

    # --------------------------------------------------------------------------
    # Provider Implementations
    # --------------------------------------------------------------------------
    @classmethod
    async def _send_via_smtp(
        cls,
        settings,
        from_header: str,
        from_address: str,
        to_address: str,
        subject: str,
        text_content: str,
        filename: str,
        file_bytes: bytes,
    ) -> str:
        """Sends email synchronously in background thread pool using standard smtplib."""
        def _sync_smtp():
            msg = MIMEMultipart()
            msg["From"] = from_header
            msg["To"] = to_address
            msg["Subject"] = subject

            msg.attach(MIMEText(text_content, "plain", "utf-8"))

            attachment = MIMEApplication(file_bytes)
            attachment.add_header("Content-Disposition", "attachment", filename=filename)
            msg.attach(attachment)

            host = settings.SMTP_HOST
            port = settings.SMTP_PORT or 587
            use_tls = settings.SMTP_USE_TLS

            server = smtplib.SMTP(host, port, timeout=15)
            try:
                server.ehlo()
                if use_tls:
                    server.starttls()
                    server.ehlo()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(from_address, [to_address], msg.as_string())
            finally:
                try:
                    server.quit()
                except Exception:
                    pass
            return f"smtp-{int(datetime.now(timezone.utc).timestamp())}"

        try:
            return await asyncio.to_thread(_sync_smtp)
        except Exception as e:
            logger.error("SMTP delivery failed to %s: %s", to_address, e)
            raise EmailDeliveryError(f"SMTP delivery failed: {str(e)}")

    @classmethod
    async def _send_via_resend(
        cls,
        api_key: str,
        from_header: str,
        to_address: str,
        subject: str,
        text_content: str,
        filename: str,
        file_bytes: bytes,
    ) -> str:
        """Sends email via Resend REST API."""
        import base64

        encoded = base64.b64encode(file_bytes).decode("ascii")
        payload = {
            "from": from_header,
            "to": [to_address],
            "subject": subject,
            "text": text_content,
            "attachments": [
                {
                    "filename": filename,
                    "content": encoded,
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.post(
                    "https://api.resend.com/emails",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                )
                if res.status_code >= 400:
                    raise EmailDeliveryError(f"Resend API error ({res.status_code}): {res.text}")
                data = res.json()
                return data.get("id") or "resend-accepted"
        except EmailDeliveryError:
            raise
        except Exception as e:
            logger.error("Resend API request failed: %s", e)
            raise EmailDeliveryError(f"Resend delivery failed: {str(e)}")

    @classmethod
    async def _send_via_sendgrid(
        cls,
        api_key: str,
        from_address: str,
        from_name: str,
        to_address: str,
        subject: str,
        text_content: str,
        filename: str,
        file_bytes: bytes,
    ) -> str:
        """Sends email via SendGrid v3 Mail Send API."""
        import base64

        encoded = base64.b64encode(file_bytes).decode("ascii")
        payload = {
            "personalizations": [{"to": [{"email": to_address}]}],
            "from": {"email": from_address, "name": from_name},
            "subject": subject,
            "content": [{"type": "text/plain", "value": text_content}],
            "attachments": [
                {
                    "content": encoded,
                    "filename": filename,
                    "disposition": "attachment",
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                )
                if res.status_code >= 400:
                    raise EmailDeliveryError(f"SendGrid API error ({res.status_code}): {res.text}")
                msg_id = res.headers.get("X-Message-Id") or "sendgrid-accepted"
                return msg_id
        except EmailDeliveryError:
            raise
        except Exception as e:
            logger.error("SendGrid API request failed: %s", e)
            raise EmailDeliveryError(f"SendGrid delivery failed: {str(e)}")
