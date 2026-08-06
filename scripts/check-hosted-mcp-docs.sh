#!/usr/bin/env sh
# Static truth checks for English-source hosted-MCP docs only. Run from the repository root.
# Locadex-managed locale files are intentionally out of scope; retranslation and locale
# verification remain a release gate after this source change ships.
set -eu

main_page="mcp-server.mdx"
connect_page="mcp-server/connect.mdx"
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

# The MCP overview owns discovery; the connection guide owns the three hosted modes.
require "$main_page" 'href="/mcp-server/connect"'
require "$connect_page" "https://mcp.firecrawl.dev/v2/mcp-oauth"
require "$connect_page" "Authorization: Bearer <FIRECRAWL_API_KEY>"
require "$connect_page" "exactly **Search, Scrape, and Parse**"
require "$connect_page" "## Legacy API-key URL support"
require "$connect_page" "https://mcp.firecrawl.dev/<FIRECRAWL_API_KEY>/v2/mcp"
legacy_url_count="$(grep -Foc "https://mcp.firecrawl.dev/<FIRECRAWL_API_KEY>/v2/mcp" "$connect_page")"
if [ "$legacy_url_count" -ne 1 ]; then
  echo "$connect_page must contain the scoped legacy URL exactly once; found $legacy_url_count" >&2
  exit 1
fi
require "$connect_page" "It is not the recommended setup for new integrations."
require "$connect_page" "It does not work for the OAuth-only search resource."
forbid "$connect_page" "/v2/mcp-search"

# Keyless is the fixed three-tool hosted surface, not the former four-tool list.
require "$rate_limits" "exactly **Search, Scrape, and Parse** without an API key"
forbid "$rate_limits" "Scrape, search, interact, and parse can be used"
require "$ai_onboarding" "CLI, SDKs, and REST API allow keyless search, scrape, interact, and parse"
require "$ai_onboarding" "Hosted MCP exposes the narrower keyless Search, Scrape, and Parse surface"
forbid "$ai_onboarding" "hosted MCP keyless free tier to search, scrape, and interact"

# OAuth redirect guidance must remain compatible with the authorization-server policy.
require "$oauth_guide" "Firecrawl accepts HTTPS redirect URIs and loopback redirect URIs"
require "$oauth_guide" "Authorization: Bearer <FIRECRAWL_API_KEY>"
forbid "$oauth_guide" "API-key-in-URL"

# Only the scoped legacy fallback on the MCP connection page may emit a credential-bearing hosted MCP URL.
# Keep the value in OAuth or an Authorization header/secret store instead.
raw_key_paths="$(find . -type f -name '*.mdx' \
  ! -path './es/*' ! -path './fr/*' ! -path './ja/*' ! -path './pt-BR/*' ! -path './zh/*' \
  ! -path "./$connect_page" \
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
