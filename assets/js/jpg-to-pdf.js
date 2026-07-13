// Initialization
const uploadBox = document.querySelector('.upload-box');
const fileInput = document.getElementById('fileInput');
const previewArea = document.getElementById('previewArea');
const convertBtn = document.getElementById('convertBtn');
let selectedFiles = [];

// Event: Click to Upload
uploadBox.addEventListener('click', () => fileInput.click());

// Event: Drag & Drop
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = '#ffc107';
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
});

// Event: File Selection
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// Function: Handle Files
function handleFiles(files) {
    selectedFiles = Array.from(files);
    renderPreview();
}

// Function: Render Preview
function renderPreview() {
    previewArea.innerHTML = `<h3>Selected Images: ${selectedFiles.length}</h3>`;
    selectedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'image-item';
        item.innerHTML = `
            <span>${file.name}</span>
            <button onclick="removeImage(${index})">Delete</button>
        `;
        previewArea.appendChild(item);
    });
}

// Function: Remove Image
function removeImage(index) {
    selectedFiles.splice(index, 1);
    renderPreview();
}

// Function: Convert to PDF
convertBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) {
        alert("Please upload at least one image first!");
        return;
    }

    alert("Processing " + selectedFiles.length + " files... The download will start automatically.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const imgData = await readFileAsDataURL(file);
        
        if (i > 0) doc.addPage();
        // Adjusting image to fit A4 page
        doc.addImage(imgData, 'JPEG', 10, 10, 190, 277);
    }

    doc.save("converted-document.pdf");
});

// Helper: Convert file to Base64
function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}