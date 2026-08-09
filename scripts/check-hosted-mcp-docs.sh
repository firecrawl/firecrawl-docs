#!/usr/bin/env sh
# Static truth checks for hosted-MCP docs. Run from the repository root.
set -eu

chooser_page="mcp-server.mdx"
keyless_page="mcp-server/agent-mcp.mdx"
oauth_page="mcp-server/human-mcp.mdx"
tools_page="mcp-server/tools.mdx"
local_page="mcp-server/local.mdx"
rate_limits="rate-limits.mdx"
ai_onboarding="ai-onboarding.mdx"
selector="snippets/shared/agent-first-onboarding.jsx"
reviewed_mcp_version="3.23.6"

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

# The entry page routes by outcome and gives recovery errors a stable landing point.
require "$chooser_page" "Choose the setup that matches how the connection will run."
require "$chooser_page" 'title="Try instantly with keyless MCP"'
require "$chooser_page" 'title="Connect with OAuth"'
require "$chooser_page" 'title="Run with an API key"'
require "$chooser_page" "shared by users on the same public IP"
require "$chooser_page" "https://mcp.firecrawl.dev/v2/mcp"
require "$chooser_page" "not a page to open directly in a browser"
require "$chooser_page" "## Fix a broken connection"
for code in KEYLESS_QUOTA_EXHAUSTED KEYLESS_TOOL_NOT_AVAILABLE CREDENTIAL_INVALID OAUTH_CONNECTION_INVALID; do
  require "$chooser_page" "$code"
done
require "$chooser_page" "start a new client session"

# Keyless and API-key setup share /v2/mcp, but keep different credential contracts.
require "$keyless_page" "sidebarTitle: 'Keyless and API key'"
require "$keyless_page" "Keyless MCP exposes exactly Search, Scrape, and Parse."
require "$keyless_page" "shared by users on the same public IP address"
require "$keyless_page" 'bearer_token_env_var = "FIRECRAWL_API_KEY"'
require "$keyless_page" '"Authorization": "Bearer ${FIRECRAWL_API_KEY}"'
require "$keyless_page" "Never paste the key into agent chat"
require "$keyless_page" "## Run in CI or a backend"
require "$keyless_page" "## Legacy API-key URL support"
require "$keyless_page" "Do not use it for a new connection."
require "$keyless_page" 'https://mcp.firecrawl.dev/<FIRECRAWL_API_KEY>/v2/mcp'

# OAuth setup is first-time-first and executable for existing keyless users.
require "$oauth_page" "sidebarTitle: 'OAuth connection'"
require "$oauth_page" 'variant="human"'
require "$oauth_page" "server URL for your MCP client. It is not a page to open directly in a browser."
require "$oauth_page" "If the client asks for an OAuth Client ID or Client Secret, leave both blank."
require "$oauth_page" "## Switch an existing keyless connection"
require "$oauth_page" "Do not add a second Firecrawl entry."
require "$oauth_page" "claude mcp remove firecrawl"
require "$oauth_page" "codex mcp login firecrawl"
require "$oauth_page" 'Existing OAuth tokens issued for `/v2/mcp` remain supported there.'
require "$oauth_page" "Access tokens expire after one hour."
forbid "$oauth_page" "## Add an API key"
forbid "$oauth_page" "Authorization: Bearer <FIRECRAWL_API_KEY>"

# Client selector keeps endpoint behavior distinct. Codex can use the normal add
# command for both modes because the keyless endpoint does not advertise OAuth.
require "$selector" 'https://mcp.firecrawl.dev/v2/mcp-oauth'
require "$selector" 'https://mcp.firecrawl.dev/v2/mcp'
require "$selector" 'command: `codex mcp add firecrawl --url ${mcpUrl}`'
require "$selector" 'The keyless endpoint does not start account sign-in.'
require "$selector" 'href="/mcp-server"'
forbid "$selector" 'codexKeylessConfig'
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

# Every language exposes the chooser as the MCP group root and keeps all leaves indexed.
for language in en es fr ja pt-BR zh; do
  if [ "$language" = "en" ]; then
    prefix=""
    root="mcp-server"
  else
    prefix="$language/"
    root="${language}/mcp-server"
    if [ ! -e "${language}/mcp-server.mdx" ]; then
      echo "missing localized MCP chooser: ${language}/mcp-server.mdx" >&2
      exit 1
    fi
    require "${language}/mcp-server/local.mdx" "firecrawl-mcp@${reviewed_mcp_version}"
    forbid "${language}/mcp-server/human-mcp.mdx" 'id="add-an-api-key"'
  fi
  expected="[\"${prefix}mcp-server/human-mcp\",\"${prefix}mcp-server/agent-mcp\",\"${prefix}mcp-server/tools\",\"${prefix}mcp-server/local\"]"
  count="$(jq --arg language "$language" --arg root "$root" --argjson pages "$expected" '[.navigation.languages[] | select(.language == $language) | .. | objects | select(.group? == "MCP" and .root? == $root and .pages == $pages)] | length' docs.json)"
  if [ "$count" -ne 2 ]; then
    echo "expected two complete MCP nav groups for $language, found $count" >&2
    exit 1
  fi
