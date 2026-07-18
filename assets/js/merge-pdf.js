'use strict';

/* ==========================================================================
   DailyKitBox Merge PDF — merge-pdf.js
   Uses pdf-lib (merging/rotation) and pdf.js (thumbnail rendering).
   All processing happens locally in the browser. No file uploads.
   ========================================================================== */

const $ = (id) => document.getElementById(id);

/* ==========================================================================
   THEME (auto system detect + manual toggle, persisted)
   ========================================================================== */
const themeToggle = $('themeToggle');

function applyTheme(mode) {
  if (mode === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.setAttribute('aria-pressed', 'true');
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeToggle.setAttribute('aria-pressed', 'false');
  }
}

const savedTheme = localStorage.getItem('mpTheme');
if (savedTheme) {
  applyTheme(savedTheme);
} else {
  applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('mpTheme', next);
});

/* ==========================================================================
   TOAST NOTIFICATIONS
   ========================================================================== */
function showToast(message, type = 'info') {
  const container = $('toastContainer');
  const toast = document.createElement('div');
  toast.className = `mp-toast mp-toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('mp-toast-fadeout');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ==========================================================================
   STATE
   ========================================================================== */
let uploadedFiles = []; // { id, file, name, size, rotation, thumbDataUrl }
let mergeCancelled = false;
let fileIdCounter = 0;

/* ==========================================================================
   ELEMENTS
   ========================================================================== */
const dropZone = $('dropZone');
const fileInput = $('fileInput');
const browseBtn = $('browseBtn');
const fileListSection = $('fileListSection');
const fileList = $('fileList');
const fileCount = $('fileCount');
const totalSizeEl = $('totalSize');
const statusText = $('statusText');
const outputName = $('outputName');
const mergeBtn = $('mergeBtn');
const cancelBtn = $('cancelBtn');
const clearBtn = $('clearBtn');
const progressWrap = $('progressWrap');
const progressBar = $('progressBar');
const progressText = $('progressText');
const resultSection = $('resultSection');
const downloadBtn = $('downloadBtn');
const copyLinkBtn = $('copyLinkBtn');
const shareBtn = $('shareBtn');

/* ==========================================================================
   UPLOAD HANDLERS
   ========================================================================== */
browseBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});

fileInput.addEventListener('change', (e) => handleNewFiles([...e.target.files]));

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  handleNewFiles([...e.dataTransfer.files]);
});

function handleNewFiles(files) {
  const validPdfs = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

  if (!validPdfs.length) {
    showToast('Please select valid PDF files.', 'error');
    return;
  }
  if (validPdfs.length !== files.length) {
    showToast('Some files were skipped because they are not PDFs.', 'error');
  }

  validPdfs.forEach(file => {
    const entry = {
      id: `file-${fileIdCounter++}`,
      file,
      name: file.name,
      size: file.size,
      rotation: 0,
      thumbDataUrl: null
    };
    uploadedFiles.push(entry);
    renderThumbnail(entry);
  });

  fileListSection.classList.remove('mp-hidden');
  resultSection.classList.add('mp-hidden');
  renderFileList();
  showToast(`${validPdfs.length} file(s) added.`, 'success');
}

/* ==========================================================================
   THUMBNAIL RENDERING (pdf.js)
   ========================================================================== */
async function renderThumbnail(entry) {
  try {
    if (typeof pdfjsLib === 'undefined') return;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await entry.file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.3 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;
    entry.thumbDataUrl = canvas.toDataURL('image/png');

    const thumbImg = document.querySelector(`[data-file-id="${entry.id}"] .mp-file-thumb img`);
    if (thumbImg) thumbImg.src = entry.thumbDataUrl;
  } catch (err) {
    /* thumbnail rendering is best-effort; a failed preview does not block merging */
  }
}

/* ==========================================================================
   FILE LIST RENDERING
   ========================================================================== */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderFileList() {
  fileList.innerHTML = '';

  uploadedFiles.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'mp-file-card';
    li.draggable = true;
    li.dataset.fileId = entry.id;
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-label', `${entry.name}, use arrow keys with Alt to reorder`);

    li.innerHTML = `
      <span class="mp-file-drag-handle" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="6" r="1.5" fill="currentColor"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/><circle cx="8" cy="18" r="1.5" fill="currentColor"/><circle cx="16" cy="6" r="1.5" fill="currentColor"/><circle cx="16" cy="12" r="1.5" fill="currentColor"/><circle cx="16" cy="18" r="1.5" fill="currentColor"/></svg>
      </span>
      <span class="mp-file-thumb rotate-${entry.rotation}">
        ${entry.thumbDataUrl ? `<img src="${entry.thumbDataUrl}" alt="Preview of ${entry.name}" loading="lazy">` : '<span class="mp-skeleton" style="width:100%;height:100%;"></span>'}
      </span>
      <span class="mp-file-info">
        <span class="mp-file-name">${escapeHtml(entry.name)}</span>
        <span class="mp-file-meta">${formatBytes(entry.size)} · Rotation: ${entry.rotation}°</span>
      </span>
      <span class="mp-file-controls">
        <button type="button" class="mp-icon-btn" data-action="rotate" aria-label="Rotate ${entry.name}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 11-3-6.7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M21 4v5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button type="button" class="mp-icon-btn mp-danger" data-action="delete" aria-label="Remove ${entry.name}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </span>
    `;
    fileList.appendChild(li);
  });

  fileCount.textContent = uploadedFiles.length;
  const totalBytes = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
  totalSizeEl.textContent = formatBytes(totalBytes);
  statusText.textContent = uploadedFiles.length ? 'Ready' : 'Empty';
  mergeBtn.disabled = uploadedFiles.length < 2;

  attachFileCardEvents();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ==========================================================================
   FILE CARD ACTIONS (rotate / delete)
   ========================================================================== */
function attachFileCardEvents() {
  fileList.querySelectorAll('[data-action="rotate"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.mp-file-card');
      const id = card.dataset.fileId;
      const entry = uploadedFiles.find(f => f.id === id);
      entry.rotation = (entry.rotation + 90) % 360;
      renderFileList();
    });
  });

  fileList.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.mp-file-card');
      const id = card.dataset.fileId;
      uploadedFiles = uploadedFiles.filter(f => f.id !== id);
      renderFileList();
      if (!uploadedFiles.length) fileListSection.classList.add('mp-hidden');
      showToast('File removed.', 'info');
    });
  });

  /* Drag and drop reordering */
  let draggedId = null;

  fileList.querySelectorAll('.mp-file-card').forEach(card => {
    card.addEventListener('dragstart', () => {
      draggedId = card.dataset.fileId;
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.classList.add('drag-over');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const targetId = card.dataset.fileId;
      if (draggedId && targetId && draggedId !== targetId) {
        reorderFiles(draggedId, targetId);
      }
    });

    /* Keyboard reordering: Alt+ArrowUp / Alt+ArrowDown */
    card.addEventListener('keydown', (e) => {
      if (!e.altKey) return;
      const id = card.dataset.fileId;
      const index = uploadedFiles.findIndex(f => f.id === id);
      if (e.key === 'ArrowUp' && index > 0) {
        e.preventDefault();
        moveFile(index, index - 1);
      } else if (e.key === 'ArrowDown' && index < uploadedFiles.length - 1) {
        e.preventDefault();
        moveFile(index, index + 1);
      }
    });
  });
}

function reorderFiles(draggedId, targetId) {
  const fromIndex = uploadedFiles.findIndex(f => f.id === draggedId);
  const toIndex = uploadedFiles.findIndex(f => f.id === targetId);
  moveFile(fromIndex, toIndex);
}

function moveFile(fromIndex, toIndex) {
  const [moved] = uploadedFiles.splice(fromIndex, 1);
  uploadedFiles.splice(toIndex, 0, moved);
  renderFileList();
  const newCard = fileList.querySelector(`[data-file-id="${moved.id}"]`);
  if (newCard) newCard.focus();
}

/* ==========================================================================
   CLEAR ALL
   ========================================================================== */
clearBtn.addEventListener('click', () => {
  uploadedFiles = [];
  fileInput.value = '';
  renderFileList();
  fileListSection.classList.add('mp-hidden');
  resultSection.classList.add('mp-hidden');
  showToast('All files cleared.', 'info');
});

/* ==========================================================================
   MERGE LOGIC (pdf-lib)
   ========================================================================== */
const ROTATION_MAP = { 0: 0, 90: 90, 180: 180, 270: 270 };

mergeBtn.addEventListener('click', async () => {
  if (uploadedFiles.length < 2) {
    showToast('Please add at least two PDF files to merge.', 'error');
    return;
  }
  if (typeof PDFLib === 'undefined') {
    showToast('PDF engine failed to load. Check your internet connection.', 'error');
    return;
  }

  mergeCancelled = false;
  mergeBtn.disabled = true;
  cancelBtn.classList.remove('mp-hidden');
  progressWrap.classList.remove('mp-hidden');
  statusText.textContent = 'Merging';
  progressBar.style.width = '0%';
  progressText.textContent = '0%';

  try {
    const { PDFDocument, degrees } = PDFLib;
    const mergedPdf = await PDFDocument.create();

    for (let i = 0; i < uploadedFiles.length; i++) {
      if (mergeCancelled) {
        showToast('Merge cancelled.', 'info');
        resetProgress();
        return;
      }

      const entry = uploadedFiles[i];
      const arrayBuffer = await entry.file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false }).catch(() => {
        throw new Error(`"${entry.name}" could not be read. It may be password-protected or corrupted.`);
      });

      const pageIndices = sourcePdf.getPageIndices();
      const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);

      copiedPages.forEach(page => {
        if (entry.rotation) {
          const current = page.getRotation().angle || 0;
          page.setRotation(degrees((current + entry.rotation) % 360));
        }
        mergedPdf.addPage(page);
      });

      const percent = Math.round(((i + 1) / uploadedFiles.length) * 100);
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${percent}%`;
    }

    if (mergeCancelled) return;

    const mergedBytes = await mergedPdf.save();
    const blob = new Blob([mergedBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const filename = `${(outputName.value.trim() || 'DailyKitBox-Merged')}.pdf`;
    downloadBtn.href = url;
    downloadBtn.setAttribute('download', filename);

    window.mpLastMergedUrl = url;
    window.mpLastMergedFilename = filename;

    resultSection.classList.remove('mp-hidden');
    statusText.textContent = 'Completed';
    saveRecentFile(filename);
    showToast('PDF merged successfully!', 'success');
  } catch (err) {
    showToast(err.message || 'Something went wrong while merging.', 'error');
    statusText.textContent = 'Error';
  } finally {
    resetProgress();
  }
});

