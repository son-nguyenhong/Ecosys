from datetime import date, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., max_length=200)
    code: str = Field(..., max_length=50, pattern=r'^[A-Z0-9_]+$')
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectOut(BaseModel):
    id: UUID
    name: str
    code: str
    description: Optional[str]
    status: str
    start_date: Optional[date]
    end_date: Optional[date]
    created_at: datetime
    updated_at: datetime
    created_by: str
