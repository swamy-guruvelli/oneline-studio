import json
import os
import re
import sys
import wave
from pathlib import Path
from unicodedata import category

ROOT = Path(__file__).resolve().parent
ffmpeg_dir = ROOT.parent / "node_modules" / "ffmpeg-static"
if ffmpeg_dir.exists():
    os.environ["PATH"] = str(ffmpeg_dir) + os.pathsep + os.environ.get("PATH", "")

import torch
import whisper


def normalize(token):
    token = token.replace("â€™", "'").replace("â€˜", "'")
    return "".join(char.casefold() for char in token if category(char)[0] in {"L", "N"})


def align_tokens(expected, actual):
    n, m = len(expected), len(actual)
    cost = [[0] * (m + 1) for _ in range(n + 1)]
    back = [[None] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        cost[i][0], back[i][0] = i, "delete"
    for j in range(1, m + 1):
        cost[0][j], back[0][j] = j, "insert"
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            same = normalize(expected[i - 1]) == normalize(actual[j - 1]["text"])
            choices = [
                (cost[i - 1][j - 1] + (0 if same else 1), "match" if same else "substitute"),
                (cost[i - 1][j] + 1, "delete"),
                (cost[i][j - 1] + 1, "insert"),
            ]
            cost[i][j], back[i][j] = min(choices, key=lambda item: item[0])
    mapping = {}
    i, j = n, m
    while i or j:
        op = back[i][j]
        if op in {"match", "substitute"}:
            mapping[i - 1] = j - 1
            i -= 1
            j -= 1
        elif op == "delete":
            i -= 1
        elif op == "insert":
            j -= 1
        else:
            raise RuntimeError("Could not align recognized words to script.")
    return mapping, cost[n][m]


def fenced_paragraphs(source, heading):
    match = re.search(
        rf"^##\s+{re.escape(heading)}\s*\r?\n\s*```text\s*(.*?)\s*```",
        source, re.M | re.S,
    )
    if not match:
        return None
    return [
        re.sub(r"\s+", " ", paragraph).strip()
        for paragraph in re.split(r"\r?\n\s*\r?\n", match.group(1).strip())
        if paragraph.strip()
    ]


def paragraph_text(script_path):
    source = script_path.read_text(encoding="utf-8-sig")
    paragraphs = fenced_paragraphs(source, "Narration text for TTS")
    if paragraphs is not None:
        return paragraphs
    try:
        section = source.split("## Narration draft", 1)[1].split("## Google AI Studio voice direction", 1)[0]
    except IndexError as exc:
        raise RuntimeError(f"Narration section is missing in {script_path}") from exc
    return [line.strip() for line in section.splitlines() if line.strip()]


def align_project(model, project_name, device):
    requested_path = Path(project_name).expanduser()
    project = requested_path.resolve() if requested_path.is_dir() else (ROOT / project_name).resolve()
    audio_dir = project / "assets" / "audio"
    manifest_path = project / "standalone.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    captions = manifest.get("captions") or {}
    caption_language = str(captions.get("language", "same")).lower()
    caption_style = str(captions.get("style", "phrase")).lower()
    configured_audio = manifest.get("audioFile")
    audio_files = sorted(audio_dir.glob("*.wav"))
    if configured_audio:
        audio_path = (project / configured_audio).resolve()
        if not audio_path.is_file():
            raise FileNotFoundError(f"Configured narration WAV does not exist: {audio_path}")
    elif len(audio_files) == 1:
        audio_path = audio_files[0]
    else:
        raise FileNotFoundError(f"Set audioFile in {manifest_path} or provide one WAV in {audio_dir}")
    script_path = project / "script-v1.md"
    timing_path = project / "assets" / "narration-timing-v1.json"
    script_source = script_path.read_text(encoding="utf-8-sig")
    paragraphs = paragraph_text(script_path)
    spoken_paragraphs = fenced_paragraphs(script_source, "Spoken transcript for timing") or paragraphs
    subtitle_paragraphs = fenced_paragraphs(script_source, "On-video subtitles")
    if caption_language != "same" and subtitle_paragraphs is None:
        raise RuntimeError(
            "Translated subtitles need a fenced `text` block under `## On-video subtitles`, "
            "with one translated phrase for each spoken-transcript paragraph."
        )
    if subtitle_paragraphs is not None and len(subtitle_paragraphs) != len(spoken_paragraphs):
        raise RuntimeError("Use one on-video subtitle paragraph for each spoken-transcript paragraph.")
    if caption_style == "karaoke" and caption_language != "same":
        raise RuntimeError("Karaoke word highlighting needs captions in the spoken language. Use phrase subtitles for translated captions.")
    display_paragraphs = subtitle_paragraphs or spoken_paragraphs
    requested_language = str(manifest.get("narrationLanguage") or manifest.get("scriptLanguage") or "auto").strip().lower()
    whisper_language = None if requested_language in {"auto", "same"} else requested_language.split("-", 1)[0]
    transcript = model.transcribe(
        str(audio_path), language=whisper_language, word_timestamps=True,
        fp16=(device == "cuda"), verbose=False,
    )
    recognized = []
    for segment in transcript["segments"]:
        for word in segment.get("words", []):
            if word.get("start") is None or word.get("end") is None:
                continue
            start = max(0.0, float(word["start"]))
            recognized.append({
                "text": word["word"].strip(),
                "startSec": start,
                "endSec": max(start + 0.04, float(word["end"])),
            })
    if not recognized:
        raise RuntimeError(f"Whisper returned no word timestamps for {audio_path}")
    detected_language = str(transcript.get("language") or requested_language).lower()
    alignment_language = requested_language.split("-", 1)[0] if requested_language not in {"auto", "same"} else detected_language.split("-", 1)[0]
    no_space_languages = {"zh", "ja", "th", "lo", "km", "my"}
    if alignment_language in no_space_languages:
        expected_by_paragraph = [[char for char in line if normalize(char)] for line in spoken_paragraphs]
        alignment_words = []
        for word in recognized:
            characters = normalize(word["text"])
            span = max(0.04, word["endSec"] - word["startSec"])
            for index, char in enumerate(characters):
                start = word["startSec"] + span * index / max(1, len(characters))
                end = word["startSec"] + span * (index + 1) / max(1, len(characters))
                alignment_words.append({"text": char, "startSec": start, "endSec": max(start + 0.02, end)})
    else:
        expected_by_paragraph = [line.split() for line in spoken_paragraphs]
        alignment_words = recognized
    expected = [token for line in expected_by_paragraph for token in line]
    mapping, edits = align_tokens(expected, alignment_words)
    if edits > max(4, round(len(expected) * 0.12)):
        print(f"\nExpected narration for {project_name}:\n{' '.join(expected)}")
        print(f"\nWhisper transcript:\n{' '.join(word['text'] for word in recognized)}")
        raise RuntimeError(
            f"Transcript mismatch for {project_name}: {edits} edits across {len(expected)} spoken-script tokens. "
            "Check narrationLanguage and the narration text. If Whisper cannot recognize this recording, "
            "provide reviewed phrase timings for this WAV or disable on-video subtitles."
        )

    timings = [None] * len(expected)
    for expected_index, recognized_index in mapping.items():
        timings[expected_index] = {
            "text": expected[expected_index],
            "startSec": alignment_words[recognized_index]["startSec"],
            "endSec": alignment_words[recognized_index]["endSec"],
        }
    missing = [index for index, word in enumerate(timings) if word is None]
    for index in missing:
        left = next((timings[k] for k in range(index - 1, -1, -1) if timings[k]), None)
        right = next((timings[k] for k in range(index + 1, len(timings)) if timings[k]), None)
        if left and right:
            first = index
            while first > 0 and timings[first - 1] is None:
                first -= 1
            last = index
            while last + 1 < len(timings) and timings[last + 1] is None:
                last += 1
            slots = last - first + 2
            slot = index - first + 1
            span = max(0.04, right["startSec"] - left["endSec"])
            start = left["endSec"] + span * (slot - 1) / slots
            end = left["endSec"] + span * slot / slots
        elif right:
            start, end = max(0.0, right["startSec"] - 0.28), right["startSec"]
        elif left:
            start, end = left["endSec"], left["endSec"] + 0.24
        else:
            start, end = 0.0, 0.2
        timings[index] = {"text": expected[index], "startSec": start, "endSec": max(start + 0.04, end)}

    grouped = []
    cursor = 0
    for text, words in zip(display_paragraphs, expected_by_paragraph):
        row = timings[cursor:cursor + len(words)]
        cursor += len(words)
        grouped.append({"text": text, "startSec": row[0]["startSec"], "endSec": row[-1]["endSec"], "words": row})
    with wave.open(str(audio_path), "rb") as wav:
        duration = wav.getnframes() / float(wav.getframerate())
    result = {
        "voice": f"Narration aligned with Whisper timestamps (language: {detected_language})",
        "narrationLanguage": detected_language,
        "durationSeconds": round(duration, 3),
        "alignment": {"scriptTokens": len(expected), "recognizedTokens": len(alignment_words), "editCount": edits, "device": device},
        "sentences": grouped,
    }
    timing_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"project": str(project), "audio": audio_path.name, "durationSeconds": result["durationSeconds"], "alignment": result["alignment"]}, ensure_ascii=False))


def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading Whisper base on {device}")
    model = whisper.load_model("base", device=device, download_root=Path.home() / ".cache" / "whisper")
    requested = sys.argv[1:]
    if not requested:
        raise SystemExit("Pass one or more project folder paths.")
    for project_name in requested:
        align_project(model, project_name, device)


if __name__ == "__main__":
    main()
