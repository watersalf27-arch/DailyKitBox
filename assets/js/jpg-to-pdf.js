'use strict';

const fileInput=document.getElementById('fileInput');
const uploadArea=document.getElementById('uploadArea');
const browseBtn=document.getElementById('browseBtn');
const imagePreview=document.getElementById('imagePreview');
const imageCounter=document.getElementById('imageCounter');
const totalSize=document.getElementById('totalSize');
const statusText=document.getElementById('statusText');
const progressBar=document.getElementById('progressBar');
const progressText=document.getElementById('progressText');
const liveStatus=document.getElementById('liveStatus');
const convertBtn=document.getElementById('convertBtn');
const downloadBtn=document.getElementById('downloadBtn');
const rotateBtn=document.getElementById('rotateBtn');
const deleteBtn=document.getElementById('deleteBtn');
const sortBtn=document.getElementById('sortBtn');
const undoBtn=document.getElementById('undoBtn');
const redoBtn=document.getElementById('redoBtn');
const favoriteBtn=document.getElementById('favoriteBtn');
const compressionLevel=document.getElementById('compressionLevel');
const pageSize=document.getElementById('pageSize');
const orientation=document.getElementById('orientation');
const pageMargin=document.getElementById('pageMargin');
const pageNumbers=document.getElementById('pageNumbers');
const watermarkText=document.getElementById('watermarkText');
const reduceSizeToggle=document.getElementById('reduceSizeToggle');
const targetSizeValue=document.getElementById('targetSizeValue');
const targetSizeUnit=document.getElementById('targetSizeUnit');
const resolutionPreset=document.getElementById('resolutionPreset');
const customDpiValue=document.getElementById('customDpiValue');

let selectedFiles=[];
let rotations=[];
let selectedIndex=-1;
let historyStack=[];
let redoStack=[];

browseBtn.addEventListener('click',()=>fileInput.click());
uploadArea.addEventListener('click',()=>fileInput.click());

fileInput.addEventListener('change',e=>{
loadFiles([...e.target.files]);
fileInput.value='';
});

uploadArea.addEventListener('dragover',e=>{
e.preventDefault();
uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave',()=>{
uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop',e=>{
e.preventDefault();
uploadArea.classList.remove('dragover');
loadFiles([...e.dataTransfer.files]);
});

function snapshotState(){
return{files:[...selectedFiles],rotations:[...rotations]};
}

function pushHistory(){
historyStack.push(snapshotState());
redoStack.length=0;
}

function loadFiles(files){
const valid=files.filter(file=>/^image\/(jpeg|png)$/.test(file.type));
if(!valid.length){
statusText.textContent='Invalid Files';
liveStatus.textContent='Please upload JPG, JPEG or PNG images.';
return;
}
pushHistory();
selectedFiles.push(...valid);
valid.forEach(()=>rotations.push(0));
updateToolbar();
renderImages();
}

function updateToolbar(){
imageCounter.textContent=selectedFiles.length;
const bytes=selectedFiles.reduce((t,f)=>t+f.size,0);
totalSize.textContent=(bytes/1024/1024).toFixed(2)+' MB';
statusText.textContent=selectedFiles.length?'Ready':'Waiting';
liveStatus.textContent=selectedFiles.length?'Images uploaded successfully.':'Waiting for images.';
}

function renderImages(){
imagePreview.innerHTML='';
selectedFiles.forEach((file,index)=>{
const reader=new FileReader();
reader.onload=e=>{
const card=document.createElement('div');
card.className='dkb-image-card'+(index===selectedIndex?' selected':'');
card.dataset.index=index;
const img=document.createElement('img');
img.src=e.target.result;
img.alt=file.name;
img.loading='lazy';
img.style.transform=`rotate(${rotations[index]||0}deg)`;
const info=document.createElement('div');
info.className='dkb-image-info';
info.innerHTML=`<strong>${file.name}</strong><br><small>${(file.size/1024/1024).toFixed(2)} MB</small>`;
card.appendChild(img);
card.appendChild(info);
card.addEventListener('click',()=>{
document.querySelectorAll('.dkb-image-card').forEach(item=>item.classList.remove('selected'));
card.classList.add('selected');
selectedIndex=index;
});
imagePreview.appendChild(card);
};
reader.readAsDataURL(file);
});
}

