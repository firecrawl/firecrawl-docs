#!/usr/bin/env sh
# Static truth checks for English-source hosted-MCP docs only. Run from the repository root.
# Locadex-managed locale files are intentionally out of scope; retranslation and locale
# verification remain a release gate after this source change ships.
set -eu

search_page="mcp-server/search-only.mdx"
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

# Search stays hidden and documents its pre-cutover API-key compatibility honestly.
require "$search_page" "hidden: true"
require "$search_page" "Until that cutover, existing API-key callers of this endpoint remain supported."
forbid "$search_page" "Every request requires a Firecrawl OAuth connection."
forbid "$search_page" "API keys, anonymous access, and legacy key-in-path URLs are not accepted"
require "$search_page" "## Available tools"
forbid "$search_page" "## Available tools after cutover"
forbid "$main_page" "(/mcp-server/search-only)"

# Keyless is the fixed three-tool hosted surface, not the former four-tool list.
require "$rate_limits" "exactly **Search, Scrape, and Parse** without an API key"
forbid "$rate_limits" "Scrape, search, interact, and parse can be used"
require "$ai_onboarding" "search, scrape, and parse without an API key"
forbid "$ai_onboarding" "search, scrape, and interact without an API key"

# OAuth redirect guidance must remain compatible with the authorization-server policy.
require "$oauth_guide" "Firecrawl accepts HTTPS redirect URIs and loopback redirect URIs"
require "$oauth_guide" "Authorization: Bearer <FIRECRAWL_API_KEY>"
forbid "$oauth_guide" "API-key-in-URL"

echo "English-source hosted MCP documentation truth checks passed (locales not validated)."
