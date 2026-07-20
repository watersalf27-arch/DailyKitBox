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

  /* ================= TABS ================= */
  const tabGenerateBtn = document.getElementById("tabGenerateBtn");
  const tabCheckBtn = document.getElementById("tabCheckBtn");
  const generatePanel = document.getElementById("generatePanel");
  const checkPanel = document.getElementById("checkPanel");

  function setTab(tab) {
    const isGenerate = tab === "generate";
    tabGenerateBtn.classList.toggle("active", isGenerate);
    tabCheckBtn.classList.toggle("active", !isGenerate);
    generatePanel.style.display = isGenerate ? "flex" : "none";
    checkPanel.style.display = isGenerate ? "none" : "flex";
  }
  tabGenerateBtn.addEventListener("click", () => setTab("generate"));
  tabCheckBtn.addEventListener("click", () => setTab("check"));
  document.getElementById("heroGenerateBtn").addEventListener("click", () => {
    setTab("generate");
    document.getElementById("workspace").scrollIntoView({ behavior: "smooth", block: "start" });
    generatePassword();
  });
  document.getElementById("learnMoreBtn").addEventListener("click", () => {
    document.getElementById("how-it-works").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ================= COMMON CHARACTER SETS ================= */
  const SETS = {
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lower: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    symbols: "!@#$%^&*()-_=+[]{};:,.<>?/",
  };
  const AMBIGUOUS = "lI1O0";

  const COMMON_PASSWORDS = new Set([
    "123456", "password", "123456789", "12345678", "12345", "qwerty",
    "abc123", "111111", "123123", "admin", "letmein", "welcome",
    "monkey", "iloveyou", "dragon", "password1", "qwerty123", "000000",
    "1q2w3e4r", "football"
  ]);

  /* ================= SECURE RANDOM HELPERS ================= */
  function secureRandomInt(max) {
    const arr = new Uint32Array(1);
    const limit = Math.floor(0xFFFFFFFF / max) * max;
    let val;
    do {
      crypto.getRandomValues(arr);
      val = arr[0];
    } while (val >= limit);
    return val % max;
  }

  function pickRandomChar(pool) {
    return pool[secureRandomInt(pool.length)];
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = secureRandomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ================= GENERATOR ================= */
  const lengthRange = document.getElementById("lengthRange");
  const lengthValue = document.getElementById("lengthValue");
  const optUpper = document.getElementById("optUpper");
  const optLower = document.getElementById("optLower");
  const optNumbers = document.getElementById("optNumbers");
  const optSymbols = document.getElementById("optSymbols");
  const optAmbiguous = document.getElementById("optAmbiguous");
  const optPronounceable = document.getElementById("optPronounceable");
  const passwordOutput = document.getElementById("passwordOutput");
  const genMeterFill = document.getElementById("genMeterFill");
  const genMeterLabel = document.getElementById("genMeterLabel");
  const historyList = document.getElementById("historyList");
  const history = [];

  lengthRange.addEventListener("input", () => { lengthValue.textContent = lengthRange.value; });

  function buildPool() {
    let pool = "";
    if (optUpper.checked) pool += SETS.upper;
    if (optLower.checked) pool += SETS.lower;
    if (optNumbers.checked) pool += SETS.numbers;
    if (optSymbols.checked) pool += SETS.symbols;
    if (optAmbiguous.checked) {
      pool = pool.split("").filter((c) => !AMBIGUOUS.includes(c)).join("");
    }
    return pool;
  }

  const VOWELS = "aeiou";
  const CONSONANTS = "bcdfghjklmnpqrstvwxyz";
  function generatePronounceable(length) {
    let out = "";
    let useConsonant = secureRandomInt(2) === 0;
    while (out.length < length) {
      out += useConsonant ? pickRandomChar(CONSONANTS) : pickRandomChar(VOWELS);
      useConsonant = !useConsonant;
    }
    out = out.slice(0, length);
    // Sprinkle in a number and a symbol/uppercase to keep it useful, respecting toggles
    let chars = out.split("");
    if (optUpper.checked && chars.length) {
      const idx = secureRandomInt(chars.length);
      chars[idx] = chars[idx].toUpperCase();
    }
    if (optNumbers.checked && chars.length > 1) {
      chars[chars.length - 1] = pickRandomChar(SETS.numbers);
    }
    if (optSymbols.checked && chars.length > 2) {
      chars[chars.length - 2] = pickRandomChar(SETS.symbols);
    }
    return chars.join("");
  }

  function generatePassword() {
    const length = parseInt(lengthRange.value, 10);

    if (optPronounceable.checked) {
      const pw = generatePronounceable(length);
      passwordOutput.value = pw;
      updateGenMeter(pw);
      pushHistory(pw);
      return;
    }

    const pool = buildPool();
    if (!pool) {
      showToast("Select at least one character type");
      return;
    }

    // Guarantee at least one char from each selected set
    const mandatory = [];
    if (optUpper.checked) mandatory.push(pickRandomChar(SETS.upper));
    if (optLower.checked) mandatory.push(pickRandomChar(SETS.lower));
    if (optNumbers.checked) mandatory.push(pickRandomChar(SETS.numbers));
    if (optSymbols.checked) mandatory.push(pickRandomChar(SETS.symbols));

    const chars = mandatory.slice(0, length);
    while (chars.length < length) {
      chars.push(pickRandomChar(pool));
    }
    const pw = shuffle(chars).join("");
    passwordOutput.value = pw;
    updateGenMeter(pw);
    pushHistory(pw);
  }

  function pushHistory(pw) {
    history.unshift(pw);
    if (history.length > 6) history.pop();
    renderHistory();
  }

  function renderHistory() {
    historyList.innerHTML = "";
    if (!history.length) {
      historyList.innerHTML = '<li class="history-empty" style="background:none;border:none;">Nothing generated yet</li>';
      return;
    }
    history.forEach((pw) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = pw;
      const btn = document.createElement("button");
      btn.setAttribute("aria-label", "Copy this password");
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><rect x="9" y="9" width="11" height="11" rx="1.6" stroke="currentColor" stroke-width="1.6"/><path d="M5 15V5a1 1 0 0 1 1-1h10" stroke="currentColor" stroke-width="1.6"/></svg>';
      btn.addEventListener("click", () => copyText(pw));
      li.appendChild(span);
      li.appendChild(btn);
      historyList.appendChild(li);
    });
  }
  renderHistory();

  document.getElementById("clearHistoryBtn").addEventListener("click", () => {
    history.length = 0;
    renderHistory();
  });

  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard")).catch(() => showToast("Could not copy"));
  }

  document.getElementById("generateBtn").addEventListener("click", generatePassword);
  document.getElementById("regenBtn").addEventListener("click", generatePassword);
  document.getElementById("copyBtn").addEventListener("click", () => {
    if (!passwordOutput.value || passwordOutput.value === "Click generate to start") {
      showToast("Generate a password first");
      return;
    }
    copyText(passwordOutput.value);
  });
/* ================= STRENGTH SCORING (shared) ================= */
  function analyzeStrength(pw) {
    const length = pw.length;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSymbol = /[^A-Za-z0-9]/.test(pw);
    const typesUsed = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;

    let poolSize = 0;
    if (hasUpper) poolSize += 26;
    if (hasLower) poolSize += 26;
    if (hasNumber) poolSize += 10;
    if (hasSymbol) poolSize += 32;
    if (poolSize === 0) poolSize = 1;

    const entropy = length > 0 ? length * Math.log2(poolSize) : 0;

    const isCommon = COMMON_PASSWORDS.has(pw.toLowerCase());
    const hasSequential = /(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf|zxcv)/i.test(pw);
    const hasRepeats = /(.)\1{2,}/.test(pw);

    let score = entropy;
    if (isCommon) score = Math.min(score, 10);
    if (hasSequential) score -= 12;
    if (hasRepeats) score -= 10;
    score = Math.max(0, score);

    let label, pct, color;
    if (isCommon || score < 28) { label = "Very weak"; pct = 15; color = "var(--danger)"; }
    else if (score < 40) { label = "Weak"; pct = 35; color = "var(--danger)"; }
    else if (score < 60) { label = "Fair"; pct = 55; color = "var(--warn)"; }
    else if (score < 80) { label = "Good"; pct = 75; color = "var(--good)"; }
    else if (score < 100) { label = "Strong"; pct = 90; color = "var(--good)"; }
    else { label = "Very strong"; pct = 100; color = "var(--good)"; }

    // Estimated offline crack time at 10 billion guesses/sec
    const guessesPerSecond = 1e10;
    const combinations = Math.pow(2, entropy);
    const seconds = combinations / guessesPerSecond;
    const crackTime = formatDuration(seconds);

    return {
      length, hasUpper, hasLower, hasNumber, hasSymbol, typesUsed,
      entropy, isCommon, hasSequential, hasRepeats,
      label, pct, color, crackTime,
    };
  }

  function formatDuration(seconds) {
    if (!isFinite(seconds) || seconds < 1) return "instantly";
    const units = [
      { label: "centuries", secs: 3153600000 },
      { label: "years", secs: 31536000 },
      { label: "days", secs: 86400 },
      { label: "hours", secs: 3600 },
      { label: "minutes", secs: 60 },
      { label: "seconds", secs: 1 },
    ];
    for (const u of units) {
      if (seconds >= u.secs) {
        const val = seconds / u.secs;
        if (val > 999999999) return "essentially uncrackable";
        return Math.round(val).toLocaleString() + " " + u.label;
      }
    }
    return "instantly";
  }

  function updateGenMeter(pw) {
    const r = analyzeStrength(pw);
    genMeterFill.style.width = r.pct + "%";
    genMeterFill.style.background = r.color;
    genMeterLabel.textContent = "Strength: " + r.label + " \u00b7 est. crack time " + r.crackTime;
  }

  /* ================= CHECKER PANEL ================= */
  const checkInput = document.getElementById("checkInput");
  const toggleVisibilityBtn = document.getElementById("toggleVisibilityBtn");
  const checkMeterFill = document.getElementById("checkMeterFill");
  const checkMeterLabel = document.getElementById("checkMeterLabel");
  const statLength = document.getElementById("statLength");
  const statTypes = document.getElementById("statTypes");
  const statEntropy = document.getElementById("statEntropy");
  const statCrack = document.getElementById("statCrack");
  const checklist = document.getElementById("checklist");

  toggleVisibilityBtn.addEventListener("click", () => {
    checkInput.type = checkInput.type === "password" ? "text" : "password";
  });

  function renderChecklist(pw, r) {
    const rows = [
      { pass: r.length >= 12, text: "At least 12 characters long" },
      { pass: r.hasUpper, text: "Contains an uppercase letter" },
      { pass: r.hasLower, text: "Contains a lowercase letter" },
      { pass: r.hasNumber, text: "Contains a number" },
      { pass: r.hasSymbol, text: "Contains a symbol" },
      { pass: !r.isCommon, text: "Not a commonly leaked password" },
      { pass: !r.hasSequential, text: "No obvious sequential pattern" },
      { pass: !r.hasRepeats, text: "No long repeated character runs" },
    ];
    checklist.innerHTML = "";
    rows.forEach((row) => {
      const div = document.createElement("div");
      div.className = "check-row " + (row.pass ? "pass" : "fail");
      const icon = row.pass
        ? '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
      div.innerHTML = '<span class="icon">' + icon + '</span><span class="txt">' + row.text + "</span>";
      checklist.appendChild(div);
    });
  }

  function updateChecker() {
    const pw = checkInput.value;
    if (!pw) {
      checkMeterFill.style.width = "0%";
      checkMeterLabel.textContent = "Strength: \u2014";
      statLength.textContent = "0";
      statTypes.textContent = "0";
      statEntropy.textContent = "\u2014";
      statCrack.textContent = "\u2014";
      checklist.innerHTML = "";
      return;
    }
    const r = analyzeStrength(pw);
    checkMeterFill.style.width = r.pct + "%";
    checkMeterFill.style.background = r.color;
    checkMeterLabel.textContent = "Strength: " + r.label;
    statLength.textContent = String(r.length);
    statTypes.textContent = r.typesUsed + " / 4";
    statEntropy.textContent = Math.round(r.entropy) + " bits";
    statCrack.textContent = r.crackTime;
    renderChecklist(pw, r);
  }
  checkInput.addEventListener("input", updateChecker);

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

  /* ================= KEYBOARD SHORTCUTS ================= */
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
      e.preventDefault();
      setTab("generate");
      generatePassword();
    }
  });
  document.getElementById("shortcutsBtn").addEventListener("click", () => {
    showToast("Ctrl+G to generate a password");
  });

  /* ================= INITIAL STATE ================= */
  generatePassword();
})();