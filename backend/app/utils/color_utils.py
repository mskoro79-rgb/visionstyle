"""Color-space conversions and perceptual color helpers for skin-tone analysis."""
from __future__ import annotations

import colorsys

import numpy as np


def bgr_to_hex(b: int, g: int, r: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


def rgb_to_lab_single(rgb: np.ndarray) -> tuple[float, float, float]:
    """Convert a single RGB pixel (0-255) to CIE-LAB using the sRGB->XYZ->LAB pipeline."""
    srgb = rgb.astype(np.float64) / 255.0
    srgb = np.where(srgb > 0.04045, ((srgb + 0.055) / 1.055) ** 2.4, srgb / 12.92)

    # sRGB -> XYZ (D65)
    matrix = np.array(
        [
            [0.4124564, 0.3575761, 0.1804375],
            [0.2126729, 0.7151522, 0.0721750],
            [0.0193339, 0.1191920, 0.9503041],
        ]
    )
    xyz = matrix @ srgb
    xyz_ref = np.array([0.95047, 1.0, 1.08883])
    xyz_norm = xyz / xyz_ref

    def f(t: float) -> float:
        delta = 6 / 29
        if t > delta ** 3:
            return t ** (1 / 3)
        return t / (3 * delta ** 2) + 4 / 29

    fx, fy, fz = (f(v) for v in xyz_norm)
    L = 116 * fy - 16
    a = 500 * (fx - fy)
    b = 200 * (fy - fz)
    return float(L), float(a), float(b)


def classify_undertone(lab_a: float, lab_b: float) -> str:
    """Classify undertone from LAB a*/b* channels.

    a* > 0 pushes toward red/warm, b* > 0 pushes toward yellow/warm.
    A composite warmth score determines warm/cool/neutral, with a
    dead-zone for neutral to avoid over-classifying borderline tones.
    """
    warmth_score = (lab_b * 0.7) + (lab_a * 0.3)
    if warmth_score > 14:
        return "warm"
    if warmth_score < 6:
        return "cool"
    return "neutral"


def classify_depth(lab_l: float) -> str:
    if lab_l >= 78:
        return "fair"
    if lab_l >= 65:
        return "light"
    if lab_l >= 50:
        return "medium"
    if lab_l >= 35:
        return "tan"
    return "deep"


def hsv_from_hex(hex_color: str) -> tuple[float, float, float]:
    hex_color = hex_color.lstrip("#")
    r, g, b = (int(hex_color[i : i + 2], 16) / 255.0 for i in (0, 2, 4))
    return colorsys.rgb_to_hsv(r, g, b)


def hex_from_hsv(h: float, s: float, v: float) -> str:
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    return f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"
