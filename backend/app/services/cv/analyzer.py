"""Top-level orchestrator that runs the full AI Analysis pipeline on an image."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import numpy as np

from app.core.config import get_settings
from app.models.schemas import AnalysisResult, DetectionQuality
from app.services.cv.body_shape_service import body_shape_service
from app.services.cv.face_mesh_service import face_mesh_service
from app.services.cv.face_shape_service import face_shape_service
from app.services.cv.pose_service import pose_service
from app.services.cv.skin_tone_service import skin_tone_service
from app.utils.image_utils import preprocess_for_detection

settings = get_settings()


class FaceNotDetectedError(Exception):
    pass


class VisionAnalyzer:
    def analyze(self, bgr_image: np.ndarray, session_id: str) -> AnalysisResult:
        height, width = bgr_image.shape[:2]
        warnings: list[str] = []

        processed = preprocess_for_detection(bgr_image)

        face_result = face_mesh_service.analyze(processed)
        if not face_result.detected or face_result.landmarks is None:
            raise FaceNotDetectedError(
                "No face could be detected in the uploaded image. "
                "Please upload a clear, front-facing photo with good lighting."
            )

        face_shape_result = face_shape_service.classify(face_result.landmarks)
        skin_tone_result = skin_tone_service.analyze(processed, face_result.landmarks)

        pose_result = pose_service.analyze(processed)
        body_shape_result = None
        if pose_result.detected and pose_result.landmarks is not None:
            body_shape_result = body_shape_service.classify(pose_result.landmarks)
            if body_shape_result is None:
                warnings.append(
                    "Body landmarks detected but visibility was too low for a confident body-shape estimate. "
                    "Upload a full-body photo for best results."
                )
        else:
            warnings.append(
                "No full body detected. Upload a full-body photo to receive body-shape recommendations."
            )

        if face_result.detection_confidence < 0.75:
            warnings.append("Face detection confidence is moderate — recommendations may be less precise.")

        overall_confidence = self._compute_overall_confidence(
            face_result.detection_confidence,
            face_shape_result.confidence,
            skin_tone_result.confidence,
            body_shape_result.confidence if body_shape_result else None,
        )

        detection_quality = DetectionQuality(
            face_detected=face_result.detected,
            face_detection_confidence=round(face_result.detection_confidence, 3),
            landmarks_detected=face_result.landmarks is not None,
            pose_detected=pose_result.detected,
            pose_landmarks_count=pose_result.landmark_count,
            image_width=width,
            image_height=height,
            warnings=warnings,
        )

        return AnalysisResult(
            session_id=session_id,
            analysis_id=f"an_{uuid.uuid4().hex}",
            created_at=datetime.now(timezone.utc),
            face_shape=face_shape_result,
            body_shape=body_shape_result,
            skin_tone=skin_tone_result,
            overall_confidence=overall_confidence,
            detection_quality=detection_quality,
        )

    @staticmethod
    def _compute_overall_confidence(
        face_detect_conf: float,
        face_shape_conf: float,
        skin_conf: float,
        body_conf: float | None,
    ) -> float:
        weights = [(face_detect_conf, 0.3), (face_shape_conf, 0.3), (skin_conf, 0.2)]
        if body_conf is not None:
            weights.append((body_conf, 0.2))
        else:
            # Redistribute the body-shape weight across the remaining signals.
            weights = [(v, w / 0.8) for v, w in weights]

        score = sum(v * w for v, w in weights)
        return round(min(0.98, max(0.3, score)), 3)


vision_analyzer = VisionAnalyzer()
