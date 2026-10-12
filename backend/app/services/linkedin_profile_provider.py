from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
import httpx
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.logging import logger

settings = get_settings()


class ProfileAcquisitionResult(BaseModel):
    """Encapsulates the result of retrieving LinkedIn profile data from a provider."""

    success: bool = Field(..., description="Whether profile content was successfully acquired")
    content: Optional[str] = Field(None, description="Extracted profile text ready for Gemini evaluation")
    source: str = Field(..., description="Provider source identifier: 'official_api', 'user_supplied_text', or 'none'")
    available_sections: List[str] = Field(default_factory=list, description="Sections with verified evidence")
    unavailable_sections: List[str] = Field(default_factory=list, description="Sections absent from provider")
    limitations: List[str] = Field(default_factory=list, description="Data availability limitations")
    actionable_message: Optional[str] = Field(None, description="Actionable guidance if data is unavailable")
    raw_data: Optional[Dict[str, Any]] = Field(None, description="Raw structured payload from provider if applicable")


class LinkedInProfileProvider(ABC):
    """Abstract interface for LinkedIn profile data acquisition.
    
    Principles:
    - Never scrape LinkedIn using browser cookies or session credentials.
    - Never bypass authentication, access controls, rate limits, or LinkedIn restrictions.
    - Use official LinkedIn APIs only when approved credentials and permissions are available.
    - Fall back to user-supplied text when direct API access is not configured.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Unique provider identifier."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Determines whether this provider is currently configured and usable."""
        pass

    @abstractmethod
    async def acquire_profile(
        self,
        url: str,
        username: str,
        **kwargs: Any,
    ) -> ProfileAcquisitionResult:
        """Attempts to retrieve profile content."""
        pass


class OfficialLinkedInApiProvider(LinkedInProfileProvider):
    """Official LinkedIn API Provider.
    
    Enabled ONLY when approved LinkedIn API access and required OAuth permissions are configured.
    Interacts strictly with official LinkedIn REST endpoints (e.g. /v2/userinfo).
    """

    def __init__(
        self,
        access_token: Optional[str] = None,
        api_base_url: str = "https://api.linkedin.com/v2",
    ):
        self._access_token = access_token
        self._api_base_url = api_base_url

    @property
    def provider_name(self) -> str:
        return "official_api"

    def is_available(self) -> bool:
        """Checks if official LinkedIn API credentials are provided."""
        token = self._access_token or settings.LINKEDIN_ACCESS_TOKEN
        return bool(token and token.strip())

    async def acquire_profile(
        self,
        url: str,
        username: str,
        access_token: Optional[str] = None,
        **kwargs: Any,
    ) -> ProfileAcquisitionResult:
        token = access_token or self._access_token or settings.LINKEDIN_ACCESS_TOKEN
        if not token:
            return ProfileAcquisitionResult(
                success=False,
                source=self.provider_name,
                limitations=["Official LinkedIn API access token is not configured."],
                actionable_message="Official LinkedIn API credentials are not configured.",
            )

        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self._api_base_url}/userinfo", headers=headers)
                if resp.status_code in (401, 403):
                    logger.warning("LinkedIn API token unauthorized or permissions insufficient: %d", resp.status_code)
                    return ProfileAcquisitionResult(
                        success=False,
                        source=self.provider_name,
                        limitations=[
                            "LinkedIn API token is invalid, expired, or lacks the necessary profile access permissions (openid, profile)."
                        ],
                        actionable_message="Official LinkedIn API authorization failed.",
                    )
                resp.raise_for_status()
                data = resp.json()

                name = (
                    data.get("name")
                    or f"{data.get('given_name', '')} {data.get('family_name', '')}".strip()
                    or username
                )
                headline = data.get("headline", "")
                email = data.get("email", "")

                content_lines = [
                    f"LinkedIn Profile URL: {url}",
                    f"Candidate Name: {name}",
                ]
                if headline:
                    content_lines.append(f"Professional Headline: {headline}")
                if email:
                    content_lines.append(f"Email: {email}")
                if "locale" in data:
                    content_lines.append(f"Locale: {data['locale']}")

                formatted_content = "\n".join(content_lines)

                return ProfileAcquisitionResult(
                    success=True,
                    content=formatted_content,
                    source=self.provider_name,
                    available_sections=["identity", "headline"] + (["contact_info"] if email else []),
                    unavailable_sections=["experience", "education", "skills", "projects", "certifications"],
                    limitations=[
                        "Official Basic Profile API retrieved verified identity and headline.",
                        "Deep work history, skills, and project details require Member Data Portability / Enterprise permissions.",
                    ],
                    raw_data=data,
                )
        except Exception as e:
            logger.warning("Error contacting official LinkedIn API: %s", type(e).__name__)
            return ProfileAcquisitionResult(
                success=False,
                source=self.provider_name,
                limitations=[f"Official LinkedIn API request failed: {type(e).__name__}"],
                actionable_message="Failed to contact official LinkedIn API.",
            )


