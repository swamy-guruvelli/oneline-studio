# New OneLine Studio explainer template

Create projects from the workspace root with:

```powershell
npm.cmd run new -- --topic "Explain how a database index makes lookups faster"
```

The scaffold creates a project under `projects/<slug>/`. OneLine Studio can infer the title and hook from the sentence. Add `--title`, `--hook`, `--brand`, or `--logo` to override a default. Replace the placeholder script, research notes, design notes, scenes, and narration. Keep a concept-specific browser visual in `scene.js` and a Pillow visual in `scene_pillow.py`.

Use `--script-language` and `--narration-language` with ISO language codes when needed. Video subtitles are off by default. Add `--captions phrase` or `--captions karaoke` only when requested. Use phrase style for translated subtitles, with one translated paragraph per narration paragraph under `## On-video subtitles`.

## Project files

- `standalone.json`: audio path, language settings, optional subtitle settings, export name, and cover settings.
- `script-v1.md`: spoken text, delivery direction, optional subtitle text, and Instagram caption.
- `research.md`: claim checks and primary-source links.
- `design-v1.md`: metaphor, beat map, motion, and layout.
- `index.html` and `scene.js`: cover, branding, custom SVG, and browser animation.
- `scene_pillow.py`: browser-free 2D scene plan and Pillow drawing code.
- `assets/audio/`: confirmed narration WAV.
- `assets/narration-timing-v1.json`: optional phrase or word timings aligned to that WAV. No timing file is needed when subtitles are off.
- `render-v1.mjs` and `review-v1.mjs`: shared rendering and review entry points.
- `exports/`: final MP4 and temporary review material.
