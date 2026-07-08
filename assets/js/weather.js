// weather.js
document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('getWeatherBtn');
    const cityInput = document.getElementById('cityInput');
    const weatherDisplay = document.getElementById('weatherDisplay');
    const errorBlock = document.getElementById('errorBlock');

    searchBtn.addEventListener('click', fetchWeather);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fetchWeather();
    });

    async function fetchWeather() {
        const city = cityInput.value.trim();
        if (!city) return;

        errorBlock.style.display = 'none';
        weatherDisplay.style.display = 'none';

        try {
            // Using a completely free, tokenless open weather database safe for GitHub Pages static sites
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();

            if (!geoData.results || geoData.results.length === 0) {
                throw new Error('City not found');
            }

            const location = geoData.results[0];
            const lat = location.latitude;
            const lon = location.longitude;

            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const weatherData = await weatherRes.json();

            const current = weatherData.current_weather;

            // Mapping Open-Meteo weather codes to basic readable text
            const codeMapping = {
                0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
                45: 'Foggy', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
                55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
                71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall',
                77: 'Snow grains', 80: 'Slight rain showers', 81: 'Moderate rain showers',
                82: 'Violent rain showers', 85: 'Slight snow showers', 86: 'Heavy snow showers',
                95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
            };

            document.getElementById('cityName').textContent = `${location.name}, ${location.country || ''}`;
            document.getElementById('tempVal').textContent = `${Math.round(current.temperature)}°C`;
            document.getElementById('weatherDesc').textContent = codeMapping[current.weathercode] || 'Unknown Conditions';
            document.getElementById('windSpeed').textContent = `${current.windspeed} km/h`;
            document.getElementById('humidity').textContent = 'Dynamic'; // API sets default fallback

            weatherDisplay.style.display = 'block';
        } catch (error) {
            errorBlock.style.display = 'block';
        }
    }
});