import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const docsRoot = fileURLToPath(new URL('../..', import.meta.url));
const page = readFileSync(`${docsRoot}/mcp-server.mdx`, 'utf8');

assert.match(page, /not available in the public service yet/i);
assert.match(page, /AX no-drop evaluation/);
assert.match(page, /owner approval/);

assert.match(page, /https:\/\/mcp\.firecrawl\.dev\/v2\/mcp\?tools=<selector>/);
assert.match(page, /`@core-v1` is exactly `firecrawl_search`, `firecrawl_scrape`, and `firecrawl_parse`/);
assert.match(page, /selector-safe instructions/);
assert.match(page, /do not direct calls to an omitted feedback, crawl, or extraction tool/);

assert.match(page, /ordinary default session with no selector-based filtering/);
assert.match(page, /limited to selector behavior and the endpoint's ordinary tool set/);
assert.match(page, /not a claim that every MCP metadata field is byte-identical/);
assert.match(page, /`anthropic\/alwaysLoad` metadata changes.*AX no-drop gate/s);

assert.match(page, /`\/v2\/mcp-oauth`/);
assert.match(page, /`\/v2\/mcp-search`/);
assert.match(page, /`TOOL_SELECTOR_UNSUPPORTED` \(HTTP 400\)/);
assert.doesNotMatch(page, /Selectors will be inert/i);
assert.doesNotMatch(page, /will not narrow or widen their tool lists/i);

console.log('selector documentation contract: ok');
