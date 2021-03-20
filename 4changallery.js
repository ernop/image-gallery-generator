$(function() {
	//the human uploaded images.
	var originalImageNames = [];
	
	//imageUrls
	var images = [];
	
	//for storing which ones are webms
	var imageTypes = [];
	
	//current position in playback.
	var imagePosition = 0;
	
	// settings, loaded from local storage
	var imageCountShown = true;
	var imageFilenameShown = true;
	var imageResolutionShown = false;
	var imageMegapixelsShown = false;
	
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
		console.log("getting filetype for"+path+"=="+res);
	}

	function setup(){
		loadStoredSettings();
		
		$(".fileText").each(function(index) {
			var path = $(this).find("a").attr("href").substring(2);
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
		
		//appears not to work right now.
		setupFirstPreloads();

		$('.navLinks').prepend('[<a href="#" class="galleryOn">Gallery Mode</a>] ');
		$('body').wrapInner("<div class='oldBody'></div>");
		
		//gallery load
		$(".galleryOn").click(function() {
			//new document structure body > oldBody => body > (galleryViewWrapper)(oldBody)
			$(".oldBody").hide();
			$("body").css("padding","0");
			if ($("#galleryViewWrapper").length==0){
				$('body').prepend('<div id="galleryViewWrapper"><div id="labelZone" style="color:white;float:left;position:absolute;z-index:202;padding:5px;"></div><div id="blackBackground" style="z-index:100;position:absolute;display:flex;align-items:center;justify-content: left:0;top:0;display:none;width:100%;height:100%;background-color:black;position:absolute;z-index:200;"><img id="targetImg" style="max-width:99%;max-height:99%;display:none;" src=""/><video controls="true" autoplay="" id="targetVideo" style="max-width:99%;max-height:99%;display:none;" src=""/><img id="targetImg_preload1" style="display:none;" /><img id="targetImg_preload2" style="display:none;"/><img id="targetImg_preload3" style="display:none;"/><img id="targetImg_preload4" style="display:none;"/></div></div>');
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
	
	//for now just put them inline; later use the same logic as the main part.
	function setupFirstPreloads(){
		var ii = 0;
		while (ii<3 && images.length>ii-1){
			var thing = $('<img style="display:none;" />');
			thing.attr("src",images[ii]);
			$('body').prepend(thing);
			ii++;
		}
	}
	
	function backToNormal(){
		$("#blackBackground").hide();
		$(document).unbind('keydown');
		$("#galleryViewWrapper").hide();
		$('.oldBody').show();
	}

	function redrawLabel(){
		$("#labelZone").html("");
		imageCountLabel();
		imageNameLabel();
		imageResolutionLabel();
		imageMegapixelLabel();
		helpLabel();
	}
	
	function imageCountLabel(){
		if (imageCountShown){
			$("#labelZone").append('<div id="imageCount">' + imagePosition + "/" + (images.length-1)+ '</div>');
		}
		else{
			$("#imageCount").remove();
		}
	}
	
	function imageNameLabel(){
		if (imageFilenameShown){
			$("#labelZone").append("<div id=imageFilename>"+originalImageNames[imagePosition]+"</div>");
		}else{
			$("#imageFilename").remove();
		}
	}

	function imageResolutionLabel(){
		if (imageResolutionShown){
			var h = $("#targetImg")[0].naturalHeight;
			var w = $("#targetImg")[0].naturalWidth;
			var size = h+"x"+w;
			$("#labelZone").append("<div id=imageResolution>"+size+"</div>");
		}else{
			$("#imageResolution").remove();
		}
	}
	
	function imageMegapixelLabel(){
		if (imageMegapixelsShown){
			var h = $("#targetImg")[0].naturalHeight;
			var w = $("#targetImg")[0].naturalWidth;
			var mp = (h * w / 1000 / 1000).toFixed(1) + "m"
			$("#labelZone").append("<div id=imageMegapixels>"+mp+"</div>");
		}else{
			$("#imageMegapixels").remove();
		}
	}
	
	function helpLabel(){
		if (helpShown){
			$("#labelZone").append("<div id=4chanGalleryHelp><ul><li>? for help<li>arrows to nav<li>page up down/home/end to nav fast<li>c to toggle count<li>n for show name<li>r to toggle image resolution<li>m to toggle megapixel<li style='color:red;'>These are also configurable permanently in options</div>");
		}
		else{
			$("#4chanGalleryHelp").remove();
		}
	}
	
	function reDraw() {
		imagePosition=Math.max(0, imagePosition);
		imagePosition=Math.min(imagePosition, images.length-1);
		var thisImageType = imageTypes[imagePosition];
		console.log(thisImageType);
		if (thisImageType=="video"){ //webms
			$("#targetImg").hide();
			$("#targetVideo").show();
			document.getElementById("targetVideo").src = "//"+images[imagePosition];
		}
		else{ //normal img tag can display these
			$("#targetVideo").hide();
			$("#targetImg").show();
			
			document.getElementById("targetImg").src = "//"+images[imagePosition];
			redrawLabel();
			$("#labelZone").append("<span class='dots'> ...</span>");
			document.getElementById("targetImg_preload1").src = "http://"+images[imagePosition+1];
			document.getElementById("targetImg_preload2").src = "http://"+images[imagePosition+2];
			document.getElementById("targetImg_preload3").src = "http://"+images[imagePosition+3];
			document.getElementById("targetImg_preload4").src = "http://"+images[imagePosition+4];
			//annoyance: if preloading is done, then transition is instant.
			//but if it's not done, then keyboard actions have no visible result until image is loaded.
			$("#targetImg").one("load",function(){
				$(".dots").remove();
			});
		}
	}
	
	function setKeyboardShortcuts(){
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
				case 191: // ? or /
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
