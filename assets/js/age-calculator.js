'use strict';

/* ==========================================================================
   DailyKitBox Age Calculator — age-calculator.js
   Vanilla JavaScript. No frameworks. No dependencies except jsPDF (CDN).
   ========================================================================== */

/* ==========================================================================
   1. UTILITIES
   ========================================================================== */
const $ = (id) => document.getElementById(id);

function isValidDate(d) {
  return d instanceof Date && !isNaN(d.getTime());
}

function parseDateInput(value) {
  if (!value) return null;
  const d = new Date(value + 'T00:00:00');
  return isValidDate(d) ? d : null;
}

function pad(n) { return String(n).padStart(2, '0'); }

function formatDate(d) {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function saveHistory(entry) {
  const list = JSON.parse(localStorage.getItem('dkbAgeHistory') || '[]');
  list.unshift({ ...entry, time: new Date().toISOString() });
  localStorage.setItem('dkbAgeHistory', JSON.stringify(list.slice(0, 20)));
  renderHistory();
}

function renderHistory() {
  const list = JSON.parse(localStorage.getItem('dkbAgeHistory') || '[]');
  const el = $('historyList');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<li class="ac-empty">No calculations yet.</li>';
    return;
  }
  el.innerHTML = list.map(item =>
    `<li><span>${item.label}</span><span>${new Date(item.time).toLocaleDateString()}</span></li>`
  ).join('');
}

function renderFavorites() {
  const list = JSON.parse(localStorage.getItem('dkbAgeFavorites') || '[]');
  const el = $('favoritesList');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<li class="ac-empty">No favorites saved yet.</li>';
    return;
  }
  el.innerHTML = list.map(item =>
    `<li><span>${item.label}</span><span>${new Date(item.time).toLocaleDateString()}</span></li>`
  ).join('');
}

/* ==========================================================================
   2. THEME TOGGLE (persisted)
   ========================================================================== */
const themeToggle = $('themeToggle');
const savedTheme = localStorage.getItem('dkbTheme');
if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
  if (themeToggle) themeToggle.setAttribute('aria-pressed', 'true');
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('dkbTheme', 'light');
      themeToggle.setAttribute('aria-pressed', 'false');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('dkbTheme', 'dark');
      themeToggle.setAttribute('aria-pressed', 'true');
    }
  });
}

/* ==========================================================================
   3. TABS
   ========================================================================== */
const tabs = document.querySelectorAll('.ac-tab');
const panels = document.querySelectorAll('.ac-panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    panels.forEach(p => { p.classList.remove('active'); p.hidden = true; });

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    const target = $(tab.dataset.target);
    target.classList.add('active');
    target.hidden = false;
  });
});

/* ==========================================================================
   4. HUMAN AGE ENGINE
   ========================================================================== */
const WESTERN_ZODIAC = [
  { name: 'Capricorn', from: [12, 22], to: [1, 19] },
  { name: 'Aquarius', from: [1, 20], to: [2, 18] },
  { name: 'Pisces', from: [2, 19], to: [3, 20] },
  { name: 'Aries', from: [3, 21], to: [4, 19] },
  { name: 'Taurus', from: [4, 20], to: [5, 20] },
  { name: 'Gemini', from: [5, 21], to: [6, 20] },
  { name: 'Cancer', from: [6, 21], to: [7, 22] },
  { name: 'Leo', from: [7, 23], to: [8, 22] },
  { name: 'Virgo', from: [8, 23], to: [9, 22] },
  { name: 'Libra', from: [9, 23], to: [10, 22] },
  { name: 'Scorpio', from: [10, 23], to: [11, 21] },
  { name: 'Sagittarius', from: [11, 22], to: [12, 21] }
];

const CHINESE_ZODIAC = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getWesternZodiac(month, day) {
  for (const z of WESTERN_ZODIAC) {
    const [fm, fd] = z.from;
    const [tm, td] = z.to;
    if (fm === tm) {
      if (month === fm && day >= fd && day <= td) return z.name;
    } else {
      if ((month === fm && day >= fd) || (month === tm && day <= td)) return z.name;
    }
  }
  return 'Capricorn';
}

