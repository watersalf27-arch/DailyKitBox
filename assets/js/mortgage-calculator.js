(function () {
  "use strict";

  /* ================= THEME ================= */
  const root = document.documentElement;
  function applyTheme(t) { root.setAttribute("data-theme", t); localStorage.setItem("dkb-theme", t); }
  applyTheme(localStorage.getItem("dkb-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  document.getElementById("themeToggle").addEventListener("click", () => {
    applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  /* ================= TOASTS ================= */
  const toastStack = document.getElementById("toastStack");
  function showToast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    toastStack.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  /* ================= CURRENCY ================= */
  const CURRENCIES = [
    ["USD", "US Dollar"], ["GBP", "British Pound"], ["EUR", "Euro"], ["CAD", "Canadian Dollar"],
    ["AUD", "Australian Dollar"], ["NZD", "New Zealand Dollar"], ["INR", "Indian Rupee"],
    ["PKR", "Pakistani Rupee"], ["BDT", "Bangladeshi Taka"], ["AED", "UAE Dirham"], ["SAR", "Saudi Riyal"],
    ["QAR", "Qatari Riyal"], ["JPY", "Japanese Yen"], ["SGD", "Singapore Dollar"], ["MYR", "Malaysian Ringgit"],
    ["IDR", "Indonesian Rupiah"], ["PHP", "Philippine Peso"], ["CNY", "Chinese Yuan"], ["ZAR", "South African Rand"],
    ["BRL", "Brazilian Real"], ["MXN", "Mexican Peso"], ["TRY", "Turkish Lira"], ["PLN", "Polish Zloty"],
    ["CHF", "Swiss Franc"], ["SEK", "Swedish Krona"], ["NOK", "Norwegian Krone"], ["DKK", "Danish Krone"],
  ];
  const currencySelect = document.getElementById("currencySelect");
  CURRENCIES.forEach(([code, label]) => {
    const opt = document.createElement("option");
    opt.value = code; opt.textContent = code + " \u2014 " + label;
    currencySelect.appendChild(opt);
  });
  let currency = localStorage.getItem("dkb-mortgage-currency") || "USD";
  currencySelect.value = currency;
  currencySelect.addEventListener("change", () => {
    currency = currencySelect.value;
    localStorage.setItem("dkb-mortgage-currency", currency);
    if (lastResult) renderResults(lastResult);
  });
  function fmt(amount, decimals) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency", currency, maximumFractionDigits: decimals === undefined ? 0 : decimals, minimumFractionDigits: decimals === undefined ? 0 : decimals,
      }).format(amount || 0);
    } catch (e) {
      return (amount || 0).toFixed(0) + " " + currency;
    }
  }

  /* ================= TABS ================= */
  document.querySelectorAll(".tabs .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs .tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((p) => (p.style.display = "none"));
      document.getElementById("panel-" + btn.dataset.tab).style.display = "block";
    });
  });
  document.getElementById("heroCalcBtn").addEventListener("click", () => {
    document.getElementById("workspace").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("learnMoreBtn").addEventListener("click", () => {
    document.getElementById("how-it-works").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ================= TOGGLES ================= */
  document.getElementById("advToggle").addEventListener("change", (e) => {
    document.getElementById("advFields").style.display = e.target.checked ? "flex" : "none";
    document.getElementById("advFields").style.flexDirection = "column";
    document.getElementById("advFields").style.gap = "14px";
  });
  document.getElementById("extraToggle").addEventListener("change", (e) => {
    document.getElementById("extraFields").style.display = e.target.checked ? "flex" : "none";
    document.getElementById("extraFields").style.flexDirection = "column";
    document.getElementById("extraFields").style.gap = "14px";
  });

  /* ================= DOWN PAYMENT SYNC ================= */
  const homePriceEl = document.getElementById("homePrice");
  const downPaymentEl = document.getElementById("downPayment");
  const downPctEl = document.getElementById("downPct");
  downPaymentEl.addEventListener("input", () => {
    const price = parseFloat(homePriceEl.value) || 0;
    const down = parseFloat(downPaymentEl.value) || 0;
    if (price > 0) downPctEl.value = ((down / price) * 100).toFixed(1);
  });
  downPctEl.addEventListener("input", () => {
    const price = parseFloat(homePriceEl.value) || 0;
    const pct = parseFloat(downPctEl.value) || 0;
    downPaymentEl.value = Math.round(price * pct / 100);
  });
  homePriceEl.addEventListener("input", () => {
    const price = parseFloat(homePriceEl.value) || 0;
    const pct = parseFloat(downPctEl.value) || 0;
    downPaymentEl.value = Math.round(price * pct / 100);
  });

  const now = new Date();
  document.getElementById("startDate").value = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");

  /* ================= MORTGAGE MATH ================= */
  function monthlyPayment(principal, annualRatePct, years) {
    const r = annualRatePct / 100 / 12;
    const n = years * 12;
    if (principal <= 0 || n <= 0) return 0;
    if (r === 0) return principal / n;
    return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  }

  function buildAmortization(principal, annualRatePct, years, basePayment, extraMonthly, extraYearly, extraOnce, extraOnceMonth) {
    const r = annualRatePct / 100 / 12;
    const capMonths = years * 12 + 600;
    let balance = principal;
    const rows = [];
    let totalInterest = 0;
    let month = 0;
    while (balance > 0.005 && month < capMonths) {
      month++;
      const interest = balance * r;
      let principalPortion = basePayment - interest;
      if (principalPortion < 0) principalPortion = 0;
      let extra = 0;
      if (extraMonthly) extra += extraMonthly;
      if (extraYearly && month % 12 === 0) extra += extraYearly;
      if (extraOnce && month === extraOnceMonth) extra += extraOnce;
      let totalPrincipalPaid = principalPortion + extra;
      if (totalPrincipalPaid > balance) totalPrincipalPaid = balance;
      balance -= totalPrincipalPaid;
      totalInterest += interest;
      rows.push({ month, payment: totalPrincipalPaid + interest, principal: totalPrincipalPaid, interest, balance: Math.max(balance, 0) });
      if (balance <= 0.005) break;
    }
    return { rows, totalInterest, months: month };
  }

  function addMonths(dateStr, months) {
    const [y, m] = dateStr.split("-").map(Number);
    const d = new Date(y, m - 1 + months, 1);
    return d;
  }
  function formatMonthYear(d) {
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  /* ================= CHART ================= */
  let mainChart = null;
  let activeChartView = "split";
  document.querySelectorAll(".chart-tabs .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chart-tabs .chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeChartView = chip.dataset.chart;
      if (lastResult) renderChart(lastResult);
    });
  });

  function renderChart(result) {
    const ctx = document.getElementById("mainChart").getContext("2d");
    if (mainChart) mainChart.destroy();

    if (activeChartView === "split") {
      const principal = result.active.rows.reduce((s, r) => s + r.principal, 0);
      const interest = result.active.totalInterest;
      mainChart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Principal", "Interest"],
          datasets: [{ data: [principal, interest], backgroundColor: ["#1447E6", "#F97316"], borderWidth: 0 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { color: getComputedStyle(document.body).color } } },
        },
      });
    } else {
      const step = Math.max(1, Math.round(result.active.rows.length / 60));
      const labels = [];
      const withExtraData = [];
      const baselineData = [];
      for (let i = 0; i < result.active.rows.length; i += step) {
        labels.push("Yr " + (Math.floor(result.active.rows[i].month / 12) + 1));
        withExtraData.push(result.active.rows[i].balance);
      }
      for (let i = 0; i < result.baseline.rows.length; i += step) {
        baselineData.push(result.baseline.rows[i].balance);
      }
      const datasets = [{ label: "Balance", data: withExtraData, borderColor: "#1447E6", backgroundColor: "rgba(20,71,230,.12)", fill: true, tension: 0.25, pointRadius: 0 }];
      if (result.hasExtra) {
        datasets.push({ label: "Balance (no extra payments)", data: baselineData, borderColor: "#F97316", borderDash: [5, 4], fill: false, tension: 0.25, pointRadius: 0 });
      }
      mainChart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: result.hasExtra, position: "bottom", labels: { color: getComputedStyle(document.body).color } } },
          scales: {
            x: { ticks: { color: getComputedStyle(document.body).color, maxTicksLimit: 8 }, grid: { display: false } },
            y: { ticks: { color: getComputedStyle(document.body).color } },
          },
        },
      });
    }
  }

  /* ================= SCHEDULE TABLE ================= */
  let scheduleView = "annual";
  document.querySelectorAll("#scheduleViewSeg .seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#scheduleViewSeg .seg-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      scheduleView = btn.dataset.view;
      if (lastResult) renderScheduleTable(lastResult);
    });
  });

  function renderScheduleTable(result) {
    const body = document.getElementById("scheduleBody");
    body.innerHTML = "";
    const rows = result.active.rows;
    if (scheduleView === "monthly") {
      rows.forEach((r) => {
        const d = addMonths(document.getElementById("startDate").value, r.month - 1);
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + formatMonthYear(d) + "</td><td>" + fmt(r.payment, 2) + "</td><td>" + fmt(r.principal, 2) + "</td><td>" + fmt(r.interest, 2) + "</td><td>" + fmt(r.balance, 2) + "</td>";
        body.appendChild(tr);
      });
    } else {
      let year = 1, acc = { payment: 0, principal: 0, interest: 0, balance: 0 };
      rows.forEach((r, i) => {
        const rowYear = Math.floor((r.month - 1) / 12) + 1;
        if (rowYear !== year) {
          appendYearRow(body, year, acc);
          year = rowYear;
          acc = { payment: 0, principal: 0, interest: 0, balance: 0 };
        }
        acc.payment += r.payment; acc.principal += r.principal; acc.interest += r.interest; acc.balance = r.balance;
        if (i === rows.length - 1) appendYearRow(body, year, acc);
      });
    }
  }
  function appendYearRow(body, year, acc) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td>Year " + year + "</td><td>" + fmt(acc.payment, 0) + "</td><td>" + fmt(acc.principal, 0) + "</td><td>" + fmt(acc.interest, 0) + "</td><td>" + fmt(acc.balance, 0) + "</td>";
    body.appendChild(tr);
  }

  /* ================= MAIN CALCULATE ================= */
  let lastResult = null;

  function readNum(id) { return parseFloat(document.getElementById(id).value) || 0; }

  function calculate() {
    const homePrice = readNum("homePrice");
    const downPayment = readNum("downPayment");
    const rate = readNum("interestRate");
    const years = parseInt(document.getElementById("loanTerm").value, 10);
    const loanAmount = Math.max(0, homePrice - downPayment);
    const downPct = homePrice > 0 ? (downPayment / homePrice) * 100 : 0;

    const advOn = document.getElementById("advToggle").checked;
    const propertyTaxPct = advOn ? readNum("propertyTax") : 0;
    const homeInsurance = advOn ? readNum("homeInsurance") : 0;
    const hoaFee = advOn ? readNum("hoaFee") : 0;
    const pmiRatePct = advOn ? readNum("pmiRate") : 0;

    const extraOn = document.getElementById("extraToggle").checked;
    const extraMonthly = extraOn ? readNum("extraMonthly") : 0;
    const extraYearly = extraOn ? readNum("extraYearly") : 0;
    const extraOnce = extraOn ? readNum("extraOnce") : 0;
    const extraOnceMonth = extraOn ? (parseInt(document.getElementById("extraOnceMonth").value, 10) || 1) : 0;

    if (loanAmount <= 0) {
      showToast("Enter a home price greater than the down payment");
      return;
    }

    const basePayment = monthlyPayment(loanAmount, rate, years);
    const baseline = buildAmortization(loanAmount, rate, years, basePayment, 0, 0, 0, 0);
    const hasExtra = extraOn && (extraMonthly > 0 || extraYearly > 0 || extraOnce > 0);
    const active = hasExtra
      ? buildAmortization(loanAmount, rate, years, basePayment, extraMonthly, extraYearly, extraOnce, extraOnceMonth)
      : baseline;

    const monthlyTax = homePrice * propertyTaxPct / 100 / 12;
    const monthlyInsurance = homeInsurance / 12;
    const monthlyPMI = downPct < 20 ? loanAmount * pmiRatePct / 100 / 12 : 0;
    const extrasMonthly = monthlyTax + monthlyInsurance + hoaFee + monthlyPMI;

    lastResult = {
      homePrice, downPayment, loanAmount, rate, years, basePayment,
      extrasMonthly, hasExtra, baseline, active,
      interestSaved: baseline.totalInterest - active.totalInterest,
      monthsSaved: baseline.months - active.months,
    };
    renderResults(lastResult);
  }

  function renderResults(result) {
    const totalMonthly = result.basePayment + result.extrasMonthly + (result.hasExtra ? readNum("extraMonthly") : 0);
    document.getElementById("resMonthly").textContent = fmt(totalMonthly, 0);
    document.getElementById("resPI").textContent = fmt(result.basePayment, 0);
    document.getElementById("resExtras").textContent = fmt(result.extrasMonthly, 0);
    document.getElementById("resTotalInterest").textContent = fmt(result.active.totalInterest, 0);
    document.getElementById("resTotalCost").textContent = fmt(result.loanAmount + result.active.totalInterest, 0);
    const payoffDate = addMonths(document.getElementById("startDate").value, result.active.months - 1);
    document.getElementById("resPayoff").textContent = formatMonthYear(payoffDate);
    document.getElementById("resLoanAmount").textContent = fmt(result.loanAmount, 0);

    const banner = document.getElementById("savingsBanner");
    if (result.hasExtra && result.interestSaved > 0) {
      banner.style.display = "flex";
      const yearsSaved = (result.monthsSaved / 12).toFixed(1);
      document.getElementById("savingsText").textContent =
        "Extra payments save " + fmt(result.interestSaved, 0) + " in interest and pay off the loan " + yearsSaved + " years sooner.";
    } else {
      banner.style.display = "none";
    }

    renderChart(result);
    renderScheduleTable(result);
  }

  document.getElementById("calcBtn").addEventListener("click", calculate);
  calculate();

  /* ================= CSV EXPORT ================= */
  document.getElementById("downloadCsvBtn").addEventListener("click", () => {
    if (!lastResult) return;
    let csv = "Month,Date,Payment,Principal,Interest,Balance\n";
    lastResult.active.rows.forEach((r) => {
      const d = addMonths(document.getElementById("startDate").value, r.month - 1);
      csv += [r.month, formatMonthYear(d), r.payment.toFixed(2), r.principal.toFixed(2), r.interest.toFixed(2), r.balance.toFixed(2)].join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "amortization-schedule.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  });

  /* ================= PDF EXPORT ================= */
document.getElementById("downloadPdfBtn").addEventListener("click", async () => {
    if (!lastResult) { showToast("Calculate a mortgage first"); return; }
    try {
      await generatePdfReport(lastResult);
    } catch (err) {
      console.error(err);
      showToast("Could not generate the PDF report");
    }
  });

  async function generatePdfReport(result) {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 44;
    const pageW = 612, pageH = 792;
    let page = pdfDoc.addPage([pageW, pageH]);
    let y = pageH - margin;

    function ensureSpace(needed) {
      if (y - needed < margin) {
        page = pdfDoc.addPage([pageW, pageH]);
        y = pageH - margin;
      }
    }
    function text(str, x, size, useBold, color) {
      page.drawText(str, { x, y, size, font: useBold ? bold : font, color: color || rgb(0.07, 0.08, 0.1) });
    }

    text("Mortgage Summary Report", margin, 20, true);
    y -= 22;
    text("Generated " + new Date().toLocaleDateString(), margin, 10, false, rgb(0.4, 0.4, 0.45));
    y -= 26;

    text("Loan Overview", margin, 13, true);
    y -= 18;
    const overview = [
      ["Home price", fmt(result.homePrice, 0)],
      ["Down payment", fmt(result.downPayment, 0)],
      ["Loan amount", fmt(result.loanAmount, 0)],
      ["Interest rate", result.rate + "%"],
      ["Loan term", result.years + " years"],
      ["Monthly principal & interest", fmt(result.basePayment, 0)],
      ["Taxes, insurance & fees / month", fmt(result.extrasMonthly, 0)],
      ["Total interest paid", fmt(result.active.totalInterest, 0)],
      ["Total cost of loan", fmt(result.loanAmount + result.active.totalInterest, 0)],
    ];
    overview.forEach(([label, val]) => {
      ensureSpace(16);
      text(label, margin, 10.5, false, rgb(0.35, 0.36, 0.42));
      text(val, margin + 250, 10.5, true);
      y -= 16;
    });

    if (result.hasExtra) {
      y -= 8;
      ensureSpace(16);
      text("Extra Payment Impact", margin, 13, true);
      y -= 18;
      ensureSpace(16);
      text("Interest saved", margin, 10.5, false, rgb(0.35, 0.36, 0.42));
      text(fmt(result.interestSaved, 0), margin + 250, 10.5, true, rgb(0.09, 0.64, 0.29));
      y -= 16;
      ensureSpace(16);
      text("Years saved", margin, 10.5, false, rgb(0.35, 0.36, 0.42));
      text((result.monthsSaved / 12).toFixed(1) + " years", margin + 250, 10.5, true, rgb(0.09, 0.64, 0.29));
      y -= 16;
    }

    y -= 14;
    ensureSpace(20);
    text("Annual Amortization Summary", margin, 13, true);
    y -= 20;

    const cols = [margin, margin + 70, margin + 190, margin + 310, margin + 430];
    const headers = ["Year", "Payments", "Principal", "Interest", "End balance"];
    ensureSpace(16);
    headers.forEach((h, i) => text(h, cols[i], 9.5, true, rgb(0.35, 0.36, 0.42)));
    y -= 14;

    let year = 1, acc = { payment: 0, principal: 0, interest: 0, balance: 0 };
    const rows = result.active.rows;
    rows.forEach((r, i) => {
      const rowYear = Math.floor((r.month - 1) / 12) + 1;
      if (rowYear !== year) {
        drawYearRow();
        year = rowYear;
        acc = { payment: 0, principal: 0, interest: 0, balance: 0 };
      }
      acc.payment += r.payment; acc.principal += r.principal; acc.interest += r.interest; acc.balance = r.balance;
      if (i === rows.length - 1) drawYearRow();
    });
    function drawYearRow() {
      ensureSpace(14);
      text("Year " + year, cols[0], 9.5);
      text(fmt(acc.payment, 0), cols[1], 9.5);
      text(fmt(acc.principal, 0), cols[2], 9.5);
      text(fmt(acc.interest, 0), cols[3], 9.5);
      text(fmt(acc.balance, 0), cols[4], 9.5);
      y -= 14;
    }

    y -= 10;
    ensureSpace(30);
    text("Estimates only. Not financial, legal or tax advice. Rates and fees vary by lender and change over time.", margin, 8.5, false, rgb(0.5, 0.5, 0.55));

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "mortgage-summary-report.pdf";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* ================= AFFORDABILITY TAB ================= */
  document.getElementById("afCalcBtn").addEventListener("click", () => {
    const income = readNum("afIncome");
    const debts = readNum("afDebts");
    const down = readNum("afDown");
    const rate = readNum("afRate");
    const years = parseInt(document.getElementById("afTerm").value, 10);
    const dtiPct = parseFloat(document.getElementById("afDti").value);
    const taxPct = readNum("afTax");
    const insurance = readNum("afInsurance");

    const monthlyIncome = income / 12;
    const maxTotalDebt = monthlyIncome * (dtiPct / 100);
    const maxHousingPayment = Math.max(0, maxTotalDebt - debts);

    // Solve for loan amount L such that monthlyPayment(L,rate,years) + estimated tax/insurance/hoa (approx via home price) <= maxHousingPayment
    // Estimate iteratively: assume home price = loan + down, tax based on home price
    let homePrice = (maxHousingPayment * 12 * years); // rough seed
    for (let i = 0; i < 25; i++) {
      const loan = Math.max(0, homePrice - down);
      const pi = monthlyPayment(loan, rate, years);
      const monthlyTax = homePrice * taxPct / 100 / 12;
      const monthlyIns = insurance / 12;
      const totalHousing = pi + monthlyTax + monthlyIns;
      if (totalHousing <= 0) break;
      const adjust = maxHousingPayment / totalHousing;
      homePrice = homePrice * adjust;
      if (!isFinite(homePrice) || homePrice < 0) { homePrice = 0; break; }
    }
    const finalLoan = Math.max(0, homePrice - down);
    const finalPI = monthlyPayment(finalLoan, rate, years);
    const finalTax = homePrice * taxPct / 100 / 12;
    const finalIns = insurance / 12;
    const finalTotal = finalPI + finalTax + finalIns;

    document.getElementById("afHomePrice").textContent = fmt(homePrice, 0);
    document.getElementById("afLoanAmount").textContent = fmt(finalLoan, 0);
    document.getElementById("afMonthly").textContent = fmt(finalTotal, 0);
    document.getElementById("afMaxHousing").textContent = fmt(maxHousingPayment, 0);
    document.getElementById("afDtiUsed").textContent = dtiPct + "%";
  });

  /* ================= REFINANCE TAB ================= */
  document.getElementById("rfCalcBtn").addEventListener("click", () => {
    const balance = readNum("rfBalance");
    const currentRate = readNum("rfRate");
    const remainingYears = readNum("rfRemaining");
    const newRate = readNum("rfNewRate");
    const newTerm = readNum("rfNewTerm");
    const closingCosts = readNum("rfClosingCosts");

    const currentPayment = monthlyPayment(balance, currentRate, remainingYears);
    const newPayment = monthlyPayment(balance, newRate, newTerm);
    const monthlySavings = currentPayment - newPayment;

    const currentAmort = buildAmortization(balance, currentRate, remainingYears, currentPayment, 0, 0, 0, 0);
    const newAmort = buildAmortization(balance, newRate, newTerm, newPayment, 0, 0, 0, 0);

    document.getElementById("rfCurrentPayment").textContent = fmt(currentPayment, 0);
    document.getElementById("rfNewPayment").textContent = fmt(newPayment, 0);
    document.getElementById("rfMonthlySavings").textContent = fmt(monthlySavings, 0);
    document.getElementById("rfBreakeven").textContent = monthlySavings > 0
      ? Math.ceil(closingCosts / monthlySavings) + " months"
      : "N/A (no monthly savings)";
    document.getElementById("rfInterestCurrent").textContent = fmt(currentAmort.totalInterest, 0);
    document.getElementById("rfInterestNew").textContent = fmt(newAmort.totalInterest, 0);
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
})();