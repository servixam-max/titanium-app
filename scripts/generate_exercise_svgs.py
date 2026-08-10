#!/usr/bin/env python3
"""Generate hi-quality neon-on-dark exercise SVGs and render to PNG via Chrome."""
import os
import subprocess
import textwrap

OUT_DIR = "/Users/servimac/apps/Titanium/titanium-app/public/images/exercises"

# SVG template: 800x600, dark bg #1a1a1a, neon #ccff00, figure in wireframe style.
SVG_BASE = '''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="800" height="600" fill="#111111"/>
  <text x="400" y="46" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#ccff00" letter-spacing="2">{title}</text>
  {panels}
</svg>'''


def panel_group(x, y, label, content, width=360, height=500):
    return f'''
  <g transform="translate({x},{y})">
    <rect width="{width}" height="{height}" rx="16" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <text x="{width/2}" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#ccff00">{label}</text>
    <g transform="translate(30,60)">
      {content}
    </g>
  </g>'''


def dumbbell(x, y, rot=0):
    return f'''<g transform="translate({x},{y}) rotate({rot})" filter="url(#glow)">
  <rect x="-32" y="-5" width="64" height="10" rx="3" fill="#555"/>
  <rect x="-40" y="-14" width="18" height="28" rx="4" fill="#ccff00"/>
  <rect x="22" y="-14" width="18" height="28" rx="4" fill="#ccff00"/>
</g>'''


def figure_standing(x=150, y=280):
    return f'''<g transform="translate({x},{y})" stroke="#888" stroke-width="2.5" fill="none">
  <!-- head -->
  <circle cx="0" cy="-95" r="22"/>
  <!-- torso -->
  <line x1="0" y1="-73" x2="0" y2="30"/>
  <line x1="0" y1="-45" x2="-40" y2="-25"/> <!-- left shoulder -->
  <line x1="0" y1="-45" x2="40" y2="-25"/>
  <line x1="-40" y1="-25" x2="-45" y2="25"/> <!-- left upper arm -->
  <line x1="40" y1="-25" x2="45" y2="25"/>
  <line x1="-45" y1="25" x2="-50" y2="75"/> <!-- left forearm -->
  <line x1="45" y1="25" x2="50" y2="75"/>
  <line x1="0" y1="30" x2="-28" y2="120"/> <!-- left thigh -->
  <line x1="0" y1="30" x2="28" y2="120"/>
  <line x1="-28" y1="120" x2="-22" y2="200"/> <!-- left shin -->
  <line x1="28" y1="120" x2="22" y2="200"/>
  <path d="M-30 200 h16 M14 200 h16" stroke="#ccff00" stroke-width="4"/>
</g>'''


def figure_bent_over(x=150, y=300):
    return f'''<g transform="translate({x},{y})" stroke="#888" stroke-width="2.5" fill="none">
  <circle cx="35" cy="-135" r="22"/>
  <line x1="35" y1="-113" x2="0" y2="-30"/> <!-- torso leaning -->
  <line x1="0" y1="-30" x2="-55" y2="-45"/> <!-- left shoulder back -->
  <line x1="0" y1="-30" x2="45" y2="-35"/>
  <line x1="-55" y1="-45" x2="-80" y2="-20"/> <!-- left upper arm hanging -->
  <line x1="45" y1="-35" x2="65" y2="-5"/>
  <line x1="-80" y1="-20" x2="-90" y2="35"/> <!-- left forearm -->
  <line x1="65" y1="-5" x2="75" y2="45"/>
  <line x1="0" y1="-30" x2="-25" y2="70"/> <!-- left thigh -->
  <line x1="0" y1="-30" x2="35" y2="75"/>
  <line x1="-25" y1="70" x2="-20" y2="150"/> <!-- left shin -->
  <line x1="35" y1="75" x2="30" y2="155"/>
  <path d="M-28 150 h14 M16 155 h14" stroke="#ccff00" stroke-width="4"/>
</g>'''


