'use strict';

/* ==========================================================================
   DailyKitBox Document Converter — document-converter.js
   All "Instant · Offline" and "Instant · Basic formatting" conversions run
   fully client-side using open-source libraries. "Pro · Cloud" formats
   (PDF→DOCX, ODT→PDF, RTF→PDF, PPTX→PDF, PDF→PPTX) are clearly labelled and
   are NOT faked — this build has no backend, so those show an honest
   "not available offline" message instead of a fabricated result.
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

const savedTheme = localStorage.getItem('dcTheme');
if (savedTheme) {
  applyTheme(savedTheme);
} else {
  applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('dcTheme', next);
});

/* ==========================================================================
   PWA: SERVICE WORKER
   ========================================================================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/document-converter/service-worker.js').catch(() => {
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
  toast.className = `dc-toast dc-toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('dc-toast-fadeout');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ==========================================================================
   TABS
   ========================================================================== */
const tabs = document.querySelectorAll('.dc-tab');
const panels = document.querySelectorAll('.dc-panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    panels.forEach(p => { p.classList.remove('active'); p.hidden = true; });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    const target = $(tab.dataset.target);
    target.classList.add('active');
    target.hidden = false;
  });
});

/* ==========================================================================
   CONVERSION MAP
   ========================================================================== */
const CONVERSION_TARGETS = {
  jpg: ['pdf'], jpeg: ['pdf'], png: ['pdf'], webp: ['pdf'],
  pdf: ['jpg', 'png', 'webp', 'txt', 'docx', 'pptx'],
  txt: ['pdf', 'docx'],
  html: ['pdf'], htm: ['pdf'],
  docx: ['txt', 'pdf'],
  csv: ['xlsx'],
  xlsx: ['csv'],
  odt: ['pdf'],
  rtf: ['pdf'],
  pptx: ['pdf']
};

const CLOUD_ONLY_PAIRS = new Set(['pdf:docx', 'odt:pdf', 'rtf:pdf', 'pptx:pdf', 'pdf:pptx']);

function getExt(filename) {
  return filename.split('.').pop().toLowerCase();
}

/* ==========================================================================
   FORMAT QUICK-SELECT (Images & PDF / Documents / Sheets & Slides tabs)
   ========================================================================== */
let activePair = null;

document.querySelectorAll('.dc-format-option').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dc-format-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activePair = { from: btn.dataset.from, to: btn.dataset.to };

    queue.forEach(item => {
      if (item.fromExt === activePair.from && CONVERSION_TARGETS[item.fromExt]?.includes(activePair.to)) {
        item.toExt = activePair.to;
      }
    });
    renderQueue();
    showToast(`Selected ${activePair.from.toUpperCase()} → ${activePair.to.toUpperCase()}. Upload matching files in the Convert tab.`, 'info');
  });
});

/* ==========================================================================
   STATE
   ========================================================================== */
let queue = [];
let itemIdCounter = 0;

/* ==========================================================================
   ELEMENTS
   ========================================================================== */
const dropzone = $('dropzone');
const fileInput = $('fileInput');
const queueList = $('queueList');
const convertAllBtn = $('convertAllBtn');
const downloadZipBtn = $('downloadZipBtn');
const clearQueueBtn = $('clearQueueBtn');
const statusBadge = $('statusBadge');
const historyList = $('historyList');
const clearHistoryBtn = $('clearHistoryBtn');

const optQuality = $('optQuality');
const optPageSize = $('optPageSize');
const optOrientation = $('optOrientation');
const optPdfPassword = $('optPdfPassword');
const optCompress = $('optCompress');
const optRemoveMeta = $('optRemoveMeta');
const optPreserveFormat = $('optPreserveFormat');

/* ==========================================================================
   UPLOAD
   ========================================================================== */
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  handleFiles([...e.dataTransfer.files]);
});
fileInput.addEventListener('change', (e) => handleFiles([...e.target.files]));
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});

