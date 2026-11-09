# Validation record

Date: 2026-11-09. Runtime: Node.js 26.13.0.

- `npm run build`: passed (TypeScript 5.8.3, strict).
- `npm test`: 57 passed across 3 files (49 matcher/dictionary, 7 OFF adapter, 1 MCP stdio integration). Network responses in adapter tests are mocked.
- `npm run audit:lexicon`: 1,561 OFF term records matched the frozen source lines and SHA-256 hashes; 12 additional official/Wikidata records were manually checked. All 20 targets have terms in all 8 languages.
- `npm run eval`: 90 unique products, 7 languages; 12 real search requests including retries. See eval/RESULTS.md. Chinese acquisition failed with HTTP 503 on both attempts. Product-level temporary files were removed.
- CORS: real GET returned 200; OPTIONS requesting x-user-agent returned 204, with permissive origin and the required header allowance. No browser was used.
- OCR: usage example only, as requested; browser/image recognition was not run.
- No external writes, messages, publishing, or Git push were performed.

This is a prototype and an agreement test against imperfect OFF labels, not clinical validation. Six subtype/Japan-specific targets lack comparable OFF reference tags and are explicitly unscored.
