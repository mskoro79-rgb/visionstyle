"""Phase 10 — Analytics aggregation across all sessions.

Aggregates directly from stored analyses/recommendations rather than
maintaining a separate event log, so analytics stay consistent with
whatever the dashboard/session services already persisted.
"""
from __future__ import annotations

from collections import Counter
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.schemas import AnalyticsSummary
from app.services.inventory_service import inventory_service
from app.services.rating_service import rating_service
from app.services.session_service import session_service


def _top_n(counter: Counter, n: int = 8) -> list[dict]:
    return [{"name": name, "count": count} for name, count in counter.most_common(n)]


class AnalyticsService:
    async def get_summary(self, db: Optional[AsyncIOMotorDatabase]) -> AnalyticsSummary:
        analyses = await session_service.list_all_analyses(db)
        recommendations = await session_service.list_all_recommendations(db)

        face_shape_counter: Counter = Counter()
        body_shape_counter: Counter = Counter()
        for analysis in analyses:
            face_shape_counter[analysis.face_shape.shape.value] += 1
            if analysis.body_shape:
                body_shape_counter[analysis.body_shape.shape.value] += 1

        color_counter: Counter = Counter()
        brand_counter: Counter = Counter()
        category_counter: Counter = Counter()
        confidences: list[float] = []

        for rec_response in recommendations:
            for rec in rec_response.recommendations:
                confidences.append(rec.confidence)
                for entry in rec.color_palette:
                    color_counter[entry.hex_color] += 1
                for piece in [*rec.outfit_pieces, *rec.accessories, *rec.footwear]:
                    category_counter[piece.category] += 1
                    # Brand isn't on OutfitPiece; inferred from name is unreliable, so
                    # brand popularity is tracked at the catalog/inventory level instead.

        inventory_stats = await inventory_service.compute_stats(db)
        for brand, count in inventory_stats.by_brand.items():
            brand_counter[brand] += count

        accuracy = round(sum(confidences) / len(confidences), 3) if confidences else 0.0
        average_rating = await rating_service.get_average_rating(db)

        return AnalyticsSummary(
            total_analyses=len(analyses),
            total_recommendations=len(recommendations),
            most_recommended_colors=_top_n(color_counter),
            most_recommended_brands=_top_n(brand_counter),
            most_recommended_categories=_top_n(category_counter),
            popular_face_shapes=_top_n(face_shape_counter, n=7),
            popular_body_shapes=_top_n(body_shape_counter, n=6),
            recommendation_accuracy=accuracy,
            average_rating=average_rating,
            inventory_status=inventory_stats,
        )


analytics_service = AnalyticsService()