function handleFiles(files) {
  let added = 0;
  files.forEach(file => {
    const ext = getExt(file.name);
    if (!CONVERSION_TARGETS[ext]) {
      showToast(`"${file.name}" has an unsupported format and was skipped.`, 'error');
      return;
    }
    const target = (activePair && activePair.from === ext) ? activePair.to : CONVERSION_TARGETS[ext][0];
    queue.push({
      id: `q-${itemIdCounter++}`,
      file, fromExt: ext, toExt: target,
      status: 'pending', resultBlob: null, resultName: null, error: null
    });
    added++;
  });

  if (added) {
    renderQueue();
    showToast(`${added} file(s) added to the queue.`, 'success');
  }
}

/* ==========================================================================
   QUEUE RENDERING
   ========================================================================== */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function statusLabel(status) {
  return { pending: 'Pending', converting: 'Converting…', done: 'Done', error: 'Error' }[status] || status;
}

function renderQueue() {
  queueList.innerHTML = '';

  queue.forEach(item => {
    const li = document.createElement('li');
    li.className = 'dc-queue-item';
    li.draggable = true;
    li.dataset.itemId = item.id;
    li.setAttribute('tabindex', '0');

    const targetOptions = (CONVERSION_TARGETS[item.fromExt] || [])
      .map(ext => `<option value="${ext}" ${ext === item.toExt ? 'selected' : ''}>${ext.toUpperCase()}</option>`)
      .join('');

    li.innerHTML = `
      <span class="dc-queue-name">${escapeHtml(item.file.name)}</span>
      <span class="dc-queue-meta">${formatBytes(item.file.size)} · ${item.fromExt.toUpperCase()} →</span>
      <select class="dc-queue-select" aria-label="Output format for ${escapeHtml(item.file.name)}">${targetOptions}</select>
      <span class="dc-badge" data-role="status">${statusLabel(item.status)}</span>
      ${item.resultBlob ? `<a class="dc-btn dc-queue-download" href="${item.downloadUrl}" download="${item.resultName}">Download</a>` : ''}
      <button type="button" class="dc-queue-remove" aria-label="Remove ${escapeHtml(item.file.name)}">✕</button>
    `;
    queueList.appendChild(li);
  });

  convertAllBtn.disabled = queue.length === 0;
  clearQueueBtn.disabled = queue.length === 0;
  downloadZipBtn.disabled = !queue.some(i => i.status === 'done');

  attachQueueEvents();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function attachQueueEvents() {
  queueList.querySelectorAll('.dc-queue-select').forEach((select, idx) => {
    select.addEventListener('change', () => {
      queue[idx].toExt = select.value;
    });
  });

  queueList.querySelectorAll('.dc-queue-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.dc-queue-item').dataset.itemId;
      queue = queue.filter(i => i.id !== id);
      renderQueue();
    });
  });

  let draggedId = null;
  queueList.querySelectorAll('.dc-queue-item').forEach(card => {
    card.addEventListener('dragstart', () => { draggedId = card.dataset.itemId; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const targetId = card.dataset.itemId;
      if (draggedId && targetId && draggedId !== targetId) {
        const fromIndex = queue.findIndex(i => i.id === draggedId);
        const toIndex = queue.findIndex(i => i.id === targetId);
        const [moved] = queue.splice(fromIndex, 1);
        queue.splice(toIndex, 0, moved);
        renderQueue();
      }
    });
    card.addEventListener('keydown', (e) => {
      if (!e.altKey) return;
      const id = card.dataset.itemId;
      const index = queue.findIndex(i => i.id === id);
      if (e.key === 'ArrowUp' && index > 0) {
        e.preventDefault();
        const [moved] = queue.splice(index, 1);
        queue.splice(index - 1, 0, moved);
        renderQueue();
      } else if (e.key === 'ArrowDown' && index < queue.length - 1) {
        e.preventDefault();
        const [moved] = queue.splice(index, 1);
        queue.splice(index + 1, 0, moved);
        renderQueue();
      }
    });
  });
}

clearQueueBtn.addEventListener('click', () => {
  queue.forEach(i => { if (i.downloadUrl) URL.revokeObjectURL(i.downloadUrl); });
  queue = [];
  fileInput.value = '';
  renderQueue();
  statusBadge.textContent = 'Idle';
});

/* ==========================================================================
   CONVERT ALL
   ========================================================================== */
