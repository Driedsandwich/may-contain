import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ALLERGEN_IDS, checkIngredients, OffClient, SAFETY_NOTICE } from '../src/index.js';
const server = new McpServer({ name: 'allergen-travel-core', version: '0.1.0' });
const off = new OffClient({ userAgent: process.env.OFF_USER_AGENT });
const reply = (value: object) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }], structuredContent: value as Record<string,unknown> });
const error = (e: unknown) => ({ isError: true, content: [{ type: 'text' as const, text: JSON.stringify({ error: e instanceof Error ? e.message : 'Request failed', notice: SAFETY_NOTICE }) }] });
server.registerTool('check_ingredients', {
  description: 'Match ingredient text against registered allergen IDs. Text evidence only: never infer that food is safe. Offsets are UTF-16 [start,end).',
  inputSchema: { text: z.string().min(1).max(50_000), allergens: z.array(z.enum(ALLERGEN_IDS)).min(1).max(20) },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
}, async ({ text, allergens }) => { try { return reply(checkIngredients(text, allergens)); } catch (e) { return error(e); } });
server.registerTool('lookup_barcode', {
  description: 'Read Open Food Facts ingredients in eight languages and reported allergen/trace tags. Missing product is not evidence of safety. Does not publish or upload.',
  inputSchema: { barcode: z.string().regex(/^\d{8,14}$/) },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
}, async ({ barcode }) => { try { const product = await off.lookupBarcode(barcode); return reply({ found: product !== null, product, notice: SAFETY_NOTICE }); } catch (e) { return error(e); } });
await server.connect(new StdioServerTransport());
