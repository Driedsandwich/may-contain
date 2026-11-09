import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { lexicon } from '../src/lexicon/index.js';
const meta=JSON.parse(await readFile(new URL('../src/lexicon/sources.json',import.meta.url),'utf8'));
let checked=0, other=0;
for(const file of ['allergens.txt','ingredients.txt']) {
  const path=file==='allergens.txt' ? 'taxonomies/allergens.txt' : 'taxonomies/food/ingredients.txt';
  const response=await fetch(`https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/${meta.offCommit}/${path}`,{signal:AbortSignal.timeout(30_000)});
  if(!response.ok) throw new Error(`Cannot read source: HTTP ${response.status}`);
  const raw=await response.text();
  const expected=meta.snapshots.find((x:{file:string})=>x.file===file).sha256;
  if(createHash('sha256').update(raw).digest('hex')!==expected) throw new Error(`Snapshot hash mismatch: ${file}`);
  const lines=raw.split('\n');
  for(const a of lexicon) for(const t of a.terms) {
    if(!t.source.includes(`/${path}#L`)) continue;
    const line=Number(t.source.split('#L')[1]);
    if(!lines[line-1]?.startsWith(`${t.language}: `) || !lines[line-1].slice(4).split(/[,，]/).map(s=>s.trim()).includes(t.text)) throw new Error(`Source mismatch: ${a.id}/${t.text}/${line}`);
    checked++;
  }
}
for(const a of lexicon) for(const t of a.terms) if(!t.source.startsWith('https://github.com/openfoodfacts/')) other++;
console.log(`${checked} OFF term records verified against exact frozen source lines and SHA-256 hashes; ${other} government/Wikidata records were manually verified. This checks transcription, not medical correctness.`);
