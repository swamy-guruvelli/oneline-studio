"""Pillow 2D scenes for the OneLine Studio workflow example."""

from PIL import ImageDraw


SCENES = [
    {"startRatio": 0.0, "label": "START WITH ONE IDEA", "headline": "ONE SENTENCE"},
    {"startRatio": 0.19, "label": "BUILD THE EXPLANATION", "headline": "A CLEAR VISUAL PATH"},
    {"startRatio": 0.44, "label": "FINISH THE VIDEO", "headline": "ONE FINISHED VIDEO"},
]

CYAN = "#52d9d7"
AMBER = "#ffc145"
GREEN = "#75e6a4"
COPY = "#e9f5f4"
DIM = "#94aeb5"
PANEL = "#091a23"
EDGE = "#31545e"


def centered(draw, xy, text, font, fill):
    draw.text(xy, text, font=font, fill=fill, anchor="mm")


def draw_scene(image, scene_index, scene_time, scene, assets):
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((32, 248, 688, 886), radius=30, fill="#07131b", outline=EDGE, width=2)
    draw.text((64, 282), scene["label"], font=assets["small_font"], fill=CYAN)
    centered(draw, (360, 338), scene["headline"], assets["title_font"], COPY)

    if scene_index == 0:
        draw.rounded_rectangle((78, 388, 642, 570), radius=24, fill=PANEL, outline=CYAN, width=2)
        centered(draw, (360, 438), "A CLEAR QUESTION", assets["small_font"], CYAN)
        centered(draw, (360, 498), "becomes a visual story", assets["body_font"], COPY)
        centered(draw, (128, 632), "IDEA", assets["small_font"], DIM)
        centered(draw, (592, 632), "VIDEO", assets["small_font"], DIM)
        draw.line((142, 680, 578, 680), fill="#1e4650", width=8)
        progress = (scene_time % 3.2) / 3.2
        x = 142 + int(436 * progress)
        draw.line((142, 680, x, 680), fill=CYAN, width=8)
        draw.ellipse((x - 17, 663, x + 17, 697), fill=AMBER, outline=COPY, width=2)
        centered(draw, (360, 770), "THE PROMPT IS THE STARTING POINT", assets["micro_font"], DIM)
        return

    if scene_index == 1:
        boxes = [(54, "FACTS", "Check the idea", CYAN), (260, "SCRIPT", "Shape the story", AMBER), (466, "SCENES", "Show each step", GREEN)]
        active = min(2, int(scene_time / 2.4))
        for index, (x, title, detail, color) in enumerate(boxes):
            stroke = color if index <= active else EDGE
            draw.rounded_rectangle((x, 438, x + 200, 622), radius=22, fill=PANEL, outline=stroke, width=3 if index == active else 2)
            centered(draw, (x + 100, 490), f"0{index + 1}", assets["small_font"], color)
            centered(draw, (x + 100, 536), title, assets["body_font"], COPY)
            centered(draw, (x + 100, 582), detail, assets["micro_font"], DIM)
        for x in (254, 460):
            draw.line((x - 12, 530, x + 4, 530), fill=CYAN, width=4)
            draw.polygon([(x + 10, 530), (x, 522), (x, 538)], fill=CYAN)
        centered(draw, (360, 720), "QUESTION  >  EXPLANATION  >  EXAMPLE", assets["micro_font"], DIM)
        return

    # Narration is connected to the finished vertical video and timed captions.
    draw.rounded_rectangle((64, 424, 278, 698), radius=22, fill=PANEL, outline=CYAN, width=2)
    centered(draw, (171, 466), "NARRATION", assets["small_font"], CYAN)
    for index, height in enumerate((26, 50, 35, 68, 42, 58, 30, 46)):
        x = 96 + index * 20
        y = 548
        draw.rounded_rectangle((x, y - height // 2, x + 10, y + height // 2), radius=5, fill=AMBER if index == 3 else CYAN)
    centered(draw, (171, 638), "WORD TIMING", assets["micro_font"], DIM)
    draw.line((280, 554, 340, 554), fill=GREEN, width=4)
    draw.polygon([(350, 554), (334, 546), (334, 562)], fill=GREEN)

    draw.rounded_rectangle((350, 390, 620, 742), radius=30, fill="#0c2029", outline=GREEN, width=3)
    draw.rounded_rectangle((374, 430, 596, 650), radius=20, fill="#050a10", outline=EDGE, width=2)
    draw.rounded_rectangle((398, 468, 572, 548), radius=14, fill="#10303a", outline=CYAN, width=2)
    centered(draw, (485, 508), "VIDEO SCENES", assets["small_font"], CYAN)
    draw.rounded_rectangle((398, 570, 572, 626), radius=15, fill="#2a210f", outline=AMBER, width=2)
    centered(draw, (485, 598), "WORD BY WORD", assets["micro_font"], AMBER)
    draw.ellipse((456, 678, 514, 736), fill=CYAN)
    draw.polygon([(480, 694), (480, 720), (501, 707)], fill="#07131b")
    centered(draw, (360, 804), "SCENES  /  CAPTIONS  /  MP4", assets["micro_font"], DIM)
