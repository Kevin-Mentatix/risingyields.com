/* Rising Yields — client review mode (preview builds only).
   Highlight text → "Comment" → submit. Saved via Netlify Forms (form name "review"). */
(function () {
  "use strict";
  var NAME_KEY = "ry-reviewer";
  var sel = { text: "", context: "", selector: "" };

  var css = document.createElement("style");
  css.textContent = [
    ".rv-pill{position:fixed;left:16px;bottom:16px;z-index:300;display:flex;align-items:center;gap:.5rem;background:#1F3628;color:#EAE6DC;border:1px solid #C9A35A;border-radius:40px;padding:.6em 1em;font:600 13px/1 Inter,system-ui,sans-serif;box-shadow:0 10px 30px -10px rgba(0,0,0,.5);cursor:pointer}",
    ".rv-pill b{color:#C9A35A}",
    "@media(max-width:760px){.rv-pill{bottom:84px}}",
    ".rv-btn{position:absolute;z-index:301;background:#C9A35A;color:#171207;border:0;border-radius:6px;padding:.5em .8em;font:700 13px/1 Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 20px -8px rgba(0,0,0,.5)}",
    ".rv-modal{position:fixed;inset:0;z-index:302;background:rgba(10,12,10,.55);display:grid;place-items:center;padding:16px}",
    ".rv-card{background:#FBF9F4;color:#1C1E19;width:min(520px,100%);border-radius:12px;padding:22px;font:15px/1.5 Inter,system-ui,sans-serif;box-shadow:0 30px 60px -20px rgba(0,0,0,.6)}",
    ".rv-card h3{font:500 20px/1.2 Fraunces,Georgia,serif;margin:0 0 6px}",
    ".rv-card .rv-sub{color:#5E6257;font-size:13px;margin:0 0 12px}",
    ".rv-quote{border-left:3px solid #C9A35A;background:#EFEADD;padding:8px 12px;margin:0 0 12px;font-size:14px;max-height:120px;overflow:auto;white-space:pre-wrap}",
    ".rv-card label{display:block;font-weight:600;font-size:13px;margin:10px 0 4px}",
    ".rv-card input,.rv-card textarea{width:100%;box-sizing:border-box;font:inherit;border:1px solid rgba(28,30,25,.25);border-radius:6px;padding:9px 10px;background:#fff;color:#1C1E19}",
    ".rv-row{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}",
    ".rv-row button{font:600 14px Inter,system-ui,sans-serif;border-radius:6px;padding:9px 14px;cursor:pointer;border:1px solid rgba(28,30,25,.25);background:#fff;color:#1C1E19}",
    ".rv-row .rv-send{background:#2F4F3A;color:#EAE6DC;border-color:#2F4F3A}",
    ".rv-mark{background:rgba(201,163,90,.35);border-bottom:2px solid #C9A35A}",
    ".rv-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:303;background:#1F3628;color:#EAE6DC;padding:10px 16px;border-radius:8px;font:600 14px Inter,system-ui,sans-serif}"
  ].join("");
  document.head.appendChild(css);

  function cssPath(el) {
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body && parts.length < 6) {
      var s = el.tagName.toLowerCase();
      if (el.id) { parts.unshift(s + "#" + el.id); break; }
      if (el.classList.length) s += "." + [].slice.call(el.classList, 0, 2).join(".");
      var i = 1, sib = el; while ((sib = sib.previousElementSibling)) if (sib.tagName === el.tagName) i++;
      parts.unshift(s + ":nth-of-type(" + i + ")");
      el = el.parentElement;
    }
    return parts.join(" > ");
  }
  function nearestHeading(el) {
    var sec = el.closest("section,article,aside,header,footer") || document.body;
    var h = sec.querySelector("h1,h2,h3");
    return h ? h.textContent.trim().slice(0, 120) : document.title;
  }

  var pill = document.createElement("button");
  pill.className = "rv-pill"; pill.type = "button";
  pill.innerHTML = "<b>Review mode</b> Highlight text to comment · or click for a general note";
  document.body.appendChild(pill);
  pill.addEventListener("click", function () { open({ text: "", context: "General page feedback", selector: "" }); });

  var btn = document.createElement("button");
  btn.className = "rv-btn"; btn.type = "button"; btn.textContent = "Comment"; btn.hidden = true;
  document.body.appendChild(btn);

  document.addEventListener("mouseup", function (e) {
    if (e.target.closest(".rv-modal,.rv-btn,.rv-pill")) return;
    setTimeout(function () {
      var s = window.getSelection(); var t = s ? s.toString().trim() : "";
      if (!t) { btn.hidden = true; return; }
      var r = s.getRangeAt(0); var rect = r.getBoundingClientRect();
      var node = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
      sel = { text: t.slice(0, 1200), context: nearestHeading(node), selector: cssPath(node), range: r.cloneRange() };
      btn.style.top = (window.scrollY + rect.bottom + 8) + "px";
      btn.style.left = Math.min(window.scrollX + rect.left, window.scrollX + document.documentElement.clientWidth - 110) + "px";
      btn.hidden = false;
    }, 10);
  });
  btn.addEventListener("click", function () { btn.hidden = true; open(sel); });

  function open(s) {
    var name = ""; try { name = localStorage.getItem(NAME_KEY) || ""; } catch (e) {}
    var m = document.createElement("div");
    m.className = "rv-modal";
    m.innerHTML = '<div class="rv-card" role="dialog" aria-modal="true" aria-label="Leave a comment"><h3>Leave a comment</h3><p class="rv-sub">' +
      (s.text ? "On: <strong></strong>" : "General feedback for this page") + "</p>" +
      (s.text ? '<div class="rv-quote"></div>' : "") +
      '<label for="rv-c">What should change?</label><textarea id="rv-c" rows="4" placeholder="e.g. Replace with… / Remove this / Wrong fact…"></textarea>' +
      '<label for="rv-n">Your name</label><input id="rv-n" type="text" autocomplete="name">' +
      '<div class="rv-row"><button type="button" class="rv-cancel">Cancel</button><button type="button" class="rv-send">Send comment</button></div></div>';
    if (s.text) { m.querySelector(".rv-sub strong").textContent = s.context; m.querySelector(".rv-quote").textContent = s.text; }
    m.querySelector("#rv-n").value = name;
    document.body.appendChild(m);
    m.querySelector("#rv-c").focus();
    function close() { m.remove(); }
    m.addEventListener("click", function (e) { if (e.target === m) close(); });
    m.querySelector(".rv-cancel").addEventListener("click", close);
    m.querySelector(".rv-send").addEventListener("click", function () {
      var comment = m.querySelector("#rv-c").value.trim();
      var who = m.querySelector("#rv-n").value.trim();
      if (!comment) { m.querySelector("#rv-c").focus(); return; }
      try { localStorage.setItem(NAME_KEY, who); } catch (e) {}
      var data = new URLSearchParams({
        "form-name": "review", page: location.pathname, selected_text: s.text || "", section: s.context || "",
        selector: s.selector || "", comment: comment, reviewer: who, viewport: window.innerWidth + "x" + window.innerHeight,
        theme: document.documentElement.getAttribute("data-theme") || "light", submitted_at: new Date().toISOString()
      });
      var send = m.querySelector(".rv-send"); send.disabled = true; send.textContent = "Sending…";
      // On Netlify the form posts to itself; anywhere else (GitHub Pages) it posts to the Netlify comment inbox.
      var onNetlify = /netlify\.app$|^localhost$|^127\./.test(location.hostname);
      (onNetlify
        ? fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: data.toString() })
            .then(function (r) { if (!r.ok) throw new Error(r.status); })
        : fetch("https://rising-yields-v4-preview.netlify.app/", { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: data.toString() }))
        .then(function () {
          close();
          if (s.range) { try { var mk = document.createElement("mark"); mk.className = "rv-mark"; s.range.surroundContents(mk); } catch (e) {} }
          toast("Comment sent. Thank you!");
        })
        .catch(function () { send.disabled = false; send.textContent = "Send comment"; toast("Couldn't send. Please try again."); });
    });
  }
  function toast(t) { var d = document.createElement("div"); d.className = "rv-toast"; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2600); }
})();