function getChineseZodiac(year) {
  const idx = ((year - 1900) % 12 + 12) % 12;
  return CHINESE_ZODIAC[idx];
}

function getSeason(month, hemisphere) {
  const seasonsNorth = { 12: 'Winter', 1: 'Winter', 2: 'Winter', 3: 'Spring', 4: 'Spring', 5: 'Spring', 6: 'Summer', 7: 'Summer', 8: 'Summer', 9: 'Autumn', 10: 'Autumn', 11: 'Autumn' };
  const swap = { Winter: 'Summer', Summer: 'Winter', Spring: 'Autumn', Autumn: 'Spring' };
  const north = seasonsNorth[month];
  return hemisphere === 'south' ? swap[north] : north;
}

function getGeneration(year) {
  if (year >= 2013) return 'Generation Alpha';
  if (year >= 1997) return 'Generation Z';
  if (year >= 1981) return 'Millennial';
  if (year >= 1965) return 'Generation X';
  if (year >= 1946) return 'Baby Boomer';
  if (year >= 1928) return 'Silent Generation';
  return 'Greatest Generation';
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function reduceLifePathDigit(num) {
  while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
    num = String(num).split('').reduce((s, d) => s + Number(d), 0);
  }
  return num;
}

function getLifePathNumber(dob) {
  const digits = `${dob.getDate()}${dob.getMonth() + 1}${dob.getFullYear()}`;
  const sum = digits.split('').reduce((s, d) => s + Number(d), 0);
  return reduceLifePathDigit(sum);
}

