"""
Generate PWA icons for Melete.
Run once: python generate_icons.py
Requires Pillow (already a Melete dependency).
Output: ui/public/icons/{icon-192.png, icon-512.png, icon-180.png}
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).parent / "ui" / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = int(size * 0.08)

    # Background rounded rect (dark)
    bg_color = (13, 17, 23, 255)       # #0d1117
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=bg_color)

    # Gradient simulation: two overlapping semi-transparent rects (indigo → teal)
    # Top-left accent
    indigo = (79, 70, 229, 200)        # indigo
    teal   = (13, 148, 136, 200)       # teal
    cx, cy = size // 2, size // 2
    r = int(size * 0.32)

    # Draw a stylised open book shape
    book_color = (129, 140, 248, 255)  # --indigo
    lw = max(2, size // 40)

    # Book spine (vertical line)
    d.line([(cx, cy - r), (cx, cy + r)], fill=book_color, width=lw)

    # Left page arc
    left_pts = [
        (cx, cy - r),
        (cx - int(r * 0.9), cy - int(r * 0.3)),
        (cx - int(r * 0.9), cy + int(r * 0.3)),
        (cx, cy + r),
    ]
    d.line(left_pts, fill=(45, 212, 191, 255), width=lw, joint="curve")

    # Right page arc (mirror)
    right_pts = [
        (cx, cy - r),
        (cx + int(r * 0.9), cy - int(r * 0.3)),
        (cx + int(r * 0.9), cy + int(r * 0.3)),
        (cx, cy + r),
    ]
    d.line(right_pts, fill=book_color, width=lw, joint="curve")

    # Three horizontal lines on right page (text lines)
    line_color = (129, 140, 248, 160)
    for i, frac in enumerate([-0.18, 0.02, 0.22]):
        y = cy + int(r * frac)
        x1 = cx + int(r * 0.12)
        x2 = cx + int(r * 0.70)
        if i == 2:
            x2 = cx + int(r * 0.45)
        d.line([(x1, y), (x2, y)], fill=line_color, width=max(1, lw // 2))

    return img


for size, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "icon-180.png")]:
    img = draw_icon(size)
    path = OUT / name
    img.save(path, "PNG")
    print(f"  Created {path} ({size}x{size})")

print("\nIcons generated. Rebuild the frontend: cd ui && npm run build")
