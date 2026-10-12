"""Deterministic extraction from inbound messages. No LLM calls: every result is a regex/heuristic match.

The goal is that an agent can read ``extracted_data`` (a few dozen tokens) instead of the full body.
"""
import html as html_lib
import re
from html.parser import HTMLParser

# --------------------------------------------------------------------------- OTP

_OTP_TOKEN = re.compile(r"\b(?!(?:19|20)\d{2}\b)(\d{4,8})\b")
_OTP_SPLIT = re.compile(
    r"(?:otp|code|pin|passcode|password)\b[^\d\n]{0,30}?\b(\d{3})[ -](\d{3})\b", re.IGNORECASE
)
_OTP_KEYWORDS = re.compile(
    r"otp|one[- ]time|verif|passcode|password|\bcode\b|\bpin\b|2fa|two[- ]factor|authenticat|log ?in|sign ?in",
    re.IGNORECASE,
)
_CURRENCY_BEFORE = re.compile(r"(?:₹|\$|€|£|\brs\.?|\binr|\busd|\beur|\bgbp)\s*$", re.IGNORECASE)
_CURRENCY_AFTER = re.compile(r"^\s*(?:/-|inr\b|usd\b|eur\b|rupees\b|dollars\b|%)", re.IGNORECASE)
_REFERENCE_BEFORE = re.compile(
    r"(?:order|invoice|receipt|ref(?:erence)?|ticket|txn|transaction|account|a/c|card|ending(?: in)?|"
    r"booking|tracking|case|policy|x{2,}|#)\s*(?:no\.?|number|id)?\s*[:#-]?\s*$",
    re.IGNORECASE,
)


def _otp_candidates(text: str) -> list[tuple[int, int, str]]:
    """Return (score, position, code) for every plausible numeric token."""
    out = []
    for m in _OTP_TOKEN.finditer(text):
        before = text[max(0, m.start() - 40):m.start()]
        after = text[m.end():m.end() + 12]
        if _CURRENCY_BEFORE.search(before) or _CURRENCY_AFTER.match(after):
            continue
        if re.search(r"[\d][.,/:\-]$|[+/]$|\d[ ]$", before) or re.match(r"[.,/:\-]\d| \d{3,}", after):
            continue  # decimals, dates, times, grouped phone/card numbers
        if _REFERENCE_BEFORE.search(before):
            continue
        score = 0
        if _OTP_KEYWORDS.search(text[max(0, m.start() - 80):m.start()]):
            score += 2
        if _OTP_KEYWORDS.search(text[m.end():m.end() + 40]):
            score += 1
        if len(m.group(1)) == 6:
            score += 1
        out.append((score, m.start(), m.group(1)))
    return out


def extract_otp(text: str) -> str | None:
    if not text:
        return None
    split = _OTP_SPLIT.search(text)
    if split:
        return split.group(1) + split.group(2)
    candidates = _otp_candidates(text)
    if not candidates:
        return None
    best = max(candidates, key=lambda c: (c[0], -c[1]))
    if best[0] >= 2:
        return best[2]
    # No keyword next to the number: only trust it when it is unambiguous.
    distinct = {c[2] for c in candidates}
    alone_on_line = re.search(rf"^\s*{best[2]}\s*$", text, re.MULTILINE)
    if len(distinct) == 1 and (_OTP_KEYWORDS.search(text) or alone_on_line):
        return best[2]
    return None


# --------------------------------------------------------------------------- magic links

_URL = re.compile(r"https?://[^\s<>\"'\]\[)(}{]+", re.IGNORECASE)
_MAGIC_PATH = re.compile(
    r"/(?:auth|verify|verification|login|signin|sign-in|confirm|confirmation|magic|magic-link|reset|"
    r"activate|activation)"
    r"(?:[-_](?:email|e-mail|account|password|link|token|user|signup|login|address|registration))?"
    r"(?:[/?#.]|$)",
    re.IGNORECASE,
)
_NOT_MAGIC = re.compile(r"unsubscribe|preferences|privacy|terms|/help|/support", re.IGNORECASE)


