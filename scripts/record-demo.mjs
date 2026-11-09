#!/usr/bin/env node
/**
 * Reproducible, silent storyboard capture. Requirements: npm ci,
 * npx playwright install chromium, ffmpeg + ffprobe on PATH.
 * Usage: node scripts/record-demo.mjs --out <video-directory> [--scene 3]
 * Optional: FFMPEG, FFPROBE, DEMO_PORT environment variables.
 * Scene actions live in SCENES below; capture/encoding is independent.
 * The only mocked operation is OCR of our synthetic label. No camera,
 * catalog request, real package, personal profile or measured claim is used.
 */
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
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
const URL = `${ORIGIN}/may-contain/`;
const TEXT = 'Ingredients: oats, milk powder. May contain peanuts.';
const SPANISH = 'Tengo alergia a la leche, al cacahuete y al sésamo. ¿Puede comprobar los ingredientes y el riesgo de contacto cruzado?';
const MEANING = 'I am allergic to milk, peanut and sesame. Can you check the ingredients and the risk of cross-contact?';
const WARNING = "Not found does not mean safe. Always check the package and ask staff. If you have a severe allergy, follow your doctor's plan.";
const STORYBOARD = {
  title: 'May Contain — Demo storyboard', fps: 30, width: 1920, height: 1080,
  warning: WARNING,
  notes: 'Concept visuals. Fictional package. OCR uses a fixed capture fixture, not a measurement. Proposed MCP interface, not an endpoint demonstration. Translation review is future work.',
  scenes: [
    { number: 1, seconds: 20, subtitle: 'A familiar allergy. An unfamiliar label.', narration: 'You are travelling, standing in a food shop, and the label is in an unfamiliar language. You know your allergies, but checking this package takes more than a quick glance. May Contain is a concept for making that conversation easier.', cues: [{ start: 0, end: 20, text: 'A familiar allergy. An unfamiliar label.' }] },
    { number: 2, seconds: 25, subtitle: 'Choose your allergens, then scan a barcode or photograph the label.', narration: 'Start with your allergens and the language you want to show staff. For this example, select milk, peanut and sesame, then choose Spanish. Tap Photograph ingredients. You can also start with a barcode. Before comparing anything, review the captured text against the package and correct any reading errors.', cues: [{ start: 0, end: 25, text: 'Choose your allergens,\nthen scan a barcode or photograph the label.' }] },
    { number: 3, seconds: 45, subtitle: 'Three text-based results. One card to show staff.', narration: 'This fictional label reads: Ingredients: oats, milk powder. May contain peanuts. The proposed check links each result to the words in that text. Milk is marked Contains because milk powder is listed. Peanut is marked May contain because the label explicitly says so. Sesame is marked Not found in this text. That describes the text we checked; it is not a safety decision. The large Spanish card explains the selected allergies and asks staff to check the ingredients and the risk of cross-contact. Keep the package available so staff can inspect it.', cues: [{ start: 0, end: 45, text: 'Three text-based results. One card to show staff.' }] },
    { number: 4, seconds: 35, subtitle: WARNING, narration: "There are three boundaries: no claim that a food is safe, no diagnosis or emergency guidance, and no inference about unlisted cross-contact. Keep the source alongside each result. Barcode catalog entries may be incomplete. These evaluation values are placeholders, not measured results. Not found does not mean safe. Always check the package and ask staff. If you have a severe allergy, follow your doctor's plan.", cues: [{ start: 21, end: 25, text: 'Not found does not mean safe.' }, { start: 25, end: 30, text: 'Always check the package and ask staff.' }, { start: 30, end: 35, text: "If you have a severe allergy, follow your doctor's plan." }] },
    { number: 5, seconds: 25, subtitle: 'An agent can request the same evidence and staff card.', narration: 'The proposed MCP interface lets an AI agent discover and call the same label-checking tool. It would return text-based statuses, evidence, source information, a staff card and the warning. Next, review translations with speakers, test difficult labels and build offline cards. May Contain: read the label, start the conversation.', cues: [{ start: 0, end: 25, text: 'An agent can request the same evidence and staff card.' }] },
  ],
};

