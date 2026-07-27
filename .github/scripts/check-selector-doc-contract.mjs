import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const docsRoot = fileURLToPath(new URL('../..', import.meta.url));
const page = readFileSync(`${docsRoot}/mcp-tool-selectors.mdx`, 'utf8');

assert.match(page, /hidden: true/);
assert.match(page, /not available in the public service yet/i);

assert.match(page, /https:\/\/mcp\.firecrawl\.dev\/v2\/mcp\?tools=<selector>/);
assert.match(page, /`@core-v1` is exactly `firecrawl_search`, `firecrawl_scrape`, and `firecrawl_parse`/);
assert.match(page, /Server instructions are static and selector-agnostic/);

assert.match(page, /ordinary default session without selector filtering/);
assert.match(page, /raw comma-separated list before deduplicating entries/);
assert.match(page, /Whitespace is not trimmed/);
assert.match(page, /normal MCP tool result \(HTTP 200\)/);

assert.match(page, /`\/v2\/mcp-oauth`/);
assert.match(page, /`\/v2\/mcp-search`/);
assert.match(page, /`TOOL_SELECTOR_UNSUPPORTED` \(HTTP 400\)/);
assert.doesNotMatch(page, /AX no-drop evaluation/i);
assert.doesNotMatch(page, /owner approval/i);

console.log('selector documentation contract: ok');
