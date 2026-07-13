const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const convertBtn = document.getElementById('convertBtn');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');

uploadBox.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        alert(e.target.files.length + " file(s) selected!");
    }
});

convertBtn.addEventListener('click', () => {
    progressContainer.style.display = 'block';
    let width = 0;
    
    let interval = setInterval(() => {
        if (width >= 100) {
            clearInterval(interval);
            alert("PDF Created Successfully!");
            progressContainer.style.display = 'none';
            progressBar.style.width = '0%';
        } else {
            width += 20;
            progressBar.style.width = width + '%';
        }
    }, 400);
});