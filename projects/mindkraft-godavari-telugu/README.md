# MindKraft: A Clearer Job Search

This project explains MindKraft's UK job-search support with Telugu narration in a mild Godavari conversational style. The cover, visual beat labels, diagrams, and Instagram caption stay in English. On-video subtitles are off.

## Narration and render

The current Telugu script and video-specific voice direction are in `script-v1.md`. The supplied `Generated Audio November 04, 2026 - 8_59PM.wav` is saved as `assets/audio/narration.wav`. The rendered MP4 is tracked under `examples/mindkraft-godavari-telugu.mp4`. On-video subtitles are off. The video is 720x1280 at 30 fps with H.264 video and AAC audio; the narration is 111.28 seconds, followed by a 3-second closing hold.

## Project files

- `standalone.json`: language, cover, brand, audio, and subtitle settings.
- `script-v1.md`: Telugu narration, voice direction, and English Instagram caption.
- `research.md`: MindKraft source checks and caveats.
- `design-v1.md`: English visual direction and scene beat map.
- `index.html`, `scene.js`: English cover and animated browser visuals.
- `scene_pillow.py`: matching browser-free 2D visual plan.
- `assets/audio/narration.wav`: supplied Telugu narration.
- `exports/mindkraft-godavari-telugu-v1.mp4`: rendered video.
- `exports/review/`: temporary review frames, removed after visual inspection.

For this video, keep the current project-specific direction in `script-v1.md`. Use the reusable multilingual guidance in `docs/narration-language-guide.md` for future scripts.