done

# Tool behavior and package requirements must match the implementation and npm.
require "$tools_page" "Start with [MCP setup](/mcp-server)"
require "$tools_page" "The former Extract MCP tool is deprecated"
require "$tools_page" '`firecrawl_crawl` normally starts a crawl and polls it to a terminal state before returning.'
require "$tools_page" '`firecrawl_agent` is asynchronous'
require "$tools_page" 'If the configured URL is `/v2/mcp-oauth`, sign in again through the client.'
require "$local_page" "Node.js 22 or newer"
require "$local_page" "npx -y firecrawl-mcp@${reviewed_mcp_version}"
require "$local_page" "start with [MCP setup](/mcp-server)"

# Keyless stays the fixed three-tool hosted surface everywhere it is presented.
require "$rate_limits" "exactly **Search, Scrape, and Parse** without an API key"
require "$ai_onboarding" "Hosted MCP exposes the narrower keyless Search, Scrape, and Parse surface"
require developer-guides/llm-sdks-and-frameworks/elevenagents.mdx "Keyless MCP exposes exactly Search, Scrape, and Parse, with shared limits."
for quickstart in amp antigravity cursor gemini-cli opencode windsurf; do
  file="quickstarts/${quickstart}.mdx"
  require "$file" "keyless Search, Scrape, and Parse"
  forbid "$file" "FIRECRAWL_API_KEY"
done
require quickstarts/claude-code.mdx "claude mcp add --transport http firecrawl https://mcp.firecrawl.dev/v2/mcp-oauth"
require quickstarts/codex-cli.mdx "codex mcp login firecrawl"
forbid quickstarts/claude-code.mdx "-e FIRECRAWL_API_KEY="
forbid quickstarts/codex-cli.mdx 'FIRECRAWL_API_KEY = "'

# Generic English links enter through the chooser rather than silently choosing keyless.
require introduction.mdx "[Model Context Protocol](/mcp-server)"
require introduction.mdx 'title="Try instantly with keyless MCP"'
require introduction.mdx 'title="Connect with OAuth"'
require introduction.mdx 'title="Run with an API key"'
require introduction.mdx "[llms-full.txt](https://docs.firecrawl.dev/llms-full.txt)"
first_setup_line="$(grep -nF 'title="Try instantly with keyless MCP"' introduction.mdx | cut -d: -f1)"
agent_index_line="$(grep -nF '**For AI agents:**' introduction.mdx | cut -d: -f1)"
if [ "$first_setup_line" -ge "$agent_index_line" ]; then
  echo "Introduction must show MCP setup choices before the AI-agent index note" >&2
  exit 1
fi
require integrations.mdx "[MCP server](/mcp-server)"
require docs.json '"href": "https://docs.firecrawl.dev/mcp-server"'

# Scan tracked source files only. Untracked worktrees and experiment artifacts must not
# affect the release gate, while JSX and docs.json remain covered.
tracked_docs="$(git ls-files '*.mdx' '*.jsx' 'docs.json')"
english_docs="$(printf '%s\n' "$tracked_docs" | grep -Ev '^(es|fr|ja|pt-BR|zh)/' || true)"

raw_key_paths="$(printf '%s\n' "$english_docs" | xargs grep -nE 'mcp\.firecrawl\.dev/(fc-|YOUR|your-|\$\{|\{\{)' 2>/dev/null || true)"
if [ -n "$raw_key_paths" ]; then
  echo "English docs must not emit credential-bearing hosted MCP URLs:" >&2
  echo "$raw_key_paths" >&2
  exit 1
fi

versioned_mcp_docs="$(printf '%s\n' "$english_docs" | grep -E '^(mcp-server/local\.mdx|developer-guides/llm-sdks-and-frameworks/google-adk\.mdx|quickstarts/(amp|antigravity|claude-code|codex-cli|cursor|gemini-cli|opencode|windsurf)\.mdx)$' || true)"
wrong_mcp_versions="$(printf '%s\n' "$versioned_mcp_docs" | xargs grep -nE 'firecrawl-mcp@[0-9]+\.[0-9]+\.[0-9]+' 2>/dev/null | grep -v "firecrawl-mcp@${reviewed_mcp_version}" || true)"
if [ -n "$wrong_mcp_versions" ]; then
  echo "English docs contain an unreviewed firecrawl-mcp version:" >&2
  echo "$wrong_mcp_versions" >&2
  exit 1
fi

bare_mcp_npx="$(printf '%s\n' "$english_docs" | xargs grep -nE 'npx[[:space:]]+-y[[:space:]]+firecrawl-mcp($|[^@])' 2>/dev/null || true)"
if [ -n "$bare_mcp_npx" ]; then
  echo "English docs must pin npx firecrawl-mcp examples:" >&2
  echo "$bare_mcp_npx" >&2
  exit 1
fi

echo "Hosted MCP documentation truth checks passed."
