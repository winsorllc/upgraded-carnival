#!/usr/bin/env python3
"""Generate images via OpenAI Images API."""

import argparse
import base64
import datetime as dt
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path


def slugify(text: str) -> str:
    """Convert text to URL-safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text or "image"


def default_out_dir() -> Path:
    """Create default output directory."""
    now = dt.datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    preferred = Path.home() / "Projects" / "tmp"
    base = preferred if preferred.is_dir() else Path("./tmp")
    base.mkdir(parents=True, exist_ok=True)
    return base / f"image-gen-{now}"


def get_model_defaults(model: str) -> tuple:
    """Return (default_size, default_quality) for the given model."""
    if model == "dall-e-2":
        return ("1024x1024", "standard")
    elif model == "dall-e-3":
        return ("1024x1024", "standard")
    else:
        # GPT image models
        return ("1024x1024", "high")


def request_images(
    api_key: str,
    prompt: str,
    model: str,
    size: str,
    quality: str,
    background: str = "",
    output_format: str = "",
    style: str = "",
) -> dict:
    """Make API request to OpenAI Images API."""
    url = "https://api.openai.com/v1/images/generations"
    args = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "n": 1,
    }

    # Quality parameter - dall-e-2 doesn't accept this parameter
    if model != "dall-e-2":
        args["quality"] = quality

    # Background for GPT models
    if model.startswith("gpt-image") and background:
        args["background"] = background

    # Output format for GPT models
    if model.startswith("gpt-image") and output_format:
        args["output_format"] = output_format

    # Style for DALL-E 3
    if model == "dall-e-3" and style:
        args["style"] = style

    body = json.dumps(args).encode("utf-8")
    req = urllib.request.Request(
        url,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        data=body,
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        payload = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI Images API failed ({e.code}): {payload}") from e


def write_gallery(out_dir: Path, items: list) -> None:
    """Write HTML gallery with generated images."""
    from html import escape as html_escape
    
    thumbs = "\n".join(
        [
            f"""<figure>
  <a href="{html_escape(it["file"], quote=True)}"><img src="{html_escape(it["file"], quote=True)}" loading="lazy" /></a>
  <figcaption>{html_escape(it["prompt"])}</figcaption>
</figure>""".strip()
            for it in items
        ]
    )
    
    html = f"""<!doctype html>
<meta charset="utf-8" />
<title>image-gen</title>
<style>
  :root {{ color-scheme: dark; }}
  body {{ margin: 24px; font: 14px/1.4 ui-sans-serif, system-ui; background: #0b0f14; color: #e8edf2; }}
  h1 {{ font-size: 18px; margin: 0 0 16px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }}
  figure {{ margin: 0; padding: 12px; border: 1px solid #1e2a36; border-radius: 14px; background: #0f1620; }}
  img {{ width: 100%; height: auto; border-radius: 10px; display: block; }}
  figcaption {{ margin-top: 10px; color: #b7c2cc; }}
  code {{ color: #9cd1ff; }}
</style>
<h1>image-gen</h1>
<p>Output: <code>{html_escape(out_dir.as_posix())}</code></p>
<div class="grid">
{thumbs}
</div>
"""
    (out_dir / "index.html").write_text(html, encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="Generate images via OpenAI Images API.")
    ap.add_argument("--prompt", required=True, help="Image generation prompt.")
    ap.add_argument("--count", type=int, default=1, help="Number of images to generate.")
    ap.add_argument("--model", default="dall-e-3", help="Image model id (dall-e-2, dall-e-3, gpt-image-1).")
    ap.add_argument("--size", default="", help="Image size (e.g., 1024x1024, 1792x1024).")
    ap.add_argument("--quality", default="", help="Image quality (standard, hd, low, medium, high).")
    ap.add_argument("--background", default="", help="Background (GPT models): transparent, opaque, auto.")
    ap.add_argument("--output-format", default="", help="Output format (GPT models): png, jpeg, webp.")
    ap.add_argument("--style", default="", help="Image style (DALL-E 3): vivid, natural.")
    ap.add_argument("--out-dir", default="", help="Output directory.")
    args = ap.parse_args()

    api_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not api_key:
        print("Error: OPENAI_API_KEY not set", file=sys.stderr)
        print("Get an API key from https://platform.openai.com/api-keys", file=sys.stderr)
        return 2

    # Apply model-specific defaults
    default_size, default_quality = get_model_defaults(args.model)
    size = args.size or default_size
    quality = args.quality or default_quality

    count = args.count
    if args.model == "dall-e-3" and count > 1:
        print(f"Warning: DALL-E 3 only supports 1 image per request. Generating {count} sequential requests.", file=sys.stderr)

    out_dir = Path(args.out_dir).expanduser() if args.out_dir else default_out_dir()
    out_dir.mkdir(parents=True, exist_ok=True)

    # Determine file extension based on model and format
    if args.model.startswith("gpt-image") and args.output_format:
        file_ext = args.output_format
    else:
        file_ext = "png"

    items: list = []
    
    for i in range(count):
        print(f"Generating image {i+1}/{count}...")
        
        res = request_images(
            api_key,
            args.prompt,
            args.model,
            size,
            quality,
            args.background,
            args.output_format,
            args.style,
        )
        
        data = res.get("data", [{}])[0]
        image_b64 = data.get("b64_json")
        image_url = data.get("url")
        
        if not image_b64 and not image_url:
            print(f"Error: Unexpected response: {json.dumps(res)[:400]}", file=sys.stderr)
            return 1

        filename = f"{len(items)+1:03d}-{slugify(args.prompt)[:40]}.{file_ext}"
        filepath = out_dir / filename
        
        if image_b64:
            filepath.write_bytes(base64.b64decode(image_b64))
        else:
            try:
                urllib.request.urlretrieve(image_url, filepath)
            except urllib.error.URLError as e:
                print(f"Error: Failed to download image from {image_url}: {e}", file=sys.stderr)
                return 1

        items.append({"prompt": args.prompt, "file": filename})

    # Write metadata
    (out_dir / "prompts.json").write_text(json.dumps(items, indent=2), encoding="utf-8")
    
    # Write gallery
    write_gallery(out_dir, items)
    
    print(f"\nGenerated {len(items)} image(s)")
    print(f"Output: {out_dir}")
    print(f"Gallery: {out_dir / 'index.html'}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())