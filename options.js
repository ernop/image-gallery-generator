function saveOptions(e) {
    e.preventDefault();

    //TODO: where do defaults come from actually? on first use.

    var data = {
      showCount: document.querySelector("#showCount").checked,
      showFilename: document.querySelector("#showFilename").checked,
      showResolution: document.querySelector("#showResolution").checked,
      showMegapixels: document.querySelector("#showMegapixels").checked,
      preloadLabelShown: document.querySelector("#preloadLabelShown").checked,
      anyImagePreloadedLabelShown: document.querySelector("#anyImagePreloadedLabelShown").checked
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
        document.querySelector("#preloadLabelShown").checked = el.data.preloadLabelShown;
        document.querySelector("#anyImagePreloadedLabelShown").checked = el.data.anyImagePreloadedLabelShown;
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
