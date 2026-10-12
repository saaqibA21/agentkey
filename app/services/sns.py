"""Amazon SNS message authentication (used by SES inbound for customer domains)."""
import base64
import re
from urllib.parse import urlsplit

import httpx
from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding

_AWS_SNS_HOST = re.compile(r"^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$")
_NOTIFICATION_FIELDS = ("Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type")
_SUBSCRIPTION_FIELDS = ("Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type")
_cert_cache: dict[str, x509.Certificate] = {}


def is_aws_sns_url(url: str) -> bool:
    parts = urlsplit(url)
    return parts.scheme == "https" and bool(_AWS_SNS_HOST.match(parts.hostname or ""))


def canonical_string(message: dict) -> bytes:
    fields = _NOTIFICATION_FIELDS if message.get("Type") == "Notification" else _SUBSCRIPTION_FIELDS
    return "".join(f"{f}\n{message[f]}\n" for f in fields if f in message).encode()


async def _certificate(url: str) -> x509.Certificate:
    if url not in _cert_cache:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        _cert_cache[url] = x509.load_pem_x509_certificate(resp.content)
    return _cert_cache[url]


async def verify(message: dict) -> bool:
    """True only when the message was signed by a certificate served from an AWS SNS host."""
    cert_url = message.get("SigningCertURL", "")
    if not is_aws_sns_url(cert_url) or not urlsplit(cert_url).path.endswith(".pem"):
        return False
    algorithm = hashes.SHA256() if message.get("SignatureVersion") == "2" else hashes.SHA1()  # noqa: S303
    try:
        cert = await _certificate(cert_url)
        cert.public_key().verify(
            base64.b64decode(message.get("Signature", "")), canonical_string(message),
            padding.PKCS1v15(), algorithm,
        )
    except (InvalidSignature, ValueError, httpx.HTTPError):
        return False
    return True
