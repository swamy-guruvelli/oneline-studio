"""Starter scene for the browser-free Pillow renderer.

Replace SCENES and draw_scene with a topic-specific visual metaphor. The
renderer calls draw_scene(image, scene_index, scene_time, scene, assets).
"""

from PIL import ImageDraw


SCENES = [
    {"startRatio": 0.0, "label": "INTRODUCE THE PROBLEM", "headline": "REPLACE WITH THE FIRST VISUAL BEAT"},
    {"startRatio": 0.34, "label": "EXPLAIN THE MECHANISM", "headline": "REVEAL A MEANINGFUL STATE CHANGE"},
    {"startRatio": 0.68, "label": "SHOW THE RESULT", "headline": "LAND THE MAIN TAKEAWAY"},
]


def draw_scene(image, scene_index, scene_time, scene, assets):
    draw = ImageDraw.Draw(image)
    left, top, right, bottom = 24, 240, 696, 900
    draw.rounded_rectangle((left, top, right, bottom), radius=28, fill="#091a23", outline="#214550", width=2)
    draw.text((54, 276), scene.get("label", "EXPLAINER"), font=assets["small_font"], fill="#52d9d7")
    draw.text((54, 354), scene.get("headline", "REPLACE WITH A TOPIC-SPECIFIC VISUAL"), font=assets["title_font"], fill="#f1fbfa")

    # A simple animated state change that makes the starter visibly move.
    progress = min(1.0, max(0.0, scene_time / 1.5))
    track = (84, 620, 636, 652)
    draw.rounded_rectangle(track, radius=16, fill="#0a2028", outline="#31545e", width=2)
    draw.rounded_rectangle((track[0], track[1], track[0] + int((track[2] - track[0]) * progress), track[3]), radius=16, fill="#52d9d7")
    draw.ellipse((track[0] + int((track[2] - track[0]) * progress) - 12, 614, track[0] + int((track[2] - track[0]) * progress) + 12, 658), fill="#ffc145")