def extract_urls(html_or_text: str) -> list[str]:
    seen, urls = set(), []
    for raw in _URL.findall(html_lib.unescape(html_or_text or "")):
        url = raw.rstrip(".,;:!?")
        if url not in seen:
            seen.add(url)
            urls.append(url)
    return urls


def extract_magic_link(html_or_text: str) -> str | None:
    best: tuple[int, str] | None = None
    for url in extract_urls(html_or_text):
        path = url.split("://", 1)[1].partition("/")[2]
        if not _MAGIC_PATH.search("/" + path) or _NOT_MAGIC.search(url):
            continue
        score = 1 + bool(re.search(r"[?&](?:token|code|key|t|otp|ticket|signature|sig)=", url, re.IGNORECASE))
        if best is None or score > best[0]:
            best = (score, url)
    return best[1] if best else None


# --------------------------------------------------------------------------- HTML -> text

_QUOTE_CLASSES = ("gmail_quote", "gmail_extra", "yahoo_quoted", "moz-cite-prefix", "protonmail_quote")
_QUOTE_IDS = ("divRplyFwdMsg", "appendonsend", "mail-editor-reference-message-container")
_VOID_TAGS = {"br", "hr", "img", "input", "meta", "link", "area", "base", "col", "embed", "source", "wbr"}
_BLOCK_TAGS = {"p", "div", "br", "tr", "li", "h1", "h2", "h3", "h4", "h5", "h6", "table", "blockquote"}
_HIDDEN_STYLE = re.compile(
    r"display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0(?:px|pt|em)?\s*(?:;|$)|opacity\s*:\s*0\s*(?:;|$)",
    re.IGNORECASE,
)


class _TextExtractor(HTMLParser):
    def __init__(self, strip_quotes: bool):
        super().__init__(convert_charrefs=True)
        self.strip_quotes = strip_quotes
        self.parts: list[str] = []
        self.hidden_parts: list[str] = []
        self._stack: list[str] = []  # per open element: "" | "skip" | "hidden"
        self._stopped = False

    def _mode(self) -> str:
        for mode in reversed(self._stack):
            if mode:
                return mode
        return ""

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        mode = ""
        if tag in ("script", "style", "head", "title"):
            mode = "skip"
        elif self.strip_quotes and (
            tag == "blockquote"
            or any(c in a.get("class", "") for c in _QUOTE_CLASSES)
            or a.get("id", "") in _QUOTE_IDS
        ):
            mode = "skip"
        elif _HIDDEN_STYLE.search(a.get("style", "")) or "hidden" in a:
            mode = "hidden"
        if tag == "hr" and self.strip_quotes:
            self._stopped = True  # Outlook separates the quoted original with a rule
        if tag in _BLOCK_TAGS:
            self.parts.append("\n")
        if tag not in _VOID_TAGS:
            self._stack.append(mode)

    def handle_endtag(self, tag):
        if tag not in _VOID_TAGS and self._stack:
            self._stack.pop()
        if tag in _BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data):
        mode = self._mode()
        if mode == "hidden":
            self.hidden_parts.append(data)
        elif mode == "" and not self._stopped:
            self.parts.append(data)


