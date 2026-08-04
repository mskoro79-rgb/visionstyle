"""Lightweight, CPU-only virtual outfit compositor.

Uses BlazePose landmarks to locate the torso and leg regions on the
uploaded photo, then alpha-composites resized garment imagery into those
regions with a feathered (Gaussian-blurred) mask so edges blend naturally
instead of appearing as a hard-pasted rectangle. This is intentionally
architected behind the `VTONEngine` interface so it can be swapped for a
diffusion-based try-on model (IDM-VTON/CatVTON/StableVITON) later without
any change to the API layer.
"""
from __future__ import annotations

import io

import cv2
import numpy as np
import requests
from PIL import Image

from app.services.cv.pose_service import (
    LM_LEFT_HIP,
    LM_LEFT_SHOULDER,
    LM_RIGHT_HIP,
    LM_RIGHT_SHOULDER,
    pose_service,
)
from app.services.outfit_preview.vton_adapter import VTONEngine


def _fetch_image_bgr(url: str, timeout: float = 8.0) -> np.ndarray | None:
    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
        pil_image = Image.open(io.BytesIO(response.content)).convert("RGB")
        rgb = np.array(pil_image)
        return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    except Exception:
        return None


def _feathered_alpha_blend(base: np.ndarray, overlay: np.ndarray, x: int, y: int, w: int, h: int, opacity: float = 0.88) -> np.ndarray:
    result = base.copy()
    height, width = base.shape[:2]

    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(width, x + w), min(height, y + h)
    if x1 <= x0 or y1 <= y0:
        return result

    resized = cv2.resize(overlay, (w, h), interpolation=cv2.INTER_LANCZOS4)
    crop = resized[y0 - y : y1 - y, x0 - x : x1 - x]
    crop_h, crop_w = crop.shape[:2]

    mask = np.ones((crop_h, crop_w), dtype=np.float32)
    feather = max(3, int(min(crop_h, crop_w) * 0.08))
    if crop_h > 2 * feather and crop_w > 2 * feather:
        mask[:feather, :] = 0
        mask[-feather:, :] = 0
        mask[:, :feather] = 0
        mask[:, -feather:] = 0
    mask = cv2.GaussianBlur(mask, (0, 0), sigmaX=feather / 2)
    mask = mask[:, :, None] * opacity

    region = result[y0:y1, x0:x1].astype(np.float32)
    blended = region * (1 - mask) + crop.astype(np.float32) * mask
    result[y0:y1, x0:x1] = blended.astype(np.uint8)
    return result


class CompositeEngine(VTONEngine):
    name = "composite"

    def generate(self, person_bgr: np.ndarray, garment_image_urls: list[str]) -> np.ndarray:
        height, width = person_bgr.shape[:2]
        pose_result = pose_service.analyze(person_bgr)

        if not pose_result.detected or pose_result.landmarks is None:
            return self._fallback_side_panel(person_bgr, garment_image_urls)

        landmarks = pose_result.landmarks
        l_sh, r_sh = landmarks[LM_LEFT_SHOULDER], landmarks[LM_RIGHT_SHOULDER]
        l_hip, r_hip = landmarks[LM_LEFT_HIP], landmarks[LM_RIGHT_HIP]

        shoulder_x = [l_sh[0] * width, r_sh[0] * width]
        hip_x = [l_hip[0] * width, r_hip[0] * width]
        torso_top = min(l_sh[1], r_sh[1]) * height
        torso_bottom = max(l_hip[1], r_hip[1]) * height
        torso_left = min(min(shoulder_x), min(hip_x)) - 0.08 * width
        torso_right = max(max(shoulder_x), max(hip_x)) + 0.08 * width

        torso_x = int(max(0, torso_left))
        torso_y = int(max(0, torso_top - 0.03 * height))
        torso_w = int(min(width, torso_right) - torso_x)
        torso_h = int((torso_bottom - torso_top) * 1.15)

        result = person_bgr.copy()
        garment_bgr = _fetch_image_bgr(garment_image_urls[0]) if garment_image_urls else None
        if garment_bgr is not None and torso_w > 10 and torso_h > 10:
            result = _feathered_alpha_blend(result, garment_bgr, torso_x, torso_y, torso_w, torso_h)

        # Layer a second garment (e.g. jacket/outerwear) slightly offset if provided.
        if len(garment_image_urls) > 1:
            second = _fetch_image_bgr(garment_image_urls[1])
            if second is not None:
                leg_top = int(torso_bottom)
                leg_h = int(height - leg_top - 0.05 * height)
                if leg_h > 10:
                    result = _feathered_alpha_blend(result, second, torso_x, leg_top, torso_w, leg_h, opacity=0.85)

        return result

    @staticmethod
    def _fallback_side_panel(person_bgr: np.ndarray, garment_image_urls: list[str]) -> np.ndarray:
        """When no pose is detected, compose a side-by-side panel instead of guessing a placement."""
        height = person_bgr.shape[0]
        panels = [person_bgr]
        for url in garment_image_urls[:2]:
            garment = _fetch_image_bgr(url)
            if garment is not None:
                scale = height / garment.shape[0]
                resized = cv2.resize(garment, (int(garment.shape[1] * scale), height))
                panels.append(resized)
        return np.concatenate(panels, axis=1)
