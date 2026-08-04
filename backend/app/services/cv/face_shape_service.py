"""Face-shape classification from geometric ratios derived from the 468-point face mesh.

The classifier computes five key measurements (forehead width, cheekbone width,
jaw width, face length, chin length) and scores every candidate shape against
its expected ratio profile. The shape with the highest score wins, and the
full score distribution is returned so the frontend can show why alternatives
were close. This produces genuinely varying results across different faces,
rather than defaulting to a single shape.
"""
from __future__ import annotations

import math

from app.models.schemas import FaceMetrics, FaceShape, FaceShapeResult
from app.services.cv.face_mesh_service import (
    LM_CHEEK_LEFT,
    LM_CHEEK_RIGHT,
    LM_CHIN,
    LM_FOREHEAD_LEFT,
    LM_FOREHEAD_RIGHT,
    LM_JAW_LEFT,
    LM_JAW_RIGHT,
    LM_TOP_FOREHEAD,
)

Landmark = tuple[float, float, float]


def _euclidean(p1: Landmark, p2: Landmark) -> float:
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])


def _compute_metrics(landmarks: list[Landmark]) -> FaceMetrics:
    forehead_width = _euclidean(landmarks[LM_FOREHEAD_LEFT], landmarks[LM_FOREHEAD_RIGHT])
    cheekbone_width = _euclidean(landmarks[LM_CHEEK_LEFT], landmarks[LM_CHEEK_RIGHT])
    jaw_width = _euclidean(landmarks[LM_JAW_LEFT], landmarks[LM_JAW_RIGHT])
    face_height = _euclidean(landmarks[LM_TOP_FOREHEAD], landmarks[LM_CHIN])
    chin_length = _euclidean(landmarks[LM_JAW_LEFT], landmarks[LM_CHIN]) * 0.5 + _euclidean(
        landmarks[LM_JAW_RIGHT], landmarks[LM_CHIN]
    ) * 0.5

    face_width = max(forehead_width, cheekbone_width, jaw_width)
    ratio = face_width / face_height if face_height else 0.0

    return FaceMetrics(
        face_width=round(face_width, 4),
        face_height=round(face_height, 4),
        jaw_width=round(jaw_width, 4),
        forehead_width=round(forehead_width, 4),
        cheekbone_width=round(cheekbone_width, 4),
        chin_length=round(chin_length, 4),
        width_to_height_ratio=round(ratio, 4),
    )


def _score_shapes(metrics: FaceMetrics) -> dict[str, float]:
    """Score every face shape against normalized geometric signatures.

    Each shape is defined by expected relationships between forehead,
    cheekbone, jaw widths and the width/height ratio. Scores are
    similarity measures in [0, 1]; the highest score wins.
    """
    fh, cb, jw = metrics.forehead_width, metrics.cheekbone_width, metrics.jaw_width
    ratio = metrics.width_to_height_ratio

    fh_cb = fh / cb if cb else 1.0
    jw_cb = jw / cb if cb else 1.0
    fh_jw = fh / jw if jw else 1.0

    def gaussian_similarity(value: float, target: float, tolerance: float) -> float:
        return math.exp(-((value - target) ** 2) / (2 * tolerance ** 2))

    scores: dict[str, float] = {}

    # OVAL: cheekbones widest, forehead slightly wider than jaw, length > width (ratio ~0.75)
    scores[FaceShape.OVAL.value] = (
        gaussian_similarity(fh_cb, 0.93, 0.08)
        * gaussian_similarity(jw_cb, 0.85, 0.08)
        * gaussian_similarity(ratio, 0.75, 0.1)
    )

    # ROUND: width ≈ height, forehead ≈ cheekbone ≈ jaw, soft jaw
    scores[FaceShape.ROUND.value] = (
        gaussian_similarity(fh_cb, 0.95, 0.07)
        * gaussian_similarity(jw_cb, 0.9, 0.08)
        * gaussian_similarity(ratio, 0.9, 0.08)
    )

    # SQUARE: forehead ≈ cheekbone ≈ jaw (strong), width ≈ height, angular jaw
    scores[FaceShape.SQUARE.value] = (
        gaussian_similarity(fh_cb, 0.98, 0.05)
        * gaussian_similarity(jw_cb, 0.97, 0.05)
        * gaussian_similarity(ratio, 0.85, 0.08)
    )

    # HEART: wide forehead, narrow jaw, pointed chin
    scores[FaceShape.HEART.value] = (
        gaussian_similarity(fh_cb, 1.0, 0.08)
        * gaussian_similarity(jw_cb, 0.7, 0.1)
        * gaussian_similarity(fh_jw, 1.25, 0.12)
    )

    # DIAMOND: cheekbones widest, forehead and jaw both notably narrower
    scores[FaceShape.DIAMOND.value] = (
        gaussian_similarity(fh_cb, 0.75, 0.08)
        * gaussian_similarity(jw_cb, 0.75, 0.08)
        * gaussian_similarity(ratio, 0.8, 0.1)
    )

    # OBLONG: width similar across forehead/cheek/jaw but face is notably longer than wide
    scores[FaceShape.OBLONG.value] = (
        gaussian_similarity(fh_cb, 0.95, 0.08)
        * gaussian_similarity(jw_cb, 0.9, 0.08)
        * gaussian_similarity(ratio, 0.62, 0.08)
    )

    # TRIANGLE: jaw widest, forehead narrowest
    scores[FaceShape.TRIANGLE.value] = (
        gaussian_similarity(jw_cb, 1.05, 0.08)
        * gaussian_similarity(fh_cb, 0.78, 0.1)
        * gaussian_similarity(fh_jw, 0.75, 0.1)
    )

    total = sum(scores.values()) or 1.0
    normalized = {shape: round(score / total, 4) for shape, score in scores.items()}
    return normalized


class FaceShapeService:
    def classify(self, landmarks: list[Landmark]) -> FaceShapeResult:
        metrics = _compute_metrics(landmarks)
        scores = _score_shapes(metrics)
        best_shape, best_score = max(scores.items(), key=lambda kv: kv[1])

        # Confidence reflects both the winning score and its margin over the runner-up.
        sorted_scores = sorted(scores.values(), reverse=True)
        margin = sorted_scores[0] - (sorted_scores[1] if len(sorted_scores) > 1 else 0)
        confidence = round(min(0.97, max(0.5, best_score * 0.6 + margin * 3.0)), 3)

        return FaceShapeResult(
            shape=FaceShape(best_shape),
            confidence=confidence,
            metrics=metrics,
            scores=scores,
        )


face_shape_service = FaceShapeService()
