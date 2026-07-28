'use strict';

/* ==========================================================================
   DailyKitBox — Word Counter (wc- prefix)
   /assets/js/word-counter.js
   Follows DAILYKITBOX-STRUCTURE.md conventions.

   Everything runs client-side. Nothing typed here is ever sent anywhere —
   the only network calls this file makes are to load the CDN libraries
   already declared in index.html (jsPDF, mammoth, FileSaver).
   ========================================================================== */

const $ = (id) => document.getElementById(id);

/* ---------------- Theme ---------------- */
function wcApplyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  $('themeToggle').setAttribute('aria-pressed', String(theme === 'dark'));
}
const wcSavedTheme = localStorage.getItem('wcTheme');
if (wcSavedTheme) wcApplyTheme(wcSavedTheme);
else wcApplyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
$('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  wcApplyTheme(next);
  localStorage.setItem('wcTheme', next);
});

/* ---------------- Toasts ---------------- */
function showToast(message, type) {
  const el = document.createElement('div');
  el.className = 'wc-toast' + (type === 'error' ? ' wc-toast-error' : type === 'success' ? ' wc-toast-success' : '');
  el.textContent = message;
  $('wcToastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ---------------- Elements ---------------- */
const editor = $('wcEditor');
const metaTitleInput = $('metaTitleInput');
const metaDescInput = $('metaDescInput');
const wordGoalInput = $('wordGoalInput');
const charGoalInput = $('charGoalInput');

/* ---------------- Stop words (English, common set) ---------------- */
const STOP_WORDS = new Set(['a','about','above','after','again','against','all','am','an','and','any','are',
  "aren't",'as','at','be','because','been','before','being','below','between','both','but','by','can','could',
  'did','do','does','doing','down','during','each','few','for','from','further','had','has','have','having','he',
  'her','here','hers','herself','him','himself','his','how','i','if','in','into','is','it',"it's",'its','itself',
  'just','me','more','most','my','myself','no','nor','not','now','of','off','on','once','only','or','other','our',
  'ours','ourselves','out','over','own','same','she','should','so','some','such','than','that','the','their',
  'theirs','them','themselves','then','there','these','they','this','those','through','to','too','under','until',
  'up','very','was','we','were','what','when','where','which','while','who','whom','why','will','with','would',
  'you','your','yours','yourself','yourselves','is','was']);

/* Small stopword sets for a very rough language guess (not a real language model) */
const LANG_HINTS = {
  en: ['the','and','is','of','to','in','that','it'],
  es: ['el','la','de','que','y','en','los','se'],
  fr: ['le','la','de','et','les','des','un','une'],
  de: ['der','die','und','das','ist','den','dem','ein'],
  hi: ['है','के','की','और','में','यह','हो','से']
};

/* ---------------- Undo / Redo history ---------------- */
let wcHistory = [''];
let wcHistoryIndex = 0;
let wcSuppressHistory = false;

function wcPushHistory(value) {
  if (wcSuppressHistory) return;
  if (wcHistory[wcHistoryIndex] === value) return;
  wcHistory = wcHistory.slice(0, wcHistoryIndex + 1);
  wcHistory.push(value);
  if (wcHistory.length > 60) wcHistory.shift();
  wcHistoryIndex = wcHistory.length - 1;
  wcUpdateUndoRedoButtons();
}
function wcUndo() {
  if (wcHistoryIndex <= 0) return;
  wcHistoryIndex--;
  wcSuppressHistory = true;
  editor.value = wcHistory[wcHistoryIndex];
  wcSuppressHistory = false;
  wcAnalyze();
  wcUpdateUndoRedoButtons();
}
function wcRedo() {
  if (wcHistoryIndex >= wcHistory.length - 1) return;
  wcHistoryIndex++;
  wcSuppressHistory = true;
  editor.value = wcHistory[wcHistoryIndex];
  wcSuppressHistory = false;
  wcAnalyze();
  wcUpdateUndoRedoButtons();
}
function wcUpdateUndoRedoButtons() {
  $('undoBtn').disabled = wcHistoryIndex <= 0;
  $('redoBtn').disabled = wcHistoryIndex >= wcHistory.length - 1;
}

/* ---------------- Autosave ---------------- */
let wcAutosaveTimer = null;
function wcScheduleAutosave() {
  clearTimeout(wcAutosaveTimer);
  wcAutosaveTimer = setTimeout(() => {
    localStorage.setItem('wcAutosave', editor.value);
    localStorage.setItem('wcAutosaveTime', new Date().toISOString());
  }, 600);
}
(function wcRestoreAutosave() {
  const saved = localStorage.getItem('wcAutosave');
  if (saved) { editor.value = saved; wcHistory = [saved]; wcHistoryIndex = 0; }
})();

/* ---------------- Syllable estimation (heuristic, English) ---------------- */
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/* ---------------- Core tokenizers ---------------- */
function wcGetWords(text) {
  const matches = text.match(/[\p{L}\p{N}'-]+/gu);
  return matches || [];
}
function wcGetSentences(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const matches = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return (matches || []).map((s) => s.trim()).filter(Boolean);
}
function wcGetParagraphs(text) {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}
function wcGetLines(text) {
  if (text === '') return [];
  return text.split('\n');
}

/* ---------------- Passive voice heuristic ---------------- */
const BE_FORMS = /\b(am|is|are|was|were|be|being|been)\b/i;
const IRREGULAR_PARTICIPLES = new Set(['done','made','given','taken','written','seen','known','shown','built',
  'broken','chosen','driven','eaten','found','held','kept','left','lost','paid','said','sold','sent','told',
  'won','brought','bought','caught','taught','thought','felt','met','set','put','read','spoken','stolen']);
function isPassiveSentence(sentence) {
  if (!BE_FORMS.test(sentence)) return false;
  const words = sentence.toLowerCase().match(/[a-z']+/g) || [];
  for (let i = 0; i < words.length - 1; i++) {
    if (/^(am|is|are|was|were|be|being|been)$/.test(words[i])) {
      for (let j = i + 1; j < Math.min(i + 4, words.length); j++) {
        if (/ed$/.test(words[j]) || IRREGULAR_PARTICIPLES.has(words[j])) return true;
      }
    }
  }
  return false;
}

/* ---------------- N-gram keyword extraction ---------------- */
function wcNgrams(words, n) {
  const counts = new Map();
  const clean = words.map((w) => w.toLowerCase().replace(/[^a-z0-9']/g, '')).filter(Boolean);
  for (let i = 0; i <= clean.length - n; i++) {
    const gram = clean.slice(i, i + n);
    if (n === 1 && STOP_WORDS.has(gram[0])) continue;
    const key = gram.join(' ');
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

/* ---------------- Language guess (rough heuristic) ---------------- */
function wcGuessLanguage(words) {
  const lower = words.map((w) => w.toLowerCase());
  const scores = {};
  for (const lang in LANG_HINTS) {
    scores[lang] = LANG_HINTS[lang].filter((h) => lower.includes(h)).length;
  }
  let best = 'en', bestScore = -1;
  for (const lang in scores) { if (scores[lang] > bestScore) { best = lang; bestScore = scores[lang]; } }
  return bestScore > 0 ? best : null;
}
const LANG_NAMES = { en: 'English', es: 'Spanish', fr: 'French', de: 'German', hi: 'Hindi' };

/* ---------------- Main analysis ---------------- */
let wcLastKeywordTab = 1;
let wcSessionMaxWords = 0;

function wcAnalyze() {
  const text = editor.value;
  const words = wcGetWords(text);
  const sentences = wcGetSentences(text);
  const paragraphs = wcGetParagraphs(text);
  const lines = wcGetLines(text);

  const wordCount = words.length;
  const charCount = text.length;
  const charNoSpaces = text.replace(/\s/g, '').length;
  const sentenceCount = sentences.length;
  const paragraphCount = paragraphs.length;
  const lineCount = lines.length;

  const readingTime = Math.max(1, Math.round(wordCount / 200));
  const speakingTime = Math.max(1, Math.round(wordCount / 130));

  const totalWordLength = words.reduce((sum, w) => sum + w.length, 0);
  const avgWordLength = wordCount ? (totalWordLength / wordCount).toFixed(1) : '0.0';
  const avgSentenceLength = sentenceCount ? (wordCount / sentenceCount).toFixed(1) : '0.0';

  let longestWord = '', shortestWord = '';
  words.forEach((w) => {
    if (w.length > longestWord.length) longestWord = w;
    if (!shortestWord || (w.length < shortestWord.length && w.length > 0)) shortestWord = w;
  });

  const lowerWords = words.map((w) => w.toLowerCase());
  const uniqueWords = new Set(lowerWords);
  const freqMap = new Map();
  lowerWords.forEach((w) => freqMap.set(w, (freqMap.get(w) || 0) + 1));
  const repeatedCount = [...freqMap.values()].filter((c) => c > 1).length;
  const rareWords = [...freqMap.entries()].filter(([, c]) => c === 1).map(([w]) => w);

  const lexicalDiversity = wordCount ? (uniqueWords.size / wordCount) : 0;

  let totalSyllables = 0, complexWords = 0;
  words.forEach((w) => {
    const syl = countSyllables(w);
    totalSyllables += syl;
    if (syl >= 3) complexWords++;
  });
  const simpleWords = wordCount - complexWords;

  const flesch = (sentenceCount && wordCount)
    ? 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (totalSyllables / wordCount)
    : 0;
  const fleschClamped = Math.max(0, Math.min(100, flesch));
  const gradeLevel = (sentenceCount && wordCount)
    ? 0.39 * (wordCount / sentenceCount) + 11.8 * (totalSyllables / wordCount) - 15.59
    : 0;

  const passiveCount = sentences.filter(isPassiveSentence).length;
  const passivePct = sentenceCount ? Math.round((passiveCount / sentenceCount) * 100) : 0;

  const emojiMatches = text.match(/\p{Extended_Pictographic}/gu) || [];
  const numberMatches = text.match(/\b\d+(\.\d+)?\b/g) || [];
  const urlMatches = text.match(/\bhttps?:\/\/[^\s]+/gi) || [];
  const emailMatches = text.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g) || [];
  const hashtagMatches = text.match(/#[\p{L}0-9_]+/gu) || [];
  const mentionMatches = text.match(/@[\p{L}0-9_]+/gu) || [];
  const stopWordCount = lowerWords.filter((w) => STOP_WORDS.has(w)).length;

  /* ---- Write out live stat grid ---- */
  const stats = {
    statWords: wordCount, statChars: charCount, statCharsNoSpace: charNoSpaces,
    statSentences: sentenceCount, statParagraphs: paragraphCount, statLines: lineCount,
    statReadingTime: readingTime + ' min', statSpeakingTime: speakingTime + ' min',
    statAvgWordLen: avgWordLength, statAvgSentenceLen: avgSentenceLength,
    statLongestWord: longestWord || '—', statShortestWord: shortestWord || '—',
    statUniqueWords: uniqueWords.size, statRepeatedWords: repeatedCount,
    statLexicalDiversity: wordCount ? Math.round(lexicalDiversity * 100) + '%' : '0%'
  };
  Object.entries(stats).forEach(([id, val]) => { const el = $(id); if (el) el.textContent = val; });

  $('quickWordCount').textContent = wordCount;
  $('quickCharCount').textContent = charCount;
  $('quickReadingTime').textContent = readingTime + ' min read';

  /* ---- Writing analysis ---- */
  $('statComplexWords').textContent = complexWords;
  $('statSimpleWords').textContent = simpleWords;
  $('statStopWords').textContent = stopWordCount;
  $('statPassive').textContent = sentenceCount ? `${passiveCount} (${passivePct}%)` : '0 (0%)';
  $('statEmoji').textContent = emojiMatches.length;
  $('statNumbers').textContent = numberMatches.length;
  $('statUrls').textContent = urlMatches.length;
  $('statEmails').textContent = emailMatches.length;
  $('statHashtags').textContent = hashtagMatches.length;
  $('statMentions').textContent = mentionMatches.length;

  $('fleschScore').textContent = wordCount ? Math.round(fleschClamped) : '—';
  $('gradeLevelScore').textContent = wordCount ? Math.max(0, Math.round(gradeLevel)) : '—';
  let readLabel = 'No text yet';
  if (wordCount) {
    if (fleschClamped >= 90) readLabel = 'Very Easy';
    else if (fleschClamped >= 70) readLabel = 'Easy';
    else if (fleschClamped >= 60) readLabel = 'Standard';
    else if (fleschClamped >= 50) readLabel = 'Fairly Difficult';
    else if (fleschClamped >= 30) readLabel = 'Difficult';
    else readLabel = 'Very Difficult';
  }
  $('readabilityLabel').textContent = readLabel;

  const langGuess = wordCount >= 5 ? wcGuessLanguage(words) : null;
  $('statLanguage').textContent = langGuess ? LANG_NAMES[langGuess] : '—';

  /* ---- Keyword tabs ---- */
  wcRenderKeywords(words, wcLastKeywordTab);

  /* ---- Platform checker ---- */
  wcRenderPlatforms(charCount);

  /* ---- SEO field checkers ---- */
  wcCheckSeoField(metaTitleInput, 'metaTitleMeter', 50, 60);
  wcCheckSeoField(metaDescInput, 'metaDescMeter', 150, 160);
  wcContentLengthSuggestion(wordCount);

  /* ---- Goals ---- */
  wcUpdateGoal(wordGoalInput, wordCount, 'wordGoalFill', 'wordGoalText');
  wcUpdateGoal(charGoalInput, charCount, 'charGoalFill', 'charGoalText');

  /* ---- Session stats ---- */
  wcSessionMaxWords = Math.max(wcSessionMaxWords, wordCount);
  $('sessionMaxWords').textContent = wcSessionMaxWords;

  wcScheduleAutosave();
}

function wcRenderKeywords(words, n) {
  const counts = wcNgrams(words, n);
  const total = words.length || 1;
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const tbody = $('keywordTableBody');
  tbody.innerHTML = '';
  if (!sorted.length) {
    $('keywordEmpty').classList.remove('wc-hidden');
    $('keywordTable').classList.add('wc-hidden');
    return;
  }
  $('keywordEmpty').classList.add('wc-hidden');
  $('keywordTable').classList.remove('wc-hidden');
  const maxCount = sorted[0][1];
  sorted.forEach(([phrase, count]) => {
    const pct = ((count / total) * 100).toFixed(1);
    const barPct = Math.round((count / maxCount) * 100);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(phrase)}</td><td>${count}</td><td>${pct}%</td>
      <td><div class="wc-kw-bar-track"><div class="wc-kw-bar-fill" style="width:${barPct}%"></div></div></td>`;
    tbody.appendChild(tr);
  });
}

const PLATFORM_LIMITS = [
  { id: 'twitter', name: 'X / Twitter Post', limit: 280 },
  { id: 'instagram', name: 'Instagram Caption', limit: 2200 },
  { id: 'facebook', name: 'Facebook Post', limit: 63206 },
  { id: 'linkedin', name: 'LinkedIn Post', limit: 3000 },
  { id: 'youtube', name: 'YouTube Description', limit: 5000 },
  { id: 'tiktok', name: 'TikTok Caption', limit: 2200 }
];
function wcRenderPlatforms(charCount) {
  const grid = $('platformGrid');
  grid.innerHTML = '';
  PLATFORM_LIMITS.forEach((p) => {
    const over = charCount > p.limit;
    const div = document.createElement('div');
    div.className = 'wc-platform-card';
    div.innerHTML = `<div class="wc-platform-name">${p.name}</div>
      <div class="wc-platform-count ${over ? 'wc-over' : 'wc-ok'}">${charCount} / ${p.limit} ${over ? '— over limit' : ''}</div>`;
    grid.appendChild(div);
  });
}

function wcCheckSeoField(input, meterId, min, max) {
  const len = input.value.length;
  const meter = $(meterId);
  let msg, cls;
  if (len === 0) { msg = `0 characters — recommended ${min}–${max}`; cls = ''; }
  else if (len < min) { msg = `${len} characters — a bit short (recommended ${min}–${max})`; cls = ''; }
  else if (len <= max) { msg = `${len} characters — good length`; cls = 'wc-ok'; }
  else { msg = `${len} characters — too long (recommended ${min}–${max})`; cls = 'wc-over'; }
  meter.textContent = msg;
  meter.className = 'wc-seo-meter' + (cls ? ' ' + cls : '');
}

function wcContentLengthSuggestion(wordCount) {
  const el = $('contentLengthSuggestion');
  if (wordCount === 0) { el.textContent = 'Start typing to see a content-length recommendation.'; return; }
  if (wordCount < 300) el.textContent = `${wordCount} words — short-form content. Fine for social posts; blog/SEO articles typically perform better at 600+ words.`;
  else if (wordCount < 1000) el.textContent = `${wordCount} words — a solid short article length.`;
  else if (wordCount < 2000) el.textContent = `${wordCount} words — a well-developed, in-depth article length.`;
  else el.textContent = `${wordCount} words — long-form content. Consider headings and a table of contents for readability.`;
}

function wcUpdateGoal(input, current, fillId, textId) {
  const goal = parseInt(input.value, 10);
  const fill = $(fillId), text = $(textId);
  if (!goal || goal <= 0) { fill.style.width = '0%'; fill.classList.remove('wc-goal-met'); text.textContent = 'Set a goal above'; return; }
  const pct = Math.min(100, Math.round((current / goal) * 100));
  fill.style.width = pct + '%';
  fill.classList.toggle('wc-goal-met', current >= goal);
  text.textContent = `${current} / ${goal} (${pct}%)`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/* ---------------- Editor events ---------------- */
let wcAnalyzeTimer = null;
editor.addEventListener('input', () => {
  wcPushHistory(editor.value);
  clearTimeout(wcAnalyzeTimer);
  wcAnalyzeTimer = setTimeout(wcAnalyze, 120);
});
metaTitleInput.addEventListener('input', wcAnalyze);
metaDescInput.addEventListener('input', wcAnalyze);
wordGoalInput.addEventListener('input', wcAnalyze);
charGoalInput.addEventListener('input', wcAnalyze);

/* ---------------- Keyword tabs ---------------- */
document.querySelectorAll('.wc-kw-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.wc-kw-tab').forEach((t) => t.classList.remove('wc-active'));
    tab.classList.add('wc-active');
    wcLastKeywordTab = parseInt(tab.dataset.n, 10);
    wcRenderKeywords(wcGetWords(editor.value), wcLastKeywordTab);
  });
});

/* ---------------- Toolbar: undo/redo ---------------- */
$('undoBtn').addEventListener('click', wcUndo);
$('redoBtn').addEventListener('click', wcRedo);

/* ---------------- Toolbar: clear / copy / paste ---------------- */
$('clearBtn').addEventListener('click', () => {
  if (!editor.value) return;
  if (!confirm('Clear all text? This cannot be undone with the Undo button once the editor is empty.')) return;
  editor.value = '';
  wcPushHistory('');
  wcAnalyze();
  showToast('Editor cleared.', 'success');
});
$('copyBtn').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(editor.value); showToast('Text copied to clipboard.', 'success'); }
  catch (e) { showToast('Could not copy — select the text manually.', 'error'); }
});
$('pasteBtn').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    editor.value += text;
    wcPushHistory(editor.value);
    wcAnalyze();
    showToast('Text pasted.', 'success');
  } catch (e) { showToast('Clipboard access denied — paste manually with Ctrl+V.', 'error'); }
});

/* ---------------- Toolbar: fullscreen / focus mode ---------------- */
$('fullscreenBtn').addEventListener('click', () => {
  document.body.classList.toggle('wc-fullscreen');
  const on = document.body.classList.contains('wc-fullscreen');
  $('fullscreenBtn').setAttribute('aria-pressed', String(on));
  $('fullscreenBtn').classList.toggle('wc-active', on);
});
$('focusModeBtn').addEventListener('click', () => {
  document.body.classList.toggle('wc-focus-mode');
  const on = document.body.classList.contains('wc-focus-mode');
  $('focusModeBtn').setAttribute('aria-pressed', String(on));
  $('focusModeBtn').classList.toggle('wc-active', on);
});
$('spellcheckBtn').addEventListener('click', () => {
  const on = editor.spellcheck;
  editor.spellcheck = !on;
  $('spellcheckBtn').setAttribute('aria-pressed', String(!on));
  $('spellcheckBtn').classList.toggle('wc-active', !on);
  showToast(`Spell check ${!on ? 'enabled' : 'disabled'}.`, 'success');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (document.body.classList.contains('wc-fullscreen')) { document.body.classList.remove('wc-fullscreen'); $('fullscreenBtn').setAttribute('aria-pressed', 'false'); $('fullscreenBtn').classList.remove('wc-active'); }
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); wcUndo(); }
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); wcRedo(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); $('downloadTxtBtn').click(); }
});

/* ---------------- Drag & drop text/txt files onto the editor ---------------- */
['dragenter', 'dragover'].forEach((evt) => editor.addEventListener(evt, (e) => { e.preventDefault(); editor.classList.add('wc-dragover'); }));
['dragleave', 'drop'].forEach((evt) => editor.addEventListener(evt, (e) => { e.preventDefault(); editor.classList.remove('wc-dragover'); }));
editor.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (!file) return;
  wcHandleImportFile(file);
});

/* ---------------- Import ---------------- */
function wcHandleImportFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'docx') {
    if (typeof mammoth === 'undefined') { showToast('DOCX import library failed to load.', 'error'); return; }
    file.arrayBuffer().then((buf) => mammoth.extractRawText({ arrayBuffer: buf })).then((res) => {
      editor.value = res.value;
      wcPushHistory(editor.value);
      wcAnalyze();
      showToast(`Imported ${file.name}`, 'success');
    }).catch(() => showToast('Could not read that DOCX file.', 'error'));
  } else {
    file.text().then((text) => {
      editor.value = text;
      wcPushHistory(editor.value);
      wcAnalyze();
      showToast(`Imported ${file.name}`, 'success');
    }).catch(() => showToast('Could not read that file.', 'error'));
  }
}
$('importInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) wcHandleImportFile(file);
  e.target.value = '';
});

/* ---------------- Export ---------------- */
function wcBaseFilename() { return 'dailykitbox-text-' + new Date().toISOString().slice(0, 10); }

$('downloadTxtBtn').addEventListener('click', () => {
  const blob = new Blob([editor.value], { type: 'text/plain' });
  saveAs(blob, wcBaseFilename() + '.txt');
});
$('downloadDocBtn').addEventListener('click', () => {
  const htmlBody = editor.value.split('\n').map((line) => `<p>${escapeHtml(line) || '&nbsp;'}</p>`).join('');
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"></head><body>${htmlBody}</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  saveAs(blob, wcBaseFilename() + '.doc');
});
$('downloadPdfBtn').addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageW = doc.internal.pageSize.getWidth() - margin * 2;
  const pageH = doc.internal.pageSize.getHeight() - margin;
  const lines = doc.splitTextToSize(editor.value || ' ', pageW);
  let y = margin;
  lines.forEach((line) => {
    if (y > pageH) { doc.addPage(); y = margin; }
    doc.text(line, margin, y);
    y += 14;
  });
  doc.save(wcBaseFilename() + '.pdf');
});
$('printBtn').addEventListener('click', () => window.print());
$('shareBtn').addEventListener('click', async () => {
  if (navigator.share) {
    try { await navigator.share({ title: 'Text from DailyKitBox Word Counter', text: editor.value }); }
    catch (e) { /* user cancelled */ }
  } else {
    try { await navigator.clipboard.writeText(editor.value); showToast('Sharing isn\u2019t supported here — text copied instead.', 'success'); }
    catch (e) { showToast('Sharing is not supported in this browser.', 'error'); }
  }
});

/* ---------------- History (session log) ---------------- */
function wcLoadSessionHistory() {
  try { return JSON.parse(localStorage.getItem('wcHistoryLog') || '[]'); } catch (e) { return []; }
}
function wcSaveSessionSnapshot() {
  const words = wcGetWords(editor.value).length;
  if (!words) { showToast('Nothing to save — the editor is empty.', 'error'); return; }
  const log = wcLoadSessionHistory();
  log.unshift({ words, chars: editor.value.length, date: new Date().toLocaleString() });
  localStorage.setItem('wcHistoryLog', JSON.stringify(log.slice(0, 20)));
  wcRenderSessionHistory();
  showToast('Snapshot saved to history.', 'success');
}
function wcRenderSessionHistory() {
  const log = wcLoadSessionHistory();
  const list = $('historyList');
  list.innerHTML = '';
  if (!log.length) { list.innerHTML = '<li class="wc-history-item"><span>No snapshots yet.</span></li>'; return; }
  log.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'wc-history-item';
    li.innerHTML = `<span>${entry.words} words · ${entry.chars} chars</span><span class="wc-history-meta">${escapeHtml(entry.date)}</span>`;
    list.appendChild(li);
  });
}
$('saveSnapshotBtn').addEventListener('click', wcSaveSessionSnapshot);
$('clearHistoryBtn').addEventListener('click', () => {
  localStorage.removeItem('wcHistoryLog');
  wcRenderSessionHistory();
});
wcRenderSessionHistory();

/* ---------------- Offline support (PWA) ---------------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/word-counter/service-worker.js').catch(() => {});
  });
}

/* ---------------- Initial paint ---------------- */
wcUpdateUndoRedoButtons();
wcAnalyze();