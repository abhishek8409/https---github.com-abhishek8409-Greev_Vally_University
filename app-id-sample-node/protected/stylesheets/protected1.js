
  window.watsonAssistantChatOptions = {
    integrationID: "5647427a-542e-48ab-991f-2b079b89e87d", // The ID of this integration.
    region: "au-syd", // The region your integration is hosted in.
    serviceInstanceID: "502fcfd6-b9b2-4a44-ae5f-eecf390f4ec4", // The ID of your service instance.
    onLoad: async (instance) => { await instance.render(); }
  };
  setTimeout(function(){
    const t=document.createElement('script');
    t.src="https://web-chat.global.assistant.watson.appdomain.cloud/versions/" + (window.watsonAssistantChatOptions.clientVersion || 'latest') + "/WatsonAssistantChatEntry.js";
    document.head.appendChild(t);
  });

  
// profilesection

function loadUserProfile(){
    let name = localStorage.getItem("name");
    let img = localStorage.getItem("profileImage");

    let span = document.getElementById("userNameSpan");
    let image = document.getElementById("userImg");

    if(img){
        image.src = img;
        image.style.display = "block";
        span.style.display = "none";
    } else {
        span.innerText = name ? name.charAt(0).toUpperCase() : "?";
        span.style.display = "flex";
        image.style.display = "none";
    }
}

document.addEventListener("DOMContentLoaded", function(){

    loadUserProfile();

    document.getElementById("userProfile").addEventListener("click", function(){
        window.location.href = "./profile.html";
    });

});
 