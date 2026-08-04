"""Analytics dashboard endpoints (Phase 10). Read-only, public — the charts
are shown in the owner's analytics dashboard but reveal no shopper PII
(session IDs are never exposed here, only aggregate counts).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.models.schemas import AnalyticsSummary
from app.services.analytics_service import analytics_service
from app.services.future.trend_prediction_service import trend_prediction_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(db: AsyncIOMotorDatabase | None = Depends(get_database)):
    return await analytics_service.get_summary(db)


@router.get("/trends", response_model=dict[str, float])
async def get_category_trends(
    window_days: int = 7, db: AsyncIOMotorDatabase | None = Depends(get_database)
):
    """Phase 14 — category momentum (trend prediction groundwork). Positive
    values mean a category has been recommended more often in the last
    `window_days` than in the equivalent prior window."""
    return await trend_prediction_service.category_momentum(db, window_days=window_days)
