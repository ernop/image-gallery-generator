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
    $('.fileText').each(function(index) {
      const path = $(this).find('a').attr('href');
      globalState.imageUrls.push(path);
      globalState.imageTypes[index] = util.getFileType(path);

      let originalImageName = $(this).find('a').attr('title') || $(this).find('a')[0].innerHTML;
      globalState.originalImageNames.push(originalImageName);
    });

    $('.navLinks').prepend('[<a href="#" class="galleryOn">Gallery Mode</a>] ');

    for (let i = 0; i < globalState.maxPreloadCount; i++) {
      $('body').prepend(`<img id="targetImg_preload${i}" style="display:none;">`);
      $('body').prepend(`<video id="targetVideo_preload${i}" style="display:none;" src=""></video>`);
    }
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
            <div id="output"></div>
          </div>
        </div>
      `);
    } else {
      $("#galleryViewWrapper, #blackBackground").show();
    }

    styleBlackBackground();
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
  }

  function resetGlobalState() {
    globalState.imageUrls = [];
    globalState.imageTypes = [];
    globalState.originalImageNames = [];
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
      if (n > 5) redrawLabels();
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

    const labelHtml = labels.filter(label => label.condition(settingsModule.settings, globalState))
      .map(label => createLabel(label.id, label.content))
      .join('');

    $("#labelZone").html(labelHtml);
  }

  function createLabel(id, content) {
    const ctext = content(globalState);
    return ctext ? `<div id="${id}" class='outlined-text' data-text='${ctext}'>${ctext}</div>` : '';
  }

  function handleShortcut(e) {
    const key = e.key;

    for (const label of labels) {
      if ((Array.isArray(label.shortcut) && label.shortcut.includes(key)) || label.shortcut === key) {
        label.action(settingsModule.settings, globalState);
        redraw();
        redrawLabels();
        e.preventDefault();

        if (globalState.doExit) {
          backToNormal();
          globalState.doExit = false;
        }
        break;
      }
    }
  }

  function setKeyboardShortcuts() {
    $(document).keydown(handleShortcut);
    document.addEventListener('wheel', handleMouseWheel);
  }

  function handleMouseWheel(e) {
    globalState.displayedImageIndex += e.deltaY < 0 ? -1 : 1;
    redraw();
  }

  setup();
})();
