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

  /* ================= UNITS ================= */
  let units = localStorage.getItem("dkb-weather-units") || "metric"; // metric | imperial
  const unitToggle = document.getElementById("unitToggle");
  function refreshUnitLabel() {
    unitToggle.textContent = units === "metric" ? "\u00b0C / km/h" : "\u00b0F / mph";
  }
  refreshUnitLabel();
  unitToggle.addEventListener("click", () => {
    units = units === "metric" ? "imperial" : "metric";
    localStorage.setItem("dkb-weather-units", units);
    refreshUnitLabel();
    if (currentPlace) loadWeather(currentPlace);
  });
  function tempUnit() { return units === "metric" ? "\u00b0C" : "\u00b0F"; }
  function windUnit() { return units === "metric" ? "km/h" : "mph"; }
  function visUnit() { return units === "metric" ? "km" : "mi"; }

  /* ================= TOASTS ================= */
  const toastStack = document.getElementById("toastStack");
  function showToast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    toastStack.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  /* ================= STATE ================= */
  let currentPlace = null; // { lat, lon, name, country, admin1 }
  let lastWeatherData = null;
  let lastAqiData = null;

  /* ================= DOM ================= */
  const dashboard = document.getElementById("dashboard");
  const introState = document.getElementById("introState");
  const loadingState = document.getElementById("loadingState");
  const weatherContent = document.getElementById("weatherContent");
  const searchInput = document.getElementById("citySearchInput");
  const searchResultsEl = document.getElementById("searchResults");

  /* ================= WEATHER CODE HELPERS ================= */
  function weatherDescription(code) {
    const map = {
      0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Fog", 48: "Rime fog",
      51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
      56: "Freezing drizzle", 57: "Freezing drizzle",
      61: "Light rain", 63: "Rain", 65: "Heavy rain",
      66: "Freezing rain", 67: "Heavy freezing rain",
      71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
      80: "Light showers", 81: "Showers", 82: "Violent showers",
      85: "Snow showers", 86: "Heavy snow showers",
      95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm",
    };
    return map[code] || "Unknown";
  }

  function weatherCategory(code) {
    if (code === 0 || code === 1) return "sunny";
    if (code === 2 || code === 3) return "cloudy";
    if (code === 45 || code === 48) return "fog";
    if (code >= 51 && code <= 67) return "drizzle";
    if (code >= 71 && code <= 77) return "snow";
    if (code >= 80 && code <= 82) return "rain";
    if (code >= 85 && code <= 86) return "snow";
    if (code >= 95) return "storm";
    return "cloudy";
  }

  function weatherIconSVG(code, isDay) {
    const cat = weatherCategory(code);
    const sunColor = "#F97316";
    const cloudColor = "#94A3B8";
    const rainColor = "#3B82F6";
    const snowColor = "#93C5FD";
    const moonColor = "#94A3B8";

    if (cat === "sunny" && isDay) {
      return '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" fill="' + sunColor + '"/><g stroke="' + sunColor + '" stroke-width="1.8" stroke-linecap="round"><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></g></svg>';
    }
    if (cat === "sunny" && !isDay) {
      return '<svg viewBox="0 0 24 24" fill="none"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" fill="' + moonColor + '"/></svg>';
    }
    if (cat === "cloudy") {
      return '<svg viewBox="0 0 24 24" fill="none"><path d="M7 18a4 4 0 1 1 1-7.9A5 5 0 0 1 18 12a3.5 3.5 0 0 1-.5 6.9H7Z" fill="' + cloudColor + '"/></svg>';
    }
    if (cat === "fog") {
      return '<svg viewBox="0 0 24 24" fill="none"><path d="M6 9h12M4 12h16M4 15h16M6 18h12" stroke="' + cloudColor + '" stroke-width="1.8" stroke-linecap="round"/></svg>';
    }
    if (cat === "drizzle" || cat === "rain") {
      return '<svg viewBox="0 0 24 24" fill="none"><path d="M7 13a4 4 0 1 1 1-7.9A5 5 0 0 1 18 7a3.5 3.5 0 0 1-.5 6.9H7Z" fill="' + cloudColor + '"/><g stroke="' + rainColor + '" stroke-width="1.8" stroke-linecap="round"><path d="M8 17v3M12 17v3M16 17v3"/></g></svg>';
    }
    if (cat === "snow") {
      return '<svg viewBox="0 0 24 24" fill="none"><path d="M7 13a4 4 0 1 1 1-7.9A5 5 0 0 1 18 7a3.5 3.5 0 0 1-.5 6.9H7Z" fill="' + cloudColor + '"/><g stroke="' + snowColor + '" stroke-width="1.8" stroke-linecap="round"><path d="M8 18v3M12 17v4M16 18v3"/></g></svg>';
    }
    if (cat === "storm") {
      return '<svg viewBox="0 0 24 24" fill="none"><path d="M7 13a4 4 0 1 1 1-7.9A5 5 0 0 1 18 7a3.5 3.5 0 0 1-.5 6.9H7Z" fill="' + cloudColor + '"/><path d="M13 14l-3 5h3l-2 4" stroke="' + sunColor + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" fill="' + cloudColor + '"/></svg>';
  }

  function windDirLabel(deg) {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(deg / 45) % 8];
  }

  /* ================= AQI HELPERS ================= */
  function aqiCategory(aqi) {
    if (aqi == null) return { label: "\u2014", color: "#8A8DA0", note: "Air quality data unavailable for this location." };
    if (aqi <= 50) return { label: "Good", color: "#16A34A", note: "Air quality is satisfactory with little to no risk." };
    if (aqi <= 100) return { label: "Moderate", color: "#E6A317", note: "Acceptable, though sensitive groups may notice minor effects." };
    if (aqi <= 150) return { label: "Unhealthy (Sensitive)", color: "#F97316", note: "Sensitive groups should reduce prolonged outdoor exertion." };
    if (aqi <= 200) return { label: "Unhealthy", color: "#E63946", note: "Everyone may begin to experience health effects." };
    if (aqi <= 300) return { label: "Very Unhealthy", color: "#9333EA", note: "Health alert: everyone may experience serious effects." };
    return { label: "Hazardous", color: "#7F1D1D", note: "Health warning of emergency conditions for the entire population." };
  }

  /* ================= SEARCH ================= */
  let searchDebounce = null;
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    clearTimeout(searchDebounce);
    if (q.length < 2) {
      searchResultsEl.classList.remove("open");
      searchResultsEl.innerHTML = "";
      return;
    }
    searchDebounce = setTimeout(() => runSearch(q), 350);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) searchResultsEl.classList.remove("open");
  });

  async function runSearch(query) {
    try {
      const url = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(query) + "&count=8&language=en&format=json";
      const res = await fetch(url);
      const data = await res.json();
      renderSearchResults(data.results || []);
    } catch (err) {
      console.error(err);
    }
  }

  function renderSearchResults(results) {
    searchResultsEl.innerHTML = "";
    if (!results.length) {
      searchResultsEl.innerHTML = '<div class="search-empty">No cities found</div>';
      searchResultsEl.classList.add("open");
      return;
    }
    results.forEach((r) => {
      const div = document.createElement("div");
      div.className = "search-result-item";
      const sub = [r.admin1, r.country].filter(Boolean).join(", ");
      div.innerHTML = "<div><b>" + escapeHtml(r.name) + "</b><span>" + escapeHtml(sub) + "</span></div>";
      div.addEventListener("click", () => {
        searchInput.value = "";
        searchResultsEl.classList.remove("open");
        selectPlace({ lat: r.latitude, lon: r.longitude, name: r.name, country: r.country || "", admin1: r.admin1 || "" });
      });
      searchResultsEl.appendChild(div);
    });
    searchResultsEl.classList.add("open");
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  /* ================= POPULAR CHIPS ================= */
  document.querySelectorAll("#popularChips .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      selectPlace({
        lat: parseFloat(chip.dataset.lat),
        lon: parseFloat(chip.dataset.lon),
        name: chip.dataset.name,
        country: chip.dataset.country,
        admin1: "",
      });
    });
  });

  /* ================= GEOLOCATION ================= */
  document.getElementById("useLocationBtn").addEventListener("click", () => {
    if (!navigator.geolocation) {
      showToast("Geolocation isn't supported in this browser");
      return;
    }
    showToast("Requesting your location\u2026");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        let name = "Your location", country = "";
        try {
          const res = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + lat + "&longitude=" + lon + "&localityLanguage=en");
          const data = await res.json();
          name = data.city || data.locality || name;
          country = data.countryName || "";
        } catch (err) { /* fall back to coordinates label */ }
        selectPlace({ lat, lon, name, country, admin1: "" });
      },
      () => showToast("Couldn't access your location. Check browser permissions."),
      { timeout: 10000 }
    );
  });

  /* ================= FAVORITES ================= */
