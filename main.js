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

      $("#targetImg").click((e) => {
        if (globalState.displayOptionsShown || globalState.keyboardShortcutsShown) {
          updateGalleryState({
            displayOptionsShown: false,
            keyboardShortcutsShown: false
          });
          redraw();
          e.stopPropagation();
        } else {
          e.stopPropagation();
        }
      });
      
      $("#targetVideo").click((e) => {
        if (globalState.displayOptionsShown || globalState.keyboardShortcutsShown) {
          updateGalleryState({
            displayOptionsShown: false,
            keyboardShortcutsShown: false
          });
          redraw();
          e.stopPropagation();
        } else {
          e.stopPropagation();
        }
      });

      $("#blackBackground").click(function(e) {
        if (globalState.displayOptionsShown || globalState.keyboardShortcutsShown) {
          updateGalleryState({
            displayOptionsShown: false,
            keyboardShortcutsShown: false
          });
          redraw();
        } else {
          backToNormal();
        }
      });

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

    let galleryModeText;
    if (videoCount > 0) {
      galleryModeText = `GalleryMode WG ${imageCount}/${videoCount}`;
    } else {
      galleryModeText = `GalleryMode WG ${imageCount}`;
    }
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
    
    $(".help-menu-button").remove();
    $(".help-menu-wrapper").remove();
    
    try {
      document.getElementById("targetVideo").pause();
    } catch (error) {
      console.warn('Could not pause video:', error);
    }

    $(document).off('keydown');
    $(window).off('resize');
    $("#blackBackground").off('click');
    $("#targetImg").off('click');
    $("#targetVideo").off('click');

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
      doExit: false,
      displayOptionsShown: false,
      keyboardShortcutsShown: false
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

    let newIndex = globalState.displayedImageIndex;
    const maxIndex = globalState.imageUrls.length - 1;

    if (settingsModule.settings.loopNavigation) {
      // Wrap around when looping is enabled
      if (newIndex < 0) {
        newIndex = maxIndex;
      } else if (newIndex > maxIndex) {
        newIndex = 0;
      }
    } else {
      // Clamp to valid range
      newIndex = Math.min(Math.max(0, newIndex), maxIndex);
    }

    updateGalleryState({
      redrawCount: globalState.redrawCount + 1,
      preloadCount: 0,
      displayedImageIndex: newIndex
    });

    const thisImageType = globalState.imageTypes[globalState.displayedImageIndex];
    const targetImg = $("#targetImg");
    const targetVideo = $("#targetVideo");
    const currentUrl = globalState.imageUrls[globalState.displayedImageIndex];

    try {
      if (thisImageType === "video") {
        targetImg.hide();
        
        // Check if already loaded in any preload slot
        let videoReady = false;
        for (let i = 0; i < globalState.maxPreloadCount; i++) {
          const preloadVideo = $(`#targetVideo_preload${i}`);
          if (preloadVideo.length && preloadVideo.attr('src') === currentUrl && preloadVideo[0].readyState >= 3) {
            videoReady = true;
            break;
          }
        }
        
        if (videoReady) {
          targetVideo.show().attr("src", currentUrl);
        } else {
          // Hide and load, show when ready
          targetVideo.hide().attr("src", currentUrl);
          targetVideo.off('canplay.display').one('canplay.display', () => {
            if (globalState.imageUrls[globalState.displayedImageIndex] === currentUrl && globalState.galleryOn) {
              targetVideo.show();
            }
          });
        }
      } else {
        targetVideo.hide();
        
        // Check if already loaded in any preload slot
        let imageReady = false;
        for (let i = 0; i < globalState.maxPreloadCount; i++) {
          const preloadImg = $(`#targetImg_preload${i}`);
          if (preloadImg.length && preloadImg.attr('src') === currentUrl && util.isImageDone(preloadImg)) {
            imageReady = true;
            break;
          }
        }
        
        if (imageReady) {
          targetImg.show().attr("src", currentUrl);
        } else {
          // Hide and load, show when ready
          targetImg.hide().attr("src", currentUrl);
          targetImg.off('load.display').one('load.display', () => {
            if (globalState.imageUrls[globalState.displayedImageIndex] === currentUrl && globalState.galleryOn) {
              targetImg.show();
            }
          });
        }
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
    let lastUpdateTime = 0;
    
    list.addEventListener('dragstart', function(e) {
      if (!e.target.classList.contains('drag-handle')) {
        e.preventDefault();
        return;
      }
      
      draggedItem = e.target.closest('li');
      if (draggedItem) {
        e.dataTransfer.effectAllowed = 'move';
        draggedItem.classList.add('dragging');
        
        const labelId = draggedItem.getAttribute('data-label-id');
        const settingKey = draggedItem.getAttribute('data-setting-key');
        const isShown = settingsModule.settings[settingKey];
        
        if (!isShown) {
          const existingTemp = $(`#${labelId}_temp`);
          if (existingTemp.length) {
            existingTemp.attr('id', `${labelId}_drag_ghost`);
            existingTemp.addClass('drag-ghost');
          } else {
            const label = labels.find(l => l.id === labelId);
            if (label && label.content) {
              try {
                const tempContent = typeof label.content === 'function' ? label.content(globalState) : label.content;
                if (tempContent) {
                  $(`#${labelId}_drag_ghost`).remove();
                  const ghostLabel = $(`<div id="${labelId}_drag_ghost" class="label outlined-text help-temp-preview drag-ghost"></div>`);
                  ghostLabel.text(tempContent);
                  showDragGhostAtPosition(labelId, ghostLabel);
                }
              } catch (error) {
                console.warn('Could not generate drag ghost for', labelId, error);
              }
            }
          }
        } else {
          $(`#${labelId}`).addClass('help-drag-highlight');
        }
      }
    });
    
    list.addEventListener('dragend', function(e) {
      if (draggedItem) {
        draggedItem.classList.remove('dragging');
        const labelId = draggedItem.getAttribute('data-label-id');
        $(`#${labelId}`).removeClass('help-highlight help-drag-highlight');
        $(`#${labelId}_drag_ghost`).remove();
      }
    });
    
    list.addEventListener('dragover', function(e) {
      if (!draggedItem) return;
      
      e.preventDefault();
      const afterElement = getDragAfterElement(list, e.clientY);
      const noDragItem = list.querySelector('.help-item-no-drag');
      
      if (afterElement == null) {
        if (noDragItem) {
          list.insertBefore(draggedItem, noDragItem);
        } else {
          list.appendChild(draggedItem);
        }
      } else {
        list.insertBefore(draggedItem, afterElement);
      }
      
      const now = Date.now();
      if (now - lastUpdateTime > 50) {
        lastUpdateTime = now;
        const newOrder = [];
        list.querySelectorAll('li:not(.help-item-no-drag)').forEach(li => {
          const labelId = li.getAttribute('data-label-id');
          if (labelId) newOrder.push(labelId);
        });
        settingsModule.settings.displayOrder = newOrder;
        
        const labelId = draggedItem.getAttribute('data-label-id');
        const settingKey = draggedItem.getAttribute('data-setting-key');
        const isShown = settingsModule.settings[settingKey];
        if (!isShown) {
          const ghostLabel = $(`#${labelId}_drag_ghost`);
          if (ghostLabel.length) {
            showDragGhostAtPosition(labelId, ghostLabel);
          }
        } else {
          const actualLabel = $(`#${labelId}`);
          if (actualLabel.length) {
            showDragGhostAtPosition(labelId, actualLabel);
          }
        }
      }
    });
    
    list.addEventListener('drop', function(e) {
      e.preventDefault();
      
      const newOrder = [];
      list.querySelectorAll('li:not(.help-item-no-drag)').forEach(li => {
        const labelId = li.getAttribute('data-label-id');
        if (labelId) newOrder.push(labelId);
      });
      settingsModule.settings.displayOrder = newOrder;
      settingsModule.saveSettings(false);
      updateLabelsOrder();
    });
  }
  
  function showDragGhostAtPosition(labelId, ghostElement) {
    const displayOrder = settingsModule.settings.displayOrder || [];
    const labelIndex = displayOrder.indexOf(labelId);
    
    const visibleBeforeLabels = [];
    for (let i = 0; i < labelIndex; i++) {
      const beforeId = displayOrder[i];
      const beforeLabel = labels.find(l => l.id === beforeId);
      if (beforeLabel) {
        const settingKey = beforeId.endsWith('Label') ? beforeId + 'Shown' : beforeId + 'Shown';
        if (settingsModule.settings[settingKey]) {
          visibleBeforeLabels.push(beforeId);
        }
      }
    }
    
    ghostElement.detach();
    if (visibleBeforeLabels.length === 0) {
      const firstLabel = $("#labelZone .label").first();
      if (firstLabel.length) {
        firstLabel.before(ghostElement);
      } else {
        $("#labelZone").prepend(ghostElement);
      }
    } else {
      const lastVisibleId = visibleBeforeLabels[visibleBeforeLabels.length - 1];
      $(`#${lastVisibleId}`).after(ghostElement);
    }
  }
  
  function updateLabelsOrder() {
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

    const dragGhost = $("#labelZone").find('[id$="_drag_ghost"]').detach();
    const tempPreview = $("#labelZone").find('[id$="_temp"]').detach();
    
    $("#labelZone").html(labelHtml);
    
    if (dragGhost.length) {
      const ghostId = dragGhost.attr('id');
      const labelId = ghostId.replace('_drag_ghost', '');
      showDragGhostAtPosition(labelId, dragGhost);
    }
    
    if (tempPreview.length) {
      const tempId = tempPreview.attr('id');
      const labelId = tempId.replace('_temp', '');
      showDragGhostAtPosition(labelId, tempPreview);
    }
  }
  
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging):not(.help-item-no-drag)')];
    
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
      displayOptionsButton.on('click', function(e) {
        e.stopPropagation();
        updateGalleryState({ 
          displayOptionsShown: !globalState.displayOptionsShown,
          keyboardShortcutsShown: false
        });
        redraw();
      });
      $('body').append(displayOptionsButton);
      
      const keyboardShortcutsButton = $('<div id="keyboardShortcutsButton" class="help-menu-button">?</div>');
      keyboardShortcutsButton.on('click', function(e) {
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
    
    $(".help-menu-wrapper").off('click').on('click', function(e) {
      e.stopPropagation();
    });
    
    if (globalState.displayOptionsShown || globalState.keyboardShortcutsShown) {
      $(document).off('click.dismissMenus').on('click.dismissMenus', function(e) {
        if (!$(e.target).closest('.help-menu-wrapper, .help-menu-button').length) {
          updateGalleryState({ 
            displayOptionsShown: false,
            keyboardShortcutsShown: false
          });
          redraw();
          $(document).off('click.dismissMenus');
        }
      });
    }
    
    $(".help-item-toggleable").off('click mouseenter mouseleave').on('click', function(e) {
      e.stopPropagation();
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
              const tempLabel = $(`<div id="${labelId}_temp" class="label outlined-text help-highlight help-temp-preview"></div>`);
              tempLabel.text(tempContent);
              
              const displayOrder = settingsModule.settings.displayOrder || [];
              const labelIndex = displayOrder.indexOf(labelId);
              
              const visibleBeforeLabels = [];
              for (let i = 0; i < labelIndex && i < displayOrder.length; i++) {
                const beforeId = displayOrder[i];
                const beforeLabel = labels.find(l => l.id === beforeId);
                if (beforeLabel) {
                  const beforeSettingKey = beforeId.endsWith('Label') ? beforeId + 'Shown' : beforeId + 'Shown';
                  if (settingsModule.settings[beforeSettingKey]) {
                    visibleBeforeLabels.push(beforeId);
                  }
                }
              }
              
              if (visibleBeforeLabels.length === 0) {
                const firstLabel = $("#labelZone .label").first();
                if (firstLabel.length) {
                  firstLabel.before(tempLabel);
                } else {
                  $("#labelZone").prepend(tempLabel);
                }
              } else {
                const lastVisibleId = visibleBeforeLabels[visibleBeforeLabels.length - 1];
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
      if (!$(`#${labelId}_drag_ghost`).length) {
        $(`#${labelId}_temp`).remove();
      }
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
    document.addEventListener('mouseup', handleMouseButtons);
  }

  function handleMouseButtons(e) {
    // Mouse button 3 = back, button 4 = forward (side buttons on mice)
    if (e.button === 3) {
      updateGalleryState({ displayedImageIndex: globalState.displayedImageIndex - 1 }, true);
      e.preventDefault();
    } else if (e.button === 4) {
      updateGalleryState({ displayedImageIndex: globalState.displayedImageIndex + 1 }, true);
      e.preventDefault();
    }
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
