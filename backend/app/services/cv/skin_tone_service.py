"""Skin tone extraction using face-mesh-guided sampling + CIE-LAB analysis."""
from __future__ import annotations

import numpy as np

from app.models.schemas import SkinToneResult, SkinDepth, SkinUndertone
from app.utils.color_utils import bgr_to_hex, classify_depth, classify_undertone, rgb_to_lab_single

# Regions sampled are cheeks + forehead + nose bridge, all low-shadow, low-hair areas.
# Indices reference the 468-point MediaPipe FaceMesh topology.
SAMPLE_REGIONS = {
    "left_cheek": [111, 117, 118, 101, 205, 187],
    "right_cheek": [340, 346, 347, 330, 425, 411],
    "forehead": [151, 108, 337, 9, 8],
    "nose_bridge": [6, 168, 197],
}


def _sample_region_pixels(bgr_image: np.ndarray, landmarks: list[tuple[float, float, float]], indices: list[int]) -> np.ndarray:
    height, width = bgr_image.shape[:2]
    pixels = []
    for idx in indices:
        if idx >= len(landmarks):
            continue
        x_norm, y_norm, _ = landmarks[idx]
        px, py = int(x_norm * width), int(y_norm * height)
        # Sample a small patch around the landmark to reduce noise.
        y0, y1 = max(0, py - 3), min(height, py + 4)
        x0, x1 = max(0, px - 3), min(width, px + 4)
        patch = bgr_image[y0:y1, x0:x1]
        if patch.size > 0:
            pixels.append(patch.reshape(-1, 3))
    if not pixels:
        return np.empty((0, 3))
    return np.concatenate(pixels, axis=0)


def _filter_skin_pixels(pixels_bgr: np.ndarray) -> np.ndarray:
    """Remove outliers such as hair, shadows, or specular highlights via HSV thresholds + IQR."""
    if pixels_bgr.shape[0] == 0:
        return pixels_bgr

    b, g, r = pixels_bgr[:, 0], pixels_bgr[:, 1], pixels_bgr[:, 2]
    brightness = (b.astype(np.float64) + g + r) / 3.0
    # Drop near-black (shadow/hair) and near-white (specular highlight) pixels.
    mask = (brightness > 25) & (brightness < 250)
    filtered = pixels_bgr[mask]
    if filtered.shape[0] < 5:
        return pixels_bgr  # fall back to unfiltered if too aggressive

    # IQR-based outlier removal on brightness to further stabilize the estimate.
    values = brightness[mask]
    q1, q3 = np.percentile(values, [25, 75])
    iqr = q3 - q1
    lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    final_mask = (values >= lower) & (values <= upper)
    result = filtered[final_mask]
    return result if result.shape[0] >= 5 else filtered


class SkinToneService:
    def analyze(self, bgr_image: np.ndarray, landmarks: list[tuple[float, float, float]]) -> SkinToneResult:
        all_pixels = []
        for indices in SAMPLE_REGIONS.values():
            region_pixels = _sample_region_pixels(bgr_image, landmarks, indices)
            if region_pixels.shape[0] > 0:
                all_pixels.append(region_pixels)

        if not all_pixels:
            raise ValueError("No skin regions could be sampled from the detected face")

        pixels = np.concatenate(all_pixels, axis=0)
        pixels = _filter_skin_pixels(pixels)

        mean_bgr = pixels.mean(axis=0)
        b_mean, g_mean, r_mean = mean_bgr
        rgb_array = np.array([r_mean, g_mean, b_mean])

        lab_l, lab_a, lab_b = rgb_to_lab_single(rgb_array)
        undertone = classify_undertone(lab_a, lab_b)
        depth = classify_depth(lab_l)
        hex_color = bgr_to_hex(int(b_mean), int(g_mean), int(r_mean))

        # Confidence scales with sample size and inversely with color variance
        # (tight clustering across sampled regions => more reliable estimate).
        std_dev = float(np.std(pixels, axis=0).mean())
        sample_score = min(1.0, pixels.shape[0] / 150.0)
        variance_score = max(0.0, 1.0 - std_dev / 60.0)
        confidence = round(0.4 * sample_score + 0.6 * variance_score, 3)
        confidence = max(0.45, min(0.98, confidence))

        return SkinToneResult(
            undertone=SkinUndertone(undertone),
            depth=SkinDepth(depth),
            hex_color=hex_color,
            lab_l=round(lab_l, 2),
            lab_a=round(lab_a, 2),
            lab_b=round(lab_b, 2),
            confidence=confidence,
        )


skin_tone_service = SkinToneService()
