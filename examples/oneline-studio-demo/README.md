# OneLine Studio video workflow example

This example presents OneLine Studio's main workflow: start with one sentence, prepare an explanation, add narration, align word timings, and render a portrait video with karaoke captions.

The narration WAV has been aligned to word timings, then rendered with Pillow as a 43-second portrait MP4. The MP4 is 720 x 1280 at 30 fps with AAC audio. The browser scene is included for environments where Playwright output reviews cleanly.

## Files

- `script-v1.md`: narration handoff and finished caption.
- `design-v1.md`: scene plan and visual choices.
- `scene.js`: browser animated scenes.
- `scene_pillow.py`: matching browser-free 2D scenes.
- `standalone.json`: OneLine Studio brand and output settings.
- `assets/audio/narration.wav`: narration WAV used for this sample.
- `assets/narration-timing-v1.json`: word timings generated from this exact WAV.
- `exports/oneline-studio-demo-v1.mp4`: completed example video with karaoke captions.
