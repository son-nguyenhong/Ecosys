"""
Application Registry Models — ADR-002
4 object types: application, system, job, connection
"""
from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
import re

ObjectType = Literal["application", "system", "job", "connection"]
ObjectStatus = Literal["active", "inactive", "deprecated"]
VALID_ENVS = {"DEV", "SIT", "UAT", "PROD", "STAGING"}


class AppRegistryCreate(BaseModel):
    object_type: ObjectType
    name: str = Field(..., max_length=200)
    code: str = Field(..., max_length=50)
    description: Optional[str] = None
    owner_team: Optional[str] = Field(None, max_length=100)
    status: ObjectStatus = "active"
    environment: list[str] = []
    extra: dict[str, Any] = {}

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        if not re.match(r'^[A-Z0-9_]+$', v):
            raise ValueError("code must be uppercase letters, digits, and underscores only")
        return v

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: list[str]) -> list[str]:
        invalid = set(v) - VALID_ENVS
        if invalid:
            raise ValueError(f"Invalid environments: {invalid}. Must be one of {VALID_ENVS}")
        return v


class AppRegistryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    owner_team: Optional[str] = None
    status: Optional[ObjectStatus] = None
    environment: Optional[list[str]] = None
    extra: Optional[dict[str, Any]] = None


class AppRegistryOut(BaseModel):
    id: UUID
    project_id: UUID
    object_type: ObjectType
    name: str
    code: str
    description: Optional[str]
    owner_team: Optional[str]
    status: ObjectStatus
    environment: list[str]
    extra: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    created_by: str
