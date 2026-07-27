#!/usr/bin/env sh
# Static truth checks for English-source hosted-MCP docs only. Run from the repository root.
# Locadex-managed locale files are intentionally out of scope; retranslation and locale
# verification remain a release gate after this source change ships.
set -eu

main_page="mcp-server.mdx"
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

echo "English-source hosted MCP documentation truth checks passed (locales not validated)."
