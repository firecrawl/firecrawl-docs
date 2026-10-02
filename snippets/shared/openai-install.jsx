export const OpenAIInstallButtons = ({ includeClaude = false } = {}) => (
  <div className="fc-agent-prompt fc-openai-install not-prose">
    <div className="fc-openai-install-actions">
      <a
        className="fc-agent-prompt-button"
        href="https://chatgpt.com/plugins/plugin_asdk_app_6a314a73f8ac819195b0d55e36b9c609?q=firecrawl"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src="/images/agent-clients/chatgpt.svg" width="20" height="20" alt="" />
        Add to ChatGPT & Codex
        <span aria-hidden="true">↗</span>
      </a>
      {includeClaude && (
        <a
          className="fc-agent-prompt-button"
          href="https://claude.ai/directory/connectors/firecrawl"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src="/images/agent-clients/claude-ai.svg" width="20" height="20" alt="" />
          Add to Claude & Claude Code
          <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
    <p className="fc-openai-install-hint">
      {includeClaude
        ? "Install, connect your Firecrawl account, and start a new chat."
        : "One plugin for both. Install, connect your Firecrawl account, and start a new chat."}
    </p>
  </div>
);
