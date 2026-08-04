"""Virtual outfit preview endpoints."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.database import get_database
from app.models.schemas import OutfitPreviewRequest, OutfitPreviewResponse
from app.services.catalog_service import catalog_service
from app.services.outfit_preview.preview_service import outfit_preview_service
from app.services.session_service import session_service
from app.utils.image_utils import load_image

settings = get_settings()

router = APIRouter(prefix="/preview", tags=["Virtual Outfit Preview"])


@router.post("", response_model=OutfitPreviewResponse)
async def generate_preview(
    request: OutfitPreviewRequest,
    db: AsyncIOMotorDatabase | None = Depends(get_database),
):
    analysis = await session_service.get_analysis(db, request.analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found. Run AI Analysis first.")
    if not analysis.image_url:
        raise HTTPException(status_code=422, detail="Original analysis image is unavailable.")

    if not request.outfit_skus:
        raise HTTPException(status_code=422, detail="At least one outfit SKU is required.")

    garment_items = await catalog_service.get_by_skus(db, request.outfit_skus)
    if not garment_items:
        raise HTTPException(status_code=404, detail="None of the requested SKUs were found in the catalog.")

    file_stem = Path(analysis.image_url).stem
    image_path = str(Path(settings.UPLOAD_DIR) / f"{file_stem}.jpg")
    try:
        person_bgr = load_image(image_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Original analysis image file is missing on disk.") from exc

    result = outfit_preview_service.generate_preview(person_bgr, garment_items, request.session_id)
    await session_service.save_preview(db, result)
    return result


@router.get("/session/{session_id}/latest", response_model=OutfitPreviewResponse)
async def get_latest_preview(session_id: str, db: AsyncIOMotorDatabase | None = Depends(get_database)):
    result = await session_service.get_latest_preview_for_session(db, session_id)
    if result is None:
        raise HTTPException(status_code=404, detail="No preview found for this session")
    return result
