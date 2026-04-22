"""
Audit Service — NFR-007 (copy for test-platform service boundary)
Writes to ppg_audit_log (shared table).
"""
from __future__ import annotations

import json
import logging
from typing import Optional

import asyncpg
from fastapi import Request

logger = logging.getLogger(__name__)

VALID_ACTIONS = frozenset(
    {"CREATE", "UPDATE", "DELETE", "STATUS_CHANGE", "LINK", "UNLINK", "UPLOAD", "DOWNLOAD"}
)


async def log_audit(
    db: asyncpg.Connection,
    entity_type: str,
    entity_id: str,
    action: str,
    changed_by: str,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    request: Optional[Request] = None,
    notes: Optional[str] = None,
) -> None:
    if action not in VALID_ACTIONS:
        logger.warning("log_audit: unknown action '%s' — logging anyway", action)

    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    if request is not None:
        forwarded_for = request.headers.get("X-Forwarded-For")
        ip_address = forwarded_for.split(",")[0].strip() if forwarded_for else (
            request.client.host if request.client else None
        )
        user_agent = request.headers.get("User-Agent")

    try:
        await db.execute(
            """
            INSERT INTO ppg_audit_log
                (entity_type, entity_id, action, changed_by,
                 old_values, new_values, ip_address, user_agent, notes)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            """,
            entity_type,
            str(entity_id),
            action,
            changed_by,
            json.dumps(old_values) if old_values is not None else None,
            json.dumps(new_values) if new_values is not None else None,
            ip_address,
            user_agent,
            notes,
        )
    except Exception as exc:
        logger.error(
            "audit_log write failed: entity=%s id=%s action=%s error=%s",
            entity_type, entity_id, action, exc,
        )
