"""Owner account bootstrap + authentication lookup.

There is exactly one authenticated role in this product: the showroom
owner. On first startup a single owner document is created (Mongo-backed
when available, in-memory otherwise) from `OWNER_BOOTSTRAP_EMAIL` /
`OWNER_BOOTSTRAP_PASSWORD`. This keeps the "no user auth, owner-only"
requirement simple while remaining swappable for a multi-admin `owners`
collection later without changing the auth flow.
"""
from __future__ import annotations

import logging
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.security import hash_password

logger = logging.getLogger("visionstyle.owner")
settings = get_settings()

_in_memory_owners: dict[str, str] = {}  # email -> hashed_password


async def bootstrap_owner(db: Optional[AsyncIOMotorDatabase]) -> None:
    email = settings.OWNER_BOOTSTRAP_EMAIL.lower()
    if db is not None:
        existing = await db.owners.find_one({"email": email})
        if existing is None:
            await db.owners.insert_one({"email": email, "password_hash": hash_password(settings.OWNER_BOOTSTRAP_PASSWORD)})
            logger.info("Bootstrapped owner account for %s", email)
    if email not in _in_memory_owners:
        _in_memory_owners[email] = hash_password(settings.OWNER_BOOTSTRAP_PASSWORD)


async def get_owner_password_hash(db: Optional[AsyncIOMotorDatabase], email: str) -> Optional[str]:
    email = email.lower()
    if db is not None:
        doc = await db.owners.find_one({"email": email})
        if doc:
            return doc["password_hash"]
    return _in_memory_owners.get(email)
