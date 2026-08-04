"""Full-body pose landmark extraction via MediaPipe Pose, used for body-shape geometry."""
from __future__ import annotations

from dataclasses import dataclass

import mediapipe as mp
import numpy as np

mp_pose = mp.solutions.pose

# Pose landmark indices used for body-shape geometry (BlazePose 33-point topology).
LM_LEFT_SHOULDER = 11
LM_RIGHT_SHOULDER = 12
LM_LEFT_HIP = 23
LM_RIGHT_HIP = 24
LM_LEFT_ELBOW = 13
LM_RIGHT_ELBOW = 14
LM_LEFT_KNEE = 25
LM_RIGHT_KNEE = 26
LM_LEFT_ANKLE = 27
LM_RIGHT_ANKLE = 28
LM_NOSE = 0
LM_LEFT_WRIST = 15
LM_RIGHT_WRIST = 16


@dataclass
class PoseResult:
    detected: bool
    landmarks: list[tuple[float, float, float, float]] | None  # normalized x, y, z, visibility
    landmark_count: int


class PoseService:
    def __init__(self, min_detection_confidence: float = 0.5):
        self._min_detection_confidence = min_detection_confidence

    def analyze(self, bgr_image: np.ndarray) -> PoseResult:
        rgb_image = bgr_image[:, :, ::-1]

        with mp_pose.Pose(
            static_image_mode=True,
            model_complexity=2,
            enable_segmentation=False,
            min_detection_confidence=self._min_detection_confidence,
        ) as pose:
            result = pose.process(rgb_image)

        if not result.pose_landmarks:
            return PoseResult(detected=False, landmarks=None, landmark_count=0)

        landmarks = [(lm.x, lm.y, lm.z, lm.visibility) for lm in result.pose_landmarks.landmark]
        visible_count = sum(1 for lm in landmarks if lm[3] > 0.5)

        return PoseResult(detected=True, landmarks=landmarks, landmark_count=visible_count)


pose_service = PoseService()
