(function() {
  // Wait for the DOM to be fully loaded
  function injectCTA() {
    // Find the table of contents layout container (right sidebar)
    const tocLayout = document.getElementById('table-of-contents-layout');

    // Check if CTA already exists to avoid duplicates
    if (document.getElementById('firecrawl-cta-widget')) {
      return;
    }

    if (tocLayout) {
      // Create the CTA container
      const ctaWidget = document.createElement('div');
      ctaWidget.id = 'firecrawl-cta-widget';
      ctaWidget.innerHTML = `
        <div class="firecrawl-cta-box">
          <div class="firecrawl-cta-badge">
            <svg class="firecrawl-cta-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C10.5 4 9.5 6 9.5 8.5C9.5 11 11 13 12 14C13 13 14.5 11 14.5 8.5C14.5 6 13.5 4 12 2Z" fill="#FF6B35"/>
              <path d="M8 9C7 10.5 6.5 12 6.5 13.5C6.5 16.5 9 19 12 19C15 19 17.5 16.5 17.5 13.5C17.5 12 17 10.5 16 9C15.5 10.5 14 12 12 12C10 12 8.5 10.5 8 9Z" fill="#FF4500"/>
              <path d="M12 22C16 22 19 19 19 15C19 13 18 11 16.5 9.5C16 11 14.5 13 12 13C9.5 13 8 11 7.5 9.5C6 11 5 13 5 15C5 19 8 22 12 22Z" fill="#FF6B35"/>
            </svg>
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

      // Append to the TOC layout
      tocLayout.appendChild(ctaWidget);
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
