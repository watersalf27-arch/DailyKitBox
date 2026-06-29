const imageCount = document.getElementById("imageCount");
const totalSize = document.getElementById("totalSize");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const input = document.getElementById("images");
const preview = document.getElementById("preview");
const convertBtn = document.getElementById("convertBtn");
const status = document.getElementById("status");

let selectedImages = [];

input.addEventListener("change", () => {

preview.innerHTML = "";
selectedImages = [];

const files = Array.from(input.files);

files.forEach(file => {
let total = selectedImages.reduce((sum, file) => sum + file.size, 0);

imageCount.textContent = selectedImages.length + " Images";

totalSize.textContent = (total / 1024 / 1024).toFixed(2) + " MB";

const allowed = [".jpg", ".jpeg", ".png"];

const extension = "." + file.name.split(".").pop().toLowerCase();

if (!allowed.includes(extension)) return;

selectedImages.push(file);

const reader = new FileReader();

reader.onload = function(e){

const card = document.createElement("div");
card.className = "preview-card";

card.innerHTML = `
<div class="preview-item">

<img src="${e.target.result}" alt="${file.name}">

<div class="preview-info">
<strong>${file.name}</strong>
<small>${Math.round(file.size/1024)} KB</small>
</div>

<button class="delete-btn">✕</button>
let total = selectedImages.reduce((sum, file) => sum + file.size, 0);

imageCount.textContent = selectedImages.length + " Images";

totalSize.textContent = (total / 1024 / 1024).toFixed(2) + " MB";
</div>
`;
card.querySelector(".delete-btn").addEventListener("click", () => {

selectedImages = selectedImages.filter(f => f !== file);

card.remove();

status.textContent = selectedImages.length + " image(s) selected.";

});
preview.appendChild(card);

};

reader.readAsDataURL(file);

});

status.textContent =
selectedImages.length + " image(s) selected.";

});
convertBtn.addEventListener("click", async () => {

if (selectedImages.length === 0) {
status.textContent = "Please select at least one image.";
return;
}

status.textContent = "Creating PDF...";

const { jsPDF } = window.jspdf;

const pageSize = document.getElementById("pageSize").value;
const orientation =
document.getElementById("orientation").value;

const pdf = new jsPDF({
orientation: orientation,
unit: "mm",
format: pageSize
});

for (let i = 0; i < selectedImages.length; i++) {

const file = selectedImages[i];

const dataUrl = await new Promise(resolve => {

const reader = new FileReader();

reader.onload = e => resolve(e.target.result);

reader.readAsDataURL(file);

});

const img = await new Promise(resolve => {

const image = new Image();

image.onload = () => resolve(image);

image.src = dataUrl;

});

const pageWidth = pdf.internal.pageSize.getWidth();
const pageHeight = pdf.internal.pageSize.getHeight();

const ratio = Math.min(
pageWidth / img.width,
pageHeight / img.height
);

const width = img.width * ratio;
const height = img.height * ratio;

const x = (pageWidth - width) / 2;
const y = (pageHeight - height) / 2;

if (i > 0) pdf.addPage();

pdf.addImage(dataUrl, "JPEG", x, y, width, height);
const percent = Math.round(((i + 1) / selectedImages.length) * 100);

progressBar.style.width = percent + "%";
progressText.textContent = percent + "% Completed";
}

pdf.save("DailyKitBox.pdf");
progressBar.style.width = "100%";
progressText.textContent = "✅ PDF Ready";

status.textContent = "✅ PDF downloaded successfully.";

});