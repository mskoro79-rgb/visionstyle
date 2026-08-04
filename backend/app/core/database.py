"""MongoDB connection management using Motor (async driver).

The app is designed to run fully even if MongoDB is unreachable: catalog
data falls back to bundled JSON and analysis/recommendation results are
simply not persisted. This keeps local development (e.g. no MongoDB
Compass running yet) frictionless while remaining production-ready once a
real cluster is configured via MONGODB_URI.
"""
import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import PyMongoError

from app.core.config import get_settings

logger = logging.getLogger("visionstyle.database")

settings = get_settings()


class MongoManager:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None
    connected: bool = False

    async def connect(self) -> None:
        try:
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=3000,
            )
            await self.client.admin.command("ping")
            self.db = self.client[settings.MONGODB_DB_NAME]
            self.connected = True
            logger.info("Connected to MongoDB at %s (db=%s)", settings.MONGODB_URI, settings.MONGODB_DB_NAME)
            await self._ensure_indexes()
        except (PyMongoError, Exception) as exc:  # noqa: BLE001
            self.connected = False
            logger.warning(
                "MongoDB unavailable (%s). Falling back to in-memory/JSON mode. "
                "Start MongoDB Compass / a mongod instance and set MONGODB_URI to enable persistence.",
                exc,
            )

    async def _ensure_indexes(self) -> None:
        if self.db is None:
            return
        await self.db.sessions.create_index("session_id", unique=True)
        await self.db.analyses.create_index("session_id")
        await self.db.recommendations.create_index("session_id")
        await self.db.catalog_items.create_index("category")
        await self.db.catalog_items.create_index("sku", unique=True)
        await self.db.owners.create_index("email", unique=True)
        await self.db.inventory_items.create_index("sku", unique=True)
        await self.db.inventory_items.create_index("category")
        await self.db.inventory_items.create_index("rack_number")
        await self.db.outfit_ratings.create_index([("session_id", 1), ("recommendation_id", 1)], unique=True)

    async def disconnect(self) -> None:
        if self.client is not None:
            self.client.close()
            self.connected = False
            logger.info("Disconnected from MongoDB")

    def get_db(self) -> AsyncIOMotorDatabase | None:
        return self.db if self.connected else None


mongo_manager = MongoManager()


def get_database() -> AsyncIOMotorDatabase | None:
    """FastAPI dependency returning the active DB handle, or None if Mongo is offline."""
    return mongo_manager.get_db()
