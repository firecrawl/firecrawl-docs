#!/usr/bin/env sh
# Static truth checks for English-source hosted-MCP docs only. Run from the repository root.
# Locadex-managed locale files are intentionally out of scope. Retranslation and locale
# verification remain a release gate after the English source is approved.
set -eu

chooser_page="mcp-server.mdx"
keyless_page="mcp-server/agent-mcp.mdx"
oauth_page="mcp-server/human-mcp.mdx"
tools_page="mcp-server/tools.mdx"
local_page="mcp-server/local.mdx"
rate_limits="rate-limits.mdx"
ai_onboarding="ai-onboarding.mdx"
selector="snippets/shared/agent-first-onboarding.jsx"

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

# Old setup pages remain consolidated, while /mcp-server is the neutral chooser.
if [ ! -e "$chooser_page" ]; then
  echo "$chooser_page must exist as the hosted MCP routing page" >&2
  exit 1
fi
if [ -e "developer-guides/mcp-setup-guides/oauth.mdx" ]; then
  echo "the old OAuth guide must remain folded into mcp-server/human-mcp.mdx" >&2
  exit 1
fi
for retired_page in mcp-server/connect.mdx mcp-server/clients.mdx mcp-server/development.mdx; do
  if [ -e "$retired_page" ]; then
    echo "$retired_page must stay consolidated into the hosted MCP pages" >&2
    exit 1
  fi
done

# The entry page routes by outcome, not by the ambiguous Human/Agent labels.
require "$chooser_page" "Choose the setup that matches how the connection will run."
require "$chooser_page" 'title="Try instantly"'
require "$chooser_page" 'title="Connect interactively"'
require "$chooser_page" 'title="Agents, CI, and backend"'
require "$chooser_page" "shared daily allowance per public IP"
require "$chooser_page" "Never put a Firecrawl API key in an MCP URL, an agent conversation, or a committed project file."
require "$chooser_page" "update or replace the existing"
require "$chooser_page" "Start a new client session"

# Keyless and API-key setup share /v2/mcp, but keep different credential contracts.
require "$keyless_page" "sidebarTitle: 'Keyless and API key'"
require "$keyless_page" "Keyless MCP exposes exactly Search, Scrape, and Parse."
require "$keyless_page" "shared by users on the same public IP address"
require "$keyless_page" 'bearer_token_env_var = "FIRECRAWL_API_KEY"'
require "$keyless_page" '"Authorization": "Bearer ${FIRECRAWL_API_KEY}"'
require "$keyless_page" "Never paste the key into agent chat"
require "$keyless_page" "https://mcp.firecrawl.dev/v2/mcp"
forbid "$keyless_page" "https://mcp.firecrawl.dev/<FIRECRAWL_API_KEY>/v2/mcp"

# OAuth setup is interactive, OAuth-only, and executable for existing keyless users.
require "$oauth_page" "sidebarTitle: 'OAuth'"
require "$oauth_page" 'variant="human"'
require "$oauth_page" "server URL for your MCP client. It is not a page to open directly in a browser."
require "$oauth_page" "Do not add a second Firecrawl entry."
require "$oauth_page" "claude mcp remove firecrawl"
require "$oauth_page" "codex mcp add firecrawl --url https://mcp.firecrawl.dev/v2/mcp-oauth"
require "$oauth_page" "start a new client session"
require "$oauth_page" "Access tokens expire after one hour."
forbid "$oauth_page" "## Add an API key"
forbid "$oauth_page" "Authorization: Bearer <FIRECRAWL_API_KEY>"

# Client selector keeps endpoint behavior distinct. Codex keyless uses direct config
# because `codex mcp add` can proactively start OAuth even for the anonymous endpoint.
require "$selector" 'https://mcp.firecrawl.dev/v2/mcp-oauth'
require "$selector" 'https://mcp.firecrawl.dev/v2/mcp'
require "$selector" 'const codexKeylessConfig = `[mcp_servers.firecrawl]'
require "$selector" 'code: isHuman ? undefined : codexKeylessConfig'
require "$selector" 'codex mcp add firecrawl --url ${mcpUrl}'
require "$selector" 'href="/mcp-server"'
forbid "$selector" '&& codex mcp login firecrawl'

# /mcp-server is a real page, not a redirect. Generic retired routes point to it.
root_redirect_count="$(jq '[.redirects[] | select(.source == "/mcp-server")] | length' docs.json)"
if [ "$root_redirect_count" -ne 0 ]; then
  echo "/mcp-server must render the chooser instead of redirecting" >&2
  exit 1
fi
for source in /mcp-server/connect /mcp-server/clients /mcp-server/development; do
  destination="$(jq -r --arg source "$source" '.redirects[] | select(.source == $source) | .destination' docs.json)"
  if [ "$destination" != "/mcp-server" ]; then
    echo "$source must redirect to /mcp-server, found: $destination" >&2
    exit 1
  fi
