import os
from typing import AsyncGenerator
import asyncpg

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://devops:devops123@127.0.0.1/devops_hub")
_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)


async def close_pool() -> None:
    if _pool:
        await _pool.close()


def get_pool() -> asyncpg.Pool:
    return _pool


async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    async with _pool.acquire() as conn:
        yield conn
