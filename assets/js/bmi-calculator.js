(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * Theme handling (dark default, light optional) — degrades gracefully
   * if localStorage is unavailable (e.g. sandboxed preview environments)
   * ------------------------------------------------------------------- */
  var THEME_KEY = 'dkb-bmi-theme';
  var memoryTheme = null;

  function readStoredTheme() {
    try {
      return window.localStorage.getItem(THEME_KEY);
    } catch (e) {
      return memoryTheme;
    }
  }

  function writeStoredTheme(value) {
    memoryTheme = value;
    try {
      window.localStorage.setItem(THEME_KEY, value);
    } catch (e) {
      /* storage unavailable — in-memory value above still applies for this session */
    }
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    var toggle = document.getElementById('themeToggle');
    if (toggle) {
      var isLight = theme === 'light';
      toggle.setAttribute('aria-pressed', String(isLight));
      toggle.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    }
  }

  function initTheme() {
    var stored = readStoredTheme();
    if (stored === 'light' || stored === 'dark') {
      applyTheme(stored);
      return;
    }
    var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(prefersLight ? 'light' : 'dark');
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    var next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    writeStoredTheme(next);
  }

  /* ---------------------------------------------------------------------
   * Element references
   * ------------------------------------------------------------------- */
  var form = document.getElementById('bmiForm');
  var unitButtons = document.querySelectorAll('.unit-btn');
  var genderButtons = document.querySelectorAll('.pill-btn');
  var heightGroupMetric = document.getElementById('heightGroupMetric');
  var heightGroupImperial = document.getElementById('heightGroupImperial');
  var weightGroupMetric = document.getElementById('weightGroupMetric');
  var weightGroupImperial = document.getElementById('weightGroupImperial');

  var ageInput = document.getElementById('ageInput');
  var heightCmInput = document.getElementById('heightCm');
  var heightFtInput = document.getElementById('heightFt');
  var heightInInput = document.getElementById('heightIn');
  var weightKgInput = document.getElementById('weightKg');
  var weightLbsInput = document.getElementById('weightLbs');
  var activitySelect = document.getElementById('activityLevel');

  var resultEmpty = document.getElementById('resultEmpty');
  var resultContent = document.getElementById('resultContent');
  var gaugeValue = document.getElementById('gaugeValue');
  var gaugeNeedle = document.getElementById('gaugeNeedle');
  var bmiValueEl = document.getElementById('bmiValue');
  var categoryBadge = document.getElementById('categoryBadge');
  var statHealthyRange = document.getElementById('statHealthyRange');
  var statPrime = document.getElementById('statPrime');
  var statPonderal = document.getElementById('statPonderal');
  var statIdeal = document.getElementById('statIdeal');
  var statDelta = document.getElementById('statDelta');
  var statDeltaLabel = document.getElementById('statDeltaLabel');
  var tipsList = document.getElementById('tipsList');

  var bonusTools = document.getElementById('bonusTools');
  var bmrValueEl = document.getElementById('bmrValue');
  var tdeeValueEl = document.getElementById('tdeeValue');
  var waterValueEl = document.getElementById('waterValue');

  var resetBtn = document.getElementById('resetBtn');

  var currentUnit = 'metric';
  var currentGender = 'female';

  /* ---------------------------------------------------------------------
   * Unit + gender pill toggles
   * ------------------------------------------------------------------- */
  function setUnit(unit) {
    currentUnit = unit;
    unitButtons.forEach(function (btn) {
      var active = btn.getAttribute('data-unit') === unit;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', String(active));
    });
    if (unit === 'metric') {
      heightGroupMetric.classList.remove('is-hidden');
      weightGroupMetric.classList.remove('is-hidden');
      heightGroupImperial.classList.add('is-hidden');
      weightGroupImperial.classList.add('is-hidden');
    } else {
      heightGroupMetric.classList.add('is-hidden');
      weightGroupMetric.classList.add('is-hidden');
      heightGroupImperial.classList.remove('is-hidden');
      weightGroupImperial.classList.remove('is-hidden');
    }
  }

  function setGender(gender) {
    currentGender = gender;
    genderButtons.forEach(function (btn) {
      var active = btn.getAttribute('data-gender') === gender;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', String(active));
    });
  }

  unitButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setUnit(btn.getAttribute('data-unit'));
    });
  });

  genderButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setGender(btn.getAttribute('data-gender'));
    });
  });

  /* ---------------------------------------------------------------------
   * Formatting helpers
   * ------------------------------------------------------------------- */
  function round(value, decimals) {
    var factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  function fmt(value, decimals) {
    return round(value, decimals === undefined ? 1 : decimals).toFixed(decimals === undefined ? 1 : decimals);
  }

  function kgToLbs(kg) { return kg * 2.2046226218; }
  function lbsToKg(lbs) { return lbs * 0.45359237; }
  function cmToIn(cm) { return cm / 2.54; }

  /* ---------------------------------------------------------------------
   * Category classification
   * ------------------------------------------------------------------- */
  function classify(bmi) {
    if (bmi < 18.5) return { label: 'Underweight', zone: 'under' };
    if (bmi < 25) return { label: 'Normal weight', zone: 'normal' };
    if (bmi < 30) return { label: 'Overweight', zone: 'over' };
    if (bmi < 35) return { label: 'Obesity Class I', zone: 'obese' };
    if (bmi < 40) return { label: 'Obesity Class II', zone: 'obese' };
    return { label: 'Obesity Class III (Severe)', zone: 'severe' };
  }

  function tipsFor(zone) {
    if (zone === 'under') {
      return [
        'Aim for a modest calorie surplus with nutrient-dense foods rather than empty calories.',
        'Prioritize protein at each meal to support lean mass gain.',
        'Add resistance training 2–3x per week to build muscle, not just weight.',
        'Track progress over weeks, not days — weight can fluctuate daily.'
      ];
    }
    if (zone === 'normal') {
      return [
        'Maintain your current habits — consistency matters more than perfection.',
        'Stay hydrated and aim for regular movement most days of the week.',
        'Mix cardio and strength training to preserve muscle as you age.',
        'Recheck every few months rather than daily to track meaningful trends.'
      ];
    }
    if (zone === 'over') {
      return [
        'A modest, sustainable calorie deficit tends to work better long-term than crash diets.',
        'Add brisk walking or other low-impact cardio most days of the week.',
        'Include strength training to preserve muscle while losing fat.',
        'Focus on protein and fiber to help manage appetite naturally.'
      ];
    }
    return [
      'Consider speaking with a healthcare professional for a personalized plan.',
      'Sustainable, gradual weight management tends to outperform rapid extreme changes.',
      'Nutrition guidance from a registered dietitian can help build a realistic plan.',
      'Low-impact activity like walking or swimming is a good starting point if you\'re new to exercise.'
    ];
  }

  /* ---------------------------------------------------------------------
   * Gauge rendering
   * ------------------------------------------------------------------- */
  var GAUGE_ARC_LENGTH = 314.159; // half-circumference of r=100 semicircle
  var GAUGE_MIN_BMI = 15;
  var GAUGE_MAX_BMI = 40;

  function renderGauge(bmi) {
    var clamped = Math.max(GAUGE_MIN_BMI, Math.min(GAUGE_MAX_BMI, bmi));
    var fraction = (clamped - GAUGE_MIN_BMI) / (GAUGE_MAX_BMI - GAUGE_MIN_BMI);
    var offset = GAUGE_ARC_LENGTH * (1 - fraction);
    var angle = -90 + fraction * 180;

    // Force reflow so the transition replays on repeated calculations
    gaugeValue.style.transition = 'none';
    gaugeNeedle.style.transition = 'none';
    gaugeValue.style.strokeDashoffset = String(GAUGE_ARC_LENGTH);
    gaugeNeedle.style.transform = 'rotate(-90deg)';
    // eslint-disable-next-line no-unused-expressions
    gaugeValue.getBoundingClientRect();

    requestAnimationFrame(function () {
      gaugeValue.style.transition = '';
      gaugeNeedle.style.transition = '';
      gaugeValue.style.strokeDashoffset = String(offset);
      gaugeNeedle.style.transform = 'rotate(' + angle + 'deg)';
    });
  }

  /* ---------------------------------------------------------------------
   * Main calculation
   * ------------------------------------------------------------------- */
  function handleSubmit(event) {
    event.preventDefault();

    var age = parseFloat(ageInput.value);
    var heightCm, weightKg;

    if (currentUnit === 'metric') {
      heightCm = parseFloat(heightCmInput.value);
      weightKg = parseFloat(weightKgInput.value);
    } else {
      var ft = parseFloat(heightFtInput.value) || 0;
      var inch = parseFloat(heightInInput.value) || 0;
      heightCm = (ft * 12 + inch) * 2.54;
      weightKg = lbsToKg(parseFloat(weightLbsInput.value));
    }

    if (!age || age < 20 || age > 120 || !heightCm || heightCm < 90 || heightCm > 250 || !weightKg || weightKg < 20 || weightKg > 300) {
      resultEmpty.classList.remove('is-hidden');
      resultContent.classList.add('is-hidden');
      resultEmpty.querySelector('p').textContent = 'Please check your inputs — height, weight and age (20+) all need valid values.';
      bonusTools.classList.add('is-hidden');
      return;
    }

    var heightM = heightCm / 100;
    var bmi = weightKg / (heightM * heightM);
    var info = classify(bmi);
    var bmiPrime = bmi / 25;
    var ponderal = weightKg / (heightM * heightM * heightM);

    var healthyMinKg = 18.5 * heightM * heightM;
    var healthyMaxKg = 24.9 * heightM * heightM;

    var heightInches = cmToIn(heightCm);
    var idealKg;
    if (currentGender === 'male') {
      idealKg = 50 + 2.3 * ((heightInches - 60));
    } else {
      idealKg = 45.5 + 2.3 * ((heightInches - 60));
    }
    var idealValid = idealKg > 0;

    var deltaLabel, deltaText;
    if (bmi < 18.5) {
      var gainKg = healthyMinKg - weightKg;
      deltaLabel = 'Weight to gain for healthy range';
      deltaText = currentUnit === 'metric'
        ? fmt(gainKg, 1) + ' kg'
        : fmt(kgToLbs(gainKg), 1) + ' lbs';
    } else if (bmi >= 25) {
      var loseKg = weightKg - healthyMaxKg;
      deltaLabel = 'Weight to lose for healthy range';
      deltaText = currentUnit === 'metric'
        ? fmt(loseKg, 1) + ' kg'
        : fmt(kgToLbs(loseKg), 1) + ' lbs';
    } else {
      deltaLabel = 'Status';
      deltaText = 'You\'re within the healthy range';
    }

    // Populate UI
    bmiValueEl.textContent = fmt(bmi, 1);
    categoryBadge.textContent = info.label;
    categoryBadge.setAttribute('data-zone', info.zone);

    if (currentUnit === 'metric') {
      statHealthyRange.textContent = fmt(healthyMinKg, 1) + '–' + fmt(healthyMaxKg, 1) + ' kg';
      statIdeal.textContent = idealValid ? fmt(idealKg, 1) + ' kg' : 'N/A for this height';
    } else {
      statHealthyRange.textContent = fmt(kgToLbs(healthyMinKg), 1) + '–' + fmt(kgToLbs(healthyMaxKg), 1) + ' lbs';
      statIdeal.textContent = idealValid ? fmt(kgToLbs(idealKg), 1) + ' lbs' : 'N/A for this height';
    }
    statPrime.textContent = fmt(bmiPrime, 2);
    statPonderal.textContent = fmt(ponderal, 1) + ' kg/m³';
    statDeltaLabel.textContent = deltaLabel;
    statDelta.textContent = deltaText;

    tipsList.innerHTML = '';
    tipsFor(info.zone).forEach(function (tip) {
      var li = document.createElement('li');
      li.textContent = tip;
      tipsList.appendChild(li);
    });

    renderGauge(bmi);

    resultEmpty.classList.add('is-hidden');
    resultContent.classList.remove('is-hidden');

    // Bonus tools: BMR (Mifflin-St Jeor), TDEE, water intake
    var bmr;
    if (currentGender === 'male') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }
    var activityMultiplier = parseFloat(activitySelect.value) || 1.375;
    var tdee = bmr * activityMultiplier;
    var waterLiters = weightKg * 0.033;

    bmrValueEl.textContent = Math.round(bmr) + ' kcal/day';
    tdeeValueEl.textContent = Math.round(tdee) + ' kcal/day';
    waterValueEl.textContent = fmt(waterLiters, 1) + ' L/day';

    bonusTools.classList.remove('is-hidden');

    resultContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      form.reset();
      setUnit('metric');
      setGender('female');
      resultEmpty.classList.remove('is-hidden');
      resultEmpty.querySelector('p').textContent = 'Enter your details and hit Calculate BMI to see your results here.';
      resultContent.classList.add('is-hidden');
      bonusTools.classList.add('is-hidden');
    });
  }

  /* ---------------------------------------------------------------------
   * Share links
   * ------------------------------------------------------------------- */
  function initShareLinks() {
    var pageUrl = window.location.href;
    var pageTitle = document.title;
    var shareText = 'Free BMI, BMR and TDEE calculator — instant results, totally private.';
    var imageUrl = new URL('../assets/images/icons/bmi-calculator.svg', window.location.href).href;

    var links = {
      sharePinterest: 'https://www.pinterest.com/pin/create/button/?url=' + encodeURIComponent(pageUrl) + '&media=' + encodeURIComponent(imageUrl) + '&description=' + encodeURIComponent(shareText),
      shareFacebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(pageUrl),
      shareX: 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(pageUrl) + '&text=' + encodeURIComponent(shareText),
      shareLinkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(pageUrl),
      shareReddit: 'https://www.reddit.com/submit?url=' + encodeURIComponent(pageUrl) + '&title=' + encodeURIComponent(pageTitle),
      shareWhatsapp: 'https://wa.me/?text=' + encodeURIComponent(shareText + ' ' + pageUrl)
    };

    Object.keys(links).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.setAttribute('href', links[id]); }
    });
  }

  /* ---------------------------------------------------------------------
   * Copy embed link
   * ------------------------------------------------------------------- */
  function initCopyLink() {
    var copyBtn = document.getElementById('copyLinkBtn');
    var embedInput = document.getElementById('embedInput');
    var feedback = document.getElementById('copyFeedback');
    if (!copyBtn || !embedInput) return;

    copyBtn.addEventListener('click', function () {
      var text = embedInput.value;
      var showFeedback = function (message) {
        if (feedback) {
          feedback.textContent = message;
          setTimeout(function () { feedback.textContent = ''; }, 2500);
        }
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          showFeedback('Link copied to clipboard.');
        }, function () {
          fallbackCopy();
        });
      } else {
        fallbackCopy();
      }

      function fallbackCopy() {
        try {
          embedInput.removeAttribute('readonly');
          embedInput.select();
          embedInput.setSelectionRange(0, text.length);
          document.execCommand('copy');
          embedInput.setAttribute('readonly', '');
          showFeedback('Link copied to clipboard.');
        } catch (e) {
          showFeedback('Could not copy automatically — select the text and copy manually.');
        }
      }
    });
  }

  /* ---------------------------------------------------------------------
   * Init
   * ------------------------------------------------------------------- */
  function init() {
    initTheme();
    setUnit('metric');
    setGender('female');
    initShareLinks();
    initCopyLink();

    var themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }

    var footerYear = document.getElementById('footerYear');
    if (footerYear) {
      footerYear.textContent = String(new Date().getFullYear());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();