convertAllBtn.addEventListener('click', async () => {
  if (!queue.length) return;

  convertAllBtn.disabled = true;
  statusBadge.textContent = 'Converting…';

  for (const item of queue) {
    item.status = 'converting';
    updateItemStatus(item);

    try {
      const { blob, name } = await convertItem(item);
      item.resultBlob = blob;
      item.resultName = name;
      item.downloadUrl = URL.createObjectURL(blob);
      item.status = 'done';
      saveHistoryEntry(item);
    } catch (err) {
      item.status = 'error';
      item.error = err.message || 'Conversion failed.';
      showToast(`"${item.file.name}": ${item.error}`, 'error');
    }
    updateItemStatus(item);
  }

  renderQueue();
  statusBadge.textContent = 'Done';
  convertAllBtn.disabled = false;
  showToast('Conversion finished.', 'success');
});

function updateItemStatus(item) {
  const card = queueList.querySelector(`[data-item-id="${item.id}"] [data-role="status"]`);
  if (card) card.textContent = statusLabel(item.status) + (item.error ? `: ${item.error}` : '');
}

/* ==========================================================================
   CONVERSION ENGINE
   ========================================================================== */
async function convertItem(item) {
  const pairKey = `${item.fromExt}:${item.toExt}`;

  if (CLOUD_ONLY_PAIRS.has(pairKey)) {
    throw new Error('This conversion requires a cloud service that is not configured in this offline build.');
  }

  if (['jpg', 'jpeg', 'png', 'webp'].includes(item.fromExt) && item.toExt === 'pdf') {
    return imageToPdf(item);
  }
  if (item.fromExt === 'pdf' && ['jpg', 'png', 'webp'].includes(item.toExt)) {
    return pdfToImages(item);
  }
  if (item.fromExt === 'pdf' && item.toExt === 'txt') {
    return pdfToText(item);
  }
  if (item.fromExt === 'txt' && item.toExt === 'pdf') {
    return textToPdf(item);
  }
  if (['html', 'htm'].includes(item.fromExt) && item.toExt === 'pdf') {
    return htmlToPdf(item);
  }
  if (item.fromExt === 'docx' && item.toExt === 'txt') {
    return docxToText(item);
  }
  if (item.fromExt === 'docx' && item.toExt === 'pdf') {
    return docxToPdf(item);
  }
  if (item.fromExt === 'txt' && item.toExt === 'docx') {
    return textToDocx(item);
  }
  if (item.fromExt === 'csv' && item.toExt === 'xlsx') {
    return csvToXlsx(item);
  }
  if (item.fromExt === 'xlsx' && item.toExt === 'csv') {
    return xlsxToCsv(item);
  }

  throw new Error('This conversion pair is not supported.');
}

/* ---- Helpers -------------------------------------------------------- */
function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsArrayBuffer(file);
  });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsText(file);
  });
}

function baseName(filename) {
  return filename.replace(/\.[^/.]+$/, '');
}

function getPdfPageSize() {
  return { format: optPageSize.value, orientation: optOrientation.value };
}

async function loadPdfDocument(file) {
  if (typeof pdfjsLib === 'undefined') throw new Error('PDF engine not loaded.');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const arrayBuffer = await readAsArrayBuffer(file);
  const password = optPdfPassword.value.trim();
  try {
    return await pdfjsLib.getDocument({ data: arrayBuffer, password: password || undefined }).promise;
  } catch (err) {
    if (err.name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Enter the password in Options.');
    }
    throw new Error('This PDF could not be opened.');
  }
}

/* ---- Image → PDF ------------------------------------------------------ */
async function imageToPdf(item) {
  const dataUrl = await readAsDataURL(item.file);
  const img = new Image();
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = dataUrl; });

  let finalDataUrl = dataUrl;
  if (optCompress.checked) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    finalDataUrl = canvas.toDataURL('image/jpeg', Number(optQuality.value));
  }

  const { jsPDF } = window.jspdf;
  const { format, orientation } = getPdfPageSize();
  const pdf = new jsPDF({ orientation, unit: 'mm', format });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const x = (pageWidth - w) / 2;
  const y = (pageHeight - h) / 2;

  pdf.addImage(finalDataUrl, 'JPEG', x, y, w, h);
  applyPdfMetadata(pdf, item.file.name);

  return { blob: pdf.output('blob'), name: `${baseName(item.file.name)}.pdf` };
}

