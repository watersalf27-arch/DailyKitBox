// Word Counter Logic
const textInput = document.getElementById('textInput');
if (textInput) {
    textInput.addEventListener('input', () => {
        const text = textInput.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        const chars = text.length;
        document.getElementById('stats').innerText = `Words: ${words} | Characters: ${chars}`;
    });
}

function clearText() {
    if (textInput) {
        textInput.value = '';
        document.getElementById('stats').innerText = "Words: 0 | Characters: 0";
    }
}

// Age Calculator Logic
function calculateAge() {
    const dob = document.getElementById('dob').value;
    if (dob) {
        const age = new Date().getFullYear() - new Date(dob).getFullYear();
        document.getElementById('ageResult').innerText = "You are " + age + " years old.";
    }
}

// Tip Calculator Logic
function calculateTip() {
    const bill = document.getElementById('bill').value;
    const tip = bill * 0.15; // 15% default tip
    document.getElementById('tipResult').innerText = "Tip Amount: $" + tip.toFixed(2);
}