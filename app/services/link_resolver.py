"""Active Link & Magic-Link Resolver for Autonomous AI Agents.

Solves the 'text-only' limitation by automatically navigating authentication and
magic links, following redirects, capturing live session cookies and JWTs, and
extracting structured actionable page elements (buttons, links, tables) instead
of dumping thousands of lines of unparsed HTML text into the LLM context.
"""
import ipaddress
import json
import logging
import re
from html.parser import HTMLParser
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, urljoin, urlparse

import httpx

from app.core.exceptions import ProblemError

logger = logging.getLogger("agentidentity.link_resolver")

# SSRF Protection: Private / Link-local / Loopback IP subnets
_PRIVATE_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def validate_safe_url(url: str, allow_local_for_dev: bool = True) -> str:
    """Validate that the target URL uses http/https and is not an SSRF attempt against private IPs."""
    parsed = urlparse(url.strip())
    if parsed.scheme.lower() not in ("http", "https"):
        raise ProblemError(422, "Invalid URL scheme", "Only HTTP and HTTPS links can be resolved.")

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise ProblemError(422, "Invalid URL", "Target URL is missing a valid hostname.")

    if hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0") and not allow_local_for_dev:
        raise ProblemError(403, "Forbidden host", "Localhost URLs are not allowed.")

    try:
        ip = ipaddress.ip_address(hostname)
        if any(ip in net for net in _PRIVATE_NETWORKS) and not allow_local_for_dev:
            raise ProblemError(403, "Forbidden address", "Access to private IP ranges is prohibited.")
    except ValueError:
        pass  # It is a domain name, not a raw IP address

    return url.strip()


class _StructuredPageParser(HTMLParser):
    """Extracts interactive navigation elements and tabular data from HTML without LLM token waste."""

    def __init__(self, base_url: str):
        super().__init__()
        self.base_url = base_url
        self.title = ""
        self._in_title = False
        self.links: List[Dict[str, str]] = []
        self.buttons: List[Dict[str, str]] = []
        self.tables: List[Dict[str, Any]] = []

        # Parser state
        self._curr_link: Optional[Dict[str, str]] = None
        self._curr_btn: Optional[Dict[str, str]] = None
        self._curr_table: Optional[Dict[str, Any]] = None
        self._curr_row: Optional[List[str]] = None
        self._curr_cell: Optional[str] = None
        self._is_header_cell = False

    def handle_starttag(self, tag: str, attrs: list):
        attr_dict = {k.lower(): v for k, v in attrs}

        if tag == "title":
            self._in_title = True
        elif tag == "a" and "href" in attr_dict:
            href = attr_dict["href"]
            full_href = urljoin(self.base_url, href)
            self._curr_link = {"href": full_href, "raw_href": href, "text": "", "id": attr_dict.get("id", "")}
        elif tag == "button":
            self._curr_btn = {"text": "", "id": attr_dict.get("id", ""), "type": attr_dict.get("type", "button")}
        elif tag == "table":
            self._curr_table = {"headers": [], "rows": []}
        elif tag == "tr" and self._curr_table is not None:
            self._curr_row = []
        elif tag in ("th", "td") and self._curr_row is not None:
            self._curr_cell = ""
            self._is_header_cell = tag == "th"

    def handle_endtag(self, tag: str):
        if tag == "title":
            self._in_title = False
        elif tag == "a" and self._curr_link:
            self._curr_link["text"] = self._curr_link["text"].strip()
            if self._curr_link["text"] or self._curr_link["id"]:
                self.links.append(self._curr_link)
            self._curr_link = None
        elif tag == "button" and self._curr_btn:
            self._curr_btn["text"] = self._curr_btn["text"].strip()
            self.buttons.append(self._curr_btn)
            self._curr_btn = None
        elif tag in ("th", "td") and self._curr_row is not None and self._curr_cell is not None:
            text = self._curr_cell.strip()
            if self._is_header_cell and self._curr_table and not self._curr_table["headers"]:
                pass  # row will become headers
            self._curr_row.append(text)
            self._curr_cell = None
        elif tag == "tr" and self._curr_table is not None and self._curr_row is not None:
            if self._is_header_cell and not self._curr_table["headers"]:
                self._curr_table["headers"] = self._curr_row
            else:
                self._curr_table["rows"].append(self._curr_row)
            self._curr_row = None
        elif tag == "table" and self._curr_table:
            if self._curr_table["headers"] or self._curr_table["rows"]:
                self.tables.append(self._curr_table)
            self._curr_table = None

    def handle_data(self, data: str):
        if self._in_title:
            self.title += data.strip()
        if self._curr_link:
            self._curr_link["text"] += " " + data.strip()
        if self._curr_btn:
            self._curr_btn["text"] += " " + data.strip()
        if self._curr_cell is not None:
            self._curr_cell += " " + data.strip()


