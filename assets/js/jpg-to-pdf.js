const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');

uploadBox.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    // Files handling logic here
    console.log("Files ready:", e.target.files);
});

document.getElementById('convertBtn').addEventListener('click', () => {
    progressContainer.style.display = 'block'; // Progress bar visible hoga
    // Conversion Logic...
});
