"""Recommendation engine endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.models.schemas import OutfitRatingRequest, RecommendationRequest, RecommendationResponse
from app.services.rating_service import rating_service
from app.services.recommendation.engine import recommendation_engine
from app.services.session_service import session_service

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.post("", response_model=RecommendationResponse)
async def generate_recommendations(
    request: RecommendationRequest,
    db: AsyncIOMotorDatabase | None = Depends(get_database),
):
    analysis = await session_service.get_analysis(db, request.analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found. Run AI Analysis first.")

    result = await recommendation_engine.generate(analysis, request, db)
    await session_service.save_recommendation(db, result)
    return result


@router.get("/session/{session_id}/latest", response_model=RecommendationResponse)
async def get_latest_recommendation(session_id: str, db: AsyncIOMotorDatabase | None = Depends(get_database)):
    result = await session_service.get_latest_recommendation_for_session(db, session_id)
    if result is None:
        raise HTTPException(status_code=404, detail="No recommendation found for this session")
    for rec in result.recommendations:
        rec.rating, rec.rating_count = await rating_service.get_rating_stats(db, rec.recommendation_id)
    return result


@router.post("/rate")
async def rate_recommendation(payload: OutfitRatingRequest, db: AsyncIOMotorDatabase | None = Depends(get_database)):
    """Phase 12 — session-only outfit rating; also the raw signal a future
    feedback-learning loop (Phase 14) would train on."""
    await rating_service.rate(db, payload.session_id, payload.recommendation_id, payload.rating)
    avg, count = await rating_service.get_rating_stats(db, payload.recommendation_id)
    return {"recommendation_id": payload.recommendation_id, "average_rating": avg, "rating_count": count}
