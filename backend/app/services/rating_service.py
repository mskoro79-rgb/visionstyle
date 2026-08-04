"""Session-scoped outfit ratings (Phase 12). Feeds both the UI ("Outfit
Rating") and analytics ("recommendation accuracy" proxy / average rating),
and doubles as the raw signal a future feedback-learning loop (Phase 14)
would train on.
"""
from __future__ import annotations

from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

_in_memory_ratings: dict[str, float] = {}  # f"{session_id}:{recommendation_id}" -> rating


class RatingService:
    async def rate(
        self, db: Optional[AsyncIOMotorDatabase], session_id: str, recommendation_id: str, rating: float
    ) -> None:
        key = f"{session_id}:{recommendation_id}"
        if db is not None:
            await db.outfit_ratings.update_one(
                {"session_id": session_id, "recommendation_id": recommendation_id},
                {"$set": {"session_id": session_id, "recommendation_id": recommendation_id, "rating": rating}},
                upsert=True,
            )
        _in_memory_ratings[key] = rating

    async def get_rating_stats(
        self, db: Optional[AsyncIOMotorDatabase], recommendation_id: str
    ) -> tuple[Optional[float], int]:
        if db is not None:
            docs = await db.outfit_ratings.find({"recommendation_id": recommendation_id}).to_list(length=1000)
            if docs:
                values = [d["rating"] for d in docs]
                return sum(values) / len(values), len(values)
            return None, 0

        values = [v for k, v in _in_memory_ratings.items() if k.endswith(f":{recommendation_id}")]
        if not values:
            return None, 0
        return sum(values) / len(values), len(values)

    async def get_average_rating(self, db: Optional[AsyncIOMotorDatabase]) -> Optional[float]:
        if db is not None:
            docs = await db.outfit_ratings.find({}).to_list(length=10000)
            values = [d["rating"] for d in docs]
        else:
            values = list(_in_memory_ratings.values())
        if not values:
            return None
        return round(sum(values) / len(values), 2)


rating_service = RatingService()
