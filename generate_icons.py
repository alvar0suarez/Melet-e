"""
Melete — Genera iconos PNG para la PWA a partir del diseño del logo.
Ejecuta: python generate_icons.py
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).parent / "ui" / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

# ─── Colores ──────────────────────────────────────────────────────────────────

INDIGO = (129, 140, 248)   # #818cf8
TEAL   = (45,  212, 191)   # #2dd4bf
BG1    = (26,  31,  53)    # #1a1f35  (top-left bg)
BG2    = (13,  26,  24)    # #0d1a18  (bottom-right bg)


def lerp_color(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient_color(x, y, w, h):
    """Diagonal indigo→teal gradient."""
    t = ((x / w) + (y / h)) / 2
    return lerp_color(INDIGO, TEAL, t)


def draw_icon(size: int) -> Image.Image:
    scale = 4                          # supersampling
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    r = int(s * 0.22)                  # corner radius

    # ── Background ────────────────────────────────────────────────────────────
    # Diagonal gradient via horizontal bands
    for y in range(s):
        t = y / s
        color = lerp_color(BG1, BG2, t)
        d.line([(0, y), (s, y)], fill=color + (255,))

    # Mask to rounded rect
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=r, fill=255)
    img.putalpha(mask)

    # ── Subtle inner glow ─────────────────────────────────────────────────────
    rim = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    rim_d = ImageDraw.Draw(rim)
    rim_d.rounded_rectangle([0, 0, s - 1, s - 1], radius=r,
                             fill=None, outline=(*INDIGO, 60), width=max(2, s // 80))
    img = Image.alpha_composite(img, rim)
    d = ImageDraw.Draw(img)

    # ── Star (4-point) above the M ────────────────────────────────────────────
    cx, cy = s // 2, int(s * 0.22)
    sr = int(s * 0.085)                # star outer radius
    ir = int(sr * 0.42)                # star inner radius
    star = []
    for i in range(8):
        angle = math.pi * i / 4 - math.pi / 2
        rad = sr if i % 2 == 0 else ir
        star.append((cx + rad * math.cos(angle), cy + rad * math.sin(angle)))

    # Glow layer
    glow_layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(glow_layer).polygon(star, fill=(*TEAL, 180))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=s * 0.04))
    img = Image.alpha_composite(img, glow_layer)
    d = ImageDraw.Draw(img)

    # Star fill with gradient
    for i in range(len(star)):
        x0, y0 = star[i]
        color = gradient_color(x0, y0, s, s)
        d.polygon(star, fill=(*color, 240))

    # ── Letter M ──────────────────────────────────────────────────────────────
    lw   = max(4, int(s * 0.082))      # stroke width
    pad  = int(s * 0.145)
    top  = int(s * 0.415)
    bot  = int(s * 0.795)
    mid  = int(s * 0.615)              # V-dip depth

    # M path points
    pts = [
        (pad,          bot),
        (pad,          top),
        (s // 2,       mid),
        (s - pad,      top),
        (s - pad,      bot),
    ]

    # Glow pass
    glow_m = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    gm_d = ImageDraw.Draw(glow_m)
    for i in range(len(pts) - 1):
        gm_d.line([pts[i], pts[i + 1]], fill=(*TEAL, 120), width=lw + int(s * 0.05))
    glow_m = glow_m.filter(ImageFilter.GaussianBlur(radius=s * 0.032))
    img = Image.alpha_composite(img, glow_m)
    d = ImageDraw.Draw(img)

    # M segments with gradient color per segment
    segments = list(zip(pts, pts[1:]))
    for (x0, y0), (x1, y1) in segments:
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        color = gradient_color(mx, my, s, s)
        d.line([(x0, y0), (x1, y1)], fill=(*color, 255), width=lw)

    # Round the joints
    joint_r = lw // 2
    for px, py in pts:
        color = gradient_color(px, py, s, s)
        d.ellipse([px - joint_r, py - joint_r, px + joint_r, py + joint_r],
                  fill=(*color, 255))

    # ── Baseline ──────────────────────────────────────────────────────────────
    bl_y = int(s * 0.845)
    bl_w = max(1, int(s * 0.016))
    base_layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(base_layer).line([(pad, bl_y), (s - pad, bl_y)],
                                    fill=(*TEAL, 90), width=bl_w)
    img = Image.alpha_composite(img, base_layer)

    # ── Downsample ────────────────────────────────────────────────────────────
    return img.resize((size, size), Image.LANCZOS)


for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "icon-180.png")]:
    path = OUT / name
    draw_icon(size).save(path, "PNG")
    print(f"  ✓  {path}  ({size}×{size})")

print("\nIconos generados. Reconstruye: cd ui && npm run build")
