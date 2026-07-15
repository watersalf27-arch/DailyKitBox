"use strict";

/**
 * Age Calculator - Production Ready Vanilla JS
 * assets/js/age-calculator.js
 * DailyKitBox - Enterprise Quality
 */

class AgeCalculator {
    constructor() {
        this.currentTab = 'human';
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
        this.populateAnimalSelect();
    }

    cacheDOM() {
        this.elements = {
            // Tabs
            tabButtons: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            
            // Human Age
            birthDateInput: document.getElementById('birth-date'),
            birthTimeInput: document.getElementById('birth-time'),
            calculateHumanBtn: document.getElementById('calculate-human'),
            humanResults: document.getElementById('human-results'),
            zodiacInfo: document.getElementById('zodiac-info'),
            lifeStats: document.getElementById('life-stats'),
            
            // Animal Age
            animalTypeSelect: document.getElementById('animal-type'),
            petAgeInput: document.getElementById('pet-age'),
            calculateAnimalBtn: document.getElementById('calculate-animal'),
            animalResults: document.getElementById('animal-results'),
            
            // Tools
            date1: document.getElementById('date1'),
            date2: document.getElementById('date2'),
            calcDiffBtn: document.getElementById('calc-diff'),
            diffResult: document.getElementById('diff-result'),
            
            nextBirthdayInput: document.getElementById('next-birthday'),
            countdownResult: document.getElementById('countdown-result'),
            
            retireAgeInput: document.getElementById('retire-age'),
            retireResult: document.getElementById('retire-result'),
            
            // Controls
            themeToggle: document.getElementById('theme-toggle'),
            themeIcon: document.getElementById('theme-icon'),
            historyBtn: document.getElementById('history-btn'),
            
            // History Modal
            historyModal: document.getElementById('history-modal'),
            historyList: document.getElementById('history-list'),
            clearHistoryBtn: document.getElementById('clear-history'),
            
            // Result actions
            copyHumanBtn: document.getElementById('copy-human'),
            shareHumanBtn: document.getElementById('share-human'),
            printHumanBtn: document.getElementById('print-human')
        };
    }

