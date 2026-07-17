'use strict';

/* ==========================================================================
   DailyKitBox Tip Calculator — tip-calculator.js
   Vanilla JavaScript. No dependencies.
   ========================================================================== */

const $ = (id) => document.getElementById(id);

const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', INR: '₹', PKR: 'Rs'
};

/* ==========================================================================
   THEME (auto system detect + manual toggle, persisted)
   ========================================================================== */
const themeToggle = $('themeToggle');
const savedTheme = localStorage.getItem('tcTheme');

function applyTheme(mode) {
  if (mode === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle?.setAttribute('aria-pressed', 'true');
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeToggle?.setAttribute('aria-pressed', 'false');
  }
}

if (savedTheme) {
  applyTheme(savedTheme);
} else {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

themeToggle?.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('tcTheme', next);
});

/* ==========================================================================
   ELEMENTS
   ========================================================================== */
const currencySelect = $('currency');
const currencySymbolEl = $('currencySymbol');
const billInput = $('billAmount');
const billError = $('billError');
const tipSlider = $('tipSlider');
const tipPercentLabel = $('tipPercentLabel');
const customTipInput = $('customTipInput');
const customTipBtn = $('customTipBtn');
const chips = document.querySelectorAll('.tc-chip');
const peopleInput = $('peopleCount');
const peopleError = $('peopleError');
const peopleMinus = $('peopleMinus');
const peoplePlus = $('peoplePlus');
const roundingRadios = document.querySelectorAll('input[name="rounding"]');

const resTip = $('resTip');
const resTotal = $('resTotal');
const resPerPerson = $('resPerPerson');
const resTipPerPerson = $('resTipPerPerson');

let activeTipPercent = 18;
let customMode = false;

/* ==========================================================================
   NUMBER FORMATTING
   ========================================================================== */