function applyPdfMetadata(pdf, sourceName) {
  if (optRemoveMeta.checked) {
    pdf.setProperties({ title: '', subject: '', author: '', creator: '' });
  } else {
    pdf.setProperties({ title: baseName(sourceName), creator: 'DailyKitBox', author: 'DailyKitBox' });
  }
}

/* ---- PDF → Images ------------------------------------------------------ */
async function pdfToImages(item) {
  const pdf = await loadPdfDocument(item.file);
  const mimeMap = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const mime = mimeMap[item.toExt];
  const quality = Number(optQuality.value);

  if (pdf.numPages === 1) {
    const blob = await renderPageToBlob(pdf, 1, mime, quality);
    return { blob, name: `${baseName(item.file.name)}.${item.toExt}` };
  }

  if (typeof JSZip === 'undefined') throw new Error('ZIP library not loaded.');
  const zip = new JSZip();
  for (let i = 1; i <= pdf.numPages; i++) {
    const blob = await renderPageToBlob(pdf, i, mime, quality);
    zip.file(`page-${i}.${item.toExt}`, blob);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { blob: zipBlob, name: `${baseName(item.file.name)}-images.zip` };
}

async function renderPageToBlob(pdf, pageNum, mime, quality) {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  return new Promise(resolve => canvas.toBlob(resolve, mime, quality));
}

/* ---- PDF → Text ------------------------------------------------------ */
async function pdfToText(item) {
  const pdf = await loadPdfDocument(item.file);
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(it => it.str).join(' ') + '\n\n';
  }
  return { blob: new Blob([fullText], { type: 'text/plain' }), name: `${baseName(item.file.name)}.txt` };
}

/* ---- Text → PDF ------------------------------------------------------ */
async function textToPdf(item) {
  const text = await readAsText(item.file);
  const { jsPDF } = window.jspdf;
  const { format, orientation } = getPdfPageSize();
  const pdf = new jsPDF({ orientation, unit: 'mm', format });
  const margin = 15;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const lines = pdf.splitTextToSize(text, pageWidth - margin * 2);

  let cursorY = margin;
  const lineHeight = 6;
  pdf.setFontSize(11);

  lines.forEach(line => {
    if (cursorY + lineHeight > pageHeight - margin) {
      pdf.addPage();
      cursorY = margin;
    }
    pdf.text(line, margin, cursorY);
    cursorY += lineHeight;
  });

  applyPdfMetadata(pdf, item.file.name);
  return { blob: pdf.output('blob'), name: `${baseName(item.file.name)}.pdf` };
}

/* ---- HTML → PDF ------------------------------------------------------ */
async function htmlToPdf(item) {
  if (typeof html2pdf === 'undefined') throw new Error('HTML conversion library not loaded.');
  const htmlText = await readAsText(item.file);

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed; left:-9999px; top:0; width:800px; background:#fff; padding:20px;';
  container.innerHTML = optPreserveFormat.checked ? htmlText : stripTags(htmlText);
  document.body.appendChild(container);

  const { format, orientation } = getPdfPageSize();
  try {
    const blob = await html2pdf().set({
      margin: 10,
      jsPDF: { unit: 'mm', format, orientation }
    }).from(container).outputPdf('blob');
    return { blob, name: `${baseName(item.file.name)}.pdf` };
  } finally {
    document.body.removeChild(container);
  }
}

