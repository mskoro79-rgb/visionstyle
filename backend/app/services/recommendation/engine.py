"""Rule-based, explainable recommendation engine.

Every recommendation is scored from concrete signals (face shape, body
shape, skin tone undertone/depth, occasion, season, budget, style) and
every returned item carries a human-readable "reason" string built from
the same signals that drove its score — never a static/canned response.

Phase 11 extends the original single-outfit engine into a diversity-aware
generator: instead of always returning the single argmax item per
category (which produces the same outfit every time), it samples from a
weighted pool of high-confidence candidates so ten *different*, still
well-scored outfits come back, each with its own transparent score
breakdown (fashion / color-harmony / body-fit / occasion-match).
"""
from __future__ import annotations

import json
import random
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
    ScoreBreakdown,
)
from app.services.combined_catalog_service import combined_catalog_service

PALETTES_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "color_palettes.json"

CORE_CATEGORIES = ["shirts", "tshirts", "pants", "jeans", "jackets"]
MAX_RECOMMENDATIONS = 10
CANDIDATE_POOL_SIZE = 6  # top-K per category considered "high confidence"

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

# Rough color-name families used for the color-harmony heuristic — catalog
# colors are plain names (not hex), so harmony is judged by family rather
# than exact hex distance to the LAB-derived palette.
WARM_COLOR_NAMES = {"gold", "crimson", "burgundy", "olive", "orange", "ivory", "burnt orange", "tan"}
COOL_COLOR_NAMES = {"purple", "emerald", "navy", "charcoal", "silver"}
NEUTRAL_COLOR_NAMES = {"black", "white", "ivory", "charcoal", "grey", "gray"}


class ScoredItem:
    __slots__ = ("item", "score", "reasons")

    def __init__(self, item: CatalogItem, score: float, reasons: list[str]):
        self.item = item
        self.score = score
        self.reasons = reasons


