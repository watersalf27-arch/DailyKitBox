/* =========================================
   DailyKitBox JPG to PDF Tool
   Part 1A - Setup
========================================= */

const input = document.getElementById("images");
const preview = document.getElementById("preview");
const convertBtn = document.getElementById("convertBtn");
const status = document.getElementById("status");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const imageCount = document.getElementById("imageCount");
const totalSize = document.getElementById("totalSize");
const pageSize = document.getElementById("pageSize");
const orientation = document.getElementById("orientation");
const quality = document.getElementById("quality");

/* ---------- Global Variables ---------- */
let selectedImages = [];
let imageRotations = new Map();
let draggedIndex = null;

/* ---------- Update Counter ---------- */
function updateStats() {
  const total = selectedImages.reduce((sum, file) => sum + file.size, 0);
  imageCount.textContent = selectedImages.length + " Images";
  totalSize.textContent = (total / 1024 / 1024).toFixed(2) + " MB";
}

/* ---------- Reset Progress ---------- */
function resetProgress() {
  progressBar.style.width = "0%";
  progressText.textContent = "";
}

/* ---------- Status ---------- */
function setStatus(message) {
  status.textContent = message;
}

/* ---------- File Validation ---------- */
function isValidImage(file) {
  const allowed = ["image/jpeg", "image/png"];
  return allowed.includes(file.type);
}

/* ---------- Clear Preview ---------- */
function clearPreview() {
  preview.innerHTML = "";
  selectedImages = [];
  imageRotations.clear();
  updateStats();
  resetProgress();
}

/* ---------- Image Upload ---------- */
input.addEventListener("change", () => {
  clearPreview();

  const files = Array.from(input.files);

  if (files.length === 0) {
    setStatus("Please select images.");
    return;
  }

  files.forEach(file => {
    if (!isValidImage(file)) return;
    selectedImages.push(file);
    imageRotations.set(file, 0);
  });

  refreshPreview();
  updateStats();
  setStatus(selectedImages.length + " image(s) selected.");
});

/* =========================================
   Part 2A - Preview Card UI
========================================= */

function buildPreviewCard(card, file, imageSrc, index) {
  card.dataset.index = index;

  const rotation = imageRotations.get(file) || 0;

  card.innerHTML = `
    <div class="preview-item">
      <img class="preview-image" src="${imageSrc}" alt="${file.name}" style="transform: rotate(${rotation}deg);">
      <div class="preview-info">
        <strong>${file.name}</strong>
        <small>${(file.size / 1024).toFixed(1)} KB</small>
      </div>
      <div class="preview-actions">
        <button class="rotate-left" type="button">↺</button>
        <button class="rotate-right" type="button">↻</button>
        <button class="delete-btn" type="button">✕</button>
      </div>
    </div>
  `;

  const image = card.querySelector(".preview-image");
  bindPreviewEvents(card, file, image);
  preview.appendChild(card);
}

/* =========================================
   Part 2B - Preview Events (rotate / delete)
========================================= */

function bindPreviewEvents(card, file, image) {
  card.querySelector(".delete-btn").onclick = () => {
    selectedImages = selectedImages.filter(f => f !== file);
    imageRotations.delete(file);
    refreshPreview();
    updateStats();
    setStatus(selectedImages.length + " image(s) selected.");

    if (selectedImages.length === 0) {
      resetProgress();
      setStatus("Please select images.");
    }
  };

  card.querySelector(".rotate-left").onclick = () => {
    const angle = (imageRotations.get(file) || 0) - 90;
    imageRotations.set(file, angle);
    image.style.transform = `rotate(${angle}deg)`;
  };

  card.querySelector(".rotate-right").onclick = () => {
    const angle = (imageRotations.get(file) || 0) + 90;
    imageRotations.set(file, angle);
    image.style.transform = `rotate(${angle}deg)`;
  };

  image.addEventListener("click", () => {
    openImagePreview(image.src);
  });
}

/* =========================================
   Part 3A - PDF Engine
========================================= */

