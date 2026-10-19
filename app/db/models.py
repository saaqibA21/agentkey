import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# JSONB on Postgres, plain JSON elsewhere so local dev and tests can run on SQLite.
JSONType = JSON().with_variant(JSONB(), "postgresql")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


def _pk() -> Mapped[uuid.UUID]:
    return mapped_column(Uuid, primary_key=True, default=uuid.uuid4)


def _created() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), default=utcnow)


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = _pk()
    name: Mapped[str] = mapped_column(String(255))
    # Hash of the root (all-scope) key. Scoped keys live in ``api_keys``.
    api_key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    pii_masking_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    outbound_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    daily_send_limit: Mapped[int] = mapped_column(Integer, default=50)
    plan: Mapped[str] = mapped_column(String(32), default="free")
    max_inboxes: Mapped[int] = mapped_column(Integer, default=100)
    inbound_daily_limit: Mapped[int] = mapped_column(Integer, default=5000)
    created_at: Mapped[datetime] = _created()


class User(Base):
    """A human who signs in to the dashboard. Agents authenticate with API keys instead."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    auth_provider: Mapped[str] = mapped_column(String(32))
    role: Mapped[str] = mapped_column(String(32), default="owner")
    created_at: Mapped[datetime] = _created()
    last_login_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Domain(Base):
    """A customer-owned sending/receiving domain, usable once its DNS records verify."""

    __tablename__ = "domains"

    id: Mapped[uuid.UUID] = _pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(16), default="PENDING")  # PENDING | VERIFIED
    verification_token: Mapped[str] = mapped_column(String(64))
    dkim_records: Mapped[list] = mapped_column(JSONType, default=list)
    checks: Mapped[dict] = mapped_column(JSONType, default=dict)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = _created()


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[uuid.UUID] = _pk()
    message_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(127))
    size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    storage_key: Mapped[str] = mapped_column(String(512))
    # Text pulled out of PDFs / text files so agents can read a document without downloading it.
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = _created()


class Connection(Base):
    """An external account (GitHub, Google...) the owner connected through OAuth. Tokens stay
    encrypted here; agents act through a proxy and never see them unless export is switched on."""

    __tablename__ = "connections"

    id: Mapped[uuid.UUID] = _pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(32))
    account: Mapped[str] = mapped_column(String(255))
    scopes: Mapped[str] = mapped_column(String(1024), default="")
    token_enc: Mapped[str] = mapped_column(Text)
    allow_writes: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_export: Mapped[bool] = mapped_column(Boolean, default=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = _created()


class VaultItem(Base):
    """A saved site login (username, password, optional TOTP secret), encrypted at rest."""

    __tablename__ = "vault_items"

    id: Mapped[uuid.UUID] = _pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    site_host: Mapped[str] = mapped_column(String(255))
    username: Mapped[str] = mapped_column(String(255))
    secret_enc: Mapped[str] = mapped_column(Text)
    has_totp: Mapped[bool] = mapped_column(Boolean, default=False)
    approval: Mapped[str] = mapped_column(String(8), default="ask")  # ask | auto
    owner_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    session_data: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = _created()


class AccessRequest(Base):
    """An agent asking to use a vault login that needs a person's go-ahead."""

    __tablename__ = "access_requests"

    id: Mapped[uuid.UUID] = _pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    vault_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vault_items.id", ondelete="CASCADE"), index=True)
    requested_by: Mapped[str] = mapped_column(String(128))
    url: Mapped[str] = mapped_column(String(1024))
    reason: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(String(16), default="PENDING")  # PENDING | APPROVED | DENIED | USED
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created()


class OAuthClient(Base):
    """An app (ChatGPT, Claude, an MCP client) that registered itself to request access."""

    __tablename__ = "oauth_clients"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    redirect_uris: Mapped[list] = mapped_column(JSONType, default=list)
    created_at: Mapped[datetime] = _created()


class OAuthCode(Base):
    __tablename__ = "oauth_codes"

    code_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    client_id: Mapped[str] = mapped_column(String(64))
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    workspace_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    redirect_uri: Mapped[str] = mapped_column(String(1024))
    code_challenge: Mapped[str] = mapped_column(String(128))
    scopes: Mapped[list] = mapped_column(JSONType, default=list)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class OAuthToken(Base):
    """Access granted by a person to an app. Only hashes of the tokens are stored."""

    __tablename__ = "oauth_tokens"

    id: Mapped[uuid.UUID] = _pk()
    access_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    refresh_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    client_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    workspace_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    scopes: Mapped[list] = mapped_column(JSONType, default=list)
    access_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    refresh_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = _created()


