"""Merges the preloaded catalog with owner-added inventory into one pool.

This is the read surface the recommendation engine and the Smart Showroom
use — both `CatalogService` (built-in, Phase 6) and `InventoryService`
(owner-managed, Phase 8) independently store/track their own items, but
shoppers should never have to care which pool a product came from.
"""
from __future__ import annotations

from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.schemas import CatalogItem
from app.services.catalog_service import catalog_service
from app.services.inventory_service import inventory_service


class CombinedCatalogService:
    async def list_items(
        self,
        db: Optional[AsyncIOMotorDatabase],
        category: Optional[str] = None,
        gender: Optional[str] = None,
        active_only: bool = True,
    ) -> list[CatalogItem]:
        preloaded = await catalog_service.list_items(db, category=category, gender=gender, active_only=active_only)
        owned = await inventory_service.list_items(db, category=category, active_only=active_only)
        if gender:
            owned = [i for i in owned if i.gender.value in (gender, "unisex")]
        return [*preloaded, *owned]

    async def search(
        self,
        db: Optional[AsyncIOMotorDatabase],
        query: Optional[str] = None,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        gender: Optional[str] = None,
        rack_number: Optional[str] = None,
        available_only: bool = False,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
    ) -> list[CatalogItem]:
        items = await self.list_items(db, category=category, gender=gender)

        if query:
            q = query.lower()
            items = [i for i in items if q in i.name.lower() or (i.brand and q in i.brand.lower())]
        if brand:
            items = [i for i in items if i.brand and i.brand.lower() == brand.lower()]
        if rack_number:
            items = [i for i in items if i.rack_number == rack_number]
        if available_only:
            # Preloaded catalog items are always considered available (no live stock
            # tracking); owner inventory must be explicitly marked available with stock.
            items = [
                i for i in items
                if i.source.value == "catalog" or (i.available and i.stock_quantity > 0)
            ]
        if min_price is not None:
            items = [i for i in items if i.price >= min_price]
        if max_price is not None:
            items = [i for i in items if i.price <= max_price]
        return items

    async def get_by_skus(self, db: Optional[AsyncIOMotorDatabase], skus: list[str]) -> list[CatalogItem]:
        preloaded = await catalog_service.get_by_skus(db, skus)
        found_skus = {i.sku for i in preloaded}
        remaining = [s for s in skus if s not in found_skus]
        owned = [await inventory_service.get_item(db, s) for s in remaining]
        return [*preloaded, *[o for o in owned if o is not None]]

    async def nearest_matches(
        self, db: Optional[AsyncIOMotorDatabase], sku: str, limit: int = 6
    ) -> list[CatalogItem]:
        """Phase 9 — 'nearest matching products' for a given item: same category,
        ranked by shared style/occasion/season/budget tags and color overlap."""
        all_items = await self.list_items(db)
        target = next((i for i in all_items if i.sku == sku), None)
        if target is None:
            return []

        def similarity(other: CatalogItem) -> float:
            if other.sku == target.sku or other.category != target.category:
                return -1.0
            score = 0.0
            score += len(set(other.styles) & set(target.styles)) * 2
            score += len(set(other.occasions) & set(target.occasions))
            score += len(set(other.seasons) & set(target.seasons))
            score += 2 if other.budget_tier == target.budget_tier else 0
            score += len(set(other.colors) & set(target.colors))
            score += 1 if other.brand == target.brand else 0
            return score

        candidates = [(item, similarity(item)) for item in all_items]
        candidates = [c for c in candidates if c[1] >= 0]
        candidates.sort(key=lambda c: c[1], reverse=True)
        return [item for item, _ in candidates[:limit]]


combined_catalog_service = CombinedCatalogService()
