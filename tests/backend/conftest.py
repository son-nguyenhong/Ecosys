"""
Shared pytest fixtures for backend service tests.
Uses FastAPI TestClient with asyncpg mocked via dependency override.
"""
from __future__ import annotations

import json
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Shared JWT token helper
# ---------------------------------------------------------------------------

TEST_USER_SUB = "test.user"
TEST_USER_NAME = "Test User"


def _make_token() -> str:
    """Create a real JWT for tests using the app's own create_token."""
    from backend.ppg.app.auth import create_token  # type: ignore[import]

    return create_token(TEST_USER_SUB, TEST_USER_NAME)


# ---------------------------------------------------------------------------
# Fake asyncpg connection
# ---------------------------------------------------------------------------


class FakeRecord(dict):
    """Minimal asyncpg.Record replacement that supports dict() and key access."""

    def __getitem__(self, key: str):  # type: ignore[override]
        return super().__getitem__(key)


def make_fake_db(
    fetchrow_return=None,
    fetch_return=None,
    fetchval_return=None,
    execute_return="INSERT 1",
):
    """Return a MagicMock that quacks like asyncpg.Connection."""
    db = MagicMock()

    # Default: return empty / zero
    db.fetchrow = AsyncMock(return_value=fetchrow_return)
    db.fetch = AsyncMock(return_value=fetch_return or [])
    db.fetchval = AsyncMock(return_value=fetchval_return)
    db.execute = AsyncMock(return_value=execute_return)

    # transaction() context manager
    tx = MagicMock()
    tx.__aenter__ = AsyncMock(return_value=None)
    tx.__aexit__ = AsyncMock(return_value=False)
    db.transaction = MagicMock(return_value=tx)

    return db
