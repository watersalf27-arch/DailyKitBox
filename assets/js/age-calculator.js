"use strict";

/**
 * Age Calculator - Production Ready Vanilla JS
 * assets/js/age-calculator.js
 * DailyKitBox - Enterprise Quality
 */

class AgeCalculator {
    constructor() {
        this.currentTab = 'main-age';
        this.history = [];
        this.isDarkMode = true;
        this.animationsEnabled = true;
        
        this.init();
    }

    init() {
        this.cacheDOM();
        this.loadPreferences();
        this.bindEvents();
        this.initializeTabs();
        this.loadHistory();
        this.setInitialDate();
        this.checkReducedMotion();
    }

    cacheDOM() {
        this.elements = {
            // Main inputs
            birthDateInput: document.getElementById('birthDate'),
            calculateBtn: document.getElementById('calculateBtn'),
            
            // Results containers
            ageResults: document.getElementById('ageResults'),
            detailedAge: document.getElementById('detailedAge'),
            totalLived: document.getElementById('totalLived'),
            nextBirthday: document.getElementById('nextBirthday'),
            zodiacInfo: document.getElementById('zodiacInfo'),
            lifeStats: document.getElementById('lifeStats'),
            animalAge: document.getElementById('animalAge'),
            
            // Tab elements
            tabButtons: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            
            // Modals
            historyModal: document.getElementById('historyModal'),
            historyList: document.getElementById('historyList'),
            openHistoryBtn: document.getElementById('openHistoryBtn'),
            closeHistoryBtn: document.getElementById('closeHistoryBtn'),
            clearHistoryBtn: document.getElementById('clearHistoryBtn'),
            
            // Controls
            themeToggle: document.getElementById('themeToggle'),
            copyBtn: document.getElementById('copyBtn'),
            shareBtn: document.getElementById('shareBtn'),
            printBtn: document.getElementById('printBtn'),
            
            // Other tools
            ageDiffDate1: document.getElementById('ageDiffDate1'),
            ageDiffDate2: document.getElementById('ageDiffDate2'),
            calculateDiffBtn: document.getElementById('calculateDiffBtn'),
            diffResult: document.getElementById('diffResult'),
            
            retirementAge: document.getElementById('retirementAge'),
            retirementDate: document.getElementById('retirementDate'),
            calculateRetirementBtn: document.getElementById('calculateRetirementBtn'),
            retirementResult: document.getElementById('retirementResult'),
            
            lifeExpectancyInput: document.getElementById('lifeExpectancy'),
            calculateLifeBtn: document.getElementById('calculateLifeBtn'),
            lifeResult: document.getElementById('lifeResult'),
            
            // Notifications
            notification: document.getElementById('notification')
        };
    }

    loadPreferences() {
        // Theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.isDarkMode = savedTheme === 'dark';
        }
        this.applyTheme();
        
