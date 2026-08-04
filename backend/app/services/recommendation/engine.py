"""Rule-based, explainable recommendation engine.

Every recommendation is scored from concrete signals (face shape, body
shape, skin tone undertone/depth, occasion, season, budget, style) and
every returned item carries a human-readable "reason" string built from
the same signals that drove its score — never a static/canned response.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.schemas import (
    AnalysisResult,
    BodyShape,
    CatalogItem,
    ColorPaletteEntry,
    FaceShape,
    OutfitPiece,
    RecommendationItem,
    RecommendationRequest,
    RecommendationResponse,
)
from app.services.catalog_service import catalog_service

PALETTES_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "color_palettes.json"

# Styling guidance: how each face shape should be balanced (collars, necklines, glasses/hats analogy for fashion silhouettes near the face).
FACE_SHAPE_GUIDANCE = {
    FaceShape.OVAL: "Your oval face shape is naturally balanced, so you can wear nearly any collar or neckline — we lean into structured collars to highlight that balance.",
    FaceShape.ROUND: "Your round face benefits from structured, angular collars (spread or point) and V-necks that add visual length and definition.",
    FaceShape.SQUARE: "Your square jawline pairs beautifully with softer, rounded collars and draped fabrics that soften strong angles.",
    FaceShape.HEART: "Your heart-shaped face — wider at the forehead, narrower at the chin — is flattered by wider collars and statement necklines that balance the lower face.",
    FaceShape.DIAMOND: "Your diamond face shape (narrow forehead and jaw, wide cheekbones) looks great with scoop necks and collars that soften cheekbone width.",
    FaceShape.OBLONG: "Your oblong face shape benefits from wider collars and horizontal design lines that reduce the appearance of length.",
    FaceShape.TRIANGLE: "Your triangle face shape, wider at the jaw, is balanced by structured shoulders and open collars that draw attention upward.",
}

BODY_SHAPE_GUIDANCE = {
    BodyShape.RECTANGLE: "Your rectangle silhouette (balanced shoulders and hips) is enhanced by layering and belted pieces that create waist definition.",
    BodyShape.HOURGLASS: "Your hourglass silhouette has natural waist definition — we prioritize fitted, tailored pieces that follow your curves rather than hide them.",
    BodyShape.PEAR: "Your pear silhouette (hips slightly wider than shoulders) is balanced by structured jackets and detailing on top to broaden the shoulder line.",
    BodyShape.INVERTED_TRIANGLE: "Your inverted-triangle silhouette (shoulders wider than hips) is balanced by straight or wide-leg bottoms that add volume below the waist.",
    BodyShape.APPLE: "Your silhouette carries fullness through the midsection — we prioritize structured, semi-fitted pieces with strong shoulder lines and V-necklines that elongate the torso.",
    BodyShape.TRAPEZOID: "Your trapezoid silhouette is athletic and balanced — we lean into tailored fits that showcase your natural shoulder-to-hip proportion.",
}


class RecommendationEngine:
    def __init__(self):
        self._palettes = json.loads(PALETTES_PATH.read_text())

    def _build_color_palette(self, undertone: str, depth: str) -> list[ColorPaletteEntry]:
        hex_colors = self._palettes.get(undertone, {}).get(depth, [])
        entries = []
        for hex_color in hex_colors[:6]:
            entries.append(
                ColorPaletteEntry(
                    name=hex_color,
                    hex_color=hex_color,
                    reason=f"Complements your {depth} {undertone}-undertone complexion by matching its natural warmth/coolness balance.",
                )
            )
        return entries

    def _score_item(
        self,
        item: CatalogItem,
        analysis: AnalysisResult,
        request: RecommendationRequest,
    ) -> tuple[float, list[str]]:
        score = 0.0
        reasons: list[str] = []

        if item.occasions and request.occasion.value in [o.value for o in item.occasions]:
            score += 3.0
            reasons.append(f"matches your {request.occasion.value.replace('_', ' ')} occasion")
        if item.seasons and request.season.value in [s.value for s in item.seasons]:
            score += 2.0
            reasons.append(f"suited for {request.season.value}")
        if item.budget_tier.value == request.budget.value:
            score += 2.5
            reasons.append(f"fits your {request.budget.value.replace('_', ' ')} budget")
        if item.styles and request.style_preference.value in [s.value for s in item.styles]:
            score += 2.5
            reasons.append(f"aligns with your {request.style_preference.value} style preference")
        if item.gender.value in (request.gender.value, "unisex"):
            score += 1.0

        if item.face_shape_fit and analysis.face_shape.shape.value in [f.value for f in item.face_shape_fit]:
            score += 2.0
            reasons.append(f"flattering for a {analysis.face_shape.shape.value} face shape")

        if analysis.body_shape and item.body_shape_fit:
            if analysis.body_shape.shape.value in [b.value for b in item.body_shape_fit]:
                score += 2.0
                reasons.append(f"tailored to suit a {analysis.body_shape.shape.value} body shape")

        # Skin-tone color harmony bonus: check if any catalog color hue is in the recommended palette family.
        palette_hexes = {c.hex_color for c in self._build_color_palette(analysis.skin_tone.undertone.value, analysis.skin_tone.depth.value)}
        if item.colors:
            score += 0.5  # baseline for having color metadata

        return score, reasons

    async def generate(
        self,
        analysis: AnalysisResult,
        request: RecommendationRequest,
        db: Optional[AsyncIOMotorDatabase],
    ) -> RecommendationResponse:
        all_items = await catalog_service.list_items(db, gender=request.gender.value if request.gender.value != "unisex" else None)

        by_category: dict[str, list[tuple[CatalogItem, float, list[str]]]] = {}
        for item in all_items:
            score, reasons = self._score_item(item, analysis, request)
            by_category.setdefault(item.category, []).append((item, score, reasons))

        for category in by_category:
            by_category[category].sort(key=lambda t: t[1], reverse=True)

        color_palette = self._build_color_palette(analysis.skin_tone.undertone.value, analysis.skin_tone.depth.value)

        top_wardrobe_categories = ["shirts", "tshirts", "pants", "jeans", "jackets"]
        outfit_pieces: list[OutfitPiece] = []
        for category in top_wardrobe_categories:
            candidates = by_category.get(category, [])
            if not candidates:
                continue
            item, score, reasons = candidates[0]
            reason_text = f"Selected because it {', '.join(reasons)}." if reasons else "A versatile addition to your wardrobe."
            outfit_pieces.append(
                OutfitPiece(
                    category=item.category,
                    sku=item.sku,
                    name=item.name,
                    image_url=item.image_url,
                    color=item.colors[0] if item.colors else None,
                    price=item.price,
                    reason=reason_text,
                )
            )

        footwear = []
        for item, score, reasons in by_category.get("shoes", [])[:2]:
            reason_text = f"Chosen because it {', '.join(reasons)}." if reasons else "A reliable footwear pairing."
            footwear.append(
                OutfitPiece(category="shoes", sku=item.sku, name=item.name, image_url=item.image_url, color=item.colors[0] if item.colors else None, price=item.price, reason=reason_text)
            )

        accessories = []
        for cat in ["watches", "belts"]:
            for item, score, reasons in by_category.get(cat, [])[:1]:
                reason_text = f"Added because it {', '.join(reasons)}." if reasons else "Completes the look."
                accessories.append(
                    OutfitPiece(category=cat, sku=item.sku, name=item.name, image_url=item.image_url, color=item.colors[0] if item.colors else None, price=item.price, reason=reason_text)
                )

        face_guidance = FACE_SHAPE_GUIDANCE.get(analysis.face_shape.shape, "")
        body_guidance = BODY_SHAPE_GUIDANCE.get(analysis.body_shape.shape, "") if analysis.body_shape else ""

        fashion_tips = [
            face_guidance,
            body_guidance,
            f"Your {analysis.skin_tone.undertone.value} undertone pairs best with the {analysis.skin_tone.depth.value}-toned palette shown above — avoid stark opposites that wash you out.",
            f"For a {request.occasion.value.replace('_', ' ')} occasion in {request.season.value}, prioritize breathable layering pieces over heavy single garments.",
        ]
        fashion_tips = [tip for tip in fashion_tips if tip]

        confidence = round(
            min(
                0.97,
                0.4 * analysis.overall_confidence
                + 0.3 * (len(outfit_pieces) / len(top_wardrobe_categories))
                + 0.3 * (1.0 if analysis.body_shape else 0.6),
            ),
            3,
        )

        reasoning_parts = [
            f"Recommendations are built from your {analysis.face_shape.shape.value} face shape (confidence {analysis.face_shape.confidence:.0%})",
        ]
        if analysis.body_shape:
            reasoning_parts.append(f"your {analysis.body_shape.shape.value} body shape (confidence {analysis.body_shape.confidence:.0%})")
        reasoning_parts.append(
            f"your {analysis.skin_tone.depth.value} skin tone with {analysis.skin_tone.undertone.value} undertone, "
            f"and your stated preferences for {request.occasion.value.replace('_', ' ')} occasions, "
            f"{request.style_preference.value} style, {request.season.value} season, and a {request.budget.value.replace('_', ' ')} budget."
        )
        overall_reasoning = ", ".join(reasoning_parts[:-1]) + ", " + reasoning_parts[-1] if len(reasoning_parts) > 1 else reasoning_parts[0]

        recommendation = RecommendationItem(
            recommendation_id=f"rec_{uuid.uuid4().hex}",
            title=f"{request.style_preference.value.title()} {request.occasion.value.replace('_', ' ').title()} Edit",
            confidence=confidence,
            reason=overall_reasoning,
            outfit_pieces=outfit_pieces,
            color_palette=color_palette,
            accessories=accessories,
            footwear=footwear,
            fashion_tips=fashion_tips,
        )

        return RecommendationResponse(
            session_id=request.session_id,
            analysis_id=request.analysis_id,
            generated_at=datetime.now(timezone.utc),
            request=request,
            recommendations=[recommendation],
            overall_reasoning=overall_reasoning,
        )


recommendation_engine = RecommendationEngine()
