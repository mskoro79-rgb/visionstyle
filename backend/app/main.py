"""VisionStyle API entrypoint."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import analysis, analytics, auth, catalog, dashboard, inventory, preview, recommendations
from app.core.config import get_settings
from app.core.database import mongo_manager

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger("visionstyle.main")

settings = get_settings()

Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.OUTFIT_PREVIEW_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.INVENTORY_IMAGE_DIR).mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await mongo_manager.connect()

    from app.services.owner_service import bootstrap_owner

    await bootstrap_owner(mongo_manager.get_db())

    if mongo_manager.connected:
        from app.services.catalog_service import catalog_service

        count = await catalog_service.seed_catalog_to_mongo(mongo_manager.get_db())
        logger.info("Seeded %d catalog items into MongoDB", count)

    yield

    await mongo_manager.disconnect()


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Personalized Fashion Recommendation System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/media/previews", StaticFiles(directory=settings.OUTFIT_PREVIEW_DIR), name="previews")
app.mount("/media/inventory", StaticFiles(directory=settings.INVENTORY_IMAGE_DIR), name="inventory-images")

app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(analysis.router, prefix=settings.API_V1_PREFIX)
app.include_router(recommendations.router, prefix=settings.API_V1_PREFIX)
app.include_router(catalog.router, prefix=settings.API_V1_PREFIX)
app.include_router(inventory.router, prefix=settings.API_V1_PREFIX)
app.include_router(preview.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "mongodb_connected": mongo_manager.connected,
    }
