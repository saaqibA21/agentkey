from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_SECRETS = {"change-me-admin", "change-me-signing", "change-me-ingest", "change-me-dashboard", ""}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: Literal["development", "test", "production"] = "development"
    platform_name: str = "AIgent"
    public_base_url: str = "http://localhost:8000"
    dashboard_url: str = "http://localhost:3000"

    database_url: str = "sqlite+aiosqlite:///./agentidentity.db"
    redis_url: str = "memory://"
    auto_create_tables: bool = True

    admin_secret: str = "change-me-admin"
    signing_secret: str = "change-me-signing"
    ingest_secret: str = "change-me-ingest"
    # Shared only with the dashboard's server side; exchanges a verified login for a session token.
    dashboard_secret: str = "change-me-dashboard"
    session_ttl_seconds: int = 3600

    mail_domain: str = "agents.example.com"
    shared_domains: str = "agents.example.com"
    mail_provider: Literal["console", "smtp", "resend"] = "console"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    resend_api_key: str = ""

    whatsapp_phone_number_id: str = ""
    whatsapp_access_token: str = ""
    whatsapp_app_secret: str = ""
    whatsapp_verify_token: str = ""

    msg91_auth_key: str = ""
    msg91_sender_id: str = ""
    dlt_entity_id: str = ""

    # Self-serve (free beta) defaults applied to workspaces created through dashboard signup.
    free_max_inboxes: int = 5
    free_inbound_daily_limit: int = 500
    free_daily_send_limit: int = 100

    # Attachments: "local" (dev) or "s3" (AWS S3 / Cloudflare R2 via S3_ENDPOINT_URL).
    storage_backend: Literal["local", "s3"] = "local"
    storage_local_path: str = "./storage"
    s3_bucket: str = ""
    s3_endpoint_url: str = ""
    max_attachment_bytes: int = 10 * 1024 * 1024
    max_outbound_attachment_bytes: int = 7 * 1024 * 1024

    # Custom domains. "mock" issues placeholder DKIM records for local development.
    domain_provider: Literal["mock", "ses"] = "mock"
    aws_region: str = "us-east-1"
    custom_domain_mx_host: str = "inbound-smtp.us-east-1.amazonaws.com"
    spf_include: str = "amazonses.com"
    # SNS topic that SES publishes received mail to; notifications from any other topic are refused.
    ses_inbound_topic_arn: str = ""
    # Local demos only: treat every DNS check as passed. Refused in production.
    domain_skip_dns_checks: bool = False

    rate_limit_capacity: int = 60
    rate_limit_refill_per_second: float = 10.0
    webhook_max_attempts: int = 8
    webhook_timeout_seconds: float = 10.0
    hitl_token_ttl_seconds: int = 86400
    ingest_signature_tolerance_seconds: int = 300
    max_inbound_bytes: int = 10 * 1024 * 1024
    # Only for local development against localhost webhook receivers.
    allow_private_webhook_targets: bool = False

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    @property
    def async_database_url(self) -> str:
        url = self.database_url
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+asyncpg://" + url[len(prefix):]
        return url

    @property
    def shared_domain_set(self) -> set[str]:
        return {d.strip().lower() for d in self.shared_domains.split(",") if d.strip()}

    @model_validator(mode="after")
    def _refuse_default_secrets_in_production(self) -> "Settings":
        if self.env == "production":
            weak = [
                name
                for name in ("admin_secret", "signing_secret", "ingest_secret", "dashboard_secret")
                if getattr(self, name) in _DEFAULT_SECRETS or len(getattr(self, name)) < 32
            ]
            if weak:
                raise ValueError(f"production requires strong values (>=32 chars) for: {', '.join(weak)}")
            if self.redis_url.startswith("memory://"):
                raise ValueError("production requires a real REDIS_URL")
            if self.mail_provider == "console":
                raise ValueError("production requires MAIL_PROVIDER=smtp or resend")
            if self.domain_skip_dns_checks:
                raise ValueError("DOMAIN_SKIP_DNS_CHECKS must be off in production")
            if self.storage_backend == "local":
                raise ValueError("production requires STORAGE_BACKEND=s3 (local disk is not durable)")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
