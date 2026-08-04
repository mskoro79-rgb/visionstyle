"""Owner-managed inventory (Phase 8): MongoDB-backed CRUD with an in-memory
fallback so the owner dashboard remains usable without a live MongoDB
connection (consistent with every other service in this codebase).

Kept as a distinct collection/pool from the preloaded `catalog_service` so
"preloaded catalog" and "owner-added inventory" stay conceptually separate,
per the product spec — `combined_catalog_service` is what merges them for
recommendations/showroom queries.
"""
from __future__ import annotations

import uuid
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.schemas import CatalogItem, CatalogSource, InventoryItemCreate, InventoryItemUpdate, InventoryStats

_in_memory_inventory: dict[str, dict] = {}


def _generate_sku(category: str) -> str:
    return f"INV-{category[:3].upper()}-{uuid.uuid4().hex[:8].upper()}"


class InventoryService:
    async def create_item(
        self, db: Optional[AsyncIOMotorDatabase], payload: InventoryItemCreate, image_urls: list[str]
    ) -> CatalogItem:
        sku = _generate_sku(payload.category)
        item = CatalogItem(
            sku=sku,
            category=payload.category,
            name=payload.name,
            brand=payload.brand,
            price=payload.price,
            currency=payload.currency,
            colors=payload.colors,
            image_url=image_urls[0] if image_urls else "",
            images=image_urls,
            gender=payload.gender,
            styles=payload.styles,
            occasions=payload.occasions,
            seasons=payload.seasons,
            budget_tier=payload.budget_tier,
            face_shape_fit=payload.face_shape_fit,
            body_shape_fit=payload.body_shape_fit,
            active=True,
            source=CatalogSource.INVENTORY,
            rack_number=payload.rack_number,
            sizes=payload.sizes,
            stock_quantity=payload.stock_quantity,
            available=payload.available,
        )
        doc = item.model_dump(mode="json")
        if db is not None:
            await db.inventory_items.insert_one(doc)
        _in_memory_inventory[sku] = doc
        return item

    async def list_items(
        self,
        db: Optional[AsyncIOMotorDatabase],
        category: Optional[str] = None,
        active_only: bool = True,
    ) -> list[CatalogItem]:
        if db is not None:
            query: dict = {}
            if category:
                query["category"] = category
            if active_only:
                query["active"] = True
            docs = await db.inventory_items.find(query).to_list(length=5000)
            return [CatalogItem(**{k: v for k, v in doc.items() if k != "_id"}) for doc in docs]

        items = [CatalogItem(**doc) for doc in _in_memory_inventory.values()]
        if active_only:
            items = [i for i in items if i.active]
        if category:
            items = [i for i in items if i.category == category]
        return items

    async def get_item(self, db: Optional[AsyncIOMotorDatabase], sku: str) -> Optional[CatalogItem]:
        if db is not None:
            doc = await db.inventory_items.find_one({"sku": sku})
            if doc:
                doc.pop("_id", None)
                return CatalogItem(**doc)
        doc = _in_memory_inventory.get(sku)
        return CatalogItem(**doc) if doc else None

    async def update_item(
        self, db: Optional[AsyncIOMotorDatabase], sku: str, payload: InventoryItemUpdate
    ) -> Optional[CatalogItem]:
        existing = await self.get_item(db, sku)
        if existing is None:
            return None
        updates = payload.model_dump(exclude_unset=True)
        updated = existing.model_copy(update=updates)
        doc = updated.model_dump(mode="json")
        if db is not None:
            await db.inventory_items.update_one({"sku": sku}, {"$set": doc})
        _in_memory_inventory[sku] = doc
        return updated

    async def add_images(
        self, db: Optional[AsyncIOMotorDatabase], sku: str, image_urls: list[str]
    ) -> Optional[CatalogItem]:
        existing = await self.get_item(db, sku)
        if existing is None:
            return None
        merged_images = [*existing.images, *image_urls]
        updated = existing.model_copy(update={"images": merged_images, "image_url": existing.image_url or merged_images[0]})
        doc = updated.model_dump(mode="json")
        if db is not None:
            await db.inventory_items.update_one({"sku": sku}, {"$set": doc})
        _in_memory_inventory[sku] = doc
        return updated

    async def delete_item(self, db: Optional[AsyncIOMotorDatabase], sku: str) -> bool:
        """Hard delete — owner-added inventory can be fully removed (unlike built-in catalog, which is soft-deactivated)."""
        removed_memory = _in_memory_inventory.pop(sku, None) is not None
        if db is not None:
            result = await db.inventory_items.delete_one({"sku": sku})
            return result.deleted_count > 0 or removed_memory
        return removed_memory

    async def compute_stats(self, db: Optional[AsyncIOMotorDatabase]) -> InventoryStats:
        items = await self.list_items(db, active_only=False)
        by_category: dict[str, int] = {}
        by_brand: dict[str, int] = {}
        by_rack: dict[str, int] = {}
        available_count = 0
        active_count = 0
        out_of_stock = 0
        total_units = 0

        for item in items:
            by_category[item.category] = by_category.get(item.category, 0) + 1
            if item.brand:
                by_brand[item.brand] = by_brand.get(item.brand, 0) + 1
            if item.rack_number:
                by_rack[item.rack_number] = by_rack.get(item.rack_number, 0) + 1
            if item.active:
                active_count += 1
            if item.available and item.stock_quantity > 0:
                available_count += 1
            if item.stock_quantity <= 0:
                out_of_stock += 1
            total_units += item.stock_quantity

        return InventoryStats(
            total_items=len(items),
            active_items=active_count,
            available_items=available_count,
            out_of_stock_items=out_of_stock,
            by_category=by_category,
            by_brand=by_brand,
            by_rack=by_rack,
            total_stock_units=total_units,
        )


inventory_service = InventoryService()