async function createPDF() {
  if (selectedImages.length === 0) {
    setStatus("Please select at least one image.");
    return;
  }

  convertBtn.disabled = true;
  setStatus("Creating PDF...");
  progressBar.style.width = "0%";
  progressText.textContent = "0% Completed";

  try {
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
      orientation: orientation.value,
      unit: "mm",
      format: pageSize.value
    });

    for (let i = 0; i < selectedImages.length; i++) {
      const file = selectedImages[i];
      const dataUrl = await fileToDataURL(file);
      const rotatedDataUrl = await applyRotation(dataUrl, imageRotations.get(file) || 0);
      const img = await loadImage(rotatedDataUrl);
      const page = getPageDimensions(pdf, img);

      if (i > 0) {
        pdf.addPage();
      }

      const type = file.type === "image/png" ? "PNG" : "JPEG";

      pdf.addImage(
        rotatedDataUrl,
        type,
        page.x,
        page.y,
        page.width,
        page.height,
        undefined,
        quality.value
      );

      updateProgress(i + 1, selectedImages.length);
    }

    pdf.save("DailyKitBox.pdf");
    progressBar.style.width = "100%";
    progressText.textContent = "✅ PDF Ready";
    setStatus("✅ PDF downloaded successfully.");
  } catch (err) {
    console.error(err);
    setStatus("❌ Something went wrong while creating the PDF.");
  } finally {
    convertBtn.disabled = false;
  }
}

/* =========================================
   Part 3B - PDF Helper Functions
========================================= */

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject("File read failed");
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject("Image load failed");
    img.src = src;
  });
}

/* Bakes the rotation into the actual pixels using a canvas,
   so rotated images look correct inside the PDF */
function applyRotation(dataUrl, angle) {
  return new Promise((resolve, reject) => {
    if (!angle) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const rad = (angle * Math.PI) / 180;
      const swap = Math.abs(angle % 180) === 90;

      canvas.width = swap ? img.height : img.width;
      canvas.height = swap ? img.width : img.height;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL());
    };
    img.onerror = () => reject("Image load failed during rotation");
    img.src = dataUrl;
  });
}

function getPageDimensions(pdf, img) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);

  const width = img.width * ratio;
  const height = img.height * ratio;
  const x = (pageWidth - width) / 2;
  const y = (pageHeight - height) / 2;

  return { x, y, width, height };
}

function updateProgress(current, total) {
  const percent = Math.round((current / total) * 100);
  progressBar.style.width = percent + "%";
  progressText.textContent = percent + "% Completed";
}

convertBtn.addEventListener("click", createPDF);

/* =========================================
   Part 4 - Refresh + Drag & Drop Reordering
   (single, consistent system)
========================================= */

function refreshPreview() {
  preview.innerHTML = "";

  selectedImages.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      const card = document.createElement("div");
      card.className = "preview-card";
      card.draggable = true;
      buildPreviewCard(card, file, e.target.result, index);
    };
    reader.readAsDataURL(file);
  });
}

preview.addEventListener("dragstart", e => {
  const card = e.target.closest(".preview-card");
  if (!card) return;
  draggedIndex = Number(card.dataset.index);
});

preview.addEventListener("dragover", e => {
  e.preventDefault();
  const card = e.target.closest(".preview-card");
  if (!card) return;
  card.classList.add("drag-over");
});

preview.addEventListener("dragleave", e => {
  const card = e.target.closest(".preview-card");
  if (!card) return;
  card.classList.remove("drag-over");
});

preview.addEventListener("drop", e => {
  e.preventDefault();

  const card = e.target.closest(".preview-card");
  if (!card) return;

  const targetIndex = Number(card.dataset.index);

  if (draggedIndex === targetIndex || draggedIndex === null) {
    return;
  }

  const moved = selectedImages.splice(draggedIndex, 1)[0];
  selectedImages.splice(targetIndex, 0, moved);
  draggedIndex = null;

  refreshPreview();
});

preview.addEventListener("dragend", () => {
  document.querySelectorAll(".preview-card").forEach(card => {
    card.classList.remove("drag-over");
  });
});

/* =========================================
   Part 5A - Image Zoom Preview Modal
========================================= */

function openImagePreview(src) {
  let modal = document.getElementById("imagePreviewModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "imagePreviewModal";
    modal.innerHTML = `
      <div class="preview-modal">
        <span class="preview-close">×</span>
        <img id="previewModalImage">
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector(".preview-close").onclick = () => {
      modal.style.display = "none";
    };

    modal.onclick = e => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    };
  }

  modal.style.display = "flex";

  const img = document.getElementById("previewModalImage");
  img.src = src;
  img.style.transform = "scale(1)";

  let zoom = 1;
  img.onwheel = e => {
    e.preventDefault();
    zoom += e.deltaY < 0 ? 0.1 : -0.1;
    zoom = Math.max(0.5, Math.min(zoom, 3));
    img.style.transform = `scale(${zoom})`;
  };
}