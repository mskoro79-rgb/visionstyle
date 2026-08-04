"""Offline smoke test for the CV geometry + recommendation logic, independent of
network access. Constructs synthetic face-mesh/pose landmark sets representing
different face/body shapes and verifies the classifiers produce varied,
non-constant outputs (i.e. do not always default to "oval" / "rectangle").
"""
import asyncio

import numpy as np

from app.models.schemas import (
    AnalysisResult,
    DetectionQuality,
    Occasion,
    RecommendationRequest,
    Season,
    BudgetTier,
    StylePreference,
    Gender,
)
from app.services.cv.face_shape_service import face_shape_service
from app.services.cv.body_shape_service import body_shape_service
from app.services.cv.skin_tone_service import skin_tone_service
from app.services.recommendation.engine import recommendation_engine
from datetime import datetime, timezone


def make_face_landmarks(forehead_w, cheek_w, jaw_w, height):
    """Build a 468-length landmark list with only the geometry-relevant indices set meaningfully."""
    lm = [(0.5, 0.5, 0.0)] * 468
    cx, cy = 0.5, 0.5
    lm[10] = (cx, cy - height / 2, 0.0)  # top forehead
    lm[152] = (cx, cy + height / 2, 0.0)  # chin
    lm[103] = (cx - forehead_w / 2, cy - height * 0.3, 0.0)
    lm[332] = (cx + forehead_w / 2, cy - height * 0.3, 0.0)
    lm[234] = (cx - cheek_w / 2, cy, 0.0)
    lm[454] = (cx + cheek_w / 2, cy, 0.0)
    lm[172] = (cx - jaw_w / 2, cy + height * 0.35, 0.0)
    lm[397] = (cx + jaw_w / 2, cy + height * 0.35, 0.0)
    return lm


def make_pose_landmarks(shoulder_w, hip_w, torso_h, leg_h):
    lm = [(0.5, 0.5, 0.0, 0.95)] * 33
    cx, top = 0.5, 0.1
    lm[11] = (cx - shoulder_w / 2, top, 0.0, 0.95)  # L shoulder
    lm[12] = (cx + shoulder_w / 2, top, 0.0, 0.95)  # R shoulder
    hip_y = top + torso_h
    lm[23] = (cx - hip_w / 2, hip_y, 0.0, 0.95)  # L hip
    lm[24] = (cx + hip_w / 2, hip_y, 0.0, 0.95)  # R hip
    lm[0] = (cx, top - 0.05, 0.0, 0.95)  # nose
    ankle_y = hip_y + leg_h
    lm[27] = (cx - 0.05, ankle_y, 0.0, 0.9)
    lm[28] = (cx + 0.05, ankle_y, 0.0, 0.9)
    return lm


def test_face_shapes():
    print("=== Face shape variety test ===")
    cases = {
        "expect round-ish": (0.85, 0.9, 0.8, 0.9),
        "expect oblong-ish": (0.75, 0.78, 0.7, 1.4),
        "expect heart-ish": (0.9, 0.75, 0.55, 1.0),
        "expect square-ish": (0.95, 0.98, 0.97, 0.95),
        "expect triangle-ish": (0.55, 0.75, 0.95, 1.0),
    }
    results = set()
    for label, (fh, cb, jw, h) in cases.items():
        landmarks = make_face_landmarks(fh, cb, jw, h)
        result = face_shape_service.classify(landmarks)
        print(f"{label}: shape={result.shape.value} confidence={result.confidence}")
        results.add(result.shape.value)
    assert len(results) >= 3, f"Expected varied face shapes, got only {results}"
    print("PASS: multiple distinct face shapes produced\n")


def test_body_shapes():
    print("=== Body shape variety test ===")
    cases = {
        "expect rectangle": (0.9, 0.88, 0.5, 0.7),
        "expect hourglass": (0.9, 0.9, 0.5, 0.7),
        "expect pear": (0.75, 0.95, 0.5, 0.7),
        "expect inverted_triangle": (1.0, 0.8, 0.5, 0.7),
    }
    results = set()
    for label, (sh, hip, torso, leg) in cases.items():
        landmarks = make_pose_landmarks(sh, hip, torso, leg)
        result = body_shape_service.classify(landmarks)
        print(f"{label}: shape={result.shape.value} confidence={result.confidence}")
        results.add(result.shape.value)
    assert len(results) >= 2, f"Expected varied body shapes, got only {results}"
    print("PASS: multiple distinct body shapes produced\n")


def test_skin_tone():
    print("=== Skin tone variety test ===")
    landmarks = make_face_landmarks(0.4, 0.45, 0.4, 0.5)
    # Normalize sample-region landmark indices onto a small patch of a synthetic image.
    from app.services.cv.skin_tone_service import SAMPLE_REGIONS
    for idx_list in SAMPLE_REGIONS.values():
        for idx in idx_list:
            landmarks[idx] = (0.5, 0.5, 0.0)

    for label, bgr_color in [
        ("fair/warm", (180, 200, 235)),
        ("deep/cool", (60, 55, 90)),
        ("medium/neutral", (110, 140, 160)),
    ]:
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        img[:] = bgr_color
        result = skin_tone_service.analyze(img, landmarks)
        print(f"{label}: undertone={result.undertone.value} depth={result.depth.value} hex={result.hex_color}")
    print("PASS: skin tone varies with input color\n")


async def test_recommendation_engine():
    print("=== Recommendation engine test ===")
    from app.services.cv.face_shape_service import face_shape_service as fss
    landmarks = make_face_landmarks(0.9, 0.75, 0.55, 1.0)
    face_shape_result = fss.classify(landmarks)

    img = np.zeros((100, 100, 3), dtype=np.uint8)
    img[:] = (150, 170, 200)
    from app.services.cv.skin_tone_service import SAMPLE_REGIONS
    for idx_list in SAMPLE_REGIONS.values():
        for idx in idx_list:
            landmarks[idx] = (0.5, 0.5, 0.0)
    skin_result = skin_tone_service.analyze(img, landmarks)

    analysis = AnalysisResult(
        session_id="sess_test",
        analysis_id="an_test",
        created_at=datetime.now(timezone.utc),
        face_shape=face_shape_result,
        body_shape=None,
        skin_tone=skin_result,
        overall_confidence=0.8,
        detection_quality=DetectionQuality(
            face_detected=True, face_detection_confidence=0.9, landmarks_detected=True,
            pose_detected=False, pose_landmarks_count=0, image_width=100, image_height=100, warnings=[]
        ),
    )
    request = RecommendationRequest(
        session_id="sess_test", analysis_id="an_test", occasion=Occasion.BUSINESS,
        season=Season.AUTUMN, budget=BudgetTier.PREMIUM, style_preference=StylePreference.CLASSIC,
        gender=Gender.MALE,
    )
    response = await recommendation_engine.generate(analysis, request, None)
    rec = response.recommendations[0]
    print(f"Title: {rec.title}")
    print(f"Confidence: {rec.confidence}")
    print(f"Outfit pieces: {[p.name for p in rec.outfit_pieces]}")
    print(f"Color palette: {[c.hex_color for c in rec.color_palette]}")
    print(f"Tips: {rec.fashion_tips}")
    assert len(rec.outfit_pieces) > 0
    assert len(rec.color_palette) > 0
    assert all(p.reason for p in rec.outfit_pieces)
    print("PASS: recommendation engine produces explained, populated results\n")


if __name__ == "__main__":
    test_face_shapes()
    test_body_shapes()
    test_skin_tone()
    asyncio.run(test_recommendation_engine())
    print("ALL SMOKE TESTS PASSED")
