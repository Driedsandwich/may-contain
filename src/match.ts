import { ALLERGEN_IDS, lexicon, type AllergenId, type Term } from './lexicon/index.js';
export const SAFETY_NOTICE = "Not found does not mean safe. Always check the package and ask staff. If you have a severe allergy, follow your doctor's plan.";
export type Status = 'contains' | 'may_contain' | 'not_found';
export interface Evidence {
  allergen: AllergenId; status: Exclude<Status, 'not_found'>;
  start: number; end: number; text: string; term: string; source: string;
  caution?: { text: string; start: number; end: number };
}
export interface CheckResult {
  status: Status; results: { allergen: AllergenId; status: Status; matches: Evidence[] }[];
  notice: string; warnings: string[]; offsetUnit: 'UTF-16';
}
/** Keep a map to original UTF-16 offsets, including combining marks, emoji and ligatures. */
export function normalizeWithOffsets(input: string) {
  let text = ''; const starts: number[] = []; const ends: number[] = [];
  for (const { segment, index } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(input)) {
    // NFKC first preserves Japanese voicing and composes Korean jamo. Strip Latin accents only.
    const folded = segment.normalize('NFKC').toLowerCase()
      .replace(/\p{Script=Latin}/gu, c => c.normalize('NFD').replace(/\p{M}/gu, ''))
      .replace(/ß/g, 'ss').replace(/[’‘]/g, "'");
    for (const c of folded) {
      const value = /\s/u.test(c) ? ' ' : c;
      if (value === ' ' && text.endsWith(' ')) { ends[ends.length - 1] = index + segment.length; continue; }
      text += value;
      for (let j = 0; j < value.length; j++) { starts.push(index); ends.push(index + segment.length); }
    }
  }
  return { text, starts, ends };
}
const fold = (s: string) => normalizeWithOffsets(s).text;
const compiled = lexicon.map(a => ({ id: a.id, terms: a.terms.map(term => ({ term, text: fold(term.text) })) }));
// A bounded rule grammar, not general-purpose natural language understanding.
const precaution = /\b(?:may\s+contain|traces?\s+of|(?:produced|manufactured|made|processed)\s+in\s+(?:a\s+)?(?:facility|factory)|(?:made|produced|manufactured)\s+on\s+shared\s+equipment|peut\s+contenir|traces?\s+(?:de|d')|kann\s+(?:spuren|enthalten)|spuren\s+von|puede\s+contener|trazas\s+de|puo\s+contenere|tracce\s+di)\b|同じ工場|同一(?:の)?(?:工場|ライン)|本品製造工場|可能含有|可能含|可能包含|같은\s*(?:공장|시설)|혼입될\s*수/gu;
const negation = /\b(?:free\s+from|free\s+of|without|does\s+not\s+contain|contains\s+no|sans|ohne|sin|senza)\b|不含|未使用/gu;
const positive = /\b(?:ingredients?|contains?|contient|zutaten|enth[aä]lt|ingredienti|ingredientes|contiene|but|mais|aber)\s*:?|原材料(?:名)?\s*[:：]|ただし/gu;
const latinWord = (s: string) => /[\p{Script=Latin}\p{N}]/u.test(s);
function boundary(text: string, start: number, end: number, term: string) {
  // CJK/ Hangul need substring matching for compounds and particles.
  return !(latinWord(term[0]) && latinWord(text[start - 1] ?? '')) &&
    !(latinWord(term.at(-1)!) && latinWord(text[end] ?? ''));
}
function latest(re: RegExp, s: string) { return [...s.matchAll(re)].at(-1); }
function classify(text: string, start: number, end: number): { negated: boolean; cautionStart?: number; clauseEnd: number } {
  // Newlines are OCR wraps, not sentence boundaries. Semicolon/sentence punctuation ends a scope.
  const left = text.slice(0, start); const boundaryAt = Math.max(...['.', ';', '。', '!', '?'].map(c => left.lastIndexOf(c))) + 1;
  const tail = text.slice(end); const stop = tail.search(/[.;。!?]/u);
  const clauseEnd = stop < 0 ? text.length : end + stop;
  const prefix = text.slice(boundaryAt, start);
  const p = latest(precaution, prefix); const n = latest(negation, prefix); const a = latest(positive, prefix);
  // A "contains" token within "may contain" must not reset the precaution scope.
  const reset = a && (!p || a.index! >= p.index! + p[0].length) && (!n || a.index! >= n.index! + n[0].length) ? a.index! : -1;
  const pIndex = p && p.index! > reset ? p.index! : -1;
  const nIndex = n && n.index! > reset ? n.index! : -1;
  const suffix = text.slice(end, clauseEnd);
  // Suffix negation applies to a coordinated allergen list, not an arbitrary later ingredient.
  const jpNeg = /^(?:[\s、・,と及び]*(?:乳|卵|小麦|落花生|大豆|えび|かに|くるみ|そば))*\s*(?:を含まない|を含みません|不使用|未使用|なし)/u.test(suffix);
  const suffixFree = /^\s*[- ]\s*free\b/u.test(suffix);
  return { negated: nIndex > pIndex || jpNeg || suffixFree, cautionStart: pIndex >= 0 ? boundaryAt + pIndex : undefined, clauseEnd };
}
function statusOf(matches: Evidence[]): Status { return matches.some(m => m.status === 'contains') ? 'contains' : matches.length ? 'may_contain' : 'not_found'; }
export function checkIngredients(input: string, registered: readonly AllergenId[]): CheckResult {
  if (typeof input !== 'string' || !input.trim()) throw new Error('Ingredients text is required; missing data is not a negative result.');
  if (input.length > 50_000) throw new Error('Ingredients text exceeds 50,000 UTF-16 code units.');
  if (!Array.isArray(registered) || !registered.length || registered.some(id => !ALLERGEN_IDS.includes(id))) throw new Error('Provide known allergen IDs from ALLERGEN_IDS.');
  const normalized = normalizeWithOffsets(input); const { text, starts, ends } = normalized;
  const results = [...new Set(registered)].map(allergen => {
    const candidates: Evidence[] = [];
    for (const { term, text: token } of compiled.find(a => a.id === allergen)!.terms) {
      for (let start = text.indexOf(token); start !== -1; start = text.indexOf(token, start + 1)) {
        const end = start + token.length;
        if (!boundary(text, start, end, token)) continue;
        // Korean buckwheat 메밀 contains the wheat syllable 밀; it is a distinct food.
        if ((allergen === 'wheat' || allergen === 'gluten') && token === '밀' && text[start - 1] === '메') continue;
        // These strings are not evidence of milk merely because they contain 乳.
        if (allergen === 'milk' && token === '乳' && /^(?:乳化|乳酸|乳鉢)/u.test(text.slice(start))) continue;
        const c = classify(text, start, end); if (c.negated) continue;
        const originalStart = starts[start], originalEnd = ends[end - 1];
        candidates.push({ allergen, status: c.cautionStart === undefined ? 'contains' : 'may_contain', start: originalStart, end: originalEnd, text: input.slice(originalStart, originalEnd), term: term.text, source: term.source,
          ...(c.cautionStart === undefined ? {} : { caution: { start: starts[c.cautionStart], end: ends[c.clauseEnd - 1], text: input.slice(starts[c.cautionStart], ends[c.clauseEnd - 1]) } }) });
      }
    }
    // Prefer the longest evidence at each overlapping position per allergen.
    candidates.sort((a,b) => a.start - b.start || b.end - a.end);
    const matches = candidates.filter((m,i) => !candidates.slice(0,i).some(p => p.start <= m.start && p.end >= m.end));
    return { allergen, status: statusOf(matches), matches };
  });
  return { status: statusOf(results.flatMap(r => r.matches)), results, notice: SAFETY_NOTICE,
    warnings: ['Rule-based text evidence only; absence, negation and OCR are not proof of safety.'], offsetUnit: 'UTF-16' };
}
