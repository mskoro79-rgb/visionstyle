"""Pluggable virtual try-on engine interface.

Defines the contract every VTON backend must satisfy so the API layer can
swap engines via config (VTON_ENGINE) without touching route code. Today
only `CompositeEngine` is implemented (lightweight, CPU-only image
compositing). The diffusion-based engines below are stubs describing the
integration point for when GPU infrastructure is available — wiring them
in only requires implementing `generate()` and registering the class in
`ENGINE_REGISTRY`.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np


class VTONEngine(ABC):
    name: str

    @abstractmethod
    def generate(self, person_bgr: np.ndarray, garment_image_urls: list[str]) -> np.ndarray:
        """Return a composited BGR image of the person wearing the given garments."""
        raise NotImplementedError


class IDMVTONEngine(VTONEngine):
    """Integration point for IDM-VTON (https://github.com/yisol/IDM-VTON).

    Production wiring: run the IDM-VTON diffusion pipeline (requires a CUDA
    GPU, the pretrained UNet + garment encoder checkpoints, and a human
    parsing / densepose preprocessing step) either in-process via a Python
    binding or as a call to a dedicated inference microservice.
    """

    name = "idm_vton"

    def generate(self, person_bgr: np.ndarray, garment_image_urls: list[str]) -> np.ndarray:
        raise NotImplementedError(
            "IDM-VTON engine requires GPU inference infrastructure. "
            "Implement by calling a hosted IDM-VTON inference endpoint here."
        )


class CatVTONEngine(VTONEngine):
    """Integration point for CatVTON (https://github.com/Zheng-Chong/CatVTON)."""

    name = "catvton"

    def generate(self, person_bgr: np.ndarray, garment_image_urls: list[str]) -> np.ndarray:
        raise NotImplementedError(
            "CatVTON engine requires GPU inference infrastructure. "
            "Implement by calling a hosted CatVTON inference endpoint here."
        )


class StableVITONEngine(VTONEngine):
    """Integration point for StableVITON (https://github.com/rlawjdghek/StableVITON)."""

    name = "stable_viton"

    def generate(self, person_bgr: np.ndarray, garment_image_urls: list[str]) -> np.ndarray:
        raise NotImplementedError(
            "StableVITON engine requires GPU inference infrastructure. "
            "Implement by calling a hosted StableVITON inference endpoint here."
        )


def get_engine(engine_name: str) -> VTONEngine:
    from app.services.outfit_preview.compositor import CompositeEngine

    registry: dict[str, type[VTONEngine]] = {
        "composite": CompositeEngine,
        "idm_vton": IDMVTONEngine,
        "catvton": CatVTONEngine,
        "stable_viton": StableVITONEngine,
    }
    engine_cls = registry.get(engine_name, CompositeEngine)
    return engine_cls()