def muscle_shoulder(color="#ccff00"):
    return f'<circle cx="0" cy="-45" r="14" fill="none" stroke="{color}" stroke-width="3" filter="url(#glow)"/>'


def muscle_delt_back(color="#ccff00"):
    return f'<ellipse cx="-35" cy="-42" rx="16" ry="22" fill="none" stroke="{color}" stroke-width="3" filter="url(#glow)"/>'


def muscle_trap(color="#ccff00"):
    return f'<path d="M-18,-65 Q0,-78 18,-65" fill="none" stroke="{color}" stroke-width="4" filter="url(#glow)"/>'


def muscle_lat(color="#ccff00"):
    return f'<path d="M-30,-20 Q-42,10 -28,45" fill="none" stroke="{color}" stroke-width="3" filter="url(#glow)"/>'


def muscle_biceps(color="#ccff00"):
    return f'<ellipse cx="-42" cy="-5" rx="10" ry="18" fill="none" stroke="{color}" stroke-width="3" filter="url(#glow)" transform="rotate(-15 -42 -5)"/>'


def muscle_triceps(color="#ccff00"):
    return f'<ellipse cx="-45" cy="45" rx="9" ry="16" fill="none" stroke="{color}" stroke-width="3" filter="url(#glow)" transform="rotate(10 -45 45)"/>'


def muscle_chest(color="#ccff00"):
    return f'<path d="M-25,-55 Q0,-68 25,-55 Q0,-35 -25,-55" fill="none" stroke="{color}" stroke-width="3" filter="url(#glow)"/>'


def arrow(x1, y1, x2, y2, color="#ccff00"):
    dx, dy = x2 - x1, y2 - y1
    ang = __import__('math').atan2(dy, dx)
    import math
    ang = math.atan2(dy, dx)
    ax1 = x2 - 10 * math.cos(ang - 0.5)
    ay1 = y2 - 10 * math.sin(ang - 0.5)
    ax2 = x2 - 10 * math.cos(ang + 0.5)
    ay2 = y2 - 10 * math.sin(ang + 0.5)
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="3" marker-end="none"/><path d="M{x2},{y2} L{ax1},{ay1} M{x2},{ay2} L{ax2},{ay2}" fill="none" stroke="{color}" stroke-width="3"/>'


