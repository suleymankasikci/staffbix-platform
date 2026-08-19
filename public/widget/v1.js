/**
 * Staffbix embeddable chat widget — v1.
 *
 * Usage on a tenant's website:
 *   <script
 *     src="https://staffbix.com/widget/v1.js"
 *     data-tenant="acme-co"
 *     data-worker="abc-123-...">
 *   </script>
 *
 * Vanilla JS, no framework — fits easily under 30 kB even when minified.
 * Sprint 7 may switch to Preact if we add rich features (typing
 * indicators, file attachments, voice). For Sprint 5 we ship the
 * smallest thing that works.
 */
(function () {
  "use strict";

  // ---- Bootstrap ----------------------------------------------------------
  var script = document.currentScript;
  if (!script) {
    console.warn("[staffbix-widget] currentScript unavailable; widget will not load.");
    return;
  }
  var tenantSlug = script.getAttribute("data-tenant");
  var workerId = script.getAttribute("data-worker");
  if (!tenantSlug || !workerId) {
    console.warn("[staffbix-widget] data-tenant and data-worker attributes are required.");
    return;
  }
  var endpoint = (function () {
    try {
      var u = new URL(script.src);
      return u.origin + "/api/widget/message";
    } catch (_) {
      return "/api/widget/message";
    }
  })();

  // Stable widget session id per browser session.
  var SESSION_STORAGE_KEY = "staffbix_widget_session_" + workerId;
  var sessionId = null;
  try {
    sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      sessionId =
        "s_" +
        Math.random().toString(36).slice(2) +
        Date.now().toString(36);
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
  } catch (_) {
    sessionId = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // ---- Styles -------------------------------------------------------------
  var style = document.createElement("style");
  style.textContent = [
    ".sb-w {position:fixed;bottom:20px;right:20px;z-index:2147483647;font-family:-apple-system,Segoe UI,sans-serif;color:#111;}",
    ".sb-w button.sb-launcher {background:#111;color:#fff;border:0;border-radius:999px;padding:12px 18px;font-size:14px;font-weight:500;cursor:pointer;box-shadow:0 8px 24px -8px rgba(0,0,0,0.25);}",
    ".sb-w .sb-panel {position:absolute;bottom:60px;right:0;width:360px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 100px);background:#fff;border:1px solid #e5e5e5;border-radius:14px;box-shadow:0 24px 48px -16px rgba(0,0,0,0.25);display:flex;flex-direction:column;overflow:hidden;}",
    ".sb-w header {padding:14px 16px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;}",
    ".sb-w header h1 {margin:0;font-size:14px;font-weight:500;letter-spacing:-0.01em;}",
    ".sb-w header button {background:none;border:0;cursor:pointer;color:#888;font-size:18px;padding:4px 8px;line-height:1;}",
    ".sb-w .sb-body {flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px;}",
    ".sb-w .sb-msg {max-width:80%;padding:8px 12px;border-radius:14px;font-size:13.5px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word;}",
    ".sb-w .sb-msg.user {align-self:flex-end;background:#111;color:#fff;border-bottom-right-radius:4px;}",
    ".sb-w .sb-msg.assistant {align-self:flex-start;background:#f3f3f3;color:#111;border-bottom-left-radius:4px;}",
    ".sb-w .sb-msg.error {align-self:flex-start;background:#fee;color:#b91c1c;border:1px solid #f4c7c7;}",
    ".sb-w form {border-top:1px solid #eee;padding:10px;display:flex;gap:8px;}",
    ".sb-w input {flex:1;border:1px solid #ddd;border-radius:10px;padding:9px 12px;font-size:13.5px;color:#111;outline:none;}",
    ".sb-w input:focus {border-color:#111;}",
    ".sb-w input:disabled {background:#fafafa;color:#999;}",
    ".sb-w form button {background:#111;color:#fff;border:0;border-radius:10px;padding:0 14px;font-size:13.5px;font-weight:500;cursor:pointer;}",
    ".sb-w form button:disabled {background:#999;cursor:not-allowed;}",
    ".sb-w footer {padding:6px 14px;border-top:1px solid #eee;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#888;text-align:center;}",
    ".sb-w footer a {color:inherit;text-decoration:none;}",
  ].join("\n");
  document.head.appendChild(style);

  // ---- DOM ----------------------------------------------------------------
  var root = document.createElement("div");
  root.className = "sb-w";
  root.innerHTML = [
    '<button class="sb-launcher" type="button">Chat with us</button>',
    '<div class="sb-panel" style="display:none">',
    "  <header>",
    "    <h1>Chat</h1>",
    '    <button type="button" aria-label="Close">×</button>',
    "  </header>",
    '  <div class="sb-body"></div>',
    '  <form><input placeholder="Type a message..." autocomplete="off" /><button type="submit">Send</button></form>',
    '  <footer>Powered by <a href="https://staffbix.com" target="_blank" rel="noopener">Staffbix</a></footer>',
    "</div>",
  ].join("");
  document.body.appendChild(root);

  var launcher = root.querySelector(".sb-launcher");
  var panel = root.querySelector(".sb-panel");
  var closeBtn = root.querySelector("header button");
  var body = root.querySelector(".sb-body");
  var form = root.querySelector("form");
  var input = root.querySelector("input");
  var sendBtn = form.querySelector("button");

  launcher.addEventListener("click", function () {
    panel.style.display = "flex";
    launcher.style.display = "none";
    input.focus();
  });
  closeBtn.addEventListener("click", function () {
    panel.style.display = "none";
    launcher.style.display = "";
  });

  function appendMessage(role, text) {
    var div = document.createElement("div");
    div.className = "sb-msg " + role;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  // ---- Send ---------------------------------------------------------------
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = (input.value || "").trim();
    if (!text) return;

    appendMessage("user", text);
    input.value = "";
    input.disabled = true;
    sendBtn.disabled = true;

    var assistantDiv = appendMessage("assistant", "");
    var streamedText = "";

    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tenantSlug: tenantSlug,
        workerId: workerId,
        sessionId: sessionId,
        message: text,
      }),
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }
        if (!res.body) {
          throw new Error("no response body");
        }
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buf = "";

        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return;
            buf += decoder.decode(r.value, { stream: true });
            // Each SSE event ends with "\n\n"
            var parts = buf.split("\n\n");
            buf = parts.pop() || "";
            for (var i = 0; i < parts.length; i++) {
              var line = parts[i];
              if (line.indexOf("data: ") !== 0) continue;
              try {
                var evt = JSON.parse(line.slice(6));
                if (evt.delta) {
                  streamedText += evt.delta;
                  assistantDiv.textContent = streamedText;
                  body.scrollTop = body.scrollHeight;
                } else if (evt.error) {
                  assistantDiv.className = "sb-msg error";
                  assistantDiv.textContent =
                    "Something went wrong. Please try again in a moment.";
                }
              } catch (_) {
                // ignore parse errors on incomplete frames
              }
            }
            return pump();
          });
        }

        return pump();
      })
      .catch(function () {
        assistantDiv.className = "sb-msg error";
        assistantDiv.textContent =
          "Couldn't reach the server. Please try again.";
      })
      .then(function () {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
      });
  });
})();
