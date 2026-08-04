"""Fashion catalog endpoints (built-in JSON catalog, Mongo-backed once seeded)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.models.schemas import CatalogItem
from app.services.catalog_service import catalog_service

router = APIRouter(prefix="/catalog", tags=["Catalog"])


@router.get("", response_model=list[CatalogItem])
async def list_catalog(
    category: str | None = Query(default=None),
    gender: str | None = Query(default=None),
    db: AsyncIOMotorDatabase | None = Depends(get_database),
):
    return await catalog_service.list_items(db, category=category, gender=gender)


@router.get("/categories", response_model=list[str])
async def list_categories(db: AsyncIOMotorDatabase | None = Depends(get_database)):
    items = await catalog_service.list_items(db)
    return sorted({item.category for item in items})


@router.post("/seed")
async def seed_catalog(db: AsyncIOMotorDatabase | None = Depends(get_database)):
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB is not connected; cannot seed persistent catalog")
    count = await catalog_service.seed_catalog_to_mongo(db)
    return {"seeded": count}


@router.delete("/{sku}")
async def deactivate_catalog_item(sku: str, db: AsyncIOMotorDatabase | None = Depends(get_database)):
    """Deactivate (soft-remove) a built-in catalog item — future removal of built-in dresses."""
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB is not connected; catalog is read-only in JSON mode")
    success = await catalog_service.deactivate_item(db, sku)
    if not success:
        raise HTTPException(status_code=404, detail="SKU not found")
    return {"sku": sku, "active": False}
