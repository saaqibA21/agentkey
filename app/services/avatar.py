"""Human Procedural SVG Avatar Generation and Uniqueness Service for BAGENTS.

Generates guaranteed-unique, human-like vector avatars and handles avatar URL resolution.
"""
import hashlib
import re
import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Agent


SKIN_TONES = [
    {"skin": "#F6D0B1", "shadow": "#E2B895", "name": "Peach"},
    {"skin": "#ECC5A8", "shadow": "#D9AA89", "name": "Warm Sand"},
    {"skin": "#D89E78", "shadow": "#C1835C", "name": "Golden Honey"},
    {"skin": "#BF7C4E", "shadow": "#A66336", "name": "Warm Almond"},
    {"skin": "#93592E", "shadow": "#78431C", "name": "Chestnut"},
    {"skin": "#613D1E", "shadow": "#4A2D13", "name": "Deep Espresso"},
]

HAIR_COLORS = [
    "#18181B",  # Jet Black
    "#3E2723",  # Deep Brunette
    "#5D4037",  # Warm Chestnut
    "#C49756",  # Honey Blonde
    "#8D3E25",  # Auburn
    "#64748B",  # Slate Silver
    "#4B5563",  # Charcoal Gray
]

CLOTHING_COLORS = [
    "#1E293B",  # Slate Hoodie
    "#0F766E",  # Teal Jacket
    "#4338CA",  # Indigo Blazer
    "#065F46",  # Emerald Crewneck
    "#374151",  # Charcoal Shirt
    "#7C3AED",  # Violet Sweater
]

HAIR_STYLES = ["short_crop", "wavy_sidepart", "high_bun", "textured_fade", "shoulder_bob", "curly_top"]
EYE_EXPRESSIONS = ["friendly", "focus", "relaxed", "smiling"]


def generate_avatar_seed(name: str) -> str:
    """Generate a clean, unique seed string for a human agent persona."""
    clean = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:20] or "agent"
    return f"{clean}-{secrets.token_hex(4)}"


def default_avatar_url(seed: str, style: str = "adventurer") -> str:
    """Standard vector human avatar URL using open-source Adventurer or Personas style."""
    return f"https://api.dicebear.com/9.x/{style}/svg?seed={seed}"


async def is_avatar_seed_available(session: AsyncSession, seed: str, exclude_agent_id: uuid.UUID | None = None) -> bool:
    """Check if the chosen avatar seed is already claimed by another active agent."""
    query = select(Agent.id).where(Agent.avatar_seed == seed, Agent.status == "ACTIVE")
    if exclude_agent_id:
        query = query.where(Agent.id != exclude_agent_id)
    existing = await session.scalar(query)
    return existing is None