def _collapse(text: str) -> str:
    text = re.sub(r"[ \t\xa0]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def html_to_text(html: str, strip_quotes: bool = False) -> str:
    parser = _TextExtractor(strip_quotes)
    parser.feed(html or "")
    return _collapse("".join(parser.parts))


def hidden_html_text(html: str) -> str:
    parser = _TextExtractor(False)
    parser.feed(html or "")
    return _collapse(" ".join(parser.hidden_parts))


# --------------------------------------------------------------------------- quotes & signatures

_QUOTE_START = re.compile(
    r"^(?:"
    r"On\s.{5,200}?\swrote:\s*$"                      # Gmail / Apple Mail
    r"|Am\s.{5,200}?\sschrieb.{0,80}:\s*$"            # German
    r"|Le\s.{5,200}?\sa écrit\s*:\s*$"                # French
    r"|-{2,}\s*Original Message\s*-{2,}\s*$"          # Outlook plain text
    r"|-{2,}\s*Forwarded message\s*-{2,}\s*$"
    r"|_{10,}\s*$"                                    # Outlook <hr> rendered as text
    r"|From:\s.+\n(?:.*\n){0,3}?(?:Sent|Date):\s.+$"  # Outlook header block
    r")",
    re.IGNORECASE | re.MULTILINE,
)
_WRAPPED_ON_WROTE = re.compile(r"^On\s[^\n]{5,120}\n[^\n]{0,120}wrote:\s*$", re.IGNORECASE | re.MULTILINE)
_SIGNATURE_START = re.compile(
    r"^(?:-- ?$|—\s*$|Sent from my \w+|Sent from Outlook|Get Outlook for \w+|Sent via .{1,40}$)",
    re.IGNORECASE | re.MULTILINE,
)


def strip_quotes_and_signatures(text: str) -> str:
    """Return only the newly written part of a reply."""
    if not text:
        return ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    cut = len(text)
    for pattern in (_QUOTE_START, _WRAPPED_ON_WROTE):
        m = pattern.search(text)
        if m:
            cut = min(cut, m.start())
    text = text[:cut]
    text = "\n".join(line for line in text.split("\n") if not line.lstrip().startswith(">"))
    m = _SIGNATURE_START.search(text)
    if m:
        text = text[:m.start()]
    return _collapse(text)


# --------------------------------------------------------------------------- PII masking

_CARD = re.compile(r"(?<![\d-])(?:\d[ -]?){12,18}\d(?![\d-])")
_AADHAAR = re.compile(r"(?<!\d)[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}(?!\d)")
_PAN = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
_PHONE = re.compile(r"(?<![\w.])(?:\+91[ -]?|91[ -]|0)?[6-9]\d{4}[ -]?\d{5}(?!\d)|(?<![\w.])\+\d{1,3}[ -]?\d{6,12}(?!\d)")


def _luhn_ok(digits: str) -> bool:
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 1:
            d = d * 2 - 9 if d > 4 else d * 2
        total += d
    return total % 10 == 0


def mask_pii(text: str) -> str:
    if not text:
        return text

    def _card(m: re.Match) -> str:
        digits = re.sub(r"\D", "", m.group(0))
        return "[CARD_REDACTED]" if 13 <= len(digits) <= 19 and _luhn_ok(digits) else m.group(0)

    text = _CARD.sub(_card, text)
    text = _AADHAAR.sub("[AADHAAR_REDACTED]", text)
    text = _PAN.sub("[PAN_REDACTED]", text)
    return _PHONE.sub("[PHONE_REDACTED]", text)


# --------------------------------------------------------------------------- prompt-injection signals

_INJECTION_PATTERNS = {
    "override_instructions": re.compile(
        r"(?:ignore|disregard|forget|override)\s+(?:all\s+|any\s+|the\s+|your\s+)*(?:previous|prior|above|earlier|system)"
        r"\s+(?:instructions?|prompts?|rules|context)",
        re.IGNORECASE,
    ),
    "role_reassignment": re.compile(
        r"you\s+are\s+now\s+|act\s+as\s+(?:an?\s+)?(?:system|admin|developer)|new\s+instructions?\s*:", re.IGNORECASE
    ),
    "chat_template_tokens": re.compile(
        r"<\|im_(?:start|end)\|>|<\|system\|>|\[/?INST\]|^#{2,}\s*(?:system|instruction)", re.I | re.M
    ),
    "system_prompt_probe": re.compile(
        r"(?:reveal|print|show|repeat)\s+(?:your\s+)?(?:system\s+prompt|instructions)", re.IGNORECASE
    ),
    "exfiltration_request": re.compile(
        r"(?:forward|send|email|post)\s+(?:all|every|the|this|your)\s+.{0,40}?(?:emails?|messages?|inbox|credentials|"
        r"api\s*keys?|passwords?|otp|codes?)\s+to\b",
        re.IGNORECASE,
    ),
    "concealment": re.compile(
        r"do\s+not\s+(?:tell|inform|mention|alert)\s+(?:the\s+)?(?:user|human|operator)", re.IGNORECASE
    ),
}
_ZERO_WIDTH = re.compile(r"[​‌‍⁠﻿]{3,}")


def detect_prompt_injection(text: str, html: str | None = None) -> list[str]:
    """Flag content that reads like instructions aimed at the receiving agent."""
    signals = [name for name, pattern in _INJECTION_PATTERNS.items() if pattern.search(text or "")]
    if _ZERO_WIDTH.search(text or ""):
        signals.append("zero_width_characters")
    if html:
        hidden = hidden_html_text(html)
        if len(hidden) > 20:
            signals.append("hidden_html_text")
            signals += [
                name for name, pattern in _INJECTION_PATTERNS.items()
                if name not in signals and pattern.search(hidden)
            ]
    return signals


# --------------------------------------------------------------------------- invoices

_MONEY = r"(?:₹|\$|€|£|Rs\.?|INR|USD|EUR|GBP)?\s*([\d,]+(?:\.\d{1,2})?)"
_INVOICE_HINT = re.compile(r"\b(?:invoice|receipt|bill(?:ing)?|amount due|payment due)\b", re.IGNORECASE)
_INVOICE_NUMBER = re.compile(
    r"\b(?:invoice|receipt|bill)\s*(?:no\.?|number|num|id|#)?\s*[:#]?\s*((?=[A-Z0-9\-/]*\d)[A-Z0-9][A-Z0-9\-/]{2,31})\b",
    re.IGNORECASE,
)
_INVOICE_TOTAL = re.compile(
    r"\b(grand\s+total|total\s+(?:due|amount|payable)|amount\s+(?:due|payable)|balance\s+due|total)\b\s*[:\-]?\s*"
    r"(₹|\$|€|£|Rs\.?|INR|USD|EUR|GBP)?\s*([\d,]+(?:\.\d{1,2})?)",
    re.IGNORECASE,
)
_INVOICE_DUE = re.compile(
    r"\b(?:due\s+(?:date|on|by)|payment\s+due)\s*[:\-]?\s*"
    r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+\w{3,9}\s+\d{4}|\w{3,9}\s+\d{1,2},?\s+\d{4})",
    re.I,
)
_LINE_ITEM = re.compile(
    rf"^[ \t|]*(?P<desc>[^\d\s|][^\n|]*?)[ \t|]+(?P<qty>\d+(?:\.\d+)?)[ \t|]*(?:x|×|@)?[ \t|]+{_MONEY}[ \t|]+{_MONEY}[ \t|]*$",
    re.MULTILINE | re.IGNORECASE,
)
_CURRENCY_CODES = {"₹": "INR", "rs": "INR", "rs.": "INR", "inr": "INR", "$": "USD", "usd": "USD",
                   "€": "EUR", "eur": "EUR", "£": "GBP", "gbp": "GBP"}


