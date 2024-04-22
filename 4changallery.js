(function() {
  let helpShown=false;

  // Image list
  let imageUrls = [];
  let imageTypes = [];
  let originalImageNames = [];

  // Current position in playback
  let displayedImageIndex = 0;

  // Redraw count
  let redrawCount = 0;
  let preloadCount = 0;

  // Gallery mode
  let galleryOn = false;

  // Setup
  function setup() {
    // Load stored settings
    loadSettings();

    // Initialize image list
    $('.fileText').each(function(index) {
      let path = $(this).find('a').attr('href');
      imageUrls.push(path);
      imageTypes[index] = getFileType(path);


      // Find image name from the original upload
      let originalImageName = $(this).find('a').attr('title');
      if (originalImageName === undefined) {
        originalImageName = $(this).find('a')[0].innerHTML;
      }
      originalImageNames.push(originalImageName);
    });

    // Create button for gallery mode
    $('.navLinks').prepend('[<a href="#" class="galleryOn">Gallery Mode</a>] ');
    $('body').wrapInner('<div class="oldBody"></div>');

    //set these before galleryMode is enabled so that the initial experience is nice. We add these undisplayed images and rotate their src variable so that the browser will preload them so that when you navigate, it will work.
    $('body').prepend('<img id="targetImg_preload0" style="display:none;" /><img id="targetImg_preload1" style="display:none;" /><img id="targetImg_preload2" style="display:none;"/><img id="targetImg_preload3" style="display:none;"/><img id="targetImg_preload4" style="display:none;"/><img id="targetImg_preload5" style="display:none;"/>');

    setPreloads();

    $(".galleryOn").click(function() {
        galleryOn=true;
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
                  <div id="output">outPUT</div>
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
        //~ $("output").html("AAAEah");
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


  // Back to normal
  function backToNormal() {
    galleryOn = false;
    $("#blackBackground").hide();
    $(document).unbind('keydown');
    $(document).unbind('wheel');
    $("#galleryViewWrapper").hide();
    $('.oldBody').show();
    document.getElementById("targetVideo").pause();
  }



  function isNullOrEmpty(value){
    return value===undefined || value===null ||  value==='' || Number.isNaN(value);
  }

  // Get file type
  function getFileType(path) {
    return path.match(/\.webm$/i) ? "video" : "image";
  }

  function setPreloads(){
    var ii = 0;
    while (ii< 5){
      var candidateIndex = displayedImageIndex+ii;
      var theUrl = imageUrls[candidateIndex];
      if (isNullOrEmpty(theUrl)){
        //~ alertt(`skipping assignation of value for ith value: ${ candidateIndex }.`);
        break;
      }
      //~ alertt(`setting ${ii}th preloadTargetImage to: ${theUrl}`);
      var preloaderElement=document.getElementById(`targetImg_preload${ii}`);
      if (isNullOrEmpty(preloaderElement)){
        alertt(`failed to load ${ii}th preloader`);
        break;
      }

      preloaderElement.src=theUrl;
      ii+=1;
    }

    //check the preloaded image loading status and optionally display labels
    //TODO with settings off this is not actually useful but very cheap anyway.
    watchAndGo(1, redrawCount);
  }

	// this is the thing which, using small text, shows the user the actual preload state of upcoming images.
	function watchAndGo(n, relatedCount){
		//trap this into this context and don't do anything if it's different.
		// this is insufficient because of quick forward/back
		var targetId = "#targetImg_preload"+n.toString();
		var target = $(targetId);

		//cancel earlier AJAX calls?
		if (relatedCount!=redrawCount){
          return;
		}
		if (n>5){
		  alertt("GT5");
		  redrawLabels();
		  return;
		}
		if (isImageDone(target)){
          preloadCount++;
          watchAndGo(n+1, relatedCount)
		} else {
          target.unbind('load');
          target.one('load', function(e){
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

          redrawLabels();
		}
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
  const settings = {
    imageCountShown: true,
    imageFilenameShown: true,
    imageResolutionShown: false,
    imageMegapixelsShown: false,
    preloadLabelShown: true,
    anyImagePreloadedLabelShown: true,
    apiKey:""
  };


  function loadSettings() {
    browser.storage.sync.get("settings").then((result) => {
      if (result.settings) {
        Object.assign(settings, result.settings);
      }
    });
  }

  function saveSettings() {
    browser.storage.sync.set({ settings: settings });
    alertt("Saved. settings.");
    console.log(settings);
  }


  function alertt(t){
    console.log(`OutputAlert: ${t}`);
    console.log(t);
    $("#output").html(t);
  }

  function redrawLabels() {
    if (!galleryOn) return;
    const labelHtml = labels.filter(label => label.condition()).map(label => createLabel(label.id, label.content));
    $("#labelZone").html(labelHtml.join(''));
  }

  function createLabel(id, content) {
    return `<div id="${id}">${content()}</div>`;
  }

  const labels = [
    {
      id: "imageCount",
      condition: () => settings.imageCountShown,
      content: () => `${displayedImageIndex} / ${imageUrls.length - 1}`
    },
    {
      id: "imageFilename",
      condition: () =>settings.imageFilenameShown,
      content: () => originalImageNames[displayedImageIndex]
    },
    {
      id: "imageResolution",
      condition: () => settings.imageResolutionShown,
      content: () => {
        const img = $("#targetImg")[0];
        return `${img.naturalWidth}x${img.naturalHeight}`;
      }
    },
    {
      id: "imageMegapixels",
      condition: () => settings.imageMegapixelsShown,
      content: () => {
        const img = $("#targetImg")[0];
        return `${(img.naturalWidth * img.naturalHeight / 1000 / 1000).toFixed(1)}m`;
      }
    },
    {
      id: "preloadLabel",
      condition: () => settings.preloadLabelShown,
      content: () => preloadCount
    },
    {
      id: "anyImagePreloadedLabel",
      condition: () => settings.anyImagePreloadedLabelShown,
      content: () => preloadCount > 0? "." : ""
    },
    {
      id: "ImageGalleryHelp",
      condition: () => helpShown,
      content: () => {
        const helpText = [
          "? - for help",
          "arrows to nav",
          "page up down/home/end - to nav fast",
          "c - to toggle count",
          "n - for show name",
          "r - to toggle image resolution",
          "m - to toggle megapixel",
          "p - to toggle preloadCount display",
          "a - to toggle display of a dot when the next image is preloaded",
          "x - to hide all the UI",
          "s - to test the new AI image generation functions. <<<==== HYPE",
          "These are also configurable permanently in options"
        ];
        return `<div id="${this.id}"><ul style="background: grey;">${helpText.map(li => `<li>${li}</li>`).join("")}</ul></div>`;
      }
    }
  ];

  //if needed, advance to the next image (after some command which changed the alleged "current index" for example.
  function redraw() {
    if (!galleryOn){
      return;
    }
    redrawCount++;

    //I suppose this is okay.
    preloadCount=0;

    //fix under/overdone
    displayedImageIndex=Math.max(0, displayedImageIndex);
    displayedImageIndex=Math.min(displayedImageIndex, imageUrls.length-1);
    var thisImageType = imageTypes[displayedImageIndex];
    if (thisImageType=="video"){ //webms
      $("#targetImg").hide();
      $("#targetVideo").show();
      document.getElementById("targetVideo").src = imageUrls[displayedImageIndex];
    }
    else{ //normal img tag can display these
      $("#targetImg").show();
      $("#targetVideo").hide();

      //~ alertt(`setting position to: ${imageUrls[displayedImageIndex]}`);
      document.getElementById("targetImg").src = imageUrls[displayedImageIndex];

      setPreloads();

      //annoyance: if preloading is done, then navigation to next image is instant, but if not ready the old image hangs around for a while which is very jarring and bad.
      //but if it's not done, then keyboard actions have no visible result until image is loaded.
      redrawLabels();
    }
  }

  const keyboardShortcuts = [
  {
    keycodes: [27], // esc
    action: () => backToNormal(),
    type: 'exit',
  },
  {
    keycodes: [33], // pgup
    action: () => displayedImageIndex -= 5,
    type: 'image',
  },
  {
    keycodes: [34], // pgdown
    action: () => displayedImageIndex += 5,
    type: 'image',
  },
  {
    keycodes: [35], // end
    action: () => displayedImageIndex = imageUrls.length - 1,
    type: 'image',
  },
  {
    keycodes: [36], // home
    action: () => displayedImageIndex = 0,
    type: 'image',
  },
  {
    keycodes: [37, 38], // left, up
    action: () => displayedImageIndex -= 1,
    type: 'image',
  },
  {
    keycodes: [39, 40], // right, down
    action: () => displayedImageIndex += 1,
    type: 'image',
  },
  {
    keycodes: [65], // a
    action: () => settings.anyImagePreloadedLabelShown =!settings.anyImagePreloadedLabelShown,
    type: 'labels',
  },
  {
    keycodes: [67], // c
    action: () => settings.imageCountShown =!settings.imageCountShown,
    type: 'labels',
  },
  {
    keycodes: [77], // m
    action: () => settings.imageMegapixelsShown =!settings.imageMegapixelsShown,
    type: 'labels',
  },
  {
    keycodes: [78], // n
    action: () => settings.imageFilenameShown =!settings.imageFilenameShown,
    type: 'labels',
  },
  {
    keycodes: [80], // p
    action: () => settings.preloadLabelShown =!settings.preloadLabelShown,
    type: 'labels',
  },
  {
    keycodes: [82], // r
    action: () => settings.imageResolutionShown =!settings.imageResolutionShown,
    type: 'labels',
  },
  {
    keycodes: [83], // s
    action: () => doAi(),
    type: 'ai',
  },
  {
    keycodes: [88], // x
    action: () => {
      settings.preloadLabelShown = false;
      settings.anyImagePreloadedLabelShown = false;
      settings.imageMegapixelsShown = false;
      settings.imageResolutionShown = false;
      settings.imageFilenameShown = false;
      settings.imageCountShown = false;
      helpShown = false;
    },
    type: 'labels',
  },
  {
    keycodes: [191], // / or?
    action: () => helpShown =!helpShown,
    type: 'labels',
  },
];

  const handleShortcut = function(e) {
    const keyCode = e.which;
    for (const shortcut of keyboardShortcuts) {
      if (shortcut.keycodes.includes(keyCode)) {
        shortcut.action();
        switch (shortcut.type) {
          case 'image':
            redraw();
            break;
          case 'labels':
            redrawLabels();
            saveSettings();
            break;
          case 'ai':
            // AI lookup code here
            break;
          case 'exit':
            // exit code here
            break;
        }
        e.preventDefault();
      }
    }
  };

  function formatIsValid(apiKey) {
    const apiKeyRegex = /^sk-[a-zA-Z0-9]{48}$/;
    return apiKeyRegex.test(apiKey);
  }


  // Send image URL to API endpoint for description
  function doAi(){
    alertt("AI");

    if (!formatIsValid(settings.apiKey)){
      alert("apikey format is invalid.");
    }
    let apiUrl = "https://api.openai.com/v1/chat/completions";
    let imageUrl = imageUrls[displayedImageIndex];
    imageUrl="http:"+imageUrl;

    // API request options
    // apiKey is set above, privately.

    let apiOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      }
    };

    let requestBody =
      {"model": "gpt-4-turbo",

        "messages": [
          {
            "role": "system",
            "content":
              [
                {
                  "type": "text",
                  "text": "You are a professional artist, photographer, and award-winning poet and novelist.  Your goal is to describe what is in this image using beautiful, creative, precise language. Include details about the environment, subjects, people, style, format, specific age and origin of any people. If there is text in the image, transcribe it in quotes. You see exquisite detail and overall composition, color, style, layout choices with a master's eye and describe them intimately and in great detail, while still easily giving an overall image summary precisely."
                }
              ]
          },
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": "Describe the image."
              },
              {
                "type": "image_url",
                "image_url": {
                  "url":  imageUrl
                }
              }
            ]
          }
        ],
        "max_tokens": 1600
      };
    apiOptions.body=JSON.stringify(requestBody);
    fetch(apiUrl, apiOptions)
      .then(response => response.json())
      .then(data => {
        alertt(data);
        let description = data.choices[0].text;
        alertt(description);
        // Display description
        // ...
      })
      .catch(error => {
        console.error("eError", error);
      })
  }


  function setKeyboardShortcuts(){
    $(document).keydown(handleShortcut);
    document.addEventListener('wheel', function(e){
      if (e.deltaY < 0) {
        displayedImageIndex -= 1;
      } else {
        displayedImageIndex += 1;
      }
      redraw();
      e.preventDefault();
    });
  }

  // Initialize
  setup();
})();
