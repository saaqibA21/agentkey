"""Create all tables. Idempotent: existing tables are left untouched.

    python scripts/init_db.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings  # noqa: E402
from app.db.session import create_all, dispose_engine  # noqa: E402


async def main() -> None:
    await create_all()
    await dispose_engine()
    url = get_settings().async_database_url
    print(f"Tables ready on {url.split('@')[-1]}")


if __name__ == "__main__":
    asyncio.run(main())
