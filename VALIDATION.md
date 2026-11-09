# Validation record

Date: 2026-11-09. Runtime used: Node.js 26.13.0. Supported package engine: Node.js 22.12 or newer.

## Web application

- `npm run build`: passed. Strict TypeScript checks cover the original core/MCP and the React application. Vite emits the static site to `dist/site/` with `/may-contain/` as its base. OCR is loaded separately; dictionary and React bundles are split. No chunk-size warnings remain.
- `npm test`: **60 passed** in 4 files: all original **57** checks (49 matcher/dictionary, 7 OFF adapter, 1 MCP stdio integration), plus 3 fixed-card and example-translation checks.
- `npm run test:ui`: **13 passed**, headless Chromium. Covers 390px and desktop layouts, all eight card languages, exact sample highlights, profile save/delete, keyboard focus restoration, offline text, unsupported/unreadable input, mocked OFF retrieval and three error paths, camera fallback, a fake camera with stream release, OCR review gating and unreadable OCR, and Fullscreen API fallback.
- After final landscape-only styling, the affected mobile/fullscreen checks were rerun successfully; screenshots were refreshed. Desktop and mobile Axe WCAG A/AA checks, plus the profile dialog audit, reported no violations. Automated audits do not replace assistive-technology testing.
- The 320px all-allergen case and the 390px default case have no horizontal document overflow. The landscape card keeps the complete safety notice in its normal content flow; longer selections can scroll.
- `node scripts/verify-ocr.mjs`: passed with real Tesseract worker/model execution on a generated, non-personal English label image. It read `Ingredients: oats, milk. May contain peanuts.` and produced Contains / May contain / Not found in this text for the example selection. Observed page requests were GET-only. This is an integration check on one clear synthetic image, not an OCR accuracy benchmark.
- A real browser OFF lookup returned ingredient text successfully. No product-level response or screenshot was retained. Automated OFF tests otherwise use clearly synthetic fixtures.
- `npm run dev`: started and rendered the app successfully. `npm run preview`: served the built app successfully. The bundled evaluation document returned HTTP 200 under the configured base path.
- Official GitHub action version tags were checked against their commit SHAs. The Pages workflow was prepared but not executed on GitHub. Its deployment job is disabled for private repositories.
- The only change to existing core behavior is binding default native `fetch` to `globalThis` in `src/off.ts`. Headless Chromium reproduced an illegal-invocation error without this binding; browser OFF tests now pass. Matching, dictionary, OCR and MCP semantics were retained.
- No external writes, messages, publication, Git commit or Git push were performed. Browser interaction used local headless Playwright, not an extension or interactive browser tool.

## Limits and outstanding checks

- Physical phone cameras, Safari/iOS, Firefox, screen readers and real-world blurred/multilingual package photos have not been tested. Camera support remains browser-dependent, with number input always available.
- Staff-card phrases are fixed and editable, but independent native-speaker review is pending for all eight languages. See `public/card-review.md` for the review process.
- General ingredient translation is not supplied. Only the explicitly labelled fictional examples have fixed English translations; other non-English labels retain their original text with an unavailable-translation message.
- An initial offline page visit and uncached OCR assets require connectivity. Already-loaded text matching works offline. No service worker or automatic photo/text persistence is included.
- `npm audit` reported 4 findings in the pre-existing Vitest/mocker/tinypool and Zod dependency families. Their core dependency versions were retained; a separate dependency migration was not performed. These Node test/schema packages are not imported by the static frontend.
- The GitHub Pages deployment, repository visibility change and independent language review remain for the owner; no live deployment is claimed.

## Existing core evidence (retained, not rerun for this UI task)

- Lexicon audit: 1,561 OFF term records matched frozen source lines and SHA-256 hashes; 12 additional official/Wikidata records were manually checked. All 20 targets have terms in all 8 languages.
- Existing evaluation: 90 unique products, 7 languages, 12 real search requests including retries. See `eval/RESULTS.md`. Chinese acquisition failed with HTTP 503 on both attempts. Product-level temporary files were removed by the original run.
- Previous HTTP CORS probes returned GET 200 and OPTIONS 204 allowing `x-user-agent`. The new browser integration also exercises the actual native fetch call.

This remains a prototype and an agreement test against imperfect OFF annotations, not clinical validation. Six subtype/Japan-specific targets lack comparable OFF reference tags and remain explicitly unscored.
