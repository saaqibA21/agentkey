"""Customer-owned domains: the DNS records to publish, and verification that they are live."""
import asyncio
import logging
import re
import secrets

import dns.asyncresolver
import dns.exception
import dns.resolver
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models import Domain, utcnow

logger = logging.getLogger("agentidentity.domains")

HOSTNAME = re.compile(r"^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")
VERIFY_LABEL = "_aigent"
VERIFY_PREFIX = "aigent-verify="
REQUIRED_CHECKS = ("ownership", "mx", "dkim")  # spf and dmarc are reported but advisory


async def resolve(name: str, rdtype: str) -> list[str]:
    """Lower-cased record values, or [] when the name has none / DNS fails."""
    try:
        answer = await dns.asyncresolver.resolve(name, rdtype, lifetime=5.0)
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers, dns.exception.Timeout):
        return []
    values = []
    for rdata in answer:
        if rdtype == "TXT":
            values.append(b"".join(rdata.strings).decode("utf-8", "replace"))
        elif rdtype == "MX":
            values.append(str(rdata.exchange).rstrip(".").lower())
        else:
            values.append(str(rdata.target).rstrip(".").lower())
    return values


# ---- provider: who signs (DKIM) and relays mail for the domain ------------------------------

def _ses():
    import boto3

    return boto3.client("sesv2", region_name=get_settings().aws_region)


async def provider_create(name: str) -> list[dict]:
    """Register the domain with the sending provider and return the DKIM records to publish."""
    if get_settings().domain_provider == "ses":
        client = _ses()

        def _create() -> list[str]:
            try:
                return client.create_email_identity(EmailIdentity=name)["DkimAttributes"]["Tokens"]
            except client.exceptions.AlreadyExistsException:
                return client.get_email_identity(EmailIdentity=name)["DkimAttributes"]["Tokens"]

        tokens = await asyncio.to_thread(_create)
        target = "dkim.amazonses.com"
    else:
        tokens = [secrets.token_hex(16) for _ in range(3)]
        target = "dkim.mock.invalid"
    return [{"type": "CNAME", "name": f"{t}._domainkey.{name}", "value": f"{t}.{target}"} for t in tokens]


async def provider_verified(name: str) -> bool:
    if get_settings().domain_provider != "ses":
        return True
    info = await asyncio.to_thread(_ses().get_email_identity, EmailIdentity=name)
    return bool(info.get("VerifiedForSendingStatus"))


async def provider_delete(name: str) -> None:
    if get_settings().domain_provider == "ses":
        try:
            await asyncio.to_thread(_ses().delete_email_identity, EmailIdentity=name)
        except Exception:
            logger.exception("failed to delete SES identity %s", name)


# ---- records & verification ---------------------------------------------------------------

def dns_records(domain: Domain) -> list[dict]:
    """Everything the customer must add at their DNS host, in the order to add it."""
    settings = get_settings()
    name = domain.name
    return [
        {"purpose": "ownership", "type": "TXT", "name": f"{VERIFY_LABEL}.{name}",
         "value": f"{VERIFY_PREFIX}{domain.verification_token}", "required": True},
        {"purpose": "mx", "type": "MX", "name": name, "value": settings.custom_domain_mx_host,
         "priority": 10, "required": True},
        *({"purpose": "dkim", "required": True, **r} for r in domain.dkim_records),
        {"purpose": "spf", "type": "TXT", "name": name,
         "value": f"v=spf1 include:{settings.spf_include} ~all", "required": False},
        {"purpose": "dmarc", "type": "TXT", "name": f"_dmarc.{name}",
         "value": f"v=DMARC1; p=quarantine; rua=mailto:dmarc@{name}", "required": False},
    ]


async def run_checks(domain: Domain) -> dict[str, bool]:
    settings = get_settings()
    name = domain.name
    if settings.domain_skip_dns_checks:
        return dict.fromkeys(("ownership", "mx", "dkim", "spf", "dmarc"), True)
    txt_verify, mx, txt_root, txt_dmarc, *dkim = await asyncio.gather(
        resolve(f"{VERIFY_LABEL}.{name}", "TXT"),
        resolve(name, "MX"),
        resolve(name, "TXT"),
        resolve(f"_dmarc.{name}", "TXT"),
        *(resolve(r["name"], "CNAME") for r in domain.dkim_records),
    )
    return {
        "ownership": f"{VERIFY_PREFIX}{domain.verification_token}" in [t.strip() for t in txt_verify],
        "mx": settings.custom_domain_mx_host.lower() in mx,
        "dkim": bool(dkim) and all(
            r["value"].lower() in found for r, found in zip(domain.dkim_records, dkim, strict=True)
        ),
        "spf": any(t.lower().startswith("v=spf1") and settings.spf_include in t for t in txt_root),
        "dmarc": any(t.lower().startswith("v=dmarc1") for t in txt_dmarc),
    }


async def verify(domain: Domain) -> Domain:
    checks = await run_checks(domain)
    passed = all(checks[c] for c in REQUIRED_CHECKS)
    if passed:
        checks["provider"] = await provider_verified(domain.name)
        passed = checks["provider"]
    domain.checks = checks
    if passed and domain.status != "VERIFIED":
        domain.status, domain.verified_at = "VERIFIED", utcnow()
    elif not passed and domain.status == "VERIFIED" and not checks["ownership"]:
        # Ownership proof is gone: stop trusting the domain (it may have changed hands).
        domain.status, domain.verified_at = "PENDING", None
    return domain


async def is_verified_for(session: AsyncSession, workspace_id, domain_name: str) -> bool:
    return bool(await session.scalar(
        select(Domain.id).where(
            Domain.workspace_id == workspace_id, Domain.name == domain_name.lower(), Domain.status == "VERIFIED"
        )
    ))