def _num(raw: str) -> float:
    return float(raw.replace(",", ""))


def extract_invoice(text: str) -> dict | None:
    if not text or not _INVOICE_HINT.search(text):
        return None
    result: dict = {}
    if m := _INVOICE_NUMBER.search(text):
        result["invoice_number"] = m.group(1)
    totals = list(_INVOICE_TOTAL.finditer(text))
    if totals:
        # Prefer the most specific label ("grand total" over a bare "total"); ties go to the last one.
        best = max(enumerate(totals), key=lambda t: (len(t[1].group(1)), t[0]))[1]
        result["total"] = _num(best.group(3))
        if best.group(2):
            result["currency"] = _CURRENCY_CODES.get(best.group(2).lower())
    if m := _INVOICE_DUE.search(text):
        result["due_date"] = m.group(1)
    items = []
    for m in _LINE_ITEM.finditer(text):
        qty, unit, amount = float(m.group("qty")), _num(m.group(3)), _num(m.group(4))
        # Arithmetic check keeps unrelated number-heavy lines out of the result.
        if abs(qty * unit - amount) <= max(0.01, amount * 0.005):
            items.append({"description": m.group("desc").strip(" -:\t"), "quantity": qty,
                          "unit_price": unit, "amount": amount})
    if items:
        result["line_items"] = items
    return result or None


