from datetime import datetime
from pydantic import BaseModel, ConfigDict


class StoredFileResponse(BaseModel):
    """Public metadata for a privately stored file. Never exposes physical keys or paths."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    original_filename: str
    mime_type: str
    file_size: int
    purpose: str
    created_at: datetime
