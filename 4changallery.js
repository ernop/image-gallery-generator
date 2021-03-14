$(function() {
	var imageCount = 0;
	var imagePosition = 0;
	var images = [];
	var originalImageNames = [];
	
	//called at page load
	function setup(){
		$(".fileText").each(function(index) {
			var path = $(this).find("a").attr("href").substring(2);
			images.push(path);
			var originalImageName = $(this).find("a").attr("title");
			
			//fallback to a.text
			if (originalImageName==undefined){
				originalImageName=$(this).find("a")[0].innerHTML;
			}
			originalImageNames.push(originalImageName);
		});
		
		imageCount = images.length;

		$('.navLinks').prepend('[<a href="#" class="galleryOn">Gallery Mode</a>] ');
		$('body').wrapInner("<div class='oldBody'></div>");
		
		//gallery load
		
		$(".galleryOn").click(function() {
			//new document structure body > oldBody => body > (galleryViewWrapper)(oldBody)
			$(".oldBody").hide();
			$("body").css("padding","0");
			if ($("#galleryViewWrapper").length==0){
				$('body').prepend('<div id="galleryViewWrapper"><div id="galleryProgress" style="color:white;float:left;position:absolute;z-index:202;padding:5px;"></div><div id="blackBackground" style="z-index:100;position:absolute;display:flex;align-items:center;justify-content: left:0;top:0;display:none;width:100%;height:100%;background-color:black;position:absolute;z-index:200;"><img id="targetImg" style="max-width:99%;max-height:99%;" src=""/><img id="targetImg_preload1" style="display:none;" /><img id="targetImg_preload2" style="display:none;"/><img id="targetImg_preload3" style="display:none;"/><img id="targetImg_preload4" style="display:none;"/></div></div>');
				
				$("#galleryProgress").hover(toggleShowImageName, toggleShowImageName);
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
	
	function backToNormal(){
		$("#blackBackground").hide();
		$(document).unbind('keydown');
		$("#galleryViewWrapper").hide();
		$('.oldBody').show();
	}
	
	var imageNameShown = true;
	var helpShown = false;
	var showCount = true;
	var imageDetailsShown = true;
	
	function toggleShowCount(){
		showCount=!showCount;
		handleShowingLabels();
	}
	
	
	
	function handleShowingLabels(){
		if (showCount){
			galleryText = '<div class="galleryProgress">' + imagePosition + "/" + (imageCount-1)+ '</div>';
			$("#galleryProgress").html(galleryText);
		}
		else{
			$("#galleryProgress").html("");
			$(".galleryProgress").remove();
		}

		handleShowImageName();
		handleShowImageDetails();
	}
	
	function toggleShowImageName(){
		imageNameShown=!imageNameShown;
		handleShowImageName();
	}
	
	function handleShowImageName(){
		$("#imageFilename").remove();
		if (imageNameShown){
			$("#galleryProgress").append("<div id=imageFilename>"+originalImageNames[imagePosition]+"</div>");
		}else{
			$("#imageFilename").remove();
		}
	}
	
	function toggleShowImageDetails(){
		imageDetailsShown=!imageDetailsShown;
		handleShowImageDetails();
	}
	
	function handleShowImageDetails(){
		$("#imageDetails").remove();
		if (imageDetailsShown){
			var h = $("#targetImg")[0].naturalHeight;
			var w = $("#targetImg")[0].naturalWidth;
			var size = h+"x"+w;
			var mp = (h * w / 1000 / 1000).toFixed(1) + "m"
			$("#galleryProgress").append("<div id=imageDetails>"+size+"<br>"+mp+"</div>");
		}else{
			$("#imageDetails").remove();
		}
	}
	
	function toggleShowHelp(){
		if (helpShown){
			$("#4chanGalleryHelp").remove();
		}
		else{
			$("#galleryProgress").append("<div id=4chanGalleryHelp><ul><li>? for help<li>n for show name<li>arrows to nav<li>page up down/home/end to nav fast<li>c to toggle count display<li>n to toggle name display<li>d to toggle image resolution details</div>");
		}
		helpShown=!helpShown;
	}
	
	function reDraw() {
		imagePosition=Math.max(0, imagePosition);
		imagePosition=Math.min(imagePosition, imageCount-1);
		document.getElementById("targetImg").src = "http://"+images[imagePosition];
		handleShowingLabels();
		$("#galleryProgress").append("<span class='dots'> ...</span>");
		//preloads.
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
					imagePosition=imageCount-1;
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
				case 78: // n
					skipRedraw=true;
					toggleShowImageName();
					break;
				case 67: // c
					skipRedraw=true;
					toggleShowCount();
					break;
				case 191: // ? or /
					skipRedraw=true;
					toggleShowHelp();
					break;
				case 68: // d
					skipRedraw=true;
					toggleShowImageDetails();
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
