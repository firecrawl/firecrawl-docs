(function() {
  function injectCTACard() {
    // Find the table of contents element
    const toc = document.querySelector('#table-of-contents');
    if (!toc) return;

    // Check if we already injected the card
    if (document.querySelector('#firecrawl-cta-card')) return;

    // Create the CTA card container
    const ctaCard = document.createElement('div');
    ctaCard.id = 'firecrawl-cta-card';
    ctaCard.style.cssText = 'margin-top: 24px;';

    ctaCard.innerHTML = `
      <div style="
        background: var(--background-light, #ffffff);
        border: 1px solid var(--border-color, rgba(0,0,0,0.1));
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        max-width: 280px;
        position: relative;
      ">
        <div style="text-align: center;">
          <!-- Decorative header with flame icon -->
          <div style="
            margin-bottom: 16px;
            display: flex;
            gap: 8px;
            justify-content: center;
            align-items: center;
            font-size: 11px;
            font-weight: 600;
            color: var(--text-muted, #6b7280);
            position: relative;
            padding-bottom: 12px;
          ">
            <span style="opacity: 0.3; user-select: none;">//</span>
            <span>Get started</span>
            <span style="opacity: 0.3; user-select: none;">//</span>
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 1px; background: var(--border-faint, rgba(0,0,0,0.06));"></div>
          </div>

          <!-- Heading -->
          <h3 style="
            font-size: 22px;
            font-weight: 700;
            color: var(--text-primary, #111827);
            margin: 0 0 10px 0;
            line-height: 1.2;
          ">Ready to build?</h3>

          <!-- Description -->
          <p style="
            font-size: 15px;
            line-height: 1.5;
            color: var(--text-secondary, rgba(0,0,0,0.6));
            margin: 0 0 20px 0;
          ">
            Start getting Web Data for free and scale seamlessly as your project expands.
            <span style="font-weight: 600; color: var(--text-primary, #111827);">No credit card needed.</span>
          </p>

          <!-- Buttons -->
          <div style="display: flex; flex-direction: column; gap: 8px; padding-top: 4px;">
            <a href="https://firecrawl.dev/signin" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: block;">
              <button type="button" style="
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 10px 16px;
                background: #FF6A00;
                color: white;
                font-size: 14px;
                font-weight: 600;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                transition: background 0.15s ease;
              " onmouseover="this.style.background='#E55A00'" onmouseout="this.style.background='#FF6A00'">
                Start for free
              </button>
            </a>
            <a href="https://firecrawl.dev/pricing" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: block;">
              <button type="button" style="
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 8px 14px;
                background: rgba(0,0,0,0.04);
                color: var(--text-primary, #111827);
                font-size: 14px;
                font-weight: 600;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.15s ease;
              " onmouseover="this.style.background='rgba(0,0,0,0.08)'" onmouseout="this.style.background='rgba(0,0,0,0.04)'">
                See our plans
              </button>
            </a>
          </div>
        </div>
      </div>
    `;

    // Apply dark mode styles
    function applyDarkModeStyles() {
      const isDarkMode = document.documentElement.classList.contains('dark') ||
                         document.body.classList.contains('dark');

      const cardContainer = ctaCard.querySelector('div');
      const heading = ctaCard.querySelector('h3');
      const description = ctaCard.querySelector('p');
      const secondaryBtn = ctaCard.querySelectorAll('button')[1];
      const strongText = ctaCard.querySelector('p span');

      if (isDarkMode) {
        cardContainer.style.background = 'var(--background-dark, #1a1a1a)';
        cardContainer.style.borderColor = 'rgba(255,255,255,0.1)';
        if (heading) heading.style.color = '#ffffff';
        if (description) description.style.color = 'rgba(255,255,255,0.72)';
        if (strongText) strongText.style.color = '#ffffff';
        if (secondaryBtn) {
          secondaryBtn.style.background = 'rgba(255,255,255,0.1)';
          secondaryBtn.style.color = '#ffffff';
          secondaryBtn.onmouseover = function() { this.style.background = 'rgba(255,255,255,0.15)'; };
          secondaryBtn.onmouseout = function() { this.style.background = 'rgba(255,255,255,0.1)'; };
        }
      } else {
        cardContainer.style.background = 'var(--background-light, #ffffff)';
        cardContainer.style.borderColor = 'rgba(0,0,0,0.1)';
        if (heading) heading.style.color = '#111827';
        if (description) description.style.color = 'rgba(0,0,0,0.72)';
        if (strongText) strongText.style.color = '#111827';
        if (secondaryBtn) {
          secondaryBtn.style.background = 'rgba(0,0,0,0.04)';
          secondaryBtn.style.color = '#111827';
          secondaryBtn.onmouseover = function() { this.style.background = 'rgba(0,0,0,0.08)'; };
          secondaryBtn.onmouseout = function() { this.style.background = 'rgba(0,0,0,0.04)'; };
        }
      }
    }

    // Append inside the TOC container (at the end, below the TOC links)
    toc.appendChild(ctaCard);

    // Apply initial dark mode styles
    applyDarkModeStyles();
  }

  // Run on initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCTACard);
  } else {
    injectCTACard();
  }

  // Handle SPA navigation (Mintlify uses client-side routing)
  const observer = new MutationObserver(function(mutations) {
    // Check if TOC exists and card doesn't
    if (document.querySelector('#table-of-contents') && !document.querySelector('#firecrawl-cta-card')) {
      injectCTACard();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also listen for dark mode changes
  const darkModeObserver = new MutationObserver(function() {
    const card = document.querySelector('#firecrawl-cta-card');
    if (!card) return;

    const isDarkMode = document.documentElement.classList.contains('dark') ||
                       document.body.classList.contains('dark');

    const cardContainer = card.querySelector('div');
    const heading = card.querySelector('h3');
    const description = card.querySelector('p');
    const secondaryBtn = card.querySelectorAll('button')[1];
    const strongText = card.querySelector('p span');

    if (isDarkMode) {
      cardContainer.style.background = 'var(--background-dark, #1a1a1a)';
      cardContainer.style.borderColor = 'rgba(255,255,255,0.1)';
      if (heading) heading.style.color = '#ffffff';
      if (description) description.style.color = 'rgba(255,255,255,0.72)';
      if (strongText) strongText.style.color = '#ffffff';
      if (secondaryBtn) {
        secondaryBtn.style.background = 'rgba(255,255,255,0.1)';
        secondaryBtn.style.color = '#ffffff';
      }
    } else {
      cardContainer.style.background = 'var(--background-light, #ffffff)';
      cardContainer.style.borderColor = 'rgba(0,0,0,0.1)';
      if (heading) heading.style.color = '#111827';
      if (description) description.style.color = 'rgba(0,0,0,0.72)';
      if (strongText) strongText.style.color = '#111827';
      if (secondaryBtn) {
        secondaryBtn.style.background = 'rgba(0,0,0,0.04)';
        secondaryBtn.style.color = '#111827';
      }
    }
  });

  darkModeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });
})();
