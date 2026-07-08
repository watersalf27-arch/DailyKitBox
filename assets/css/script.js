// DailyKitBox Main Script


// Tool Search Function

const searchBox = document.querySelector(".hero input");

const tools = document.querySelectorAll(".tool-card");


if(searchBox){

searchBox.addEventListener("keyup", function(){

    let value = searchBox.value.toLowerCase();


    tools.forEach(function(tool){

        let text = tool.innerText.toLowerCase();


        if(text.includes(value)){

            tool.style.display="block";

        }else{

            tool.style.display="none";

        }

    });


});

}



// Future Tools Loader

const categories = document.querySelectorAll(".categories button");


categories.forEach(function(category){

category.addEventListener("click",function(){

    console.log(
        "Category selected:",
        category.innerText
    );

});


});



// Mobile Menu Ready For Future

console.log("DailyKitBox Loaded Successfully");