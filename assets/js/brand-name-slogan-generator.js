(function () {
  "use strict";

  /* ================= THEME TOGGLE ================= */
  const themeToggle = document.getElementById("themeToggle");
  const root = document.documentElement;
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    localStorage.setItem("dkb-theme", t);
  }
  const savedTheme = localStorage.getItem("dkb-theme") ||
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(savedTheme);
  themeToggle.addEventListener("click", () => {
    applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  /* ================= TOASTS ================= */
  const toastStack = document.getElementById("toastStack");
  function showToast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    toastStack.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  /* ================= WORD BANKS ================= */
  const STYLES = {
    modern: {
      prefixes: ["Nova", "Vero", "Lume", "Arc", "Onyx", "Fable", "Crest", "Fluent", "Clearly", "Northpoint"],
      suffixes: ["ly", "io", "Hub", "Wave", "Loop", "Forge", "ify", "Stack", "Point", "Line"],
      slogans: [
        "Clarity, delivered daily.",
        "{Kw} made effortless.",
        "Simple. Smart. {Kw}.",
        "The modern way to {kw}.",
        "Built for how you {kw} today.",
        "Less friction, more {kw}.",
      ],
    },
    classic: {
      prefixes: ["Heritage", "Oak", "Crown", "Sterling", "Windsor", "Ashford", "Kensington", "Marlowe", "Thistle", "Ledger"],
      suffixes: [" & Co.", " House", " & Sons", " Co.", " Guild", " Works", " Provisions"],
      slogans: [
        "Trusted since day one.",
        "Timeless {kw}, done right.",
        "Quality you can rely on.",
        "Crafted with care, always.",
        "A name built to last.",
        "The traditional standard for {kw}.",
      ],
    },
    playful: {
      prefixes: ["Zippy", "Bubbly", "Snappy", "Giggle", "Pocket", "Fizzy", "Tumble", "Whimsy", "Jolly", "Bounce"],
      suffixes: ["ster", "oodle", "zilla", "bop", "kins", "wiz", "berry", "pop"],
      slogans: [
        "{Kw}, but make it fun.",
        "Little bursts of {kw} joy.",
        "We make {kw} giggle.",
        "Serious about fun, playful about {kw}.",
        "Your daily dose of delight.",
        "{Kw} that doesn't take itself too seriously.",
      ],
    },
    luxury: {
      prefixes: ["Lumiere", "Velour", "Opal", "Marbre", "Aurum", "Belle", "Noir", "Cache", "Solene", "Ivoire"],
      suffixes: [" Atelier", " Maison", " & Co.", " Reserve", " Collective", " Studio"],
      slogans: [
        "{Kw}, elevated.",
        "Where {kw} meets elegance.",
        "Refined {kw}, for those who notice.",
        "An experience, not just {kw}.",
        "Crafted for the discerning few.",
        "Quiet luxury in every detail.",
      ],
    },
    tech: {
      prefixes: ["Byte", "Vector", "Circuit", "Nimbus", "Quantum", "Pixel", "Logic", "Data", "Signal", "Grid"],
      suffixes: ["ify", "ly", "io", "Stack", "Sync", "Grid", "Forge", "Base", "Loop"],
      slogans: [
        "{Kw}, engineered for scale.",
        "The future of {kw}, shipped today.",
        "Smarter {kw}, powered by data.",
        "Built to compute what's next.",
        "{Kw} at the speed of thought.",
        "Automate {kw}. Ship faster.",
      ],
    },
  };

  const GENERIC_KEYWORDS = {
    modern: "your brand",
    classic: "your business",
    playful: "everyday things",
    luxury: "the experience",
    tech: "your workflow",
  };

  function capitalize(w) {
    if (!w) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }

  function randomInt(max) {
    return Math.floor(Math.random() * max);
  }
  function pick(arr) {
    return arr[randomInt(arr.length)];
  }

  function sanitizeKeyword(raw) {
    return raw.replace(/[^a-zA-Z ]/g, "").trim();
  }

  function blendKeyword(kw, bank, pattern) {
    const kwCap = capitalize(kw);
    const half = Math.max(2, Math.ceil(kw.length / 2));

    switch (pattern) {
      case "prefix-kw":
        return capitalize(pick(bank.prefixes)) + kwCap.slice(0, half + 1);
      case "kw-suffix":
        return kwCap + pick(bank.suffixes);
      case "kw-half-suffix":
        return kwCap.slice(0, half) + pick(bank.suffixes);
      case "prefix-space-kw":
        return pick(bank.prefixes) + " " + kwCap;
      default:
        return kwCap + pick(bank.suffixes);
    }
  }

  function generateBlendName(bank) {
    return capitalize(pick(bank.prefixes)) + pick(bank.suffixes);
  }

  function makeSlogan(bank, kw, styleKey) {
    const template = pick(bank.slogans);
    const kwLower = kw ? kw.toLowerCase() : GENERIC_KEYWORDS[styleKey];
    const kwCap = capitalize(kwLower);
    return template.replace(/\{kw\}/g, kwLower).replace(/\{Kw\}/g, kwCap);
  }

  function generateSet(keyword, styleKey, count, oneWord, includeKeyword) {
    const bank = STYLES[styleKey];
    const kw = sanitizeKeyword(keyword);
    const results = [];
    const seen = new Set();
    let attempts = 0;

    const kwPatterns = ["prefix-kw", "kw-suffix", "kw-half-suffix"];
    if (!oneWord) kwPatterns.push("prefix-space-kw");

    while (results.length < count && attempts < count * 12) {
      attempts++;
      let name;
      if (kw && includeKeyword) {
        name = blendKeyword(kw, bank, pick(kwPatterns));
      } else {
        name = generateBlendName(bank);
      }
      name = name.trim();
      const key = name.toLowerCase();
      if (seen.has(key) || name.length < 3) continue;
      seen.add(key);
      results.push({
        name,
        slogan: makeSlogan(bank, kw, styleKey),
      });
    }
    return results;
  }

  /* ================= UI STATE ================= */
const keywordInput = document.getElementById("keywordInput");
  const nameCountSelect = document.getElementById("nameCountSelect");
  const styleChips = document.querySelectorAll("#styleChips .chip");
  const optOneWord = document.getElementById("optOneWord");
  const optIncludeKeyword = document.getElementById("optIncludeKeyword");
  const resultsGrid = document.getElementById("resultsGrid");
  const resultsCount = document.getElementById("resultsCount");
  const shortlistBadge = document.getElementById("shortlistBadge");
  const shortlistCard = document.getElementById("shortlistCard");
  const shortlistList = document.getElementById("shortlistList");

  let currentStyle = "modern";
  const shortlist = [];

  styleChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      styleChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      currentStyle = chip.dataset.style;
    });
  });

  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard")).catch(() => showToast("Could not copy"));
  }

  function renderResults(items) {
    resultsGrid.innerHTML = "";
    if (!items.length) {
      resultsCount.textContent = "No results, try a different keyword or style";
      return;
    }
    resultsCount.textContent = items.length + " ideas \u00b7 style: " + capitalize(currentStyle);
    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "card name-card";
      const isStarred = shortlist.some((s) => s.name === item.name);
      card.innerHTML =
        '<div class="name-card-head"><h3>' + escapeHtml(item.name) + '</h3>' +
        '<button class="star-btn' + (isStarred ? " starred" : "") + '" aria-label="Add to shortlist" title="Add to shortlist">' +
        '<svg viewBox="0 0 24 24" fill="none"><path d="M12 17.3 6.2 20.6l1.1-6.5L2.6 9.7l6.6-1L12 2.8l2.8 5.9 6.6 1-4.7 4.4 1.1 6.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
        '</button></div>' +
        '<p class="slogan">' + escapeHtml(item.slogan) + '</p>' +
        '<div class="name-card-actions">' +
        '<button class="btn btn-ghost btn-sm copy-name-btn">Copy name</button>' +
        '<button class="btn btn-ghost btn-sm copy-both-btn">Copy both</button>' +
        '</div>';

      card.querySelector(".star-btn").addEventListener("click", (e) => toggleShortlist(item, e.currentTarget));
      card.querySelector(".copy-name-btn").addEventListener("click", () => copyText(item.name));
      card.querySelector(".copy-both-btn").addEventListener("click", () => copyText(item.name + " \u2014 " + item.slogan));

      resultsGrid.appendChild(card);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function toggleShortlist(item, btn) {
    const idx = shortlist.findIndex((s) => s.name === item.name);
    if (idx >= 0) {
      shortlist.splice(idx, 1);
      btn.classList.remove("starred");
    } else {
      shortlist.push(item);
      btn.classList.add("starred");
    }
    renderShortlist();
  }

  function renderShortlist() {
    shortlistBadge.style.display = shortlist.length ? "flex" : "none";
    shortlistBadge.textContent = String(shortlist.length);
    shortlistCard.style.display = shortlist.length ? "block" : "none";
    shortlistList.innerHTML = "";
    if (!shortlist.length) return;
    shortlist.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML =
        '<div class="li-main"><b>' + escapeHtml(item.name) + '</b><span>' + escapeHtml(item.slogan) + '</span></div>' +
        '<button aria-label="Copy" title="Copy">' +
        '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><rect x="9" y="9" width="11" height="11" rx="1.6" stroke="currentColor" stroke-width="1.6"/><path d="M5 15V5a1 1 0 0 1 1-1h10" stroke="currentColor" stroke-width="1.6"/></svg>' +
        '</button>';
      li.querySelector("button").addEventListener("click", () => copyText(item.name + " \u2014 " + item.slogan));
      shortlistList.appendChild(li);
    });
  }

  document.getElementById("clearShortlistBtn").addEventListener("click", () => {
    shortlist.length = 0;
    renderShortlist();
    document.querySelectorAll(".star-btn").forEach((b) => b.classList.remove("starred"));
  });

  document.getElementById("shortlistBtn").addEventListener("click", () => {
    shortlistCard.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function runGenerate() {
    const keyword = keywordInput.value;
    const count = parseInt(nameCountSelect.value, 10);
    const oneWord = optOneWord.checked;
    const includeKeyword = optIncludeKeyword.checked;
    const items = generateSet(keyword, currentStyle, count, oneWord, includeKeyword);
    renderResults(items);
  }

  document.getElementById("generateBtn").addEventListener("click", runGenerate);
  document.getElementById("regenerateBtn").addEventListener("click", runGenerate);
  document.getElementById("heroGenerateBtn").addEventListener("click", () => {
    document.getElementById("workspace").scrollIntoView({ behavior: "smooth", block: "start" });
    keywordInput.focus();
    runGenerate();
  });
  document.getElementById("learnMoreBtn").addEventListener("click", () => {
    document.getElementById("how-it-works").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  keywordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runGenerate();
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runGenerate();
    }
  });

  /* ================= FAQ ACCORDION ================= */
  document.querySelectorAll(".faq-q").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item").forEach((i) => {
        i.classList.remove("open");
        i.querySelector(".faq-q").setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ================= INITIAL STATE ================= */
  renderResults(generateSet("", "modern", 6, false, true));
})();