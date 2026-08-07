#!/usr/bin/env sh
# Static truth checks for English-source hosted-MCP docs only. Run from the repository root.
# Locadex-managed locale files are intentionally out of scope; retranslation and locale
# verification remain a release gate after this source change ships.
set -eu

agent_page="mcp-server/agent-mcp.mdx"
human_page="mcp-server/human-mcp.mdx"
tools_page="mcp-server/tools.mdx"
local_page="mcp-server/local.mdx"
rate_limits="rate-limits.mdx"
ai_onboarding="ai-onboarding.mdx"

require() {
  file="$1"
  text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "expected $file to contain: $text" >&2
    exit 1
  fi
}

forbid() {
  file="$1"
  text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "did not expect $file to contain: $text" >&2
    exit 1
  fi
}

# The marketplace-only search profile is not a general Firecrawl setup surface.
if [ -e "mcp-server/search-only.mdx" ]; then
  echo "mcp-server/search-only.mdx must not be published as a general setup page" >&2
  exit 1
fi

# Retired single-page MCP setup and OAuth guide must stay deleted.
if [ -e "mcp-server.mdx" ]; then
  echo "mcp-server.mdx must remain split into agent-mcp and human-mcp" >&2
  exit 1
fi
if [ -e "developer-guides/mcp-setup-guides/oauth.mdx" ]; then
  echo "developer-guides/mcp-setup-guides/oauth.mdx must remain folded into human-mcp" >&2
  exit 1
fi

for retired_page in mcp-server/connect.mdx mcp-server/clients.mdx mcp-server/development.mdx; do
  if [ -e "$retired_page" ]; then
    echo "$retired_page must stay consolidated into the Agent/Human MCP pages" >&2
    exit 1
  fi
done

# Agent MCP owns keyless + API key on /v2/mcp.
require "$agent_page" "sidebarTitle: 'Agent MCP'"
require "$agent_page" "https://mcp.firecrawl.dev/v2/mcp"
require "$agent_page" "Authorization: Bearer <FIRECRAWL_API_KEY>"
require "$agent_page" "Keyless MCP is rate limited and exposes Search, Scrape, and Parse."
forbid "$agent_page" "mcp-search"
forbid "$agent_page" "/v2/mcp-search"
forbid "$agent_page" "https://mcp.firecrawl.dev/<FIRECRAWL_API_KEY>/v2/mcp"

# Human MCP owns sign-in on /v2/mcp-oauth; API key fallback uses /v2/mcp + Bearer.
require "$human_page" "sidebarTitle: 'Human MCP'"
require "$human_page" 'variant="human"'
require "$human_page" "Authorization: Bearer <FIRECRAWL_API_KEY>"
require "$human_page" "URL: https://mcp.firecrawl.dev/v2/mcp"
forbid "$human_page" "to the same endpoint"
forbid "$human_page" "Supported standards"
forbid "$human_page" "RFC 8414"

# Selector must keep the two hosted URLs distinct by variant.
require "snippets/shared/agent-first-onboarding.jsx" 'https://mcp.firecrawl.dev/v2/mcp-oauth'
require "snippets/shared/agent-first-onboarding.jsx" 'https://mcp.firecrawl.dev/v2/mcp'
require "snippets/shared/agent-first-onboarding.jsx" 'variant === "human"'
require "snippets/shared/agent-first-onboarding.jsx" 'id: "codex"'

require docs.json '"source": "/mcp-server/connect"'
require docs.json '"source": "/mcp-server/clients"'
require docs.json '"source": "/mcp-server"'
require docs.json '"destination": "/mcp-server/agent-mcp"'
require docs.json '"source": "/developer-guides/mcp-setup-guides/oauth"'
require docs.json '"destination": "/mcp-server/human-mcp"'
forbid docs.json '"mcp-server/connect"'
forbid docs.json '"mcp-server/clients"'
forbid docs.json '"mcp-server/development"'

