import { expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
it('MCP stdio lists tools and checks ingredients through the official client',async()=> {
  const transport=new StdioClientTransport({command:process.execPath,args:['--import','tsx',fileURLToPath(new URL('../mcp/server.ts',import.meta.url))],stderr:'pipe',env:{TMPDIR:tmpdir()}});
  const client=new Client({name:'local-test',version:'1.0'});
  try {
    await client.connect(transport);
    expect((await client.listTools()).tools.map(t=>t.name).sort()).toEqual(['check_ingredients','lookup_barcode']);
    const result=await client.callTool({name:'check_ingredients',arguments:{text:'Peut contenir du lait.',allergens:['milk']}});
    expect(result.isError).not.toBe(true);
    const r=result.structuredContent as {status:string;notice:string;results:{matches:{start:number;end:number}[]}[]};
    expect(r.status).toBe('may_contain');expect(r.notice).toContain('Not found does not mean safe');
    expect('Peut contenir du lait.'.slice(r.results[0].matches[0].start,r.results[0].matches[0].end)).toBe('lait');
    const invalid=await client.callTool({name:'check_ingredients',arguments:{text:'milk',allergens:['invalid']}});
    expect(invalid.isError).toBe(true);
    const badBarcode=await client.callTool({name:'lookup_barcode',arguments:{barcode:'bad'}});
    expect(badBarcode.isError).toBe(true);
  } finally { await client.close(); await transport.close(); }
},20_000);