function formatCurrency(value, currencyCode) {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || '$';
  const num = Number.isFinite(value) ? value : 0;
  const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol}${formatted}`;
}

/* ==========================================================================
   CURRENCY PERSISTENCE
   ========================================================================== */
function loadSavedState() {
  const savedCurrency = localStorage.getItem('tcCurrency');
  if (savedCurrency && CURRENCY_SYMBOLS[savedCurrency]) {
    currencySelect.value = savedCurrency;
  }
  currencySymbolEl.textContent = CURRENCY_SYMBOLS[currencySelect.value];

  const savedBill = localStorage.getItem('tcBill');
  if (savedBill) billInput.value = savedBill;

  const savedTip = localStorage.getItem('tcTip');
  if (savedTip) {
    activeTipPercent = Number(savedTip);
    tipSlider.value = activeTipPercent;
    tipPercentLabel.textContent = activeTipPercent;
  }

  const savedPeople = localStorage.getItem('tcPeople');
  if (savedPeople) peopleInput.value = savedPeople;

  const savedRounding = localStorage.getItem('tcRounding');
  if (savedRounding) {
    roundingRadios.forEach(r => { r.checked = r.value === savedRounding; });
  }

  syncChipActive();
}

function persistState() {
  localStorage.setItem('tcCurrency', currencySelect.value);
  localStorage.setItem('tcBill', billInput.value);
  localStorage.setItem('tcTip', String(activeTipPercent));
  localStorage.setItem('tcPeople', peopleInput.value);
  const checkedRounding = document.querySelector('input[name="rounding"]:checked');
  localStorage.setItem('tcRounding', checkedRounding ? checkedRounding.value : 'none');
}

/* ==========================================================================
   CHIP / SLIDER SYNC
   ========================================================================== */
function syncChipActive() {
  let matched = false;
  chips.forEach(chip => {
    if (chip.dataset.tip !== 'custom' && Number(chip.dataset.tip) === activeTipPercent) {
      chip.classList.add('active');
      matched = true;
    } else if (chip.dataset.tip !== 'custom') {
      chip.classList.remove('active');
    }
  });
  if (!matched) {
    customTipBtn.classList.add('active');
    customTipInput.classList.remove('tc-hidden');
    customTipInput.value = activeTipPercent;
  } else {
    customTipBtn.classList.remove('active');
    customTipInput.classList.add('tc-hidden');
  }
}

chips.forEach(chip => {
  chip.addEventListener('click', () => {
    if (chip.dataset.tip === 'custom') {
      customMode = true;
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      customTipInput.classList.remove('tc-hidden');
      customTipInput.focus();
      return;
    }
    customMode = false;
    activeTipPercent = Number(chip.dataset.tip);
    tipSlider.value = activeTipPercent;
    tipPercentLabel.textContent = activeTipPercent;
    customTipInput.classList.add('tc-hidden');
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    calculate();
  });
});

customTipInput.addEventListener('input', () => {
  const val = Math.min(100, Math.max(0, Number(customTipInput.value) || 0));
  activeTipPercent = val;
  tipSlider.value = val;
  tipPercentLabel.textContent = val;
  calculate();
});

tipSlider.addEventListener('input', () => {
  activeTipPercent = Number(tipSlider.value);
  tipPercentLabel.textContent = activeTipPercent;
  if (!customMode) {
    chips.forEach(chip => {
      if (chip.dataset.tip !== 'custom') {
        chip.classList.toggle('active', Number(chip.dataset.tip) === activeTipPercent);
      }
    });
  }
  calculate();
});

/* ==========================================================================
   PEOPLE STEPPER
   ========================================================================== */
peopleMinus.addEventListener('click', () => {
  const current = Math.max(1, Number(peopleInput.value) - 1);
  peopleInput.value = current;
  calculate();
});
peoplePlus.addEventListener('click', () => {
  const current = Math.min(100, Number(peopleInput.value) + 1);
  peopleInput.value = current;
  calculate();
});

/* ==========================================================================
   VALIDATION
   ========================================================================== */
function validateInputs() {
  let valid = true;
  billError.textContent = '';
  peopleError.textContent = '';

  const bill = Number(billInput.value);
  if (billInput.value !== '' && (isNaN(bill) || bill < 0)) {
    billError.textContent = 'Please enter a valid bill amount.';
    valid = false;
  }

  const people = Number(peopleInput.value);
  if (isNaN(people) || people < 1) {
    peopleError.textContent = 'At least 1 person is required.';
    peopleInput.value = 1;
  }

  return valid;
}

/* ==========================================================================
   ROUNDING
   ========================================================================== */
function applyRounding(tip, total, mode) {
  switch (mode) {
    case 'up-total':
      return { tip, total: Math.ceil(total) };
    case 'up-tip':
      return { tip: Math.ceil(tip), total: Math.ceil(tip) + (total - tip) };
    case 'down':
      return { tip: Math.floor(tip), total: Math.floor(total) };
    default:
      return { tip, total };
  }
}

/* ==========================================================================
   MAIN CALCULATION
   ========================================================================== */
function calculate() {
  validateInputs();

  const bill = Math.max(0, Number(billInput.value) || 0);
  const tipPercent = Math.max(0, Math.min(100, activeTipPercent));
  const people = Math.max(1, Number(peopleInput.value) || 1);
  const currency = currencySelect.value;
  const roundingMode = document.querySelector('input[name="rounding"]:checked')?.value || 'none';

  let tipAmount = bill * (tipPercent / 100);
  let totalAmount = bill + tipAmount;

  const rounded = applyRounding(tipAmount, totalAmount, roundingMode);
  tipAmount = rounded.tip;
  totalAmount = rounded.total;

  const perPerson = totalAmount / people;
  const tipPerPerson = tipAmount / people;

  resTip.textContent = formatCurrency(tipAmount, currency);
  resTotal.textContent = formatCurrency(totalAmount, currency);
  resPerPerson.textContent = formatCurrency(perPerson, currency);
  resTipPerPerson.textContent = formatCurrency(tipPerPerson, currency);

  currencySymbolEl.textContent = CURRENCY_SYMBOLS[currency];

  persistState();
}

/* ==========================================================================
   EVENT LISTENERS FOR LIVE CALCULATION
   ========================================================================== */
billInput.addEventListener('input', calculate);
peopleInput.addEventListener('input', calculate);
currencySelect.addEventListener('change', calculate);
roundingRadios.forEach(r => r.addEventListener('change', calculate));

/* ==========================================================================
   RESET
   ========================================================================== */
$('resetBtn').addEventListener('click', () => {
  billInput.value = '';
  peopleInput.value = 1;
  activeTipPercent = 18;
  tipSlider.value = 18;
  tipPercentLabel.textContent = 18;
  customTipInput.value = '';
  customTipInput.classList.add('tc-hidden');
  customMode = false;
  document.querySelector('input[name="rounding"][value="none"]').checked = true;
  chips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.tip === '18');
  });
  billError.textContent = '';
  peopleError.textContent = '';
  calculate();
});

/* ==========================================================================
   COPY / SHARE / PRINT
   ========================================================================== */
function getResultsText() {
  return `DailyKitBox Tip Calculator\n\nBill: ${billInput.value || '0.00'}\nTip: ${tipPercentLabel.textContent}%\nPeople: ${peopleInput.value}\n\nTip Amount: ${resTip.textContent}\nTotal Bill: ${resTotal.textContent}\nTotal per Person: ${resPerPerson.textContent}\nTip per Person: ${resTipPerPerson.textContent}`;
}

$('copyBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(getResultsText());
    const btn = $('copyBtn');
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = original; }, 1500);
  } catch (err) {
    alert('Unable to copy. Please copy manually.');
  }
});

$('shareBtn').addEventListener('click', async () => {
  const text = getResultsText();
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Tip Calculator Result', text });
    } catch (err) {
      /* user cancelled — no action needed */
    }
  } else {
    try {
      await navigator.clipboard.writeText(text);
      alert('Sharing is not supported on this browser. Result copied to clipboard instead.');
    } catch (err) {
      alert('Unable to share or copy on this browser.');
    }
  }
});

$('printBtn').addEventListener('click', () => window.print());

/* ==========================================================================
   INIT
   ========================================================================== */
loadSavedState();
calculate();