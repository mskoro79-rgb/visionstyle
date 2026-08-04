"""AI Analysis endpoints: upload an image, run the CV pipeline, persist + return results."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.database import get_database
from app.models.schemas import AnalysisResult
from app.services.cv.analyzer import FaceNotDetectedError, vision_analyzer
from app.services.session_service import session_service
from app.utils.image_utils import decode_upload_to_bgr, save_image

router = APIRouter(prefix="/analysis", tags=["AI Analysis"])
settings = get_settings()


@router.post("", response_model=AnalysisResult)
async def analyze_image(
    file: UploadFile = File(...),
    session_id: str | None = Form(default=None),
    db: AsyncIOMotorDatabase | None = Depends(get_database),
):
    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported image type: {file.content_type}")

    raw_bytes = await file.read()
    if len(raw_bytes) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Image exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit")

    session_id = session_id or f"sess_{uuid.uuid4().hex}"

    try:
        bgr_image = decode_upload_to_bgr(raw_bytes)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Could not decode image: {exc}") from exc

    try:
        result = vision_analyzer.analyze(bgr_image, session_id)
    except FaceNotDetectedError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    file_id, _ = save_image(bgr_image, settings.UPLOAD_DIR, prefix="upload")
    result.image_url = f"/media/uploads/{file_id}.jpg"

    await session_service.save_analysis(db, result)
    return result


@router.get("/{analysis_id}", response_model=AnalysisResult)
async def get_analysis(analysis_id: str, db: AsyncIOMotorDatabase | None = Depends(get_database)):
    result = await session_service.get_analysis(db, analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return result


@router.get("/session/{session_id}/latest", response_model=AnalysisResult)
async def get_latest_analysis(session_id: str, db: AsyncIOMotorDatabase | None = Depends(get_database)):
    result = await session_service.get_latest_analysis_for_session(db, session_id)
    if result is None:
        raise HTTPException(status_code=404, detail="No analysis found for this session")
    return result
