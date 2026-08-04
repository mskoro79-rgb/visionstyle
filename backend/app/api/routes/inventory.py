"""Owner inventory management endpoints (Phase 8). Every route requires a
valid owner JWT — there is no shopper-facing write access to inventory.
"""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import require_owner
from app.core.config import get_settings
from app.core.database import get_database
from app.models.schemas import CatalogItem, InventoryItemCreate, InventoryItemUpdate, InventoryStats
from app.services.inventory_service import inventory_service
from app.utils.image_utils import decode_upload_to_bgr, save_image

router = APIRouter(prefix="/inventory", tags=["Owner Inventory"])
settings = get_settings()


@router.get("", response_model=list[CatalogItem])
async def list_inventory(
    category: str | None = None,
    active_only: bool = False,
    db: AsyncIOMotorDatabase | None = Depends(get_database),
    _owner: str = Depends(require_owner),
):
    return await inventory_service.list_items(db, category=category, active_only=active_only)


@router.get("/stats", response_model=InventoryStats)
async def inventory_stats(
    db: AsyncIOMotorDatabase | None = Depends(get_database),
    _owner: str = Depends(require_owner),
):
    return await inventory_service.compute_stats(db)


@router.post("", response_model=CatalogItem)
async def create_inventory_item(
    payload: str = Form(..., description="JSON-encoded InventoryItemCreate payload"),
    images: list[UploadFile] = File(default=[]),
    db: AsyncIOMotorDatabase | None = Depends(get_database),
    _owner: str = Depends(require_owner),
):
    try:
        parsed = InventoryItemCreate(**json.loads(payload))
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"Invalid product payload: {exc}") from exc

    image_urls = await _persist_images(images)
    return await inventory_service.create_item(db, parsed, image_urls)


@router.put("/{sku}", response_model=CatalogItem)
async def update_inventory_item(
    sku: str,
    payload: InventoryItemUpdate,
    db: AsyncIOMotorDatabase | None = Depends(get_database),
    _owner: str = Depends(require_owner),
):
    updated = await inventory_service.update_item(db, sku, payload)
    if updated is None:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return updated


@router.post("/{sku}/images", response_model=CatalogItem)
async def upload_inventory_images(
    sku: str,
    images: list[UploadFile] = File(...),
    db: AsyncIOMotorDatabase | None = Depends(get_database),
    _owner: str = Depends(require_owner),
):
    image_urls = await _persist_images(images)
    updated = await inventory_service.add_images(db, sku, image_urls)
    if updated is None:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return updated


@router.delete("/{sku}")
async def delete_inventory_item(
    sku: str,
    db: AsyncIOMotorDatabase | None = Depends(get_database),
    _owner: str = Depends(require_owner),
):
    success = await inventory_service.delete_item(db, sku)
    if not success:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return {"sku": sku, "deleted": True}


async def _persist_images(images: list[UploadFile]) -> list[str]:
    urls: list[str] = []
    for upload in images:
        if upload.content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=415, detail=f"Unsupported image type: {upload.content_type}")
        raw = await upload.read()
        if len(raw) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"Image exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit")
        bgr = decode_upload_to_bgr(raw)
        file_id, _ = save_image(bgr, settings.INVENTORY_IMAGE_DIR, prefix="inv")
        urls.append(f"/media/inventory/{file_id}.jpg")
    return urls
