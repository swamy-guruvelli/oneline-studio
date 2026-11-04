"""English visual scenes for the Telugu MindKraft narration."""

from PIL import ImageDraw

SCENES = [
    {"startRatio": 0.0, "label": "THE PROBLEM", "headline": "JOB SEARCH, SCATTERED"},
    {"startRatio": 0.27, "label": "ROLE MATCH", "headline": "RELEVANT ROLES"},
    {"startRatio": 0.53, "label": "APPLICATION SUPPORT", "headline": "ONE APPLICATION AT A TIME"},
    {"startRatio": 0.77, "label": "YOUR DECISION", "headline": "YOU STAY IN CONTROL"},
]

VOID, PANEL, CYAN, AMBER, COPY, DIM, GREEN = "#07151d", "#091a23", "#52d9d7", "#ffc145", "#e9f5f4", "#94aeb5", "#56d3a2"


def card(draw, box, title, subtitle, assets, color=CYAN):
    draw.rounded_rectangle(box, radius=18, fill=PANEL, outline=color, width=2)
    x1, y1, _, _ = box
    draw.text((x1 + 18, y1 + 19), title, font=assets["small_font"], fill=color)
    draw.text((x1 + 18, y1 + 54), subtitle, font=assets["micro_font"], fill=COPY)


def draw_scene(image, scene_index, scene_time, scene, assets):
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((24, 240, 696, 900), radius=28, fill=VOID, outline="#214550", width=2)
    draw.text((54, 274), scene["label"], font=assets["small_font"], fill=CYAN)
    draw.text((360, 330), scene["headline"], font=assets["title_font"], fill=COPY, anchor="mm")

    if scene_index == 0:
        card(draw, (54, 404, 238, 552), "ROLE SEARCH", "Job listings", assets, AMBER)
        card(draw, (268, 404, 452, 552), "CV + LETTER", "Separate files", assets, DIM)
        card(draw, (482, 404, 666, 552), "APPLICATIONS", "Status updates", assets, DIM)
        draw.line((238, 478, 268, 478), fill=AMBER, width=3)
        draw.line((452, 478, 482, 478), fill=AMBER, width=3)
        draw.text((360, 640), "TOO MANY TABS. NO CLEAR NEXT STEP.", font=assets["small_font"], fill=AMBER, anchor="mm")
    elif scene_index == 1:
        card(draw, (62, 415, 226, 600), "YOUR PROFILE", "Skills / Experience / Goals", assets)
        draw.ellipse((292, 446, 428, 582), fill="#0b3039", outline=CYAN, width=3)
        draw.text((360, 500), "FIT", font=assets["body_font"], fill=CYAN, anchor="mm")
        draw.text((360, 536), "CHECK", font=assets["micro_font"], fill=COPY, anchor="mm")
        draw.line((226, 514, 292, 514), fill=CYAN, width=4)
        draw.line((428, 514, 494, 514), fill=CYAN, width=4)
        card(draw, (494, 407, 658, 468), "ROLE A", "GOOD FIT", assets, GREEN)
        card(draw, (494, 485, 658, 546), "ROLE B", "REVIEW", assets, CYAN)
        draw.text((360, 664), "FOCUS ON ROLES THAT SUIT YOUR EXPERIENCE", font=assets["micro_font"], fill=DIM, anchor="mm")
    elif scene_index == 2:
        card(draw, (78, 405, 642, 492), "SELECTED ROLE", "Product Designer", assets, AMBER)
        draw.line((360, 492, 360, 531), fill=CYAN, width=4)
        card(draw, (78, 531, 642, 618), "TAILORED CV + COVER LETTER", "Prepared for this role", assets)
        draw.line((360, 618, 360, 652), fill=CYAN, width=4)
        card(draw, (78, 652, 642, 739), "FIELD-AWARE REVIEW", "Check details before you decide", assets, GREEN)
    else:
        card(draw, (58, 405, 370, 493), "APPLICATION TRACKER", "Reviewed / Next step / In progress", assets)
        draw.rounded_rectangle((428, 405, 662, 678), radius=20, fill="#211a0d", outline=AMBER, width=2)
        draw.ellipse((518, 438, 572, 492), fill="#33250b", outline=AMBER, width=2)
        draw.text((545, 465), "✓", font=assets["body_font"], fill=AMBER, anchor="mm")
        draw.text((545, 530), "YOUR APPROVAL", font=assets["small_font"], fill=AMBER, anchor="mm")
        draw.text((545, 563), "Review all details", font=assets["micro_font"], fill=COPY, anchor="mm")
        draw.rounded_rectangle((462, 597, 628, 643), radius=20, fill="#0b2c23", outline=GREEN, width=2)
        draw.text((545, 620), "APPROVED BY YOU", font=assets["micro_font"], fill=GREEN, anchor="mm")
        draw.line((370, 449, 428, 449), fill=AMBER, width=3)
        draw.text((360, 714), "THE FINAL CHOICE STAYS WITH YOU", font=assets["small_font"], fill=CYAN, anchor="mm")

    draw.rounded_rectangle((76, 828, 644, 878), radius=18, fill="#0b3039", outline=CYAN, width=1)
    draw.text((360, 853), scene["status"], font=assets["micro_font"], fill=CYAN, anchor="mm")