class FallbackTextProvider(LinkedInProfileProvider):
    """Fallback provider that accepts and structures user-supplied profile text."""

    @property
    def provider_name(self) -> str:
        return "user_supplied_text"

    def is_available(self) -> bool:
        return True

    async def acquire_profile(
        self,
        url: str,
        username: str,
        profile_text: Optional[str] = None,
        **kwargs: Any,
    ) -> ProfileAcquisitionResult:
        if not profile_text or not profile_text.strip():
            return ProfileAcquisitionResult(
                success=False,
                source=self.provider_name,
                limitations=["No user-supplied profile text provided."],
                actionable_message="Please supply profile text.",
            )

        clean_text = profile_text.strip()
        lower_text = clean_text.lower()
        available: List[str] = []
        unavailable: List[str] = []

        section_indicators = {
            "headline": ["headline", "title", "seeking", "engineer", "developer", "architect", "lead"],
            "about": ["about", "summary", "overview", "bio", "profile"],
            "experience": ["experience", "work history", "employment", "roles", "worked at", "company", "positions"],
            "education": ["education", "university", "college", "degree", "bachelor", "master", "phd", "b.s.", "m.s."],
            "skills": ["skills", "technologies", "proficiencies", "competencies", "python", "pytorch", "react"],
            "projects": ["projects", "portfolio", "built", "developed", "github", "deployed"],
            "certifications": ["certifications", "certified", "license", "credentials", "aws", "gcp", "azure"],
        }

        for section, keywords in section_indicators.items():
            if any(k in lower_text for k in keywords):
                available.append(section)
            else:
                unavailable.append(section)

        formatted_content = (
            f"LinkedIn Profile URL: {url}\n"
            f"Profile Username / Identifier: {username}\n\n"
            f"User-Supplied Profile Content:\n{clean_text}"
        )

        return ProfileAcquisitionResult(
            success=True,
            content=formatted_content,
            source=self.provider_name,
            available_sections=available or ["provided_text"],
            unavailable_sections=unavailable,
            limitations=[
                "Analysis performed on user-supplied profile text in lieu of direct LinkedIn scraping."
            ],
        )


class LinkedInProfileAcquisitionService:
    """Orchestrates LinkedIn profile data retrieval across official APIs and fallbacks.
    
    Guarantees:
    - Never scrapes LinkedIn directly with cookies or unauthorized tools.
    - If direct access is unavailable, offers actionable guidance.
    - Never calls Gemini with empty data pretending the profile was analyzed.
    """

    def __init__(
        self,
        official_provider: Optional[LinkedInProfileProvider] = None,
        text_provider: Optional[LinkedInProfileProvider] = None,
    ):
        self.official_provider = official_provider or OfficialLinkedInApiProvider()
        self.text_provider = text_provider or FallbackTextProvider()

    async def acquire_profile(
        self,
        url: str,
        username: str,
        profile_text: Optional[str] = None,
        **kwargs: Any,
    ) -> ProfileAcquisitionResult:
        # 1. Official API provider (only if configured)
        if self.official_provider.is_available():
            logger.info("Attempting profile acquisition via OfficialLinkedInApiProvider for %s", username)
            try:
                result = await self.official_provider.acquire_profile(
                    url=url,
                    username=username,
                    **kwargs,
                )
                if result.success and result.content:
                    if profile_text and profile_text.strip():
                        result.content = f"{result.content}\n\nAdditional User Notes:\n{profile_text.strip()}"
                    return result
            except Exception as e:
                logger.warning("Official LinkedIn API acquisition error: %s", type(e).__name__)

        # 2. User-supplied fallback text
        if profile_text and profile_text.strip():
            logger.info("Acquiring profile content from user-supplied text for %s", username)
            return await self.text_provider.acquire_profile(
                url=url,
                username=username,
                profile_text=profile_text,
                **kwargs,
            )

        # 3. Neither source is available: return explicit unavailable result
        logger.info("No authorized profile data source available for %s", url)
        return ProfileAcquisitionResult(
            success=False,
            content=None,
            source="none",
            available_sections=[],
            unavailable_sections=[
                "identity", "headline", "about", "experience", "education",
                "skills", "projects", "certifications", "recommendations"
            ],
            limitations=[
                "Direct public scraping of LinkedIn profiles is disabled to comply with LinkedIn terms of service and access controls.",
                "Official LinkedIn API integration is not configured or lacks required member permissions.",
                "No profile text was supplied in the request.",
            ],
            actionable_message=(
                "LinkedIn profile content cannot be retrieved directly from the URL alone. "
                "Due to LinkedIn's strict access controls, direct public scraping is restricted without authorized API permissions. "
                "Please either provide your profile text using the 'profile_text' field or "
                "export your profile as a PDF from LinkedIn ('More' -> 'Save to PDF') and use the LinkedIn PDF Analyzer."
            ),
        )
