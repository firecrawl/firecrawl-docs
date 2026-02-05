(function() {
  // Wait for the DOM to be fully loaded
  function injectCTA() {
    // Find the table of contents content container (inside the right sidebar)
    const tocContent = document.getElementById('table-of-contents-content');

    // Check if CTA already exists to avoid duplicates
    if (document.getElementById('firecrawl-cta-widget')) {
      return;
    }

    if (tocContent) {
      // Create the CTA container
      const ctaWidget = document.createElement('div');
      ctaWidget.id = 'firecrawl-cta-widget';
      ctaWidget.innerHTML = `
        <div class="firecrawl-cta-box">
          <div class="firecrawl-cta-badge">
            <img src="/logo/firecrawl-icon.png" alt="Firecrawl" class="firecrawl-cta-logo" />
            Get started
          </div>
          <h3 class="firecrawl-cta-title">Ready to build?</h3>
          <p class="firecrawl-cta-description">
            Start getting Web Data for free and scale seamlessly as your project expands. <strong>No credit card needed.</strong>
          </p>
          <div class="firecrawl-cta-buttons">
            <a href="https://www.firecrawl.dev/signin" class="firecrawl-cta-btn-primary">Start for free</a>
            <a href="https://www.firecrawl.dev/pricing" class="firecrawl-cta-btn-secondary">See our plans</a>
          </div>
        </div>
      `;

      // Append to the TOC content (at the bottom of "On this page")
      tocContent.appendChild(ctaWidget);
    }
  }

  // Run on initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCTA);
  } else {
    injectCTA();
  }

  // Also run on navigation changes (for SPA behavior)
  const observer = new MutationObserver(function() {
    // Debounce the injection
    clearTimeout(window.firecrawlCtaTimeout);
    window.firecrawlCtaTimeout = setTimeout(injectCTA, 100);
  });

  // Start observing once DOM is ready
  function startObserver() {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }
})();
