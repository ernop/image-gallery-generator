(function() {
  const PRELOAD_COUNT = 7;              // Number of images/videos to preload ahead
  const PRELOAD_CHECK_TIMEOUT = 5;      // Max number of preload checks before giving up
  const LABEL_FADE_DELAY = 100;         // Delay before label starts fading (ms)
  const LABEL_FADE_DURATION = 600;      // Duration of label fade animation (ms)
  
  const ERRORS = {
    SETTINGS_LOAD_FAILED: 'Failed to load settings. Using defaults.',
    DOWNLOAD_FAILED: 'Failed to download image. Please try again or right-click to save manually.',
    IMAGE_LOAD_FAILED: 'Failed to load image.',
  };

  const SUCCESS = {
    IMAGE_DOWNLOADED: 'Image downloaded successfully.',
  };

  const INFO = {
    ALREADY_DOWNLOADED: 'This image was already downloaded. Right-click and save as if you want to download it again.',
  };

  const globalState = {
    helpShown: false,
    imageUrls: [],
    imageTypes: [],
    originalImageNames: [],
    displayedImageIndex: 0,
    redrawCount: 0,
    relatedCount: 0,
    preloadCount: 0,
    maxPreloadCount: PRELOAD_COUNT,
    galleryOn: false,
    doSave:false,
    distractionFreeMode: false,
  };

  function updateGalleryState(updates, shouldRedraw = false) {
    Object.assign(globalState, updates);
    if (shouldRedraw && globalState.galleryOn) {
      redraw();
    }
  }

  // Displays error in #output div for 5 seconds, then clears automatically
  function showError(message, error = null) {
    console.error(message, error);
    $("#output").html(`<div style="color: red; padding: 10px; background: white;">${message}</div>`);
    setTimeout(() => {
      $("#output").html('');
    }, 5000);
  }

  function showSuccess(message) {
    console.log(message);
    redrawLabels();
    $(".save-state-label").html(message);
  }

  function showInfo(message) {
    console.info(message);
    redrawLabels();
    $(".save-state-label").html(message);
  }

  async function setup() {
    try {
      await settingsModule.loadSettings();
      readStuffFromPage();
      setPreloads();

      $(".galleryOn").click(enableGalleryMode);

      $("#targetImg").click((e) => e.stopPropagation());
      $("#targetVideo").click((e) => e.stopPropagation());

      $("#blackBackground").click(backToNormal);

      $(window).on('resize', redraw);
    } catch (error) {
      showError(ERRORS.SETTINGS_LOAD_FAILED, error);
    }
  }

  function readStuffFromPage() {
    $('#fastSaveButton').unbind('click');
    globalState.imageUrls = [];
    globalState.imageTypes = [];
    globalState.originalImageNames = [];

    let imageCount = 0;
    let videoCount = 0;

    $('.fileText').each(function(index) {
      const path = $(this).find('a').attr('href');
      globalState.imageUrls.push(path);
      globalState.imageTypes[index] = util.getFileType(path);

      let originalImageName = $(this).find('a').attr('title') || $(this).find('a')[0].innerHTML;
      globalState.originalImageNames.push(originalImageName);

      if (util.getFileType(path) === 'image') {
        imageCount++;
      } else if (util.getFileType(path) === 'video') {
        videoCount++;
      }

    });

    const galleryModeText = `GalleryMode WG4 ${imageCount}/${videoCount}`;
    const galleryLink = $('.navLinks .galleryOn');

    if (galleryLink.length === 0) {
      $('.navLinks').prepend(`[<a href="#" class="galleryOn">${galleryModeText}</a>] `);
    } else {
      galleryLink.text(galleryModeText);
    }

    if ($('body').find('[id^=targetImg_preload]').length === 0) {
      for (let i = 0; i < globalState.maxPreloadCount; i++) {
        $('body').prepend(`<img id="targetImg_preload${i}" style="display:none;">`);
        $('body').prepend(`<video id="targetVideo_preload${i}" style="display:none;" src=""></video>`);
      }
    }

    $('#fastSaveButton').click(fastSaveImage);
  }

  function enableGalleryMode() {
    if (globalState.galleryOn) return;

    updateGalleryState({ galleryOn: true });
    $("body").addClass("gallery-mode");

    if ($("#galleryViewWrapper").length == 0) {
      $('body').append(`
        <div id="galleryViewWrapper">
          <div id="labelZone"></div>
          <div id="blackBackground">
            <img id="targetImg" src="" />
            <video controls="true" autoplay id="targetVideo" src=""></video>
            <div id="output"></div>
          </div>
        </div>
      `);
    } else {
      $("#galleryViewWrapper, #blackBackground").show();
    }

    styleBlackBackground();
    readStuffFromPage();  // Ensure data is loaded
    redraw();
    setKeyboardShortcuts();
  }

  function styleBlackBackground() {
    $("#blackBackground").css({
      "justify-content": "center",
      "align-content": "center",
      "display": "flex",
    });
    $("#output").css({
      "background": "white",
      "color": "grey",
    });
  }

  function backToNormal() {
    updateGalleryState({ galleryOn: false });
    $("#galleryViewWrapper, #blackBackground").hide();
    $("body").removeClass("gallery-mode");
    
    try {
      document.getElementById("targetVideo").pause();
    } catch (error) {
      console.warn('Could not pause video:', error);
    }

    $(document).off('keydown');
    $(window).off('resize');
    $("#blackBackground").off('click');
    $("#targetImg").off('click');

    resetGlobalState();

    // Scroll to the top of the page
    window.scrollTo(0, 0);
}

  function resetGlobalState() {
    updateGalleryState({
      displayedImageIndex: 0,
      redrawCount: 0,
      relatedCount: 0,
      preloadCount: 0
    });
  }

  function setPreloads() {
    for (let i = 0; i < globalState.maxPreloadCount; i++) {
      const candidateIndex = globalState.displayedImageIndex + i;
      const thisImageType = globalState.imageTypes[candidateIndex];
      const theUrl = globalState.imageUrls[candidateIndex];

      if (!thisImageType || !theUrl) break;

      const preloaderElement = thisImageType === "video"
        ? document.getElementById(`targetVideo_preload${i}`)
        : document.getElementById(`targetImg_preload${i}`);

      preloaderElement.src = theUrl;
    }

    watchAndGo(1, globalState.redrawCount);
  }

  function watchAndGo(n, rc) {
    if (rc !== globalState.redrawCount || n > PRELOAD_CHECK_TIMEOUT) {
      if (n > PRELOAD_CHECK_TIMEOUT) {
        redrawLabels();
      }
      return;
    }

    const target = $(`#targetImg_preload${n}`);
    if (util.isImageDone(target)) {
      updateGalleryState({ preloadCount: globalState.preloadCount + 1 });
      watchAndGo(n + 1, rc);
    } else {
      target.off('load').one('load', () => {
        if (rc === globalState.redrawCount) {
          updateGalleryState({ preloadCount: globalState.preloadCount + 1 });
          watchAndGo(n + 1, rc);
        }
      });
    }
    redrawLabels();
  }

  function redraw() {
    if (!globalState.galleryOn) return;

    updateGalleryState({
      redrawCount: globalState.redrawCount + 1,
      preloadCount: 0,
      displayedImageIndex: Math.min(Math.max(0, globalState.displayedImageIndex), globalState.imageUrls.length - 1)
    });

    const thisImageType = globalState.imageTypes[globalState.displayedImageIndex];
    const targetImg = $("#targetImg");
    const targetVideo = $("#targetVideo");

    try {
      if (thisImageType === "video") {
        targetImg.hide();
        targetVideo.show().attr("src", globalState.imageUrls[globalState.displayedImageIndex]);
      } else {
        targetImg.show().attr("src", globalState.imageUrls[globalState.displayedImageIndex]);
        targetVideo.hide();
      }
    } catch (error) {
      showError(ERRORS.IMAGE_LOAD_FAILED, error);
    }

    setPreloads();
    redrawLabels();
  }

  function redrawLabels() {
    if (!globalState.galleryOn) return;
    $(document).find(".label").remove();
    const labelHtml = labels.filter(label => label.condition(settingsModule.settings, globalState))
      .map(label => createLabel(label.id, label.content, label.temporary))
      .join('');

    const helpButton = '<div id="helpButton" class="label outlined-text" style="cursor: pointer;">?</div>';
    
    $("#labelZone").html(labelHtml + helpButton);
    
    $("#helpButton").click(function() {
      updateGalleryState({ helpShown: !globalState.helpShown });
      redraw();
    });
    
    $(".fadeout-label").each(function() {
      const $label = $(this);
      $label.removeClass("fadeout-label");
      $label.delay(LABEL_FADE_DELAY).fadeOut(LABEL_FADE_DURATION, function() {
        $label.remove();
      });
    });
  }

  function createLabel(id, content, temporary) {
    if (temporary){
      return `<div id="${id}" class='outlined-text save-state-label label fadeout-label'>AA</div>`;
    }
    try {
      const ctext = content(globalState);
      return ctext ? `<div id="${id}" class='label outlined-text'>${ctext}</div>` : '';
    } catch (error) {
      console.error(`Error creating label ${id}:`, error);
      return '';
    }
  }


  const downloadedAlready = {};
  let downloadingFilename="";

  async function fastSaveImage() {
    const currentUrl = globalState.imageUrls[globalState.displayedImageIndex];
    if (!currentUrl) {
      showError('No image URL found');
      return;
    }

    try {
      const filename = globalState.originalImageNames[globalState.displayedImageIndex] || 'GalleryWG_Nameless';
      
      if (downloadedAlready[currentUrl]){
        showInfo(INFO.ALREADY_DOWNLOADED);
        updateGalleryState({ doSave: false });
        return;
      }

      const response = await browser.runtime.sendMessage({
        command: 'downloadImage',
        url: currentUrl,
        filename: filename
      });

      downloadingFilename = filename;
      showInfo(`Saving: ${filename}`);
      updateGalleryState({ doSave: false });

      if (response.status === 'success') {
        showSuccess(`${SUCCESS.IMAGE_DOWNLOADED} ${filename}`);
        downloadedAlready[currentUrl] = true;
      } else {
        showError(`${ERRORS.DOWNLOAD_FAILED} ${response.error}`, response.error);
      }
    } catch (error) {
      showError(ERRORS.DOWNLOAD_FAILED, error);
      updateGalleryState({ doSave: false });
    }
  }

  function setKeyboardShortcuts() {
    $(document).keydown(handleShortcut);
    document.addEventListener('wheel', handleMouseWheel);
  }

  function handleMouseWheel(e) {
    updateGalleryState({
      displayedImageIndex: globalState.displayedImageIndex + (e.deltaY < 0 ? -1 : 1)
    }, true);
    e.stopPropagation();
  }

  let debounce='';

  function handleShortcut(e) {
    const key = e.key;
    if (key==debounce){
      return;
    }

    const maintainDistractionFreeModeKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 's'];
    
    if (globalState.distractionFreeMode && !maintainDistractionFreeModeKeys.includes(key)) {
      updateGalleryState({ 
        distractionFreeMode: false,
        helpShown: false
      });
      toggleDistractionFreeUI(false);
      redraw();
      
      if (key === 'd') {
        e.preventDefault();
        return;
      }
    }

    for (const label of labels) {
      const shortcuts = Array.isArray(label.shortcut) ? label.shortcut : [label.shortcut];
      
      for (const shortcut of shortcuts) {
        let matches = false;
        
        if (shortcut.startsWith('Ctrl+')) {
          const keyPart = shortcut.substring(5);
          matches = e.ctrlKey && key === keyPart;
        } else {
          matches = !e.ctrlKey && key === shortcut;
        }
        
        if (matches) {
          debounce=key;
          label.action(settingsModule.settings, globalState);
          redraw();

          if (globalState.doSave){
            //big hack, using the label's action to screw with globalState to force a save.
            fastSaveImage();
          }
          e.preventDefault();

          if (globalState.doExit) {
            backToNormal();
            updateGalleryState({ doExit: false });
          }
          debounce='';
          return;
        }
      }
    }
    debounce='';
  }

  window.openOptionsPage = async function() {
    try {
      await browser.runtime.sendMessage({
        command: 'openOptions'
      });
    } catch (error) {
      console.error('Failed to open options page:', error);
      showError('Failed to open options page');
    }
  };

  window.toggleDistractionFreeUI = function(hide) {
    if (hide) {
      $("#labelZone").fadeOut(200);
    } else {
      $("#labelZone").fadeIn(200);
    }
  };



  setup();
})();
