(function() {

  const globalState={
    'helpShown':false,
    'imageUrls':[],
    'imageTypes':[],

    // Image list
    'originalImageNames':[],
    'MAX_TOKENS':1600,

    // Current position in playback
    'displayedImageIndex':0,
    'redrawCount':0,
    'relatedCount':0,
    preloadCount:0,
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
            <div id="labelZone" style="color:white;float:left;position:absolute;z-index:202;padding:5px;"></div>
            <div id="blackBackground" style="z-index:100;position:absolute;display:flex;align-items:center;justify-content: left:0;top:0;display:none;width:100%;height:100%;background-color:black;position:absolute;z-index:200;">
              <img id="targetImg" style="max-width:99%;max-height:99%;display:none;" src="" />
              <video controls="true" autoplay="" id="targetVideo" style="max-width:99%;max-height:99%;display:none;" src=""></video>
              <div id="output"></div>
            </div>
          </div>
        `);
      }
      $("#galleryViewWrapper").show();
      $("#blackBackground").show();

      //these get nuked somehow
      //~ $("#blackBackground").css("justify-content","center");
      //~ $("#blackBackground").css("align-content","center");
      //~ $("#blackBackground").css("display","flex");
      $("#output").css("background","white");
      $("#output").css("color","grey");
      redraw();
      setKeyboardShortcuts();
    });

    $("#targetImg").click(function(e) {
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
    $('body').prepend('<img id="targetImg_preload0" style="display:none;" /><img id="targetImg_preload1" style="display:none;" /><img id="targetImg_preload2" style="display:none;"/><img id="targetImg_preload3" style="display:none;"/><img id="targetImg_preload4" style="display:none;"/><img id="targetImg_preload5" style="display:none;"/>');
  }

  // Back to normal
  function backToNormal() {
    globalState.galleryOn = false;
    $("#blackBackground").hide();
    $(document).unbind('keydown');
    $(document).unbind('wheel');
    $("#galleryViewWrapper").hide();
    $('.oldBody').show();
    document.getElementById("targetVideo").pause();
  }

  function setPreloads(){
    var ii = 0;
    while (ii< 5){
      var candidateIndex = globalState.displayedImageIndex+ii;
      var theUrl = globalState.imageUrls[candidateIndex];
      if (util.isNullOrEmpty(theUrl)){
        break;
      }
      var preloaderElement=document.getElementById(`targetImg_preload${ii}`);
      if (util.isNullOrEmpty(preloaderElement)){
        displayInternalError(`failed to load ${ii}th preloader`);
        break;
      }

      preloaderElement.src=theUrl;
      ii+=1;
    }

    //check the preloaded image loading status and optionally display labels
    //TODO with settings off this is not actually useful but very cheap anyway.
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
      document.getElementById("targetVideo").src = imageUrls[globalState.displayedImageIndex];
      redrawLabels();
    }
    else{ //normal img tag can display these
      $("#targetImg").show();
      $("#targetVideo").hide();

      document.getElementById("targetImg").src = globalState.imageUrls[globalState.displayedImageIndex];

      setPreloads();

      //annoyance: if preloading is done, then navigation to next image is instant, but if not ready the old image hangs around for a while which is very jarring and bad.
      //but if it's not done, then keyboard actions have no visible result until image is loaded.
      redrawLabels();
    }
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
      return `<div id="${id}">${content(globalState)}</div>`
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
        break;
      }
    }
  };

  function setKeyboardShortcuts() {
    $(document).keydown(handleShortcut);
    document.addEventListener('wheel', function(e) {
      // Handle mouse wheel navigation
      if (e.deltaY < 0) {
        globalState.displayedImageIndex -= 1;
      } else {
        globalState.displayedImageIndex += 1;
      }
      redraw();
      e.preventDefault();
    });
  }

  // Initialize
  setup();
})();
