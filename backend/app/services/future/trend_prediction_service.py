"""Phase 14 — trend prediction over recommendation history.

Unlike the other Phase 14 modules, this one is partially real today: it
computes simple week-over-week momentum from the same recommendation
history `AnalyticsService` already aggregates (see
`app/services/analytics_service.py`), which is enough to answer "is this
color/category trending up?" without a dedicated ML pipeline. The
`predict_next_period` stub is the extension point for a real
forecasting model (e.g. a time-series model trained on this same
momentum data) once enough history has accumulated.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.services.session_service import session_service


class TrendPredictionService:
    async def category_momentum(
        self, db: Optional[AsyncIOMotorDatabase], window_days: int = 7
    ) -> dict[str, float]:
        """Returns {category: momentum} where momentum = (recent_count - prior_count) / max(1, prior_count).
        Positive values mean a category is trending up recently vs. the prior window."""
        recommendations = await session_service.list_all_recommendations(db)
        now = datetime.now(timezone.utc)
        recent_cutoff = now - timedelta(days=window_days)
        prior_cutoff = now - timedelta(days=window_days * 2)

        recent_counts: Counter = Counter()
        prior_counts: Counter = Counter()

        for rec_response in recommendations:
            generated_at = rec_response.generated_at
            if generated_at.tzinfo is None:
                generated_at = generated_at.replace(tzinfo=timezone.utc)
            bucket = recent_counts if generated_at >= recent_cutoff else (
                prior_counts if generated_at >= prior_cutoff else None
            )
            if bucket is None:
                continue
            for rec in rec_response.recommendations:
                for piece in rec.outfit_pieces:
                    bucket[piece.category] += 1

        momentum: dict[str, float] = {}
        categories = set(recent_counts) | set(prior_counts)
        for category in categories:
            recent = recent_counts.get(category, 0)
            prior = prior_counts.get(category, 0)
            momentum[category] = round((recent - prior) / max(1, prior), 3)
        return momentum

    async def predict_next_period(self, db: Optional[AsyncIOMotorDatabase]) -> dict[str, float]:
        """Extension point: forecast next-period demand per category/color.

        Today's momentum-based signal is a reasonable proxy at low volume;
        replace with a proper time-series model (e.g. exponential smoothing
        or a small trained model) once there's enough weekly history to fit one.
        """
        raise NotImplementedError(
            "predict_next_period requires sustained historical volume. "
            "Use category_momentum() for a lightweight trend signal in the meantime."
        )


trend_prediction_service = TrendPredictionService()
