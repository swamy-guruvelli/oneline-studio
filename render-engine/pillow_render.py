import importlib.util
import json
import os
import shutil
import subprocess
import sys
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH, HEIGHT, FPS = 720, 1280, 30
VOID, PANEL, CYAN, AMBER, COPY, DIM = "#050a10", "#091a23", "#52d9d7", "#ffc145", "#e9f5f4", "#94aeb5"


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def find_ffmpeg(root):
    candidates = [
        os.environ.get("ONELINE_FFMPEG"),
        shutil.which("ffmpeg"),
        root / "node_modules" / "ffmpeg-static" / "ffmpeg.exe",
        root / "node_modules" / "ffmpeg-static" / "ffmpeg",
    ]
    for item in candidates:
        if item and Path(item).is_file():
            return str(item)
    raise RuntimeError("FFmpeg is unavailable. Install FFmpeg or use an environment that provides it.")


def find_ffprobe(root):
    candidates = [
        os.environ.get("ONELINE_FFPROBE"),
        shutil.which("ffprobe"),
        root / "node_modules" / "ffprobe-static" / "bin" / "win32" / "x64" / "ffprobe.exe",
        root / "node_modules" / "ffprobe-static" / "bin" / "linux" / "x64" / "ffprobe",
        root / "node_modules" / "ffprobe-static" / "bin" / "darwin" / "x64" / "ffprobe",
        root / "node_modules" / "ffprobe-static" / "bin" / "darwin" / "arm64" / "ffprobe",
    ]
    for item in candidates:
        if item and Path(item).is_file():
            return str(item)
    raise RuntimeError("FFprobe is unavailable. Install FFprobe or use an environment that provides it.")


def find_font(candidates, size):
    for candidate in candidates:
        if Path(candidate).is_file():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def fonts(root):
    candidates = [
        root / "assets" / "fonts" / "DejaVuSans.ttf",
        Path("C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"),
    ]
    return {
        "title_font": find_font(candidates, 32),
        "body_font": find_font(candidates, 26),
        "caption_font": find_font(candidates, 30),
        "small_font": find_font(candidates, 14),
        "micro_font": find_font(candidates, 12),
    }


