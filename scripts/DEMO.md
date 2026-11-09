Run from the repository with Node.js 22.12+, Python 3, FFmpeg (libx264 and AAC),
ffprobe, and Playwright Chromium installed:

```sh
npm ci
npx playwright install chromium
node scripts/record-demo.mjs --out "$VIDEO_OUT"
bash scripts/assemble-demo.sh "$VIDEO_OUT" - "$VIDEO_OUT/scenes.json" "$VIDEO_OUT/demo_silent.mp4"
```

Set `VIDEO_OUT` to the artifact directory's `video_out` subdirectory. No
workstation paths are stored in repository files. `FFMPEG`, `FFPROBE`, and
`DEMO_PORT` are optional overrides. The recorder builds the app and starts/stops
its own Vite preview at `/may-contain/`. An occupied port causes an error.
`--scene 3` re-records only scene 3. Internet access is needed for the real
GitHub evaluation page in scene 4. Browser requests are read-only; avatar image
requests are blocked. There is no publication or remote write.

The five scenes last 20, 25, 45, 35 and 25 seconds (150 seconds total). Videos
are 1920×1080, 30 fps, H.264, with no audio track or burned-in subtitles. A
390×730 app viewport is centered at 1.4× scale. The landscape card uses an
844×390 viewport at 1.8× scale. The iframe disables browser-level fullscreen,
so the app's existing full-viewport dialog stays inside the recording stage;
no app code or displayed phrases are changed. The neutral stage adds only a
pointer and a small “Fictional label” label. A synchronization marker is removed
from the exported video.

1. The actual initial screen, selected allergens and staff card.
2. Select milk, peanut and sesame, click **Try example text**, and show the
   three computed result states. This uses the app's built-in fictional French
   label. It does not demonstrate photo OCR or use OCR stubs.
3. Actual word highlights, original French and fixed English example
   translation, **What the text tells us**, French/German/Japanese card controls,
   and the actual full-screen card dialog in landscape.
4. The actual warning and measured-results link. The linked document is checked
   byte-for-byte against `eval/RESULTS.md`. The recorded page then opens the same
   file on GitHub and shows its per-allergen precision/recall table. Every cell
   is checked against the repository; a mismatch stops recording. The evaluation
   limitations and unmeasured categories remain visible.
5. Launch `dist/mcp/server.js`, perform the MCP initialization handshake, then
   send real `tools/list` and `tools/call` requests for `check_ingredients`.
   The terminal-style viewer pretty-prints complete JSON-RPC envelopes without
   adding or removing response fields. It scrolls the response to show the
   structured evidence, three result states and safety notice. The exact server
   stdout is saved as `mcp-stdout.jsonl`; all parsed requests/responses, including
   initialization, are in `mcp-transcript.json`.

`scenes.json` contains timings and action descriptions; `cues: []` means no
subtitles. `recording.json` records capture timing and format. Selected PNG
frames are also saved for inspection. No people, voices, real product photos,
or real product records are used. All application results come from the actual
matcher and all MCP responses come from the actual server.

To add narration later, place `scene_01.wav` through `scene_05.wav` in a directory:

```sh
bash scripts/assemble-demo.sh "$VIDEO_OUT" "$NARRATION_DIR" "$VIDEO_OUT/scenes.json" "$VIDEO_OUT/demo_narrated.mp4"
```

Missing narration files are allowed. With no files there is no audio stream.
If any narration is present, missing scenes receive silence. Each narrated scene
lasts the longer of its recorded duration and narration duration plus 1.5 seconds,
rounded up to a 30 fps frame boundary. Longer narration extends the last frame;
shorter narration does not cut actions. A `.timing.json` report records lengths.
Captions are optional and only enabled by explicitly adding nonempty `cues` to
`scenes.json`; that option requires FFmpeg's libass support.