function diffBreakdown(from, to) {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(to.getFullYear(), to.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalMs = to.getTime() - from.getTime();
  const totalSeconds = Math.floor(totalMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  const totalWeeks = Math.floor(totalDays / 7);

  return { years, months, days, totalWeeks, totalDays, totalHours, totalMinutes, totalSeconds };
}

function nextBirthday(dob, today) {
  let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (next.getTime() < today.getTime()) {
    next = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
  }
  const msLeft = next.getTime() - today.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const ageOnNext = next.getFullYear() - dob.getFullYear();
  return { next, daysLeft, ageOnNext };
}

let liveTicker = null;

function renderHumanAge(dob, targetDate, retirementAge, customLifespan, hemisphere) {
  const b = diffBreakdown(dob, targetDate);
  const grid = $('liveAgeGrid');
  grid.innerHTML = `
    <div class="ac-result-item"><strong id="rtYears">${b.years}</strong><span>Years</span></div>
    <div class="ac-result-item"><strong id="rtMonths">${b.years * 12 + b.months}</strong><span>Months</span></div>
    <div class="ac-result-item"><strong id="rtWeeks">${b.totalWeeks}</strong><span>Weeks</span></div>
    <div class="ac-result-item"><strong id="rtDays">${b.totalDays}</strong><span>Days</span></div>
    <div class="ac-result-item"><strong id="rtHours">${b.totalHours}</strong><span>Hours</span></div>
    <div class="ac-result-item"><strong id="rtMinutes">${b.totalMinutes}</strong><span>Minutes</span></div>
    <div class="ac-result-item"><strong id="rtSeconds">${b.totalSeconds}</strong><span>Seconds</span></div>
  `;

  const nb = nextBirthday(dob, targetDate);
  const weekday = WEEKDAYS[dob.getDay()];
  const season = getSeason(dob.getMonth() + 1, hemisphere);
  const western = getWesternZodiac(dob.getMonth() + 1, dob.getDate());
  const chinese = getChineseZodiac(dob.getFullYear());
  const lifePath = getLifePathNumber(dob);
  const leap = isLeapYear(dob.getFullYear()) ? 'Yes' : 'No';
  const generation = getGeneration(dob.getFullYear());
  const retireDate = new Date(dob.getFullYear() + Number(retirementAge), dob.getMonth(), dob.getDate());
  const retireMsLeft = retireDate.getTime() - targetDate.getTime();
  const retireText = retireMsLeft > 0
    ? `${Math.floor(retireMsLeft / (1000 * 60 * 60 * 24))} days left (on ${formatDate(retireDate)})`
    : 'Retirement age reached';
  const lifespanPct = Math.min(100, ((b.totalDays / 365.2425) / Number(customLifespan)) * 100).toFixed(1);

  const detailGrid = $('detailGrid');
  detailGrid.innerHTML = `
    <div class="ac-detail-item"><span>Next birthday age</span><span>${nb.ageOnNext}</span></div>
    <div class="ac-detail-item"><span>Days until birthday</span><span>${nb.daysLeft} days</span></div>
    <div class="ac-detail-item"><span>Born on</span><span>${weekday}</span></div>
    <div class="ac-detail-item"><span>Birth season</span><span>${season}</span></div>
    <div class="ac-detail-item"><span>Western zodiac</span><span>${western}</span></div>
    <div class="ac-detail-item"><span>Chinese zodiac</span><span>${chinese}</span></div>
    <div class="ac-detail-item"><span>Life path number</span><span>${lifePath}</span></div>
    <div class="ac-detail-item"><span>Leap year born</span><span>${leap}</span></div>
    <div class="ac-detail-item"><span>Generation</span><span>${generation}</span></div>
    <div class="ac-detail-item"><span>Retirement countdown</span><span>${retireText}</span></div>
    <div class="ac-detail-item"><span>% of ${customLifespan}-year lifespan</span><span>${lifespanPct}%</span></div>
  `;

  $('humanResults').classList.remove('ac-hidden');

  if (liveTicker) clearInterval(liveTicker);
  const isLiveable = targetDate.toDateString() === new Date().toDateString();
  if (isLiveable) {
    liveTicker = setInterval(() => {
      const now = new Date();
      const lb = diffBreakdown(dob, now);
      $('rtSeconds').textContent = lb.totalSeconds;
      $('rtMinutes').textContent = lb.totalMinutes;
      $('rtHours').textContent = lb.totalHours;
      $('rtDays').textContent = lb.totalDays;
      $('rtWeeks').textContent = lb.totalWeeks;
    }, 1000);
  }

  return { b, nb, weekday, season, western, chinese, lifePath, leap, generation, retireText, lifespanPct };
}

const humanForm = $('humanForm');
if (humanForm) {
  humanForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const dob = parseDateInput($('dob').value);
    const dobError = $('dobError');
    dobError.textContent = '';

    if (!dob) {
      dobError.textContent = 'Please enter a valid date of birth.';
      return;
    }
    if (dob.getTime() > new Date().getTime()) {
      dobError.textContent = 'Date of birth cannot be in the future.';
      return;
    }

    const targetVal = $('targetDate').value;
    const targetDate = targetVal ? parseDateInput(targetVal) : new Date();
    const retirementAge = $('retirementAge').value || 65;
    const customLifespan = $('customLifespan').value || 100;
    const hemisphere = $('hemisphere').value;

    const result = renderHumanAge(dob, targetDate, retirementAge, customLifespan, hemisphere);
    saveHistory({ label: `Age on ${formatDate(targetDate)}: ${result.b.years}y ${result.b.months}m ${result.b.days}d` });
  });
}

$('resetHuman')?.addEventListener('click', () => {
  humanForm.reset();
  $('humanResults').classList.add('ac-hidden');
  if (liveTicker) clearInterval(liveTicker);
});

/* ==========================================================================
   5. AGE DIFFERENCE BETWEEN TWO PEOPLE
   ========================================================================== */
$('diffForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const a = parseDateInput($('dobA').value);
  const b = parseDateInput($('dobB').value);
  const out = $('diffResult');
  if (!a || !b) { out.textContent = 'Please enter both valid dates.'; return; }

  const older = a < b ? a : b;
  const younger = a < b ? b : a;
  const d = diffBreakdown(older, younger);
  out.textContent = `The age difference is ${d.years} years, ${d.months} months and ${d.days} days.`;
});

/* ==========================================================================
   6. RESULT ACTIONS: COPY / PRINT / PDF / SHARE / FAVORITE
   ========================================================================== */
