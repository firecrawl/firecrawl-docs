import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), "utf8");
const failures = [];
const warnings = [];
const generatedLocales = /^(?:es|fr|ja|pt-BR|zh)\//;

const requireText = (path, text, reason) => {
  if (!read(path).includes(text)) failures.push(`${path}: ${reason}`);
};

const forbidText = (path, pattern, reason) => {
  if (pattern.test(read(path))) failures.push(`${path}: ${reason}`);
};

const requireBefore = (path, first, second, reason) => {
  const content = read(path);
  const firstIndex = content.indexOf(first);
  const secondIndex = content.indexOf(second);
  if (firstIndex === -1 || secondIndex === -1 || firstIndex >= secondIndex) {
    failures.push(`${path}: ${reason}`);
  }
};

const requireJsonEqual = (actual, expected, path, reason) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`${path}: ${reason}`);
  }
};

const recoveryExamplePattern =
  /```json\n(\{\n\s+"code": "KEYLESS_TOOL_NOT_AVAILABLE"[\s\S]*?\n\})\n```/;
const invalidCredentialContract =
  'On `/v2/mcp`, an invalid API key or unrecognized Bearer credential receives a correction-only session';
const anonymousFailureContract =
  "Anonymous/keyless capability and quota failures remain non-auth-shaped";

const recoveryScalarFailures = (content) => {
  const errors = [];
  const match = content.match(recoveryExamplePattern);
  if (!match) return ["missing parseable keyless recovery example"];

  let recovery;
  try {
    recovery = JSON.parse(match[1]);
  } catch {
    return ["keyless recovery example must be valid JSON"];
  }

  const exactScalars = {
    code: "KEYLESS_TOOL_NOT_AVAILABLE",
    message:
      "This tool is not available in keyless mode. If a person is present, connect a free Firecrawl account in the browser; no credit card is required and free accounts include monthly credits. For CI, servers, or unattended agents, configure an API key in the Authorization header. Then retry the same tool call.",
    auth_mode: "keyless",
    docs_url: "https://docs.firecrawl.dev/mcp-server",
    retryable: false,
  };
  for (const [field, expected] of Object.entries(exactScalars)) {
    if (recovery[field] !== expected) {
      errors.push(`recovery ${field} must match runtime`);
    }
  }
  if (
    typeof recovery.request_id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      recovery.request_id,
    )
  ) {
    errors.push("recovery request_id must be a lowercase UUID");
  }
  return errors;
};

const credentialSemanticsFailures = (content) => {
  const errors = [];
  if (!content.includes(invalidCredentialContract)) {
    errors.push(
      "presented bad credentials must receive a correction-only session",
    );
  }
  if (!content.includes(anonymousFailureContract)) {
    errors.push(
      "anonymous capability and quota failures must remain non-auth-shaped",
    );
  }
  return errors;
};

