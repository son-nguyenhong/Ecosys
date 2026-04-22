"""
Meetings Router — Phase 3
List meetings, generate/parse meeting notes
"""
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import asyncpg

from app.auth import CurrentUser
from app.database import get_db
from app.services.meeting_parser import parse_meeting_notes

router = APIRouter(prefix="/projects", tags=["meetings"])


class MeetingGenerate(BaseModel):
    title: str = Field(..., max_length=300)
    meeting_date: Optional[str] = None
    raw_notes: str = ""


@router.get("/{project_id}/meetings")
async def list_meetings(
    user: CurrentUser,
    project_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
):
    rows = await db.fetch(
        "SELECT * FROM meeting_minutes WHERE project_id = $1 ORDER BY meeting_date DESC, created_at DESC",
        project_id,
    )
    return [dict(r) for r in rows]


@router.post("/{project_id}/meetings/generate", status_code=201)
async def generate_meeting(
    user: CurrentUser,
    project_id: UUID,
    body: MeetingGenerate,
    db: asyncpg.Connection = Depends(get_db),
):
    # Load project members for alias mapping
    members = await db.fetch(
        "SELECT id, full_name, alias, role FROM project_members WHERE project_id = $1",
        project_id,
    )
    members_list = [dict(m) for m in members]

    parsed = parse_meeting_notes(body.raw_notes, members_list)

    meeting_date = body.meeting_date or None

    row = await db.fetchrow(
        """INSERT INTO meeting_minutes (project_id, title, meeting_date, raw_notes, generated_content, created_by)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6) RETURNING *""",
        project_id, body.title, meeting_date, body.raw_notes,
        __import__("json").dumps(parsed),
        user.sub if user else "system",
    )
    return dict(row)
