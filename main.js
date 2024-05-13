(function() {

  const globalState={
    helpShown:false,
    imageUrls:[],
    imageTypes:[],

    // Image list
    originalImageNames:[],
    MAX_TOKENS:1600, //not used yet, for AI stuff.

    // Current position in playback
    displayedImageIndex:0,
    redrawCount:0,
    relatedCount:0,
    preloadCount:0,
    maxPreloadCount:7, //preload N images or videos.
    galleryOn:false,
  }

  async function setup() {
    // Load stored settings
    await settingsModule.loadSettings();
    readStuffFromPage();
    setPreloads();
    $(".galleryOn").click(function() {
      globalState.galleryOn=true;
      //new document structure body > oldBody => body > (galleryViewWrapper)(oldBody)
      $(".oldBody").hide();
      $("body").css("padding","0");
      if ($("#galleryViewWrapper").length==0){
        $('body').prepend(
        `
          <div id="galleryViewWrapper">
            <div id="labelZone"></div>
            <div id="blackBackground">
              <img id="targetImg" src="" />
              <video controls="true" autoplay="" id="targetVideo" src=""></video>
              <div id="output"></div>
            </div>
          </div>
        `);
      }
      $("#galleryViewWrapper").show();
      $("#blackBackground").show();

      //these get nuked somehow
      $("#blackBackground").css("justify-content","center");
      $("#blackBackground").css("align-content","center");
      $("#blackBackground").css("display","flex");
      $("#output").css("background","white");
      $("#output").css("color","grey");
      redraw();
      setKeyboardShortcuts();
    });

    $("#targetImg").click(function(e) {
        // should only trigger on direct background clicks not image clicks.
        e.stopPropagation();
    });
    $("#targetVideo").click(function(e) {
        // should only trigger on direct background clicks not image clicks.
        e.stopPropagation();
    });

    //get out of gallery mode by clicking outside an image.
    $("#blackBackground").click(function(e) {
        backToNormal();
    });

    //redraw when resizing the entire browser window.
    $(window).on('resize', function(){
        redraw();
    });
  }

  function readStuffFromPage(){
    // Initialize image list
    $('.fileText').each(function(index) {
      let path = $(this).find('a').attr('href');
      globalState.imageUrls.push(path);
      globalState.imageTypes[index] = util.getFileType(path);

      // Find image name from the original upload
      let originalImageName = $(this).find('a').attr('title');
      if (originalImageName === undefined) {
        originalImageName = $(this).find('a')[0].innerHTML;
      }
      globalState.originalImageNames.push(originalImageName);
    });

    // Create button for gallery mode
    $('.navLinks').prepend('[<a href="#" class="galleryOn">Gallery Mode</a>] ');
    $('body').wrapInner('<div class="oldBody"></div>');

    //set these before galleryMode is enabled so that the initial experience is nice. We add these undisplayed images and rotate their src variable so that the browser will preload them so that when you navigate, it will work.
    for (let i = 0; i < globalState.maxPreloadCount; i++) {
      $('body').prepend(`<img id="targetImg_preload${i}" style="display:none;">`);
    }
    for (let i = 0; i < globalState.maxPreloadCount; i++) {
      $('body').prepend(`<video id="targetVideo_preload${i}" style="display:none;" src=""></video>`);
    }
  }

  // Back to normal
  function backToNormal() {
    globalState.galleryOn = false;

    // Hide gallery-specific elements
    $("#galleryViewWrapper").hide();
    $("#blackBackground").hide();
    $('.oldBody').show();

    // Pause video if playing
    document.getElementById("targetVideo").pause();

    // Unbind all event handlers set during gallery mode
    $(document).off('keydown'); // Unbind keyboard shortcuts
    $(window).off('resize'); // Unbind resize events
    $("#blackBackground").off('click'); // Unbind click outside image
    $("#targetImg").off('click'); // Unbind image click

    // Reset state variables
    globalState.imageUrls = [];
    globalState.imageTypes = [];
    globalState.originalImageNames = [];
    globalState.displayedImageIndex = 0;
    globalState.redrawCount = 0;
    globalState.relatedCount = 0;
    globalState.preloadCount = 0;

    $("#galleryViewWrapper").remove();
  }

  //this should do preloading of videos, too.
  //this is getting called before the images are loaded into the page?
  function setPreloads(){
    var ii = 0;
    while (ii< 7){
      var candidateIndex = globalState.displayedImageIndex+ii;
      var thisImageType = globalState.imageTypes[candidateIndex];
      if (util.isNullOrEmpty(thisImageType)){
        break;
      }
      var theUrl = globalState.imageUrls[candidateIndex];
      if (util.isNullOrEmpty(theUrl)){
        break;
      }
      if (thisImageType=="video"){ //it's a video
        var preloaderElement=document.getElementById(`targetVideo_preload${ii}`);
        preloaderElement.src=theUrl;
      }else{ //it's an image
        var preloaderElement=document.getElementById(`targetImg_preload${ii}`);
        preloaderElement.src=theUrl;
      }
      //~ console.log("preloaded:",theUrl);
      ii+=1;
    }

    watchAndGo(1, globalState.redrawCount);
  }

	// this is the thing which, using small text, shows the user the actual preload state of upcoming images.
	function watchAndGo(n, rc){
		//trap this into this context and don't do anything if it's different.
		// this is insufficient because of quick forward/back
		var targetId = "#targetImg_preload"+n.toString();
		var target = $(targetId);

		//cancel earlier AJAX calls?
		if (rc != globalState.redrawCount){
      return;
		}
		if (n>5){
		  redrawLabels();
		  return;
		}
		if (util.isImageDone(target)){
      globalState.preloadCount++;
      watchAndGo(n+1, rc)
		} else {
      target.unbind('load');
      target.one('load', function(e){
        if (rc!=globalState.redrawCount){
          return;
        }
        globalState.preloadCount++;
        watchAndGo(n+1, rc);
      });

      //trying to be careful here to prevent flashing
      if (rc!=globalState.redrawCount){
        return;
      }

      redrawLabels();
      }
	}


  //Redraw the main displayed window in the gallery.
  function redraw() {
    if (!globalState.galleryOn){
      return;
    }
    globalState.redrawCount++;

    //I suppose this is okay.
    globalState.preloadCount=0;

    //fix under/overdone
    globalState.displayedImageIndex=Math.max(0, globalState.displayedImageIndex);
    globalState.displayedImageIndex=Math.min(globalState.displayedImageIndex, globalState.imageUrls.length-1);
    var thisImageType = globalState.imageTypes[globalState.displayedImageIndex];
    if (thisImageType=="video"){ //webms
      $("#targetImg").hide();
      $("#targetVideo").show();
      document.getElementById("targetVideo").src = globalState.imageUrls[globalState.displayedImageIndex];
    }
    else{ //normal img tag can display these
      $("#targetImg").show();
      $("#targetVideo").hide();
      document.getElementById("targetImg").src = globalState.imageUrls[globalState.displayedImageIndex];
    }
    setPreloads();

    //annoyance: if preloading is done, then navigation to next image is instant, but if not ready the old image hangs around for a while which is very jarring and bad.
    //but if it's not done, then keyboard actions have no visible result until image is loaded.
    redrawLabels();
  }

  function displayInternalError(t){
    console.log(t);
    $("#output").html(t);
  }

  function redrawLabels() {
    if (!globalState.galleryOn) return;
    const labelHtml = labels.filter(label => label.condition(settingsModule.settings, globalState))
      .map(label => createLabel(label.id, label.content));
    $("#labelZone").html(labelHtml.join(''));
  }

  function createLabel(id, content) {
    var ctext=content(globalState);
    if (ctext){
      return `<div id="${id}" class='outlined-text' data-text='${content(globalState)}'>${content(globalState)}</div>`
    }
    return '';
  }

  const handleShortcut = function(e) {
    const key = e.key;  // Use the human-readable key identifier

    for (const label of labels) {
      if ((Array.isArray(label.shortcut) && label.shortcut.includes(key)) || label.shortcut === key) {
        label.action(settingsModule.settings, globalState);
        redraw();
        redrawLabels();
        e.preventDefault();
        if (globalState.doExit){
          backToNormal();
          globalState.doExit=false;
        }
        break;
      }
    }

  };

  function setKeyboardShortcuts() {
    $(document).keydown(handleShortcut);
    document.addEventListener('wheel', handleMouseWheel);
  }

function handleMouseWheel(e){
  if (e.deltaY < 0) {
    globalState.displayedImageIndex -= 1;
  } else {
    globalState.displayedImageIndex += 1;
  }
  redraw();
}

  // Initialize
  setup();
})();