def generate_human_avatar_svg(seed: str) -> str:
    """Generate a standalone, deterministic, ultra-clean vector SVG human portrait."""
    h = int(hashlib.sha256(seed.encode()).hexdigest(), 16)
    skin_data = SKIN_TONES[h % len(SKIN_TONES)]
    skin = skin_data["skin"]
    skin_shadow = skin_data["shadow"]

    hair_color = HAIR_COLORS[(h >> 4) % len(HAIR_COLORS)]
    clothes_color = CLOTHING_COLORS[(h >> 8) % len(CLOTHING_COLORS)]
    hair_style = HAIR_STYLES[(h >> 12) % len(HAIR_STYLES)]
    eye_expr = EYE_EXPRESSIONS[(h >> 16) % len(EYE_EXPRESSIONS)]

    # Hair silhouette SVG
    hair_svg = ""
    if hair_style == "short_crop":
        hair_svg = f"""
        <!-- Hair Short Crop -->
        <path d="M38 50 C36 34, 46 22, 60 22 C74 22, 84 34, 82 50 C80 43, 75 36, 68 36 C61 36, 56 39, 50 39 C44 39, 40 43, 38 50 Z" fill="{hair_color}"/>
        """
    elif hair_style == "wavy_sidepart":
        hair_svg = f"""
        <!-- Hair Wavy Sidepart -->
        <path d="M37 54 C35 32, 45 20, 60 20 C76 20, 85 30, 83 54 C78 40, 72 32, 63 32 C54 32, 46 36, 40 46 Z" fill="{hair_color}"/>
        <path d="M37 42 C34 46, 34 52, 36 56 C38 48, 42 45, 46 44 Z" fill="{hair_color}"/>
        """
    elif hair_style == "high_bun":
        hair_svg = f"""
        <!-- High Bun -->
        <circle cx="60" cy="19" r="10" fill="{hair_color}"/>
        <path d="M38 52 C36 36, 46 25, 60 25 C74 25, 84 36, 82 52 C78 42, 73 37, 60 37 C47 37, 42 42, 38 52 Z" fill="{hair_color}"/>
        """
    elif hair_style == "textured_fade":
        hair_svg = f"""
        <!-- Textured Fade -->
        <path d="M40 52 C39 34, 48 24, 60 24 C72 24, 81 34, 80 52 C76 39, 70 34, 60 34 C50 34, 44 39, 40 52 Z" fill="{hair_color}"/>
        """
    elif hair_style == "shoulder_bob":
        hair_svg = f"""
        <!-- Shoulder Bob -->
        <path d="M36 68 C34 48, 36 30, 48 22 C58 18, 66 18, 74 24 C84 31, 86 48, 84 68 C81 54, 80 44, 76 38 C70 34, 62 34, 52 38 C44 42, 40 52, 36 68 Z" fill="{hair_color}"/>
        """
    else:  # curly_top
        hair_svg = f"""
        <!-- Curly Top -->
        <circle cx="50" cy="25" r="7" fill="{hair_color}"/>
        <circle cx="60" cy="23" r="8" fill="{hair_color}"/>
        <circle cx="70" cy="25" r="7" fill="{hair_color}"/>
        <circle cx="43" cy="32" r="6" fill="{hair_color}"/>
        <circle cx="77" cy="32" r="6" fill="{hair_color}"/>
        <path d="M39 50 C38 38, 46 30, 60 30 C74 30, 82 38, 81 50 C76 41, 70 37, 60 37 C50 37, 44 41, 39 50 Z" fill="{hair_color}"/>
        """

    # Eye expression SVG
    eyes_svg = ""
    if eye_expr == "friendly":
        eyes_svg = f"""
        <!-- Friendly Eyes -->
        <ellipse cx="51" cy="54" rx="2.5" ry="3.5" fill="#18181B"/>
        <circle cx="52" cy="53" r="1" fill="#FFFFFF"/>
        <ellipse cx="69" cy="54" rx="2.5" ry="3.5" fill="#18181B"/>
        <circle cx="70" cy="53" r="1" fill="#FFFFFF"/>
        <path d="M47 48 Q51 46 55 48" stroke="#18181B" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        <path d="M65 48 Q69 46 73 48" stroke="#18181B" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        """
    elif eye_expr == "smiling":
        eyes_svg = f"""
        <!-- Smiling Eyes -->
        <path d="M48 55 Q51 51 54 55" stroke="#18181B" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path d="M66 55 Q69 51 72 55" stroke="#18181B" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path d="M47 48 Q51 46 55 48" stroke="#18181B" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        <path d="M65 48 Q69 46 73 48" stroke="#18181B" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        """
    elif eye_expr == "focus":
        eyes_svg = f"""
        <!-- Focused Eyes -->
        <circle cx="51" cy="54" r="2.5" fill="#18181B"/>
        <circle cx="69" cy="54" r="2.5" fill="#18181B"/>
        <line x1="47" y1="48" x2="55" y2="49" stroke="#18181B" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="73" y1="48" x2="65" y2="49" stroke="#18181B" stroke-width="1.8" stroke-linecap="round"/>
        """
    else:  # relaxed
        eyes_svg = f"""
        <!-- Relaxed Eyes -->
        <ellipse cx="51" cy="54" rx="2.2" ry="3" fill="#18181B"/>
        <ellipse cx="69" cy="54" rx="2.2" ry="3" fill="#18181B"/>
        <path d="M47 49 Q51 47 55 49" stroke="#18181B" stroke-width="1.4" stroke-linecap="round" fill="none"/>
        <path d="M65 49 Q69 47 73 49" stroke="#18181B" stroke-width="1.4" stroke-linecap="round" fill="none"/>
        """

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0E151D"/>
      <stop offset="100%" stop-color="#16222F"/>
    </linearGradient>
    <clipPath id="circleClip">
      <circle cx="60" cy="60" r="54"/>
    </clipPath>
  </defs>

  <!-- Background Circle Badge -->
  <circle cx="60" cy="60" r="56" fill="url(#bgGrad)" stroke="#223142" stroke-width="2"/>
  <circle cx="60" cy="60" r="54" fill="none" stroke="#8BE8E3" stroke-width="1" opacity="0.3"/>

  <!-- Character Group Clipped to Circle -->
  <g clip-path="url(#circleClip)">
    <!-- Clothing / Shoulders -->
    <path d="M26 116 C28 92, 42 84, 60 84 C78 84, 92 92, 94 116 Z" fill="{clothes_color}"/>
    <path d="M52 84 L60 96 L68 84 Z" fill="{skin_shadow}" opacity="0.6"/>

    <!-- Neck -->
    <rect x="54" y="68" width="12" height="18" fill="{skin_shadow}"/>
    <rect x="55" y="70" width="10" height="14" fill="{skin}"/>

    <!-- Ears -->
    <circle cx="40" cy="56" r="4.5" fill="{skin}"/>
    <circle cx="80" cy="56" r="4.5" fill="{skin}"/>

    <!-- Head & Face -->
    <path d="M42 46 C42 34, 49 28, 60 28 C71 28, 78 34, 78 46 C78 62, 71 72, 60 72 C49 72, 42 62, 42 46 Z" fill="{skin}"/>

    <!-- Eyes & Brows -->
    {eyes_svg}

    <!-- Nose -->
    <path d="M60 55 L58 60 L62 60" stroke="{skin_shadow}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>

    <!-- Mouth -->
    <path d="M55 65 Q60 68 65 65" stroke="#7A3F29" stroke-width="1.8" stroke-linecap="round" fill="none"/>

    <!-- Hair Silhouette -->
    {hair_svg}
  </g>
</svg>"""
    return svg.strip()


# Backward compatibility alias
def generate_robot_avatar_svg(seed: str) -> str:
    return generate_human_avatar_svg(seed)