function getResultsText() {
  const live = $('liveAgeGrid')?.innerText || '';
  const detail = $('detailGrid')?.innerText || '';
  return `DailyKitBox Age Calculator Result\n\n${live}\n\n${detail}`;
}

$('copyHuman')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(getResultsText());
    const btn = $('copyHuman');
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = original; }, 1500);
  } catch (err) {
    alert('Unable to copy. Please copy manually.');
  }
});

$('printHuman')?.addEventListener('click', () => window.print());

$('pdfHuman')?.addEventListener('click', () => {
  if (typeof window.jspdf === 'undefined') {
    alert('PDF library failed to load. Please check your connection.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('DailyKitBox Age Calculator Result', 15, 20);
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(getResultsText(), 180);
  doc.text(lines, 15, 35);
  doc.save('DailyKitBox-Age-Result.pdf');
});

$('shareHuman')?.addEventListener('click', async () => {
  const text = getResultsText();
  if (navigator.share) {
    try {
      await navigator.share({ title: 'My Age Result', text });
    } catch (err) {
      /* user cancelled share — no action needed */
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

$('favHuman')?.addEventListener('click', () => {
  const list = JSON.parse(localStorage.getItem('dkbAgeFavorites') || '[]');
  list.unshift({ label: getResultsText().split('\n')[2] || 'Age result', time: new Date().toISOString() });
  localStorage.setItem('dkbAgeFavorites', JSON.stringify(list.slice(0, 20)));
  renderFavorites();
});

$('clearHistory')?.addEventListener('click', () => {
  localStorage.removeItem('dkbAgeHistory');
  renderHistory();
});

/* ==========================================================================
   7. PET & ANIMAL AGE CONVERTER
   ========================================================================== */
const ANIMAL_LIFESPANS = {
  dog: 13, cat: 15, horse: 28, cow: 20, buffalo: 25, goat: 15, sheep: 12, rabbit: 9,
  camel: 40, donkey: 33, elephant: 60, lion: 14, tiger: 16, leopard: 17, wolf: 13,
  fox: 5, bear: 25, monkey: 20, chimpanzee: 40, gorilla: 40, panda: 20, koala: 13,
  kangaroo: 8, deer: 11, moose: 15, pig: 15, chicken: 7, duck: 8, turkey: 10,
  goose: 20, parrot: 50, eagle: 20, falcon: 15, owl: 15, pigeon: 6, fish: 5,
  goldfish: 10, shark: 25, dolphin: 40, whale: 70, octopus: 2, turtle: 60,
  snake: 15, lizard: 8, crocodile: 60, alligator: 50, frog: 8, toad: 10,
  hamster: 2.5, guineapig: 6, ferret: 8, mouse: 2, rat: 2.5, hedgehog: 5
};

const ANIMAL_LABELS = {
  dog: 'Dog', cat: 'Cat', horse: 'Horse', cow: 'Cow', buffalo: 'Buffalo', goat: 'Goat',
  sheep: 'Sheep', rabbit: 'Rabbit', camel: 'Camel', donkey: 'Donkey', elephant: 'Elephant',
  lion: 'Lion', tiger: 'Tiger', leopard: 'Leopard', wolf: 'Wolf', fox: 'Fox', bear: 'Bear',
  monkey: 'Monkey', chimpanzee: 'Chimpanzee', gorilla: 'Gorilla', panda: 'Panda', koala: 'Koala',
  kangaroo: 'Kangaroo', deer: 'Deer', moose: 'Moose', pig: 'Pig', chicken: 'Chicken', duck: 'Duck',
  turkey: 'Turkey', goose: 'Goose', parrot: 'Parrot', eagle: 'Eagle', falcon: 'Falcon', owl: 'Owl',
  pigeon: 'Pigeon', fish: 'Fish (general)', goldfish: 'Goldfish', shark: 'Shark', dolphin: 'Dolphin',
  whale: 'Whale', octopus: 'Octopus', turtle: 'Turtle', snake: 'Snake', lizard: 'Lizard',
  crocodile: 'Crocodile', alligator: 'Alligator', frog: 'Frog', toad: 'Toad', hamster: 'Hamster',
  guineapig: 'Guinea Pig', ferret: 'Ferret', mouse: 'Mouse', rat: 'Rat', hedgehog: 'Hedgehog'
};

const speciesSelect = $('species');
if (speciesSelect) {
  const formulaSpecies = ['dog', 'cat', 'horse', 'rabbit'];
  const optionsHtml = Object.keys(ANIMAL_LABELS).map(key => {
    const tag = formulaSpecies.includes(key) ? ' (chart-based)' : '';
    return `<option value="${key}">${ANIMAL_LABELS[key]}${tag}</option>`;
  }).join('');
  speciesSelect.innerHTML = optionsHtml;
}

const DOG_SIZE_TABLE = {
  small: [15, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80],
  medium: [15, 24, 29, 34, 38, 42, 47, 51, 56, 60, 65, 69, 74, 78, 83, 87],
  large: [15, 24, 30, 36, 41, 46, 52, 58, 64, 70, 76, 82, 88, 94, 100, 106],
  giant: [15, 24, 31, 38, 45, 52, 60, 68, 76, 84, 92, 100, 108, 116, 124, 132]
};

function convertDogAge(age, size) {
  const table = DOG_SIZE_TABLE[size] || DOG_SIZE_TABLE.medium;
  const wholeYears = Math.floor(age);
  if (wholeYears <= 0) return Math.round((age / 1) * table[0]);
  if (wholeYears >= table.length) {
    const perYear = size === 'small' ? 4 : size === 'medium' ? 4.3 : size === 'large' ? 5.5 : 7;
    return Math.round(table[table.length - 1] + (wholeYears - table.length + 1) * perYear);
  }
  const base = table[wholeYears - 1];
  const next = table[wholeYears] || (base + 4);
  return Math.round(base + (next - base) * (age - wholeYears));
}

function convertCatAge(age) {
  if (age <= 0) return Math.round(age * 15);
  if (age <= 1) return Math.round(15 * age);
  if (age <= 2) return Math.round(15 + 9 * (age - 1));
  return Math.round(24 + 4 * (age - 2));
}

function convertHorseAge(age) {
  if (age <= 1) return Math.round(age * 12);
  return Math.round(12 + (age - 1) * 2.5);
}

function convertRabbitAge(age) {
  if (age <= 1) return Math.round(age * 21);
  return Math.round(21 + (age - 1) * 6);
}

function convertGenericAnimalAge(age, species) {
  const lifespan = ANIMAL_LIFESPANS[species] || 15;
  const ratio = age / lifespan;
  return Math.round(Math.min(ratio, 6) * 80);
}

$('species')?.addEventListener('change', () => {
  const dogField = $('dogSizeField');
  if ($('species').value === 'dog') {
    dogField.classList.remove('ac-hidden');
  } else {
    dogField.classList.add('ac-hidden');
  }
});

$('petForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const species = $('species').value;
  const years = parseFloat($('petAge').value) || 0;
  const months = parseFloat($('petMonths').value) || 0;
  const totalAge = years + months / 12;
  const resultBox = $('petResult');

  if (totalAge < 0) {
    resultBox.innerHTML = '<p class="ac-error">Please enter a valid age.</p>';
    resultBox.classList.remove('ac-hidden');
    return;
  }

  let humanAge;
  let methodNote;

  if (species === 'dog') {
    const size = $('dogSize').value;
    humanAge = convertDogAge(totalAge, size);
    methodNote = 'Based on the AKC-style size-adjusted dog aging chart.';
  } else if (species === 'cat') {
    humanAge = convertCatAge(totalAge);
    methodNote = 'Based on the commonly used veterinary cat aging chart.';
  } else if (species === 'horse') {
    humanAge = convertHorseAge(totalAge);
    methodNote = 'Based on typical equine aging guidelines.';
  } else if (species === 'rabbit') {
    humanAge = convertRabbitAge(totalAge);
    methodNote = 'Based on typical rabbit aging guidelines.';
  } else {
    humanAge = convertGenericAnimalAge(totalAge, species);
    methodNote = `Estimated using ${ANIMAL_LABELS[species]}'s average lifespan of ${ANIMAL_LIFESPANS[species]} years, scaled to an 80-year human life. This is a general estimate, not a scientific formula.`;
  }

  resultBox.innerHTML = `
    <h3>${ANIMAL_LABELS[species]} Age Result</h3>
    <p><strong>${totalAge.toFixed(1)} ${ANIMAL_LABELS[species]} years</strong> is approximately <strong>${humanAge} human years</strong>.</p>
    <p>${methodNote}</p>
  `;
  resultBox.classList.remove('ac-hidden');
  saveHistory({ label: `${ANIMAL_LABELS[species]} age ${totalAge.toFixed(1)}y → ${humanAge} human years` });
});

/* ==========================================================================
   8. DATE & TIME TOOLS
   ========================================================================== */
$('dateDiffForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const from = parseDateInput($('dateFrom').value);
  const to = parseDateInput($('dateTo').value);
  const out = $('dateDiffResult');
  if (!from || !to) { out.textContent = 'Please enter both valid dates.'; return; }
  const older = from < to ? from : to;
  const newer = from < to ? to : from;
  const d = diffBreakdown(older, newer);
  out.textContent = `Difference: ${d.years} years, ${d.months} months, ${d.days} days (${d.totalDays} total days).`;
});

$('timeDiffForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const fromVal = $('timeFrom').value;
  const toVal = $('timeTo').value;
  const out = $('timeDiffResult');
  if (!fromVal || !toVal) { out.textContent = 'Please enter both times.'; return; }

  const [fh, fm] = fromVal.split(':').map(Number);
  const [th, tm] = toVal.split(':').map(Number);
  let fromMinutes = fh * 60 + fm;
  let toMinutes = th * 60 + tm;
  let diff = toMinutes - fromMinutes;
  if (diff < 0) diff += 24 * 60;

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  out.textContent = `Time difference: ${hours} hours and ${minutes} minutes.`;
});

$('anniversaryForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const date = parseDateInput($('anniversaryDate').value);
  const out = $('anniversaryResult');
  if (!date) { out.textContent = 'Please enter a valid date.'; return; }
  const today = new Date();
  const d = diffBreakdown(date, today);
  const nb = nextBirthday(date, today);
  out.textContent = `${d.years} years, ${d.months} months and ${d.days} days have passed since this date. Next anniversary in ${nb.daysLeft} days.`;
});

$('pregnancyForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const lmp = parseDateInput($('lmpDate').value);
  const out = $('pregnancyResult');
  if (!lmp) { out.textContent = 'Please enter a valid date.'; return; }
  const dueDate = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
  const today = new Date();
  const weeksPregnant = Math.floor((today.getTime() - lmp.getTime()) / (7 * 24 * 60 * 60 * 1000));
  out.textContent = `Estimated due date: ${formatDate(dueDate)}. You are approximately ${Math.max(0, weeksPregnant)} weeks along.`;
});

$('babyForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const dob = parseDateInput($('babyDob').value);
  const out = $('babyResult');
  if (!dob) { out.textContent = 'Please enter a valid date of birth.'; return; }
  const today = new Date();
  const d = diffBreakdown(dob, today);
  const totalWeeks = Math.floor(d.totalDays / 7);
  out.textContent = `Baby is ${d.years} years, ${d.months} months and ${d.days} days old (${totalWeeks} weeks, ${d.totalDays} total days).`;
});

