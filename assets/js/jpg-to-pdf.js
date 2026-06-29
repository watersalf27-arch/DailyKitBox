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

</div>
`;
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

}

pdf.save("DailyKitBox.pdf");

status.textContent = "✅ PDF downloaded successfully.";

});