class ApiKey(Base):
    """Scoped credentials: a read-only key can be handed to an agent that must never send."""

    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = _pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    key_prefix: Mapped[str] = mapped_column(String(16))
    scopes: Mapped[list] = mapped_column(JSONType, default=list)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = _created()


class Inbox(Base):
    __tablename__ = "inboxes"
    # Idempotency keys are scoped per workspace so tenants cannot probe each other's client_ids.
    __table_args__ = (UniqueConstraint("workspace_id", "client_id", name="uq_inbox_workspace_client_id"),)

    id: Mapped[uuid.UUID] = _pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    email_address: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    client_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    owner_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="ACTIVE")
    created_at: Mapped[datetime] = _created()


class Agent(Base):
    """One agent created from the dashboard: its own address, its own API key, and the human who owns it."""

    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = _pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(64))
    owner_name: Mapped[str] = mapped_column(String(255))
    owner_email: Mapped[str] = mapped_column(String(255))
    inbox_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("inboxes.id", ondelete="CASCADE"), index=True)
    api_key_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("api_keys.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(16), default="ACTIVE")  # ACTIVE | DELETED
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    avatar_seed: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    created_at: Mapped[datetime] = _created()


class Thread(Base):
    __tablename__ = "threads"

    id: Mapped[uuid.UUID] = _pk()
    inbox_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("inboxes.id", ondelete="CASCADE"), index=True)
    subject: Mapped[str] = mapped_column(String(512), default="")
    participant_emails: Mapped[list] = mapped_column(JSONType, default=list)
    last_message_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    message_count: Mapped[int] = mapped_column(Integer, default=1)


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (Index("ix_messages_inbox_created", "inbox_id", "created_at"),)

    id: Mapped[uuid.UUID] = _pk()
    inbox_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("inboxes.id", ondelete="CASCADE"), index=True)
    thread_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("threads.id", ondelete="SET NULL"), nullable=True, index=True
    )
    channel: Mapped[str] = mapped_column(String(16), default="EMAIL")
    direction: Mapped[str] = mapped_column(String(16))
    sender: Mapped[str] = mapped_column(String(255))
    recipient: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str | None] = mapped_column(String(512), nullable=True)
    body_text: Mapped[str] = mapped_column(Text, default="")
    body_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    headers: Mapped[dict] = mapped_column(JSONType, default=dict)
    extracted_data: Mapped[dict] = mapped_column(JSONType, default=dict)
    # DELIVERED | PENDING_APPROVAL | SENDING | SENT | REJECTED | FAILED
    status: Mapped[str] = mapped_column(String(32))
    # RFC 5322 Message-ID (or provider id on other channels); used for threading and inbound dedupe.
    message_id_header: Mapped[str | None] = mapped_column(String(512), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class HITLPolicy(Base):
    __tablename__ = "hitl_policies"

    id: Mapped[uuid.UUID] = _pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    # Plain entries match as whole words/phrases; entries prefixed with "re:" are regular expressions.
    trigger_keywords: Mapped[list] = mapped_column(JSONType, default=list)
    action: Mapped[str] = mapped_column(String(32), default="HOLD_FOR_APPROVAL")
    target_channel: Mapped[str] = mapped_column(String(32), default="SLACK")
    target_destination: Mapped[str] = mapped_column(String(512))


class WebhookSubscription(Base):
    __tablename__ = "webhook_subscriptions"

    id: Mapped[uuid.UUID] = _pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    target_url: Mapped[str] = mapped_column(String(512))
    secret_token: Mapped[str] = mapped_column(String(128))
    event_types: Mapped[list] = mapped_column(JSONType, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class WebhookDelivery(Base):
    """Durable outbox row per (event, subscription); the dispatcher retries with backoff."""

    __tablename__ = "webhook_deliveries"
    __table_args__ = (Index("ix_webhook_deliveries_due", "status", "next_attempt_at"),)

    id: Mapped[uuid.UUID] = _pk()
    subscription_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("webhook_subscriptions.id", ondelete="CASCADE"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict] = mapped_column(JSONType)
    status: Mapped[str] = mapped_column(String(16), default="PENDING")  # PENDING | DELIVERED | FAILED
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_error: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = _created()


class AuditLog(Base):
    """Append-only security log (CERT-In directs 180-day retention of ICT system logs)."""

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = _pk()
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True, index=True)
    actor: Mapped[str] = mapped_column(String(128))
    action: Mapped[str] = mapped_column(String(64), index=True)
    target: Mapped[str | None] = mapped_column(String(255), nullable=True)
    detail: Mapped[dict] = mapped_column(JSONType, default=dict)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
