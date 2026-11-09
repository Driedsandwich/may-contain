#!/usr/bin/env node
/**
 * Record the unmodified app and real MCP stdio responses, without audio/captions.
 * npm ci; npx playwright install chromium; FFmpeg + ffprobe on PATH.
 * node scripts/record-demo.mjs --out <video-directory> [--scene 1..5]
 * Optional: FFMPEG, FFPROBE, DEMO_PORT. No workstation paths are persisted.
 */
import { chromium, expect } from '@playwright/test';
import { preview } from 'vite';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const option = (name) => argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined;
if (argv.includes('--help')) {
  console.log('node scripts/record-demo.mjs --out <video-directory> [--scene 1..5]');
  process.exit(0);
}
const OUT = resolve(option('--out') || 'video_out');
const ONLY = option('--scene') ? Number(option('--scene')) : null;
if (ONLY !== null && ![1, 2, 3, 4, 5].includes(ONLY)) throw new Error('--scene must be 1..5');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const PORT = Number(process.env.DEMO_PORT || 4173);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const APP = `${ORIGIN}/may-contain/`;
const EVAL_URL = 'https://github.com/driedsandwich/may-contain/blob/main/eval/RESULTS.md';
const TEXT = 'Ingredients: oats, milk powder. May contain peanuts.';
const MANIFEST = {
  title: 'May Contain — working app demo', fps: 30, width: 1920, height: 1080,
  audio: false, burned_in_captions: false,
  notes: 'Unmodified production build. Built-in fictional French example; no OCR or API stubs. Real measured evaluation document. Actual MCP JSON-RPC over stdio; responses preserved in mcp-transcript.json and mcp-stdout.jsonl.',
  scenes: [
    { number: 1, seconds: 20, title: 'Your allergens and the staff card', actions: 'Actual initial app screen, 390px wide at 1.4x; profile and staff card.', cues: [] },
    { number: 2, seconds: 25, title: 'Select, check, read', actions: 'Select milk, peanut and sesame; Try example text; three computed result states.', cues: [] },
    { number: 3, seconds: 45, title: 'Evidence and the conversation', actions: 'Original French and fixed English example translation; highlighted matches; What the text tells us; French, German and Japanese staff cards; landscape full-screen dialog.', cues: [] },
    { number: 4, seconds: 35, title: 'Limits and measured results', actions: 'Actual safety notice; click measured-results link and verify its contents; open the same eval/RESULTS.md on GitHub; per-allergen precision and recall.', cues: [] },
    { number: 5, seconds: 25, title: 'The MCP interface', actions: 'Start dist/mcp/server.js; real tools/list and tools/call check_ingredients requests and unmodified responses, in a terminal-style viewer.', cues: [] },
  ],
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function run(command, args, capture = false) {
  return new Promise((res, rej) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let stdout = '', stderr = '';
    if (capture) { child.stdout.on('data', (v) => stdout += v); child.stderr.on('data', (v) => stderr += v); }
    child.on('error', rej);
    child.on('exit', (code) => code === 0 ? res(stdout) : rej(new Error(`${command} exited ${code}: ${stderr}`)));
  });
}
async function firstMarkedFrame(raw) {
  const pixels = await new Promise((res, rej) => {
    const child = spawn(FFMPEG, ['-v', 'error', '-i', raw, '-vf', 'fps=30,crop=8:8:0:0,scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']);
    const chunks = [];
    child.stdout.on('data', (chunk) => chunks.push(chunk)); child.stderr.resume();
    child.on('error', rej);
    child.on('exit', (code) => code === 0 ? res(Buffer.concat(chunks)) : rej(new Error('Synchronization scan failed')));
  });
  for (let i = 0; i < pixels.length; i += 3) {
    if (pixels[i] > 180 && pixels[i + 1] < 80 && pixels[i + 2] > 180) return i / 3;
  }
  throw new Error('Recording start marker was not captured');
}