def load_scene_module(project):
    scene_path = project / "scene_pillow.py"
    if not scene_path.is_file():
        raise RuntimeError("Pillow rendering needs scene_pillow.py. Create topic-specific scenes there or use the browser renderer.")
    spec = importlib.util.spec_from_file_location("oneline_project_scene", scene_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if not isinstance(getattr(module, "SCENES", None), list) or not module.SCENES:
        raise RuntimeError("scene_pillow.py must define a non-empty SCENES list with startRatio or startSec values.")
    if not callable(getattr(module, "draw_scene", None)):
        raise RuntimeError("scene_pillow.py must define draw_scene(image, scene_index, scene_time, scene, assets).")
    return module


def audio_duration(path):
    with wave.open(str(path), "rb") as wav:
        return wav.getnframes() / float(wav.getframerate())


def active_caption(timing, seconds):
    for row in timing["sentences"]:
        if row["startSec"] <= seconds <= row["endSec"]:
            return row
    return None


def scene_start_seconds(scene, duration):
    if "startRatio" in scene:
        return min(1.0, max(0.0, float(scene["startRatio"]))) * duration
    return float(scene.get("startSec", 0))


def draw_caption(draw, row, settings, font, top):
    if not row:
        return
    if settings.get("style") == "karaoke":
        words = row.get("words")
        if not isinstance(words, list) or not words:
            raise RuntimeError("Word timings are required for karaoke captions. Align this WAV or provide reviewed word times.")
        active = 0
        for index, word in enumerate(words):
            active = index
            if word.get("endSec", 0) >= row.get("activeTime", 0):
                break
        language = str(settings.get("spokenLanguage", "auto")).split("-", 1)[0]
        gap = 0 if language in {"zh", "ja", "th", "lo", "km", "my"} else 8
        draw_wrapped_words(draw, words, active, font, top, gap=gap)
    else:
        draw.rounded_rectangle((42, top - 18, 678, top + 116), radius=18, fill="#07131b", outline="#214550", width=2)
        draw_centered_wrapped(draw, row.get("text", ""), font, (360, top + 48), 588, COPY, line_gap=5)


def draw_wrapped_words(draw, words, active, font, top, fill_width=624, gap=8):
    rows, current = [], []
    for index, word in enumerate(words):
        text = word["text"]
        trial = current + [(index, text)]
        width = sum(draw.textlength(item[1], font=font) for item in trial) + max(0, len(trial) - 1) * gap
        if current and width > fill_width:
            rows.append(current)
            current = [(index, text)]
        else:
            current = trial
    if current:
        rows.append(current)
    line_height = 42
    top = top + max(0, (3 - len(rows)) * 19)
    for row_index, row in enumerate(rows[:4]):
        widths = [draw.textlength(text, font=font) for _, text in row]
        gaps = gap * max(0, len(row) - 1)
        x = (WIDTH - sum(widths) - gaps) / 2
        y = top + row_index * line_height
        for (word_index, text), width in zip(row, widths):
            color = AMBER if word_index == active else COPY
            draw.text((x, y), text, font=font, fill=color, stroke_width=1 if word_index == active else 0, stroke_fill="#704b00")
            x += width + gap


def draw_centered_wrapped(draw, text, font, center, max_width, fill, line_gap=6):
    lines, current = [], ""
    text = str(text)
    units = text.split()
    if len(units) == 1 and draw.textlength(units[0], font=font) > max_width:
        units = list(units[0])
    for word in units:
        trial = f"{current} {word}".strip()
        if current and draw.textlength(trial, font=font) > max_width:
            lines.append(current)
            current = word
        else:
            current = trial
    if current:
        lines.append(current)
    bbox = draw.textbbox((0, 0), "Ag", font=font)
    line_height = bbox[3] - bbox[1] + line_gap
    first_y = center[1] - (len(lines) - 1) * line_height / 2
    for index, line in enumerate(lines):
        draw.text((center[0], first_y + index * line_height), line, font=font, fill=fill, anchor="mm")


def make_background():
    image = Image.new("RGB", (WIDTH, HEIGHT), VOID)
    pixels = image.load()
    for y in range(HEIGHT):
        factor = max(0.0, 1.0 - abs(y - HEIGHT * 0.42) / (HEIGHT * 0.85))
        for x in range(WIDTH):
            radial = max(0.0, 1.0 - abs(x - WIDTH * 0.5) / WIDTH)
            glow = int(18 * factor * radial)
            pixels[x, y] = (5 + glow // 3, 10 + glow, 16 + glow)
    draw = ImageDraw.Draw(image)
    draw.line((42, 112, 678, 112), fill="#183b44", width=2)
    return image


def brand_info(manifest):
    brand = manifest.get("brand") or {}
    name = str(brand.get("name") or "OneLine Studio")
    return {
        "name": name,
        "tagline": str(brand.get("tagline") or "ONE SENTENCE. ONE VIDEO."),
        "logoFile": str(brand.get("logoFile") or "assets/oneline-studio-logo.png"),
        "outro": str(brand.get("outro") or f"MADE WITH {name.upper()}"),
    }


def draw_brand(image, brand, assets):
    draw = ImageDraw.Draw(image)
    logo_path = Path(brand["logoFile"])
    if not logo_path.is_absolute():
        logo_path = PROJECT_DIR / logo_path
    if logo_path.is_file():
        logo = Image.open(logo_path).convert("RGBA").resize((50, 50), Image.Resampling.LANCZOS)
        image.paste(logo, (48, 35), logo)
    draw.text((110, 49), brand["name"].upper(), font=assets["body_font"], fill=COPY)
    draw.text((476, 59), brand["tagline"].upper(), font=assets["micro_font"], fill=DIM)


def draw_cover(image, manifest, brand, assets, seconds, timing, hook, caption_settings):
    draw = ImageDraw.Draw(image)
    draw_brand(image, brand, assets)
    draw.text((360, 300), f"{brand['name']} {brand['tagline']}", font=assets["small_font"], fill=CYAN, anchor="mm")
    draw.rounded_rectangle((248, 355, 472, 398), radius=21, fill="#211a0d", outline=AMBER, width=2)
    draw.text((360, 376), "VIDEO EXPLAINER", font=assets["micro_font"], fill=AMBER, anchor="mm")
    title = str(manifest.get("title") or "A VIDEO FROM ONE SENTENCE")
    draw_centered_wrapped(draw, title[:96], assets["title_font"], (360, 500), 620, COPY, line_gap=4)
    draw.text((360, 650), "WHAT IF...?", font=assets["title_font"], fill=AMBER, anchor="mm")
    draw_centered_wrapped(draw, hook[:128], assets["body_font"], (360, 730), 620, DIM, line_gap=5)
    progress = min(1.0, max(0.0, seconds))
    draw.line((84, 830, 636, 830), fill="#214550", width=4)
    draw.line((84, 830, 84 + int(552 * progress), 830), fill=CYAN, width=4)
    packet_x = 84 + int(552 * progress)
    draw.ellipse((packet_x - 10, 820, packet_x + 10, 840), fill=AMBER)
    if caption_settings.get("enabled") and manifest.get("voiceStartsAtZero", True) and seconds >= 0.3:
        row = active_caption(timing, seconds)
        if row:
            row["activeTime"] = seconds
            draw_caption(draw, row, caption_settings, assets["caption_font"], 980)


def draw_outro(image, brand, assets):
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((72, 270, 648, 860), radius=34, fill="#061018", outline=AMBER, width=3)
    logo_path = Path(brand["logoFile"])
    if not logo_path.is_absolute():
        logo_path = PROJECT_DIR / logo_path
    if logo_path.is_file():
        logo = Image.open(logo_path).convert("RGBA").resize((84, 84), Image.Resampling.LANCZOS)
        image.paste(logo, (318, 316), logo)
    draw.text((360, 440), brand["name"].upper(), font=assets["title_font"], fill=COPY, anchor="mm")
    draw.text((360, 500), brand["tagline"].upper(), font=assets["body_font"], fill=CYAN, anchor="mm")
    draw.rounded_rectangle((130, 610, 590, 690), radius=32, fill="#211a0d", outline=AMBER, width=2)
    draw.text((360, 650), brand["outro"].upper(), font=assets["small_font"], fill=AMBER, anchor="mm")
    draw.text((360, 778), "SAVE THIS EXPLAINER", font=assets["micro_font"], fill=DIM, anchor="mm")


def render(project):
    global PROJECT_DIR
    PROJECT_DIR = project.resolve()
    root = Path(__file__).resolve().parents[1]
    manifest = load_json(PROJECT_DIR / "standalone.json")
    script_path = PROJECT_DIR / "script-v1.md"
    timing_path = PROJECT_DIR / "assets" / "narration-timing-v1.json"
    caption_settings = {"enabled": False, "language": "same", "style": "phrase", **(manifest.get("captions") or {})}
    audio_path = (PROJECT_DIR / manifest.get("audioFile", "assets/audio/narration.wav")).resolve()
    if not audio_path.is_file():
        raise RuntimeError(f"Narration WAV is missing: {audio_path}")
    duration = audio_duration(audio_path)
    timing = load_json(timing_path) if caption_settings["enabled"] and timing_path.is_file() else {"durationSeconds": duration, "sentences": []}
    caption_settings["spokenLanguage"] = timing.get("narrationLanguage") or manifest.get("narrationLanguage") or manifest.get("scriptLanguage") or "auto"
    if caption_settings["enabled"]:
        if caption_settings["style"] not in {"phrase", "karaoke"}:
            raise RuntimeError("captions.style must be phrase or karaoke.")
        if caption_settings["style"] == "karaoke" and caption_settings["language"] != "same":
            raise RuntimeError("Karaoke captions must use the spoken language. Use phrase subtitles for translated captions.")
        if not timing_path.is_file():
            raise RuntimeError("Subtitle timing JSON is missing. Align this WAV or provide reviewed phrase/word timings. Set captions.enabled to false to render without subtitles.")
        if not isinstance(timing.get("sentences"), list) or not timing["sentences"]:
            raise RuntimeError("Subtitle timing JSON has no phrase timings for this WAV.")
        if abs(float(timing.get("durationSeconds", 0)) - duration) > 0.5:
            raise RuntimeError("Subtitle timings do not match this narration WAV. Align this exact WAV before rendering.")
        for sentence in timing["sentences"]:
            if not isinstance(sentence.get("text"), str) or not sentence["text"].strip():
                raise RuntimeError("Every subtitle phrase needs text.")
            if caption_settings["style"] == "karaoke" and (not isinstance(sentence.get("words"), list) or not sentence["words"]):
                raise RuntimeError("Karaoke captions need word-level timings. Align this WAV or supply reviewed word times.")
    scene_module = load_scene_module(PROJECT_DIR)
    scenes = sorted(scene_module.SCENES, key=lambda item: scene_start_seconds(item, duration))
    if scene_start_seconds(scenes[0], duration) != 0.0:
        raise RuntimeError("The first Pillow scene must start at startRatio 0 or startSec 0.")
    assets = fonts(root)
    manifest_brand = brand_info(manifest)
    background = make_background()
    hook = str(manifest.get("hook") or "Turn a simple question into a clear visual explanation.")
    cover_seconds = float(manifest.get("coverSeconds", 1))
    voice_starts_at_zero = bool(manifest.get("voiceStartsAtZero", True))
    total_duration = duration + (0 if voice_starts_at_zero else cover_seconds) + 3
    frame_count = int(round(total_duration * FPS))
    ffmpeg, ffprobe = find_ffmpeg(root), find_ffprobe(root)
    export_dir = PROJECT_DIR / "exports"
    export_dir.mkdir(parents=True, exist_ok=True)
    output = export_dir / f"{manifest['exportSlug']}.mp4"
    cmd = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s:v", f"{WIDTH}x{HEIGHT}", "-r", str(FPS), "-i", "pipe:0",
        "-i", str(audio_path), "-map", "0:v:0", "-map", "1:a:0", "-vf", "format=yuv420p",
        "-af", f"apad=whole_dur={total_duration:.3f}", "-t", f"{total_duration:.3f}",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
        "-movflags", "+faststart", str(output),
    ]
    process = subprocess.Popen(cmd, stdin=subprocess.PIPE, cwd=root)
    try:
        for frame_index in range(frame_count):
            clock = frame_index / FPS
            voice_time = max(0.0, clock - (0 if voice_starts_at_zero else cover_seconds))
            frame = background.copy()
            if clock < cover_seconds:
                draw_cover(frame, manifest, manifest_brand, assets, clock / max(0.01, cover_seconds), timing, hook, caption_settings)
            elif voice_time >= duration:
                draw_outro(frame, manifest_brand, assets)
            else:
                draw_brand(frame, manifest_brand, assets)
                draw = ImageDraw.Draw(frame)
                draw.text((360, 160), manifest_brand["tagline"].upper(), font=assets["micro_font"], fill=CYAN, anchor="mm")
                draw.text((360, 200), str(manifest.get("title") or "EXPLAINER"), font=assets["body_font"], fill=COPY, anchor="mm")
                scene_index = max((i for i, item in enumerate(scenes) if scene_start_seconds(item, duration) <= voice_time), default=0)
                scene = scenes[scene_index]
                local_time = max(0.0, voice_time - scene_start_seconds(scene, duration))
                scene_module.draw_scene(frame, scene_index, local_time, scene, assets)
                if caption_settings["enabled"]:
                    row = active_caption(timing, voice_time)
                    if row:
                        row["activeTime"] = voice_time
                        draw_caption(ImageDraw.Draw(frame), row, caption_settings, assets["caption_font"], 972)
                draw = ImageDraw.Draw(frame)
                draw.line((48, 1238, 672, 1238), fill="#183b44", width=2)
                progress = min(1.0, voice_time / max(0.01, duration))
                draw.line((48, 1238, 48 + int(624 * progress), 1238), fill=CYAN, width=3)
            process.stdin.write(frame.convert("RGB").tobytes())
    except (BrokenPipeError, OSError):
        process.stdin.close()
        raise RuntimeError("FFmpeg stopped while receiving rendered frames.")
    finally:
        if process.stdin and not process.stdin.closed:
            process.stdin.close()
    status = process.wait()
    if status != 0:
        raise RuntimeError(f"FFmpeg exited with status {status}.")

    probe = subprocess.run(
        [ffprobe, "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate", "-of", "json", str(output)],
        check=True, capture_output=True, text=True,
    )
    streams = json.loads(probe.stdout).get("streams", [])
    video = next((item for item in streams if item.get("codec_type") == "video"), {})
    audio = next((item for item in streams if item.get("codec_type") == "audio"), {})
    if (video.get("width"), video.get("height"), video.get("r_frame_rate")) != (WIDTH, HEIGHT, "30/1") or not audio:
        raise RuntimeError("The Pillow render did not produce the expected 720x1280, 30 fps video with audio.")
    print(json.dumps({"renderer": "pillow", "output": str(output), "durationSeconds": round(total_duration, 3), "video": video, "audio": audio}, indent=2))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python pillow_render.py <project-folder>")
    render(Path(sys.argv[1]))
