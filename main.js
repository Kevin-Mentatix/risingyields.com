/* Rising Yields v4: interactions (dependency-free) */
(function () {
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  /* ---- Tracking: pushes to dataLayer (GA4/GTM reads it once installed) ---- */
  window.dataLayer = window.dataLayer || [];
  function track(event, params) {
    var payload = Object.assign({ event: event }, params || {});
    window.dataLayer.push(payload);
    if (typeof window.gtag === "function") window.gtag("event", event, params || {});
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-track]");
    if (!el) return;
    track(el.getAttribute("data-track"), { label: el.getAttribute("data-label") || el.textContent.trim(), href: el.getAttribute("href") || "", page: location.pathname });
  });

  /* ---- UTM / source capture (first touch, per session) → hidden form fields ---- */
  var SRC_KEY = "ry-source";
  var src = null;
  try { src = JSON.parse(sessionStorage.getItem(SRC_KEY)); } catch (e) {}
  if (!src) {
    var q = new URLSearchParams(location.search);
    src = { utm_source: q.get("utm_source") || "", utm_medium: q.get("utm_medium") || "", utm_campaign: q.get("utm_campaign") || "", utm_content: q.get("utm_content") || "", landing_page: location.pathname + location.search, referrer: document.referrer || "" };
    try { sessionStorage.setItem(SRC_KEY, JSON.stringify(src)); } catch (e) {}
  }
  document.querySelectorAll(".lead-form").forEach(function (f) {
    Object.keys(src).forEach(function (k) { if (f.elements[k]) f.elements[k].value = src[k]; });
  });

  /* ---- Theme toggle (light default; persisted) ---- */
  var toggle = document.getElementById("themeToggle");
  function sync() {
    if (!toggle) return;
    var dark = root.getAttribute("data-theme") === "dark";
    toggle.setAttribute("aria-pressed", dark ? "true" : "false");
    toggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    toggle.querySelector(".t-label").textContent = dark ? "Dark" : "Light";
  }
  sync();
  if (toggle) toggle.addEventListener("click", function () {
    var dark = root.getAttribute("data-theme") !== "dark";
    if (dark) root.setAttribute("data-theme", "dark"); else root.removeAttribute("data-theme");
    try { localStorage.setItem("ry-theme", dark ? "dark" : "light"); } catch (e) {}
    sync();
  });

  /* ---- Header state ---- */
  var header = document.getElementById("siteHeader");
  function onScroll() { header.classList.toggle("scrolled", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Mobile nav ---- */
  var navBtn = document.getElementById("navToggle"), nav = document.getElementById("mainNav");
  function closeNav() { nav.classList.remove("open"); navBtn.setAttribute("aria-expanded", "false"); document.body.classList.remove("nav-open"); }
  navBtn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    navBtn.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);
  });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) closeNav(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });

  /* ---- Reveal ---- */
  var els = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) els.forEach(function (el) { el.classList.add("is-visible"); });
  else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---- Hero video (desktop only; mobile keeps the poster) ---- */
  var media = document.getElementById("heroMedia");
  if (media && media.getAttribute("data-video") && !reduceMotion && window.matchMedia("(min-width: 900px)").matches) {
    var v = document.createElement("video");
    v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
    v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true"); v.setAttribute("tabindex", "-1");
    v.poster = media.getAttribute("data-poster");
    v.src = media.getAttribute("data-video");
    v.addEventListener("canplay", function () { v.classList.add("ready"); });
    media.insertBefore(v, media.firstChild);
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }

  /* ---- Start Here: preselect interest from ?interest= (launch / exit) ---- */
  var interest = new URLSearchParams(location.search).get("interest");
  if (interest) {
    var box = document.querySelector('#startForm input[name="wants"][value="' + interest + '"]');
    if (box) box.checked = true;
  }

  /* ---- Forms (front-end only until lead routing / CRM is wired) ---- */
  document.querySelectorAll(".lead-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      // Netlify Forms: one urlencoded POST; multi-select "wants" joined into one field.
      var params = new URLSearchParams(), wants = [];
      params.append("form-name", form.getAttribute("name"));
      new FormData(form).forEach(function (v, k) { if (k === "wants") wants.push(v); else params.append(k, v); });
      if (wants.length) params.append("wants", wants.join(", "));
      var btn = form.querySelector('[type="submit"]'); if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Sending…"; }
      var endpoint = form.getAttribute("data-endpoint"), req;
      if (endpoint) {
        // Google Apps Script: logs the inquiry to the shared sheet and emails the team a formatted summary.
        params.append("page", location.pathname);
        req = fetch(endpoint, { method: "POST", body: params })
          .then(function (r) { return r.json(); })
          .then(function (j) { if (!j.ok) throw new Error(j.error || "send failed"); });
      } else {
        req = fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() })
          .then(function (r) { if (!r.ok) throw new Error(r.status); });
      }
      req
        .then(function () {
          track("form_submit", { form: form.getAttribute("data-form"), page: location.pathname });
          var ok = form.parentElement.querySelector(".form-success");
          form.hidden = true; ok.hidden = false;
          ok.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
          var err = form.querySelector(".form-error");
          if (!err) { err = document.createElement("p"); err.className = "form-error"; err.setAttribute("role", "alert"); form.appendChild(err); }
          err.textContent = "Something went wrong sending your message. Please try again, or book a call on the Start Here page.";
        });
    });
  });

  var y = document.getElementById("year"); if (y) y.textContent = String(new Date().getFullYear());
})();

