// tip-calculator.js
document.addEventListener('DOMContentLoaded', () => {
    const billInput = document.getElementById('billAmount');
    const tipSelect = document.getElementById('tipPercentage');
    const peopleInput = document.getElementById('numPeople');

    function calculateTip() {
        const bill = parseFloat(billInput.value) || 0;
        const tipPercent = parseFloat(tipSelect.value);
        const people = parseInt(peopleInput.value) || 1;

        if (bill <= 0 || people < 1) {
            document.getElementById('tipPerPerson').textContent = '$0.00';
            document.getElementById('totalPerPerson').textContent = '$0.00';
            return;
        }

        const totalTip = bill * tipPercent;
        const totalBill = bill + totalTip;

        const tipPerPerson = totalTip / people;
        const totalPerPerson = totalBill / people;

        document.getElementById('tipPerPerson').textContent = `$${tipPerPerson.toFixed(2)}`;
        document.getElementById('totalPerPerson').textContent = `$${totalPerPerson.toFixed(2)}`;
    }

    // Dynamic calculations as user types/changes inputs
    billInput.addEventListener('input', calculateTip);
    tipSelect.addEventListener('change', calculateTip);
    peopleInput.addEventListener('input', calculateTip);
});