"""Session-scoped persistence for analyses, recommendations and previews.

No user accounts/login exist in this product — a `session_id` (a random
token minted client-side and stored in localStorage) is the sole identity.
Data is written to MongoDB when available; otherwise it's kept in an
in-process TTL-free dict so the app remains fully usable in local dev
without a database running.
"""
from __future__ import annotations

from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.schemas import AnalysisResult, OutfitPreviewResponse, RecommendationResponse

_in_memory_store: dict[str, dict] = {
    "analyses": {},
    "recommendations": {},
    "previews": {},
}


class SessionService:
    async def save_analysis(self, db: Optional[AsyncIOMotorDatabase], analysis: AnalysisResult) -> None:
        doc = analysis.model_dump(mode="json")
        if db is not None:
            await db.analyses.update_one({"analysis_id": analysis.analysis_id}, {"$set": doc}, upsert=True)
        _in_memory_store["analyses"][analysis.analysis_id] = doc

    async def get_analysis(self, db: Optional[AsyncIOMotorDatabase], analysis_id: str) -> Optional[AnalysisResult]:
        if db is not None:
            doc = await db.analyses.find_one({"analysis_id": analysis_id})
            if doc:
                doc.pop("_id", None)
                return AnalysisResult(**doc)
        doc = _in_memory_store["analyses"].get(analysis_id)
        return AnalysisResult(**doc) if doc else None

    async def get_latest_analysis_for_session(self, db: Optional[AsyncIOMotorDatabase], session_id: str) -> Optional[AnalysisResult]:
        if db is not None:
            doc = await db.analyses.find_one({"session_id": session_id}, sort=[("created_at", -1)])
            if doc:
                doc.pop("_id", None)
                return AnalysisResult(**doc)
        candidates = [d for d in _in_memory_store["analyses"].values() if d["session_id"] == session_id]
        if not candidates:
            return None
        candidates.sort(key=lambda d: d["created_at"], reverse=True)
        return AnalysisResult(**candidates[0])

    async def save_recommendation(self, db: Optional[AsyncIOMotorDatabase], recommendation: RecommendationResponse) -> None:
        doc = recommendation.model_dump(mode="json")
        key = f"{recommendation.session_id}:{recommendation.analysis_id}"
        if db is not None:
            await db.recommendations.update_one({"_key": key}, {"$set": {**doc, "_key": key}}, upsert=True)
        _in_memory_store["recommendations"][key] = doc

    async def get_latest_recommendation_for_session(self, db: Optional[AsyncIOMotorDatabase], session_id: str) -> Optional[RecommendationResponse]:
        if db is not None:
            doc = await db.recommendations.find_one({"session_id": session_id}, sort=[("generated_at", -1)])
            if doc:
                doc.pop("_id", None)
                doc.pop("_key", None)
                return RecommendationResponse(**doc)
        candidates = [d for d in _in_memory_store["recommendations"].values() if d["session_id"] == session_id]
        if not candidates:
            return None
        candidates.sort(key=lambda d: d["generated_at"], reverse=True)
        return RecommendationResponse(**candidates[0])

    async def save_preview(self, db: Optional[AsyncIOMotorDatabase], preview: OutfitPreviewResponse) -> None:
        doc = preview.model_dump(mode="json")
        if db is not None:
            await db.previews.update_one({"preview_id": preview.preview_id}, {"$set": doc}, upsert=True)
        _in_memory_store["previews"][preview.preview_id] = doc

    async def get_latest_preview_for_session(self, db: Optional[AsyncIOMotorDatabase], session_id: str) -> Optional[OutfitPreviewResponse]:
        if db is not None:
            doc = await db.previews.find_one({"session_id": session_id}, sort=[("generated_at", -1)])
            if doc:
                doc.pop("_id", None)
                return OutfitPreviewResponse(**doc)
        candidates = [d for d in _in_memory_store["previews"].values() if d["session_id"] == session_id]
        if not candidates:
            return None
        candidates.sort(key=lambda d: d["generated_at"], reverse=True)
        return OutfitPreviewResponse(**candidates[0])


session_service = SessionService()
