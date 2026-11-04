# MindKraft: A Clearer Job Search

This project explains MindKraft's UK job-search support with Telugu narration in a mild Godavari conversational style. The cover, visual beat labels, and diagrams stay in English. On-video subtitles are off.

## Narration handoff

The approved Telugu script and AI Studio delivery direction are in `script-v1.md`. Generate a Telugu WAV from that narration text in AI Studio and provide the exact file. Save it as `assets/audio/narration.wav` to continue this project with the supplied recording.

## Project files

- `standalone.json`: language, cover, brand, audio, and subtitle settings.
- `script-v1.md`: Telugu narration, voice direction, and Telugu Instagram caption.
- `research.md`: MindKraft source checks and caveats.
- `design-v1.md`: English visual direction and scene beat map.
- `index.html`, `scene.js`: English cover and animated browser visuals.
- `scene_pillow.py`: matching browser-free 2D visual plan.
- `assets/audio/`: destination for the confirmed narration WAV.
- `exports/`: final MP4 after narration, plus temporary review material.

Once the WAV is supplied, run `npm run preflight -- projects/mindkraft-godavari-telugu`, render with `render-v1.mjs`, then inspect and deliver the MP4 with the complete Instagram caption.
