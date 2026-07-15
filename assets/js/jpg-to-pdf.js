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

let selectedFiles=[];
let selectedIndex=-1;
let historyStack=[];
let redoStack=[];

browseBtn.addEventListener('click',()=>fileInput.click());
uploadArea.addEventListener('click',()=>fileInput.click());

fileInput.addEventListener('change',e=>{
loadFiles([...e.target.files]);
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

function loadFiles(files){
const valid=files.filter(file=>/^image\/(jpeg|png)$/.test(file.type));
if(!valid.length){
statusText.textContent='Invalid Files';
liveStatus.textContent='Please upload JPG, JPEG or PNG images.';
return;
}
historyStack.push([...selectedFiles]);
redoStack.length=0;
selectedFiles.push(...valid);
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
card.className='dkb-image-card';
card.dataset.index=index;
card.innerHTML=`<img src="${e.target.result}" alt="${file.name}" loading="lazy"><div class="dkb-image-info"><strong>${file.name}</strong><br><small>${(file.size/1024/1024).toFixed(2)} MB</small></div>`;
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
historyStack.push([...selectedFiles]);
redoStack.length=0;
selectedFiles.splice(selectedIndex,1);
selectedIndex=-1;
updateToolbar();
renderImages();
});

rotateBtn.addEventListener('click',()=>{
const card=document.querySelector('.dkb-image-card.selected');
if(!card)return;
const img=card.querySelector('img');
const current=Number(img.dataset.rotate||0);
const next=(current+90)%360;
img.dataset.rotate=next;
img.style.transform=`rotate(${next}deg)`;
});

sortBtn.addEventListener('click',()=>{
historyStack.push([...selectedFiles]);
redoStack.length=0;
selectedFiles.sort((a,b)=>a.name.localeCompare(b.name));
updateToolbar();
renderImages();
});

undoBtn.addEventListener('click',()=>{
if(!historyStack.length)return;
redoStack.push([...selectedFiles]);
selectedFiles=historyStack.pop();
selectedIndex=-1;
updateToolbar();
renderImages();
});

redoBtn.addEventListener('click',()=>{
if(!redoStack.length)return;
historyStack.push([...selectedFiles]);
selectedFiles=redoStack.pop();
selectedIndex=-1;
updateToolbar();
renderImages();
});

favoriteBtn.addEventListener('click',()=>{
localStorage.setItem('dkbFavorites',JSON.stringify(selectedFiles.map(file=>file.name)));
statusText.textContent='Saved';
liveStatus.textContent='Favorites saved successfully.';
});
convertBtn.addEventListener('click',async()=>{
if(!selectedFiles.length){
statusText.textContent='No Images';
liveStatus.textContent='Please upload at least one image.';
return;
}
statusText.textContent='Processing';
liveStatus.textContent='Preparing PDF...';
progressBar.style.width='0%';
progressText.textContent='0%';
convertBtn.disabled=true;

for(let i=0;i<=100;i+=5){
await new Promise(resolve=>setTimeout(resolve,40));
progressBar.style.width=i+'%';
progressText.textContent=i+'%';
}

if(typeof window.jspdf==='undefined'){
statusText.textContent='Library Missing';
liveStatus.textContent='Include jsPDF before using this tool.';
convertBtn.disabled=false;
return;
}

const{jsPDF}=window.jspdf;
const pdf=new jsPDF({
orientation:orientation.value.toLowerCase(),
unit:'mm',
format:pageSize.value.toLowerCase()
});

for(let i=0;i<selectedFiles.length;i++){
const file=selectedFiles[i];
const data=await fileToDataURL(file);

if(i>0)pdf.addPage();

const img=new Image();
await new Promise(resolve=>{
img.onload=resolve;
img.src=data;
});

const pageWidth=pdf.internal.pageSize.getWidth();
const pageHeight=pdf.internal.pageSize.getHeight();
const margin=pageMargin.value==='Wide'?15:pageMargin.value==='Normal'?10:0;

pdf.addImage(data,'JPEG',margin,margin,pageWidth-(margin*2),pageHeight-(margin*2));

if(pageNumbers.value==='On'){
pdf.setFontSize(10);
pdf.text(`${i+1}`,pageWidth/2,pageHeight-5,{align:'center'});
}

if(watermarkText.value.trim()){
pdf.setFontSize(18);
pdf.setTextColor(180);
pdf.text(watermarkText.value,pageWidth/2,pageHeight/2,{align:'center',angle:45});
}
}

pdf.setProperties({
title:'JPG to PDF',
author:'DailyKitBox',
subject:'Image to PDF',
creator:'DailyKitBox'
});

window.generatedPDF=pdf;
downloadBtn.hidden=false;
convertBtn.disabled=false;
statusText.textContent='Completed';
liveStatus.textContent='PDF created successfully.';
});

downloadBtn.addEventListener('click',()=>{
if(window.generatedPDF){
window.generatedPDF.save('DailyKitBox-JPG-to-PDF.pdf');
}
});

function fileToDataURL(file){
return new Promise(resolve=>{
const reader=new FileReader();
reader.onload=e=>resolve(e.target.result);
reader.readAsDataURL(file);
});
}
convertBtn.addEventListener('click',async()=>{if(!selectedFiles.length){statusText.textContent='No Images';liveStatus.textContent='Please upload at least one image.';return;}statusText.textContent='Processing';liveStatus.textContent='Preparing PDF...';progressBar.style.width='0%';progressText.textContent='0%';convertBtn.disabled=true;for(let i=0;i<=100;i+=5){await new Promise(resolve=>setTimeout(resolve,40));progressBar.style.width=i+'%';progressText.textContent=i+'%';}if(typeof window.jspdf==='undefined'){statusText.textContent='Library Missing';liveStatus.textContent='Include jsPDF before using this tool.';convertBtn.disabled=false;return;}const{jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:orientation.value.toLowerCase(),unit:'mm',format:pageSize.value.toLowerCase()});for(let i=0;i<selectedFiles.length;i++){const file=selectedFiles[i];const data=await fileToDataURL(file);if(i>0)pdf.addPage();const img=new Image();await new Promise(resolve=>{img.onload=resolve;img.src=data;});const pageWidth=pdf.internal.pageSize.getWidth();const pageHeight=pdf.internal.pageSize.getHeight();const margin=pageMargin.value==='Wide'?15:pageMargin.value==='Normal'?10:0;pdf.addImage(data,'JPEG',margin,margin,pageWidth-(margin*2),pageHeight-(margin*2));if(pageNumbers.value==='On'){pdf.setFontSize(10);pdf.text(`${i+1}`,pageWidth/2,pageHeight-5,{align:'center'});}if(watermarkText.value.trim()){pdf.setFontSize(18);pdf.setTextColor(180);pdf.text(watermarkText.value,pageWidth/2,pageHeight/2,{align:'center',angle:45});}}pdf.setProperties({title:'JPG to PDF',author:'DailyKitBox',subject:'Image to PDF',creator:'DailyKitBox'});window.generatedPDF=pdf;downloadBtn.hidden=false;convertBtn.disabled=false;statusText.textContent='Completed';liveStatus.textContent='PDF created successfully.';});
downloadBtn.addEventListener('click',()=>{if(window.generatedPDF){window.generatedPDF.save('DailyKitBox-JPG-to-PDF.pdf');}});
function fileToDataURL(file){return new Promise(resolve=>{const reader=new FileReader();reader.onload=e=>resolve(e.target.result);reader.readAsDataURL(file);});}