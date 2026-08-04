"""Shared FastAPI dependencies for route authorization."""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.core.security import decode_access_token

_bearer_scheme = HTTPBearer(auto_error=False)


async def require_owner(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> str:
    """Verifies the request carries a valid owner JWT. Returns the owner's email."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Owner authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return decode_access_token(credentials.credentials)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired owner session",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
