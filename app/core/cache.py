"""Redis connection holder. ``memory://`` uses an in-process emulation for single-process local dev."""
import redis.asyncio as aioredis

from app.core.config import get_settings

_client: aioredis.Redis | None = None
_is_memory = False


async def init_redis() -> None:
    global _client, _is_memory
    url = get_settings().redis_url
    if url.startswith("memory://"):
        import fakeredis

        _client = fakeredis.FakeAsyncRedis(decode_responses=True)
        _is_memory = True
    else:
        _client = aioredis.from_url(url, decode_responses=True)
        _is_memory = False
        await _client.ping()


async def close_redis() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def get_redis() -> aioredis.Redis:
    if _client is None:
        raise RuntimeError("Redis is not initialised")
    return _client


def is_memory_backend() -> bool:
    return _is_memory


def inbox_channel(inbox_id) -> str:
    return f"inbox:{inbox_id}:events"
