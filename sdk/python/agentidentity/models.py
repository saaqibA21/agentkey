from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class _Model(BaseModel):
    model_config = ConfigDict(extra="allow")


class Inbox(_Model):
    id: str
    email_address: str
    phone_number: Optional[str] = None
    client_id: Optional[str] = None
    status: str
    created_at: datetime


class Message(_Model):
    id: str
    inbox_id: str
    thread_id: Optional[str] = None
    channel: str
    direction: str
    sender: str
    recipient: str
    subject: Optional[str] = None
    body_text: str = ""
    body_html: Optional[str] = None
    headers: Dict[str, Any] = Field(default_factory=dict)
    extracted_data: Dict[str, Any] = Field(default_factory=dict)
    status: str
    message_id: Optional[str] = None
    created_at: datetime

    @property
    def otp_code(self) -> Optional[str]:
        return self.extracted_data.get("otp_code")

    @property
    def magic_link(self) -> Optional[str]:
        return self.extracted_data.get("magic_link")

    @property
    def pending_approval(self) -> bool:
        """True when a human-in-the-loop guardrail is holding this outbound message."""
        return self.status == "PENDING_APPROVAL"

    @property
    def injection_suspected(self) -> bool:
        return bool(self.extracted_data.get("security", {}).get("prompt_injection_suspected"))


class Thread(_Model):
    id: str
    inbox_id: str
    subject: str = ""
    participant_emails: List[str] = Field(default_factory=list)
    message_count: int = 0
    last_message_at: Optional[datetime] = None
    messages: List[Message] = Field(default_factory=list)


class Webhook(_Model):
    id: str
    target_url: str
    event_types: List[str]
    is_active: bool
    secret_token: Optional[str] = None


class HITLPolicy(_Model):
    id: str
    trigger_keywords: List[str]
    action: str
    target_channel: str
    target_destination: str
