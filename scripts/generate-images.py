#!/usr/bin/env python3
"""Generate symbol and operator images using the Gemini API.

Generates ~1000 Voynich/Codex Seraphinianus-style symbols and ~100
fictional math operators as white-on-black WebPs via Gemini image gen.
Requires sharp (npm install sharp).

Resumable: skips images that already exist on disk.

Usage:
    python3 scripts/generate-images.py [--symbols N] [--operators N] [--workers N] [--rpm N]
"""

import argparse
import base64
import json
import os
import random
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

API_KEY_FILE = os.environ.get("GEMINI_API_KEY_FILE", "")
MODEL = "gemini-2.5-flash-image"
BASE_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
)

SYMBOLS_DIR = Path("public/symbols")
OPERATORS_DIR = Path("public/operators")

# ---------------------------------------------------------------------------
# Rate limiter (token-bucket)
# ---------------------------------------------------------------------------

class RateLimiter:
    """Simple token-bucket rate limiter."""

    def __init__(self, rpm: int):
        self.interval = 60.0 / rpm
        self.lock = threading.Lock()
        self.last = 0.0

    def wait(self):
        with self.lock:
            now = time.monotonic()
            deadline = self.last + self.interval
            if now < deadline:
                time.sleep(deadline - now)
            self.last = time.monotonic()


# ---------------------------------------------------------------------------
# Prompt generation
# ---------------------------------------------------------------------------

SYMBOL_STYLES = [
    "Voynich manuscript",
    "Codex Seraphinianus",
    "alien botanical codex",
    "undeciphered ancient script",
    "mystical alchemical treatise",
]

SYMBOL_SHAPES = [
    "curving and organic",
    "angular and geometric",
    "flowing calligraphic strokes",
    "branching tree-like structure",
    "spiral and circular motifs",
    "interconnected loops",
    "tall vertical composition",
    "wide horizontal composition",
    "symmetrical form",
    "asymmetrical jagged form",
    "dotted and dashed elements",
    "thick bold strokes",
    "thin delicate lines",
    "nested enclosed shapes",
]

SYMBOL_THEMES = [
    "botanical or plant-like",
    "astronomical or celestial",
    "anatomical or biological",
    "aquatic or marine",
    "architectural or structural",
    "musical or rhythmic",
    "cartographic or map-like",
    "mechanical or gear-like",
    "crystalline or mineral",
    "insectoid or arthropod",
]


def make_symbol_prompt(index: int) -> str:
    rng = random.Random(index * 7 + 42)
    style = rng.choice(SYMBOL_STYLES)
    shape = rng.choice(SYMBOL_SHAPES)
    theme = rng.choice(SYMBOL_THEMES)
    variation = rng.randint(1, 9999)
    return (
        f"Generate a single unique glyph (variation #{variation}) in the style of "
        f"the {style}. The symbol should have {shape} qualities and feel {theme}. "
        f"White symbol on a solid black background. The glyph should be centered and "
        f"fill roughly 60-80% of the image. No text, no labels, no watermarks — "
        f"just one mysterious symbol."
    )


OPERATOR_BASES = [
    "plus sign", "multiplication cross", "integral sign", "summation sigma",
    "product pi", "nabla/del operator", "partial derivative", "infinity symbol",
    "logical AND gate", "set union", "tensor product", "contour integral",
    "double arrow", "turnstile", "tilde operator", "dot product",
    "wedge product", "star operator", "diamond operator", "circle operator",
]

OPERATOR_MODS = [
    "with an extra horizontal bar through it",
    "doubled or mirrored",
    "with small circles at the endpoints",
    "rotated 45 degrees",
    "with a tilde or wave above it",
    "with serifs and decorative terminals",
    "with a subscript dot",
    "enclosed in a partial circle",
    "with an arrow tip on one end",
    "with a diagonal slash through it",
    "with three small dots beside it",
    "inverted or flipped upside down",
    "with curving organic extensions",
    "with angular brackets flanking it",
]


def make_operator_prompt(index: int) -> str:
    rng = random.Random(index * 13 + 97)
    base = rng.choice(OPERATOR_BASES)
    mod = rng.choice(OPERATOR_MODS)
    variation = rng.randint(1, 9999)
    return (
        f"Generate a single fictional mathematical operator symbol (variation #{variation}) "
        f"inspired by a {base} but {mod}. It should look like an operator from an "
        f"alien or undiscovered branch of mathematics — plausible but not real. "
        f"White symbol on a solid black background. Clean geometric design. "
        f"Centered, filling about 50-70% of the image. No text, no labels."
    )


# ---------------------------------------------------------------------------
# API call
# ---------------------------------------------------------------------------

def png_to_webp(png_path: Path, quality: int = 80) -> bool:
    """Convert a PNG to WebP using sharp, remove the original. Returns True on success."""
    webp_path = png_path.with_suffix(".webp")
    try:
        subprocess.run(
            ["node", "-e", f"""
const sharp = require('sharp');
sharp({json.dumps(str(png_path))})
  .webp({{ quality: {quality} }})
  .toFile({json.dumps(str(webp_path))})
  .then(() => process.exit(0))
  .catch(e => {{ console.error(e); process.exit(1); }});
"""],
            check=True, capture_output=True, timeout=30,
        )
        png_path.unlink()
        return True
    except Exception:
        return False