function getFavorites() {
    try { return JSON.parse(localStorage.getItem("dkb-weather-favorites") || "[]"); }
    catch (e) { return []; }
  }
  function setFavorites(list) {
    localStorage.setItem("dkb-weather-favorites", JSON.stringify(list));
  }
  function isFavorite(place) {
    return getFavorites().some((f) => f.name === place.name && f.country === place.country);
  }
  function toggleFavorite(place) {
    let favs = getFavorites();
    if (isFavorite(place)) {
      favs = favs.filter((f) => !(f.name === place.name && f.country === place.country));
    } else {
      favs.push(place);
    }
    setFavorites(favs);
    renderFavoritesBar();
    updateFavStar();
  }
  function renderFavoritesBar() {
    const bar = document.getElementById("favoritesBar");
    const favs = getFavorites();
    bar.innerHTML = "";
    if (!favs.length) { bar.style.display = "none"; return; }
    bar.style.display = "flex";
    favs.forEach((f) => {
      const btn = document.createElement("button");
      btn.className = "fav-chip";
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.3 6.2 20.6l1.1-6.5L2.6 9.7l6.6-1L12 2.8l2.8 5.9 6.6 1-4.7 4.4 1.1 6.5Z"/></svg><span>' + escapeHtml(f.name) + "</span>";
      btn.addEventListener("click", () => selectPlace(f));
      bar.appendChild(btn);
    });
  }
  function updateFavStar() {
    const btn = document.getElementById("favStarBtn");
    if (!currentPlace) return;
    btn.classList.toggle("starred", isFavorite(currentPlace));
  }
  document.getElementById("favStarBtn").addEventListener("click", () => {
    if (currentPlace) toggleFavorite(currentPlace);
  });

  /* ================= SELECT PLACE & LOAD WEATHER ================= */
  async function selectPlace(place) {
    currentPlace = place;
    localStorage.setItem("dkb-weather-last", JSON.stringify(place));
    introState.style.display = "none";
    dashboard.style.display = "block";
    await loadWeather(place);
  }

  function nearestHourIndex(times, currentTimeStr) {
    const key = currentTimeStr.slice(0, 13);
    const idx = times.findIndex((t) => t.slice(0, 13) === key);
    return idx >= 0 ? idx : 0;
  }

  async function loadWeather(place) {
    weatherContent.style.display = "none";
    loadingState.style.display = "flex";
    try {
      const tempU = units === "metric" ? "celsius" : "fahrenheit";
      const windU = units === "metric" ? "kmh" : "mph";

      const forecastUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + place.lat + "&longitude=" + place.lon +
        "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,precipitation" +
        "&hourly=temperature_2m,weather_code,precipitation_probability,uv_index,visibility" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max" +
        "&timezone=auto&forecast_days=7&temperature_unit=" + tempU + "&wind_speed_unit=" + windU;

      const aqiUrl = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" + place.lat + "&longitude=" + place.lon +
        "&current=us_aqi,european_aqi,pm2_5,pm10&timezone=auto";

      const [weatherRes, aqiRes] = await Promise.all([fetch(forecastUrl), fetch(aqiUrl)]);
      const weatherData = await weatherRes.json();
      const aqiData = await aqiRes.json();

      if (weatherData.error) throw new Error(weatherData.reason || "Weather lookup failed");

      lastWeatherData = weatherData;
      lastAqiData = aqiData;

      renderAll(place, weatherData, aqiData);
      loadingState.style.display = "none";
      weatherContent.style.display = "block";
    } catch (err) {
      console.error(err);
      loadingState.style.display = "none";
      showToast("Couldn't load weather for that location. Try again.");
    }
  }

  function round(n) { return n === null || n === undefined ? "\u2014" : Math.round(n); }

  function renderAll(place, w, aqi) {
    const c = w.current;
    const hourIdx = nearestHourIndex(w.hourly.time, c.time);
    const uv = w.hourly.uv_index ? w.hourly.uv_index[hourIdx] : null;
    const visibilityRaw = w.hourly.visibility ? w.hourly.visibility[hourIdx] : null;
    const visibility = visibilityRaw != null
      ? (units === "metric" ? round(visibilityRaw / 1000) : round(visibilityRaw / 1609.34))
      : null;

    document.getElementById("placeName").textContent = place.name;
    document.getElementById("placeMeta").textContent = [place.admin1, place.country].filter(Boolean).join(", ") || "\u2014";
    document.getElementById("currentIcon").innerHTML = weatherIconSVG(c.weather_code, c.is_day === 1);
    document.getElementById("currentTemp").textContent = round(c.temperature_2m) + "\u00b0";
    document.getElementById("currentDesc").textContent = weatherDescription(c.weather_code);
    document.getElementById("currentFeels").textContent = "Feels like " + round(c.apparent_temperature) + tempUnit();

    const stats = [
      { label: "Humidity", value: round(c.relative_humidity_2m) + "%" },
      { label: "Wind", value: round(c.wind_speed_10m) + " " + windUnit() + " " + windDirLabel(c.wind_direction_10m) },
      { label: "Gusts", value: round(c.wind_gusts_10m) + " " + windUnit() },
      { label: "Pressure", value: round(c.pressure_msl) + " hPa" },
      { label: "UV index", value: uv != null ? round(uv) : "\u2014" },
      { label: "Visibility", value: visibility != null ? visibility + " " + visUnit() : "\u2014" },
      { label: "Sunrise", value: formatTime(w.daily.sunrise[0]) },
      { label: "Sunset", value: formatTime(w.daily.sunset[0]) },
    ];
    const statsEl = document.getElementById("currentStats");
    statsEl.innerHTML = stats.map((s) => '<div class="stat-pill"><span>' + s.label + "</span><b>" + s.value + "</b></div>").join("");

    updateFavStar();
    renderFavoritesBar();
    renderAqi(aqi);
    renderHourly(w.hourly, hourIdx);
    renderDaily(w.daily);
  }

  function formatTime(isoStr) {
    if (!isoStr) return "\u2014";
    const d = new Date(isoStr);
    let h = d.getHours(), m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12; if (h === 0) h = 12;
    return h + ":" + String(m).padStart(2, "0") + " " + ampm;
  }

  function renderAqi(aqi) {
    const val = aqi && aqi.current ? aqi.current.us_aqi : null;
    const cat = aqiCategory(val);
    document.getElementById("aqiValue").textContent = val != null ? Math.round(val) : "\u2014";
    const badge = document.getElementById("aqiBadge");
    badge.textContent = cat.label;
    badge.style.background = cat.color;
    document.getElementById("aqiNote").textContent = cat.note;

    const mini = [];
    if (aqi && aqi.current) {
      if (aqi.current.european_aqi != null) mini.push({ l: "EU AQI", v: Math.round(aqi.current.european_aqi) });
      if (aqi.current.pm2_5 != null) mini.push({ l: "PM2.5", v: aqi.current.pm2_5.toFixed(1) + " \u00b5g/m\u00b3" });
      if (aqi.current.pm10 != null) mini.push({ l: "PM10", v: aqi.current.pm10.toFixed(1) + " \u00b5g/m\u00b3" });
    }
    document.getElementById("aqiMiniStats").innerHTML = mini.map((m) => "<div><b>" + m.v + "</b>" + m.l + "</div>").join("");
  }

  function renderHourly(hourly, startIdx) {
    const el = document.getElementById("hourlyScroll");
    el.innerHTML = "";
    for (let i = startIdx; i < Math.min(startIdx + 24, hourly.time.length); i++) {
      const d = new Date(hourly.time[i]);
      const label = i === startIdx ? "Now" : (d.getHours() % 12 === 0 ? 12 : d.getHours() % 12) + (d.getHours() >= 12 ? "PM" : "AM");
      const rain = hourly.precipitation_probability ? hourly.precipitation_probability[i] : null;
      const div = document.createElement("div");
      div.className = "hourly-item";
      div.innerHTML =
        '<div class="h-time">' + label + "</div>" +
        weatherIconSVG(hourly.weather_code[i], d.getHours() >= 6 && d.getHours() < 19) +
        '<div class="h-temp">' + round(hourly.temperature_2m[i]) + "\u00b0</div>" +
        (rain != null ? '<div class="h-rain">' + rain + "%</div>" : "");
      el.appendChild(div);
    }
  }

  function renderDaily(daily) {
    const el = document.getElementById("dailyList");
    el.innerHTML = "";
    const allTemps = daily.temperature_2m_max.concat(daily.temperature_2m_min);
    const weekMin = Math.min.apply(null, allTemps);
    const weekMax = Math.max.apply(null, allTemps);
    const span = Math.max(1, weekMax - weekMin);

    daily.time.forEach((dateStr, i) => {
      const d = new Date(dateStr + "T12:00:00");
      let dayLabel;
      if (i === 0) dayLabel = "Today";
      else if (i === 1) dayLabel = "Tomorrow";
      else dayLabel = d.toLocaleDateString(undefined, { weekday: "short" });

      const min = daily.temperature_2m_min[i], max = daily.temperature_2m_max[i];
      const leftPct = ((min - weekMin) / span) * 100;
      const widthPct = ((max - min) / span) * 100;
      const rain = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : null;

      const div = document.createElement("div");
      div.className = "daily-item";
      div.innerHTML =
        '<div class="d-day">' + dayLabel + "</div>" +
        weatherIconSVG(daily.weather_code[i], true) +
        '<div class="d-rain">' + (rain != null ? rain + "%" : "") + "</div>" +
        '<div class="d-range">' +
        '<span class="d-min">' + round(min) + "\u00b0</span>" +
        '<div class="d-bar"><span style="margin-left:' + leftPct + '%;width:' + widthPct + '%"></span></div>' +
        "<span>" + round(max) + "\u00b0</span>" +
        "</div>";
      el.appendChild(div);
    });
  }

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

  /* ================= INIT ================= */
  renderFavoritesBar();
  try {
    const last = JSON.parse(localStorage.getItem("dkb-weather-last") || "null");
    if (last && typeof last.lat === "number") selectPlace(last);
  } catch (e) { /* ignore */ }
})();