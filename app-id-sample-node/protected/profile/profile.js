document.addEventListener("DOMContentLoaded", function(){
    document.getElementById("upload").addEventListener("change", function(){
        let file = this.files[0];

        if(file){
            let reader = new FileReader();

            reader.onload = function(e){
                document.getElementById("preview").src = e.target.result;
                localStorage.setItem("profileImage", e.target.result);
            }

            reader.readAsDataURL(file);
        }
    });
});
// load data and show
window.onload = function(){
    loadProfile();
    let img = localStorage.getItem("profileImage");
if(img){
    document.getElementById("preview").src = img;
}
}

// load data into view mode
function loadProfile(){
    let name = localStorage.getItem("name") || "Not set";
    let reg = localStorage.getItem("regNo") || "Not set";
    let email = localStorage.getItem("email") || "Not set";
    let phone = localStorage.getItem("phone") || "Not set";

    document.getElementById("showName").innerText = name;
    document.getElementById("showReg").innerText = reg;
    document.getElementById("showEmail").innerText = email;
    document.getElementById("showPhone").innerText = phone;
}

// edit mode open
function editProfile(){
    document.getElementById("viewMode").style.display = "none";
    document.getElementById("editMode").style.display = "block";

    // fill inputs
    document.getElementById("name").value = localStorage.getItem("name") || "";
    document.getElementById("regNo").value = localStorage.getItem("regNo") || "";
    document.getElementById("email").value = localStorage.getItem("email") || "";
    document.getElementById("phone").value = localStorage.getItem("phone") || "";
}

// save data
function saveData(){
    let name = document.getElementById("name").value;
    let reg = document.getElementById("regNo").value;
    let email = document.getElementById("email").value;
    let phone = document.getElementById("phone").value;

    localStorage.setItem("name", name);
    localStorage.setItem("regNo", reg);
    localStorage.setItem("email", email);
    localStorage.setItem("phone", phone);

    alert("Updated ✅");

    // वापस view mode
    document.getElementById("editMode").style.display = "none";
    document.getElementById("viewMode").style.display = "block";

    loadProfile(); // refresh data
}