# --------------------------------------------------------------------------- intent & orchestration

_AUTO_REPLY_SUBJECT = re.compile(r"^(?:auto(?:matic)?[- ]?reply|out of (?:the )?office|autoreply)", re.IGNORECASE)
_BOUNCE = re.compile(r"mailer-daemon|postmaster@|delivery status notification|undeliver", re.IGNORECASE)
_MEETING = re.compile(r"\b(?:invitation|calendar invite|meeting (?:request|invite)|reschedul\w+)\b|\.ics\b", re.I)


def is_auto_generated(headers: dict[str, str]) -> bool:
    """Loop guard: auto-responders and bulk mail must not wake an agent that might answer them."""
    h = {k.lower(): str(v).strip().lower() for k, v in headers.items()}
    if h.get("auto-submitted", "no") not in ("no", ""):
        return True
    if h.get("x-autorespond") or h.get("x-autoreply") or h.get("x-auto-response-suppress"):
        return True
    return h.get("precedence") in ("bulk", "junk", "auto_reply", "list")


def classify_intent(sender: str, subject: str, text: str, headers: dict[str, str], extracted: dict) -> str:
    h = {k.lower() for k in headers}
    if extracted.get("otp_code") or extracted.get("magic_link"):
        return "verification"
    if _BOUNCE.search(sender) or _BOUNCE.search(subject or ""):
        return "bounce"
    if _AUTO_REPLY_SUBJECT.search(subject or "") or extracted.get("auto_generated") and "in-reply-to" in h:
        return "auto_reply"
    if extracted.get("invoice"):
        return "invoice"
    if _MEETING.search(f"{subject}\n{text}"):
        return "meeting"
    if "list-unsubscribe" in h:
        return "newsletter"
    if "in-reply-to" in h or re.match(r"^\s*re:", subject or "", re.IGNORECASE):
        return "reply"
    return "general"


def summarize(text: str, limit: int = 240) -> str:
    flat = re.sub(r"\s+", " ", text or "").strip()
    return flat if len(flat) <= limit else flat[:limit].rsplit(" ", 1)[0] + "…"


def parse_message(
    *, sender: str, subject: str | None, text: str, html: str | None,
    headers: dict[str, str], mask: bool,
) -> tuple[dict, str, str | None]:
    """Run every extractor. Returns ``(extracted_data, body_text, body_html)`` ready to store.

    Extraction runs on the raw content; PII masking is applied last, to what gets persisted.
    """
    subject = subject or ""
    if not text and html:
        text = html_to_text(html)
    reply_text = strip_quotes_and_signatures(text)
    if html and not reply_text:
        reply_text = html_to_text(html, strip_quotes=True)

    extracted: dict = {}
    otp = extract_otp(f"{subject}\n{reply_text or text}")
    if otp:
        extracted["otp_code"] = otp
    link = extract_magic_link(html or "") or extract_magic_link(text)
    if link:
        extracted["magic_link"] = link
    if is_auto_generated(headers):
        extracted["auto_generated"] = True
    invoice = extract_invoice(f"{subject}\n{text}")
    if invoice:
        extracted["invoice"] = invoice
    signals = detect_prompt_injection(f"{subject}\n{text}", html)
    if signals:
        extracted["security"] = {"prompt_injection_suspected": True, "signals": signals}
    extracted["intent"] = classify_intent(sender, subject, text, headers, extracted)

    extracted["pii_masked"] = mask
    if mask:
        text, reply_text = mask_pii(text), mask_pii(reply_text)
        html = mask_pii(html) if html else html
    extracted["reply_text"] = reply_text
    extracted["summary"] = summarize(reply_text or text)
    return extracted, text, html
