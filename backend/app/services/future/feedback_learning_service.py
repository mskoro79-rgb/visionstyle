"""Phase 14 — extension point for a feedback-learning loop.

`RatingService` (app/services/rating_service.py, Phase 12) already
captures every outfit rating keyed by (session_id, recommendation_id) —
that's the labeled training signal a feedback-learning loop needs: each
rating implicitly labels the exact scoring inputs that produced that
recommendation (face shape, body shape, skin tone, occasion/season/
budget/style, and the winning candidate items' attributes).

A production implementation would periodically export
(features, rating) pairs from `outfit_ratings` joined against
`analyses`/`recommendations`, and use them to learn per-signal weights
that override the fixed point-values currently hardcoded in
`RecommendationEngine._score_item` — turning the rule-based engine into
a learned one without changing its interface.
"""
from __future__ import annotations

from typing import Optional, TypedDict

from motor.motor_asyncio import AsyncIOMotorDatabase


class TrainingExample(TypedDict):
    face_shape: str
    body_shape: str | None
    skin_undertone: str
    occasion: str
    season: str
    style_preference: str
    budget_tier: str
    outfit_skus: list[str]
    rating: float


class FeedbackLearningService:
    async def export_training_examples(self, db: Optional[AsyncIOMotorDatabase]) -> list[TrainingExample]:
        """Extension point: join outfit_ratings with their source analyses/recommendations
        to produce labeled examples for a learned scoring model."""
        raise NotImplementedError(
            "Feedback-learning export requires enough rated recommendations to be useful. "
            "Ratings are already being captured by RatingService — implement this join once "
            "sufficient volume has accumulated."
        )

    async def apply_learned_weights(self, weights: dict[str, float]) -> None:
        """Extension point: override RecommendationEngine's fixed per-signal score weights
        with weights learned from export_training_examples()."""
        raise NotImplementedError(
            "Learned-weight application is not yet implemented. RecommendationEngine currently "
            "uses fixed weights in _score_item(); refactor those into a config object this method can update."
        )


feedback_learning_service = FeedbackLearningService()
