(function(){
"use strict";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

/* ============================================================
   STATE
   ============================================================ */
const state = {
  fileBytes:null,       // ArrayBuffer of original file
  fileName:"document",
  pdfjsDoc:null,         // pdfjsLib document (for rendering)
  pages:[],              // [{ originalIndex, rotationDelta, deleted:false, thumbDataUrl }]
  selected:new Set(),    // originalIndex values currently marked for deletion
  undoStack:[],          // stack of {originalIndex, insertAt} restored on undo
  dragSrcIndex:null
};

/* ============================================================
   DOM SHORTCUTS
   ============================================================ */
const $ = (id)=>document.getElementById(id);
const dropzone=$("dropzone"), loadingState=$("loadingState"), editorState=$("editorState"), successState=$("successState");
const fileInput=$("fileInput"), pageGrid=$("pageGrid");
const statTotal=$("statTotal"), statRemaining=$("statRemaining"), statSelected=$("statSelected"), statSize=$("statSize");
const progressWrap=$("progressWrap"), progressFill=$("progressFill"), progressLabel=$("progressLabel");
const toastStack=$("toastStack");

/* ============================================================
   TOASTS
   ============================================================ */
function toast(message, type){
  type = type || "info";
  const el=document.createElement("div");
  el.className="toast "+type;
  const iconPath = type==="error"
    ? '<path d="M12 8v5M12 16.5h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/>'
    : '<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  el.innerHTML = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none">'+iconPath+'</svg><span>'+message+'</span>';
  toastStack.appendChild(el);
  setTimeout(()=>{ el.style.transition="opacity .3s ease"; el.style.opacity="0"; setTimeout(()=>el.remove(),300); }, 3600);
}

/* ============================================================
   THEME
   ============================================================ */
let theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
document.documentElement.setAttribute("data-theme", theme);
$("themeToggle").addEventListener("click", ()=>{
  theme = theme==="dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);
});

/* ============================================================
   VIEW SWITCHING
   ============================================================ */
function showView(view){
  dropzone.style.display = view==="upload" ? "" : "none";
  loadingState.style.display = view==="loading" ? "" : "none";
  editorState.style.display = view==="editor" ? "" : "none";
  successState.style.display = view==="success" ? "" : "none";
}

/* ============================================================
   FILE INTAKE
   ============================================================ */
$("chooseFileBtn").addEventListener("click", ()=>fileInput.click());
$("heroUploadBtn").addEventListener("click", ()=>{ document.getElementById("workspace").scrollIntoView({behavior:"smooth"}); fileInput.click(); });
$("learnMoreBtn").addEventListener("click", ()=>document.getElementById("how-it-works").scrollIntoView({behavior:"smooth"}));
fileInput.addEventListener("change", (e)=>{ if(e.target.files[0]) handleFile(e.target.files[0]); });

["dragenter","dragover"].forEach(evt=>dropzone.addEventListener(evt, (e)=>{ e.preventDefault(); dropzone.classList.add("dragover"); }));
["dragleave","drop"].forEach(evt=>dropzone.addEventListener(evt, (e)=>{ e.preventDefault(); dropzone.classList.remove("dragover"); }));
dropzone.addEventListener("drop", (e)=>{
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if(f) handleFile(f);
});

function humanFileSize(bytes){
  if(bytes < 1024) return bytes+" B";
  const units=["KB","MB","GB"]; let u=-1;
  do{ bytes/=1024; u++; }while(bytes>=1024 && u<units.length-1);
  return bytes.toFixed(1)+" "+units[u];
}

async function handleFile(file){
  if(file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")){
    toast("Please choose a valid PDF file.", "error");
    return;
  }
  try{
    showView("loading");
    $("loadingLabel").textContent = "Reading "+file.name+"\u2026";
    const buffer = await file.arrayBuffer();
    state.fileBytes = buffer;
    state.fileName = file.name.replace(/\.pdf$/i,"");
    $("outputName").value = state.fileName + "-edited";
    statSize.textContent = humanFileSize(buffer.byteLength);

    // Load with pdf.js for rendering (needs its own copy of the bytes)
    const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
    state.pdfjsDoc = await loadingTask.promise;

    state.pages = [];
    for(let i=0;i<state.pdfjsDoc.numPages;i++){
      state.pages.push({ originalIndex:i, rotationDelta:0, deleted:false, thumbDataUrl:null });
    }
    state.selected.clear();
    state.undoStack=[];

    await renderAllThumbnails();
    showView("editor");
    updateStats();
    toast("Loaded "+state.pdfjsDoc.numPages+" pages successfully.", "success");
  }catch(err){
    console.error(err);
    showView("upload");
    toast("That file couldn't be read. Make sure it's a valid, unencrypted PDF.", "error");
  }
}

async function renderAllThumbnails(){
  progressWrap.style.display="";
  const total = state.pages.length;
  for(let i=0;i<total;i++){
    const p = state.pages[i];
    const page = await state.pdfjsDoc.getPage(p.originalIndex+1);
    const viewport = page.getViewport({ scale: 0.45 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width; canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    p.thumbDataUrl = canvas.toDataURL("image/png");
    progressFill.style.width = Math.round(((i+1)/total)*100)+"%";
    progressLabel.textContent = "Rendering preview "+(i+1)+" of "+total+"\u2026";
    // yield to keep UI responsive
    if(i % 4 === 0) await new Promise(r=>setTimeout(r));
  }
  progressWrap.style.display="none";
  renderGrid();
}

/* ============================================================
   GRID RENDERING
   ============================================================ */
function renderGrid(){
  pageGrid.innerHTML="";
  const visible = state.pages.filter(p=>!p.deleted);
  visible.forEach((p, displayIdx)=>{
    const card = document.createElement("div");
    card.className = "page-card"+(state.selected.has(p.originalIndex)?" selected":"");
    card.setAttribute("role","listitem");
    card.dataset.originalIndex = p.originalIndex;
    card.draggable = true;

    card.innerHTML =
      '<div class="page-thumb-wrap">'+
        '<div class="page-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'+
        '<img class="page-thumb" src="'+p.thumbDataUrl+'" alt="Preview of page '+(displayIdx+1)+'" style="transform:rotate('+p.rotationDelta+'deg);">'+
        '<div class="page-strike"></div>'+
        '<div class="page-tools">'+
          '<button class="page-tool-btn" data-action="rotate" title="Rotate page" aria-label="Rotate page"><svg viewBox="0 0 24 24" fill="none"><path d="M4 4v6h6M20 20v-6h-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.6 15a8 8 0 0 0 13.9 3M18.4 9A8 8 0 0 0 4.5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>'+
          '<button class="page-tool-btn" data-action="zoom" title="Zoom preview" aria-label="Zoom preview"><svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.7"/><path d="m20 20-3.2-3.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>'+
        '</div>'+
        '<div class="drag-handle" title="Drag to reorder" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="8" cy="6" r="1.3" fill="currentColor"/><circle cx="8" cy="12" r="1.3" fill="currentColor"/><circle cx="8" cy="18" r="1.3" fill="currentColor"/><circle cx="16" cy="6" r="1.3" fill="currentColor"/><circle cx="16" cy="12" r="1.3" fill="currentColor"/><circle cx="16" cy="18" r="1.3" fill="currentColor"/></svg></div>'+
        '<div class="page-num">Page '+(displayIdx+1)+'</div>'+
      '</div>';

    card.addEventListener("click", (e)=>{
      if(e.target.closest("[data-action]")) return;
      toggleSelect(p.originalIndex);
    });
    card.querySelector('[data-action="rotate"]').addEventListener("click", (e)=>{
      e.stopPropagation();
      p.rotationDelta = (p.rotationDelta + 90) % 360;
      renderGrid();
    });
    card.querySelector('[data-action="zoom"]').addEventListener("click", (e)=>{
      e.stopPropagation();
      openZoom(p, displayIdx+1);
    });

    // drag reorder (desktop HTML5 DnD)
    card.addEventListener("dragstart", ()=>{ state.dragSrcIndex = p.originalIndex; card.classList.add("dragging"); });
    card.addEventListener("dragend", ()=>{ card.classList.remove("dragging"); renderGrid(); });
    card.addEventListener("dragover", (e)=>{ e.preventDefault(); card.classList.add("drop-target"); });
    card.addEventListener("dragleave", ()=>card.classList.remove("drop-target"));
    card.addEventListener("drop", (e)=>{
      e.preventDefault();
      card.classList.remove("drop-target");
      reorderPages(state.dragSrcIndex, p.originalIndex);
    });

    // touch/pointer reorder support for mobile
    let pointerDown=false;
    card.addEventListener("pointerdown", ()=>{ pointerDown=true; state.dragSrcIndex = p.originalIndex; });
    card.addEventListener("pointerup", ()=>{
      if(pointerDown && state.dragSrcIndex !== null && state.dragSrcIndex !== p.originalIndex){
        reorderPages(state.dragSrcIndex, p.originalIndex);
      }
      pointerDown=false;
    });

    pageGrid.appendChild(card);
  });
  updateStats();
}

function reorderPages(srcOriginalIndex, targetOriginalIndex){
  if(srcOriginalIndex===targetOriginalIndex || srcOriginalIndex==null) return;
  const srcPos = state.pages.findIndex(p=>p.originalIndex===srcOriginalIndex);
  const targetPos = state.pages.findIndex(p=>p.originalIndex===targetOriginalIndex);
  if(srcPos===-1||targetPos===-1) return;
  const [moved] = state.pages.splice(srcPos,1);
  state.pages.splice(targetPos,0,moved);
  renderGrid();
}

/* ============================================================
   SELECTION
   ============================================================ */
function toggleSelect(originalIndex){
  if(state.selected.has(originalIndex)) state.selected.delete(originalIndex);
  else state.selected.add(originalIndex);
  renderGrid();
}
$("selectAllBtn").addEventListener("click", ()=>{
  state.pages.filter(p=>!p.deleted).forEach(p=>state.selected.add(p.originalIndex));
  renderGrid();
});
$("deselectAllBtn").addEventListener("click", ()=>{ state.selected.clear(); renderGrid(); });

$("rangeSelectBtn").addEventListener("click", ()=>{
  const start = parseInt($("rangeStart").value,10);
  const end = parseInt($("rangeEnd").value,10);
  const visible = state.pages.filter(p=>!p.deleted);
  if(!start || !end || start<1 || end<1){ toast("Enter a valid page range.", "error"); return; }
  const lo=Math.min(start,end), hi=Math.max(start,end);
  for(let i=lo;i<=hi && i<=visible.length;i++){
    state.selected.add(visible[i-1].originalIndex);
  }
  renderGrid();
  toast("Selected pages "+lo+" to "+Math.min(hi,visible.length)+".", "success");
});

/* ============================================================
   DELETE / UNDO
   ============================================================ */
$("deleteSelectedBtn").addEventListener("click", ()=>{
  if(state.selected.size===0) return;
  const removed=[];
  state.pages.forEach((p, idx)=>{
    if(state.selected.has(p.originalIndex) && !p.deleted){
      p.deleted = true;
      removed.push({ originalIndex:p.originalIndex, positionAtDeletion:idx });
    }
  });
  state.undoStack.push(removed);
  state.selected.clear();
  renderGrid();
  toast(removed.length+" page(s) deleted.", "success");
});

$("undoBtn").addEventListener("click", performUndo);
function performUndo(){
  if(state.undoStack.length===0) return;
  const last = state.undoStack.pop();
  last.forEach(entry=>{
    const p = state.pages.find(pg=>pg.originalIndex===entry.originalIndex);
    if(p) p.deleted=false;
  });
  renderGrid();
  toast("Restored last deletion.", "success");
}

/* ============================================================
   STATS
   ============================================================ */
function updateStats(){
  const total = state.pages.length;
  const remaining = state.pages.filter(p=>!p.deleted).length;
  statTotal.textContent = total;
  statRemaining.textContent = remaining;
  statSelected.textContent = state.selected.size;
  $("deleteSelectedBtn").disabled = state.selected.size===0;
  $("undoBtn").disabled = state.undoStack.length===0;
}

/* ============================================================
   ZOOM MODAL
   ============================================================ */
const zoomModal=$("zoomModal");
async function openZoom(p, displayNum){
  $("zoomTitle").textContent = "Page "+displayNum;
  const canvas = $("zoomCanvas");
  const page = await state.pdfjsDoc.getPage(p.originalIndex+1);
  const viewport = page.getViewport({ scale: 1.4, rotation: p.rotationDelta });
  canvas.width = viewport.width; canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;
  zoomModal.classList.add("open");
}
$("zoomClose").addEventListener("click", ()=>zoomModal.classList.remove("open"));
zoomModal.addEventListener("click", (e)=>{ if(e.target===zoomModal) zoomModal.classList.remove("open"); });

/* ============================================================
   BACK / RESET
   ============================================================ */
$("backBtn").addEventListener("click", resetTool);
$("editAgainBtn").addEventListener("click", ()=>showView("editor"));
function resetTool(){
  state.fileBytes=null; state.pdfjsDoc=null; state.pages=[]; state.selected.clear(); state.undoStack=[];
  fileInput.value="";
  showView("upload");
}

/* ============================================================
   EXPORT / DOWNLOAD
   ============================================================ */
$("downloadBtn").addEventListener("click", exportPdf);
async function exportPdf(){
  const remaining = state.pages.filter(p=>!p.deleted);
  if(remaining.length===0){ toast("At least one page must remain in the document.", "error"); return; }
  try{
    $("downloadBtn").disabled = true;
    const srcDoc = await PDFLib.PDFDocument.load(state.fileBytes);
    const outDoc = await PDFLib.PDFDocument.create();
    const indices = remaining.map(p=>p.originalIndex);
    const copied = await outDoc.copyPages(srcDoc, indices);
    copied.forEach((page, i)=>{
      const rot = remaining[i].rotationDelta;
      if(rot){
        const current = page.getRotation().angle || 0;
        page.setRotation(PDFLib.degrees((current+rot)%360));
      }
      outDoc.addPage(page);
    });

    const quality = $("qualitySelect").value;
    const saveOptions = quality==="small" ? { useObjectStreams:true } : {};
    const bytes = await outDoc.save(saveOptions);

    const blob = new Blob([bytes], { type:"application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const name = ($("outputName").value.trim() || "edited-document").replace(/\.pdf$/i,"");
    a.href = url; a.download = name+".pdf";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);

    $("successSummary").textContent = remaining.length+" page(s) kept, "+(state.pages.length-remaining.length)+" removed.";
    showView("success");
  }catch(err){
    console.error(err);
    toast("Something went wrong while exporting. Please try again.", "error");
  }finally{
    $("downloadBtn").disabled = false;
  }
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
document.addEventListener("keydown", (e)=>{
  if(zoomModal.classList.contains("open") && e.key==="Escape"){ zoomModal.classList.remove("open"); return; }
  if(editorState.style.display==="none") return;
  const tag = document.activeElement.tagName;
  if(tag==="INPUT" || tag==="SELECT" || tag==="TEXTAREA") return;

  if(e.key==="Delete" || e.key==="Backspace"){ e.preventDefault(); $("deleteSelectedBtn").click(); }
  else if(e.ctrlKey && e.key.toLowerCase()==="z"){ e.preventDefault(); performUndo(); }
  else if(e.ctrlKey && e.key.toLowerCase()==="a"){ e.preventDefault(); $("selectAllBtn").click(); }
  else if(e.key==="Escape"){ state.selected.clear(); renderGrid(); }
});

$("shortcutsBtn").addEventListener("click", ()=>{
  toast("Del: delete selected &middot; Ctrl+Z: undo &middot; Ctrl+A: select all &middot; Esc: deselect", "success");
});

/* ============================================================
   FAQ ACCORDION
   ============================================================ */
document.querySelectorAll(".faq-item").forEach(item=>{
  const q = item.querySelector(".faq-q");
  const a = item.querySelector(".faq-a");
  q.addEventListener("click", ()=>{
    const isOpen = item.classList.contains("open");
    document.querySelectorAll(".faq-item").forEach(other=>{
      other.classList.remove("open");
      other.querySelector(".faq-q").setAttribute("aria-expanded","false");
      other.querySelector(".faq-a").style.maxHeight = null;
    });
    if(!isOpen){
      item.classList.add("open");
      q.setAttribute("aria-expanded","true");
      a.style.maxHeight = a.scrollHeight+"px";
    }
  });
});

/* ============================================================
   PWA SERVICE WORKER
   ============================================================ */
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("sw.js").catch(()=>{ /* offline support unavailable, safe to ignore */ });
  });
}

})();