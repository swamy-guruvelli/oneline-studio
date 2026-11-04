# OneLine Studio instructions

## Product and project structure

- OneLine Studio turns a user's sentence into a video project. Offer brief optional choices for title, brand, and script language when they are not clear from the request; if the user does not specify, infer the title, follow the request language, and use OneLine Studio branding without blocking progress.
- Keep the project portable across ChatGPT Workspace and ordinary PCs. Do not use machine-specific services, local queue servers, private browser profiles, or hard-coded user paths.
- Use `templates/<style>/` for video styles. Select an existing template when it fits the request. If none fits, create a separate style template based on the user's needs rather than forcing every request into an explainer.
- Keep each project's script, research, design notes, scene code, narration, timings, review frames, and exports together under `projects/<slug>/`.

## Research and scripting

- For technical claims, verify behavior and version limits against authoritative primary sources. Save links and caveats in `research.md` before narration.
- Explain one useful idea with a concrete problem, a clear mental model, and an example. Write natural spoken language in the language requested by the user. If none is named, follow the language of the request or conversation.
- Keep the default video at or below two minutes unless the user approves a different duration.
- Keep on-screen copy free of semicolons and em dashes. Do not add on-video subtitles unless the user asks for them.

## Brand and visual defaults

- Use the OneLine Studio logo and exact wordmark by default. Apply another brand only when the user asks for it.
- The default cover includes the concept title, `WHAT IF...?`, and a specific topic hook. Narration starts at 0.0 seconds by default. Show a subtitle on the cover only when subtitles were requested.
- Use a dark technical canvas, cyan or teal data accents, amber focus accents, and green success states unless a selected style defines a different palette.
- Give each topic a distinct visual metaphor. Animate meaningful state changes, decisions, or outcomes.
- Keep labels, titles, subtitles, callouts, nodes, connectors, and moving paths clear of one another.

## Language, narration, and subtitles

- Treat `scriptLanguage` as the requested language for the written script and `narrationLanguage` as the language actually spoken in the supplied WAV. Use ISO language codes where known, or `auto` when the narration language should be detected.
- Keep visual direction, scene beat descriptions, on-screen labels, cover copy, and other visual text in English by default, even when the narration and script use another language. Localize visual text only when the user explicitly asks for visuals in that language. Spoken narration follows the requested language; the Instagram post caption follows the selected script language.
- If the supplied WAV differs from the narration block in words or language, add its exact transcript under `## Spoken transcript for timing`, one paragraph per spoken phrase. This is only needed when subtitle timing is requested.
- Prepare a non-empty `## AI Studio delivery direction` and one non-empty fenced `text` block under `## Narration text for TTS`. Keep cover copy, optional subtitles, sources, and visual notes outside the narration block.
- Stop at the narration handoff. Ask the user to generate the WAV in AI Studio and provide it. Once supplied, use that exact file and continue the same project.
- Leave `captions.enabled` false unless the user requests on-video subtitles. This does not remove the separate Instagram post caption.
- When subtitles are requested, use phrase style by default. Use karaoke word highlighting only when subtitle text is in the spoken language and current-WAV word timings are available.
- For translated subtitles, put one translated phrase per narration paragraph under `## On-video subtitles` in a fenced `text` block. Use phrase style so each translated phrase follows its source-language narration time window. Do not karaoke-highlight translated words using source-language timings.
- Whisper is multilingual but its recognition accuracy varies by language and recording. Pass the known `narrationLanguage` or use `auto`. If recognition fails or the transcript does not match, use reviewed phrase timing JSON for this exact WAV or leave subtitles off. Never reuse timings from another recording.
- With subtitles disabled, do not run Whisper just for timing. Use the narration WAV duration as the video clock, and time visual changes against that clock. Prefer `startRatio` scene beats from 0 to 1 so they adapt to the final recording length. Use `startSec` only for beats manually placed at a known time after listening to the supplied WAV.
- Keep audio and picture synchronized by starting both at the same voice time, deriving the scene timeline from the WAV duration, and ending the narration track and picture together before the closing hold. Subtitle timing is an optional overlay and does not control audio/video synchronization.
- Write the Instagram post caption in the selected script language, with a specific opening hook, useful explanation, and natural search terms. Target 1,500-2,000 characters including spaces and hashtags, stay under 2,200 characters, and use up to five relevant hashtags. This post caption is separate from optional on-video subtitles. Do not invent social handles or CTAs.
- Include both the MP4 and full caption in the final delivery.

## Rendering and review

- Run `npm run preflight -- projects/<slug>` before rendering.
- Use the Playwright renderer only if its browser launches successfully. Otherwise use the Pillow 2D renderer. Both paths use WAV duration and scene beats for timing, and render the same optional subtitle mode when enabled.
- FFmpeg and FFprobe are required to assemble and inspect the MP4. Pillow alone does not create a video file.
- Use the project's `render-v1.mjs` entry point. Check that the output is 720x1280 at 30 fps with AAC audio.
- Inspect the exact opening frame, cover handoff, scene transitions, dense diagrams, audio sync, and final hold. When subtitles are enabled, also inspect phrase timing or several active words and subtitle clearance. Keep temporary review images in `exports/review/` and remove them after review.
