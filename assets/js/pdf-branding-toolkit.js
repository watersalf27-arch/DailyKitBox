(function () {
  "use strict";

  /* ================= THEME TOGGLE ================= */
  const themeToggle = document.getElementById("themeToggle");
  const root = document.documentElement;
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    localStorage.setItem("dkb-theme", t);
  }
  const savedTheme = localStorage.getItem("dkb-theme") ||
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(savedTheme);
  themeToggle.addEventListener("click", () => {
    applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  /* ================= TOASTS ================= */
  const toastStack = document.getElementById("toastStack");
  function showToast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    toastStack.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  /* ================= PDF.JS SETUP ================= */
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  /* ================= STATE ================= */
  let originalBytes = null;
  let pdfJsDoc = null;
  let numPages = 1;
  let currentPreviewPage = 1;
  let wmImageFile = null;
  let wmImageEl = null;

  /* ================= DOM REFS ================= */
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const loadingState = document.getElementById("loadingState");
  const editorState = document.getElementById("editorState");
  const successState = document.getElementById("successState");
  const fileInfo = document.getElementById("fileInfo");
  const baseCanvas = document.getElementById("baseCanvas");
  const overlayCanvas = document.getElementById("overlayCanvas");
  const previewPageLabel = document.getElementById("previewPageLabel");

  function showOnly(el) {
    [dropzone, loadingState, editorState, successState].forEach((e) => {
      e.style.display = e === el ? (el === editorState ? "block" : "flex") : "none";
    });
  }

  /* ================= FILE HANDLING ================= */
  document.getElementById("chooseFileBtn").addEventListener("click", () => fileInput.click());
  document.getElementById("heroUploadBtn").addEventListener("click", () => {
    document.getElementById("workspace").scrollIntoView({ behavior: "smooth", block: "start" });
    fileInput.click();
  });
  document.getElementById("learnMoreBtn").addEventListener("click", () => {
    document.getElementById("how-it-works").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.style.borderColor = "var(--accent)"; });
  dropzone.addEventListener("dragleave", () => { dropzone.style.borderColor = ""; });
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "";
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  async function handleFile(file) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      showToast("Please choose a PDF file");
      return;
    }
    showOnly(loadingState);
    try {
      const buf = await file.arrayBuffer();
      originalBytes = new Uint8Array(buf);
      const loadingTask = pdfjsLib.getDocument({ data: originalBytes.slice() });
      pdfJsDoc = await loadingTask.promise;
      numPages = pdfJsDoc.numPages;
      currentPreviewPage = 1;
      fileInfo.textContent = file.name + " \u00b7 " + numPages + " page" + (numPages === 1 ? "" : "s") + " \u00b7 " + formatBytes(file.size);
      showOnly(editorState);
      await renderBasePage(currentPreviewPage);
    } catch (err) {
      console.error(err);
      showToast("Could not read that PDF. Try another file.");
      showOnly(dropzone);
    }
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  document.getElementById("backBtn").addEventListener("click", () => {
    originalBytes = null;
    pdfJsDoc = null;
    fileInput.value = "";
    showOnly(dropzone);
  });
  document.getElementById("editAgainBtn").addEventListener("click", () => showOnly(editorState));

  /* ================= TABS ================= */
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((p) => (p.style.display = "none"));
      document.getElementById("tab-" + btn.dataset.tab).style.display = "flex";
    });
  });

  /* ================= WATERMARK CONTROLS ================= */
  let wmType = "text";
  document.getElementById("wmTypeText").addEventListener("click", () => setWmType("text"));
  document.getElementById("wmTypeImage").addEventListener("click", () => setWmType("image"));
  function setWmType(type) {
    wmType = type;
    document.getElementById("wmTypeText").classList.toggle("active", type === "text");
    document.getElementById("wmTypeImage").classList.toggle("active", type === "image");
    document.getElementById("wmTextFields").style.display = type === "text" ? "flex" : "none";
    document.getElementById("wmTextFields").style.flexDirection = "column";
    document.getElementById("wmTextFields").style.gap = "14px";
    document.getElementById("wmImageFields").style.display = type === "image" ? "flex" : "none";
    document.getElementById("wmImageFields").style.flexDirection = "column";
    document.getElementById("wmImageFields").style.gap = "14px";
    renderOverlay();
  }

  document.getElementById("wmImageInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    wmImageFile = file;
    const img = new Image();
    img.onload = () => { wmImageEl = img; renderOverlay(); };
    img.src = URL.createObjectURL(file);
  });

  let wmPosition = "middle-center";
  document.querySelectorAll("#wmPositionGrid button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#wmPositionGrid button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      wmPosition = btn.dataset.pos;
      renderOverlay();
    });
  });

  const liveInputs = [
    "wmEnabled", "wmText", "wmColor", "wmFontSize", "wmOpacity", "wmRotation", "wmImageScale",
    "headerEnabled", "headerText", "headerAlign", "headerColor",
    "footerEnabled", "footerText", "footerAlign", "footerColor",
    "pageNumEnabled", "pageNumFormat", "pageNumAlign",
  ];
  liveInputs.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      if (id === "wmFontSize") document.getElementById("wmFontSizeValue").textContent = el.value;
      if (id === "wmOpacity") document.getElementById("wmOpacityValue").textContent = el.value;
      if (id === "wmImageScale") document.getElementById("wmImageScaleValue").textContent = el.value;
      renderOverlay();
    });
  });

  /* ================= PREVIEW PAGE NAV ================= */
  document.getElementById("prevPageBtn").addEventListener("click", async () => {
    if (!pdfJsDoc || currentPreviewPage <= 1) return;
    currentPreviewPage--;
    await renderBasePage(currentPreviewPage);
  });
  document.getElementById("nextPageBtn").addEventListener("click", async () => {
    if (!pdfJsDoc || currentPreviewPage >= numPages) return;
    currentPreviewPage++;
    await renderBasePage(currentPreviewPage);
  });

  async function renderBasePage(pageNum) {
    const page = await pdfJsDoc.getPage(pageNum);
    const unscaled = page.getViewport({ scale: 1 });
    const wrapWidth = document.querySelector(".preview-canvas-wrap").clientWidth || 480;
    const targetWidth = Math.min(wrapWidth - 4, 520);
    const scale = targetWidth / unscaled.width;
    const viewport = page.getViewport({ scale });

    baseCanvas.width = viewport.width;
    baseCanvas.height = viewport.height;
    overlayCanvas.width = viewport.width;
    overlayCanvas.height = viewport.height;

    const ctx = baseCanvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;

    previewPageLabel.textContent = pageNum + " / " + numPages;
    renderOverlay();
  }

  /* ================= POSITION HELPERS ================= */
