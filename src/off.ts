import { LANGUAGES } from './lexicon/index.js';
import { SAFETY_NOTICE } from './match.js';
export const DEFAULT_USER_AGENT = 'AllergenTravelCore/0.1.0 (local student hackathon prototype)';
export const PRODUCT_FIELDS = ['code', 'product_name', 'lang', 'ingredients_text', ...LANGUAGES.map(l => `ingredients_text_${l}`), 'allergens_tags', 'traces_tags'];
export interface Product {
  barcode: string; name?: string; primaryLanguage?: string;
  ingredientsText: string | null; ingredientsByLanguage: Record<string, string>;
  allergensTags: string[] | null; tracesTags: string[] | null;
  source: string; attribution: string; notice: string;
}
export class OffError extends Error {
  constructor(message: string, public status?: number, public retryAfterMs?: number) { super(message); this.name = 'OffError'; }
}
/** Per-process/per-browser-tab queue. Deployments sharing an IP must coordinate globally. */
export class RateGate {
  private next = 0;
  constructor(private readonly intervalMs: number) {}
  defer(ms: number) { this.next = Math.max(this.next, Date.now() + ms); }
  async wait() {
    const slot = Math.max(Date.now(), this.next); this.next = slot + this.intervalMs;
    const delay = slot - Date.now(); if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
    // A previous request can have received Retry-After while this call waited.
  }
}
const gates = { product: new RateGate(4_100), search: new RateGate(6_100) };
let cooldownUntil = 0;
export interface OffOptions { userAgent?: string; fetch?: typeof fetch; timeoutMs?: number }
export class OffClient {
  private readonly fetcher: typeof fetch; private readonly userAgent: string;
  constructor(private readonly options: OffOptions = {}) {
    this.fetcher = options.fetch ?? globalThis.fetch; this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    if (!this.userAgent.trim() || /[\r\n]/.test(this.userAgent)) throw new Error('A valid identifying User-Agent is required.');
  }
  private async get(path: string, params: URLSearchParams, kind: keyof typeof gates): Promise<unknown> {
    do {
      const delay = cooldownUntil - Date.now();
      if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
      await gates[kind].wait();
    } while (Date.now() < cooldownUntil);
    const url = new URL(path, 'https://world.openfoodfacts.org'); url.search = params.toString();
    const headers: Record<string,string> = { Accept: 'application/json' };
    // Chrome does not reliably permit replacing User-Agent. OFF allows X-User-Agent in CORS.
    headers[typeof window === 'undefined' ? 'User-Agent' : 'X-User-Agent'] = this.userAgent;
    let response: Response;
    try { response = await this.fetcher(url, { headers, signal: AbortSignal.timeout(this.options.timeoutMs ?? 25_000), credentials: 'omit' }); }
    catch { throw new OffError('Open Food Facts network request failed or timed out.'); }
    if (!response.ok) {
      const raw = response.headers.get('retry-after');
      const delay = raw === null ? 60_000 : /^\d+$/.test(raw) ? Number(raw) * 1000 : Math.max(0, Date.parse(raw) - Date.now());
      const retryAfterMs = Number.isFinite(delay) ? delay : 60_000;
      if (response.status === 429 || response.status === 503) cooldownUntil = Math.max(cooldownUntil, Date.now() + retryAfterMs);
      throw new OffError(`Open Food Facts returned HTTP ${response.status}.`, response.status, retryAfterMs);
    }
    try { return await response.json(); } catch { throw new OffError('Invalid JSON from Open Food Facts.'); }
  }
  async lookupBarcode(barcode: string): Promise<Product | null> {
    if (!/^\d{8,14}$/.test(barcode)) throw new Error('Barcode must contain 8–14 ASCII digits.');
    const data = await this.get(`/api/v2/product/${barcode}.json`, new URLSearchParams({ fields: PRODUCT_FIELDS.join(',') }), 'product') as { status?: number; product?: unknown };
    if (data?.status === 0) return null;
    if (data?.status !== 1 || !data.product || typeof data.product !== 'object') throw new OffError('Unexpected OFF product response.');
    return parseProduct(data.product as Record<string, unknown>, barcode);
  }
  /** Evaluation-only read query; page_size 100, throttled below 10 requests/minute. */
  async searchForEvaluation(language: string, page = 1): Promise<Record<string, unknown>[]> {
    if (!(LANGUAGES as readonly string[]).includes(language) || !Number.isInteger(page) || page < 1) throw new Error('Invalid evaluation query.');
    const params = new URLSearchParams({ languages_tags: `en:${({ en:'english', ja:'japanese', fr:'french', de:'german', es:'spanish', it:'italian', ko:'korean', zh:'chinese' } as Record<string,string>)[language]}`, page: String(page), page_size: '100', sort_by: 'unique_scans_n', fields: PRODUCT_FIELDS.join(',') });
    const data = await this.get('/api/v2/search', params, 'search') as { products?: unknown };
    if (!Array.isArray(data?.products)) throw new OffError('Unexpected OFF search response.');
    return data.products.filter((p): p is Record<string,unknown> => p !== null && typeof p === 'object');
  }
}
export function parseProduct(p: Record<string, unknown>, barcode: string): Product {
  const byLanguage: Record<string,string> = {};
  for (const lang of LANGUAGES) { const s = p[`ingredients_text_${lang}`]; if (typeof s === 'string' && s.trim()) byLanguage[lang] = s; }
  const tags = (v: unknown): string[] | null => Array.isArray(v) && v.every(t => typeof t === 'string') ? v : null;
  return { barcode, ...(typeof p.product_name === 'string' ? { name: p.product_name } : {}), ...(typeof p.lang === 'string' ? { primaryLanguage: p.lang } : {}),
    ingredientsText: typeof p.ingredients_text === 'string' && p.ingredients_text.trim() ? p.ingredients_text : null,
    ingredientsByLanguage: byLanguage, allergensTags: tags(p.allergens_tags), tracesTags: tags(p.traces_tags),
    source: `https://world.openfoodfacts.org/product/${barcode}`, attribution: 'Open Food Facts contributors — ODbL 1.0', notice: SAFETY_NOTICE };
}
const defaultClient = new OffClient();
export const lookupBarcode = (barcode: string) => defaultClient.lookupBarcode(barcode);
