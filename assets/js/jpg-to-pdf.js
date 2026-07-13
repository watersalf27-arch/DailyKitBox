// --- Initial Setup ---
const uploadBox = document.querySelector('.upload-box');
const fileInput = document.getElementById('fileInput');
const previewArea = document.getElementById('previewArea');
const convertBtn = document.getElementById('convertBtn');
const progressBar = document.getElementById('progressBar'); // HTML mein ye div hona chahiye

let selectedFiles = [];

// --- Events ---
uploadBox.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(files) {
    selectedFiles = Array.from(files);
    renderPreview();
}

// --- Preview & Management ---
function renderPreview() {
    previewArea.innerHTML = `<h4>Images: ${selectedFiles.length} | Total Size: ${calculateTotalSize()}</h4>`;
    selectedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'image-item';
        item.innerHTML = `
            <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
            <button onclick="removeImage(${index})">Delete</button>
        `;
        previewArea.appendChild(item);
    });
}

function calculateTotalSize() {
    let size = selectedFiles.reduce((total, file) => total + file.size, 0);
    return (size / 1024 / 1024).toFixed(2) + " MB";
}

function removeImage(index) {
    selectedFiles.splice(index, 1);
    renderPreview();
}

// --- Core Conversion Engine ---
convertBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    for (let i = 0; i < selectedFiles.length; i++) {
        // Update Progress Bar
        let progress = ((i + 1) / selectedFiles.length) * 100;
        if(progressBar) progressBar.style.width = progress + "%";

        const imgData = await readFileAsDataURL(selectedFiles[i]);
        
        if (i > 0) doc.addPage();
        
        // Compression & Memory Optimization
        // 0.5 quality means 50% compression for faster PDF generation
        doc.addImage(imgData, 'JPEG', 10, 10, 190, 277, undefined, 'FAST'); 
    }

    doc.save("DailyKitBox_Document.pdf");
});

function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}