function run(command, args, capture = false) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let stdout = '', stderr = '';
    if (capture) {
      child.stdout.on('data', (v) => { stdout += v; });
      child.stderr.on('data', (v) => { stderr += v; });
    }
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolvePromise(stdout) : reject(new Error(`${command} exited ${code}: ${stderr}`)));
  });
}
async function firstMarkedFrame(raw) {
  // Locate a recording-only magenta synchronization square in the actual video.
  // Wall-clock estimates drift because Playwright's encoder drains on close.
  const pixels = await new Promise((resolvePromise, reject) => {
    const child = spawn(FFMPEG, ['-v', 'error', '-i', raw, '-vf', 'fps=30,crop=8:8:0:0,scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']);
    const chunks = [];
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.resume();
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolvePromise(Buffer.concat(chunks)) : reject(new Error('Video synchronization scan failed')));
  });
  for (let i = 0; i < pixels.length; i += 3) {
    if (pixels[i] > 180 && pixels[i + 1] < 80 && pixels[i + 2] > 180) return i / 3;
  }
  throw new Error('Recording start marker was not captured');
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Browser-rendered editorial screens; no stock images or generated people.
const CSS = `
*{box-sizing:border-box}body{margin:0;color:#292824;background:#faf9f6;font-family:Inter,Arial,sans-serif}header{display:flex;justify-content:space-between;align-items:center;padding:22px 23px;border-bottom:1px solid #dedbd4}header b{font-size:23px;letter-spacing:-1px}header span{font-size:10px;color:#956016;text-transform:uppercase;letter-spacing:1px}main{padding:26px 24px}h1{font-size:35px;line-height:1.13;letter-spacing:-1.3px;margin:12px 0 22px}h2{font-size:25px;line-height:1.2;letter-spacing:-.6px;margin:14px 0}h3{font-size:17px;margin:0 0 10px}p{font-size:16px;line-height:1.55;margin:10px 0}.eyebrow{color:#976010;font-weight:700;font-size:10px;letter-spacing:1.8px;text-transform:uppercase}.muted{color:#69675e;font-size:13px;line-height:1.6}.box{border:1px solid #dedad1;border-radius:15px;background:white;padding:18px;margin:14px 0}.amber{background:#f6e9c9;border-color:#dec68f}.pill{display:inline-block;padding:8px 12px;background:#f4e6c8;border-radius:20px;font-size:13px;font-weight:600;margin:5px 3px 0 0}.rule{height:3px;background:#a96816;width:44px;margin:18px 0}.reveal{opacity:0;transform:translateY(12px);transition:opacity .65s,transform .65s}.reveal.on{opacity:1;transform:none}.focus{outline:3px solid #bb7a20;outline-offset:5px;border-radius:4px}.tag{font-size:11px;font-weight:700;color:#945e16;letter-spacing:1px}code{font-size:15px;line-height:1.5}table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;padding:13px 6px;border-bottom:1px solid #ddd7cb;vertical-align:top}th{font-size:10px;text-transform:uppercase;color:#746850}td b{font-size:18px;white-space:nowrap}.warning{font-size:23px;line-height:1.5;font-weight:600}.steps .box{margin:10px 0}.arrow{text-align:center;color:#a86a17;font-size:23px}.field{display:grid;grid-template-columns:102px 1fr;gap:10px;border-bottom:1px solid #e7e2d8;padding:12px 0;font-size:13px}.field b{color:#945e16}.map{width:100%;height:190px}.package{background:#f4e8d0;padding:20px 19px 22px;box-shadow:0 12px 24px #45330b12;border:1px solid #d6c5a1;border-top:10px double #d6c5a1;border-bottom:8px double #d6c5a1;transform:rotate(-2deg);margin:22px 12px}.package p{font-size:18px}.package .english{font-size:12px;color:#655e50}.luggage{display:inline-block;border:1px solid #b8893f;border-radius:7px;background:#fff6df;padding:9px 20px;transform:rotate(6deg);font-size:13px;color:#765121}.page-number{font-size:11px;color:#8a8274;margin-bottom:18px}.next li{font-size:17px;line-height:1.4;margin:18px 0}.end-card{padding:40px 55px;background:#f5e7c8;border:1px solid #d9bd81;border-radius:22px}.end-card p{font-size:34px;line-height:1.45}.end-title{font-size:44px;letter-spacing:-2px;margin:0 0 20px}.landscape main{padding:22px 40px}.landscape .muted{font-size:16px}.landscape header{padding:15px 40px}
`;
function doc(body, cls = '') {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><style>${CSS}</style><body class="${cls}"><header><b>may contain<span style="color:#b57621;font-size:25px">.</span></b><span>Concept / fictional example</span></header><main>${body}</main></body></html>`;
}
const INTRO = doc(`<div class="eyebrow">01 / Between languages</div><h1>A familiar allergy.<br>An unfamiliar label.</h1>
<svg class="map" viewBox="0 0 340 190" aria-label="Illustrated travel map"><rect width="340" height="190" rx="18" fill="#e9e8df"/><path d="M15 55 62 23 110 34 135 69 109 90 116 129 82 169 52 121 26 106ZM190 22 237 15 257 44 315 37 331 75 288 99 260 88 246 158 209 173 191 123 162 95Z" fill="#d1d5c9"/><path d="M85 70Q160 5 243 71" fill="none" stroke="#b47724" stroke-width="3" stroke-dasharray="6 7"/><circle cx="85" cy="70" r="7" fill="#a86615"/><circle cx="243" cy="71" r="7" fill="#a86615"/><text x="29" y="183" fill="#687065" font-size="10">ILLUSTRATIVE JOURNEY</text><path d="m160 26 10 12 19 0-15 8-5 16-6-13-15-5 14-6Z" fill="#a86615"/></svg>
<div class="luggage">○ &nbsp; ONE JOURNEY · THREE ALLERGENS</div>
<div class="package reveal" id="package"><div class="tag">FICTIONAL PACKAGE · TWO LANGUAGE PANELS</div><p id="spanish">Ingredientes: avena, <b>leche en polvo.</b><br>Puede contener <b>cacahuetes.</b></p><p class="english">English panel: ${TEXT}</p></div>
<div id="profile" class="reveal"><div class="eyebrow">Your example profile</div><span class="pill">Milk</span><span class="pill">Peanut</span><span class="pill">Sesame</span><p class="muted">Read the label. Start the conversation.</p></div>`);
const BOUNDARIES = doc(`<div class="eyebrow">04 / Know the limits</div><h1>Text evidence.<br>Clear boundaries.</h1><div class="box" id="boundary1"><div class="tag">01</div><h2>No claim that a food is safe.</h2></div><div class="box" id="boundary2"><div class="tag">02</div><h2>No diagnosis or emergency guidance.</h2></div><div class="box" id="boundary3"><div class="tag">03</div><h2>No inference about unlisted cross-contact.</h2></div><p class="muted">A word match can support a conversation.<br>It cannot decide whether you should eat a food.</p>`);
const SOURCES = doc(`<div class="eyebrow">04 / Keep the source</div><h1>Which words<br>were checked?</h1><div class="box amber"><div class="tag">PRIMARY / CONFIRMED PACKAGE TEXT</div><p>${TEXT}</p><p class="muted">Illustrative text reviewed against the fictional package. Keep the original beside any translation.</p></div><div class="box"><div class="tag">SECONDARY / BARCODE CATALOG</div><h2>Open Food Facts</h2><p>Community entries may be inaccurate or incomplete.</p><p class="muted">Check the current package. No catalog API was queried for this fictional example.</p></div><div class="rule"></div><p>Keep the source alongside each result.</p>`);
const EVALUATION = doc(`<div class="eyebrow">04 / Planned evaluation</div><h1>Placeholders.<br>Not measured.</h1><p class="muted">Illustrative values only. No measurements have been performed for this storyboard.</p><div class="box" style="padding:9px"><table><thead><tr><th>Planned metric</th><th>Placeholder</th></tr></thead><tbody><tr><td>Extraction accuracy</td><td><b>00.0%</b></td></tr><tr><td>Status agreement</td><td><b>00.0%</b></td></tr><tr><td>Median latency</td><td><b>00.0 s</b></td></tr></tbody></table></div><div class="box amber"><h3>Before replacing these values</h3><p class="muted">Report sample size, test set, languages, scoring rules and error cases.</p></div><p class="muted">Compare OCR and per-allergen labels with independently reviewed references. Measure consistent start/end points.</p>`);
const WARN = doc(`<div class="eyebrow">04 / Always keep this warning</div><h1>A text result<br>is not a verdict.</h1><div class="box amber warning"><p id="w1" class="warning">Not found does not mean safe.</p><div class="rule"></div><p id="w2" class="warning">Always check the package and ask staff.</p><div class="rule"></div><p id="w3" class="warning">If you have a severe allergy, follow your doctor's plan.</p></div><p class="muted">Keep the package available for staff to inspect.</p>`);
const FLOW = doc(`<div class="eyebrow">05 / Proposed MCP interface</div><h1>The same evidence.<br>Another way in.</h1><p class="muted">Design example · not an implemented endpoint</p><div class="steps"><div class="box" id="discover"><div class="tag">DISCOVER</div><h2><code>tools/list</code></h2></div><div class="arrow">↓</div><div class="box reveal" id="call"><div class="tag">REQUEST</div><h2><code>tools/call</code></h2></div><div class="arrow reveal" id="flow-arrow">↓</div><div class="box amber reveal" id="tool"><div class="tag">PROPOSED TOOL</div><h2><code>check_label(<br>&nbsp; text, allergens, locale<br>)</code></h2><p class="muted">Confirmed text · Milk, Peanut, Sesame<br>Staff-card locale: es</p></div></div>`);
const FIELDS = doc(`<div class="eyebrow">05 / Proposed response</div><h1>Words, sources<br>and a staff card.</h1><div class="box" id="fields"><div class="field"><b>status</b><span>Contains<br>May contain<br>Not found in this text</span></div><div class="field"><b>evidence</b><span>milk powder<br>May contain peanuts</span></div><div class="field"><b>source</b><span>Confirmed illustrative package text</span></div><div class="field"><b>staff_card</b><span>Spanish · selected allergies<br>Ingredients + cross-contact</span></div><div class="field"><b>warning</b><span>Full mandatory warning</span></div></div><div class="box amber"><h3>Missing or unreadable text?</h3><p class="muted">Request review or recapture.<br>Do not return a Not found result.</p></div><p class="muted">Application-specific proposal, not a live tool call.</p>`);
const NEXT = doc(`<div class="eyebrow">05 / What comes next</div><h1>Keep improving<br>the conversation.</h1><ol class="next"><li>Review translations with speakers.</li><li>Test difficult labels.</li><li>Build offline staff cards.</li></ol><div class="box amber"><h2>May Contain</h2><p>Read the label.<br>Start the conversation.</p></div><p class="muted">DSH Hacks V2 · Student healthcare hackathon<br>Concept demonstration</p>`);
const END = doc(`<div class="end-card"><div class="eyebrow">Spanish staff card · translation review is future work</div><p lang="es">${SPANISH}</p><div class="muted">${MEANING}</div></div><div style="display:flex;align-items:center;justify-content:space-between;margin-top:22px"><b style="font-size:30px;letter-spacing:-1px">May Contain</b><span style="font-size:19px">Read the label. Start the conversation.</span></div><p class="muted" style="font-size:13px">${WARNING}</p>`, 'landscape');

function stage() {
  return `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#efede8;overflow:hidden}#label{position:absolute;top:18px;width:100%;text-align:center;font:12px Arial;letter-spacing:2px;color:#786a56}iframe{position:absolute;top:54px;left:755.25px;width:390px;height:844px;border:0;transform:scale(1.05);transform-origin:top left;background:white;box-shadow:0 12px 50px #332b1518}#cursor{position:fixed;width:28px;height:28px;border:3px solid #b56f10;border-radius:50%;box-shadow:0 0 0 3px #fff9;background:#dda43b25;transform:translate(-50%,-50%);pointer-events:none;z-index:2147483647;left:-100px}#cursor.down{background:#c47a1370;width:21px;height:21px}</style><div id="label">MAY CONTAIN · STORYBOARD EXAMPLE · FICTIONAL LABEL</div><iframe title="Demo screen" src="${URL}"></iframe><div id="cursor"></div><script>addEventListener('message',e=>{if(e.source!==document.querySelector('iframe').contentWindow||e.data?.type!=='demo-pointer')return;const frame=document.querySelector('iframe'),b=frame.getBoundingClientRect(),c=document.querySelector('#cursor');c.style.left=(b.left+e.data.x*b.width/frame.clientWidth)+'px';c.style.top=(b.top+e.data.y*b.height/frame.clientHeight)+'px';});</script>`;
}

class Director {
  constructor(page, frame) { this.page = page; this.f = frame; this.start = 0; }
  async at(seconds, action) {
    const delay = seconds * 1000 - (performance.now() - this.start);
    if (delay < -1600) throw new Error(`Scene action at ${seconds}s overran by ${Math.round(-delay)}ms`);
    if (delay > 0) await wait(delay);
    if (action) await action();
  }
  async point(locator, click = false) {
    await locator.scrollIntoViewIfNeeded();
    await wait(200);
    const box = await locator.boundingBox();
    if (!box) throw new Error('Cannot point to invisible element');
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    // Bounding boxes include iframe transforms; draw the cursor in the parent.
    await this.page.mouse.move(x, y, { steps: 22 });
    await this.page.evaluate(({ x, y }) => {
      const c = document.querySelector('#cursor'); c.style.left = `${x}px`; c.style.top = `${y}px`;
    }, { x, y });
    if (click) {
      await this.page.evaluate(() => document.querySelector('#cursor').classList.add('down'));
      await this.page.mouse.down(); await wait(100); await this.page.mouse.up();
      await this.page.evaluate(() => document.querySelector('#cursor').classList.remove('down'));
      await wait(240);
    }
  }
  async hideCursor() { await this.page.evaluate(() => document.querySelector('#cursor').style.left = '-100px'); }
  async view(locator) {
    await locator.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    await wait(650);
  }
  async slide(html) {
    await this.hideCursor();
    await this.f.setContent(html);
    await this.f.evaluate(() => document.fonts.ready);
  }
  async reveal(id) { await this.f.locator(`#${id}`).evaluate((e) => e.classList.add('on')); }
  async focus(selector) {
    await this.f.evaluate((s) => { document.querySelectorAll('.focus').forEach((e) => e.classList.remove('focus')); document.querySelector(s)?.classList.add('focus'); }, selector);
  }
  async landscape() {
    await this.hideCursor();
    await this.page.locator('iframe').evaluate((el) => Object.assign(el.style, { width: '960px', height: '540px', left: '192px', top: '54px', transform: 'scale(1.6)' }));
    await wait(400);
  }
}

// Recording-only presentation. The underlying matcher still produces the results.
// Explicit example labels replace photo confidence and generic personal-text labels.
async function dressApp(d) {
  // CSS display copy avoids changing React-owned fragment/text nodes while the
  // allergen picker rerenders. These phrases are explicitly storyboard fixtures.
  await d.f.addStyleTag({ content: `.demo-evidence-focus{outline:3px solid #b97921;outline-offset:5px;border-radius:4px}.result-card .product-image{display:none}.text-pair p{font-size:18px!important}.staff-words[lang="es"],.staff-meaning{font-size:0!important;line-height:0!important}.staff-words[lang="es"]>*,.staff-meaning>*{display:none}.staff-words[lang="es"]::after{content:${JSON.stringify(SPANISH)};display:block;font-size:28px;line-height:1.4}.staff-meaning::after{content:${JSON.stringify(MEANING)};display:block;font-size:13px;line-height:1.5}.dialog.full-card .staff-words::after{font-size:34px;line-height:1.4}.dialog.full-card .staff-meaning::after{font-size:16px}.dialog.full-card .safety p{font-size:13px!important}` });
  await d.f.evaluate(() => {
    const update = () => {
      const set = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
      set(document.querySelector('.product-details > .eyebrow'), 'Example text · fictional package');
      set(document.querySelector('.product-details > h2'), 'Illustrative oat label');
      set(document.querySelector('.source-line > div'), 'Confirmed illustrative text · English panel');
      const feedback = document.querySelector('.feedback');
      if (feedback?.textContent.includes('OCR confidence')) set(feedback, 'Example capture fixture. Review every word against the fictional package.');
      // Avoid displaying a real barcode even as an input placeholder.
      const barcode = document.querySelector('#barcode'); if (barcode) barcode.placeholder = 'Printed barcode number';
    };
    new MutationObserver(update).observe(document.body, { childList: true, subtree: true });
    update();
  });
}
async function prepareExample(d) {
  await d.f.getByRole('button', { name: 'Paste text', exact: true }).click();
  await d.f.getByLabel('Ingredient text', { exact: false }).fill(TEXT);
  await d.f.getByRole('button', { name: 'Check this text', exact: true }).click();
  await d.f.getByLabel('All staff card languages').selectOption('es');
  await dressApp(d);
  const actual = await d.f.locator('.status-badge').allTextContents();
  if (actual.join('|') !== '●Contains|▲May contain|−Not found in this text') throw new Error(`Unexpected example results: ${actual}`);
  await d.f.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(700);
}
async function makePhoto(browser) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 420 } });
  await page.setContent(`<body style="margin:0;background:#fff;padding:45px;font:44px Arial;color:#222"><p style="font:20px Arial">FICTIONAL PACKAGE · ENGLISH PANEL</p><p>Ingredients: oats, milk powder.</p><p>May contain peanuts.</p></body>`);
  const buffer = await page.screenshot(); await page.close(); return buffer;
}