# Keep the compact MCP journey as Agent then Human in the main Documentation sidebar,
# as well as under Build with AI.
expected_mcp_pages='["mcp-server/agent-mcp","mcp-server/human-mcp"]'
documentation_mcp_pages="$(jq -c '.navigation.languages[] | select(.language == "en") | .versions[0].tabs[] | select(.tab == "Documentation") | .groups[] | select(.group == "Get Started") | .pages[] | select(type == "object" and .group == "MCP" and (has("icon") | not)) | .pages' docs.json)"
build_with_ai_mcp_pages="$(jq -c '.navigation.languages[] | select(.language == "en") | .versions[0].tabs[] | select(.tab == "Build with AI") | .groups[] | select(.group == "AI Tools") | .pages[] | select(type == "object" and .group == "MCP") | .pages' docs.json)"
build_with_ai_mcp_icon_count="$(jq '[.navigation.languages[] | select(.language == "en") | .versions[0].tabs[] | select(.tab == "Build with AI") | .groups[] | select(.group == "AI Tools") | .pages[] | select(type == "object" and .group == "MCP" and has("icon"))] | length' docs.json)"
if [ "$documentation_mcp_pages" != "$expected_mcp_pages" ] || [ "$build_with_ai_mcp_pages" != "$expected_mcp_pages" ] || [ "$build_with_ai_mcp_icon_count" -ne 0 ]; then
  echo "Expected the icon-free Agent then Human MCP group after Introduction and under Build with AI" >&2
  echo "Documentation MCP pages: $documentation_mcp_pages" >&2
  echo "Build with AI MCP pages: $build_with_ai_mcp_pages" >&2
  exit 1
fi

require "$tools_page" "Start with [Agent MCP](/mcp-server/agent-mcp) or [Human MCP](/mcp-server/human-mcp)"
require "$tools_page" "sidebarTitle: Firecrawl MCP Tools"
require "$local_page" "npx -y firecrawl-mcp@3.23.4"
require "$local_page" "sidebarTitle: Run MCP locally"
require "$local_page" "[Agent MCP](/mcp-server/agent-mcp) or [Human MCP](/mcp-server/human-mcp)"

# Keyless is the fixed three-tool hosted surface, not the former four-tool list.
require "$rate_limits" "exactly **Search, Scrape, and Parse** without an API key"
forbid "$rate_limits" "Scrape, search, interact, and parse can be used"
require "$ai_onboarding" "CLI, SDKs, and REST API allow keyless search, scrape, interact, and parse"
require "$ai_onboarding" "Hosted MCP exposes the narrower keyless Search, Scrape, and Parse surface"
forbid "$ai_onboarding" "hosted MCP keyless free tier to search, scrape, and interact"

# Onboarding must advertise only the client setup that is actually maintained.
require "$ai_onboarding" "Windsurf users should follow the [Windsurf quickstart](/quickstarts/windsurf)."
forbid "$ai_onboarding" "View installation instructions for Cursor, Claude Desktop, Windsurf, VS Code"

# English docs must not emit credential-bearing hosted MCP URLs.
raw_key_paths="$(find . -type f -name '*.mdx' \
  ! -path './es/*' ! -path './fr/*' ! -path './ja/*' ! -path './pt-BR/*' ! -path './zh/*' \
  ! -path './.claude/*' ! -path './.firecrawl/*' ! -path './node_modules/*' \
  -exec grep -nE 'mcp\.firecrawl\.dev/(fc-|YOUR|your-|<API|\$\{|\{\{)' {} + || true)"
if [ -n "$raw_key_paths" ]; then
  echo "English docs must not emit credential-bearing hosted MCP URLs:" >&2
  echo "$raw_key_paths" >&2
  exit 1
fi

# Local MCP examples must not make npm resolve an unreviewed package version at
# install time. They should carry the reviewed server version explicitly.
bare_mcp_npx="$(find . -type f -name '*.mdx' \
  ! -path './es/*' ! -path './fr/*' ! -path './ja/*' ! -path './pt-BR/*' ! -path './zh/*' \
  ! -path './.claude/*' ! -path './.firecrawl/*' ! -path './node_modules/*' \
  -exec grep -nE 'npx[[:space:]]+-y[[:space:]]+firecrawl-mcp($|[^@])' {} + || true)"
if [ -n "$bare_mcp_npx" ]; then
  echo "English docs must pin npx firecrawl-mcp examples:" >&2
  echo "$bare_mcp_npx" >&2
  exit 1
fi

echo "English-source hosted MCP documentation truth checks passed (locales not validated)."