EXERCISES = {
    "reverse_fly": {
        "title": "REVERSE FLY",
        "panels": (
            panel_group(30, 80, "A. START / STRETCH",
                figure_bent_over(150, 260) +
                muscle_delt_back() + muscle_lat() +
                dumbbell(-55, -10, 0) + dumbbell(55, 40, 0) +
                arrow(-80, 30, -120, 25, "#ccff00"),
                width=360, height=500),
            panel_group(410, 80, "B. SQUEEZE",
                figure_bent_over(150, 260) +
                muscle_delt_back() + muscle_lat() +
                dumbbell(-110, -5, 0) + dumbbell(120, 35, 0) +
                arrow(-120, -5, -70, -5, "#ccff00") + arrow(120, 35, 70, 35, "#ccff00"),
                width=360, height=500),
        )
    },
    "upright_row": {
        "title": "UPRIGHT ROW",
        "panels": (
            panel_group(30, 80, "A. START",
                figure_standing(150, 280) +
                muscle_trap() + muscle_shoulder() +
                dumbbell(0, 80, 0),
                width=360, height=500),
            panel_group(410, 80, "B. PULL TO CHIN",
                figure_standing(150, 280) +
                muscle_trap() + muscle_shoulder() +
                dumbbell(0, -20, 0) +
                arrow(0, 80, 0, -10, "#ccff00"),
                width=360, height=500),
        )
    },
    "lateral_raise": {
        "title": "LATERAL RAISE",
        "panels": (
            panel_group(30, 80, "A. START",
                figure_standing(150, 280) +
                muscle_shoulder() +
                dumbbell(-50, 80, 0) + dumbbell(50, 80, 0),
                width=360, height=500),
            panel_group(410, 80, "B. TOP",
                figure_standing(150, 280) +
                muscle_shoulder() +
                dumbbell(-110, -55, 0) + dumbbell(110, -55, 0) +
                arrow(-50, 80, -110, -55, "#ccff00") + arrow(50, 80, 110, -55, "#ccff00"),
                width=360, height=500),
        )
    },
    "front_raise": {
        "title": "FRONT RAISE",
        "panels": (
            panel_group(30, 80, "A. START",
                figure_standing(150, 280) +
                muscle_shoulder() + muscle_chest() +
                dumbbell(-50, 80, 0) + dumbbell(50, 80, 0),
                width=360, height=500),
            panel_group(410, 80, "B. RAISE",
                figure_standing(150, 280) +
                muscle_shoulder() + muscle_chest() +
                dumbbell(0, -55, 0) +
                arrow(0, 80, 0, -55, "#ccff00"),
                width=360, height=500),
        )
    },
    "shrug": {
        "title": "SHRUG",
        "panels": (
            panel_group(30, 80, "A. START",
                figure_standing(150, 280) +
                muscle_trap() +
                dumbbell(-50, 80, 0) + dumbbell(50, 80, 0),
                width=360, height=500),
            panel_group(410, 80, "B. SQUEEZE",
                figure_standing(150, 260) +
                muscle_trap() +
                dumbbell(-50, 70, 0) + dumbbell(50, 70, 0) +
                arrow(0, -70, 0, -95, "#ccff00"),
                width=360, height=500),
        )
    },
    "push_press": {
        "title": "PUSH PRESS",
        "panels": (
            panel_group(30, 80, "A. DIP",
                figure_standing(150, 290) +
                muscle_shoulder() + muscle_chest() +
                dumbbell(-40, -30, 0) + dumbbell(40, -30, 0) +
                arrow(0, 20, 0, 50, "#ccff00"),
                width=360, height=500),
            panel_group(410, 80, "B. PRESS",
                figure_standing(150, 280) +
                muscle_shoulder() + muscle_chest() +
                dumbbell(-60, -120, 0) + dumbbell(60, -120, 0) +
                arrow(0, -30, 0, -120, "#ccff00"),
                width=360, height=500),
        )
    },
    "clean_press": {
        "title": "CLEAN & PRESS",
        "panels": (
            panel_group(30, 80, "A. HANG CLEAN",
                figure_standing(150, 290) +
                muscle_shoulder() + muscle_biceps() + muscle_chest() +
                dumbbell(-45, 20, 0) + dumbbell(45, 20, 0) +
                arrow(-45, 80, -45, 30, "#ccff00") + arrow(45, 80, 45, 30, "#ccff00"),
                width=360, height=500),
            panel_group(410, 80, "B. PRESS",
                figure_standing(150, 280) +
                muscle_shoulder() + muscle_chest() +
                dumbbell(-60, -120, 0) + dumbbell(60, -120, 0) +
                arrow(0, -30, 0, -120, "#ccff00"),
                width=360, height=500),
        )
    },
}


def main():
    chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    for key, cfg in EXERCISES.items():
        folder = os.path.join(OUT_DIR, key)
        os.makedirs(folder, exist_ok=True)
        svg_path = os.path.join(folder, "screen.svg")
        png_path = os.path.join(folder, "screen.png")
        svg = SVG_BASE.format(title=cfg["title"], panels="\n".join(cfg["panels"]))
        with open(svg_path, "w") as f:
            f.write(svg)
        cmd = [
            chrome, "--headless", "--disable-gpu", "--hide-scrollbars",
            f"--screenshot={png_path}", "--window-size=800,600",
            "--default-background-color=00000000", "--force-device-scale-factor=2",
            svg_path,
        ]
        subprocess.run(cmd, check=True, capture_output=True, timeout=30)
        size = os.path.getsize(png_path)
        print(f"{key}: {png_path} ({size} bytes)")


if __name__ == "__main__":
    main()
