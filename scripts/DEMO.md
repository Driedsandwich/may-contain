Run from the repository with Node.js 22.12+, Python 3, FFmpeg (libx264, AAC and
libass), ffprobe, and Playwright Chromium installed:

```sh
npm ci
npx playwright install chromium
node scripts/record-demo.mjs --out "$VIDEO_OUT"
bash scripts/assemble-demo.sh "$VIDEO_OUT" - "$VIDEO_OUT/scenes.json" "$VIDEO_OUT/demo_silent_captioned.mp4"
```

Set `VIDEO_OUT` to the desired artifact directory. No workstation paths are
stored in the scripts. `FFMPEG`, `FFPROBE`, and `DEMO_PORT` are optional overrides.
The recorder builds the app and starts/stops its own Vite preview at
`/may-contain/`. An occupied port causes an error. It uses fresh browser contexts,
blocks external network requests and records no audio. `--scene 3` re-records
only scene 3. The `SCENES` array contains the timed actions; `Director` contains
the reusable camera, pointer and timeline helpers. Final-frame holds are at
least two seconds. The browser stage is 1920×1080; its app iframe is 390×844,
centered on a plain background. Staff-card shots use a 960×540 landscape iframe.

All images are browser-rendered vector/CSS illustrations or a synthetic label.
The opening, boundaries, source discussion, evaluation and proposed MCP screens
are editorial storyboard visuals. They are not product features. The app's
matcher computes the three example results from the exact supplied English
text. Recording-only DOM presentation supplies the storyboard's Spanish card
and example provenance labels. The normal app and its shipped phrases are not
changed. The photo-review interaction uses a fixed OCR response, explicitly
labelled as an example capture; no OCR accuracy or confidence is demonstrated.
The existing UI calls the storyboard's “Photograph ingredients” action “Label
photo”. Barcode controls are shown without opening a camera or querying a
catalog. `check_label` and its returned fields are shown as proposals, separate
from the repository's existing MCP tools. Evaluation values are storyboard
placeholders, not the repository's evaluation results.

To add narration, place `scene_01.wav` through `scene_05.wav` in a directory:

```sh
bash scripts/assemble-demo.sh "$VIDEO_OUT" "$NARRATION_DIR" "$VIDEO_OUT/scenes.json" "$VIDEO_OUT/demo_narrated.mp4"
```

Missing narration files are allowed. With no files there is no audio stream and
the storyboard duration is retained. If any narration is present, missing scenes
receive silence so all concatenated segments have matching AAC audio streams.
Each narrated scene lasts the longer of its storyboard duration and narration
duration plus 1.5 seconds, rounded up to a 30 fps frame boundary. Longer narration
extends the last frame using `tpad`; shorter narration does not cut actions.
Captions use relative scene times in `scenes.json`; the final cue holds through
an extension. Scene 4 uses the three specified cues at 21–25, 25–30 and 30–35
seconds, giving 01:51–02:05 in the silent edit. Align those cue times manually
with the final voice take if its timing differs. A `.timing.json` report records
the resulting scene lengths. UTF-8 subtitles are plain text, at most two lines
per cue. The full warning remains on screen during all three scene 4 cues.
