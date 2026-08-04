"""Fashion catalog + Smart Showroom endpoints (Phase 6 + Phase 9).

Public reads are served from the combined pool (preloaded catalog + owner
inventory); administrative actions on the built-in catalog require owner
authentication.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import require_owner
from app.core.database import get_database
from app.models.schemas import CatalogItem, InventoryStats
from app.services.catalog_service import catalog_service
from app.services.combined_catalog_service import combined_catalog_service
from app.services.inventory_service import inventory_service

router = APIRouter(prefix="/catalog", tags=["Catalog & Showroom"])


@router.get("", response_model=list[CatalogItem])
async def list_catalog(
    category: str | None = Query(default=None),
    gender: str | None = Query(default=None),
    db: AsyncIOMotorDatabase | None = Depends(get_database),
):
    return await combined_catalog_service.list_items(db, category=category, gender=gender)


@router.get("/search", response_model=list[CatalogItem])
async def search_catalog(
    q: str | None = Query(default=None, description="Free-text search across name and brand"),
    category: str | None = Query(default=None),
    brand: str | None = Query(default=None),
    gender: str | None = Query(default=None),
    rack_number: str | None = Query(default=None),
    available_only: bool = Query(default=False),
    min_price: float | None = Query(default=None),
    max_price: float | None = Query(default=None),
    db: AsyncIOMotorDatabase | None = Depends(get_database),
):
    """Phase 9 — Smart Showroom search with combined filters."""
    return await combined_catalog_service.search(
        db,
        query=q,
        category=category,
        brand=brand,
        gender=gender,
        rack_number=rack_number,
        available_only=available_only,
        min_price=min_price,
        max_price=max_price,
    )


@router.get("/brands", response_model=list[str])
async def list_brands(db: AsyncIOMotorDatabase | None = Depends(get_database)):
    items = await combined_catalog_service.list_items(db)
    return sorted({item.brand for item in items if item.brand})


@router.get("/rack-locations", response_model=list[str])
async def list_rack_locations(db: AsyncIOMotorDatabase | None = Depends(get_database)):
    items = await combined_catalog_service.list_items(db)
    return sorted({item.rack_number for item in items if item.rack_number})


@router.get("/categories", response_model=list[str])
async def list_categories(db: AsyncIOMotorDatabase | None = Depends(get_database)):
    items = await combined_catalog_service.list_items(db)
    return sorted({item.category for item in items})


@router.get("/{sku}/nearest", response_model=list[CatalogItem])
async def nearest_matches(sku: str, limit: int = 6, db: AsyncIOMotorDatabase | None = Depends(get_database)):
    """Phase 9 — nearest matching products to a given SKU (same category, shared tags/colors)."""
    return await combined_catalog_service.nearest_matches(db, sku, limit=limit)


@router.get("/stats/inventory", response_model=InventoryStats)
async def inventory_statistics(db: AsyncIOMotorDatabase | None = Depends(get_database)):
    """Phase 9 — inventory statistics for the showroom (owner-added items only)."""
    return await inventory_service.compute_stats(db)


@router.post("/seed")
async def seed_catalog(
    db: AsyncIOMotorDatabase | None = Depends(get_database),
    _owner: str = Depends(require_owner),
):
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB is not connected; cannot seed persistent catalog")
    count = await catalog_service.seed_catalog_to_mongo(db)
    return {"seeded": count}


@router.delete("/{sku}")
async def deactivate_catalog_item(
    sku: str,
    db: AsyncIOMotorDatabase | None = Depends(get_database),
    _owner: str = Depends(require_owner),
):
    """Deactivate (soft-remove) a built-in catalog item — future removal of built-in dresses."""
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB is not connected; catalog is read-only in JSON mode")
    success = await catalog_service.deactivate_item(db, sku)
    if not success:
        raise HTTPException(status_code=404, detail="SKU not found")
    return {"sku": sku, "active": False}