// Edit these scene actions/selectors when the UI changes. Times are scene-relative.
const SCENES = [
  {
    async prepare(d) { await d.slide(INTRO); },
    async act(d) {
      await d.at(2, () => d.point(d.f.locator('.map')));
      await d.at(5, () => d.reveal('package'));
      await d.at(7, () => d.point(d.f.locator('#spanish')));
      await d.at(9, () => d.focus('#spanish'));
      await d.at(13, () => d.reveal('profile'));
      await d.at(16, () => d.point(d.f.locator('#profile')));
      await d.at(18, () => d.hideCursor());
    },
  },
  {
    async prepare(d) {
      await prepareExample(d);
      await d.f.getByRole('button', { name: 'Edit allergens' }).click();
      for (const name of ['Milk', 'Peanut', 'Sesame']) await d.f.getByLabel(name, { exact: true }).uncheck();
      await d.f.getByRole('button', { name: 'Done', exact: true }).click();
      await d.f.getByLabel('All staff card languages').selectOption('en');
      await d.f.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    },
    async act(d, photo) {
      await d.at(1, () => d.point(d.f.getByRole('button', { name: 'Edit allergens' }), true));
      await d.at(3, () => d.point(d.f.getByLabel('Milk', { exact: true }), true));
      await d.at(4.2, () => d.point(d.f.getByLabel('Peanut', { exact: true }), true));
      await d.at(5.4, () => d.point(d.f.getByLabel('Sesame', { exact: true }), true));
      await d.at(6.6, () => d.point(d.f.getByRole('button', { name: 'Done', exact: true }), true));
      await d.at(8, async () => { const el = d.f.getByLabel('All staff card languages'); await d.point(el); await el.selectOption('es'); });
      await d.at(10, () => d.point(d.f.getByRole('button', { name: 'Label photo', exact: true }), true));
      await d.at(11.5, () => d.view(d.f.locator('.photo-drop')));
      await d.at(13, () => d.point(d.f.getByRole('button', { name: 'Barcode', exact: true }), true));
      await d.at(14.3, () => d.point(d.f.getByRole('button', { name: 'Scan barcode with camera' })));
      await d.at(16, () => d.point(d.f.getByRole('button', { name: 'Label photo', exact: true }), true));
      await d.at(17.2, async () => {
        await d.f.getByLabel('Choose a label photo', { exact: true }).setInputFiles({ name: 'fictional-label.png', mimeType: 'image/png', buffer: photo });
        await d.f.getByLabel('Review and correct the extracted text').waitFor();
        await d.view(d.f.locator('.review-check'));
      });
      await d.at(20, () => d.point(d.f.getByLabel('Review and correct the extracted text')));
      await d.at(22, () => d.point(d.f.getByLabel('I checked and corrected'), true));
      await d.at(23, () => d.hideCursor());
    },
  },
  {
    async prepare(d) { await prepareExample(d); await d.view(d.f.locator('.text-pair')); },
    async act(d) {
      await d.at(2, () => d.point(d.f.locator('.text-pair mark.contains').first()));
      await d.at(4, async () => { await d.f.locator('.text-pair > div').first().evaluate((e) => e.classList.add('demo-evidence-focus')); });
      await d.at(7, () => d.point(d.f.locator('.text-pair mark.may_contain').first()));
      await d.at(10, async () => { await d.f.locator('.demo-evidence-focus').evaluate((e) => e.classList.remove('demo-evidence-focus')); await d.view(d.f.locator('.staff-card')); });
      await d.at(14, () => d.view(d.f.locator('.result-card')));
      await d.at(16, () => d.point(d.f.locator('.status-row').nth(0)));
      await d.at(20, () => d.point(d.f.locator('.explanation p').nth(0)));
      await d.at(23, () => d.point(d.f.locator('.status-row').nth(1)));
      await d.at(26, () => d.point(d.f.locator('.explanation p').nth(1)));
      await d.at(29, () => d.point(d.f.locator('.status-row').nth(2)));
      await d.at(32, () => d.point(d.f.locator('.explanation p').nth(2)));
      await d.at(35, async () => { await d.view(d.f.locator('.staff-card')); await d.point(d.f.getByRole('button', { name: 'Show full screen' }), true); });
      await d.at(37, async () => { await d.landscape(); await d.f.getByRole('dialog').waitFor(); });
      await d.at(40, () => d.hideCursor());
    },
  },
  {
    async prepare(d) { await d.slide(BOUNDARIES); },
    async act(d) {
      await d.at(1, () => d.point(d.f.locator('#boundary1')));
      await d.at(3, () => d.point(d.f.locator('#boundary2')));
      await d.at(5, () => d.point(d.f.locator('#boundary3')));
      await d.at(7, () => d.slide(SOURCES));
      await d.at(9, () => d.point(d.f.locator('.box').first()));
      await d.at(11, () => d.point(d.f.locator('.box').nth(1)));
      await d.at(13, () => d.slide(EVALUATION));
      await d.at(15, () => d.point(d.f.locator('table')));
      await d.at(19, () => d.hideCursor());
      await d.at(21, async () => { await d.slide(WARN); await d.focus('#w1'); });
      await d.at(25, () => d.focus('#w2'));
      await d.at(30, () => d.focus('#w3'));
      await d.at(33, () => d.hideCursor());
    },
  },
  {
    async prepare(d) { await d.slide(FLOW); },
    async act(d) {
      await d.at(1, () => d.point(d.f.locator('#discover')));
      await d.at(3, () => d.reveal('call'));
      await d.at(5, async () => { await d.reveal('flow-arrow'); await d.reveal('tool'); });
      await d.at(7, () => d.point(d.f.locator('#tool')));
      await d.at(9, () => d.slide(FIELDS));
      await d.at(11, () => d.point(d.f.locator('.field').nth(1)));
      await d.at(13, () => d.point(d.f.locator('.field').nth(3)));
      await d.at(15, () => d.slide(NEXT));
      await d.at(19, async () => { await d.landscape(); await d.slide(END); });
      await d.at(23, () => d.hideCursor());
    },
  },
];

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'scenes.json'), JSON.stringify(STORYBOARD, null, 2) + '\n');
await run(FFMPEG, ['-version'], true);
await run(FFPROBE, ['-version'], true);
await run('npm', ['run', 'build']);
const scratch = await mkdtemp(join(tmpdir(), 'may-contain-record-'));
let browser, server;
const stop = async () => { await browser?.close(); await server?.close(); };
process.once('SIGINT', async () => { await stop(); process.exit(130); });
process.once('SIGTERM', async () => { await stop(); process.exit(143); });
try {
  // Vite's preview API runs the same server as `vite preview`, with an explicit
  // close handle so cleanup never depends on platform-specific process signals.
  server = await preview({ root: ROOT, base: '/may-contain/', preview: { host: '127.0.0.1', port: PORT, strictPort: true } });
  if (!(await fetch(URL)).ok) throw new Error('Vite preview is not serving the built app');
  browser = await chromium.launch({ headless: true });
  const photo = await makePhoto(browser);
  const manifest = [];
  for (const spec of STORYBOARD.scenes.filter((s) => ONLY === null || s.number === ONLY)) {
    const name = `scene_${String(spec.number).padStart(2, '0')}`;
    console.log(`Recording ${name}: ${spec.seconds}s`);
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC', colorScheme: 'light', reducedMotion: 'no-preference', serviceWorkers: 'block', recordVideo: { dir: scratch, size: { width: 1920, height: 1080 } } });
    await context.addInitScript(() => { addEventListener('mousemove', (event) => { if (parent !== window) parent.postMessage({ type: 'demo-pointer', x: event.clientX, y: event.clientY }, location.origin); }); });
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      if (url === `${ORIGIN}/__demo_stage`) return route.fulfill({ contentType: 'text/html', body: stage() });
      if (/\/assets\/ocr-[^/]+\.js$/.test(url)) return route.fulfill({ contentType: 'application/javascript', body: `export async function readIngredientsPhoto(){return {editableText:${JSON.stringify(TEXT)},confidence:0}}` });
      if (!url.startsWith(ORIGIN + '/') && !url.startsWith('data:')) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(`${ORIGIN}/__demo_stage`);
    const frameElement = await page.locator('iframe').elementHandle();
    const frame = await frameElement.contentFrame();
    await frame.getByRole('button', { name: 'Try example text', exact: true }).waitFor();
    await frame.evaluate(() => document.fonts.ready);
    // Keep app fullscreen within the recorded iframe; use its existing dialog fallback.
    await frame.evaluate(() => { Element.prototype.requestFullscreen = undefined; });
    const d = new Director(page, frame);
    await SCENES[spec.number - 1].prepare(d);
    await wait(500);
    await page.evaluate(() => {
      const marker = document.createElement('div');
      marker.style.cssText = 'position:fixed;left:0;top:0;width:8px;height:8px;background:#ff00ff;z-index:2147483647';
      document.body.append(marker);
    });
    d.start = performance.now();
    await SCENES[spec.number - 1].act(d, photo);
    await d.at(spec.seconds);
    const elapsed = (performance.now() - d.start) / 1000;
    const video = page.video();
    await context.close();
    const raw = await video.path();
    const firstFrame = await firstMarkedFrame(raw);
    await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw, '-vf', `fps=30,trim=start_frame=${firstFrame},setpts=PTS-STARTPTS,drawbox=x=0:y=0:w=12:h=12:color=0xefede8:t=fill,tpad=stop_mode=clone:stop_duration=2,trim=duration=${spec.seconds},format=yuv420p`, '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-threads', '2', '-r', '30', '-fps_mode', 'cfr', '-t', String(spec.seconds), '-movflags', '+faststart', join(OUT, `${name}.mp4`)]);
    manifest.push({ scene: spec.number, seconds: spec.seconds, raw_start_frame_at_30fps: firstFrame, recorded_seconds: Number(elapsed.toFixed(3)) });
    console.log(`Saved ${name}.mp4`);
  }
  await writeFile(join(OUT, ONLY ? `recording_scene_${ONLY}.json` : 'recording.json'), JSON.stringify({ format: '1920x1080 / 30 fps / H.264 / silent', fixtures: STORYBOARD.notes, scenes: manifest }, null, 2) + '\n');
} finally {
  await stop();
  await rm(scratch, { recursive: true, force: true });
}
console.log('Recording complete. Vite preview and Chromium closed.');
