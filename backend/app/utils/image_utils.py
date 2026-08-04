"""Shared image I/O and preprocessing helpers."""
from __future__ import annotations

import io
import uuid
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

MAX_DIMENSION = 1600


def decode_upload_to_bgr(raw_bytes: bytes) -> np.ndarray:
    """Decode raw uploaded bytes into an OpenCV BGR array, EXIF-corrected and size-capped."""
    pil_image = Image.open(io.BytesIO(raw_bytes))
    pil_image = ImageOps.exif_transpose(pil_image)
    pil_image = pil_image.convert("RGB")

    width, height = pil_image.size
    scale = min(1.0, MAX_DIMENSION / max(width, height))
    if scale < 1.0:
        pil_image = pil_image.resize((int(width * scale), int(height * scale)), Image.LANCZOS)

    rgb_array = np.array(pil_image)
    bgr_array = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2BGR)
    return bgr_array


def preprocess_for_detection(bgr_image: np.ndarray) -> np.ndarray:
    """Light denoising + contrast normalization to stabilize landmark detection."""
    lab = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_channel = clahe.apply(l_channel)
    lab = cv2.merge((l_channel, a_channel, b_channel))
    normalized = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    denoised = cv2.fastNlMeansDenoisingColored(normalized, None, 3, 3, 7, 21)
    return denoised


def save_image(bgr_image: np.ndarray, directory: str, prefix: str = "img") -> tuple[str, str]:
    """Persist a BGR image to disk and return (file_id, absolute_path)."""
    Path(directory).mkdir(parents=True, exist_ok=True)
    file_id = f"{prefix}_{uuid.uuid4().hex}"
    path = Path(directory) / f"{file_id}.jpg"
    cv2.imwrite(str(path), bgr_image, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return file_id, str(path)


def load_image(path: str) -> np.ndarray:
    image = cv2.imread(path, cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(f"Could not read image at {path}")
    return image


def bgr_to_pil(bgr_image: np.ndarray) -> Image.Image:
    rgb = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)