def generate_image(
    api_key: str, prompt: str, limiter: RateLimiter,
    aspect_ratio: str = "1:1", image_size: str = "512px",
) -> bytes | None:
    """Call Gemini to generate an image. Returns PNG bytes or None."""
    limiter.wait()
    url = f"{BASE_URL}?key={api_key}"
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {
                "aspectRatio": aspect_ratio,
                "imageSize": image_size,
            },
        },
    }).encode()

    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json"}
    )

    max_retries = 4
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read())
            parts = result.get("candidates", [{}])[0].get("content", {}).get("parts", [])
            for part in parts:
                if "inlineData" in part:
                    return base64.b64decode(part["inlineData"]["data"])
            # Model returned text only, no image
            return None
        except urllib.error.HTTPError as e:
            body = e.read().decode()[:300]
            if e.code == 429:
                wait = (2 ** attempt) * 5
                print(f"    rate-limited, waiting {wait}s …", flush=True)
                time.sleep(wait)
                continue
            if e.code == 500 and attempt < max_retries - 1:
                time.sleep(3)
                continue
            print(f"    HTTP {e.code}: {body}", file=sys.stderr, flush=True)
            return None
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2)
                continue
            print(f"    error: {e}", file=sys.stderr, flush=True)
            return None
    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_batch(
    label: str,
    out_dir: Path,
    count: int,
    prompt_fn,
    api_key: str,
    limiter: RateLimiter,
    workers: int,
    aspect_ratio: str = "1:1",
    image_size: str = "512px",
):
    out_dir.mkdir(parents=True, exist_ok=True)
    tasks = []
    for i in range(count):
        webp_path = out_dir / f"{i:04d}.webp"
        png_path = out_dir / f"{i:04d}.png"
        if webp_path.exists() and webp_path.stat().st_size > 0:
            continue  # already done
        if png_path.exists() and png_path.stat().st_size > 0:
            continue  # unconverted but present
        tasks.append((i, png_path))

    if not tasks:
        print(f"[{label}] All {count} images already exist — skipping.")
        return

    print(f"[{label}] Generating {len(tasks)} images ({count - len(tasks)} already done) …")
    done = 0
    failed = 0

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {}
        for idx, path in tasks:
            prompt = prompt_fn(idx)
            fut = pool.submit(generate_image, api_key, prompt, limiter, aspect_ratio, image_size)
            futures[fut] = (idx, path)

        for fut in as_completed(futures):
            idx, path = futures[fut]
            try:
                data = fut.result()
                if data:
                    path.write_bytes(data)
                    done += 1
                else:
                    failed += 1
            except Exception as e:
                failed += 1
                print(f"    [{label} {idx:04d}] exception: {e}", file=sys.stderr, flush=True)

            total = done + failed
            if total % 10 == 0 or total == len(tasks):
                print(
                    f"  [{label}] progress: {total}/{len(tasks)} "
                    f"(ok={done}, fail={failed})",
                    flush=True,
                )

    print(f"[{label}] Done. Generated {done}, failed {failed}.")

    # Convert any remaining PNGs to WebP
    pngs = sorted(out_dir.glob("*.png"))
    if pngs:
        print(f"[{label}] Converting {len(pngs)} PNGs to WebP …")
        converted = 0
        for p in pngs:
            if png_to_webp(p):
                converted += 1
        print(f"[{label}] Converted {converted}/{len(pngs)} to WebP.")


def main():
    parser = argparse.ArgumentParser(description="Generate symbol/operator images.")
    parser.add_argument("--symbols", type=int, default=1000, help="Number of symbols")
    parser.add_argument("--operators", type=int, default=100, help="Number of operators")
    parser.add_argument("--workers", type=int, default=10, help="Concurrent workers")
    parser.add_argument("--rpm", type=int, default=30, help="Max requests per minute")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key and API_KEY_FILE:
        api_key = open(API_KEY_FILE).read().strip()
    if not api_key:
        sys.exit("Set GEMINI_API_KEY or GEMINI_API_KEY_FILE to provide an API key.")

    limiter = RateLimiter(args.rpm)

    print(f"Model:    {MODEL}")
    print(f"Workers:  {args.workers}")
    print(f"RPM:      {args.rpm}")
    print(f"Symbols:  {args.symbols} → {SYMBOLS_DIR}/")
    print(f"Operators:{args.operators} → {OPERATORS_DIR}/")
    print()

    run_batch(
        "symbols", SYMBOLS_DIR, args.symbols, make_symbol_prompt,
        api_key, limiter, args.workers,
        aspect_ratio="2:3", image_size="512px",
    )
    run_batch(
        "operators", OPERATORS_DIR, args.operators, make_operator_prompt,
        api_key, limiter, args.workers,
        aspect_ratio="1:1", image_size="512px",
    )

    # Summary
    sym_count = len(list(SYMBOLS_DIR.glob("*.webp")))
    op_count = len(list(OPERATORS_DIR.glob("*.webp")))
    print(f"\nTotal on disk: {sym_count} symbols, {op_count} operators")
    if sym_count < args.symbols or op_count < args.operators:
        print("Re-run this script to fill in any gaps (it resumes automatically).")


if __name__ == "__main__":
    main()
