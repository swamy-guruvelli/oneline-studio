from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "templates" / "explainer" / "assets" / "oneline-studio-logo.png"
SIZE = 512


def main():
    scale = 3
    size = SIZE * scale
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    bounds = (54 * scale, 54 * scale, 458 * scale, 458 * scale)
    draw.rounded_rectangle(bounds, radius=116 * scale, fill="#081821", outline="#52d9d7", width=14 * scale)

    # A play mark with a small amber spark reads as both video and automation.
    draw.polygon(
        [(202 * scale, 145 * scale), (366 * scale, 256 * scale), (202 * scale, 367 * scale)],
        fill="#52d9d7",
    )
    spark = (375 * scale, 94 * scale)
    points = [
        (spark[0], spark[1] - 33 * scale),
        (spark[0] + 10 * scale, spark[1] - 10 * scale),
        (spark[0] + 33 * scale, spark[1]),
        (spark[0] + 10 * scale, spark[1] + 10 * scale),
        (spark[0], spark[1] + 33 * scale),
        (spark[0] - 10 * scale, spark[1] + 10 * scale),
        (spark[0] - 33 * scale, spark[1]),
        (spark[0] - 10 * scale, spark[1] - 10 * scale),
    ]
    draw.polygon(points, fill="#ffc145")
    image.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(OUTPUT)


if __name__ == "__main__":
    main()