        // Last tab
        const savedTab = localStorage.getItem('lastTab');
        if (savedTab) {
            this.currentTab = savedTab;
        }
    }

    applyTheme() {
        if (this.isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    checkReducedMotion() {
        this.animationsEnabled = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    bindEvents() {
        // Main calculator
        if (this.elements.calculateBtn) {
            this.elements.calculateBtn.addEventListener('click', () => this.calculateAge());
        }
        
        // Theme toggle
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // History
        if (this.elements.openHistoryBtn) {
            this.elements.openHistoryBtn.addEventListener('click', () => this.showHistory());
        }
        if (this.elements.closeHistoryBtn) {
            this.elements.closeHistoryBtn.addEventListener('click', () => this.hideHistory());
        }
        if (this.elements.clearHistoryBtn) {
            this.elements.clearHistoryBtn.addEventListener('click', () => this.clearAllHistory());
        }
        
        // Copy, Share, Print
        if (this.elements.copyBtn) this.elements.copyBtn.addEventListener('click', () => this.copyResults());
        if (this.elements.shareBtn) this.elements.shareBtn.addEventListener('click', () => this.shareResults());
        if (this.elements.printBtn) this.elements.printBtn.addEventListener('click', () => this.printResults());
        
        // Tab switching
        this.elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab));
        });
        
        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.historyModal && this.elements.historyModal.classList.contains('show')) {
                this.hideHistory();
            }
        });
        
        // Input validation
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            input.addEventListener('change', () => this.validateDateInput(input));
        });
        
        // Auto calculate on date change for main tool
        if (this.elements.birthDateInput) {
            this.elements.birthDateInput.addEventListener('change', () => {
                if (this.elements.birthDateInput.value) this.calculateAge();
            });
        }
    }

    initializeTabs() {
        this.switchTab(this.currentTab);
    }

    switchTab(tabId) {
        this.currentTab = tabId;
        localStorage.setItem('lastTab', tabId);
        
        this.elements.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        
        this.elements.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-tab`);
        });
    }

    setInitialDate() {
        if (!this.elements.birthDateInput) return;
        
        const eighteenYearsAgo = new Date();
        eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
        this.elements.birthDateInput.value = eighteenYearsAgo.toISOString().split('T')[0];
    }

    validateDateInput(input) {
        const date = new Date(input.value);
        const today = new Date();
        
        if (date > today) {
            this.showNotification('Birth date cannot be in the future', 'error');
            input.value = '';
            return false;
        }
        return true;
    }

    calculateAge() {
        const birthDateStr = this.elements.birthDateInput ? this.elements.birthDateInput.value : '';
        if (!birthDateStr) {
            this.showNotification('Please select a birth date', 'error');
            return;
        }
        
        const birthDate = new Date(birthDateStr);
        const today = new Date();
        
        if (birthDate > today) {
            this.showNotification('Birth date cannot be in the future', 'error');
            return;
        }
        
        const ageData = this.computeAgeDetails(birthDate, today);
        
        this.renderMainAge(ageData);
        this.renderDetailedLived(ageData);
        this.renderNextBirthday(birthDate);
        this.renderZodiacInfo(birthDate);
        this.renderLifeStats(birthDate);
        this.renderAnimalAges(birthDate);
        this.renderBirthInfo(birthDate);
        
        this.saveToHistory(ageData, birthDate);
        
        // Show results with animation
        if (this.elements.ageResults) {
            this.elements.ageResults.classList.add('show');
        }
        
        this.showNotification('Age calculated successfully!', 'success');
    }

    computeAgeDetails(birthDate, today) {
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        let days = today.getDate() - birthDate.getDate();
        
        if (days < 0) {
            months--;
            const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            days += lastMonth.getDate();
        }
        
        if (months < 0) {
            years--;
            months += 12;
        }
        
        // Total days
        const totalMs = today.getTime() - birthDate.getTime();
        const totalDays = Math.floor(totalMs / (1000 * 60 * 60 * 24));
        const totalWeeks = Math.floor(totalDays / 7);
        const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
        const totalMinutes = Math.floor(totalMs / (1000 * 60));
        const totalSeconds = Math.floor(totalMs / 1000);
        
        return {
            years,
            months,
            days,
            weeks: totalWeeks,
            totalDays,
            totalHours,
            totalMinutes,
            totalSeconds,
            totalMonths: (years * 12) + months,
            birthDate: birthDate
        };
    }

    renderMainAge(data) {
        const container = this.elements.detailedAge;
        if (!container) return;
        
        container.innerHTML = `
            <div class="age-main">
                <div class="age-number">
                    <span class="number">${data.years}</span>
                    <span class="label">Years</span>
                </div>
                <div class="age-breakdown">
                    <div>${data.months} months</div>
                    <div>${data.days} days</div>
                </div>
            </div>
        `;
    }

    renderDetailedLived(data) {
        const container = this.elements.totalLived;
        if (!container) return;
        
        container.innerHTML = `
            <div class="lived-grid">
                <div class="stat-item">
                    <span class="value">${data.totalMonths.toLocaleString()}</span>
                    <span class="label">Total Months</span>
                </div>
                <div class="stat-item">
                    <span class="value">${data.weeks.toLocaleString()}</span>
                    <span class="label">Total Weeks</span>
                </div>
                <div class="stat-item">
                    <span class="value">${data.totalDays.toLocaleString()}</span>
                    <span class="label">Total Days</span>
                </div>
                <div class="stat-item">
                    <span class="value">${data.totalHours.toLocaleString()}</span>
                    <span class="label">Total Hours</span>
                </div>
                <div class="stat-item">
                    <span class="value">${data.totalMinutes.toLocaleString()}</span>
                    <span class="label">Total Minutes</span>
                </div>
                <div class="stat-item">
                    <span class="value">${data.totalSeconds.toLocaleString()}</span>
                    <span class="label">Total Seconds</span>
                </div>
            </div>
        `;
    }

    renderNextBirthday(birthDate) {
        const container = this.elements.nextBirthday;
        if (!container) return;
        
        const today = new Date();
        const nextBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
        
        if (nextBirthday < today) {
            nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
        }
        
        const timeLeft = nextBirthday.getTime() - today.getTime();
        const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
        
        container.innerHTML = `
            <div class="next-birthday">
                <div class="countdown">
                    <span class="days">${daysLeft}</span>
                    <span class="label">days until next birthday</span>
                </div>
            </div>
        `;
    }

    getWesternZodiac(month, day) {
        const zodiacSigns = [
            { name: "Capricorn", start: {m:12, d:22}, end: {m:1, d:19} },
            { name: "Aquarius", start: {m:1, d:20}, end: {m:2, d:18} },
            { name: "Pisces", start: {m:2, d:19}, end: {m:3, d:20} },
            { name: "Aries", start: {m:3, d:21}, end: {m:4, d:19} },
            { name: "Taurus", start: {m:4, d:20}, end: {m:5, d:20} },
            { name: "Gemini", start: {m:5, d:21}, end: {m:6, d:20} },
            { name: "Cancer", start: {m:6, d:21}, end: {m:7, d:22} },
            { name: "Leo", start: {m:7, d:23}, end: {m:8, d:22} },
            { name: "Virgo", start: {m:8, d:23}, end: {m:9, d:22} },
            { name: "Libra", start: {m:9, d:23}, end: {m:10, d:22} },
            { name: "Scorpio", start: {m:10, d:23}, end: {m:11, d:21} },
            { name: "Sagittarius", start: {m:11, d:22}, end: {m:12, d:21} }
        ];
        
        for (let sign of zodiacSigns) {
            if ((month + 1 === sign.start.m && day >= sign.start.d) || 
                (month + 1 === sign.end.m && day <= sign.end.d) ||
                (month + 1 > sign.start.m && month + 1 < sign.end.m)) {
                return sign.name;
            }
        }
        return "Capricorn";
    }

    getChineseZodiac(year) {
        const animals = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"];
        return animals[(year - 4) % 12];
    }

    renderZodiacInfo(birthDate) {
        const container = this.elements.zodiacInfo;
        if (!container) return;
        
        const month = birthDate.getMonth();
        const day = birthDate.getDate();
        const year = birthDate.getFullYear();
        
        const western = this.getWesternZodiac(month, day);
        const chinese = this.getChineseZodiac(year);
        
        container.innerHTML = `
            <div class="zodiac-grid">
                <div class="zodiac-card">
                    <h4>Western Zodiac</h4>
                    <div class="sign">${western}</div>
                </div>
                <div class="zodiac-card">
                    <h4>Chinese Zodiac</h4>
                    <div class="sign">${chinese}</div>
                </div>
                <div class="zodiac-card">
                    <h4>Birthstone</h4>
                    <div>${this.getBirthstone(month)}</div>
                </div>
                <div class="zodiac-card">
                    <h4>Birth Flower</h4>
                    <div>${this.getBirthFlower(month)}</div>
                </div>
            </div>
        `;
    }

    getBirthstone(month) {
        const stones = ["Garnet", "Amethyst", "Aquamarine", "Diamond", "Emerald", "Pearl", "Ruby", "Peridot", "Sapphire", "Opal", "Topaz", "Turquoise"];
        return stones[month] || "Garnet";
    }

    getBirthFlower(month) {
        const flowers = ["Carnation", "Violet", "Daffodil", "Daisy", "Lily of the Valley", "Rose", "Larkspur", "Gladiolus", "Aster", "Marigold", "Chrysanthemum", "Holly"];
        return flowers[month] || "Carnation";
    }

    renderLifeStats(birthDate) {
        const container = this.elements.lifeStats;
        if (!container) return;
        
        const today = new Date();
        const totalDays = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Rough estimates
        const heartbeats = Math.floor(totalDays * 24 * 60 * 72); // \~72 bpm
        const breaths = Math.floor(totalDays * 24 * 60 * 16);    // \~16 bpm
        const hoursSlept = Math.floor(totalDays * 8);
        const waterLiters = Math.floor(totalDays * 2.5);
        
        container.innerHTML = `
            <div class="life-stats-grid">
                <div class="stat"><span class="icon">❤️</span> ${heartbeats.toLocaleString()} heartbeats</div>
                <div class="stat"><span class="icon">🫁</span> ${breaths.toLocaleString()} breaths</div>
                <div class="stat"><span class="icon">🌙</span> ${hoursSlept.toLocaleString()} hours slept</div>
                <div class="stat"><span class="icon">💧</span> ${waterLiters.toLocaleString()} liters water</div>
                <div class="stat"><span class="icon">🌅</span> ${Math.floor(totalDays)} sunrises</div>
                <div class="stat"><span class="icon">🌍</span> ${birthDate.getFullYear() < 1900 ? 'Many' : Math.floor((today.getFullYear() - birthDate.getFullYear()))} Earth orbits</div>
            </div>
        `;
    }

    renderAnimalAges(birthDate) {
        const container = this.elements.animalAge;
        if (!container) return;
        
        const today = new Date();
        const humanYears = (today.getFullYear() - birthDate.getFullYear());
        
        const animals = [
            {name: "Dog", age: Math.round(humanYears * 7)},
            {name: "Cat", age: Math.round(humanYears * 6.5)},
            {name: "Horse", age: Math.round(humanYears * 3.5)},
            {name: "Rabbit", age: Math.round(humanYears * 8)},
            {name: "Elephant", age: Math.round(humanYears * 0.8)}
        ];
        
        let html = '<div class="animal-grid">';
        animals.forEach(animal => {
            html += `
                <div class="animal-card">
                    <div class="animal-name">${animal.name}</div>
                    <div class="animal-age">${animal.age} years</div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }

    renderBirthInfo(birthDate) {
        // Additional info can be appended to results if needed
    }

    saveToHistory(ageData, birthDate) {
        const entry = {
            id: Date.now(),
            date: new Date().toISOString(),
            birthDate: birthDate.toISOString().split('T')[0],
            age: `${ageData.years} years, ${ageData.months} months`,
            timestamp: Date.now()
        };
        
        this.history.unshift(entry);
        
        // Keep last 50 entries
        if (this.history.length > 50) {
            this.history.pop();
        }
        
        localStorage.setItem('ageCalculatorHistory', JSON.stringify(this.history));
    }

    loadHistory() {
        const saved = localStorage.getItem('ageCalculatorHistory');
        if (saved) {
            this.history = JSON.parse(saved);
        }
    }

    showHistory() {
        const modal = this.elements.historyModal;
        const list = this.elements.historyList;
        
        if (!modal || !list) return;
        
        list.innerHTML = '';
        
        if (this.history.length === 0) {
            list.innerHTML = '<p class="no-history">No calculations yet</p>';
        } else {
            this.history.forEach((entry, index) => {
                const div = document.createElement('div');
                div.className = 'history-item';
                div.innerHTML = `
                    <div>
                        <div class="history-date">${new Date(entry.date).toLocaleDateString()}</div>
                        <div class="history-age">Born: ${entry.birthDate} • Age: ${entry.age}</div>
                    </div>
                    <button class="delete-btn" data-id="${entry.id}">×</button>
                `;
                list.appendChild(div);
            });
            
            // Attach delete listeners
            list.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this