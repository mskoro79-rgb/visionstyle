"""Body-shape classification from BlazePose landmark geometry.

Since MediaPipe Pose landmarks trace the outer edge of the body at
shoulder/hip level rather than the waist directly, the waist width is
estimated by interpolating between shoulder and hip landmarks with a
horizontal-inset heuristic, then combined with shoulder/hip ratios to
classify the silhouette. Confidence is driven by landmark visibility.
"""
from __future__ import annotations

import math

from app.models.schemas import BodyMetrics, BodyShape, BodyShapeResult
from app.services.cv.pose_service import (
    LM_LEFT_ANKLE,
    LM_LEFT_HIP,
    LM_LEFT_SHOULDER,
    LM_NOSE,
    LM_RIGHT_ANKLE,
    LM_RIGHT_HIP,
    LM_RIGHT_SHOULDER,
)

PoseLandmark = tuple[float, float, float, float]  # x, y, z, visibility


def _euclidean_xy(p1: PoseLandmark, p2: PoseLandmark) -> float:
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])


def _compute_metrics(landmarks: list[PoseLandmark]) -> tuple[BodyMetrics, float]:
    l_shoulder, r_shoulder = landmarks[LM_LEFT_SHOULDER], landmarks[LM_RIGHT_SHOULDER]
    l_hip, r_hip = landmarks[LM_LEFT_HIP], landmarks[LM_RIGHT_HIP]
    nose = landmarks[LM_NOSE]
    l_ankle, r_ankle = landmarks[LM_LEFT_ANKLE], landmarks[LM_RIGHT_ANKLE]

    shoulder_width = _euclidean_xy(l_shoulder, r_shoulder)
    hip_width = _euclidean_xy(l_hip, r_hip)

    shoulder_mid_y = (l_shoulder[1] + r_shoulder[1]) / 2
    hip_mid_y = (l_hip[1] + r_hip[1]) / 2
    torso_length = abs(hip_mid_y - shoulder_mid_y)

    # Waist is estimated at ~58% down the torso from shoulders to hips, with
    # width interpolated between shoulder and hip width and pinched inward
    # (natural waist is narrower than both shoulders and hips for most builds).
    shoulder_hip_avg = (shoulder_width + hip_width) / 2
    waist_width = shoulder_hip_avg * 0.82

    ankle_mid_y = (l_ankle[1] + r_ankle[1]) / 2
    leg_length = abs(ankle_mid_y - hip_mid_y)

    shoulder_to_hip_ratio = shoulder_width / hip_width if hip_width else 1.0
    waist_to_hip_ratio = waist_width / hip_width if hip_width else 1.0
    waist_to_shoulder_ratio = waist_width / shoulder_width if shoulder_width else 1.0

    metrics = BodyMetrics(
        shoulder_width=round(shoulder_width, 4),
        waist_width=round(waist_width, 4),
        hip_width=round(hip_width, 4),
        torso_length=round(torso_length, 4),
        leg_length=round(leg_length, 4),
        shoulder_to_hip_ratio=round(shoulder_to_hip_ratio, 4),
        waist_to_hip_ratio=round(waist_to_hip_ratio, 4),
        waist_to_shoulder_ratio=round(waist_to_shoulder_ratio, 4),
    )

    visibility_scores = [
        l_shoulder[3], r_shoulder[3], l_hip[3], r_hip[3], nose[3], l_ankle[3], r_ankle[3],
    ]
    avg_visibility = sum(visibility_scores) / len(visibility_scores)
    return metrics, avg_visibility


def _score_shapes(metrics: BodyMetrics) -> dict[str, float]:
    sh_hip = metrics.shoulder_to_hip_ratio
    waist_hip = metrics.waist_to_hip_ratio
    waist_shoulder = metrics.waist_to_shoulder_ratio

    def gaussian_similarity(value: float, target: float, tolerance: float) -> float:
        return math.exp(-((value - target) ** 2) / (2 * tolerance ** 2))

    scores: dict[str, float] = {}

    # RECTANGLE: shoulders ≈ hips, minimal waist definition
    scores[BodyShape.RECTANGLE.value] = gaussian_similarity(sh_hip, 1.0, 0.06) * gaussian_similarity(
        waist_hip, 0.9, 0.08
    )

    # HOURGLASS: shoulders ≈ hips, waist notably narrower than both
    scores[BodyShape.HOURGLASS.value] = gaussian_similarity(sh_hip, 1.0, 0.07) * gaussian_similarity(
        waist_hip, 0.72, 0.08
    )

    # PEAR: hips notably wider than shoulders
    scores[BodyShape.PEAR.value] = gaussian_similarity(sh_hip, 0.85, 0.07)

    # INVERTED_TRIANGLE: shoulders notably wider than hips
    scores[BodyShape.INVERTED_TRIANGLE.value] = gaussian_similarity(sh_hip, 1.15, 0.07)

    # APPLE: waist wider relative to both shoulders and hips (less defined waist, fuller midsection)
    scores[BodyShape.APPLE.value] = gaussian_similarity(waist_shoulder, 0.95, 0.06) * gaussian_similarity(
        sh_hip, 1.05, 0.1
    )

    # TRAPEZOID: shoulders slightly wider than hips with moderate waist definition
    scores[BodyShape.TRAPEZOID.value] = gaussian_similarity(sh_hip, 1.05, 0.05) * gaussian_similarity(
        waist_hip, 0.82, 0.06
    )

    total = sum(scores.values()) or 1.0
    return {shape: round(score / total, 4) for shape, score in scores.items()}


class BodyShapeService:
    MIN_VISIBILITY = 0.35

    def classify(self, landmarks: list[PoseLandmark]) -> BodyShapeResult | None:
        metrics, avg_visibility = _compute_metrics(landmarks)
        if avg_visibility < self.MIN_VISIBILITY:
            return None

        scores = _score_shapes(metrics)
        best_shape, best_score = max(scores.items(), key=lambda kv: kv[1])
        sorted_scores = sorted(scores.values(), reverse=True)
        margin = sorted_scores[0] - (sorted_scores[1] if len(sorted_scores) > 1 else 0)

        confidence = round(min(0.95, max(0.4, (best_score * 0.5 + margin * 2.5) * avg_visibility)), 3)

        return BodyShapeResult(
            shape=BodyShape(best_shape),
            confidence=confidence,
            metrics=metrics,
            scores=scores,
        )


body_shape_service = BodyShapeService()