// Only the neutral recording stage is supplied by the recorder. App HTML, CSS,
// phrases, results and modules are never replaced or modified.
function stage() {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><style>
body{margin:0;background:#efede8;overflow:hidden}iframe{position:absolute;top:29px;left:687px;width:390px;height:730px;border:0;transform:scale(1.4);transform-origin:top left;background:white;box-shadow:0 10px 45px #332b1520}
#fiction{position:fixed;right:32px;bottom:26px;font:16px Arial;color:#746b5f}
#cursor{position:fixed;width:25px;height:25px;border:3px solid #b56f10;border-radius:50%;box-shadow:0 0 0 3px #fff9;background:#dda43b25;transform:translate(-50%,-50%);pointer-events:none;z-index:2147483646;left:-100px}#cursor.down{background:#c47a1370}
</style><iframe title="May Contain" src="${APP}" allow="fullscreen 'none'"></iframe><div id="fiction">Fictional label</div><div id="cursor"></div></html>`;
}
function terminal() {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;background:#111923;color:#e5eef6;font:23px/1.4 monospace;padding:32px 44px}header{color:#b5c6d6;font:21px/1.5 monospace;border-bottom:1px solid #43515f;padding-bottom:18px}header b{color:#a7e2bc}#command{margin:16px 0;color:#a7e2bc}main{display:grid;grid-template-columns:520px 1fr;gap:32px}.pane{height:844px;overflow:auto;background:#182431;border:1px solid #354757;border-radius:10px;padding:20px}h2{margin:0 0 16px;font:18px monospace;color:#a1bbd0}pre{margin:0;font:22px/1.42 monospace;white-space:pre-wrap;overflow-wrap:anywhere}.line{display:block;min-height:1.42em}#fiction{position:fixed;right:28px;bottom:14px;color:#a1bbd0;font:16px monospace}
</style><header><b>May Contain / MCP</b> &nbsp; stdio · JSON-RPC 2.0</header><div id="command">$ node dist/mcp/server.js</div><main><section class="pane"><h2>CLIENT → SERVER</h2><pre id="request"></pre></section><section class="pane" id="output"><h2>SERVER → CLIENT</h2><pre id="response"></pre></section></main><div id="fiction">Fictional label</div></html>`;
}

// Deliberately use the real wire protocol, retaining every received byte as well
// as parsed envelopes. No replacement fields, summarization or response fixtures.
class McpSession {
  constructor() {
    this.trace = []; this.raw = ''; this.pending = new Map(); this.id = 0;
    this.child = spawn(process.execPath, ['dist/mcp/server.js'], { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child.stdout.on('data', (chunk) => this.raw += chunk);
    this.child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    createInterface({ input: this.child.stdout }).on('line', (line) => {
      const message = JSON.parse(line);
      this.trace.push({ direction: 'server', message });
      this.pending.get(message.id)?.(message);
    });
    this.child.on('error', (error) => { this.failure = error; });
  }
  send(message) {
    this.trace.push({ direction: 'client', message });
    this.child.stdin.write(JSON.stringify(message) + '\n');
  }
  async request(method, params = {}) {
    if (this.failure) throw this.failure;
    const request = { jsonrpc: '2.0', id: ++this.id, method, params };
    let timer;
    const response = await new Promise((res, rej) => {
      timer = setTimeout(() => rej(new Error(`MCP timeout: ${method}`)), 10000);
      this.pending.set(request.id, res); this.send(request);
    }).finally(() => { clearTimeout(timer); this.pending.delete(request.id); });
    if (response.error) throw new Error(JSON.stringify(response.error));
    return { request, response };
  }
  async initialize() {
    await this.request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'may-contain-demo-recorder', version: '1.0.0' } });
    this.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  }
  async close() {
    this.child.stdin.end();
    if (this.child.exitCode === null) {
      const exited = new Promise((r) => this.child.once('exit', r));
      const timer = setTimeout(() => this.child.kill(), 2000);
      await exited; clearTimeout(timer);
    }
    await writeFile(join(OUT, 'mcp-transcript.json'), JSON.stringify(this.trace, null, 2) + '\n');
    await writeFile(join(OUT, 'mcp-stdout.jsonl'), this.raw);
  }
}
class Director {
  constructor(page, frame) { this.page = page; this.f = frame; this.start = 0; this.mcp = null; }
  async at(seconds, action) {
    const delay = seconds * 1000 - (performance.now() - this.start);
    if (delay < -1800) throw new Error(`Action at ${seconds}s overran by ${Math.round(-delay)}ms`);
    if (delay > 0) await wait(delay);
    if (action) await action();
  }
  async point(locator, click = false) {
    await locator.scrollIntoViewIfNeeded(); await wait(180);
    const box = await locator.boundingBox();
    if (!box) throw new Error('Invisible pointer target');
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await this.page.mouse.move(x, y, { steps: 16 });
    await this.page.evaluate(({ x, y }) => {
      const c = document.querySelector('#cursor');
      if (c) { c.style.left = `${x}px`; c.style.top = `${y}px`; }
    }, { x, y });
    if (click) {
      await this.page.locator('#cursor').evaluate((c) => c.classList.add('down'));
      await this.page.mouse.down(); await wait(100); await this.page.mouse.up();
      await this.page.locator('#cursor').evaluate((c) => c.classList.remove('down'));
      await wait(200);
    }
  }
  async hideCursor() { await this.page.locator('#cursor').evaluate((e) => e.style.left = '-100px'); }
  async view(locator, block = 'center') {
    await locator.evaluate((el, block) => el.scrollIntoView({ block, behavior: 'smooth' }), block);
    await wait(700); await this.hideCursor();
  }
  async landscape() {
    await this.hideCursor();
    await this.page.locator('iframe').evaluate((el) => Object.assign(el.style, { width: '844px', height: '390px', left: '200.4px', top: '189px', transform: 'scale(1.8)' }));
    await wait(400);
  }
  async shot(name) { await this.page.screenshot({ path: join(OUT, `${name}.png`) }); }
  async exchange(method, params) {
    const pair = await this.mcp.request(method, params);
    await this.page.evaluate(({ request, response }) => {
      document.querySelector('#request').textContent = JSON.stringify(request, null, 2);
      const pre = document.querySelector('#response'); pre.replaceChildren();
      for (const line of JSON.stringify(response, null, 2).split('\n')) {
        const span = document.createElement('span'); span.className = 'line'; span.textContent = line; pre.append(span);
      }
      document.querySelector('#output').scrollTop = 0;
    }, pair);
    return pair.response.result;
  }
  async terminalScroll(text, end = false) {
    await this.page.evaluate(({ text, end }) => {
      const panel = document.querySelector('#output');
      const line = [...document.querySelectorAll('.line')].find((el) => el.textContent.includes(text));
      if (!line) throw new Error(`Missing response line: ${text}`);
      panel.scrollTo({ top: end ? panel.scrollHeight : line.offsetTop - panel.offsetTop - 28, behavior: 'smooth' });
    }, { text, end });
  }
}
async function assertResults(d) {
  await expect(d.f.locator('.status-badge')).toHaveText(['●Contains', '▲May contain', '−Not found in this text']);
  await expect(d.f.locator('.text-pair mark')).toHaveText(['lait', 'arachides', 'milk', 'peanuts']);
}
const SCENES = [
  {
    async prepare(d) { await assertResults(d); },
    async act(d) {
      await d.at(3, () => d.point(d.f.locator('.allergen-pills')));
      await d.at(7, () => d.hideCursor());
      await d.at(9, () => d.shot('scene_01_initial'));
      await d.at(12, () => d.view(d.f.locator('.staff-card')));
      await d.at(17, () => d.shot('scene_01_card'));
    },
  },
  {
    async prepare(d) {
      await d.f.getByRole('button', { name: 'Edit allergens' }).click();
      await d.f.getByRole('button', { name: 'Clear & delete saved allergens' }).click();
      await d.f.getByRole('button', { name: 'Done', exact: true }).click();
      await d.f.evaluate(() => window.scrollTo(0, 0));
    },
    async act(d) {
      await d.at(1, () => d.point(d.f.getByRole('button', { name: 'Edit allergens' }), true));
      await d.at(3, () => d.point(d.f.getByLabel('Milk', { exact: true }), true));
      await d.at(5, () => d.point(d.f.getByLabel('Peanut', { exact: true }), true));
      await d.at(7, () => d.point(d.f.getByLabel('Sesame', { exact: true }), true));
      await d.at(9, () => d.point(d.f.getByRole('button', { name: 'Done', exact: true }), true));
      await d.at(12, () => d.point(d.f.getByRole('button', { name: 'Try example text', exact: true }), true));
      await d.at(14, async () => { await assertResults(d); await d.view(d.f.locator('.product-summary'), 'start'); });
      await d.at(19, () => d.shot('scene_02_results'));
    },
  },
  {
    async prepare(d) { await assertResults(d); await d.view(d.f.locator('.text-pair')); },
    async act(d) {
      await d.at(2, () => d.point(d.f.locator('.text-pair mark.contains').first()));
      await d.at(5, () => d.point(d.f.locator('.text-pair mark.may_contain').first()));
      await d.at(7, () => d.shot('scene_03_evidence'));
      await d.at(8, () => d.view(d.f.locator('.explanation')));
      await d.at(12, () => d.shot('scene_03_explanation'));
      await d.at(15, () => d.view(d.f.locator('.staff-card')));
      for (const [time, name, lang] of [[18, 'Français', 'fr'], [23, 'Deutsch', 'de'], [28, '日本語', 'ja']]) {
        await d.at(time, async () => {
          await d.point(d.f.getByRole('button', { name, exact: true }), true);
          await expect(d.f.locator('.staff-card .staff-words')).toHaveAttribute('lang', lang);
          await d.view(d.f.locator('.staff-section'));
          await d.shot(`scene_03_card_${lang}`);
        });
      }
      await d.at(34, () => d.point(d.f.getByRole('button', { name: 'Show full screen' }), true));
      await d.at(36, async () => { await d.landscape(); await expect(d.f.getByRole('dialog')).toBeVisible(); });
      await d.at(40, () => d.shot('scene_03_landscape'));
    },
  },
  {
    async prepare(d) { await d.view(d.f.locator('.safety').first()); },
    async act(d) {
      await d.at(3, () => d.shot('scene_04_warning'));
      await d.at(9, () => d.view(d.f.locator('.under-the-label')));
      await d.at(12, async () => {
        const opened = d.page.context().waitForEvent('page');
        await d.point(d.f.getByRole('link', { name: 'See measured results & limitations' }), true);
        const doc = await opened; await doc.waitForLoadState('domcontentloaded');
        const response = await doc.request.get(doc.url());
        if (await response.text() !== await readFile(join(ROOT, 'eval/RESULTS.md'), 'utf8')) throw new Error('Measured-results link differs from repo evaluation');
        await doc.close();
      });
      await d.at(15, async () => {
        // GitHub disallows framing. Use the recorded top-level page for its real
        // rendered Markdown, after clicking and verifying the actual app link.
        await d.page.goto(EVAL_URL, { waitUntil: 'domcontentloaded' });
        const heading = d.page.getByRole('heading', { name: 'Per allergen', exact: true });
        await heading.waitFor();
        await d.page.evaluate(() => document.body.style.zoom = '1.25');
        await heading.evaluate((el) => el.scrollIntoView({ block: 'start' }));
        const table = d.page.locator('article table').first();
        await expect(table).toContainText('0.811'); await expect(table).toContainText('0.857');
        // Confirm every table cell against the repo, not just selected numbers.
        const source = await readFile(join(ROOT, 'eval/RESULTS.md'), 'utf8');
        const rows = source.split('## Per allergen')[1].split('## By language')[0].split('\n').filter((l) => l.startsWith('|') && !l.includes('---')).map((l) => l.split('|').slice(1, -1).map((s) => s.trim()));
        const actual = await table.locator('tr').evaluateAll((rs) => rs.map((r) => [...r.querySelectorAll('th,td')].map((c) => c.textContent.trim())));
        if (JSON.stringify(rows) !== JSON.stringify(actual)) throw new Error('GitHub evaluation table differs from repo');
      });
      await d.at(19, async () => {
        // GitHub hydration may restore its initial scroll after DOMContentLoaded.
        // Position again once hydrated, leaving room for GitHub's sticky toolbar.
        await d.page.getByRole('heading', { name: 'Per allergen', exact: true }).evaluate((el) => {
          window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 140, behavior: 'instant' });
        });
        const milk = d.page.locator('article table').first().getByRole('row', { name: /^milk / });
        const box = await milk.boundingBox();
        if (!box || box.y < 140 || box.y + box.height > 1080) throw new Error('Measured table is outside the recorded view');
      });
      await d.at(22, () => d.shot('scene_04_metrics'));
      await d.at(28, async () => {
        await d.page.locator('article table').first().locator('tr').last().evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      });
      await d.at(32, () => d.shot('scene_04_limits'));
    },
  },
  {
    async prepare(d) { await d.page.setContent(terminal()); },
    async act(d) {
      await d.at(1, async () => {
        d.mcp = new McpSession(); await d.mcp.initialize();
        const result = await d.exchange('tools/list', {});
        if (!result.tools.some((t) => t.name === 'check_ingredients')) throw new Error('Missing MCP tool');
      });
      await d.at(4, () => d.shot('scene_05_tools_list'));
      await d.at(5, () => d.terminalScroll('"required"'));
      await d.at(8, async () => {
        const result = await d.exchange('tools/call', { name: 'check_ingredients', arguments: { text: TEXT, allergens: ['milk', 'peanuts', 'sesame'] } });
        if (result.isError) throw new Error('MCP tool returned an error');
        const data = JSON.parse(result.content[0].text);
        if (JSON.stringify(data) !== JSON.stringify(result.structuredContent)) throw new Error('MCP content mismatch');
        if (data.results.map((r) => r.status).join() !== 'contains,may_contain,not_found') throw new Error('Unexpected MCP results');
      });
      await d.at(10, () => d.shot('scene_05_call'));
      await d.at(12, () => d.terminalScroll('"structuredContent"'));
      await d.at(15, () => d.shot('scene_05_milk'));
      await d.at(17, () => d.terminalScroll('"allergen": "peanuts"'));
      await d.at(20, () => d.shot('scene_05_peanut'));
      await d.at(21, () => d.terminalScroll('"allergen": "sesame"', true));
      await d.at(23, () => d.shot('scene_05_notice'));
    },
  },
];

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'scenes.json'), JSON.stringify(MANIFEST, null, 2) + '\n');
await run(FFMPEG, ['-version'], true); await run(FFPROBE, ['-version'], true);
await run('npm', ['run', 'build']);
const scratch = await mkdtemp(join(tmpdir(), 'may-contain-record-'));
let browser, server, director;
const stop = async () => { await director?.mcp?.close(); if (director) director.mcp = null; await browser?.close(); await server?.close(); };
process.once('SIGINT', async () => { await stop(); process.exit(130); });
process.once('SIGTERM', async () => { await stop(); process.exit(143); });
try {
  server = await preview({ root: ROOT, base: '/may-contain/', preview: { host: '127.0.0.1', port: PORT, strictPort: true } });
  browser = await chromium.launch({ headless: true });
  const recording = [];
  for (const spec of MANIFEST.scenes.filter((s) => ONLY === null || s.number === ONLY)) {
    const name = `scene_${String(spec.number).padStart(2, '0')}`;
    console.log(`Recording ${name}: ${spec.seconds}s`);
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC', colorScheme: 'light', reducedMotion: 'no-preference', serviceWorkers: 'block', recordVideo: { dir: scratch, size: { width: 1920, height: 1080 } } });
    // Browsing only: prevent GitHub telemetry POSTs and avatar/profile photos.
    await context.route('**/*', async (route) => {
      const request = route.request(), url = request.url();
      if (!['GET', 'HEAD'].includes(request.method())) return route.abort();
      if (url === `${ORIGIN}/__demo_stage`) return route.fulfill({ contentType: 'text/html', body: stage() });
      if (url.includes('avatars.githubusercontent.com')) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(`${ORIGIN}/__demo_stage`);
    const frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    await frame.getByRole('button', { name: 'Try example text', exact: true }).waitFor();
    await frame.evaluate(() => document.fonts.ready);
    director = new Director(page, frame);
    await SCENES[spec.number - 1].prepare(director);
    await wait(500);
    await page.evaluate(() => {
      const marker = document.createElement('div');
      marker.style.cssText = 'position:fixed;left:0;top:0;width:8px;height:8px;background:#ff00ff;z-index:2147483647';
      document.body.append(marker);
    });
    director.start = performance.now();
    await SCENES[spec.number - 1].act(director);
    await director.at(spec.seconds);
    const elapsed = (performance.now() - director.start) / 1000;
    if (director.mcp) { await director.mcp.close(); director.mcp = null; }
    const video = page.video(); await context.close();
    const raw = await video.path(), firstFrame = await firstMarkedFrame(raw);
    await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw, '-vf', `fps=30,trim=start_frame=${firstFrame},setpts=PTS-STARTPTS,drawbox=x=0:y=0:w=12:h=12:color=0xefede8:t=fill,tpad=stop_mode=clone:stop_duration=2,trim=duration=${spec.seconds},format=yuv420p`, '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-threads', '2', '-r', '30', '-fps_mode', 'cfr', '-t', String(spec.seconds), '-movflags', '+faststart', join(OUT, `${name}.mp4`)]);
    recording.push({ scene: spec.number, seconds: spec.seconds, raw_start_frame_at_30fps: firstFrame, recorded_seconds: Number(elapsed.toFixed(3)) });
    console.log(`Saved ${name}.mp4`);
  }
  await writeFile(join(OUT, ONLY ? `recording_scene_${ONLY}.json` : 'recording.json'), JSON.stringify({ format: '1920x1080 / 30 fps / H.264 / silent / no captions', source: MANIFEST.notes, scenes: recording }, null, 2) + '\n');
} finally {
  await stop(); await rm(scratch, { recursive: true, force: true });
}
console.log('Recording complete. Vite preview, MCP and Chromium closed.');
