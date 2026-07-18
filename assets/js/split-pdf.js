'use strict';

/* ==========================================================================
   DailyKitBox Split PDF — split-pdf.js
   Uses PDF.js (rendering), pdf-lib (splitting/rotation), JSZip + FileSaver.js
   (ZIP export). All processing happens locally. No file uploads.
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

const savedTheme = localStorage.getItem('spTheme');
if (savedTheme) {
  applyTheme(savedTheme);
} else {
  applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('spTheme', next);
});

/* ==========================================================================
   PWA INSTALL PROMPT
   ========================================================================== */
let deferredInstallPrompt = null;
const installBtn = $('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installBtn.classList.remove('sp-hidden');
});

installBtn.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installBtn.classList.add('sp-hidden');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/split-pdf/service-worker.js').catch(() => {
      /* offline support is a progressive enhancement; failure is non-blocking */
    });
  });
}

/* ==========================================================================
   TOAST NOTIFICATIONS
   ========================================================================== */
function showToast(message, type = 'info') {
  const container = $('toastContainer');
  const toast = document.createElement('div');
  toast.className = `sp-toast sp-toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('sp-toast-fadeout');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ==========================================================================
   STATE
   ========================================================================== */
let sourceFile = null;
let sourceArrayBuffer = null;
let thumbnails = {}; // originalIndex -> dataURL
let pages = [];       // [{ id, originalIndex, rotation, selected }]
let historyStack = [];
let redoStack = [];
let splitCancelled = false;
let pageIdCounter = 0;

/* ==========================================================================
   ELEMENTS
   ========================================================================== */
const dropZone = $('dropZone');
const fileInput = $('fileInput');
const browseBtn = $('browseBtn');
const editorSection = $('editorSection');
const fileNameDisplay = $('fileNameDisplay');
const pageCountDisplay = $('pageCountDisplay');
const selectedCountDisplay = $('selectedCountDisplay');
const pageGrid = $('pageGrid');
const undoBtn = $('undoBtn');
const redoBtn = $('redoBtn');
const selectAllBtn = $('selectAllBtn');
const selectNoneBtn = $('selectNoneBtn');
const newFileBtn = $('newFileBtn');
const rangeField = $('rangeField');
const rangeInput = $('rangeInput');
const rangeError = $('rangeError');
const splitBtn = $('splitBtn');
const cancelBtn = $('cancelBtn');
const progressWrap = $('progressWrap');
const progressBar = $('progressBar');
const progressText = $('progressText');
const resultSection = $('resultSection');
const resultList = $('resultList');
const downloadZipBtn = $('downloadZipBtn');
const splitModeRadios = document.querySelectorAll('input[name="splitMode"]');

/* ==========================================================================
   UPLOAD
   ========================================================================== */
browseBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) loadPdf(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) loadPdf(e.target.files[0]);
});

newFileBtn.addEventListener('click', () => {
  editorSection.classList.add('sp-hidden');
  dropZone.classList.remove('sp-hidden');
  resultSection.classList.add('sp-hidden');
  fileInput.value = '';
  pages = [];
  thumbnails = {};
  historyStack = [];
  redoStack = [];
});

async function loadPdf(file) {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    showToast('Please select a valid PDF file.', 'error');
    return;
  }

  sourceFile = file;
  fileNameDisplay.textContent = file.name;
  showToast('Loading PDF pages...', 'info');

  try {
    sourceArrayBuffer = await file.arrayBuffer();
    await renderAllThumbnails(sourceArrayBuffer.slice(0));

    dropZone.classList.add('sp-hidden');
    editorSection.classList.remove('sp-hidden');
    resultSection.classList.add('sp-hidden');
    showToast(`Loaded ${pages.length} page(s).`, 'success');
  } catch (err) {
    showToast('This PDF could not be read. It may be password-protected or corrupted.', 'error');
  }
}

/* ==========================================================================
   THUMBNAIL RENDERING (pdf.js)
   ========================================================================== */
async function renderAllThumbnails(arrayBuffer) {
  if (typeof pdfjsLib === 'undefined') throw new Error('PDF engine not loaded');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  pages = [];
  thumbnails = {};

  for (let i = 1; i <= numPages; i++) {
    pages.push({ id: `p-${pageIdCounter++}`, originalIndex: i - 1, rotation: 0, selected: false });
  }
  renderPageGrid();

  for (let i = 1; i <= numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.35 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      thumbnails[i - 1] = canvas.toDataURL('image/png');

      const img = document.querySelector(`[data-original-index="${i - 1}"] img`);
      if (img) img.src = thumbnails[i - 1];
    } catch (err) {
      /* thumbnail rendering is best-effort; a failed preview does not block splitting */
    }
  }
}

/* ==========================================================================
   HISTORY (undo/redo) — lightweight state snapshots
   ========================================================================== */
function snapshotState() {
  return JSON.stringify(pages);
}

function pushHistory() {
  historyStack.push(snapshotState());
  if (historyStack.length > 30) historyStack.shift();
  redoStack = [];
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  undoBtn.disabled = historyStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

undoBtn.addEventListener('click', () => {
  if (!historyStack.length) return;
  redoStack.push(snapshotState());
  pages = JSON.parse(historyStack.pop());
  renderPageGrid();
  updateUndoRedoButtons();
});

redoBtn.addEventListener('click', () => {
  if (!redoStack.length) return;
  historyStack.push(snapshotState());
  pages = JSON.parse(redoStack.pop());
  renderPageGrid();
  updateUndoRedoButtons();
});

document.addEventListener('keydown', (e) => {
  if (editorSection.classList.contains('sp-hidden')) return;
  if (e.ctrlKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    undoBtn.click();
  } else if (e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
    e.preventDefault();
    redoBtn.click();
  }
});

/* ==========================================================================
   PAGE GRID RENDERING
   ========================================================================== */
function renderPageGrid() {
  pageGrid.innerHTML = '';

  pages.forEach((p, displayIndex) => {
    const li = document.createElement('li');
    li.className = `sp-page-card${p.selected ? ' selected' : ''}`;
    li.draggable = true;
    li.dataset.pageId = p.id;
    li.dataset.originalIndex = p.originalIndex;
    li.setAttribute('tabindex', '0');

    const thumbSrc = thumbnails[p.originalIndex];

    li.innerHTML = `
      <div class="sp-page-thumb rotate-${p.rotation}">
        ${thumbSrc ? `<img src="${thumbSrc}" alt="Page ${displayIndex + 1} preview" loading="lazy">` : '<span class="sp-skeleton"></span>'}
      </div>
      <div class="sp-page-number">Page ${displayIndex + 1}</div>
      <div class="sp-page-controls">
        <input type="checkbox" class="sp-page-checkbox" data-action="select" ${p.selected ? 'checked' : ''} aria-label="Select page ${displayIndex + 1}">
        <button type="button" class="sp-page-mini-btn" data-action="rotate" aria-label="Rotate page ${displayIndex + 1}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 11-3-6.7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M21 4v5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button type="button" class="sp-page-mini-btn sp-danger" data-action="delete" aria-label="Delete page ${displayIndex + 1}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
    `;
    pageGrid.appendChild(li);
  });

  pageCountDisplay.textContent = pages.length;
  selectedCountDisplay.textContent = pages.filter(p => p.selected).length;
  splitBtn.disabled = pages.length === 0;

  attachPageCardEvents();
}

function attachPageCardEvents() {
  pageGrid.querySelectorAll('[data-action="select"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.closest('.sp-page-card').dataset.pageId;
      const page = pages.find(p => p.id === id);
      page.selected = cb.checked;
      cb.closest('.sp-page-card').classList.toggle('selected', cb.checked);
      selectedCountDisplay.textContent = pages.filter(p => p.selected).length;
    });
  });

  pageGrid.querySelectorAll('[data-action="rotate"]').forEach(btn => {
    btn.addEventListener('click', () => {
      pushHistory();
      const id = btn.closest('.sp-page-card').dataset.pageId;
      const page = pages.find(p => p.id === id);
      page.rotation = (page.rotation + 90) % 360;
      renderPageGrid();
    });
  });

  pageGrid.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      pushHistory();
      const id = btn.closest('.sp-page-card').dataset.pageId;
      pages = pages.filter(p => p.id !== id);
      renderPageGrid();
      showToast('Page removed.', 'info');
    });
  });

  let draggedId = null;
  pageGrid.querySelectorAll('.sp-page-card').forEach(card => {
    card.addEventListener('dragstart', () => {
      draggedId = card.dataset.pageId;
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const targetId = card.dataset.pageId;
      if (draggedId && targetId && draggedId !== targetId) {
        pushHistory();
        const fromIndex = pages.findIndex(p => p.id === draggedId);
        const toIndex = pages.findIndex(p => p.id === targetId);
        const [moved] = pages.splice(fromIndex, 1);
        pages.splice(toIndex, 0, moved);
        renderPageGrid();
      }
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        card.querySelector('[data-action="delete"]').click();
        return;
      }
      if (!e.altKey) return;
      const id = card.dataset.pageId;
      const index = pages.findIndex(p => p.id === id);
      if (e.key === 'ArrowUp' && index > 0) {
        e.preventDefault();
        pushHistory();
        const [moved] = pages.splice(index, 1);
        pages.splice(index - 1, 0, moved);
        renderPageGrid();
      } else if (e.key === 'ArrowDown' && index < pages.length - 1) {
        e.preventDefault();
        pushHistory();
        const [moved] = pages.splice(index, 1);
        pages.splice(index + 1, 0, moved);
        renderPageGrid();
      }
    });
  });
}

/* ==========================================================================
   SELECT ALL / NONE
   ========================================================================== */
selectAllBtn.addEventListener('click', () => {
  pages.forEach(p => { p.selected = true; });
  renderPageGrid();
});
selectNoneBtn.addEventListener('click', () => {
  pages.forEach(p => { p.selected = false; });
  renderPageGrid();
});

/* ==========================================================================
   SPLIT MODE TOGGLE
   ========================================================================== */
function updateSplitModeUI() {
  const mode = document.querySelector('input[name="splitMode"]:checked').value;
  rangeField.classList.toggle('sp-hidden', mode !== 'ranges');
}
splitModeRadios.forEach(r => r.addEventListener('change', updateSplitModeUI));
updateSplitModeUI();

/* ==========================================================================
   RANGE PARSING
   ========================================================================== */
function parseRanges(text, totalPages) {
  const ranges = [];
  const parts = text.split(',').map(s => s.trim()).filter(Boolean);

  if (!parts.length) throw new Error('Please enter at least one page range.');

  for (const part of parts) {
    const match = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error(`"${part}" is not a valid range. Use a format like 1-3 or 5.`);

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;

    if (start < 1 || end > totalPages || start > end) {
      throw new Error(`"${part}" is out of range. This PDF has ${totalPages} page(s).`);
    }
    ranges.push({ start, end });
  }
  return ranges;
}

/* ==========================================================================
   SPLIT / EXTRACT LOGIC (pdf-lib)
   ========================================================================== */
let generatedFiles = []; // { name, blob, url }

splitBtn.addEventListener('click', async () => {
  if (!pages.length) {
    showToast('No pages to split.', 'error');
    return;
  }
  if (typeof PDFLib === 'undefined') {
    showToast('PDF engine failed to load. Check your internet connection.', 'error');
    return;
  }

  const mode = document.querySelector('input[name="splitMode"]:checked').value;
  rangeError.textContent = '';

  let ranges = [];
  if (mode === 'ranges') {
    try {
      ranges = parseRanges(rangeInput.value, pages.length);
    } catch (err) {
      rangeError.textContent = err.message;
      return;
    }
  } else if (mode === 'extract') {
    const selectedPages = pages.filter(p => p.selected);
    if (!selectedPages.length) {
      showToast('Please select at least one page to extract.', 'error');
      return;
    }
  }

  splitCancelled = false;
  splitBtn.disabled = true;
  cancelBtn.classList.remove('sp-hidden');
  progressWrap.classList.remove('sp-hidden');
  progressBar.style.width = '0%';
  progressText.textContent = '0%';
  resultSection.classList.add('sp-hidden');
  generatedFiles.forEach(f => URL.revokeObjectURL(f.url));
  generatedFiles = [];

  try {
    const { PDFDocument, degrees } = PDFLib;
    const sourcePdf = await PDFDocument.load(sourceArrayBuffer.slice(0)).catch(() => {
      throw new Error('This PDF could not be processed. It may be password-protected.');
    });

    const baseName = (sourceFile.name || 'document').replace(/\.pdf$/i, '');

    if (mode === 'every') {
      for (let i = 0; i < pages.length; i++) {
        if (splitCancelled) return cancelSplit();
        const p = pages[i];
        const doc = await PDFDocument.create();
        const [copied] = await doc.copyPages(sourcePdf, [p.originalIndex]);
        if (p.rotation) copied.setRotation(degrees(((copied.getRotation().angle || 0) + p.rotation) % 360));
        doc.addPage(copied);
        const bytes = await doc.save();
        await addResult(`${baseName}-page-${i + 1}.pdf`, bytes);
        updateProgress(i + 1, pages.length);
      }
    } else if (mode === 'ranges') {
      for (let i = 0; i < ranges.length; i++) {
        if (splitCancelled) return cancelSplit();
        const { start, end } = ranges[i];
        const doc = await PDFDocument.create();
        const indices = [];
        for (let n = start; n <= end; n++) {
          const pageObj = pages[n - 1];
          indices.push(pageObj ? pageObj.originalIndex : n - 1);
        }
        const copiedPages = await doc.copyPages(sourcePdf, indices);
        copiedPages.forEach((copied, idx) => {
          const pageObj = pages[start - 1 + idx];
          const rotation = pageObj ? pageObj.rotation : 0;
          if (rotation) copied.setRotation(degrees(((copied.getRotation().angle || 0) + rotation) % 360));
          doc.addPage(copied);
        });
        const bytes = await doc.save();
        await addResult(`${baseName}-pages-${start}-${end}.pdf`, bytes);
        updateProgress(i + 1, ranges.length);
      }
    } else if (mode === 'extract') {
      const selectedPages = pages.filter(p => p.selected);
      const doc = await PDFDocument.create();
      const indices = selectedPages.map(p => p.originalIndex);
      const copiedPages = await doc.copyPages(sourcePdf, indices);
      copiedPages.forEach((copied, idx) => {
        const rotation = selectedPages[idx].rotation;
        if (rotation) copied.setRotation(degrees(((copied.getRotation().angle || 0) + rotation) % 360));
        doc.addPage(copied);
      });
      const bytes = await doc.save();
      await addResult(`${baseName}-extracted.pdf`, bytes);
      updateProgress(1, 1);
    }

    if (splitCancelled) return cancelSplit();

    renderResultList();
    resultSection.classList.remove('sp-hidden');
    saveDownloadHistory(generatedFiles.map(f => f.name));
    showToast('PDF split successfully!', 'success');
  } catch (err) {
    showToast(err.message || 'Something went wrong while splitting.', 'error');
  } finally {
    splitBtn.disabled = false;
    cancelBtn.classList.add('sp-hidden');
  }
});

async function addResult(name, bytes) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  generatedFiles.push({ name, blob, url });
}

function updateProgress(done, total) {
  const percent = Math.round((done / total) * 100);
  progressBar.style.width = `${percent}%`;
  progressText.textContent = `${percent}%`;
}

function cancelSplit() {
  showToast('Split cancelled.', 'info');
  splitBtn.disabled = false;
  cancelBtn.classList.add('sp-hidden');
  generatedFiles.forEach(f => URL.revokeObjectURL(f.url));
  generatedFiles = [];
}

cancelBtn.addEventListener('click', () => {
  splitCancelled = true;
});

/* ==========================================================================
   RESULT LIST (rename + individual download)
   ========================================================================== */
function renderResultList() {
  resultList.innerHTML = '';
  generatedFiles.forEach((file, index) => {
    const li = document.createElement('li');
    li.className = 'sp-result-item';
    li.innerHTML = `
      <input type="text" value="${file.name.replace(/\.pdf$/i, '')}" aria-label="Rename ${file.name}" data-index="${index}">
      <span aria-hidden="true">.pdf</span>
      <a href="${file.url}" download="${file.name}" class="sp-btn" data-index="${index}">Download</a>
    `;
    resultList.appendChild(li);
  });

  resultList.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('input', () => {
      const idx = Number(input.dataset.index);
      const cleaned = input.value.replace(/[\\/:*?"<>|]/g, '');
      generatedFiles[idx].name = `${cleaned || 'file'}.pdf`;
      const link = resultList.querySelector(`a[data-index="${idx}"]`);
      link.setAttribute('download', generatedFiles[idx].name);
    });
  });
}

/* ==========================================================================
   DOWNLOAD ALL AS ZIP
   ========================================================================== */
downloadZipBtn.addEventListener('click', async () => {
  if (!generatedFiles.length) return;
  if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
    showToast('ZIP library failed to load. Check your internet connection.', 'error');
    return;
  }

  const zip = new JSZip();
  generatedFiles.forEach(file => {
    zip.file(file.name, file.blob);
  });

  showToast('Preparing ZIP file...', 'info');
  const content = await zip.generateAsync({ type: 'blob' });
  const zipName = `${(sourceFile.name || 'split').replace(/\.pdf$/i, '')}-split-files.zip`;
  saveAs(content, zipName);
  showToast('ZIP downloaded.', 'success');
});

/* ==========================================================================
   RECENT SETTINGS / DOWNLOAD HISTORY (localStorage, metadata only)
   ========================================================================== */
function saveDownloadHistory(filenames) {
  const history = JSON.parse(localStorage.getItem('spDownloadHistory') || '[]');
  history.unshift({ files: filenames, time: new Date().toISOString() });
  localStorage.setItem('spDownloadHistory', JSON.stringify(history.slice(0, 15)));
}

const savedRangeInput = localStorage.getItem('spLastRange');
if (savedRangeInput) rangeInput.value = savedRangeInput;
rangeInput.addEventListener('input', () => {
  localStorage.setItem('spLastRange', rangeInput.value);
});

const savedMode = localStorage.getItem('spLastMode');
if (savedMode) {
  const radio = document.querySelector(`input[name="splitMode"][value="${savedMode}"]`);
  if (radio) radio.checked = true;
  updateSplitModeUI();
}
splitModeRadios.forEach(r => r.addEventListener('change', () => {
  localStorage.setItem('spLastMode', r.value);
}));