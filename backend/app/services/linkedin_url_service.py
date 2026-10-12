import re
from typing import Dict, Any, Optional, Tuple
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException, status

from app.core.logging import logger


class LinkedInUrlService:
    """Validates, normalizes, and safely checks accessibility of LinkedIn profile URLs.
    
    Security & Ethical Compliance:
    - Never uses session cookies, stolen auth tokens, or browser automation bypasses.
    - Strictly obeys LinkedIn's public access limitations and terms of service.
    - If LinkedIn's authwall or anti-scraping walls are triggered (HTTP 999 / 403 / redirect to login),
      it honestly detects the limitation and guides the user to the official PDF export or text paste.
    """

    APPROVED_HOSTNAMES = {
        "linkedin.com",
        "www.linkedin.com",
        "in.linkedin.com",
        "uk.linkedin.com",
        "ca.linkedin.com",
        "au.linkedin.com",
        "de.linkedin.com",
        "fr.linkedin.com",
        "es.linkedin.com",
        "nl.linkedin.com",
    }
    APPROVED_HOST_REGEX = re.compile(r"^(?:www\.|[a-z]{2}\.)?linkedin\.com$", re.IGNORECASE)
    PROFILE_PATH_PATTERN = re.compile(r"^/in/([a-zA-Z0-9_\-\.%]+)/?$", re.IGNORECASE)

    @classmethod
    def validate_and_normalize_url(cls, raw_url: str) -> Tuple[str, str]:
        """Validates that a URL is a legitimate personal LinkedIn profile and normalizes it.
        
        Security & Ethical Compliance:
        - Accepts only HTTPS LinkedIn profile URLs on approved LinkedIn hostnames.
        - Validates the profile path (/in/<username>).
        - Rejects unrelated domains, malformed URLs, credentials embedded in URLs, and unexpected ports.
        - Normalizes supported URL forms to https://www.linkedin.com/in/<username>.
        - Never treats URL validation as proof of profile access.
        
        Returns:
            Tuple of (normalized_url: str, username_slug: str)
            
        Raises:
            HTTPException with user-friendly errors on invalid or unauthorized URLs.
        """
        if not raw_url or not isinstance(raw_url, str) or not raw_url.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "EMPTY_URL",
                    "message": "LinkedIn profile URL is required.",
                },
            )

        cleaned_url = raw_url.strip()

        # Reject insecure HTTP
        if cleaned_url.startswith("http://"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "INSECURE_SCHEME",
                    "message": "Insecure HTTP is not allowed. Only HTTPS LinkedIn profile URLs are supported.",
                },
            )

        # Require HTTPS scheme
        if not cleaned_url.startswith("https://"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "INVALID_URL_SCHEME",
                    "message": "Only HTTPS LinkedIn profile URLs are supported.",
                },
            )

        try:
            parsed = urlparse(cleaned_url)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "MALFORMED_URL",
                    "message": "The provided URL format is malformed or invalid.",
                },
            )

        # Reject embedded credentials
        if parsed.username or parsed.password or "@" in (parsed.netloc or ""):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "CREDENTIALS_NOT_ALLOWED",
                    "message": "URLs containing embedded authentication credentials are not permitted.",
                },
            )

        # Reject unexpected ports
        if parsed.port is not None and parsed.port != 443:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "UNEXPECTED_PORT",
                    "message": f"Unexpected port '{parsed.port}' specified in URL. Only standard HTTPS port 443 is permitted.",
                },
            )

        hostname = (parsed.hostname or "").lower()
        if not hostname:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "INVALID_HOSTNAME",
                    "message": "The URL does not contain a valid hostname.",
                },
            )

        # Verify approved LinkedIn hostname
        if not cls.APPROVED_HOST_REGEX.match(hostname):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "UNSUPPORTED_DOMAIN",
                    "message": f"Domain '{hostname}' is not supported. Only approved LinkedIn personal profile URLs are accepted.",
                },
            )

        path = parsed.path
        match = cls.PROFILE_PATH_PATTERN.match(path)
        if not match or not match.group(1):
            if path.startswith("/company"):
                msg = "Company pages are not supported. Please supply a personal LinkedIn member profile (e.g. /in/username)."
            elif path.startswith("/jobs"):
                msg = "Job posting URLs are not supported. Please supply a personal LinkedIn member profile."
            elif path.startswith(("/feed", "/posts", "/learning", "/school", "/groups")):
                msg = f"Path '{path}' is not a personal profile path. Only personal LinkedIn member profiles (/in/...) are accepted."
            else:
                msg = "URL path must point to a personal LinkedIn profile (e.g. https://www.linkedin.com/in/username)."

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "INVALID_PROFILE_PATH",
                    "message": msg,
                },
            )

        username = match.group(1).rstrip("/")
        normalized_url = f"https://www.linkedin.com/in/{username}"
        return normalized_url, username

    @classmethod
    async def probe_profile_url(cls, normalized_url: str) -> Dict[str, Any]:
        """Gently probes the public URL to check accessibility and extract public metadata.
        
        Returns a dict:
        {
            "accessible": bool,
            "status_code": int,
            "extracted_text": str,
            "extracted_meta": dict,
            "limitations": list[str]
        }
        """
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                response = await client.get(normalized_url, headers=headers)
        except httpx.TimeoutException:
            logger.warning("Timeout while connecting to LinkedIn URL: %s", normalized_url)
            return {
                "accessible": False,
                "status_code": 408,
                "extracted_text": "",
                "extracted_meta": {},
                "limitations": [
                    "Connection to LinkedIn timed out after 8 seconds. LinkedIn's servers may be throttling automated requests."
                ],
            }
        except Exception as e:
            logger.warning("Error fetching LinkedIn URL: %s", type(e).__name__)
            return {
                "accessible": False,
                "status_code": 500,
                "extracted_text": "",
                "extracted_meta": {},
                "limitations": [
                    f"Network error while attempting to contact LinkedIn: {type(e).__name__}"
                ],
            }

        status_code = response.status_code
        final_url = str(response.url)

        # Check for LinkedIn authwall or HTTP 999 (LinkedIn's anti-scraping HTTP code)
        is_authwall = (
            status_code in (401, 403, 999)
            or "authwall" in final_url.lower()
            or "login" in final_url.lower()
            or "challenge" in final_url.lower()
        )

        html_content = response.text or ""

        # Parse basic OpenGraph and meta tags from HTML
        extracted_meta = cls._extract_meta_tags(html_content)

        if is_authwall:
            limitations = [
                "LinkedIn's security policies require an authenticated member session to view full profile details (experience bullets, projects, recommendations).",
                "Direct public web scraping without logged-in cookies was restricted by LinkedIn's authwall (HTTP status or login redirect).",
                "To perform an exhaustive 100% deep analysis, please use the 'LinkedIn PDF' tab with your official 'Save to PDF' export or the 'Pasted Text' tab.",
            ]
            return {
                "accessible": bool(extracted_meta.get("title")),
                "status_code": status_code,
                "extracted_text": cls._format_meta_as_profile_text(extracted_meta, normalized_url),
                "extracted_meta": extracted_meta,
                "limitations": limitations,
            }

        # If HTTP 200 and not authwall, extract visible text content
        extracted_text = cls._extract_basic_text(html_content)
        if not extracted_text and extracted_meta:
            extracted_text = cls._format_meta_as_profile_text(extracted_meta, normalized_url)

        return {
            "accessible": True,
            "status_code": status_code,
            "extracted_text": extracted_text,
            "extracted_meta": extracted_meta,
            "limitations": [],
        }

    @staticmethod
    def _extract_meta_tags(html: str) -> Dict[str, str]:
        """Extracts OpenGraph and Twitter meta tags without heavy external dependencies."""
        meta: Dict[str, str] = {}
        # Search og:title, og:description, title
        og_title = re.search(r'<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']', html, re.IGNORECASE)
        if og_title:
            meta["title"] = og_title.group(1).strip()

        og_desc = re.search(r'<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']', html, re.IGNORECASE)
        if og_desc:
            meta["description"] = og_desc.group(1).strip()

        title_tag = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
        if title_tag and "title" not in meta:
            meta["title"] = title_tag.group(1).strip()

        return meta

    @staticmethod
    def _format_meta_as_profile_text(meta: Dict[str, str], url: str) -> str:
        """Formats extracted metadata into standard profile text for Gemini evaluation."""
        lines = [f"LinkedIn Profile URL: {url}"]
        if "title" in meta:
            lines.append(f"Profile Title / Name: {meta['title']}")
        if "description" in meta:
            lines.append(f"Summary / Headline: {meta['description']}")
        return "\n".join(lines)

    @staticmethod
    def _extract_basic_text(html: str) -> str:
        """Strips HTML script and style tags to collect plain text."""
        cleaned = re.sub(r"<(script|style).*?>.*?</\1>", "", html, flags=re.DOTALL | re.IGNORECASE)
        cleaned = re.sub(r"<[^>]+>", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        # Keep reasonable excerpt
        return cleaned[:8000]