done
oauth_redirect="$(jq -r '.redirects[] | select(.source == "/developer-guides/mcp-setup-guides/oauth") | .destination' docs.json)"
if [ "$oauth_redirect" != "/mcp-server/human-mcp" ]; then
  echo "the retired OAuth guide must redirect to the focused OAuth page" >&2
  exit 1
fi

# Keep the main English navigation compact. The chooser owns links to the leaf pages.
expected_mcp_pages='["mcp-server"]'
documentation_mcp_pages="$(jq -c '.navigation.languages[] | select(.language == "en") | .versions[0].tabs[] | select(.tab == "Documentation") | .groups[] | select(.group == "Get Started") | .pages[] | select(type == "object" and .group == "MCP" and (has("icon") | not)) | .pages' docs.json)"
build_with_ai_mcp_pages="$(jq -c '.navigation.languages[] | select(.language == "en") | .versions[0].tabs[] | select(.tab == "Build with AI") | .groups[] | select(.group == "AI Tools") | .pages[] | select(type == "object" and .group == "MCP") | .pages' docs.json)"
build_with_ai_mcp_icon_count="$(jq '[.navigation.languages[] | select(.language == "en") | .versions[0].tabs[] | select(.tab == "Build with AI") | .groups[] | select(.group == "AI Tools") | .pages[] | select(type == "object" and .group == "MCP" and has("icon"))] | length' docs.json)"
if [ "$documentation_mcp_pages" != "$expected_mcp_pages" ] || [ "$build_with_ai_mcp_pages" != "$expected_mcp_pages" ] || [ "$build_with_ai_mcp_icon_count" -ne 0 ]; then
  echo "Expected one icon-free /mcp-server chooser in both English MCP groups" >&2
  echo "Documentation MCP pages: $documentation_mcp_pages" >&2
  echo "Build with AI MCP pages: $build_with_ai_mcp_pages" >&2
  exit 1
fi

# Tool and supporting pages must preserve the paths hidden from the primary nav.
require "$tools_page" "Start with [MCP setup](/mcp-server)"
require "$tools_page" "Extract structured data from a known URL"
require "$tools_page" '`firecrawl_scrape` with JSON format'
require "$tools_page" "Find and extract data when the sources are unknown"
require "$tools_page" '`firecrawl_agent` and `firecrawl_agent_status`'
require "$tools_page" "The former Extract MCP tool is deprecated"
require "$tools_page" "[Choosing the Data Extractor](/developer-guides/usage-guides/choosing-the-data-extractor)"
require "$local_page" "npx -y firecrawl-mcp@3.23.4"
require "$local_page" "start with [MCP setup](/mcp-server)"

# Keyless stays the fixed three-tool hosted surface.
require "$rate_limits" "exactly **Search, Scrape, and Parse** without an API key"
forbid "$rate_limits" "Scrape, search, interact, and parse can be used"
require "$ai_onboarding" "Hosted MCP exposes the narrower keyless Search, Scrape, and Parse surface"
require "$ai_onboarding" "## CLI and agent skills"
require "$ai_onboarding" '<span id="cli"></span>'
require "$ai_onboarding" "structured extraction through Scrape JSON"
require "$ai_onboarding" 'href="/mcp-server"'
forbid "$ai_onboarding" "covers our full API surface"

# Generic English links enter through the chooser rather than silently choosing keyless.
require introduction.mdx "[Model Context Protocol](/mcp-server)"
require integrations.mdx "[MCP server](/mcp-server)"
require docs.json '"href": "https://docs.firecrawl.dev/mcp-server"'

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

# Local MCP examples must pin the reviewed package version.
bare_mcp_npx="$({
  find . -type f -name '*.mdx' \
    ! -path './es/*' ! -path './fr/*' ! -path './ja/*' ! -path './pt-BR/*' ! -path './zh/*' \
    ! -path './.claude/*' ! -path './.firecrawl/*' ! -path './node_modules/*' \
    -exec grep -nE 'npx[[:space:]]+-y[[:space:]]+firecrawl-mcp($|[^@])' {} +
  find . -type f -name '*.mdx' \
    ! -path './es/*' ! -path './fr/*' ! -path './ja/*' ! -path './pt-BR/*' ! -path './zh/*' \
    ! -path './.claude/*' ! -path './.firecrawl/*' ! -path './node_modules/*' \
    -exec grep -nE "['\"]firecrawl-mcp['\"]" {} +
} 2>/dev/null || true)"
if [ -n "$bare_mcp_npx" ]; then
  echo "English docs must pin npx firecrawl-mcp examples:" >&2
  echo "$bare_mcp_npx" >&2
  exit 1
fi

echo "English-source hosted MCP documentation truth checks passed (locales not validated)."
