# OneLine Studio

**Turn one sentence into a short, finished video.** OneLine Studio researches an idea, writes a script, creates animated scenes, and renders a vertical MP4. Use it in ChatGPT Workspace or on your own PC.

## Try the example

The sample project explains how OneLine Studio turns an idea into a video. It includes the narration, optional timed karaoke captions, browser and Pillow scenes, and the finished MP4. This sample uses the Pillow renderer.

**How OneLine Studio Makes a Video**  
Video: [Download the 43-second MP4](examples/oneline-studio-demo/exports/oneline-studio-demo-v1.mp4)  
Caption: included in [`examples/oneline-studio-demo/script-v1.md`](examples/oneline-studio-demo/script-v1.md).

## Start with one sentence

Give OneLine Studio a topic or question in a sentence. At the start, it offers an optional custom video title or brand. If you do not specify either, it derives a concise title from your sentence and uses the OneLine Studio logo and wordmark.

The assistant chooses a matching style template, checks factual claims when needed, creates the scenes, prepares the narration handoff, and delivers the video with an Instagram caption. Script language follows the user's request. On-video subtitles are off by default and only added when requested.

To scaffold a project from a terminal:

```powershell
npm.cmd install
npm.cmd run new -- "Why does a database index make lookups faster?"
```

Optional overrides:

```powershell
npm.cmd run new -- --topic "Why does a database index make lookups faster?" --title "Database Indexes" --brand "Example Studio" --logo "C:\path\to\logo.png"
```

Set the script and supplied narration languages with ISO codes. `auto` lets Whisper detect the narration language during subtitle alignment. Video subtitles remain off by default:

```powershell
npm.cmd run new -- --topic "Why does a database index make lookups faster?" --script-language ta --narration-language ta
npm.cmd run new -- --topic "Why does a database index make lookups faster?" --script-language es --narration-language es --captions phrase --caption-language en
npm.cmd run new -- --topic "Why does a database index make lookups faster?" --captions karaoke
```

Translated subtitles use phrase timing. Add one translated line per spoken paragraph under `## On-video subtitles` in `script-v1.md`. If the supplied WAV differs from the TTS block, add its exact transcript under `## Spoken transcript for timing`. Karaoke word highlighting is intended for subtitle text in the spoken language.

The earlier `<slug> "Title" "Cover hook"` command form remains supported.

## Templates for different video styles

Styles live in [`templates/`](templates/). The explainer template is the first ready-to-use style. When a request calls for another format, OneLine Studio should select a matching template if one exists. If none fits, create a separate style template for that request while keeping the shared project, narration, optional subtitle, and export conventions.

Each template can provide its own visual rules and scene implementation. The shared render engine handles the portrait canvas, WAV-based scene timing, optional subtitles, audio muxing, and video checks.

## Narration handoff

OneLine Studio prepares an AI Studio delivery direction and a single fenced narration block. Generate the WAV in AI Studio and provide it with the project. The renderer uses that WAV as the video clock. It aligns word timings only when requested subtitles need them. This handoff is required because the repository does not include a text-to-speech service.

Whisper supports multilingual transcription, but its accuracy varies across languages and recordings. Set `narrationLanguage` to an ISO code or `auto`. If requested subtitle alignment fails, provide reviewed phrase timing JSON for the same WAV. With subtitles off, Whisper is not needed and no timing file is required.

## Rendering on Workspace or a PC

Run the preflight before rendering:

```powershell
npm.cmd run preflight -- projects/my-concept
```

Pillow is the baseline renderer and creates 2D animation without a browser. Playwright with Chromium, Chrome, or Edge is optional. The automatic renderer uses the browser path only when it can launch; otherwise it uses Pillow. Both renderers follow WAV duration and scene beat times whether subtitles are enabled or not. Phrase subtitles use phrase timings. Karaoke subtitles use word timings.

FFmpeg and FFprobe are required to encode and inspect the MP4. Install the core dependencies when the environment allows it:

```powershell
npm.cmd install
python -m pip install -r requirements-render-pillow.txt
```

`requirements-align.txt` is optional. Install it only when requested subtitles need automatic Whisper alignment. Rendering without subtitles does not use Whisper or PyTorch.

To try the browser renderer, install Chromium through Playwright:

```powershell
npm.cmd run browser:install
```

If Chromium is missing or cannot launch, `renderer: "auto"` falls back to Pillow. The browser route is an optional enhancement, not a requirement.

If the current environment cannot install dependencies, use available system FFmpeg/FFprobe and Pillow. `npm.cmd run preflight` reports which route is ready and which requirement is missing. These commands use the Windows PowerShell `npm.cmd` entry point; in macOS/Linux shells, replace `npm.cmd` with `npm`. See [the rendering guide](docs/rendering.md).

## Deliverables and defaults

- 720 x 1280 portrait video at 30 fps with AAC audio.
- OneLine Studio branding by default; custom branding is opt-in.
- Phone-readable 2D animation and topic-specific visual metaphors.
- No on-video subtitles by default. Add same-language phrase or karaoke subtitles, or translated phrase subtitles, when requested.
- A 1,500-2,000 character Instagram caption, including spaces and hashtags, under the 2,200-character limit.
- The MP4 and caption are both included in the final delivery.

## Project layout

| Path | Purpose |
| --- | --- |
| `projects/<slug>/` | Scripts, research, scenes, narration, timing, review, and exports |
| `templates/<style>/` | Reusable visual and production styles |
| `templates/explainer/` | Default concept-explainer scaffold |
| `render-engine/` | Shared browser and Pillow rendering tools |
| `scripts/` | Project scaffolder and environment preflight |
| `examples/` | Example project and (after narration handoff) rendered video |
| `AGENTS.md` | Workspace authoring and delivery rules |

## License

OneLine Studio is released under the MIT License. See [`LICENSE`](LICENSE).
