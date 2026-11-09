import { afterEach, describe, expect, it, vi } from 'vitest';
import { OffClient, OffError, parseProduct, RateGate } from '../src/off.js';
afterEach(()=>vi.useRealTimers());
async function finish<T>(promise:Promise<T>) { await vi.runAllTimersAsync(); return promise; }
describe('OFF read adapter',()=> {
  it('preserves missing data as null and languages separately',()=> {
    const p=parseProduct({ingredients_text_fr:'lait',ingredients_text_ja:'牛乳',allergens_tags:['en:milk']},'12345678');
    expect(p.ingredientsByLanguage).toEqual({fr:'lait',ja:'牛乳'}); expect(p.ingredientsText).toBeNull(); expect(p.tracesTags).toBeNull();
  });
  it('serializes rate reservations for concurrent callers',async()=> {
    vi.useFakeTimers(); const gate=new RateGate(4100); const times:number[]=[];
    const work=Promise.all([0,1,2].map(async()=>{await gate.wait();times.push(Date.now());}));
    await finish(work); expect(times[1]-times[0]).toBe(4100);expect(times[2]-times[1]).toBe(4100);
  });
  it('fetches only requested fields and identifies the application',async()=> {
    vi.useFakeTimers(); const f=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({status:1,product:{ingredients_text:'milk',allergens_tags:['en:milk'],traces_tags:['en:nuts']}})));
    const p=await finish(new OffClient({fetch:f,userAgent:'Test/1.0'}).lookupBarcode('12345678'));
    expect(p?.allergensTags).toEqual(['en:milk']); expect(p?.tracesTags).toEqual(['en:nuts']);
    expect(String(f.mock.calls[0][0])).toContain('/api/v2/product/12345678.json?fields=');
    expect(f.mock.calls[0][1]?.headers).toMatchObject({'User-Agent':'Test/1.0'});
  });
  it('returns null only for missing product status',async()=> {
    vi.useFakeTimers(); const f=vi.fn<typeof fetch>().mockResolvedValue(new Response('{"status":0}'));
    expect(await finish(new OffClient({fetch:f}).lookupBarcode('12345678'))).toBeNull();
  });
  it('validates barcode before making a request',async()=> {
    const f=vi.fn<typeof fetch>(); await expect(new OffClient({fetch:f}).lookupBarcode('../bad')).rejects.toThrow(); expect(f).not.toHaveBeenCalled();
  });
  it('network failures are errors, not negative allergen results',async()=> {
    vi.useFakeTimers(); const f=vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));
    const assertion=expect(new OffClient({fetch:f}).lookupBarcode('12345678')).rejects.toThrow(OffError); await finish(assertion);
  });
  it('honors rate-limit failures without automatic retry',async()=> {
    vi.useFakeTimers(); const f=vi.fn<typeof fetch>().mockResolvedValue(new Response('',{status:429,headers:{'Retry-After':'60'}}));
    const assertion=expect(new OffClient({fetch:f}).lookupBarcode('12345678')).rejects.toMatchObject({status:429,retryAfterMs:60000});
    await finish(assertion);expect(f).toHaveBeenCalledTimes(1);
  });
});
