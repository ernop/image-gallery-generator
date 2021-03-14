function saveOptions(e) {
  e.preventDefault();

  var data = {
    showCount: document.querySelector("#showCount").checked,
	showFilename: document.querySelector("#showFilename").checked,
	showResolution: document.querySelector("#showResolution").checked,
	showMegapixels: document.querySelector("#showMegapixels").checked
  };
  
  browser.storage.sync.set({data : data});
}

function restoreOptions(e) {
  if (e!=null){
    e.preventDefault();
  }
  
  function onError(error) {
    console.log("Error: ${error}");
	document.querySelector("#output").append(error);
  }
  
  browser.storage.sync.get("data").then(function (el){
	document.querySelector("#showCount").checked = el.data.showCount;
	document.querySelector("#showFilename").checked = el.data.showFilename;
	document.querySelector("#showResolution").checked = el.data.showResolution;
	document.querySelector("#showMegapixels").checked = el.data.showMegapixels;
  });
 }

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
