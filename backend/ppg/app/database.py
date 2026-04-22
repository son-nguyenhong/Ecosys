"""
Database connection — asyncpg pool
"""
import json
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import asyncpg

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://devops:devops123@127.0.0.1/devops_hub")

_pool: asyncpg.Pool | None = None


async def _init_conn(conn: asyncpg.Connection) -> None:
    """Register codecs so JSONB columns are auto-decoded to Python objects."""
    await conn.set_type_codec(
        "jsonb",
        encoder=json.dumps,
        decoder=json.loads,
        schema="pg_catalog",
    )


async def init_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10, init=_init_conn)


async def close_pool() -> None:
    if _pool:
        await _pool.close()


@asynccontextmanager
async def get_conn() -> AsyncGenerator[asyncpg.Connection, None]:
    async with _pool.acquire() as conn:
        yield conn


async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    if _pool is None:
        raise RuntimeError("Database pool is not initialized. Call init_pool() first.")
    async with _pool.acquire() as conn:
        yield conn


def get_pool() -> asyncpg.Pool:
    """Return the active connection pool (for use in background tasks)."""
    return _pool
