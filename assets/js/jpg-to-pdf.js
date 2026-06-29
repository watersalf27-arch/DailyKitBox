const imageCount = document.getElementById("imageCount");
const totalSize = document.getElementById("totalSize");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

const input = document.getElementById("images");
const preview = document.getElementById("preview");
const convertBtn = document.getElementById("convertBtn");
const status = document.getElementById("status");

let selectedImages = [];
let imageRotations = new Map();
function updateStats(){

const total = selectedImages.reduce((sum,file)=>sum+file.size,0);

imageCount.textContent = selectedImages.length + " Images";

totalSize.textContent =
(total/1024/1024).toFixed(2)+" MB";

}

input.addEventListener("change",()=>{

preview.innerHTML="";

selectedImages=[];

const files=Array.from(input.files);

if(files.length===0){

status.textContent="Please select images.";

return;

}

files.forEach(file=>{

const allowed=["image/jpeg","image/png"];

if(!allowed.includes(file.type)) return;

selectedImages.push(file);
imageRotations.set(file, 0);

const reader=new FileReader();

reader.onload=function(e){

const card=document.createElement("div");

card.className="preview-card";

card.innerHTML=`

<div class="preview-item">

<img src="${e.target.result}" alt="${file.name}">

<div class="preview-info">

<strong>${file.name}</strong>

<small>${Math.round(file.size/1024)} KB</small>

</div>

<button class="delete-btn">✕</button>

<div class="rotate-buttons">

<button class="rotate-left">↺</button>

<button class="rotate-right">↻</button>

</div>

</div>

`;

const image=card.querySelector("img");

let rotation=0;

card.querySelector(".rotate-left").onclick=()=>{

rotation-=90;

image.style.transform=`rotate(${rotation}deg)`;

};

card.querySelector(".rotate-right").onclick=()=>{

rotation+=90;

image.style.transform=`rotate(${rotation}deg)`;

};

card.querySelector(".delete-btn").addEventListener("click",()=>{

selectedImages=selectedImages.filter(f=>f!==file);

card.remove();

updateStats();

status.textContent=
selectedImages.length+" image(s) selected.";

if(selectedImages.length===0){

progressBar.style.width="0%";

progressText.textContent="";

status.textContent="Please select images.";

}

});

preview.appendChild(card);

};

reader.readAsDataURL(file);

});

updateStats();

status.textContent=
selectedImages.length+" image(s) selected.";

});
convertBtn.addEventListener("click", async () => {

if(selectedImages.length===0){

status.textContent="Please select at least one image.";

return;

}

convertBtn.disabled=true;

status.textContent="Creating PDF...";

progressBar.style.width="0%";

progressText.textContent="0% Completed";

try{

const { jsPDF } = window.jspdf;

const pageSize=document.getElementById("pageSize").value;

const orientation=document.getElementById("orientation").value;

const quality=document.getElementById("quality").value;

const pdf=new jsPDF({

orientation:orientation,

unit:"mm",

format:pageSize

});

for(let i=0;i<selectedImages.length;i++){

const file=selectedImages[i];

const dataUrl=await new Promise(resolve=>{

const reader=new FileReader();

reader.onload=e=>resolve(e.target.result);

reader.readAsDataURL(file);

});

const img=await new Promise(resolve=>{

const image=new Image();

image.onload=()=>resolve(image);

image.src=dataUrl;

});

const pageWidth=pdf.internal.pageSize.getWidth();

const pageHeight=pdf.internal.pageSize.getHeight();

const ratio=Math.min(

pageWidth/img.width,

pageHeight/img.height

);

const width=img.width*ratio;

const height=img.height*ratio;

const x=(pageWidth-width)/2;

const y=(pageHeight-height)/2;

if(i>0){

pdf.addPage();

}

const type=file.type==="image/png"?"PNG":"JPEG";

pdf.addImage(

dataUrl,

type,

x,

y,

width,

height,

undefined,

quality

);

const percent=Math.round(((i+1)/selectedImages.length)*100);

progressBar.style.width=percent+"%";

progressText.textContent=percent+"% Completed";

await new Promise(r=>setTimeout(r,40));

}

pdf.save("DailyKitBox.pdf");

progressBar.style.width="100%";

progressText.textContent="✅ PDF Ready";

status.textContent="✅ PDF downloaded successfully.";

}catch(error){

console.error(error);

status.textContent="❌ Failed to create PDF.";

progressBar.style.width="0%";

progressText.textContent="";

}finally{

convertBtn.disabled=false;

}

});