function splitPreset(preset) {
    const [v, h] = preset.split("-");
    return { v, h }; // v: top/middle/bottom, h: left/center/right
  }

  // Canvas (y-down) position for drawing preview text/images
  function canvasAnchor(preset, w, h, marginX, marginY) {
    const { v, h: horiz } = splitPreset(preset);
    let x, textAlign;
    if (horiz === "left") { x = marginX; textAlign = "left"; }
    else if (horiz === "right") { x = w - marginX; textAlign = "right"; }
    else { x = w / 2; textAlign = "center"; }

    let y, textBaseline;
    if (v === "top") { y = marginY; textBaseline = "top"; }
    else if (v === "bottom") { y = h - marginY; textBaseline = "bottom"; }
    else { y = h / 2; textBaseline = "middle"; }

    return { x, y, textAlign, textBaseline };
  }

  // PDF (y-up, points) bottom-left anchor for a box of size boxW x boxH
  function pdfAnchor(preset, pageW, pageH, marginX, marginY, boxW, boxH) {
    const { v, h: horiz } = splitPreset(preset);
    let x;
    if (horiz === "left") x = marginX;
    else if (horiz === "right") x = pageW - marginX - boxW;
    else x = (pageW - boxW) / 2;

    let y;
    if (v === "top") y = pageH - marginY - boxH;
    else if (v === "bottom") y = marginY;
    else y = (pageH - boxH) / 2;

    return { x, y };
  }

  function hexToRgb01(hex) {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return { r, g, b };
  }

  /* ================= LIVE OVERLAY PREVIEW ================= */
  function renderOverlay() {
    if (!overlayCanvas.width) return;
    const ctx = overlayCanvas.getContext("2d");
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    const W = overlayCanvas.width, H = overlayCanvas.height;
    const margin = Math.max(10, W * 0.035);

    // Watermark
    if (document.getElementById("wmEnabled").checked) {
      const opacity = parseInt(document.getElementById("wmOpacity").value, 10) / 100;
      const rotation = parseInt(document.getElementById("wmRotation").value, 10);
      ctx.save();
      ctx.globalAlpha = opacity;
      if (wmType === "text") {
        const text = document.getElementById("wmText").value || "";
        const fontSize = Math.max(6, parseInt(document.getElementById("wmFontSize").value, 10) * (W / 520));
        const color = document.getElementById("wmColor").value;
        ctx.font = "700 " + fontSize + "px 'Space Grotesk', sans-serif";
        ctx.fillStyle = color;
        const anchor = canvasAnchor(wmPosition, W, H, margin, margin);
        ctx.textAlign = anchor.textAlign;
        ctx.textBaseline = anchor.textBaseline;
        ctx.translate(anchor.x, anchor.y);
        ctx.rotate((-rotation * Math.PI) / 180);
        ctx.fillText(text, 0, 0);
      } else if (wmImageEl) {
        const scalePct = parseInt(document.getElementById("wmImageScale").value, 10) / 100;
        const imgW = W * scalePct;
        const imgH = imgW * (wmImageEl.height / wmImageEl.width);
        const anchor = canvasAnchor(wmPosition, W, H, margin, margin);
        let dx = anchor.x, dy = anchor.y;
        if (anchor.textAlign === "center") dx -= imgW / 2;
        if (anchor.textAlign === "right") dx -= imgW;
        if (anchor.textBaseline === "middle") dy -= imgH / 2;
        if (anchor.textBaseline === "bottom") dy -= imgH;
        ctx.translate(dx + imgW / 2, dy + imgH / 2);
        ctx.rotate((-rotation * Math.PI) / 180);
        ctx.drawImage(wmImageEl, -imgW / 2, -imgH / 2, imgW, imgH);
      }
      ctx.restore();
    }

    // Header
    if (document.getElementById("headerEnabled").checked) {
      const text = document.getElementById("headerText").value || "";
      if (text) {
        ctx.save();
        ctx.font = (11 * (W / 520)) + "px Inter, sans-serif";
        ctx.fillStyle = document.getElementById("headerColor").value;
        const align = document.getElementById("headerAlign").value;
        const anchor = canvasAnchor("top-" + align, W, H, margin, margin * 0.9);
        ctx.textAlign = anchor.textAlign;
        ctx.textBaseline = anchor.textBaseline;
        ctx.fillText(text, anchor.x, anchor.y);
        ctx.restore();
      }
    }

    // Footer
    if (document.getElementById("footerEnabled").checked) {
      const text = document.getElementById("footerText").value || "";
      if (text) {
        ctx.save();
        ctx.font = (10.5 * (W / 520)) + "px Inter, sans-serif";
        ctx.fillStyle = document.getElementById("footerColor").value;
        const align = document.getElementById("footerAlign").value;
        const anchor = canvasAnchor("bottom-" + align, W, H, margin, margin * 1.3);
        ctx.textAlign = anchor.textAlign;
        ctx.textBaseline = anchor.textBaseline;
        ctx.fillText(text, anchor.x, anchor.y);
        ctx.restore();
      }
    }

    // Page number
    if (document.getElementById("pageNumEnabled").checked) {
      const fmt = document.getElementById("pageNumFormat").value;
      const text = fmt.replace("{n}", String(currentPreviewPage)).replace("{total}", String(numPages));
      ctx.save();
      ctx.font = (10.5 * (W / 520)) + "px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#5B5E6D";
      const align = document.getElementById("pageNumAlign").value;
      const anchor = canvasAnchor("bottom-" + align, W, H, margin, margin * 0.6);
      ctx.textAlign = anchor.textAlign;
      ctx.textBaseline = anchor.textBaseline;
      ctx.fillText(text, anchor.x, anchor.y);
      ctx.restore();
    }
  }

  /* ================= APPLY & DOWNLOAD ================= */
  document.getElementById("applyDownloadBtn").addEventListener("click", async () => {
    if (!originalBytes) {
      showToast("Upload a PDF first");
      return;
    }
    const btn = document.getElementById("applyDownloadBtn");
    btn.disabled = true;
    const originalLabel = btn.innerHTML;
    btn.textContent = "Processing\u2026";
    try {
      const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;
      const pdfDoc = await PDFDocument.load(originalBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const total = pages.length;

      const wmEnabled = document.getElementById("wmEnabled").checked;
      const wmText = document.getElementById("wmText").value || "";
      const wmFontSize = parseInt(document.getElementById("wmFontSize").value, 10);
      const wmColorHex = document.getElementById("wmColor").value;
      const wmOpacity = parseInt(document.getElementById("wmOpacity").value, 10) / 100;
      const wmRotation = parseInt(document.getElementById("wmRotation").value, 10);
      const wmImageScalePct = parseInt(document.getElementById("wmImageScale").value, 10) / 100;

      let embeddedWmImage = null;
      if (wmEnabled && wmType === "image" && wmImageFile) {
        const imgBytes = await wmImageFile.arrayBuffer();
        embeddedWmImage = wmImageFile.type === "image/png"
          ? await pdfDoc.embedPng(imgBytes)
          : await pdfDoc.embedJpg(imgBytes);
      }

      const headerEnabled = document.getElementById("headerEnabled").checked;
      const headerText = document.getElementById("headerText").value || "";
      const headerAlign = document.getElementById("headerAlign").value;
      const headerColor = hexToRgb01(document.getElementById("headerColor").value);

      const footerEnabled = document.getElementById("footerEnabled").checked;
      const footerText = document.getElementById("footerText").value || "";
      const footerAlign = document.getElementById("footerAlign").value;
      const footerColor = hexToRgb01(document.getElementById("footerColor").value);

      const pageNumEnabled = document.getElementById("pageNumEnabled").checked;
      const pageNumFormat = document.getElementById("pageNumFormat").value;
      const pageNumAlign = document.getElementById("pageNumAlign").value;

      pages.forEach((page, idx) => {
        const { width, height } = page.getSize();
        const marginPt = 36;

        if (wmEnabled) {
          if (wmType === "text" && wmText) {
            const c = hexToRgb01(wmColorHex);
            const textWidth = font.widthOfTextAtSize(wmText, wmFontSize);
            const anchor = pdfAnchor(wmPosition, width, height, marginPt, marginPt, textWidth, wmFontSize);
            page.drawText(wmText, {
              x: anchor.x,
              y: anchor.y,
              size: wmFontSize,
              font,
              color: rgb(c.r, c.g, c.b),
              opacity: wmOpacity,
              rotate: degrees(wmRotation),
            });
          } else if (wmType === "image" && embeddedWmImage) {
            const imgW = width * wmImageScalePct;
            const imgH = imgW * (embeddedWmImage.height / embeddedWmImage.width);
            const anchor = pdfAnchor(wmPosition, width, height, marginPt, marginPt, imgW, imgH);
            page.drawImage(embeddedWmImage, {
              x: anchor.x,
              y: anchor.y,
              width: imgW,
              height: imgH,
              opacity: wmOpacity,
              rotate: degrees(wmRotation),
            });
          }
        }

        if (headerEnabled && headerText) {
          const size = 10;
          const tw = font.widthOfTextAtSize(headerText, size);
          const anchor = pdfAnchor("top-" + headerAlign, width, height, marginPt, marginPt * 0.8, tw, size);
          page.drawText(headerText, { x: anchor.x, y: anchor.y, size, font, color: rgb(headerColor.r, headerColor.g, headerColor.b) });
        }

        if (footerEnabled && footerText) {
          const size = 9.5;
          const tw = font.widthOfTextAtSize(footerText, size);
          const anchor = pdfAnchor("bottom-" + footerAlign, width, height, marginPt, marginPt * 0.9, tw, size);
          page.drawText(footerText, { x: anchor.x, y: anchor.y, size, font, color: rgb(footerColor.r, footerColor.g, footerColor.b) });
        }

        if (pageNumEnabled) {
          const size = 9.5;
          const text = pageNumFormat.replace("{n}", String(idx + 1)).replace("{total}", String(total));
          const tw = font.widthOfTextAtSize(text, size);
          const anchor = pdfAnchor("bottom-" + pageNumAlign, width, height, marginPt, marginPt * 0.4, tw, size);
          page.drawText(text, { x: anchor.x, y: anchor.y, size, font, color: rgb(0.36, 0.37, 0.43) });
        }
      });

      const metaTitle = document.getElementById("metaTitle").value.trim();
      const metaAuthor = document.getElementById("metaAuthor").value.trim();
      const metaSubject = document.getElementById("metaSubject").value.trim();
      const metaKeywords = document.getElementById("metaKeywords").value.trim();
      const metaCreator = document.getElementById("metaCreator").value.trim();
      if (metaTitle) pdfDoc.setTitle(metaTitle);
      if (metaAuthor) pdfDoc.setAuthor(metaAuthor);
      if (metaSubject) pdfDoc.setSubject(metaSubject);
      if (metaKeywords) pdfDoc.setKeywords(metaKeywords.split(",").map((k) => k.trim()).filter(Boolean));
      if (metaCreator) { pdfDoc.setCreator(metaCreator); pdfDoc.setProducer(metaCreator); }

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "branded-document.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      showOnly(successState);
    } catch (err) {
      console.error(err);
      showToast("Something went wrong while processing this PDF");
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalLabel;
    }
  });

  /* ================= FAQ ACCORDION ================= */
  document.querySelectorAll(".faq-q").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item").forEach((i) => {
        i.classList.remove("open");
        i.querySelector(".faq-q").setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ================= INIT ================= */
  setWmType("text");
})();