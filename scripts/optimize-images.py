#!/usr/bin/env python3
"""
Batch-convert exercise PNGs to WebP with a PNG fallback.
Run from repo root: python3 scripts/optimize-images.py
"""
import os
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
EXERCISES_DIR = ROOT / "public" / "images" / "exercises"
QUALITY = 85
MAX_SIZE = (768, 768)


def convert_image(png_path: Path) -> Path:
    webp_path = png_path.with_suffix(".webp")
    with Image.open(png_path) as im:
        # Convert palette or other modes to RGB/RGBA for WebP
        if im.mode in ("P", "1", "L", "LA"):
            im = im.convert("RGBA" if im.mode == "LA" or "transparency" in im.info else "RGB")
        elif im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGB")

        # Resize only if larger than MAX_SIZE (keep aspect ratio)
        im.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
        im.save(webp_path, "WEBP", quality=QUALITY, method=6)
    return webp_path


def main():
    if not EXERCISES_DIR.exists():
        print(f"Directory not found: {EXERCISES_DIR}")
        sys.exit(1)

    pngs = sorted(EXERCISES_DIR.rglob("screen.png"))
    total_saved = 0
    for png_path in pngs:
        webp_path = convert_image(png_path)
        original_size = png_path.stat().st_size
        new_size = webp_path.stat().st_size
        saved = original_size - new_size
        total_saved += saved
        print(
            f"{png_path.parent.name}: {original_size / 1024:.1f}KB -> {new_size / 1024:.1f}KB "
            f"(saved {saved / 1024:.1f}KB)"
        )

    print(f"\nTotal saved: {total_saved / 1024 / 1024:.2f}MB")


if __name__ == "__main__":
    main()