/* Founder bio pop-outs (About page) */
(function () {
  "use strict";
  function open(id) { var d = document.getElementById(id); if (d && d.showModal && !d.open) { d.showModal(); document.body.classList.add("bio-open"); } }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-bio]");
    if (b) { open(b.getAttribute("data-bio")); return; }
    var d = e.target.closest("dialog.bio");
    if (d && (e.target === d || e.target.closest("[data-close]"))) d.close();
  });
  document.querySelectorAll("dialog.bio").forEach(function (d) { d.addEventListener("close", function () { document.body.classList.remove("bio-open"); }); });
  if (/^#bio-/.test(location.hash)) open(location.hash.slice(1));
})();

/* Profit Simulator (Business & Profit): on-page model, same math as the client's ProfitSimSection */
(function () {
  "use strict";
  var root = document.querySelector("[data-simulator]");
  if (!root) return;
  var DEF = { revenue: 1000000, gross: 40, net: 10, price: 3, cost: 3, conv: 5 };
  var inp = {}; root.querySelectorAll("[data-sim-in]").forEach(function (el) { inp[el.getAttribute("data-sim-in")] = el; });
  var fmt = function (n) { return Math.round(n).toLocaleString("en-US"); };
  var out = function (k, v) { root.querySelectorAll('[data-sim-out="' + k + '"]').forEach(function (el) { el.textContent = v; }); };
  var num = function (k) { var v = Number(inp[k].value); return isFinite(v) ? v : 0; };
  function calc() {
    var revenue = Math.max(0, num("revenue")), gross = Math.max(0, Math.min(100, num("gross"))), net = Math.max(0, Math.min(100, num("net")));
    var price = num("price"), cost = num("cost"), conv = num("conv");
    root.querySelectorAll("[data-sim-show]").forEach(function (el) { el.textContent = num(el.getAttribute("data-sim-show")); });
    var netNow = revenue * net / 100, expenses = revenue - netNow;
    var addedFromPrice = revenue * price / 100, priceProfit = addedFromPrice * 0.95;          // price increase ~95% to bottom line
    var costProfit = expenses * cost / 100 * 0.9;                                                // ~90% of cost cut drops to net
    var addedRevConv = revenue * conv / 100, convProfit = addedRevConv * ((gross || 30) / 100) * 0.75; // gross-margin pass-through
    var total = priceProfit + costProfit + convProfit, netTotal = netNow + total;
    out("priceProfit", fmt(priceProfit)); out("costProfit", fmt(costProfit)); out("convProfit", fmt(convProfit));
    out("total", fmt(total));
    out("pct", (netNow > 0 ? total / netNow * 100 : 0).toFixed(1));
    out("mult", (netNow > 0 ? netTotal / netNow : 1).toFixed(2));
    out("rev", fmt(revenue)); out("revUp", fmt(addedRevConv + addedFromPrice)); out("revTotal", fmt(revenue + addedRevConv + addedFromPrice));
    out("netNow", fmt(netNow)); out("netTotal", fmt(netTotal)); out("five", fmt(total * 5));
  }
  root.addEventListener("input", calc);
  root.querySelector("[data-sim-reset]").addEventListener("click", function () {
    Object.keys(DEF).forEach(function (k) { inp[k].value = DEF[k]; }); calc();
  });
  var tracked = false;
  root.addEventListener("input", function () {
    if (tracked) return; tracked = true;
    (window.dataLayer = window.dataLayer || []).push({ event: "simulator_used" });
  });
  calc();
})();

/* Private client review mode: open any page with ?review=ry-edits-5827b5 (remembered on this device; ?review=off to exit) */
(function () {
  "use strict";
  var q = new URLSearchParams(location.search).get("review"), on = false;
  try {
    if (q === "ry-edits-5827b5") localStorage.setItem("ry-review", "1");
    if (q === "off") localStorage.removeItem("ry-review");
    on = localStorage.getItem("ry-review") === "1";
  } catch (e) { on = q === "ry-edits-5827b5"; }
  if (!on || document.querySelector('script[src$="review.js"]')) return;
  var s = document.createElement("script"); s.src = "/review.js"; s.defer = true; document.body.appendChild(s);
})();
