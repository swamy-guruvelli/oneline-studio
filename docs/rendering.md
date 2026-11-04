# Rendering on ChatGPT Workspace and PCs

OneLine Studio can render without Chromium. Pillow is the baseline and draws the scene as 2D frames; Playwright with Chromium adds the HTML/SVG animation route when a browser can launch.

## Install dependencies

From the OneLine Studio folder. These examples use the Windows PowerShell `npm.cmd` entry point; in macOS/Linux shells, replace it with `npm`:

```powershell
npm.cmd install
python -m pip install -r requirements-render-pillow.txt
```

`requirements-align.txt` is optional and only needed for automatic Whisper subtitle alignment. It is not needed for video rendering when subtitles are off.

On macOS or Linux, use `python3` in place of `python` if needed. Set `ONELINE_PYTHON` if the interpreter has a different command name.

`npm.cmd install` provides FFmpeg and FFprobe packages. If the environment uses system binaries instead, set `ONELINE_FFMPEG` and `ONELINE_FFPROBE` or make both commands available on `PATH`.

Playwright's JavaScript package is installed with npm. To download its Chromium browser when allowed:

```powershell
npm.cmd run browser:install
```

## Choose a renderer

Run preflight for the project before rendering:

```powershell
npm.cmd run preflight -- projects/my-concept
```

The report lists whether FFmpeg, FFprobe, Pillow, Whisper, the Whisper base model, a launchable browser, and requested subtitle timings are available. The automatic route uses the browser when it launches. If Playwright or its browser is missing or fails to launch, it falls back to Pillow. Preflight checks that the browser launches, then review the rendered frames for visual artifacts. Set `renderer` in `standalone.json` to `pillow` to always use Pillow or `browser` to require Playwright. The sample uses Pillow because Edge produced intermittent clipped text during review in this environment.

Some managed environments block headless browsers or restrict large model downloads. Pillow provides browser-free animation. Video subtitles are off by default, so rendering needs no Whisper package, Whisper model, or timing JSON. Both renderers still use the narration WAV duration as their clock and advance scene beats against it. Set `startRatio` from 0 to 1 in `scene.js` and `scene_pillow.py` to place beats proportionally across the actual recording. Use `startSec` when a scene change has been manually timed against the supplied WAV.

## Optional subtitles

Set `scriptLanguage` to the requested script language and `narrationLanguage` to the language spoken in the WAV. Use ISO language codes such as `ta`, `es`, or `zh`, or `auto` to let Whisper detect it. Whisper is multilingual, though recognition quality varies across languages and recordings. The alignment script passes the configured narration language to Whisper. If the supplied WAV differs from the narration block in words or language, add its exact transcript under `## Spoken transcript for timing` in a fenced `text` block, with one paragraph per spoken phrase.

Only enable `captions` when the user requests on-video subtitles:

- `style: "phrase"` displays a full phrase during its spoken time window. This is the default subtitle style.
- `style: "karaoke"` highlights each spoken word and requires word-level timings in the same language as the audio.
- For translated subtitles, add one translated line per narration paragraph under `## On-video subtitles` in a fenced `text` block, and use phrase style. Source-language word timings must not be used to highlight translated words.

When Whisper cannot recognize the supplied WAV or its transcript does not match the script, provide a reviewed `assets/narration-timing-v1.json` for that exact recording. Phrase rows need `text`, `startSec`, and `endSec`. Karaoke rows also need `words` with each word's text and start/end times. Do not reuse timing from a different recording. If subtitles are not required, leave `captions.enabled` false and continue without alignment.

The WAV is the synchronization source: renderers derive the video clock from its duration, place each scene beat at its `startRatio` or reviewed `startSec`, and extend picture and audio together through the closing hold. Subtitle timing is an optional overlay; it does not determine whether the narration and video stay in sync.

## Output and portability

- Output is 720 x 1280 at 30 fps with AAC narration.
- FFmpeg and FFprobe are required even when using Pillow. Pillow draws frames; FFmpeg encodes them into MP4.
- Browser scenes are implemented in `scene.js`; browser-free scenes are in `scene_pillow.py`. Keep both scene files in sync when supporting both routes.
- Use project-relative asset paths and ordinary system fonts with readable fallbacks.
- Keep scene detail simple enough for CPU rendering on a low-end PC.