$('schoolForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const dob = parseDateInput($('schoolDob').value);
  const cutoff = parseDateInput($('cutoffDate').value);
  const out = $('schoolResult');
  if (!dob || !cutoff) { out.textContent = 'Please enter both valid dates.'; return; }
  const d = diffBreakdown(dob, cutoff);
  out.textContent = `Child will be ${d.years} years and ${d.months} months old on the school cutoff date (${formatDate(cutoff)}).`;
});

$('historyForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const dob = parseDateInput($('histDob').value);
  const event = parseDateInput($('histEvent').value);
  const out = $('histResult');
  if (!dob || !event) { out.textContent = 'Please enter both valid dates.'; return; }
  if (event < dob) {
    out.textContent = 'This event happened before the date of birth entered.';
    return;
  }
  const d = diffBreakdown(dob, event);
  out.textContent = `Age at the time of this event: ${d.years} years, ${d.months} months and ${d.days} days.`;
});
/* ==========================================================================
   9. PLANET AGE CALCULATOR
   ========================================================================== */
const PLANET_ORBITS_DAYS = {
  Mercury: 87.97,
  Venus: 224.70,
  Mars: 686.98,
  Jupiter: 4332.59,
  Saturn: 10759.22,
  Uranus: 30688.5,
  Neptune: 60182
};

