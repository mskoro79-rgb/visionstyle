"""Recommendation engine endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.models.schemas import RecommendationRequest, RecommendationResponse
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
    return result
