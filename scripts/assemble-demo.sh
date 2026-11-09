#!/usr/bin/env bash
# Usage: assemble-demo.sh VIDEO_DIR NARRATION_DIR SCENES_JSON OUTPUT_MP4
# NARRATION_DIR may be '-' or a missing/empty directory. Requires Python 3,
# ffmpeg (libx264, AAC; libass only for explicit cues) and ffprobe.
# FFMPEG/FFPROBE can override binaries. Captions are off unless cues are supplied.
# Longer narration extends the last video frame; shorter narration never cuts
# recorded actions. One and a half seconds of reading room follows narration.
set -euo pipefail
if [[ $# -ne 4 ]]; then
  echo 'Usage: scripts/assemble-demo.sh VIDEO_DIR NARRATION_DIR SCENES_JSON OUTPUT_MP4' >&2
  exit 2
fi
python3 - "$@" <<'PY'
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import textwrap

videos, narration, scene_file, output = sys.argv[1:]
videos, scene_file, output = map(lambda p: Path(p).resolve(), (videos, scene_file, output))
narration = None if narration == '-' else Path(narration).resolve()
ffmpeg = os.environ.get('FFMPEG', 'ffmpeg')
ffprobe = os.environ.get('FFPROBE', 'ffprobe')
data = json.loads(scene_file.read_text(encoding='utf-8'))
scenes = data['scenes'] if isinstance(data, dict) else data
if not isinstance(scenes, list) or not scenes:
    raise SystemExit('scenes.json must contain a nonempty scenes array.')

def probe(path):
    return json.loads(subprocess.check_output([ffprobe, '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)], text=True))

jobs = []
seen = set()
for scene in scenes:
    number, seconds = scene['number'], float(scene['seconds'])
    if not isinstance(number, int) or number < 1 or number in seen:
        raise SystemExit('Scene numbers must be unique positive integers.')
    seen.add(number)
    if not math.isfinite(seconds) or seconds <= 0:
        raise SystemExit('Scene seconds must be finite and positive.')
    name = f'scene_{number:02d}'
    video = videos / f'{name}.mp4'
    if not video.is_file():
        raise SystemExit(f'Missing {video.name}')
    video_info = probe(video)
    if not any(s['codec_type'] == 'video' for s in video_info['streams']):
        raise SystemExit(f'No video stream in {video.name}')
    audio = narration / f'{name}.wav' if narration else None
    audio_seconds = None
    if audio and audio.is_file():
        info = probe(audio)
        if not any(s['codec_type'] == 'audio' for s in info['streams']):
            raise SystemExit(f'No audio stream in {audio.name}')
        audio_seconds = float(info['format']['duration'])
    else:
        audio = None
    duration = max(seconds, audio_seconds + 1.5) if audio else seconds
    # All scene joins occur on a 30 fps boundary.
    duration = math.ceil(duration * 30 - 1e-7) / 30
    cues = scene.get('cues', [])
    previous_end = 0
    for cue in cues:
        start, end = float(cue['start']), float(cue['end'])
        if not (math.isfinite(start) and math.isfinite(end) and previous_end <= start < end <= seconds):
            raise SystemExit(f'Invalid or overlapping caption timing in {name}')
        if not isinstance(cue['text'], str):
            raise SystemExit(f'Caption must be text in {name}')
        previous_end = end
    jobs.append(dict(name=name, video=video, audio=audio, duration=duration, seconds=seconds, cues=cues, audio_seconds=audio_seconds))

if output in [job['video'] for job in jobs]:
    raise SystemExit('Output must not replace a source scene.')
has_audio = any(job['audio'] for job in jobs)
output.parent.mkdir(parents=True, exist_ok=True)

def stamp(seconds):
    ticks = round(seconds * 100)
    hours, ticks = divmod(ticks, 360000)
    minutes, ticks = divmod(ticks, 6000)
    secs, centis = divmod(ticks, 100)
    return f'{hours}:{minutes:02}:{secs:02}.{centis:02}'

def caption(text):
    # Treat subtitles as plain text, never as ASS formatting commands.
    if any(c in text for c in '{}\\'):
        raise SystemExit('Caption text must not contain ASS braces or backslashes; use a JSON newline.')
    lines = []
    for paragraph in text.splitlines():
        lines.extend(textwrap.wrap(paragraph, width=78, break_long_words=False, break_on_hyphens=False))
    if len(lines) > 2:
        raise SystemExit('Caption needs more than two lines. Split it into timed cues in scenes.json.')
    return r'\N'.join(lines)

ass_header = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,DejaVu Sans,38,&H00FFFFFF,&H00FFFFFF,&H80201D18,&H80201D18,0,0,0,0,100,100,0,0,3,9,0,2,120,120,38,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''

with tempfile.TemporaryDirectory(prefix='may-contain-assemble-') as folder:
    work = Path(folder)
    concat = []
    for index, job in enumerate(jobs):
        events = []
        for cue_index, cue in enumerate(job['cues']):
            end = float(cue['end'])
            # Hold the final caption through any narration-driven freeze.
            if cue_index == len(job['cues']) - 1 and abs(end - job['seconds']) < 0.01:
                end = job['duration']
            events.append(f"Dialogue: 0,{stamp(float(cue['start']))},{stamp(end)},Default,,0,0,0,,{caption(cue['text'])}\n")
        ass = f'captions_{index:02d}.ass'
        (work / ass).write_text(ass_header + ''.join(events), encoding='utf-8')
        part = f'part_{index:02d}.mp4'
        command = [ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(job['video'])]
        if has_audio:
            command += ['-i', str(job['audio'])] if job['audio'] else ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']
        vf = f"fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xefede8,setsar=1,tpad=stop_mode=clone:stop_duration={job['duration']},trim=duration={job['duration']},setpts=PTS-STARTPTS"
        if events:
            vf += f",subtitles={ass}"
        vf += ',format=yuv420p'
        command += ['-map', '0:v:0', '-vf', vf, '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-threads', '2', '-r', '30']
        if has_audio:
            command += ['-map', '1:a:0', '-af', f"aresample=48000,apad,atrim=duration={job['duration']},asetpts=PTS-STARTPTS", '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']
        else:
            command += ['-an']
        command += ['-t', str(job['duration']), '-movflags', '+faststart', part]
        print(f"Assembling {job['name']}: {job['duration']:.3f}s", flush=True)
        subprocess.run(command, cwd=work, check=True)
        concat.append(f"file '{part}'\n")
    (work / 'concat.txt').write_text(''.join(concat), encoding='utf-8')
    # Identical encodings/time bases permit lossless video concatenation. Re-encode
    # audio once to avoid accumulating AAC encoder padding at scene boundaries.
    command = [ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '1', '-i', 'concat.txt', '-map', '0:v:0', '-c:v', 'copy']
    if has_audio:
        command += ['-map', '0:a:0', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']
    else:
        command += ['-an']
    command += ['-t', str(sum(j['duration'] for j in jobs)), '-movflags', '+faststart', str(output)]
    subprocess.run(command, cwd=work, check=True)

report = {'output': output.name, 'has_audio': has_audio, 'seconds': sum(j['duration'] for j in jobs), 'scenes': [{'number': scenes[i]['number'], 'seconds': j['duration'], 'narration_seconds': j['audio_seconds']} for i, j in enumerate(jobs)]}
output.with_suffix('.timing.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(f"Saved {output.name}: {report['seconds']:.3f}s; {'AAC audio' if has_audio else 'no audio stream'}")
PY