function stripTags(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(div.textContent || '')}</pre>`;
}

/* ---- DOCX → Text / PDF ------------------------------------------------ */
async function docxToText(item) {
  if (typeof mammoth === 'undefined') throw new Error('DOCX engine not loaded.');
  const arrayBuffer = await readAsArrayBuffer(item.file);
  const result = await mammoth.extractRawText({ arrayBuffer });
  return { blob: new Blob([result.value], { type: 'text/plain' }), name: `${baseName(item.file.name)}.txt` };
}

async function docxToPdf(item) {
  if (typeof mammoth === 'undefined') throw new Error('DOCX engine not loaded.');
  if (typeof html2pdf === 'undefined') throw new Error('HTML conversion library not loaded.');

  const arrayBuffer = await readAsArrayBuffer(item.file);

  let contentHtml;
  if (optPreserveFormat.checked) {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    contentHtml = result.value;
  } else {
    const result = await mammoth.extractRawText({ arrayBuffer });
    contentHtml = `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(result.value)}</pre>`;
  }

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed; left:-9999px; top:0; width:800px; background:#fff; padding:20px;';
  container.innerHTML = contentHtml;
  document.body.appendChild(container);

  const { format, orientation } = getPdfPageSize();
  try {
    const blob = await html2pdf().set({
      margin: 10,
      jsPDF: { unit: 'mm', format, orientation }
    }).from(container).outputPdf('blob');
    return { blob, name: `${baseName(item.file.name)}.pdf` };
  } finally {
    document.body.removeChild(container);
  }
}

/* ---- Text → DOCX ------------------------------------------------------ */
async function textToDocx(item) {
  if (typeof docx === 'undefined') throw new Error('DOCX writer not loaded.');
  const text = await readAsText(item.file);
  const paragraphs = text.split(/\r?\n/).map(line => new docx.Paragraph({ children: [new docx.TextRun(line)] }));

  const doc = new docx.Document({ sections: [{ properties: {}, children: paragraphs }] });
  const blob = await docx.Packer.toBlob(doc);
  return { blob, name: `${baseName(item.file.name)}.docx` };
}

/* ---- CSV ↔ XLSX -------------------------------------------------------- */
async function csvToXlsx(item) {
  if (typeof XLSX === 'undefined') throw new Error('Spreadsheet engine not loaded.');
  const csvText = await readAsText(item.file);
  const workbook = XLSX.read(csvText, { type: 'string' });
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return { blob: new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name: `${baseName(item.file.name)}.xlsx` };
}

async function xlsxToCsv(item) {
  if (typeof XLSX === 'undefined') throw new Error('Spreadsheet engine not loaded.');
  const arrayBuffer = await readAsArrayBuffer(item.file);
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const csv = XLSX.utils.sheet_to_csv(firstSheet);
  return { blob: new Blob([csv], { type: 'text/csv' }), name: `${baseName(item.file.name)}.csv` };
}

/* ==========================================================================
   DOWNLOAD ALL AS ZIP
   ========================================================================== */
downloadZipBtn.addEventListener('click', async () => {
  const doneItems = queue.filter(i => i.status === 'done' && i.resultBlob);
  if (!doneItems.length) return;
  if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
    showToast('ZIP library failed to load.', 'error');
    return;
  }

  const zip = new JSZip();
  doneItems.forEach(item => zip.file(item.resultName, item.resultBlob));
  showToast('Preparing ZIP file...', 'info');
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'DailyKitBox-Converted-Files.zip');
  showToast('ZIP downloaded.', 'success');
});

/* ==========================================================================
   HISTORY (localStorage, metadata only)
   ========================================================================== */
function saveHistoryEntry(item) {
  const history = JSON.parse(localStorage.getItem('dcHistory') || '[]');
  history.unshift({
    name: item.resultName,
    from: item.fromExt,
    to: item.toExt,
    time: new Date().toISOString()
  });
  localStorage.setItem('dcHistory', JSON.stringify(history.slice(0, 20)));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('dcHistory') || '[]');
  if (!history.length) {
    historyList.innerHTML = '<li class="dc-queue-item"><span class="dc-queue-meta">No conversions yet.</span></li>';
    return;
  }
  historyList.innerHTML = history.map(h => `
    <li class="dc-queue-item">
      <span class="dc-queue-name">${escapeHtml(h.name)}</span>
      <span class="dc-queue-meta">${h.from.toUpperCase()} → ${h.to.toUpperCase()} · ${new Date(h.time).toLocaleString()}</span>
    </li>
  `).join('');
}

clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem('dcHistory');
  renderHistory();
  showToast('History cleared.', 'info');
});

/* ==========================================================================
   INIT
   ========================================================================== */
renderHistory();