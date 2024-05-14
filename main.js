(function() {
  const globalState = {
    helpShown: false,
    imageUrls: [],
    imageTypes: [],
    originalImageNames: [],
    MAX_TOKENS: 1600,
    displayedImageIndex: 0,
    redrawCount: 0,
    relatedCount: 0,
    preloadCount: 0,
    maxPreloadCount: 7,
    galleryOn: false,
    doSave:false,
  };

  async function setup() {
    await settingsModule.loadSettings();
    readStuffFromPage();
    setPreloads();

    $(".galleryOn").click(enableGalleryMode);

    $("#targetImg").click((e) => e.stopPropagation());
    $("#targetVideo").click((e) => e.stopPropagation());

    $("#blackBackground").click(backToNormal);

    $(window).on('resize', redraw);
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

    const galleryModeText = `GalleryMode WG ${imageCount}/${videoCount}`;
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

    globalState.galleryOn = true;
    $("body").addClass("gallery-mode");

    if ($("#galleryViewWrapper").length == 0) {
      $('body').append(`
        <div id="galleryViewWrapper">
          <div id="labelZone"></div>
          <div id="blackBackground">
            <img id="targetImg" src="" />
            <video controls="true" autoplay id="targetVideo" src=""></video>
            <button id="fastSaveButton">Fast Save</button>
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
    globalState.galleryOn = false;
    $("#galleryViewWrapper, #blackBackground").hide();
    $("body").removeClass("gallery-mode");
    document.getElementById("targetVideo").pause();

    $(document).off('keydown');
    $(window).off('resize');
    $("#blackBackground").off('click');
    $("#targetImg").off('click');

    resetGlobalState();

    // Scroll to the top of the page
    window.scrollTo(0, 0);
}

  function resetGlobalState() {
    globalState.displayedImageIndex = 0;
    globalState.redrawCount = 0;
    globalState.relatedCount = 0;
    globalState.preloadCount = 0;
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
    if (rc !== globalState.redrawCount || n > 5) {
      if (n > 5) {
        redrawLabels();
      }
      return;
    }

    const target = $(`#targetImg_preload${n}`);
    if (util.isImageDone(target)) {
      globalState.preloadCount++;
      watchAndGo(n + 1, rc);
    } else {
      target.off('load').one('load', () => {
        if (rc === globalState.redrawCount) {
          globalState.preloadCount++;
          watchAndGo(n + 1, rc);
        }
      });
    }
    redrawLabels();
  }

  function redraw() {
    if (!globalState.galleryOn) return;

    globalState.redrawCount++;
    globalState.preloadCount = 0;
    globalState.displayedImageIndex = Math.min(Math.max(0, globalState.displayedImageIndex), globalState.imageUrls.length - 1);

    const thisImageType = globalState.imageTypes[globalState.displayedImageIndex];
    const targetImg = $("#targetImg");
    const targetVideo = $("#targetVideo");

    if (thisImageType === "video") {
      targetImg.hide();
      targetVideo.show().attr("src", globalState.imageUrls[globalState.displayedImageIndex]);
    } else {
      targetImg.show().attr("src", globalState.imageUrls[globalState.displayedImageIndex]);
      targetVideo.hide();
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

    $("#labelZone").html(labelHtml);
    $(".fadeout-label").each(function() {
      const $label = $(this);
      $label.removeClass("fadeout-label");
      $label.delay(100).fadeOut(600, function() {
        $label.remove();
      });
    });
  }

  function createLabel(id, content, temporary) {
    if (temporary){
      return `<div id="${id}" class='outlined-text save-state-label label fadeout-label'>AA</div>`;
    }
    const ctext = content(globalState);
    return ctext ? `<div id="${id}" class='label outlined-text'>${ctext}</div>` : '';
  }

  let debounce='';

  function handleShortcut(e) {
    const key = e.key;
    if (key==debounce){
      return;
    }

    for (const label of labels) {
      if ((Array.isArray(label.shortcut) && label.shortcut.includes(key)) || label.shortcut === key) {
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
          globalState.doExit = false;
        }
        break;
      }
    }
    debounce='';
  }

  function setKeyboardShortcuts() {
    $(document).keydown(handleShortcut);
    document.addEventListener('wheel', handleMouseWheel);
  }

  function handleMouseWheel(e) {
    globalState.displayedImageIndex += e.deltaY < 0 ? -1 : 1;
    redraw();
    e.stopPropagation();
  }

  const downloadedAlready = {};
  let downloadingFilename="";

  async function fastSaveImage() {
    const currentUrl = globalState.imageUrls[globalState.displayedImageIndex];
    if (currentUrl) {
      try {
        const filename = globalState.originalImageNames[globalState.displayedImageIndex] || 'GalleryWG_Nameless';
        if (downloadedAlready[currentUrl]){
          redrawLabels();
          $(".save-state-label").html(`already downloaded ${filename}, manually right-click and save as if you want to get it again.`);
          globalState.doSave = false;
          return;
        }

        const response = await browser.runtime.sendMessage({
          command: 'downloadImage',
          url: currentUrl,
          filename: filename
        });

        redrawLabels();
        downloadingFilename=filename;
        $(".save-state-label").html("Saving:"+ filename);
        globalState.doSave = false;

        if (response.status === 'success') {
          $(".save-state-label").html("Saved:"+ filename);
          downloadedAlready[currentUrl]=true;
        } else {
          console.error('Error saving image:', response.error);
          downloadedNowFilename = 'Error saving image:' +response.error;
          redrawLabels();
          globalState.doSave = false;
        }
      } catch (error) {
        console.error('Error sending message to background:', error);
        downloadedNowFilename = 'Error sending message to background:' + error;
        redrawLabels();
        globalState.doSave = false;
      }
    }
  }

  setup();
})();