async def resolve_magic_link(
    url: str,
    *,
    owner_name: Optional[str] = None,
    agent_handle: Optional[str] = None,
    custom_headers: Optional[Dict[str, str]] = None,
    timeout_seconds: float = 15.0,
) -> Dict[str, Any]:
    """Execute navigation of a magic/auth link, capturing session state and structured data."""
    safe_url = validate_safe_url(url)
    user_agent_parts = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "AgentIdentity/1.0"]
    if owner_name or agent_handle:
        user_agent_parts.append(f"(Owner: {owner_name or 'Autonomous Agent'}; Bot: {agent_handle or 'default'})")
    user_agent = " ".join(user_agent_parts)

    headers = {
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    if owner_name:
        headers["X-On-Behalf-Of"] = owner_name
    if custom_headers:
        headers.update(custom_headers)

    captured_cookies: List[Dict[str, Any]] = []
    tokens: Dict[str, str] = {}

    # Extract tokens from the initial URL if present (e.g. ?token=..., ?magic_link=...)
    parsed_initial = urlparse(safe_url)
    init_query = parse_qs(parsed_initial.query)
    for key in ("token", "code", "magic_token", "auth_token", "key", "sec"):
        if key in init_query and init_query[key]:
            tokens[key] = init_query[key][0]

    extracted_tables: List[Dict[str, Any]] = []
    extracted_links: List[Dict[str, str]] = []
    extracted_buttons: List[Dict[str, str]] = []
    page_title = ""
    status_code = 200
    final_url = safe_url

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=timeout_seconds,
            headers=headers,
        ) as client:
            response = await client.get(safe_url)
            final_url = str(response.url)
            status_code = response.status_code

            # Harvest cookies from response and jar
            for name, value in client.cookies.items():
                cookie_domain = urlparse(final_url).hostname or ""
                captured_cookies.append({
                    "name": name,
                    "value": value,
                    "domain": cookie_domain,
                    "path": "/",
                    "secure": final_url.startswith("https"),
                    "httpOnly": False,
                })
                if any(t in name.lower() for t in ("token", "session", "auth", "jwt", "sid")):
                    tokens[name] = value

            # Check final URL query parameters for tokens
            final_query = parse_qs(urlparse(final_url).query)
            for key in ("token", "code", "access_token", "jwt", "session_id", "patient_token"):
                if key in final_query and final_query[key]:
                    tokens[key] = final_query[key][0]

            # Extract structured content from the final page
            content_type = response.headers.get("content-type", "")
            if "text/html" in content_type:
                parser = _StructuredPageParser(final_url)
                try:
                    parser.feed(response.text)
                    page_title = parser.title
                    extracted_tables = parser.tables[:10]  # cap to top 10 tables
                    extracted_links = parser.links[:50]    # cap to top 50 links
                    extracted_buttons = parser.buttons[:30]
                except Exception as e:
                    logger.warning("HTML structured parsing error: %s", e)
            elif "application/json" in content_type:
                try:
                    json_data = response.json()
                    if isinstance(json_data, dict):
                        for k, v in json_data.items():
                            if isinstance(v, str) and any(t in k.lower() for t in ("token", "auth", "session")):
                                tokens[k] = v
                except Exception:
                    pass
    except httpx.HTTPError as exc:
        logger.warning("HTTP navigation failed for %s: %s", safe_url, exc)
        status_code = 0
        final_url = safe_url

    is_authenticated = bool(tokens or captured_cookies or "login" not in final_url.lower())

    return {
        "status_code": status_code,
        "initial_url": safe_url,
        "final_url": final_url,
        "is_authenticated": is_authenticated,
        "tokens": tokens,
        "cookies": captured_cookies,
        "browser_state": {
            "cookies": captured_cookies,
            "origins": [{"origin": f"{parsed_initial.scheme}://{parsed_initial.netloc}", "localStorage": []}],
        },
        "page_metadata": {
            "title": page_title,
            "links_count": len(extracted_links),
            "buttons_count": len(extracted_buttons),
            "tables_count": len(extracted_tables),
            "sample_links": extracted_links[:10],
            "sample_buttons": extracted_buttons[:5],
            "tables": extracted_tables,
        },
    }
