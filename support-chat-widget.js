// The Firecrawl Support Agent on the docs site.
//
// The chat is a page on www.firecrawl.dev shown in an iframe, not a script
// running here: its API only answers its own origin. Everyone gets the
// docs-only visitor chat, signed in to Firecrawl or not; it never has anything
// from an account. The frame is created on first open and then kept, so closing
// the panel or moving between docs pages keeps the conversation.
(function () {
  if (window.__firecrawlSupportChat) return;
  window.__firecrawlSupportChat = true;

  var EMBED_PATH = "/support-chat/embed";
  var SUPPORT_EMAIL = "help@firecrawl.com";
  var READY_TIMEOUT_MS = 15000;

  // Keep in sync with SUPPORT_CHAT_EMBED_MESSAGES in firecrawl-web
  // (lib/support-chat/embed.ts).
  var MESSAGES = {
    ready: "firecrawl-support-chat:ready",
    close: "firecrawl-support-chat:close",
    open: "firecrawl-support-chat:open",
  };

  // Only www.firecrawl.dev lets the docs frame it. A docs site running locally
  // can point at a preview deployment or a dev server instead:
  //   localStorage.setItem("firecrawl-support-chat-origin", "http://localhost:3001")
  function embedOrigin() {
    var production = "https://www.firecrawl.dev";
    if (location.hostname !== "localhost") return production;
    try {
      var override = localStorage.getItem("firecrawl-support-chat-origin");
      return override ? new URL(override).origin : production;
    } catch (e) {
      return production;
    }
  }

  var ORIGIN = embedOrigin();

  var CHAT_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
  var CLOSE_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  var root = document.createElement("div");
  root.id = "fc-support-chat";
  root.innerHTML =
    '<button type="button" class="fc-support-chat-launcher" aria-label="Chat with support" aria-haspopup="dialog" aria-expanded="false" aria-controls="fc-support-chat-panel">' +
    CHAT_ICON +
    "</button>" +
    '<div id="fc-support-chat-panel" class="fc-support-chat-panel" role="dialog" aria-label="Firecrawl Support Agent" inert>' +
    '<div class="fc-support-chat-status">' +
    '<div class="fc-support-chat-status-header">' +
    "<span>Firecrawl Support Agent</span>" +
    '<button type="button" class="fc-support-chat-close" aria-label="Close" title="Close">' +
    CLOSE_ICON +
    "</button>" +
    "</div>" +
    '<div class="fc-support-chat-status-body">' +
    '<p class="fc-support-chat-status-text" role="status"></p>' +
    '<div class="fc-support-chat-failed">' +
    '<button type="button" class="fc-support-chat-retry">Try again</button>' +
    '<p>Or email us at <a href="mailto:' +
    SUPPORT_EMAIL +
    '">' +
    SUPPORT_EMAIL +
    "</a>.</p>" +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div>";

  var launcher = root.querySelector(".fc-support-chat-launcher");
  var panel = root.querySelector(".fc-support-chat-panel");
  var closeButton = root.querySelector(".fc-support-chat-close");
  var retryButton = root.querySelector(".fc-support-chat-retry");
  var statusText = root.querySelector(".fc-support-chat-status-text");

  var frame = null;
  var open = false;
  // What opened the chat, and so where focus goes back to when it closes.
  var opener = launcher;
  // "idle" until the first open, then "loading", "ready" or "failed".
  var state = "idle";
  var readyTimer = null;

  function setState(next) {
    state = next;
    root.setAttribute("data-state", next);
    statusText.textContent =
      next === "failed" ? "The chat could not be loaded." : "Loading the chat…";
  }

  // The frame cannot report a failed load, so no word from the chat in time
  // counts as one. A chat that turns up later is still shown.
  function waitForReady() {
    clearTimeout(readyTimer);
    setState("loading");
    readyTimer = setTimeout(function () {
      if (state === "loading") setState("failed");
    }, READY_TIMEOUT_MS);
  }

  function loadFrame() {
    if (frame) frame.remove();
    frame = document.createElement("iframe");
    frame.className = "fc-support-chat-frame";
    frame.title = "Firecrawl Support Agent";
    frame.src = ORIGIN + EMBED_PATH;
    panel.appendChild(frame);
    waitForReady();
  }

  // Tells the chat it is on screen, so it puts the cursor in the message box.
  function focusChat() {
    if (!frame || !frame.contentWindow) return;
    frame.focus({ preventScroll: true });
    frame.contentWindow.postMessage({ type: MESSAGES.open }, ORIGIN);
  }

  function setOpen(next) {
    open = next;
    root.setAttribute("data-open", String(next));
    launcher.setAttribute("aria-expanded", String(next));
    launcher.tabIndex = next ? -1 : 0;
    panel.inert = !next;
  }

  function openChat(from) {
    if (!open) {
      opener = from;
      setOpen(true);
      if (!frame || state === "failed") loadFrame();
    }
    if (state === "ready") focusChat();
    else closeButton.focus({ preventScroll: true });
  }

  function closeChat() {
    if (!open) return;
    var hadFocus = panel.contains(document.activeElement);
    setOpen(false);
    if (!hadFocus) return;
    // The opener can be gone by now: a navbar link in a menu that has closed.
    var onScreen = opener.isConnected && opener.getClientRects().length > 0;
    (onScreen ? opener : launcher).focus({ preventScroll: true });
  }

  launcher.addEventListener("click", function () {
    openChat(launcher);
  });
  closeButton.addEventListener("click", closeChat);
  retryButton.addEventListener("click", function () {
    // The button is hidden while the chat loads, so focus moves off it first.
    closeButton.focus({ preventScroll: true });
    loadFrame();
  });

  // Starts the connection early; the page itself loads on first open.
  launcher.addEventListener(
    "pointerenter",
    function () {
      var link = document.createElement("link");
      link.rel = "preconnect";
      link.href = ORIGIN;
      document.head.appendChild(link);
    },
    { once: true },
  );

  // The navbar's "Support" link opens the chat as well. In docs.json it stays an
  // email link, so it still works if this script does not run, and the same
  // address written in a page stays an email link.
  var SUPPORT_LINK = 'a[href="mailto:' + SUPPORT_EMAIL + '"]';
  // On small screens the navbar links are in the "More actions" menu, a dialog.
  var NAVBAR = "#navbar, [role='dialog']";

  document.addEventListener("click", function (event) {
    var plainClick =
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey;
    if (!plainClick || event.defaultPrevented) return;
    var link = event.target.closest && event.target.closest(SUPPORT_LINK);
    if (!link || root.contains(link) || !link.closest(NAVBAR)) return;
    event.preventDefault();
    var menu = link.closest("[role='dialog']");
    if (menu) {
      // The menu keeps focus to itself and covers the chat, so it closes first.
      menu.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    }
    openChat(link);
  });

  // While the chat has focus its own page handles Escape and reports the close.
  panel.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    closeChat();
  });

  window.addEventListener("message", function (event) {
    if (
      !frame ||
      event.source !== frame.contentWindow ||
      event.origin !== ORIGIN
    )
      return;
    var type = event.data && event.data.type;
    if (type === MESSAGES.ready) {
      clearTimeout(readyTimer);
      var hadFocus = panel.contains(document.activeElement);
      setState("ready");
      if (open && hadFocus) focusChat();
    } else if (type === MESSAGES.close) {
      closeChat();
    }
  });

  setState("idle");
  setOpen(false);

  function mount() {
    if (root.isConnected) return;
    document.body.appendChild(root);
    // A frame that is put back into the page loads again.
    if (frame) waitForReady();
  }

  function start() {
    mount();
    // The docs are a single-page app; put the widget back if a render drops it.
    new MutationObserver(mount).observe(document.body, { childList: true });
  }

  // After load, so the widget is never in the way of the page's own hydration.
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