deleteBtn.addEventListener('click',()=>{
if(selectedIndex<0)return;
pushHistory();
selectedFiles.splice(selectedIndex,1);
rotations.splice(selectedIndex,1);
selectedIndex=-1;
updateToolbar();
renderImages();
});

rotateBtn.addEventListener('click',()=>{
if(selectedIndex<0)return;
rotations[selectedIndex]=((rotations[selectedIndex]||0)+90)%360;
const card=document.querySelector(`.dkb-image-card[data-index="${selectedIndex}"] img`);
if(card)card.style.transform=`rotate(${rotations[selectedIndex]}deg)`;
});

sortBtn.addEventListener('click',()=>{
pushHistory();
const paired=selectedFiles.map((file,i)=>({file,rotation:rotations[i]||0}));
paired.sort((a,b)=>a.file.name.localeCompare(b.file.name));
selectedFiles=paired.map(p=>p.file);
rotations=paired.map(p=>p.rotation);
updateToolbar();
renderImages();
});

undoBtn.addEventListener('click',()=>{
if(!historyStack.length)return;
redoStack.push(snapshotState());
const prev=historyStack.pop();
selectedFiles=prev.files;
rotations=prev.rotations;
selectedIndex=-1;
updateToolbar();
renderImages();
});

redoBtn.addEventListener('click',()=>{
if(!redoStack.length)return;
historyStack.push(snapshotState());
const next=redoStack.pop();
selectedFiles=next.files;
rotations=next.rotations;
selectedIndex=-1;
updateToolbar();
renderImages();
});

favoriteBtn.addEventListener('click',()=>{
localStorage.setItem('dkbFavorites',JSON.stringify(selectedFiles.map(file=>file.name)));
statusText.textContent='Saved';
liveStatus.textContent='Favorites saved successfully.';
});

function fileToDataURL(file){
return new Promise(resolve=>{
const reader=new FileReader();
reader.onload=e=>resolve(e.target.result);
reader.readAsDataURL(file);
});
}

function loadImageElement(dataURL){
return new Promise(resolve=>{
const img=new Image();
img.onload=()=>resolve(img);
img.src=dataURL;
});
}

function drawRotatedScaled(img,rotationDeg,maxW,maxH){
const rad=rotationDeg*Math.PI/180;
const swapped=rotationDeg%180!==0;
const natW=img.naturalWidth||img.width;
const natH=img.naturalHeight||img.height;
const boundW=swapped?natH:natW;
const boundH=swapped?natW:natH;
let scale=1;
if(maxW&&maxH){
scale=Math.min(maxW/boundW,maxH/boundH,1);
}
const canvas=document.createElement('canvas');
canvas.width=Math.max(1,Math.round(boundW*scale));
canvas.height=Math.max(1,Math.round(boundH*scale));
const ctx=canvas.getContext('2d');
ctx.fillStyle='#FFFFFF';
ctx.fillRect(0,0,canvas.width,canvas.height);
ctx.save();
ctx.translate(canvas.width/2,canvas.height/2);
ctx.rotate(rad);
ctx.drawImage(img,-(natW*scale)/2,-(natH*scale)/2,natW*scale,natH*scale);
ctx.restore();
return canvas;
}

function mmToIn(mm){return mm/25.4;}

function pixelTargetForDpi(dpi,pageWidthMm,pageHeightMm,marginMm){
if(!dpi)return{w:null,h:null};
const contentWMm=Math.max(pageWidthMm-(marginMm*2),10);
const contentHMm=Math.max(pageHeightMm-(marginMm*2),10);
return{
w:Math.round(mmToIn(contentWMm)*dpi),
h:Math.round(mmToIn(contentHMm)*dpi)
};
}

function marginToMm(value){
return value==='Wide'?15:value==='Normal'?10:0;
}

function legacyQualityFor(level){
if(level==='none')return 0.92;
if(level==='low')return 0.85;
if(level==='medium')return 0.7;
return 0.5;
}

