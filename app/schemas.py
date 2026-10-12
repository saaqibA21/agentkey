import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.security import SCOPES

PHONE = r"^\+?[0-9][0-9 \-]{6,18}[0-9]$"
NO_NEWLINES = r"^[^\r\n]*$"


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- workspaces & keys ----------------------------------------------------

class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255, pattern=NO_NEWLINES)
    outbound_enabled: bool = False
    daily_send_limit: int = Field(default=50, ge=0, le=100_000)
    pii_masking_enabled: bool = True


class WorkspaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255, pattern=NO_NEWLINES)
    outbound_enabled: bool | None = None
    daily_send_limit: int | None = Field(default=None, ge=0, le=100_000)
    pii_masking_enabled: bool | None = None


class WorkspaceOut(ORM):
    id: uuid.UUID
    name: str
    pii_masking_enabled: bool
    outbound_enabled: bool
    daily_send_limit: int
    created_at: datetime


class WorkspaceCreated(WorkspaceOut):
    api_key: str = Field(description="Root API key. Shown once; only its hash is stored.")


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    scopes: list[Literal[SCOPES]] = Field(min_length=1)  # type: ignore[valid-type]


class ApiKeyOut(ORM):
    id: uuid.UUID
    name: str
    key_prefix: str
    scopes: list[str]
    created_at: datetime
    revoked_at: datetime | None


class ApiKeyCreated(ApiKeyOut):
    api_key: str


# ---- inboxes --------------------------------------------------------------

class InboxCreate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=64)
    client_id: str | None = Field(default=None, min_length=1, max_length=128)
    phone_number: str | None = Field(default=None, pattern=PHONE)

    @field_validator("username")
    @classmethod
    def _username(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip().lower()
        if not re.fullmatch(r"[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?", v) or ".." in v:
            raise ValueError("use lowercase letters, digits, '.', '_' or '-', starting and ending alphanumeric")
        return v


class InboxOut(ORM):
    id: uuid.UUID
    email_address: str
    phone_number: str | None
    client_id: str | None
    status: str
    created_at: datetime


# ---- messages -------------------------------------------------------------

class SendEmail(BaseModel):
    to: EmailStr
    subject: str = Field(min_length=1, max_length=512, pattern=NO_NEWLINES)
    text: str = Field(min_length=1, max_length=200_000)
    html: str | None = Field(default=None, max_length=500_000)
    in_reply_to: uuid.UUID | None = Field(
        default=None, description="Id of a message in this inbox to reply to (sets threading headers)."
    )


class ReplyEmail(BaseModel):
    text: str = Field(min_length=1, max_length=200_000)
    html: str | None = Field(default=None, max_length=500_000)


class SendWhatsApp(BaseModel):
    to_phone: str = Field(pattern=PHONE)
    message: str = Field(default="", max_length=4096)
    template: str | None = Field(default=None, max_length=128, description="Approved template name.")
    template_language: str = Field(default="en", max_length=16)
    template_params: list[str] = Field(default_factory=list, max_length=20)


class SendSMS(BaseModel):
    to_phone: str = Field(pattern=PHONE)
    template_id: str = Field(min_length=1, max_length=64, description="MSG91 flow id of the DLT template.")
    variables: dict[str, str] = Field(default_factory=dict)
    preview_text: str = Field(default="", max_length=1000, description="Rendered text, used for guardrails/audit.")


# ---- HITL -----------------------------------------------------------------

class HITLPolicyCreate(BaseModel):
    trigger_keywords: list[str] = Field(min_length=1, max_length=200)
    action: Literal["HOLD_FOR_APPROVAL", "NOTIFY_ONLY"] = "HOLD_FOR_APPROVAL"
    target_channel: Literal["SLACK", "WHATSAPP", "WEBHOOK"] = "SLACK"
    target_destination: str = Field(min_length=1, max_length=512)

    @field_validator("trigger_keywords")
    @classmethod
    def _triggers(cls, v: list[str]) -> list[str]:
        for trigger in v:
            if not trigger.strip() or len(trigger) > 200:
                raise ValueError("each trigger must be 1-200 characters")
            if trigger.startswith("re:"):
                try:
                    re.compile(trigger[3:])
                except re.error as exc:
                    raise ValueError(f"invalid regular expression {trigger!r}: {exc}") from None
        return v


class HITLPolicyOut(ORM):
    id: uuid.UUID
    trigger_keywords: list[str]
    action: str
    target_channel: str
    target_destination: str


# ---- webhooks -------------------------------------------------------------

EVENT_TYPES = (
    "*", "message.received", "otp.extracted", "magic_link.extracted", "message.sent",
    "message.pending_approval", "message.rejected", "message.failed",
)


class WebhookCreate(BaseModel):
    target_url: str = Field(min_length=1, max_length=512)
    event_types: list[Literal[EVENT_TYPES]] = Field(default_factory=lambda: ["*"], min_length=1)  # type: ignore[valid-type]


class WebhookUpdate(BaseModel):
    event_types: list[Literal[EVENT_TYPES]] | None = Field(default=None, min_length=1)  # type: ignore[valid-type]
    is_active: bool | None = None


class WebhookOut(ORM):
    id: uuid.UUID
    target_url: str
    event_types: list[str]
    is_active: bool


class WebhookCreated(WebhookOut):
    secret_token: str = Field(description="Signing secret. Shown once at creation.")


# ---- inbound --------------------------------------------------------------

class IngestPayload(BaseModel):
    """Either ``raw`` (base64 RFC 822 message, what the Cloudflare Worker sends) or the parsed fields."""

    raw: str | None = None
    envelope_from: str | None = None
    envelope_to: str | None = None
    sender: str | None = Field(default=None, alias="from")
    to: str | None = None
    subject: str = ""
    text: str = ""
    html: str | None = None
    headers: dict[str, str] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)


class InboundSMS(BaseModel):
    sender: str = Field(alias="from")
    to: str = ""
    text: str
    provider_id: str | None = None

    model_config = ConfigDict(populate_by_name=True)