class RecommendationEngine:
    def __init__(self):
        self._palettes = json.loads(PALETTES_PATH.read_text())

    # -- Color palette -----------------------------------------------------

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

    # -- Per-item scoring ----------------------------------------------------

    def _score_item(
        self,
        item: CatalogItem,
        analysis: AnalysisResult,
        request: RecommendationRequest,
    ) -> ScoredItem:
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

        if self._color_harmonizes(item, analysis.skin_tone.undertone.value):
            score += 1.5
            reasons.append(f"its color palette harmonizes with your {analysis.skin_tone.undertone.value} undertone")

        if item.source.value == "inventory" and item.available and item.stock_quantity > 0:
            score += 0.5  # slight preference for in-stock, owner-curated pieces the shopper can actually buy today

        return ScoredItem(item=item, score=score, reasons=reasons)

    @staticmethod
    def _color_harmonizes(item: CatalogItem, undertone: str) -> bool:
        names = {c.lower() for c in item.colors}
        if names & NEUTRAL_COLOR_NAMES:
            return True
        if undertone == "warm":
            return bool(names & WARM_COLOR_NAMES)
        if undertone == "cool":
            return bool(names & COOL_COLOR_NAMES)
        return bool(names & (WARM_COLOR_NAMES | COOL_COLOR_NAMES))

    # -- Diversity-aware outfit generation (Phase 11) -----------------------

    @staticmethod
    def _weighted_sample_without_replacement(pool: list[ScoredItem], rng: random.Random) -> ScoredItem:
        """Softmax-weighted pick so higher-scoring candidates are favored but
        not deterministic — this is what keeps outfit #1 and #7 from being
        the exact same shirt every time."""
        if len(pool) == 1:
            return pool[0]
        weights = [max(0.05, s.score) ** 1.5 for s in pool]  # emphasize higher scores without zeroing out the rest
        return rng.choices(pool, weights=weights, k=1)[0]

    def _score_breakdown(
        self,
        pieces: list[ScoredItem],
        analysis: AnalysisResult,
        request: RecommendationRequest,
    ) -> ScoreBreakdown:
        if not pieces:
            return ScoreBreakdown(fashion_score=0, color_harmony_score=0, body_fit_score=0, occasion_match_score=0, explanation=[])

        max_possible_per_item = 3.0 + 2.0 + 2.5 + 2.5 + 1.0 + 2.0 + 2.0 + 1.5  # see _score_item ceiling
        fashion_score = round(min(100.0, sum(p.score for p in pieces) / (len(pieces) * max_possible_per_item) * 100 * 2.2), 1)

        harmonized = sum(1 for p in pieces if self._color_harmonizes(p.item, analysis.skin_tone.undertone.value))
        color_harmony_score = round(harmonized / len(pieces) * 100, 1)

        if analysis.body_shape:
            fit_matches = sum(
                1 for p in pieces if analysis.body_shape.shape.value in [b.value for b in p.item.body_shape_fit]
            )
            body_fit_score = round(fit_matches / len(pieces) * 100, 1)
        else:
            body_fit_score = 60.0  # neutral default — no body-shape signal available

        occasion_matches = sum(
            1 for p in pieces if request.occasion.value in [o.value for o in p.item.occasions]
        )
        season_matches = sum(1 for p in pieces if request.season.value in [s.value for s in p.item.seasons])
        occasion_match_score = round(((occasion_matches + season_matches) / (len(pieces) * 2)) * 100, 1)

        top_reasons = sorted(pieces, key=lambda p: p.score, reverse=True)[:3]
        explanation = [
            f"{p.item.name}: {', '.join(p.reasons) if p.reasons else 'a versatile, well-rounded choice'}"
            for p in top_reasons
        ]

        return ScoreBreakdown(
            fashion_score=fashion_score,
            color_harmony_score=color_harmony_score,
            body_fit_score=body_fit_score,
            occasion_match_score=occasion_match_score,
            explanation=explanation,
        )

    async def generate(
        self,
        analysis: AnalysisResult,
        request: RecommendationRequest,
        db: Optional[AsyncIOMotorDatabase],
    ) -> RecommendationResponse:
        all_items = await combined_catalog_service.list_items(
            db, gender=request.gender.value if request.gender.value != "unisex" else None
        )

        by_category: dict[str, list[ScoredItem]] = {}
        for item in all_items:
            scored = self._score_item(item, analysis, request)
            by_category.setdefault(item.category, []).append(scored)

        for category in by_category:
            by_category[category].sort(key=lambda s: s.score, reverse=True)
            by_category[category] = by_category[category][:CANDIDATE_POOL_SIZE]

        color_palette = self._build_color_palette(analysis.skin_tone.undertone.value, analysis.skin_tone.depth.value)
        face_guidance = FACE_SHAPE_GUIDANCE.get(analysis.face_shape.shape, "")
        body_guidance = BODY_SHAPE_GUIDANCE.get(analysis.body_shape.shape, "") if analysis.body_shape else ""

        rng = random.Random()
        seen_combos: set[frozenset[str]] = set()
        recommendations: list[RecommendationItem] = []

        # Bounded attempts so a thin catalog (few candidates) doesn't spin forever
        # trying to hit MAX_RECOMMENDATIONS unique combinations.
        max_attempts = MAX_RECOMMENDATIONS * 8
        attempts = 0

        while len(recommendations) < MAX_RECOMMENDATIONS and attempts < max_attempts:
            attempts += 1
            outfit_scored: list[ScoredItem] = []
            for category in CORE_CATEGORIES:
                pool = by_category.get(category)
                if not pool:
                    continue
                outfit_scored.append(self._weighted_sample_without_replacement(pool, rng))

            if not outfit_scored:
                break  # catalog has none of the core categories at all

            combo_key = frozenset(s.item.sku for s in outfit_scored)
            if combo_key in seen_combos:
                continue
            seen_combos.add(combo_key)

            outfit_pieces = [
                OutfitPiece(
                    category=s.item.category,
                    sku=s.item.sku,
                    name=s.item.name,
                    image_url=s.item.image_url,
                    color=s.item.colors[0] if s.item.colors else None,
                    price=s.item.price,
                    reason=(f"Selected because it {', '.join(s.reasons)}." if s.reasons else "A versatile addition to your wardrobe."),
                )
                for s in outfit_scored
            ]

            footwear_pool = by_category.get("shoes", [])
            footwear_scored = [self._weighted_sample_without_replacement(footwear_pool, rng)] if footwear_pool else []
            footwear = [
                OutfitPiece(
                    category="shoes", sku=s.item.sku, name=s.item.name, image_url=s.item.image_url,
                    color=s.item.colors[0] if s.item.colors else None, price=s.item.price,
                    reason=(f"Chosen because it {', '.join(s.reasons)}." if s.reasons else "A reliable footwear pairing."),
                )
                for s in footwear_scored
            ]

            accessories_scored: list[ScoredItem] = []
            for cat in ["watches", "belts"]:
                pool = by_category.get(cat, [])
                if pool:
                    accessories_scored.append(self._weighted_sample_without_replacement(pool, rng))
            accessories = [
                OutfitPiece(
                    category=s.item.category, sku=s.item.sku, name=s.item.name, image_url=s.item.image_url,
                    color=s.item.colors[0] if s.item.colors else None, price=s.item.price,
                    reason=(f"Added because it {', '.join(s.reasons)}." if s.reasons else "Completes the look."),
                )
                for s in accessories_scored
            ]

            all_scored_pieces = [*outfit_scored, *footwear_scored, *accessories_scored]
            scores = self._score_breakdown(all_scored_pieces, analysis, request)

            avg_item_score = sum(s.score for s in outfit_scored) / len(outfit_scored)
            confidence = round(
                min(0.98, max(0.3, 0.5 * analysis.overall_confidence + 0.5 * min(1.0, avg_item_score / 12.0))), 3
            )

            fashion_tips = [tip for tip in [
                face_guidance,
                body_guidance,
                f"Your {analysis.skin_tone.undertone.value} undertone pairs best with the {analysis.skin_tone.depth.value}-toned palette shown above — avoid stark opposites that wash you out.",
                f"For a {request.occasion.value.replace('_', ' ')} occasion in {request.season.value}, prioritize breathable layering pieces over heavy single garments.",
            ] if tip]

            featured_piece = max(outfit_scored, key=lambda s: s.score).item
            title = f"{featured_piece.name} {request.occasion.value.replace('_', ' ').title()} Look"

            reasoning_parts = [
                f"Built from your {analysis.face_shape.shape.value} face shape (confidence {analysis.face_shape.confidence:.0%})",
            ]
            if analysis.body_shape:
                reasoning_parts.append(f"your {analysis.body_shape.shape.value} body shape (confidence {analysis.body_shape.confidence:.0%})")
            reasoning_parts.append(
                f"your {analysis.skin_tone.depth.value} skin tone with {analysis.skin_tone.undertone.value} undertone, "
                f"and your stated preferences for {request.occasion.value.replace('_', ' ')} occasions, "
                f"{request.style_preference.value} style, {request.season.value} season, and a {request.budget.value.replace('_', ' ')} budget."
            )
            reason = ", ".join(reasoning_parts[:-1]) + ", " + reasoning_parts[-1] if len(reasoning_parts) > 1 else reasoning_parts[0]

            recommendations.append(
                RecommendationItem(
                    recommendation_id=f"rec_{uuid.uuid4().hex}",
                    title=title,
                    confidence=confidence,
                    reason=reason,
                    outfit_pieces=outfit_pieces,
                    color_palette=color_palette,
                    accessories=accessories,
                    footwear=footwear,
                    fashion_tips=fashion_tips,
                    scores=scores,
                )
            )

        # Highest-confidence, most-diverse outfits first.
        recommendations.sort(key=lambda r: r.confidence, reverse=True)

        overall_reasoning = (
            recommendations[0].reason if recommendations else "No catalog items matched the current filters closely enough to build a recommendation."
        )

        return RecommendationResponse(
            session_id=request.session_id,
            analysis_id=request.analysis_id,
            generated_at=datetime.now(timezone.utc),
            request=request,
            recommendations=recommendations,
            overall_reasoning=overall_reasoning,
        )


recommendation_engine = RecommendationEngine()
