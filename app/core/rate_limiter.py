"""Redis token-bucket request limiter and per-workspace daily send quota."""
import time
from datetime import datetime, timezone

from app.core.cache import get_redis, is_memory_backend
from app.core.config import get_settings

_TOKEN_BUCKET_LUA = """
local cap = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local state = redis.call('HMGET', KEYS[1], 't', 'ts')
local tokens = tonumber(state[1])
local ts = tonumber(state[2])
if tokens == nil then tokens = cap; ts = now end
tokens = math.min(cap, tokens + math.max(0, now - ts) * rate)
local allowed = 0
if tokens >= 1 then tokens = tokens - 1; allowed = 1 end
redis.call('HSET', KEYS[1], 't', tokens, 'ts', now)
redis.call('EXPIRE', KEYS[1], math.ceil(cap / rate) + 1)
return allowed
"""

# Fallback for the in-process dev backend, which has no Lua interpreter.
_local_buckets: dict[str, tuple[float, float]] = {}


def _local_take(key: str, capacity: int, rate: float) -> bool:
    now = time.monotonic()
    tokens, ts = _local_buckets.get(key, (float(capacity), now))
    tokens = min(capacity, tokens + (now - ts) * rate)
    allowed = tokens >= 1
    _local_buckets[key] = (tokens - 1 if allowed else tokens, now)
    return allowed


async def allow_request(identity: str) -> bool:
    settings = get_settings()
    key = f"ratelimit:{identity}"
    if is_memory_backend():
        return _local_take(key, settings.rate_limit_capacity, settings.rate_limit_refill_per_second)
    allowed = await get_redis().eval(
        _TOKEN_BUCKET_LUA, 1, key,
        settings.rate_limit_capacity, settings.rate_limit_refill_per_second, time.time(),
    )
    return bool(allowed)


def _quota_key(workspace_id, kind: str = "send") -> str:
    return f"{kind}quota:{workspace_id}:{datetime.now(timezone.utc):%Y%m%d}"


async def reserve_daily_send(workspace_id, limit: int, kind: str = "send") -> bool:
    """Atomically take one unit of today's (UTC) quota of ``kind``. False when exhausted."""
    redis = get_redis()
    key = _quota_key(workspace_id, kind)
    used = await redis.incr(key)
    if used == 1:
        await redis.expire(key, 172800)
    if used > limit:
        await redis.decr(key)
        return False
    return True


async def release_daily_send(workspace_id) -> None:
    await get_redis().decr(_quota_key(workspace_id))


async def daily_usage(workspace_id) -> dict[str, int]:
    values = await get_redis().mget(_quota_key(workspace_id, "send"), _quota_key(workspace_id, "inbound"))
    return {"sent_today": int(values[0] or 0), "received_today": int(values[1] or 0)}
