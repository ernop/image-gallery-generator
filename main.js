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
    displayOptionsShown: false,
    keyboardShortcutsShown: false,
    imageUrls: [],
    imageTypes: [],
    originalImageNames: [],
    postTimestamps: [],
    postTexts: [],
    displayedImageIndex: 0,
    redrawCount: 0,
    relatedCount: 0,
    preloadCount: 0,
    maxPreloadCount: PRELOAD_COUNT,
    galleryOn: false,
    doSave: false,
    doExit: false,
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
    globalState.postTimestamps = [];
    globalState.postTexts = [];

    let imageCount = 0;
    let videoCount = 0;

    $('.postContainer').each(function() {
      const $post = $(this);
      const $fileText = $post.find('.fileText');
      
      if ($fileText.length === 0) return;
      
      const path = $fileText.find('a').attr('href');
      if (!path) return;
      
      const index = globalState.imageUrls.length;
      globalState.imageUrls.push(path);
      globalState.imageTypes[index] = util.getFileType(path);

      const originalImageName = $fileText.find('a').attr('title') || $fileText.find('a')[0].innerHTML;
      globalState.originalImageNames.push(originalImageName);
      
      const timestamp = $post.find('.dateTime[data-utc]').attr('data-utc') || '';
      globalState.postTimestamps.push(timestamp);
      
      const postText = $post.find('.postMessage').text().trim();
      globalState.postTexts.push(postText);

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
      preloadCount: 0,
      doSave: false,
      doExit: false
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

  function setupDragAndDrop() {
    const list = document.getElementById('displayOptionsList');
    if (!list) return;
    
    let draggedItem = null;
    
    list.addEventListener('dragstart', function(e) {
      draggedItem = e.target.closest('li');
      if (draggedItem) {
        e.dataTransfer.effectAllowed = 'move';
        draggedItem.classList.add('dragging');
      }
    });
    
    list.addEventListener('dragend', function(e) {
      if (draggedItem) {
        draggedItem.classList.remove('dragging');
      }
    });
    
    list.addEventListener('dragover', function(e) {
      e.preventDefault();
      const afterElement = getDragAfterElement(list, e.clientY);
      if (afterElement == null) {
        list.appendChild(draggedItem);
      } else {
        list.insertBefore(draggedItem, afterElement);
      }
    });
    
    list.addEventListener('drop', function(e) {
      e.preventDefault();
      const newOrder = [];
      list.querySelectorAll('li').forEach(li => {
        const labelId = li.getAttribute('data-label-id');
        if (labelId) newOrder.push(labelId);
      });
      settingsModule.settings.displayOrder = newOrder;
      settingsModule.saveSettings(false);
    });
  }
  
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  
  let redrawLabelsPending = false;
  
  function redrawLabels() {
    if (!globalState.galleryOn) return;
    if (redrawLabelsPending) {
      return;
    }
    
    redrawLabelsPending = true;
    setTimeout(() => {
      redrawLabelsNow();
      redrawLabelsPending = false;
    }, 0);
  }
  
  function redrawLabelsNow() {
    if (!globalState.galleryOn) return;
    
    $(document).find(".label").remove();
    $(document).find(".help-menu-button").remove();
    $(document).find(".help-menu-wrapper").remove();
    $("#postTextZone").remove();
    
    const displayOrder = settingsModule.settings.displayOrder || [];
    
    const visibleLabels = labels.filter(label => {
      return label.condition(settingsModule.settings, globalState) && 
             label.id !== 'displayOptionsMenu' && 
             label.id !== 'keyboardShortcutsMenu' &&
             label.id !== 'postText';
    });
    
    const sortedLabels = [...visibleLabels].sort((a, b) => {
      const indexA = displayOrder.indexOf(a.id);
      const indexB = displayOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    
    const labelHtml = sortedLabels.map(label => createLabel(label.id, label.content, label.temporary))
      .join('');

    $("#labelZone").html(labelHtml);
    
    if (settingsModule.settings.postTextShown) {
      const postTextLabel = labels.find(l => l.id === 'postText');
      if (postTextLabel && postTextLabel.condition(settingsModule.settings, globalState)) {
        const text = globalState.postTexts[globalState.displayedImageIndex];
        if (text) {
          const postTextHtml = `<div id="postTextZone" class="outlined-text">${text}</div>`;
          $("#blackBackground").append(postTextHtml);
        }
      }
    }
    
    if (settingsModule.settings.helpButtonShown && !globalState.distractionFreeMode) {
      const displayOptionsButton = $('<div id="displayOptionsButton" class="help-menu-button">⚙</div>');
      displayOptionsButton.click(function(e) {
        e.stopPropagation();
        updateGalleryState({ 
          displayOptionsShown: !globalState.displayOptionsShown,
          keyboardShortcutsShown: false
        });
        redraw();
      });
      $('body').append(displayOptionsButton);
      
      const keyboardShortcutsButton = $('<div id="keyboardShortcutsButton" class="help-menu-button">?</div>');
      keyboardShortcutsButton.click(function(e) {
        e.stopPropagation();
        updateGalleryState({ 
          keyboardShortcutsShown: !globalState.keyboardShortcutsShown,
          displayOptionsShown: false
        });
        redraw();
      });
      $('body').append(keyboardShortcutsButton);
    }
    
    if (globalState.displayOptionsShown && !globalState.distractionFreeMode) {
      const displayOptionsLabel = labels.find(l => l.id === 'displayOptionsMenu');
      if (displayOptionsLabel) {
        try {
          const content = displayOptionsLabel.content(globalState);
          const menuHtml = `<div id="displayOptionsMenu" class="help-menu-wrapper">${content}</div>`;
          $('body').append(menuHtml);
        } catch (error) {
          console.error('Error creating display options menu:', error);
        }
      }
    }
    
    if (globalState.keyboardShortcutsShown && !globalState.distractionFreeMode) {
      const keyboardShortcutsLabel = labels.find(l => l.id === 'keyboardShortcutsMenu');
      if (keyboardShortcutsLabel) {
        try {
          const content = keyboardShortcutsLabel.content(globalState);
          const menuHtml = `<div id="keyboardShortcutsMenu" class="help-menu-wrapper">${content}</div>`;
          $('body').append(menuHtml);
        } catch (error) {
          console.error('Error creating keyboard shortcuts menu:', error);
        }
      }
    }
    
    setupDragAndDrop();
    
    $(".help-item-toggleable").off('click mouseenter mouseleave').on('click', function() {
      const $item = $(this);
      const labelId = $item.attr('data-label-id');
      const settingKey = $item.attr('data-setting-key');
      
      $(`#${labelId}`).removeClass('help-highlight');
      $(`#${labelId}_temp`).remove();
      
      if (settingKey && settingsModule.settings.hasOwnProperty(settingKey)) {
        settingsModule.settings[settingKey] = !settingsModule.settings[settingKey];
        settingsModule.saveSettings(false);
        
        $item.addClass('help-item-just-clicked');
        setTimeout(() => {
          $item.removeClass('help-item-just-clicked');
        }, 500);
        
        redraw();
      }
    }).on('mouseenter', function() {
      const $item = $(this);
      if ($item.hasClass('help-item-just-clicked')) return;
      
      const labelId = $item.attr('data-label-id');
      const settingKey = $item.attr('data-setting-key');
      const isShown = settingsModule.settings[settingKey];
      
      if (isShown) {
        $(`#${labelId}`).addClass('help-highlight');
      } else {
        const label = labels.find(l => l.id === labelId);
        if (label && label.content && label.id !== 'postText') {
          try {
            const tempContent = typeof label.content === 'function' ? label.content(globalState) : label.content;
            if (tempContent) {
              const tempLabel = $(`<div id="${labelId}_temp" class="label outlined-text help-highlight help-temp-preview">${tempContent}</div>`);
              
              const labelIndex = labels.findIndex(l => l.id === labelId);
              const visibleLabels = labels.filter((l, idx) => 
                idx < labelIndex && 
                l.condition && 
                l.condition(settingsModule.settings, globalState) &&
                l.id !== 'displayOptionsMenu' &&
                l.id !== 'keyboardShortcutsMenu'
              );
              
              if (visibleLabels.length === 0) {
                $("#labelZone .label").first().before(tempLabel);
              } else {
                const lastVisibleId = visibleLabels[visibleLabels.length - 1].id;
                $(`#${lastVisibleId}`).after(tempLabel);
              }
            }
          } catch (error) {
            console.warn('Could not generate preview for', labelId, error);
          }
        }
      }
    }).on('mouseleave', function() {
      const labelId = $(this).attr('data-label-id');
      $(`#${labelId}`).removeClass('help-highlight');
      $(`#${labelId}_temp`).remove();
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
      displayedImageIndex: globalState.displayedImageIndex + (e.deltaY < 0 ? -1 : 1),
      displayOptionsShown: false,
      keyboardShortcutsShown: false
    }, true);
    e.stopPropagation();
  }

  let debounce='';

  function handleShortcut(e) {
    const key = e.key;
    if (key==debounce){
      return;
    }

    const maintainDistractionFreeModeKeys = [
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 's', 'PageUp', 'PageDown',
      'Ctrl+ArrowLeft', 'Ctrl+ArrowRight', 'Ctrl+ArrowUp', 'Ctrl+ArrowDown', 
      'Ctrl+PageUp', 'Ctrl+PageDown'
    ];
    if (key == "Control") {
      return;
    }
    
    const currentKey = e.ctrlKey ? `Ctrl+${key}` : key;
    

    if (globalState.distractionFreeMode && !maintainDistractionFreeModeKeys.includes(currentKey)) {
      updateGalleryState({ 
        distractionFreeMode: false,
        displayOptionsShown: false,
        keyboardShortcutsShown: false
      });
      toggleDistractionFreeUI(false);
      redraw();
      
      if (key === 'd') {
        e.preventDefault();
        return;
      }
    }

    for (const label of labels) {
      if (!label.shortcut) continue;
      
      const shortcuts = Array.isArray(label.shortcut) ? label.shortcut : [label.shortcut];
      
      for (const shortcut of shortcuts) {
        if (!shortcut) continue;
        
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
          
          if (label.modifiesSettings) {
            settingsModule.saveSettings(false);
          }
          
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
