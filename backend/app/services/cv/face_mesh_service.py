"""Face detection + 468-point face mesh extraction via MediaPipe."""
from __future__ import annotations

from dataclasses import dataclass

import mediapipe as mp
import numpy as np

mp_face_detection = mp.solutions.face_detection
mp_face_mesh = mp.solutions.face_mesh

# Landmark indices (MediaPipe FaceMesh topology) used for face-shape geometry.
LM_FOREHEAD_LEFT = 103
LM_FOREHEAD_RIGHT = 332
LM_CHEEK_LEFT = 234
LM_CHEEK_RIGHT = 454
LM_JAW_LEFT = 172
LM_JAW_RIGHT = 397
LM_CHIN = 152
LM_TOP_FOREHEAD = 10
LM_NOSE_TIP = 4


@dataclass
class FaceMeshResult:
    detected: bool
    detection_confidence: float
    landmarks: list[tuple[float, float, float]] | None  # normalized (x, y, z)
    bbox: tuple[int, int, int, int] | None  # x, y, w, h in pixels


class FaceMeshService:
    def __init__(self, min_detection_confidence: float = 0.6):
        self._min_detection_confidence = min_detection_confidence

    def analyze(self, bgr_image: np.ndarray) -> FaceMeshResult:
        rgb_image = bgr_image[:, :, ::-1]
        height, width = bgr_image.shape[:2]

        with mp_face_detection.FaceDetection(
            model_selection=1, min_detection_confidence=self._min_detection_confidence
        ) as detector:
            detection_result = detector.process(rgb_image)

        if not detection_result.detections:
            return FaceMeshResult(detected=False, detection_confidence=0.0, landmarks=None, bbox=None)

        best = max(detection_result.detections, key=lambda d: d.score[0])
        confidence = float(best.score[0])
        rel_box = best.location_data.relative_bounding_box
        bbox = (
            max(0, int(rel_box.xmin * width)),
            max(0, int(rel_box.ymin * height)),
            int(rel_box.width * width),
            int(rel_box.height * height),
        )

        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=self._min_detection_confidence,
        ) as mesh:
            mesh_result = mesh.process(rgb_image)

        landmarks = None
        if mesh_result.multi_face_landmarks:
            face_landmarks = mesh_result.multi_face_landmarks[0]
            landmarks = [(lm.x, lm.y, lm.z) for lm in face_landmarks.landmark]

        return FaceMeshResult(
            detected=True,
            detection_confidence=confidence,
            landmarks=landmarks,
            bbox=bbox,
        )


face_mesh_service = FaceMeshService()