function resetProgress() {
  mergeBtn.disabled = uploadedFiles.length < 2;
  cancelBtn.classList.add('mp-hidden');
}

cancelBtn.addEventListener('click', () => {
  mergeCancelled = true;
  showToast('Cancelling merge...', 'info');
});

/* ==========================================================================
   RECENT FILES (names only, persisted)
   ========================================================================== */
function saveRecentFile(filename) {
  const recent = JSON.parse(localStorage.getItem('mpRecentFiles') || '[]');
  recent.unshift({ name: filename, time: new Date().toISOString() });
  localStorage.setItem('mpRecentFiles', JSON.stringify(recent.slice(0, 10)));
}

/* ==========================================================================
   AUTO-SAVE OUTPUT NAME
   ========================================================================== */
const savedOutputName = localStorage.getItem('mpOutputName');
if (savedOutputName) outputName.value = savedOutputName;
outputName.addEventListener('input', () => {
  localStorage.setItem('mpOutputName', outputName.value);
});

/* ==========================================================================
   COPY LINK / SHARE / DOWNLOAD
   ========================================================================== */
copyLinkBtn.addEventListener('click', async () => {
  if (!window.mpLastMergedUrl) return;
  try {
    await navigator.clipboard.writeText(window.mpLastMergedUrl);
    showToast('Link copied. Note: this link only works in this browser session.', 'success');
  } catch (err) {
    showToast('Unable to copy link.', 'error');
  }
});

shareBtn.addEventListener('click', async () => {
  if (!window.mpLastMergedUrl) return;
  try {
    const response = await fetch(window.mpLastMergedUrl);
    const blob = await response.blob();
    const file = new File([blob], window.mpLastMergedFilename, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Merged PDF from DailyKitBox' });
    } else if (navigator.share) {
      await navigator.share({ title: 'Merged PDF', text: 'Merged with DailyKitBox', url: window.location.href });
    } else {
      showToast('Sharing is not supported on this browser.', 'error');
    }
  } catch (err) {
    /* user cancelled share — no action needed */
  }
});

/* ==========================================================================
   INPUT VALIDATION
   ========================================================================== */
outputName.addEventListener('blur', () => {
  const cleaned = outputName.value.replace(/[\\/:*?"<>|]/g, '').trim();
  outputName.value = cleaned || 'DailyKitBox-Merged';
});

/* ==========================================================================
   PWA: SERVICE WORKER REGISTRATION
   ========================================================================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/merge-pdf/service-worker.js').catch(() => {
      /* offline support is a progressive enhancement; failure is non-blocking */
    });
  });
}
