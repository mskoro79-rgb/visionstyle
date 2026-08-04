"""Owner authentication endpoints (Phase 7). No shopper/user auth exists."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import require_owner
from app.core.database import get_database
from app.core.security import create_access_token, verify_password
from app.models.schemas import OwnerLoginRequest, OwnerProfile, OwnerTokenResponse
from app.services.owner_service import get_owner_password_hash

router = APIRouter(prefix="/auth", tags=["Owner Authentication"])


@router.post("/login", response_model=OwnerTokenResponse)
async def owner_login(payload: OwnerLoginRequest, db: AsyncIOMotorDatabase | None = Depends(get_database)):
    password_hash = await get_owner_password_hash(db, payload.email)
    if password_hash is None or not verify_password(payload.password, password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid owner credentials")

    token, expires_at = create_access_token(subject=payload.email.lower())
    return OwnerTokenResponse(access_token=token, expires_at=expires_at, owner_email=payload.email.lower())


@router.get("/me", response_model=OwnerProfile)
async def get_current_owner(owner_email: str = Depends(require_owner)):
    return OwnerProfile(email=owner_email)