$('planetForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const dob = parseDateInput($('planetDob').value);
  const grid = $('planetResult');
  if (!dob) return;
  const ageInDays = (new Date().getTime() - dob.getTime()) / (1000 * 60 * 60 * 24);

  grid.innerHTML = Object.entries(PLANET_ORBITS_DAYS).map(([planet, period]) => {
    const planetAge = (ageInDays / period).toFixed(2);
    return `<div class="ac-detail-item"><span>${planet}</span><span>${planetAge} ${planet.toLowerCase() === 'earth' ? 'years' : 'orbits'}</span></div>`;
  }).join('');
});

/* ==========================================================================
   10. RETIREMENT COUNTDOWN (standalone)
   ========================================================================== */
$('retireForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const dob = parseDateInput($('retireDob').value);
  const retireAge = Number($('retireAgeInput').value) || 65;
  const out = $('retireResult');
  if (!dob) { out.textContent = 'Please enter a valid date of birth.'; return; }
  const retireDate = new Date(dob.getFullYear() + retireAge, dob.getMonth(), dob.getDate());
  const today = new Date();
  if (retireDate <= today) {
    out.textContent = `Retirement age of ${retireAge} was reached on ${formatDate(retireDate)}.`;
    return;
  }
  const d = diffBreakdown(today, retireDate);
  out.textContent = `${d.years} years, ${d.months} months and ${d.days} days until retirement (on ${formatDate(retireDate)}).`;
});

