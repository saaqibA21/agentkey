"""Procedural SVG Avatar Generation and Uniqueness Service for BAGENTS.

Generates guaranteed-unique, high-tech vector robot avatars and handles avatar URL resolution.
"""
import hashlib
import re
import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Agent


PALETTES = [
    {"accent": "#8BE8E3", "glow": "rgba(139, 232, 227, 0.4)", "name": "Cyan"},
    {"accent": "#B5F0D1", "glow": "rgba(181, 240, 209, 0.4)", "name": "Mint"},
    {"accent": "#B6B8FF", "glow": "rgba(182, 184, 255, 0.4)", "name": "Lavender"},
    {"accent": "#6EE7B7", "glow": "rgba(110, 231, 183, 0.4)", "name": "Emerald"},
    {"accent": "#FDE047", "glow": "rgba(253, 224, 71, 0.4)", "name": "Amber"},
    {"accent": "#A78BFA", "glow": "rgba(167, 139, 250, 0.4)", "name": "Violet"},
    {"accent": "#38BDF8", "glow": "rgba(56, 189, 248, 0.4)", "name": "Sky"},
]

ANTENNA_STYLES = ["beacon", "dual", "radar", "orbital", "crest"]
EYE_STYLES = ["visor_scan", "twin_circles", "slits", "matrix", "focus"]


def generate_avatar_seed(name: str) -> str:
    """Generate a clean, unique seed string for an agent."""
    clean = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:20] or "bot"
    return f"{clean}-{secrets.token_hex(4)}"


def default_avatar_url(seed: str) -> str:
    """Standard vector avatar URL using open-source Bottts Neutral style."""
    return f"https://api.dicebear.com/9.x/bottts-neutral/svg?seed={seed}"


async def is_avatar_seed_available(session: AsyncSession, seed: str, exclude_agent_id: uuid.UUID | None = None) -> bool:
    """Check if the chosen avatar seed is already claimed by another active agent."""
    query = select(Agent.id).where(Agent.avatar_seed == seed, Agent.status == "ACTIVE")
    if exclude_agent_id:
        query = query.where(Agent.id != exclude_agent_id)
    existing = await session.scalar(query)
    return existing is None


