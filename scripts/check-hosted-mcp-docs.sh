#!/usr/bin/env sh
# Static truth checks for English-source hosted-MCP docs only. Run from the repository root.
# Locadex-managed locale files are intentionally out of scope; retranslation and locale
# verification remain a release gate after this source change ships.
set -eu

main_page="mcp-server.mdx"
tools_page="mcp-server/tools.mdx"
local_page="mcp-server/local.mdx"
rate_limits="rate-limits.mdx"
oauth_guide="developer-guides/mcp-setup-guides/oauth.mdx"
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
forbid "$main_page" "mcp-search"
forbid "$main_page" "(/mcp-server/search-only)"

# The MCP page owns the complete hosted setup journey. Retired setup routes redirect here.
require "$main_page" "## Setup Firecrawl MCP Server"
require "$main_page" "## Set up with an API key"
require "$main_page" "## Try without an API key"
require "$main_page" "sidebarTitle: 'Getting started with MCP'"
require "$main_page" "https://mcp.firecrawl.dev/v2/mcp-oauth"
require "$main_page" "Authorization: Bearer <FIRECRAWL_API_KEY>"
require "$main_page" "exactly **Search, Scrape, and Parse**"
require "$main_page" "Legacy API-key URL support"
require "$main_page" "https://mcp.firecrawl.dev/<FIRECRAWL_API_KEY>/v2/mcp"
legacy_url_count="$(grep -Foc "https://mcp.firecrawl.dev/<FIRECRAWL_API_KEY>/v2/mcp" "$main_page")"
if [ "$legacy_url_count" -ne 1 ]; then
  echo "$main_page must contain the scoped legacy URL exactly once; found $legacy_url_count" >&2
  exit 1
fi
require "$main_page" "It is not the recommended setup for new integrations."
require "$main_page" "It does not work for the OAuth-only search resource."
forbid "$main_page" "/v2/mcp-search"

next_setup_section="$(awk '/^## Setup Firecrawl MCP Server$/{found=1; next} found && /^## /{print; exit}' "$main_page")"
if [ "$next_setup_section" != "## Set up with an API key" ]; then
  echo "API-key setup must be the next section after the primary client setup" >&2
  exit 1
fi

for retired_page in mcp-server/connect.mdx mcp-server/clients.mdx mcp-server/development.mdx; do
  if [ -e "$retired_page" ]; then
    echo "$retired_page must be consolidated into $main_page" >&2
    exit 1
  fi
done
require docs.json '"source": "/mcp-server/connect"'
require docs.json '"source": "/mcp-server/clients"'
development_redirect_count="$(jq '[.redirects[] | select(.source == "/mcp-server/development" and .destination == "/mcp-server" and (.permanent // true) == true)] | length' docs.json)"
if [ "$development_redirect_count" -ne 1 ]; then
  echo "Expected one permanent /mcp-server/development redirect to /mcp-server" >&2
  exit 1
fi
forbid docs.json '"mcp-server/connect"'
forbid docs.json '"mcp-server/clients"'
forbid docs.json '"mcp-server/development"'

# Keep the compact core MCP journey prominent in the main Documentation sidebar,
# as well as contextualized under Build with AI.
expected_mcp_pages='["mcp-server","mcp-server/tools","mcp-server/local"]'
documentation_mcp_pages="$(jq -c '.navigation.languages[] | select(.language == "en") | .versions[0].tabs[] | select(.tab == "Documentation") | .groups[] | select(.group == "Get Started") | .pages[1] | select(.group == "MCP" and (has("icon") | not)) | .pages' docs.json)"
build_with_ai_mcp_pages="$(jq -c '.navigation.languages[] | select(.language == "en") | .versions[0].tabs[] | select(.tab == "Build with AI") | .groups[] | select(.group == "AI Tools") | .pages[] | select(type == "object" and .group == "MCP") | .pages' docs.json)"
build_with_ai_mcp_icon_count="$(jq '[.navigation.languages[] | select(.language == "en") | .versions[0].tabs[] | select(.tab == "Build with AI") | .groups[] | select(.group == "AI Tools") | .pages[] | select(type == "object" and .group == "MCP" and has("icon"))] | length' docs.json)"
if [ "$documentation_mcp_pages" != "$expected_mcp_pages" ] || [ "$build_with_ai_mcp_pages" != "$expected_mcp_pages" ] || [ "$build_with_ai_mcp_icon_count" -ne 0 ]; then
  echo "Expected the icon-free three-page MCP group directly after Introduction and under Build with AI" >&2
  exit 1
fi

require "$tools_page" "Start with [Firecrawl MCP setup](/mcp-server)"
require "$tools_page" "sidebarTitle: Firecrawl MCP Tools"
require "$local_page" "npx -y firecrawl-mcp@3.23.4"
require "$local_page" "sidebarTitle: Run MCP locally"

# Keyless is the fixed three-tool hosted surface, not the former four-tool list.
require "$rate_limits" "exactly **Search, Scrape, and Parse** without an API key"
forbid "$rate_limits" "Scrape, search, interact, and parse can be used"
require "$ai_onboarding" "CLI, SDKs, and REST API allow keyless search, scrape, interact, and parse"
require "$ai_onboarding" "Hosted MCP exposes the narrower keyless Search, Scrape, and Parse surface"
forbid "$ai_onboarding" "hosted MCP keyless free tier to search, scrape, and interact"

# OAuth redirect guidance must remain compatible with the authorization-server policy.
require "$oauth_guide" "Firecrawl accepts HTTPS redirect URIs and loopback redirect URIs"
require "$oauth_guide" "Authorization: Bearer <FIRECRAWL_API_KEY>"
require "$oauth_guide" "[Getting started with MCP](/mcp-server)"
forbid "$oauth_guide" "](/mcp-server/connect)"
forbid "$oauth_guide" "API-key-in-URL"

# Onboarding must advertise only the client setup that is actually maintained.
require "$ai_onboarding" "Windsurf users should follow the [Windsurf quickstart](/quickstarts/windsurf)."
forbid "$ai_onboarding" "View installation instructions for Cursor, Claude Desktop, Windsurf, VS Code"

# Only the scoped legacy fallback on the MCP setup page may emit a credential-bearing hosted MCP URL.
# Keep the value in OAuth or an Authorization header/secret store instead.
raw_key_paths="$(find . -type f -name '*.mdx' \
  ! -path './es/*' ! -path './fr/*' ! -path './ja/*' ! -path './pt-BR/*' ! -path './zh/*' \
  ! -path "./$main_page" \
  -exec grep -nE 'mcp\.firecrawl\.dev/(fc-|YOUR|your-|<API|\$\{|\{\{)' {} + || true)"
if [ -n "$raw_key_paths" ]; then
  echo "English docs must not emit credential-bearing hosted MCP URLs outside the scoped legacy fallback:" >&2
  echo "$raw_key_paths" >&2
  exit 1
fi

# Local MCP examples must not make npm resolve an unreviewed package version at
# install time. They should carry the reviewed server version explicitly.
bare_mcp_npx="$(find . -type f -name '*.mdx' \
  ! -path './es/*' ! -path './fr/*' ! -path './ja/*' ! -path './pt-BR/*' ! -path './zh/*' \
  -exec grep -nE 'npx[[:space:]]+-y[[:space:]]+firecrawl-mcp($|[^@])' {} + || true)"
if [ -n "$bare_mcp_npx" ]; then
  echo "English docs must pin npx firecrawl-mcp examples:" >&2
  echo "$bare_mcp_npx" >&2
  exit 1
fi

echo "English-source hosted MCP documentation truth checks passed (locales not validated)."