const walk = (directory) =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const docs = walk(root).filter((path) => /\.(mdx|md|jsx|js|json)$/.test(path));
const keyInUrl =
  /https:\/\/mcp\.firecrawl\.dev\/(?!v2\/)(?:[^\s"'`)<}\]]+\/)*v2\/mcp/;

for (const path of docs) {
  const display = relative(root, path);
  if (display.startsWith(".git/")) continue;
  const content = readFileSync(path, "utf8");
  if (keyInUrl.test(content)) {
    const message = `${display}: credentials must not appear in MCP URLs`;
    if (generatedLocales.test(display)) warnings.push(message);
    else failures.push(message);
  }
}

requireText("mcp-server.mdx", "Try it now", "missing keyless onboarding path");
requireText(
  "mcp-server.mdx",
  "Connect your account",
  "missing account onboarding path",
);
requireText(
  "mcp-server.mdx",
  "Run unattended",
  "missing workload onboarding path",
);
requireText(
  "mcp-server.mdx",
  "https://mcp.firecrawl.dev/v2/mcp-oauth",
  "missing account endpoint",
);
requireText(
  "mcp-server.mdx",
  "currently return `404` in production",
  "rollout-only endpoints must not be documented as production-live",
);
requireText(
  "mcp-server.mdx",
  "Search, Scrape, and Parse",
  "keyless tool list must be exact",
);
requireText(
  "mcp-server.mdx",
  "Authorization: Bearer",
  "API keys must be documented as headers",
);
requireText(
  "mcp-server.mdx",
  "connect_account",
  "missing interactive recovery action",
);
requireText(
  "mcp-server.mdx",
  "configure_api_key",
  "missing headless recovery action",
);
requireText(
  "mcp-server.mdx",
  "Audience compatibility is intentionally one-way",
  "missing one-way legacy OAuth audience policy",
);
const mcpServer = read("mcp-server.mdx");
for (const error of recoveryScalarFailures(mcpServer)) {
  failures.push(`mcp-server.mdx: ${error}`);
}
for (const error of credentialSemanticsFailures(mcpServer)) {
  failures.push(`mcp-server.mdx: ${error}`);
}
const recoveryMatch = mcpServer.match(recoveryExamplePattern);
if (!recoveryMatch) {
  failures.push("mcp-server.mdx: missing parseable keyless recovery example");
} else {
  const recovery = JSON.parse(recoveryMatch[1]);
  requireJsonEqual(
    Object.keys(recovery),
    [
      "code",
      "message",
      "auth_mode",
      "request_id",
      "docs_url",
      "account",
      "retryable",
      "available_tools",
      "unavailable_without_account",
      "additional_unavailable_tool_count",
      "next_actions",
    ],
    "mcp-server.mdx",
    "recovery example fields must match runtime order",
  );
  requireJsonEqual(
    recovery.account,
    {
      auth_mode: "keyless",
      connected: false,
      api_key_configured: false,
      safe_to_display: true,
    },
    "mcp-server.mdx",
    "recovery example account facts must match runtime",
  );
  requireJsonEqual(
    recovery.available_tools,
    ["firecrawl_scrape", "firecrawl_search", "firecrawl_parse"],
    "mcp-server.mdx",
    "recovery example must use the ordered keyless triad",
  );
  requireJsonEqual(
    recovery.unavailable_without_account,
    [
      "firecrawl_crawl",
      "firecrawl_map",
      "firecrawl_extract",
      "firecrawl_agent",
      "firecrawl_interact",
      "firecrawl_monitor_create",
    ],
    "mcp-server.mdx",
    "recovery example must use the registered account-tool complement",
  );
  requireJsonEqual(
    recovery.additional_unavailable_tool_count,
    17,
    "mcp-server.mdx",
    "recovery example must account for the remaining gated tools",
  );
  requireJsonEqual(
    recovery.next_actions,
    [
      {
        kind: "connect_account",
        requires_interactive_browser: true,
        connect_url: "https://firecrawl.dev/connect/mcp",
        docs_url: "https://docs.firecrawl.dev/mcp-server",
      },
      {
        kind: "configure_api_key",
        requires_interactive_browser: false,
        header: "Authorization: Bearer <FIRECRAWL_API_KEY>",
        docs_url: "https://docs.firecrawl.dev/mcp-server",
      },
    ],
    "mcp-server.mdx",
    "recovery actions must match runtime fields and ordering",
  );
}

const mutationCases = [
  {
    name: "canonical recovery message",
    mutate: (content) =>
      content.replace(
        "This tool is not available in keyless mode. If a person is present, connect a free Firecrawl account in the browser; no credit card is required and free accounts include monthly credits. For CI, servers, or unattended agents, configure an API key in the Authorization header. Then retry the same tool call.",
        "Authentication is required.",
      ),
    validate: recoveryScalarFailures,
    expected: "message",
  },
  {
    name: "UUID request ID",
    mutate: (content) =>
      content.replace("123e4567-e89b-12d3-a456-426614174000", "req_123"),
    validate: recoveryScalarFailures,
    expected: "request_id",
  },
  {
    name: "non-retryable gated-tool result",
    mutate: (content) =>
      content.replace('"retryable": false', '"retryable": true'),
    validate: recoveryScalarFailures,
    expected: "retryable",
  },
  {
    name: "presented-invalid-credential distinction",
    mutate: (content) => content.replace(invalidCredentialContract, ""),
    validate: credentialSemanticsFailures,
    expected: "presented bad credentials",
  },
  {
    name: "anonymous non-auth failure distinction",
    mutate: (content) => content.replace(anonymousFailureContract, ""),
    validate: credentialSemanticsFailures,
    expected: "non-auth-shaped",
  },
];
for (const testCase of mutationCases) {
  const mutated = testCase.mutate(mcpServer);
  const errors = testCase.validate(mutated);
  if (
    mutated === mcpServer ||
    !errors.some((error) => error.includes(testCase.expected))
  ) {
    failures.push(
      `scripts/verify-hosted-mcp-docs.mjs: mutation self-test failed for ${testCase.name}`,
    );
  }
}
requireText(
  "mcp-server.mdx",
  "does not authenticate the existing keyless session",
  "static account recovery must not claim to bind the keyless session",
);
requireText(
  "mcp-server.mdx",
  "configure or re-add Firecrawl with `https://mcp.firecrawl.dev/v2/mcp-oauth`",
  "static account recovery must explain endpoint reconfiguration",
);
requireText(
  "mcp-server.mdx",
  "retry the original tool call there",
  "Bearer recovery must explain same-endpoint retry",
);
forbidText(
  "mcp-server.mdx",
  /after either recovery action[^.]*retry/i,
  "account recovery must not promise retry on the old keyless session",
);
requireText(
  "mcp-server.mdx",
  "429",
  "quota recovery must use rate-limit semantics",
);
forbidText(
  "mcp-server.mdx",
  /anonymous[^\n]{0,80}(?:returns?|receives?|responds? with)[^\n]{0,40}(?:401|403)/i,
  "keyless anonymous recovery must not be transport-auth shaped",
);
forbidText(
  "mcp-server.mdx",
  /(?:same|shared|canonical) resource[^\n]{0,100}mcp-oauth|mcp-oauth[^\n]{0,100}(?:same|shared|canonical) resource/i,
  "the endpoints must not be described as resource aliases",
);
forbidText(
  "mcp-server.mdx",
  /hosted keyless[^.\n]{0,160}\b(?:interact|crawl|map|extract|agent|monitor)\b/i,
  "hosted keyless tools must remain the Search/Scrape/Parse triad",
);

requireText(
  "developer-guides/mcp-setup-guides/chatgpt.mdx",
  "https://mcp.firecrawl.dev/v2/mcp-oauth",
  "ChatGPT must use the account endpoint",
);
requireText(
  "developer-guides/mcp-setup-guides/claude-ai.mdx",
  "https://mcp.firecrawl.dev/v2/mcp-oauth",
  "Claude connectors must use the account endpoint",
);
requireText(
  "developer-guides/mcp-setup-guides/oauth.mdx",
  "select the team the connector should use",
  "team selection must happen during Firecrawl consent",
);
forbidText(
  "developer-guides/mcp-setup-guides/oauth.mdx",
  /team selector|switch to the team|client lets you pick the team/i,
  "must not instruct users to preselect a team outside Firecrawl consent",
);
requireText(
  "developer-guides/llm-sdks-and-frameworks/elevenagents.mdx",
  "list exactly Search, Scrape, and Parse",
  "ElevenAgents keyless setup must describe the exact triad",
);
forbidText(
  "developer-guides/llm-sdks-and-frameworks/elevenagents.mdx",
  /keyless[^\n]{0,240}(?:crawl|map|extract|interact)|available tools[^\n]{0,120}(?:crawl|map|extract|interact)/i,
  "ElevenAgents must not expand the nearby keyless tool list",
);
for (const path of [
  "quickstarts/claude-code.mdx",
  "quickstarts/codex-cli.mdx",
  "quickstarts/cursor.mdx",
  "quickstarts/opencode.mdx",
]) {
  requireText(
    path,
    "https://mcp.firecrawl.dev/v2/mcp",
    "local coding agents must start on the keyless endpoint",
  );
  forbidText(
    path,
    /API key in (?:the )?URL|embed(?:ded)?[^\n]{0,40}URL/i,
    "must not recommend URL credentials",
  );
}

for (const path of [
  "quickstarts/amp.mdx",
  "quickstarts/antigravity.mdx",
  "quickstarts/gemini-cli.mdx",
]) {
  requireBefore(
    path,
    "Hosted Keyless MCP",
    "Authenticated Local Server",
    "hosted keyless setup must precede authenticated local setup",
  );
  requireBefore(
    path,
    "https://mcp.firecrawl.dev/v2/mcp",
    "FIRECRAWL_API_KEY",
    "the first setup must not require an API key",
  );
}

requireBefore(
  "developer-guides/llm-sdks-and-frameworks/google-adk.mdx",
  "Hosted Keyless MCP Server",
  "Authenticated Local MCP Server",
  "Google ADK must present hosted keyless setup first",
);
forbidText(
  "developer-guides/llm-sdks-and-frameworks/google-adk.mdx",
  /## Prerequisites[\s\S]{0,240}\n- Obtain an API key/i,
  "Google ADK must not make an API key an unconditional prerequisite",
);
requireText(
  "developer-guides/llm-sdks-and-frameworks/google-adk.mdx",
  "does not require an API key",
  "Google ADK must distinguish the hosted keyless path",
);

for (const path of [
  "mcp-server.mdx",
  "ai-onboarding.mdx",
  "developer-guides/mcp-setup-guides/oauth.mdx",
]) {
  forbidText(
    path,
    /OAuth-first|OAuth vs\.? (?:an )?API key|API key in (?:the )?URL/i,
    "onboarding must describe user situations, not protocol choices",
  );
}

if (failures.length) {
  console.error(`Hosted MCP docs verification failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (warnings.length) {
  console.warn(`Locadex translation follow-up required (${warnings.length}):`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}

console.log(
  `Hosted MCP docs verification passed across ${docs.length} documentation files.`,
);