def generate_robot_avatar_svg(seed: str) -> str:
    """Generate a standalone, deterministic, ultra-crisp SVG robot avatar based on seed."""
    h = int(hashlib.sha256(seed.encode()).hexdigest(), 16)
    palette = PALETTES[h % len(PALETTES)]
    antenna = ANTENNA_STYLES[(h >> 4) % len(ANTENNA_STYLES)]
    eye = EYE_STYLES[(h >> 8) % len(EYE_STYLES)]

    accent = palette["accent"]
    glow = palette["glow"]

    # Antenna SVG elements
    antenna_svg = ""
    if antenna == "beacon":
        antenna_svg = f"""
        <line x1="60" y1="36" x2="60" y2="20" stroke="{accent}" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="60" cy="17" r="4.5" fill="{accent}" filter="url(#glow)"/>
        """
    elif antenna == "dual":
        antenna_svg = f"""
        <line x1="48" y1="38" x2="40" y2="22" stroke="{accent}" stroke-width="2" stroke-linecap="round"/>
        <circle cx="39" cy="20" r="3" fill="{accent}"/>
        <line x1="72" y1="38" x2="80" y2="22" stroke="{accent}" stroke-width="2" stroke-linecap="round"/>
        <circle cx="81" cy="20" r="3" fill="{accent}"/>
        """
    elif antenna == "radar":
        antenna_svg = f"""
        <line x1="60" y1="36" x2="60" y2="24" stroke="{accent}" stroke-width="2"/>
        <path d="M52 24 A8 8 0 0 1 68 24" fill="none" stroke="{accent}" stroke-width="2"/>
        <path d="M46 20 A14 14 0 0 1 74 20" fill="none" stroke="{accent}" stroke-width="1.5" stroke-dasharray="2 2"/>
        """
    elif antenna == "orbital":
        antenna_svg = f"""
        <ellipse cx="60" cy="28" rx="24" ry="7" fill="none" stroke="{accent}" stroke-width="1.5" stroke-dasharray="4 2"/>
        <circle cx="84" cy="28" r="2.5" fill="{accent}"/>
        """
    else:  # crest
        antenna_svg = f"""
        <polygon points="60,18 66,35 54,35" fill="{accent}" opacity="0.9"/>
        """

    # Eyes / Visor SVG elements
    eyes_svg = ""
    if eye == "visor_scan":
        eyes_svg = f"""
        <rect x="42" y="55" width="36" height="8" rx="4" fill="{accent}" opacity="0.9" filter="url(#glow)"/>
        <line x1="44" y1="59" x2="76" y2="59" stroke="#ffffff" stroke-width="1.5" opacity="0.75"/>
        """
    elif eye == "twin_circles":
        eyes_svg = f"""
        <circle cx="49" cy="58" r="5" fill="{accent}" filter="url(#glow)"/>
        <circle cx="71" cy="58" r="5" fill="{accent}" filter="url(#glow)"/>
        <circle cx="50" cy="57" r="1.5" fill="#ffffff"/>
        <circle cx="72" cy="57" r="1.5" fill="#ffffff"/>
        """
    elif eye == "slits":
        eyes_svg = f"""
        <line x1="44" y1="58" x2="55" y2="58" stroke="{accent}" stroke-width="3" stroke-linecap="round" filter="url(#glow)"/>
        <line x1="65" y1="58" x2="76" y2="58" stroke="{accent}" stroke-width="3" stroke-linecap="round" filter="url(#glow)"/>
        """
    elif eye == "matrix":
        eyes_svg = f"""
        <circle cx="46" cy="58" r="2" fill="{accent}"/>
        <circle cx="52" cy="58" r="2" fill="{accent}"/>
        <circle cx="68" cy="58" r="2" fill="{accent}"/>
        <circle cx="74" cy="58" r="2" fill="{accent}"/>
        """
    else:  # focus
        eyes_svg = f"""
        <circle cx="49" cy="58" r="6" fill="none" stroke="{accent}" stroke-width="1.5"/>
        <circle cx="49" cy="58" r="2.5" fill="{accent}"/>
        <circle cx="71" cy="58" r="6" fill="none" stroke="{accent}" stroke-width="1.5"/>
        <circle cx="71" cy="58" r="2.5" fill="{accent}"/>
        """

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#080D12"/>
      <stop offset="100%" stop-color="#121A22"/>
    </linearGradient>
    <linearGradient id="headGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#222B35"/>
      <stop offset="100%" stop-color="#161E27"/>
    </linearGradient>
  </defs>

  <!-- Circular Base Badge -->
  <circle cx="60" cy="60" r="56" fill="url(#bg)" stroke="#1F2937" stroke-width="2"/>
  <circle cx="60" cy="60" r="52" fill="none" stroke="{accent}" stroke-width="1" opacity="0.25"/>

  <!-- Antenna Structure -->
  {antenna_svg}

  <!-- Head Chassis -->
  <rect x="34" y="36" width="52" height="46" rx="14" fill="url(#headGrad)" stroke="#374151" stroke-width="1.5"/>

  <!-- Visor Screen -->
  <rect x="39" y="47" width="42" height="23" rx="7" fill="#0A0F14" stroke="#1F2937" stroke-width="1"/>

  <!-- Eyes / Sensors -->
  {eyes_svg}

  <!-- Chest Collar & Core Indicator -->
  <path d="M42 85 C42 82, 78 82, 78 85 L73 98 C73 100, 47 100, 47 98 Z" fill="#18202A" stroke="#2D3748" stroke-width="1"/>
  <circle cx="60" cy="91" r="2.5" fill="{accent}" opacity="0.85"/>
</svg>"""
    return svg.strip()
