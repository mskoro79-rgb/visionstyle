"""No-login dashboard endpoints: aggregates the latest analysis, recommendation and preview for a session."""
from __future__ import annotations

import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.models.schemas import DashboardReport
from app.services.pdf_report_service import build_dashboard_pdf
from app.services.session_service import session_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _compute_ai_score(report: DashboardReport) -> float:
    scores = []
    if report.analysis:
        scores.append(report.analysis.overall_confidence)
    if report.latest_recommendation:
        scores.append(report.latest_recommendation.recommendations[0].confidence if report.latest_recommendation.recommendations else 0.5)
    if not scores:
        return 0.0
    return round(sum(scores) / len(scores) * 100, 1)


@router.get("/session/{session_id}", response_model=DashboardReport)
async def get_dashboard(session_id: str, db: AsyncIOMotorDatabase | None = Depends(get_database)):
    analysis = await session_service.get_latest_analysis_for_session(db, session_id)
    recommendation = await session_service.get_latest_recommendation_for_session(db, session_id)
    preview = await session_service.get_latest_preview_for_session(db, session_id)

    report = DashboardReport(
        session_id=session_id,
        generated_at=datetime.now(timezone.utc),
        analysis=analysis,
        latest_recommendation=recommendation,
        latest_preview=preview,
        ai_score=0.0,
    )
    report.ai_score = _compute_ai_score(report)
    return report


@router.get("/session/{session_id}/report.json")
async def download_report(session_id: str, db: AsyncIOMotorDatabase | None = Depends(get_database)):
    report = await get_dashboard(session_id, db)
    payload = report.model_dump_json(indent=2).encode("utf-8")
    return StreamingResponse(
        io.BytesIO(payload),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=visionstyle-report-{session_id}.json"},
    )


@router.get("/session/{session_id}/report.pdf")
async def download_report_pdf(session_id: str, db: AsyncIOMotorDatabase | None = Depends(get_database)):
    report = await get_dashboard(session_id, db)
    pdf_bytes = build_dashboard_pdf(report)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=visionstyle-report-{session_id}.pdf"},
    )
