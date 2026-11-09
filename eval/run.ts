import { mkdir, writeFile, rm, mkdtemp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { ALLERGEN_IDS, LANGUAGES, OffClient, checkIngredients, type AllergenId, OffError } from '../src/index.js';
const dir = fileURLToPath(new URL('.', import.meta.url));
const tempRoot = join(dir, '.tmp'); await mkdir(tempRoot, { recursive: true });
const temp = await mkdtemp(join(tempRoot, 'run-'));
const client = new OffClient({ userAgent: process.env.OFF_USER_AGENT });
const comparable = ALLERGEN_IDS.slice(0, 14);
const tagMap: Record<string,string> = { sesame: 'en:sesame-seeds', sulphites: 'en:sulphur-dioxide-and-sulphites' };
const quotas: Record<string,number> = { en:20, fr:20, de:15, es:10, it:10, ja:10, ko:5, zh:10 };
type Row = { barcode: string; language: string; text: string; tags: string[] };
type Counts = { tp: number; fp: number; fn: number; tn: number };
const empty = (): Counts => ({ tp:0, fp:0, fn:0, tn:0 });
const rows: Row[] = []; const seen = new Set<string>(); const requests: {language:string;page:number;received:number;error?:string}[] = [];
const started = new Date().toISOString();
try {
  // At most three pages per language. Unique barcodes, one observed text language per product.
  for (const lang of LANGUAGES) {
    let accepted = 0;
    for (let page = 1; page <= 3 && accepted < quotas[lang] && rows.length < 100; page++) {
      let retries = 0;
      let products: Record<string,unknown>[];
      try {
        while (true) {
          try { products = await client.searchForEvaluation(lang, page); break; }
          catch (e) {
            if (!(e instanceof OffError) || ![429,503].includes(e.status ?? 0) || retries++ >= 1) throw e;
            requests.push({language:lang,page,received:0,error:e.message});
            console.log(`${lang}: service busy; respecting Retry-After before one retry`);
            await new Promise(resolve => setTimeout(resolve, Math.max(60_000,e.retryAfterMs ?? 60_000)));
          }
        }
                requests.push({ language:lang, page, received:products.length });
        await writeFile(join(temp, `${lang}-${page}.json`), JSON.stringify(products));
        for (const p of products) {
          const barcode = p.code; const text = p[`ingredients_text_${lang}`] ?? (p.lang === lang ? p.ingredients_text : undefined);
          const tags = p.allergens_tags;
          // Require a nonempty reference tag list. This is a selected positive-label sample, not prevalence data.
          if (typeof barcode !== 'string' || seen.has(barcode) || typeof text !== 'string' || !text.trim() || text.length > 50_000 || !Array.isArray(tags) || !tags.length || !tags.every(t => typeof t === 'string')) continue;
          rows.push({ barcode, language:lang, text, tags }); seen.add(barcode); accepted++;
          if (accepted >= quotas[lang] || rows.length >= 100) break;
        }
        if (!products.length) break;
      } catch (e) {
        requests.push({language:lang,page,received:0,error:e instanceof Error ? e.message : String(e)}); break;
      }
    }
    console.log(`${lang}: ${accepted} eligible unique products`);
  }
  const perItem = Object.fromEntries(comparable.map(id => [id,empty()]));
  const perLanguage: Record<string,Counts> = {}; const details: Record<string, Record<string,Counts>> = {};
  for (const row of rows) {
    const result = checkIngredients(row.text, comparable);
    perLanguage[row.language] ??= empty(); details[row.language] ??= Object.fromEntries(comparable.map(id => [id,empty()]));
    for (const r of result.results) {
      const actual = row.tags.includes(tagMap[r.allergen] ?? `en:${r.allergen}`);
      const predicted = r.status === 'contains'; const key = actual ? predicted ? 'tp' : 'fn' : predicted ? 'fp' : 'tn';
      perItem[r.allergen][key]++; perLanguage[row.language][key]++; details[row.language][r.allergen][key]++;
    }
  }
  const pct = (n:number,d:number) => d ? (n/d).toFixed(3) : 'N/A';
  const header = '| Group | Products | TP | FP | FN | Precision | Recall |\n|---|---:|---:|---:|---:|---:|---:|\n';
  const line = (label:string,n:number,c:Counts) => `| ${label} | ${n} | ${c.tp} | ${c.fp} | ${c.fn} | ${pct(c.tp,c.tp+c.fp)} | ${pct(c.tp,c.tp+c.fn)} |\n`;
  let md = `# Observed evaluation\n\nRun: ${started}. End: ${new Date().toISOString()}.\n\n**${rows.length} unique products measured**, from ${requests.length} search requests. Target: approximately 100; no synthetic or duplicated products fill missing quotas. Selected top-scanned OFF search pages with nonempty ingredient text and nonempty allergens_tags. One language per barcode. Language is the OFF field label, not verified language detection.\n\nReference: Open Food Facts contributors (ODbL 1.0). **allergens_tags are community-entered and/or derived annotations and can be wrong or incomplete.** Agreement with them is not clinical validation. OFF's own taxonomy/parser overlaps the dictionary source, so this benchmark is not independent and may overestimate performance. Empty tags were excluded, creating positive-label selection bias.\n\nOnly exact OFF category tags are compared. contains is positive; may_contain and not_found are negative for this experiment. Precaution and negation behavior is tested separately with synthetic text. Precision = TP/(TP+FP), recall = TP/(TP+FN); zero denominators are N/A. No threshold tuning was performed on these rows.\n\n## Per allergen\n\n`+header;
  for (const id of comparable) md += line(id,rows.length,perItem[id]);
  for (const id of ALLERGEN_IDS.slice(14)) md += `| ${id} | 0 | N/A | N/A | N/A | N/A | N/A |\n`;
  md += '\nWheat, shrimp, crab, walnut, cashew and buckwheat are not scored: the standard OFF reference categories do not provide reliable separate labels for these subtypes/Japanese-only categories. Parent tags must not be treated as proof of a particular subtype.\n\n## By language (micro-average over 14 comparable categories)\n\n'+header;
  for (const lang of LANGUAGES) md += line(lang,rows.filter(r=>r.language===lang).length,perLanguage[lang]??empty());
  md += '\n## Per language and allergen\n\n'+header;
  for (const lang of LANGUAGES) for (const id of comparable) md += line(`${lang} / ${id}`,rows.filter(r=>r.language===lang).length,details[lang]?.[id]??empty());
  md += '\n## Acquisition log\n\n| Language | Page | Returned products | Error |\n|---|---:|---:|---|\n';
  for (const r of requests) md += `| ${r.language} | ${r.page} | ${r.received} | ${(r.error??'').replace(/\|/g,'/')} |\n`;
  md += '\nNo product-level data are distributed. Temporary API responses are removed in finally, even on failure. Re-running may select different products as OFF changes. Only aggregate counts and a SHA-256 of the measured corpus remain.\n';
  const digest = createHash('sha256').update(JSON.stringify(rows)).digest('hex'); md += `\nCorpus SHA-256: \`${digest}\`.\n`;
  await writeFile(join(dir, 'RESULTS.md'),md);
  await writeFile(join(dir, 'metrics.json'),JSON.stringify({started,products:rows.length,corpusSha256:digest,perItem,perLanguage,details,requests},null,2)+'\n');
  console.log(`Measured ${rows.length} products; wrote eval/RESULTS.md.`);
} finally { await rm(temp,{recursive:true,force:true}); }
