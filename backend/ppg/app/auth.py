"""
JWT Authentication Provider — PPG Service
ADR-003: DB-based JWT, PPG is auth provider
"""
from datetime import datetime, timedelta, timezone
from typing import Annotated
import os

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from pydantic import BaseModel

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 8

security = HTTPBearer()


class TokenPayload(BaseModel):
    sub: str
    name: str
    exp: int
    iat: int


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = JWT_EXPIRE_HOURS * 3600


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(username: str, full_name: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "name": full_name,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_EXPIRE_HOURS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> TokenPayload:
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return TokenPayload(**data)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> TokenPayload:
    return decode_token(credentials.credentials)


CurrentUser = Annotated[TokenPayload, Depends(get_current_user)]
