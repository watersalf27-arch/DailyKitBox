const uploadBox = document.querySelector('.upload-box');
const fileInput = document.getElementById('fileInput');
let selectedFiles = [];

// 1. Drag & Drop Feature
uploadBox.addEventListener('click', () => fileInput.click());

uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = 'var(--accent)';
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// 2. File Handling & Counter
function handleFiles(files) {
    selectedFiles = Array.from(files);
    
    // UI Update: File Counter
    if (selectedFiles.length > 0) {
        uploadBox.innerHTML = `<p>${selectedFiles.length} file(s) selected for conversion</p>`;
        uploadBox.style.background = '#e6fffa'; // Visual feedback
    }
}

// 3. Conversion Simulation (Download Fix)
document.getElementById('convertBtn').addEventListener('click', () => {
    if (selectedFiles.length === 0) {
        alert("Pehle image select karein!");
        return;
    }    
    // Yahan logic ayega jo file ko PDF mein convert karega
    // Abhi ke liye ye sirf status dikha raha hai
    alert("Processing " + selectedFiles.length + " files... Download shuru ho raha hai.");
    // Yahan asli PDF download trigger hoga
});