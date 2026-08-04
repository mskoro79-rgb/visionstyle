"""Pydantic schemas shared across the API layer."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class FaceShape(str, Enum):
    OVAL = "oval"
    ROUND = "round"
    SQUARE = "square"
    HEART = "heart"
    DIAMOND = "diamond"
    OBLONG = "oblong"
    TRIANGLE = "triangle"


class BodyShape(str, Enum):
    RECTANGLE = "rectangle"
    HOURGLASS = "hourglass"
    PEAR = "pear"
    INVERTED_TRIANGLE = "inverted_triangle"
    APPLE = "apple"
    TRAPEZOID = "trapezoid"


class SkinUndertone(str, Enum):
    WARM = "warm"
    COOL = "cool"
    NEUTRAL = "neutral"


class SkinDepth(str, Enum):
    FAIR = "fair"
    LIGHT = "light"
    MEDIUM = "medium"
    TAN = "tan"
    DEEP = "deep"


class Occasion(str, Enum):
    CASUAL = "casual"
    FORMAL = "formal"
    BUSINESS = "business"
    PARTY = "party"
    WEDDING = "wedding"
    DATE_NIGHT = "date_night"
    SPORT = "sport"
    TRAVEL = "travel"


class Season(str, Enum):
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"


class BudgetTier(str, Enum):
    BUDGET = "budget"
    MID_RANGE = "mid_range"
    PREMIUM = "premium"
    LUXURY = "luxury"


class StylePreference(str, Enum):
    MINIMALIST = "minimalist"
    STREETWEAR = "streetwear"
    CLASSIC = "classic"
    BOHEMIAN = "bohemian"
    EDGY = "edgy"
    ROMANTIC = "romantic"
    SPORTY = "sporty"
    GLAMOROUS = "glamorous"


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    UNISEX = "unisex"


# ---------------------------------------------------------------------------
# AI Analysis
# ---------------------------------------------------------------------------

class Landmark(BaseModel):
    x: float
    y: float
    z: float = 0.0


class FaceMetrics(BaseModel):
    face_width: float
    face_height: float
    jaw_width: float
    forehead_width: float
    cheekbone_width: float
    chin_length: float
    width_to_height_ratio: float


class BodyMetrics(BaseModel):
    shoulder_width: float
    waist_width: float
    hip_width: float
    torso_length: float
    leg_length: float
    shoulder_to_hip_ratio: float
    waist_to_hip_ratio: float
    waist_to_shoulder_ratio: float


class SkinToneResult(BaseModel):
    undertone: SkinUndertone
    depth: SkinDepth
    hex_color: str
    lab_l: float
    lab_a: float
    lab_b: float
    confidence: float


class FaceShapeResult(BaseModel):
    shape: FaceShape
    confidence: float
    metrics: FaceMetrics
    scores: dict[str, float] = Field(default_factory=dict)


class BodyShapeResult(BaseModel):
    shape: BodyShape
    confidence: float
    metrics: BodyMetrics
    scores: dict[str, float] = Field(default_factory=dict)


class DetectionQuality(BaseModel):
    face_detected: bool
    face_detection_confidence: float
    landmarks_detected: bool
    pose_detected: bool
    pose_landmarks_count: int
    image_width: int
    image_height: int
    warnings: List[str] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    session_id: str
    analysis_id: str
    created_at: datetime
    face_shape: FaceShapeResult
    body_shape: Optional[BodyShapeResult] = None
    skin_tone: SkinToneResult
    overall_confidence: float
    detection_quality: DetectionQuality
    image_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Recommendation Engine
# ---------------------------------------------------------------------------

class RecommendationRequest(BaseModel):
    session_id: str
    analysis_id: str
    occasion: Occasion = Occasion.CASUAL
    season: Season = Season.SUMMER
    budget: BudgetTier = BudgetTier.MID_RANGE
    style_preference: StylePreference = StylePreference.CLASSIC
    gender: Gender = Gender.UNISEX


class ColorPaletteEntry(BaseModel):
    name: str
    hex_color: str
    reason: str


class OutfitPiece(BaseModel):
    category: str
    sku: Optional[str] = None
    name: str
    image_url: Optional[str] = None
    color: Optional[str] = None
    price: Optional[float] = None
    reason: str


class RecommendationItem(BaseModel):
    recommendation_id: str
    title: str
    confidence: float
    reason: str
    outfit_pieces: List[OutfitPiece]
    color_palette: List[ColorPaletteEntry]
    accessories: List[OutfitPiece]
    footwear: List[OutfitPiece]
    fashion_tips: List[str]


class RecommendationResponse(BaseModel):
    session_id: str
    analysis_id: str
    generated_at: datetime
    request: RecommendationRequest
    recommendations: List[RecommendationItem]
    overall_reasoning: str


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------

class CatalogItem(BaseModel):
    sku: str
    category: str
    name: str
    brand: Optional[str] = None
    price: float
    currency: str = "USD"
    colors: List[str] = Field(default_factory=list)
    image_url: str
    gender: Gender = Gender.UNISEX
    styles: List[StylePreference] = Field(default_factory=list)
    occasions: List[Occasion] = Field(default_factory=list)
    seasons: List[Season] = Field(default_factory=list)
    budget_tier: BudgetTier = BudgetTier.MID_RANGE
    face_shape_fit: List[FaceShape] = Field(default_factory=list)
    body_shape_fit: List[BodyShape] = Field(default_factory=list)
    active: bool = True


# ---------------------------------------------------------------------------
# Virtual Outfit Preview
# ---------------------------------------------------------------------------

class OutfitPreviewRequest(BaseModel):
    session_id: str
    analysis_id: str
    outfit_skus: List[str]


class OutfitPreviewResponse(BaseModel):
    session_id: str
    preview_id: str
    preview_image_url: str
    engine_used: str
    generated_at: datetime
    disclaimer: str


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class DashboardReport(BaseModel):
    session_id: str
    generated_at: datetime
    analysis: Optional[AnalysisResult] = None
    latest_recommendation: Optional[RecommendationResponse] = None
    latest_preview: Optional[OutfitPreviewResponse] = None
    ai_score: float