async function buildPdf(quality,dpi){
const{jsPDF}=window.jspdf;
const pdf=new jsPDF({
orientation:orientation.value.toLowerCase(),
unit:'mm',
format:pageSize.value.toLowerCase()
});
const pageWidthMm=pdf.internal.pageSize.getWidth();
const pageHeightMm=pdf.internal.pageSize.getHeight();
const marginMm=marginToMm(pageMargin.value);
const target=pixelTargetForDpi(dpi,pageWidthMm,pageHeightMm,marginMm);

for(let i=0;i<selectedFiles.length;i++){
const file=selectedFiles[i];
const rawData=await fileToDataURL(file);
const img=await loadImageElement(rawData);
const canvas=drawRotatedScaled(img,rotations[i]||0,target.w,target.h);
const jpegData=canvas.toDataURL('image/jpeg',quality);

if(i>0)pdf.addPage();

const drawW=pageWidthMm-(marginMm*2);
const drawH=pageHeightMm-(marginMm*2);
pdf.addImage(jpegData,'JPEG',marginMm,marginMm,drawW,drawH);

if(pageNumbers.value==='On'){
pdf.setFontSize(10);
pdf.text(`${i+1}`,pageWidthMm/2,pageHeightMm-5,{align:'center'});
}

if(watermarkText.value.trim()){
pdf.setFontSize(18);
pdf.setTextColor(180);
pdf.text(watermarkText.value,pageWidthMm/2,pageHeightMm/2,{align:'center',angle:45});
}
}

pdf.setProperties({
title:'JPG to PDF',
author:'DailyKitBox',
subject:'Image to PDF',
creator:'DailyKitBox'
});

return pdf;
}

function presetDpi(){
if(resolutionPreset.value==='original')return null;
if(resolutionPreset.value==='custom'){
const custom=Number(customDpiValue.value);
return custom>=36&&custom<=1200?custom:300;
}
return Number(resolutionPreset.value);
}

function targetBytesFromInputs(){
const raw=Number(targetSizeValue.value);
if(!raw||raw<=0)return null;
return targetSizeUnit.value==='MB'?raw*1024*1024:raw*1024;
}

async function runProgressSweep(){
progressBar.style.width='0%';
progressText.textContent='0%';
for(let i=0;i<=100;i+=5){
await new Promise(resolve=>setTimeout(resolve,25));
progressBar.style.width=i+'%';
progressText.textContent=i+'%';
}
}

convertBtn.addEventListener('click',async()=>{
if(!selectedFiles.length){
statusText.textContent='No Images';
liveStatus.textContent='Please upload at least one image.';
return;
}

if(typeof window.jspdf==='undefined'){
statusText.textContent='Library Missing';
liveStatus.textContent='Include jsPDF before using this tool.';
return;
}

statusText.textContent='Processing';
liveStatus.textContent='Preparing PDF...';
convertBtn.disabled=true;
await runProgressSweep();

let finalPdf;

if(reduceSizeToggle.value==='on'){
const targetBytes=targetBytesFromInputs();
const baseDpi=presetDpi();
const qualitySteps=[0.8,0.6,0.4,0.3];
const scaleSteps=[1,0.75,0.5,0.35];
let bestPdf=null;
let bestSize=Infinity;
let hitTarget=false;

outer:
for(const scaleFactor of scaleSteps){
const dpi=baseDpi?Math.max(36,Math.round(baseDpi*scaleFactor)):(scaleFactor<1?Math.round(300*scaleFactor):null);
for(const q of qualitySteps){
liveStatus.textContent=`Optimizing... trying ${dpi?dpi+' DPI':'original resolution'} at ${Math.round(q*100)}% quality`;
const pdf=await buildPdf(q,dpi);
const blob=pdf.output('blob');
if(blob.size<bestSize){
bestSize=blob.size;
bestPdf=pdf;
}
if(!targetBytes||blob.size<=targetBytes){
finalPdf=pdf;
hitTarget=true;
break outer;
}
}
}

if(!hitTarget){
finalPdf=bestPdf;
liveStatus.textContent=`Could not fully reach your target size. Smallest achieved: ${(bestSize/1024).toFixed(0)} KB.`;
}else{
liveStatus.textContent=`PDF created at ${(bestSize/1024).toFixed(0)} KB, within your target.`;
}
}else{
const quality=legacyQualityFor(compressionLevel.value);
const dpi=presetDpi();
finalPdf=await buildPdf(quality,dpi);
const blob=finalPdf.output('blob');
liveStatus.textContent=`PDF created successfully (${(blob.size/1024).toFixed(0)} KB).`;
}

window.generatedPDF=finalPdf;
downloadBtn.hidden=false;
convertBtn.disabled=false;
statusText.textContent='Completed';
});

downloadBtn.addEventListener('click',()=>{
if(window.generatedPDF){
window.generatedPDF.save('DailyKitBox-JPG-to-PDF.pdf');
}
});