// --- WORD COUNTER ---
const textInput = document.getElementById('textInput');
if (textInput) {
    textInput.addEventListener('input', () => {
        const text = textInput.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        const chars = text.length;
        document.getElementById('stats').innerText = `Words: ${words} | Characters: ${chars}`;
    });
}

// --- AGE CALCULATOR ---
function calculateAge() {
    const dob = document.getElementById('dob').value;
    if (dob) {
        const age = new Date().getFullYear() - new Date(dob).getFullYear();
        document.getElementById('ageResult').innerText = "You are " + age + " years old.";
    }
}

// --- TIP CALCULATOR ---
function calculateTip() {
    const bill = parseFloat(document.getElementById('bill').value);
    if (bill) {
        const tip = (bill * 0.15).toFixed(2);
        document.getElementById('tipResult').innerText = "Tip Amount: $" + tip;
    }
}

// --- MORTGAGE CALCULATOR ---
function calculateMortgage() {
    const p = parseFloat(document.getElementById('principal').value);
    const r = parseFloat(document.getElementById('interest').value) / 100 / 12;
    const n = parseFloat(document.getElementById('years').value) * 12;
    if (p && r && n) {
        const m = p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        document.getElementById('mortgageResult').innerText = "Monthly Payment: $" + m.toFixed(2);
    }
}

// --- CLEAR FUNCTION ---
function clearFields(ids) {
    ids.forEach(id => document.getElementById(id).value = '');
}