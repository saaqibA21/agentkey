from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_SECRETS = {"change-me-admin", "change-me-signing", "change-me-ingest", ""}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: Literal["development", "test", "production"] = "development"
    public_base_url: str = "http://localhost:8000"

    database_url: str = "sqlite+aiosqlite:///./agentidentity.db"
    redis_url: str = "memory://"
    auto_create_tables: bool = True

    admin_secret: str = "change-me-admin"
    signing_secret: str = "change-me-signing"
    ingest_secret: str = "change-me-ingest"

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
                for name in ("admin_secret", "signing_secret", "ingest_secret")
                if getattr(self, name) in _DEFAULT_SECRETS or len(getattr(self, name)) < 32
            ]
            if weak:
                raise ValueError(f"production requires strong values (>=32 chars) for: {', '.join(weak)}")
            if self.redis_url.startswith("memory://"):
                raise ValueError("production requires a real REDIS_URL")
            if self.mail_provider == "console":
                raise ValueError("production requires MAIL_PROVIDER=smtp or resend")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
