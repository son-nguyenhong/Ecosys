"""
Auth Router — POST /auth/login
ADR-003: PPG is auth provider
"""
from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg

from app.auth import LoginRequest, TokenResponse, verify_password, create_token
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: asyncpg.Connection = Depends(get_db)):
    row = await db.fetchrow(
        "SELECT username, full_name, password_hash, is_active FROM ppg_users WHERE username = $1",
        body.username,
    )
    if not row or not row["is_active"] or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_token(row["username"], row["full_name"])
    return TokenResponse(access_token=token)
