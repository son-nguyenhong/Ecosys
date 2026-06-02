"""
Sync Service — push to PPG and Test Platform on document approve
FR-011: BRS approved → Test Platform; all docs → PPG
BR-002: only BRS triggers test case generation
ADR-001: sync failure logs to ppg_sync_log, does NOT rollback document transition
"""
import os
import json
import uuid
import logging
import datetime
from decimal import Decimal

import httpx

PPG_URL = os.getenv("PPG_SERVICE_URL", "http://127.0.0.1:8001")
TEST_URL = os.getenv("TEST_SERVICE_URL", "http://127.0.0.1:8003")

logger = logging.getLogger(__name__)


def _json_default(o):
    """Serialize các kiểu không-chuẩn-JSON thường gặp từ asyncpg.

    UUID → str, date/datetime → ISO 8601, Decimal → float, set → list.
    """
    if isinstance(o, uuid.UUID):
        return str(o)
    if isinstance(o, (datetime.date, datetime.datetime, datetime.time)):
        return o.isoformat()
    if isinstance(o, Decimal):
        return float(o)
    if isinstance(o, (set, frozenset)):
        return list(o)
    if isinstance(o, bytes):
        return o.decode("utf-8", "replace")
    return str(o)


def _safe_payload(doc: dict) -> bytes:
    """Encode doc → JSON bytes, xử lý được UUID/date/Decimal..."""
    return json.dumps(doc, default=_json_default, ensure_ascii=False).encode("utf-8")


_JSON_HEADERS = {"Content-Type": "application/json"}


async def push_doc_to_ppg(doc: dict) -> None:
    """Push approved document to PPG — all doc types."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{PPG_URL}/sync-doc", content=_safe_payload(doc), headers=_JSON_HEADERS
            )
            resp.raise_for_status()
    except Exception as e:
        logger.error(f"sync-doc to PPG failed: {e} | doc_id={doc.get('id')}")
        # BR: do NOT raise — sync failure must not rollback document transition


async def push_brs_to_test_platform(doc: dict) -> None:
    """Push approved BRS to Test Platform to trigger auto-gen — BR-002."""
    if doc.get("doc_type") != "BRS":
        return  # BR-002: only BRS triggers test generation
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{TEST_URL}/brs", content=_safe_payload(doc), headers=_JSON_HEADERS
            )
            resp.raise_for_status()
    except Exception as e:
        logger.error(f"BRS push to Test Platform failed: {e} | doc_id={doc.get('id')}")