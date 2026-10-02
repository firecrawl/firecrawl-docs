export const CursorInstallButton = () => {
  const installUrl = `cursor://anysphere.cursor-deeplink/mcp/install?name=firecrawl&config=${btoa(
    JSON.stringify({ url: "https://mcp.firecrawl.dev/v2/mcp" })
  )}`;

  return (
    <div className="fc-agent-prompt fc-openai-install not-prose">
      <div className="fc-openai-install-actions">
        <a className="fc-agent-prompt-button" href={installUrl}>
          <img src="/images/agent-clients/cursor.svg" width="20" height="20" alt="" />
          Add to Cursor
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  );
};
