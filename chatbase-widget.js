(function(){if(!window.chatbase||window.chatbase("getState")!=="initialized"){window.chatbase=(...arguments)=>{if(!window.chatbase.q){window.chatbase.q=[]}window.chatbase.q.push(arguments)};window.chatbase=new Proxy(window.chatbase,{get(target,prop){if(prop==="q"){return target.q}return(...args)=>target(prop,...args)}})}const onLoad=function(){const script=document.createElement("script");script.src="https://www.chatbase.co/embed.min.js";script.id="vVaPFIXBBXF3EJYUdhgGF";script.domain="www.chatbase.co";document.body.appendChild(script)};if(document.readyState==="complete"){onLoad()}else{window.addEventListener("load",onLoad)}})();

// The Chatbase agent used here is shared with the Firecrawl dashboard, where it
// exposes a client-side custom action named "debug_job". Client-side actions
// only work if the host page registers a handler via
// window.chatbase("registerTools", {...}); otherwise the widget replies with
// "Tool debug_job not found" and the conversation breaks.
//
// The docs site has no authenticated session and must not call the Firecrawl
// API or touch API keys, so this handler always returns a graceful
// "not logged in" result (mirroring the dashboard's not-logged-in response
// shape) that tells the agent to send the user to the dashboard to debug a job.
(function () {
  // Match the dashboard's debug_job contract (firecrawl-web
  // lib/chatbase/debug-job.ts): the result is
  // { status: "error", error: DebugJobError }, and an unauthenticated request
  // (HTTP 401) returns { status: "error", error: "not_logged_in" }. The docs
  // site has no session, so debug_job is always unauthenticated here; returning
  // the exact "not_logged_in" error makes the agent follow its configured
  // instruction ("ask them to open this chat from the dashboard while signed
  // in") instead of replying "Tool debug_job not found".
  var tools = {
    debug_job: function () {
      return { status: "error", error: "not_logged_in" };
    },
  };

  function registerTools() {
    try {
      if (typeof window.chatbase !== "function") return;
      // Registering is idempotent: a later registerTools call overrides an
      // earlier one, so re-registering after a (re)initialization is safe.
      window.chatbase("registerTools", tools);
    } catch (e) {
      /* no-op: never break the host page */
    }
  }

  // Register eagerly. Before the embed script loads, window.chatbase is the
  // bootstrap queue stub, so this call is queued and replayed on init.
  registerTools();

  // Mintlify is a client-side-routed SPA, so the widget may re-initialize on
  // navigation and drop previously registered tools. Re-register whenever the
  // widget reports an initialized state to keep the handler attached.
  setInterval(function () {
    try {
      if (
        typeof window.chatbase === "function" &&
        window.chatbase("getState") === "initialized"
      ) {
        registerTools();
      }
    } catch (e) {
      /* no-op */
    }
  }, 3000);
})();
