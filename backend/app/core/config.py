"""Application-wide configuration loaded from environment variables."""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "VisionStyle API"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "visionstyle"

    # Uploads
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    UPLOAD_DIR: str = "app/data/uploads"
    OUTFIT_PREVIEW_DIR: str = "app/data/previews"

    # CV / AI
    FACE_DETECTION_CONFIDENCE: float = 0.6
    POSE_DETECTION_CONFIDENCE: float = 0.5

    # Virtual try-on backend engine.
    # "composite" = lightweight in-house compositor (default, no GPU needed)
    # "idm_vton" | "catvton" | "stable_viton" = future pluggable diffusion-based engines
    VTON_ENGINE: str = "composite"


@lru_cache
def get_settings() -> Settings:
    return Settings()
