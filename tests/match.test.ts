import { describe, expect, it } from 'vitest';
import { checkIngredients, normalizeWithOffsets, SAFETY_NOTICE } from '../src/match.js';
import { lexicon, LANGUAGES, REGULATORY_SETS, type AllergenId } from '../src/lexicon/index.js';
const status = (text:string, id:AllergenId) => checkIngredients(text,[id]).status;
describe('contains and language coverage', () => {
  it.each([
    ['Milk, 卵, blé', ['milk','eggs','wheat']],
    ['lait, Milch, latte, leche', ['milk']],
    ['우유, 대두, 캐슈넛', ['milk','soybeans','cashew']],
    ['奶, 小麦, 腰果', ['milk','wheat','cashew']],
    ['whey, casein, lactose, butter', ['milk']],
    ['カゼイン、乳清、バター', ['milk']],
    ['caséine, lactosérum', ['milk']],
    ['ＭＩＬＫ、ﾊﾞﾀｰ', ['milk']],
    ['chocolate (sugar, (milk powder))', ['milk']],
  ] as [string,AllergenId[]][])('%s', (text,ids) => {
    expect(checkIngredients(text,ids).results.every(r=>r.status==='contains')).toBe(true);
  });
  it.each(['may contain milk','traces of milk','produced in a facility that processes milk','manufactured in a factory handling milk','made on shared equipment with milk','peut contenir du lait','traces de lait','kann Spuren von Milch enthalten','puede contener leche','può contenere latte','同じ工場で牛乳を使用','同一ラインで卵を使用','可能含有奶'])('precaution: %s', text => {
    expect(checkIngredients(text,['milk','eggs']).status).toBe('may_contain');
  });
  it.each(['free from milk','milk-free','without milk','does not contain milk','contains no milk','sans lait','ohne Milch','sin leche','senza latte','牛乳を含まない','卵を含みません','卵・乳を含まない','不含奶'])('negation: %s', text => {
    expect(checkIngredients(text,['milk','eggs']).status).toBe('not_found');
  });
  it('does not negate a later positive declaration',()=> {
    expect(status('free from milk. Ingredients: milk powder.', 'milk')).toBe('contains');
    expect(status('sans lait; contient lait', 'milk')).toBe('contains');
  });
  it('does not negate precaution after a free-from claim',()=>expect(status('milk-free. May contain milk.', 'milk')).toBe('may_contain'));
  it('contains takes precedence while keeping both pieces of evidence',()=> {
    const r=checkIngredients('Milk. May contain milk.', ['milk']);
    expect(r.status).toBe('contains'); expect(r.results[0].matches.map(x=>x.status)).toEqual(['contains','may_contain']);
  });
  it('resets precaution at sentence boundary and explicit ingredients heading',()=> {
    expect(status('May contain peanuts. Ingredients: milk.', 'milk')).toBe('contains');
    expect(status('May contain peanuts; milk', 'milk')).toBe('contains');
    expect(status('May contain peanuts\nIngredients: milk', 'milk')).toBe('contains');
  });
  it('keeps caution across OCR wraps and a coordinated list',()=> {
    const r=checkIngredients('May contain\nmilk,\neggs and peanuts.', ['milk','eggs','peanuts']);
    expect(r.results.map(x=>x.status)).toEqual(['may_contain','may_contain','may_contain']);
    expect(r.results[0].matches[0].caution?.text).toContain('May contain');
  });
  it('has original UTF-16 offsets for emoji, accents, width and parentheses',()=> {
    const s='🧳 (ＣＡＳÉＩＮ) / caséine / ﾊﾞﾀｰ / cafe\u0301 milk';
    const matches=checkIngredients(s,['milk']).results[0].matches;
    expect(matches.length).toBeGreaterThanOrEqual(4);
    for(const m of matches) expect(s.slice(m.start,m.end)).toBe(m.text);
    expect(matches[0].start).toBe(4); expect(matches[0].text).toBe('ＣＡＳÉＩＮ');
  });
  it('preserves accent and width normalization mapping',()=> {
    const n=normalizeWithOffsets('e\u0301 Ｍ ﾊﾞ');
    expect(n.text).toBe('e m バ'); expect(n.ends[0]).toBe(2);
  });
  it('avoids Latin substring false positives',()=>expect(checkIngredients('eggplant, milkweed, peanutty', ['eggs','milk','peanuts']).status).toBe('not_found'));
  it('keeps buckwheat separate from wheat/gluten',()=> {
    const r=checkIngredients('buckwheat, そば, 메밀',['gluten','wheat','buckwheat']);
    expect(r.results.map(x=>x.status)).toEqual(['not_found','not_found','contains']);
  });
  it('does not mistake emulsifier/lactic acid for milk',()=>expect(status('乳化剤、乳酸', 'milk')).toBe('not_found'));
  it('always attaches the safety notice',()=>expect(checkIngredients('water',['milk']).notice).toBe(SAFETY_NOTICE));
  it('rejects empty or oversized text, unknown IDs and empty registrations',()=> {
    expect(()=>checkIngredients('', ['milk'])).toThrow();
    expect(()=>checkIngredients('x'.repeat(50_001), ['milk'])).toThrow();
    expect(()=>checkIngredients('milk', ['nope' as AllergenId])).toThrow();
    expect(()=>checkIngredients('milk', [])).toThrow();
  });
});
describe('source and regulatory invariants',()=> {
  it('every target has sourced terms in all eight languages',()=> {
    expect(lexicon).toHaveLength(20);
    for(const a of lexicon) for(const l of LANGUAGES) {
      expect(a.terms.some(t=>t.language===l),`${a.id}/${l}`).toBe(true);
      for(const t of a.terms) { expect(t.source).toMatch(/^https:\/\//); expect(t.license).toBeTruthy(); }
    }
  });
  it('keeps EU14, US9 and current Japanese9 sets',()=> {
    expect(REGULATORY_SETS.EU).toHaveLength(14); expect(REGULATORY_SETS.US).toHaveLength(9); expect(REGULATORY_SETS.JP).toHaveLength(9);
    expect(lexicon.find(a=>a.id==='cashew')?.regulations.JP.status).toBe('mandatory');
    expect(lexicon.find(a=>a.id==='soybeans')?.regulations.JP.status).toBe('recommended');
    expect(lexicon.find(a=>a.id==='nuts')?.regulations.JP.status).toBe('partial');
  });
});
