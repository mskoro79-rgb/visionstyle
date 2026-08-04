"""Password hashing and JWT issuance/verification for owner authentication.

Only the showroom owner authenticates in this product — there is no
end-user/shopper account system. Passwords are hashed with bcrypt directly
(not passlib, which has known incompatibilities with modern bcrypt
releases); tokens are signed JWTs carrying the owner's email as subject.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()

BCRYPT_MAX_BYTES = 72  # bcrypt silently truncates beyond this; we enforce it explicitly.


def hash_password(plain_password: str) -> str:
    truncated = plain_password.encode("utf-8")[:BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(truncated, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    truncated = plain_password.encode("utf-8")[:BCRYPT_MAX_BYTES]
    try:
        return bcrypt.checkpw(truncated, hashed_password.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: str) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expires_at, "role": "owner"}
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expires_at


def decode_access_token(token: str) -> str:
    """Returns the token subject (owner email), raising JWTError if invalid/expired."""
    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    if payload.get("role") != "owner":
        raise JWTError("Not an owner token")
    subject = payload.get("sub")
    if not subject:
        raise JWTError("Token missing subject")
    return subject
