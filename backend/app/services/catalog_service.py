"""Catalog access layer: MongoDB-backed when available, JSON-backed otherwise.

This lets the built-in catalog work out of the box (bundled JSON) while
being trivially promotable to a live MongoDB collection — seed once via
`seed_catalog_to_mongo()` and all reads transparently prefer Mongo.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.schemas import CatalogItem

CATALOG_JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "catalog.json"


class CatalogService:
    def __init__(self):
        self._json_cache: list[CatalogItem] | None = None

    def _load_json(self) -> list[CatalogItem]:
        if self._json_cache is None:
            raw = json.loads(CATALOG_JSON_PATH.read_text())
            self._json_cache = [CatalogItem(**item) for item in raw]
        return self._json_cache

    async def seed_catalog_to_mongo(self, db: AsyncIOMotorDatabase) -> int:
        items = self._load_json()
        count = 0
        for item in items:
            await db.catalog_items.update_one(
                {"sku": item.sku}, {"$set": item.model_dump()}, upsert=True
            )
            count += 1
        return count

    async def list_items(
        self,
        db: Optional[AsyncIOMotorDatabase],
        category: Optional[str] = None,
        gender: Optional[str] = None,
        active_only: bool = True,
    ) -> list[CatalogItem]:
        if db is not None:
            query: dict = {}
            if category:
                query["category"] = category
            if gender:
                query["gender"] = {"$in": [gender, "unisex"]}
            if active_only:
                query["active"] = True
            cursor = db.catalog_items.find(query)
            docs = await cursor.to_list(length=1000)
            if docs:
                return [CatalogItem(**{k: v for k, v in doc.items() if k != "_id"}) for doc in docs]

        items = self._load_json()
        filtered = [i for i in items if (not active_only or i.active)]
        if category:
            filtered = [i for i in filtered if i.category == category]
        if gender:
            filtered = [i for i in filtered if i.gender.value in (gender, "unisex")]
        return filtered

    async def get_by_skus(self, db: Optional[AsyncIOMotorDatabase], skus: list[str]) -> list[CatalogItem]:
        all_items = await self.list_items(db, active_only=False)
        sku_set = set(skus)
        return [item for item in all_items if item.sku in sku_set]

    async def deactivate_item(self, db: Optional[AsyncIOMotorDatabase], sku: str) -> bool:
        """Allow future removal of built-in dresses without deleting history."""
        if db is None:
            return False
        result = await db.catalog_items.update_one({"sku": sku}, {"$set": {"active": False}})
        return result.modified_count > 0


catalog_service = CatalogService()