    loadPreferences() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.isDarkMode = savedTheme === 'dark';
        }
        this.applyTheme();
        
        const savedTab = localStorage.getItem('lastTab');
        if (savedTab) {
            this.currentTab = savedTab;
        }
    }

    applyTheme() {
        if (this.isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (this.elements.themeIcon) this.elements.themeIcon.textContent = '☀️';
        } else {
            document.documentElement.removeAttribute('data-theme');
            if (this.elements.themeIcon) this.elements.themeIcon.textContent = '🌙';
        }
    }

    checkReducedMotion() {
        this.animationsEnabled = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    populateAnimalSelect() {
        if (!this.elements.animalTypeSelect) return;
        
        const animals = [
            "Dog", "Cat", "Horse", "Rabbit", "Cow", "Buffalo", "Goat", "Sheep",
            "Pig", "Camel", "Donkey", "Elephant", "Lion", "Tiger", "Wolf",
            "Fox", "Monkey", "Bird", "Parrot", "Chicken", "Duck", "Turkey",
            "Hamster", "Guinea Pig", "Mouse", "Rat", "Snake", "Turtle", "Lizard"
        ];
        
        animals.forEach(animal => {
            const option = document.createElement('option');
            option.value = animal.toLowerCase().replace(/\s+/g, '');
            option.textContent = animal;
            this.elements.animalTypeSelect.appendChild(option);
        });
    }

    bindEvents() {
        // Human Age
        if (this.elements.calculateHumanBtn) {
            this.elements.calculateHumanBtn.addEventListener('click', () => this.calculateHumanAge());
        }
        
        // Animal Age
        if (this.elements.calculateAnimalBtn) {
            this.elements.calculateAnimalBtn.addEventListener('click', () => this.calculateAnimalAge());
        }
        
        // Tools
        if (this.elements.calcDiffBtn) {
            this.elements.calcDiffBtn.addEventListener('click', () => this.calculateAgeDifference());
        }
        
        // History
        if (this.elements.historyBtn) {
            this.elements.historyBtn.addEventListener('click', () => this.showHistory());
        }
        if (this.elements.clearHistoryBtn) {
            this.elements.clearHistoryBtn.addEventListener('click', () => this.clearAllHistory());
        }
        
        // Theme
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Result actions
        if (this.elements.copyHumanBtn) this.elements.copyHumanBtn.addEventListener('click', () => this.copyResults());
        if (this.elements.shareHumanBtn) this.elements.shareHumanBtn.addEventListener('click', () => this.shareResults());
        if (this.elements.printHumanBtn) this.elements.printHumanBtn.addEventListener('click', () => window.print());
        
        // Tab switching
        this.elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab));
        });
        
        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.historyModal && 
                this.elements.historyModal.style.display === 'flex') {
                this.hideHistory();
            }
        });
        
        // Auto calculate on date change
        if (this.elements.birthDateInput) {
            this.elements.birthDateInput.addEventListener('change', () => {
                if (this.elements.birthDateInput.value) this.calculateHumanAge();
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

    validateDateInput(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (date > today) {
            this.showNotification('Date cannot be in the future', 'error');
            return false;
        }
        return true;
    }

    calculateHumanAge() {
        const birthDateStr = this.elements.birthDateInput ? this.elements.birthDateInput.value : '';
        if (!birthDateStr) {
            this.showNotification('Please select birth date', 'error');
            return;
        }
        
        if (!this.validateDateInput(birthDateStr)) return;
        
        const birthDate = new Date(birthDateStr);
        const today = new Date();
        
        const ageData = this.computeAgeDetails(birthDate, today);
        
        this.renderHumanResults(ageData, birthDate);
        this.renderZodiac(birthDate);
        this.renderLifeStats(birthDate);
        
        this.saveToHistory(ageData, birthDate);
        
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
        
        const totalMs = today.getTime() - birthDate.getTime();
        const totalDays = Math.floor(totalMs / (1000 * 60 * 60 * 24));
        
        return {
            years,
            months,
            days,
            totalDays,
            totalWeeks: Math.floor(totalDays / 7),
            totalMonths: years * 12 + months,
            totalHours: Math.floor(totalMs / (1000 * 60 * 60)),
            totalMinutes: Math.floor(totalMs / (1000 * 60)),
            totalSeconds: Math.floor(totalMs / 1000)
        };
    }

    renderHumanResults(data, birthDate) {
        const container = this.elements.humanResults;
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align:center; margin-bottom:1.5rem;">
                <div style="font-size:4rem; font-weight:700; line-height:1;">${data.years}</div>
                <div style="font-size:1.1rem; opacity:0.8;">YEARS OLD</div>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px,1fr)); gap:1rem; font-size:1.05rem;">
                <div><strong>${data.months}</strong> months</div>
                <div><strong>${data.days}</strong> days</div>
                <div><strong>${data.totalWeeks.toLocaleString()}</strong> weeks</div>
                <div><strong>${data.totalDays.toLocaleString()}</strong> days lived</div>
            </div>
            <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid var(--border); font-size:0.95rem; opacity:0.85;">
                Next birthday in <strong>${this.getDaysToNextBirthday(birthDate)}</strong> days
            </div>
        `;
    }

    getDaysToNextBirthday(birthDate) {
        const today = new Date();
        let nextBD = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        
        if (nextBD < today) {
            nextBD.setFullYear(nextBD.getFullYear() + 1);
        }
        
        const diff = nextBD.getTime() - today.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    renderZodiac(birthDate) {
        const container = this.elements.zodiacInfo;
        if (!container) return;
        
        const month = birthDate.getMonth();
        const day = birthDate.getDate();
        const year = birthDate.getFullYear();
        
        const western = this.getWesternZodiac(month, day);
        const chinese = this.getChineseZodiac(year);
        
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                <div><strong>Western:</strong> ${western}</div>
                <div><strong>Chinese:</strong> ${chinese}</div>
                <div><strong>Birthstone:</strong> ${this.getBirthstone(month)}</div>
                <div><strong>Flower:</strong> ${this.getBirthFlower(month)}</div>
            </div>
        `;
    }

    getWesternZodiac(month, day) {
        const signs = [
            {name:"Capricorn", sm:12, sd:22, em:1, ed:19},
            {name:"Aquarius", sm:1, sd:20, em:2, ed:18},
            {name:"Pisces", sm:2, sd:19, em:3, ed:20},
            {name:"Aries", sm:3, sd:21, em:4, ed:19},
            {name:"Taurus", sm:4, sd:20, em:5, ed:20},
            {name:"Gemini", sm:5, sd:21, em:6, ed:20},
            {name:"Cancer", sm:6, sd:21, em:7, ed:22},
            {name:"Leo", sm:7, sd:23, em:8, ed:22},
            {name:"Virgo", sm:8, sd:23, em:9, ed:22},
            {name:"Libra", sm:9, sd:23, em:10, ed:22},
            {name:"Scorpio", sm:10, sd:23, em:11, ed:21},
            {name:"Sagittarius", sm:11, sd:22, em:12, ed:21}
        ];
        
        for (let s of signs) {
            if ((month + 1 === s.sm && day >= s.sd) || 
                (month + 1 === s.em && day <= s.ed) ||
                (month + 1 > s.sm && month + 1 < s.em)) {
                return s.name;
            }
        }
        return "Capricorn";
    }

    getChineseZodiac(year) {
        const animals = ["Rat","Ox","Tiger","Rabbit","Dragon","Snake","Horse","Goat","Monkey","Rooster","Dog","Pig"];
        return animals[(year - 4) % 12];
    }

    getBirthstone(m) {
        const stones = ["Garnet","Amethyst","Aquamarine","Diamond","Emerald","Pearl","Ruby","Peridot","Sapphire","Opal","Topaz","Turquoise"];
        return stones[m] || "Garnet";
    }

    getBirthFlower(m) {
        const flowers = ["Carnation","Violet","Daffodil","Daisy","Lily","Rose","Larkspur","Gladiolus","Aster","Marigold","Chrysanthemum","Holly"];
        return flowers[m] || "Carnation";
    }

    renderLifeStats(birthDate) {
        const container = this.elements.lifeStats;
        if (!container) return;
        
        const today = new Date();
        const totalDays = Math.floor((today.getTime() - birthDate.getTime()) / 86400000);
        
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:1rem; font-size:0.95rem;">
                <div>❤️ ${Math.floor(totalDays * 72 * 24).toLocaleString()} heartbeats</div>
                <div>🫁 ${Math.floor(totalDays * 16 * 24).toLocaleString()} breaths</div>
                <div>🌅 ${totalDays} sunrises</div>
                <div>🌍 ${today.getFullYear() - birthDate.getFullYear()} Earth orbits</div>
            </div>
        `;
    }

    calculateAnimalAge() {
        const type = this.elements.animalTypeSelect ? this.elements.animalTypeSelect.value : 'dog';
        const animalYears = parseFloat(this.elements.petAgeInput ? this.elements.petAgeInput.value : 5);
        
        if (isNaN(animalYears) || animalYears < 0) {
            this.showNotification('Please enter valid age', 'error');
            return;
        }
        
        let humanEquivalent = animalYears;
        
        switch(type) {
            case 'dog': humanEquivalent = Math.round(animalYears * 7); break;
            case 'cat': humanEquivalent = Math.round(animalYears * 6.5); break;
            case 'horse': humanEquivalent = Math.round(animalYears * 3.5); break;
            case 'rabbit': humanEquivalent = Math.round(animalYears * 8); break;
            default: humanEquivalent = Math.round(animalYears * 5);
        }
        
        const container = this.elements.animalResults;
        if (container) {
            container.innerHTML = `
                <div style="text-align:center; padding:2rem 0;">
                    <div style="font-size:3rem; font-weight:700;">${humanEquivalent}</div>
                    <div style="font-size:1.2rem;">Human Years</div>
                    <div style="margin-top:1rem; font-size:0.95rem; opacity:0.8;">for a ${type}</div>
                </div>
            `;
        }
        
        this.showNotification('Animal age converted!', 'success');
    }

    calculateAgeDifference() {
        const d1 = this.elements.date1 ? this.elements.date1.value : '';
        const d2 = this.elements.date2 ? this.elements.date2.value : '';
        
        if (!d1 || !d2) {
            this.showNotification('Please select both dates', 'error');
            return;
        }
        
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        
        const diffMs = Math.abs(date2 - date1);
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (this.elements.diffResult) {
            this.elements.diffResult.innerHTML = `
                <strong>${diffDays.toLocaleString()}</strong> days difference
            `;
        }
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
        if (this.history.length > 30) this.history.pop();
        
        localStorage.setItem('ageCalculatorHistory', JSON.stringify(this.history));
    }

    loadHistory() {
        const saved = localStorage.getItem('ageCalculatorHistory');
        if (saved) this.history = JSON.parse(saved);
    }

    showHistory() {
        const modal = this.elements.historyModal;
        const list = this.elements.historyList;
        
        if (!modal || !list) return;
        
        modal.style.display = 'flex';
        list.innerHTML = '';
        
        if (this.history.length === 0) {
            list.innerHTML = '<p style="text-align:center; padding:2rem; opacity:0.6;">No history yet</p>';
            return;
        }
        
        this.history.forEach(entry => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:1rem; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;';
            item.innerHTML = `
                <div>
                    <div style="font-weight:500;">${entry.birthDate}</div>
                    <div style="font-size:0.9rem; opacity:0.8;">${entry.age}</div>
                </div>
                <button class="delete-btn" data-id="${entry.id}" style="background:none; border:none; font-size:1.4rem; cursor:pointer;">×</button>
            `;
            list.appendChild(item);
        });
        
        list.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteHistoryItem(parseInt(e.target.dataset.id));
            });
        });
    }

    hideHistory() {
        if (this.elements.historyModal) {
            this.elements.historyModal.style.display = 'none';
        }
    }

    deleteHistoryItem(id) {
        this.history = this.history.filter(h => h.id !== id);
        localStorage.setItem('ageCalculatorHistory', JSON.stringify(this.history));
        this.showHistory();
    }

    clearAllHistory() {
        if (confirm('Clear all calculation history?')) {
            this.history = [];
            localStorage.removeItem('ageCalculatorHistory');
            this.hideHistory();
            this.showNotification('History cleared', 'success');
        }
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
        this.applyTheme();
    }

    copyResults() {
        let text = "DailyKitBox Age Calculator\n";
        if (this.elements.birthDateInput && this.elements.birthDateInput.value) {
            text += `Birth Date: ${this.elements.birthDateInput.value}\n`;
        }
        text += "Calculated accurately with ❤️";
        
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Copied to clipboard!', 'success');
        });
    }