$(function() {
	//the human uploaded images.
	var originalImageNames = [];

	//imageUrls
	var images = [];

	//for storing which ones are webms
	var imageTypes = [];

	//current position in playback.
	var imagePosition = 0;

	//track the redraw count for this entire session; when it changes, completely invalidate all pending preload or other trackers.
	var redrawCount = 0;

	var galleryOn=false;

	//how many images are preloaded.
	var preloadCount=0;

	//these are the defaults? but what use.

	// settings, loaded from local storage
	var imageCountShown = true;
	var imageFilenameShown = true;
	var imageResolutionShown = false;
	var imageMegapixelsShown = false;

	//show the count of preloaded images
	var preloadLabelShown = true;
	//show a dot if/when next image is loaded.
	var anyImagePreloadedLabelShown = true;

	var helpShown = false;

	function loadStoredSettings(){
		function onError(error) {
		  console.log(`Error: ${error}`);
		}

		//save settings
		function apply(item) {
		  imageCountShown = item.data.showCount;
		  imageFilenameShown = item.data.showFilename;
		  imageResolutionShown = item.data.showResolution;
		  imageMegapixelsShown = item.data.showMegapixels;
		  preloadLabelShown=item.data.preloadLabelShown;
		  anyImagePreloadedLabelShown=item.data.anyImagePreloadedLabelShown;
		}

		let getting = browser.storage.sync.get("data");
		getting.then(apply, onError);
	}

	function getFileType(path){
		var res = "";
		if (path.substr(path.length - 5) == ".webm"){
			res = "video";
		}
		else{
			res = "image";
		}
		return res;
	}

	function setup(){
		loadStoredSettings();

		$(".fileText").each(function(index) {
			var path= $(this).find("a").attr("href");
			images.push(path);
			imageTypes[index] = getFileType(path);

			//find image name from the original upload - sometimes contains useful/interesting information
			var originalImageName = $(this).find("a").attr("title");

			//fallback to a.text
			if (originalImageName==undefined){
				originalImageName=$(this).find("a")[0].innerHTML;
			}
			originalImageNames.push(originalImageName);
		});

		$('.navLinks').prepend('[<a href="#" class="galleryOn">Gallery Mode</a>] ');
		$('body').wrapInner("<div class='oldBody'></div>");

		//set these before galleryMode is enabled so that the initial experience is nice.
		$('body').prepend('<img id="targetImg_preload0" style="display:none;" /><img id="targetImg_preload1" style="display:none;" /><img id="targetImg_preload2" style="display:none;"/><img id="targetImg_preload3" style="display:none;"/><img id="targetImg_preload4" style="display:none;"/><img id="targetImg_preload5" style="display:none;"/>');

		setPreloads(true);

		//gallery load
		$(".galleryOn").click(function() {
			galleryOn=true;
			//new document structure body > oldBody => body > (galleryViewWrapper)(oldBody)
			$(".oldBody").hide();
			$("body").css("padding","0");
			if ($("#galleryViewWrapper").length==0){
				$('body').prepend('<div id="galleryViewWrapper"><div id="labelZone" style="color:white;float:left;position:absolute;z-index:202;padding:5px;"></div><div id="blackBackground" style="z-index:100;position:absolute;display:flex;align-items:center;justify-content: left:0;top:0;display:none;width:100%;height:100%;background-color:black;position:absolute;z-index:200;"><img id="targetImg" style="max-width:99%;max-height:99%;display:none;" src="" /><video controls="true" autoplay="" id="targetVideo" style="max-width:99%;max-height:99%;display:none;" src="" /></div></div>');
			}
			$("#galleryViewWrapper").show();
			$("#blackBackground").show();

			//these get nuked somehow
			$("#blackBackground").css("justify-content","center");
			$("#blackBackground").css("align-content","center");
			$("#blackBackground").css("display","flex");
			reDraw();
			setKeyboardShortcuts();
		});

		$("#targetImg").click(function(e) {
			// should only trigger on direct background clicks not image clicks.
			e.stopPropagation();
		});

		$("#blackBackground").click(function(e) {
			backToNormal();
		});

		$(window).on('resize', function(){
			reDraw();
		});

	}

	//TODO why not reuse the same imgTarget_preloadN items?
	function setupFirstPreloads(){
		var ii = 0;
		while (ii<5 && images.length>ii-1){
			var thing = $('<img style="display:none;" name="preload"'+ii+'/>');
			thing.attr("src", images[ii]);

			$('body').prepend(thing);
			ii++;
		}


	}

	function backToNormal(){
		galleryOn=false;
		$("#blackBackground").hide();
		$(document).unbind('keydown');
		$("#galleryViewWrapper").hide();
		$('.oldBody').show();
		document.getElementById("targetVideo").pause();
	}

	//in-place redraw.
	function redrawLabel(){
		if (!galleryOn){
			return;
		}
		var res = "";
		res+=imageCountLabel();
		res+=imageNameLabel();
		res+=imageResolutionLabel();
		res+=imageMegapixelLabel();
		res+=preloadLabel();
		res+=anyImagePreloadedLabel();
		res+=helpLabel();
		$("#labelZone").html(res);
	}

	function imageCountLabel(){
		if (imageCountShown){
			return '<div id="imageCount">' + imagePosition + "/" + (images.length-1)+ '</div>';
		}
		else{
			return "";
		}
	}

	function imageNameLabel(){
		if (imageFilenameShown){
			return "<div id=imageFilename>"+originalImageNames[imagePosition]+"</div>";
		}else{
			return "";
		}
	}

	function imageResolutionLabel(){
		if (imageResolutionShown){
			var h = $("#targetImg")[0].naturalHeight;
			var w = $("#targetImg")[0].naturalWidth;
			var size = w+"x"+h;
			return "<div id=imageResolution>"+size+"</div>";
		}else{
			return "";
		}
	}

	function imageMegapixelLabel(){
		if (imageMegapixelsShown){
			var h = $("#targetImg")[0].naturalHeight;
			var w = $("#targetImg")[0].naturalWidth;
			var mp = (w * h / 1000 / 1000).toFixed(1) + "m"
			return "<div id=imageMegapixels>"+mp+"</div>";
		}else{
			return "";
		}
	}

	function preloadLabel(){
		if (preloadLabelShown){
			return "<div id=preloadLabel>"+preloadCount+"</div>";
		}else{
			return "";
		}
	}

	function anyImagePreloadedLabel(){
		if (anyImagePreloadedLabelShown){
			var text = "";
			if (preloadCount>0){
				text=".";
			}else{

			}
			return "<div id=anyImagePreloadedLabelShown>"+text+"</div>";
		}else{
			return "";
		}
	}

	function helpLabel(){
		if (helpShown){
			return "<div id=4chanGalleryHelp><ul><li>? for help<li>arrows to nav<li>page up down/home/end to nav fast<li>c to toggle count<li>n for show name<li>r to toggle image resolution<li>m to toggle megapixel<li>p to toggle preloadCount display<li>a to toggle display of a dot when the next image is preloaded<li style='color:red;'>These are also configurable permanently in options</div>";
		}
		else{
			return "";
		}
	}

	function reDraw() {
		if (!galleryOn){
			return;
		}
		redrawCount++;
		//I suppose this is okay.
		preloadCount=0;

		//fix under/overdone
		imagePosition=Math.max(0, imagePosition);
		imagePosition=Math.min(imagePosition, images.length-1);
		var thisImageType = imageTypes[imagePosition];
		if (thisImageType=="video"){ //webms
			$("#targetImg").hide();
			$("#targetVideo").show();
			document.getElementById("targetVideo").src = images[imagePosition];
		}
		else{ //normal img tag can display these
			$("#targetImg").show();
			$("#targetVideo").hide();

			document.getElementById("targetImg").src = images[imagePosition];

			setPreloads();

			//annoyance: if preloading is done, then navigation to next image is instant, but if not ready the old image hangs around for a while which is very jarring and bad.
			//but if it's not done, then keyboard actions have no visible result until image is loaded.
			redrawLabel();
		}
	}

	//put the first N images into preloading.

	function setPreloads(calledFromOuter){
		if (calledFromOuter){
			//weird use case: this is initially called with imagePosition0 before the user even does anything.
			document.getElementById("targetImg_preload0").src = images[imagePosition];
		}
		document.getElementById("targetImg_preload1").src = images[imagePosition+1];
		document.getElementById("targetImg_preload2").src = images[imagePosition+2];
		document.getElementById("targetImg_preload3").src = images[imagePosition+3];
		document.getElementById("targetImg_preload4").src = images[imagePosition+4];
		document.getElementById("targetImg_preload5").src = images[imagePosition+5];

		//check the preloaded image loading status and optionally display labels
		//TODO with settings off this is not actually useful but very cheap anyway.
		watchAndGo(1, redrawCount);
	}

	//main paths: if item 1 is done, start method on 2
	// if it's not done, update label AND set a watcher on the next target which isn't done yet
	// also: relatedCount is the redrawCount you should be valid for.
	// since we recreate another layer of events on every redraw, rather than worrying about cleaning up old events we just invalidate them when they come back.
	// this shouldn't be too much load.
	function watchAndGo(n, relatedCount){
		//trap this into this context and don't do anything if it's different.
		// this is insufficient because of quick forward/back
		var targetId = "#targetImg_preload"+n.toString();
		var target = $(targetId);
		if (relatedCount!=redrawCount){
			return;
		}
		if (n>5){
			redrawLabel();
			return;
		}
		if (isImageDone(target)){
			preloadCount++;
			watchAndGo(n+1, relatedCount)
		} else {
			target.unbind('load');
			//most (all?) of the invalidations are irrelevant now.
			target.one('load', function(e){
				// say item 4 is not done yet; 3 is done.
				// when item 4 does show up, update preload
				// and start item 5 (which may already be complete or still tbc)
				// ALSO we need to invalidate all these callbacks when the image update is done.
				if (relatedCount!=redrawCount){
					return;
				}
				preloadCount++;
				watchAndGo(n+1, relatedCount);
			});

			//trying to be careful here to prevent flashing
			if (relatedCount!=redrawCount){
				return;
			}

			redrawLabel();
		}
	}

	//for debugging UI issues.
	function sleep(ms) {
	  return new Promise(resolve => setTimeout(resolve, ms));
	}

	function isImageDone(img){
		if (!img[0].complete) {
			return false;
		}
		if (img[0].naturalWidth === 0) {
			return false;
		}
		return true;
	}

	function setKeyboardShortcuts(){

		//mouse wheel nav.
		document.addEventListener('wheel', function(e){
			if (e.deltaY<0){
				imagePosition-=1;
			}else{
				imagePosition+=1;
			}

			reDraw();
			e.preventDefault();

		});

		$(document).keydown(function(e) {
			var skipRedraw = false;
			switch(e.which) {
				case 37: // left
					imagePosition-=1;
					break;
				case 39: // right
					imagePosition+=1;
					break;
				case 35: // end
					imagePosition=images.length-1;
					break;
				case 36: // home
					imagePosition=0;
					break;
				case 34: // pgdown
					imagePosition=imagePosition+5;
					break;
				case 33: // pgup
					imagePosition=imagePosition-5;
					break;
				case 27: // esc
					skipRedraw=true;
					backToNormal();
					break;
				case 67: // c
					skipRedraw=true;
					imageCountShown = !imageCountShown;
					redrawLabel();
					break;
				case 78: // n
					skipRedraw=true;
					imageFilenameShown = !imageFilenameShown;
					redrawLabel();
					break;
				case 82: // r
					skipRedraw=true;
					imageResolutionShown = !imageResolutionShown;
					redrawLabel();
					break;
				case 77: // m
					skipRedraw=true;
					imageMegapixelsShown = !imageMegapixelsShown;
					redrawLabel();
					break;
				case 65: // a
					skipRedraw=true;
					anyImagePreloadedLabelShown = !anyImagePreloadedLabelShown;
					redrawLabel();
					break;
				case 80: // p
					skipRedraw=true;
					preloadLabelShown = !preloadLabelShown;
					redrawLabel();
					break;
				case 191: // / (?) for help
					skipRedraw=true;
					helpShown = !helpShown;
					redrawLabel();
					break;
				default:
					return;
			}
			if (!skipRedraw){
				reDraw();
			}
			e.preventDefault();
		});
	}

	setup();
});
