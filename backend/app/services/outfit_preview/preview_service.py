"""Orchestrates virtual outfit preview generation and persistence."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import numpy as np

from app.core.config import get_settings
from app.models.schemas import CatalogItem, OutfitPreviewResponse
from app.services.outfit_preview.vton_adapter import get_engine
from app.utils.image_utils import save_image

settings = get_settings()

ENGINE_DISCLAIMERS = {
    "composite": "This is an approximate compositing preview, not a photorealistic try-on. For photorealistic virtual try-on, enable a diffusion-based VTON_ENGINE (idm_vton, catvton, stable_viton) with GPU inference.",
    "idm_vton": "Generated using the IDM-VTON diffusion pipeline.",
    "catvton": "Generated using the CatVTON diffusion pipeline.",
    "stable_viton": "Generated using the StableVITON diffusion pipeline.",
}


class OutfitPreviewService:
    def generate_preview(
        self,
        person_bgr: np.ndarray,
        garment_items: list[CatalogItem],
        session_id: str,
    ) -> OutfitPreviewResponse:
        engine = get_engine(settings.VTON_ENGINE)
        garment_urls = [item.image_url for item in garment_items]

        composited = engine.generate(person_bgr, garment_urls)

        file_id, path = save_image(composited, settings.OUTFIT_PREVIEW_DIR, prefix="preview")

        return OutfitPreviewResponse(
            session_id=session_id,
            preview_id=f"pv_{uuid.uuid4().hex}",
            preview_image_url=f"/media/previews/{file_id}.jpg",
            engine_used=engine.name,
            generated_at=datetime.now(timezone.utc),
            disclaimer=ENGINE_DISCLAIMERS.get(engine.name, ""),
        )


outfit_preview_service = OutfitPreviewService()
