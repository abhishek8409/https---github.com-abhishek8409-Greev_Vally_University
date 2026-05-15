let profileName =
    document.getElementById("profileName");

let editName =
    document.getElementById("editName");

let profileImage =
    document.getElementById("profileImage");


// LOAD DATA

function loadProfile(){

    let name =
        localStorage.getItem("name");

    let image =
        localStorage.getItem("profileImage");

    profileName.innerText = name;

    editName.value = name;

    if(image){

        profileImage.src = image;

    }

}

loadProfile();


// SAVE NAME

document.getElementById("saveBtn")

.addEventListener("click", function(){

    localStorage.setItem(
        "name",
        editName.value
    );

    alert("Profile Updated");

    loadProfile();

});


// IMAGE UPLOAD

document.getElementById("imageInput")

.addEventListener("change", function(){

    let file = this.files[0];

    let reader = new FileReader();

    reader.onload = function(){

        localStorage.setItem(
            "profileImage",
            reader.result
        );

        loadProfile();

    };

    reader.readAsDataURL(file);

});