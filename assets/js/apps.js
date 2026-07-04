/* ==========================================
   DailyKitBox Script Part 1
========================================== */

const menuBtn=document.getElementById("menuBtn");
const mobileMenu=document.getElementById("mobileMenu");
const searchBox=document.getElementById("searchBox");

if(menuBtn){
menuBtn.addEventListener("click",()=>{
mobileMenu.classList.toggle("active");
});
}

/* ---------- Search ---------- */

if(searchBox){

searchBox.addEventListener("keyup",function(){

const value=this.value.toLowerCase();

const cards=document.querySelectorAll(".tool-card");

cards.forEach(card=>{

const text=card.innerText.toLowerCase();

if(text.includes(value)){

card.style.display="block";

}else{

card.style.display="none";

}

});

});

}

/* ---------- Active Link ---------- */

document.querySelectorAll(".mobile-menu a").forEach(link=>{

if(link.href===window.location.href){

link.classList.add("active");

}

});

/* ---------- Smooth Hover ---------- */

document.querySelectorAll(".tool-card").forEach(card=>{

card.addEventListener("mouseenter",()=>{

card.style.transform="translateY(-8px)";

});

card.addEventListener("mouseleave",()=>{

card.style.transform="translateY(0px)";

});

});

/* ---------- Scroll Animation ---------- */

const observer=new IntersectionObserver(entries=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

entry.target.style.opacity="1";

entry.target.style.transform="translateY(0px)";

}

});

},{
threshold:.15
});

document.querySelectorAll(".tool-card").forEach(card=>{

card.style.opacity="0";

card.style.transform="translateY(40px)";

card.style.transition=".6s";

observer.observe(card);

});

/* ---------- Footer Year ---------- */

const year=document.getElementById("year");

if(year){

year.textContent=new Date().getFullYear();

}