/* ==========================================================================
   11. CUSTOM LIFESPAN PERCENTAGE
   ========================================================================== */
$('lifespanForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const dob = parseDateInput($('lifespanDob').value);
  const years = Number($('lifespanYears').value) || 100;
  const out = $('lifespanResult');
  if (!dob) { out.textContent = 'Please enter a valid date of birth.'; return; }
  const today = new Date();
  const d = diffBreakdown(dob, today);
  const currentAgeYears = d.years + d.months / 12;
  const pct = Math.min(100, (currentAgeYears / years) * 100).toFixed(1);
  out.textContent = `You have lived approximately ${pct}% of a ${years}-year lifespan.`;
});

/* ==========================================================================
   12. CELEBRITY / ANY PERSON AGE LOOKUP
   ========================================================================== */
$('celebForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('celebName').value.trim() || 'This person';
  const dob = parseDateInput($('celebDob').value);
  const out = $('celebResult');
  if (!dob) { out.textContent = 'Please enter a valid date of birth.'; return; }
  const today = new Date();
  const d = diffBreakdown(dob, today);
  out.textContent = `${name} is ${d.years} years, ${d.months} months and ${d.days} days old.`;
  saveHistory({ label: `${name}: ${d.years}y ${d.months}m ${d.days}d` });
});

/* ==========================================================================
   13. KEYBOARD SHORTCUTS
   ========================================================================== */
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'p') {
    // allow native print, no override needed
    return;
  }
  if (e.altKey && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    themeToggle?.click();
  }
});

/* ==========================================================================
   14. INIT
   ========================================================================== */
renderHistory();
renderFavorites();

if ($('targetDate')) {
  const todayStr = new Date().toISOString().split('T')[0];
  $('targetDate').setAttribute('max', todayStr);
  $('dob').setAttribute('max', todayStr);
}