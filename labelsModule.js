
const PAGE_JUMP_SIZE = 5;  // Number of images to skip with PageUp/PageDown

const labels = [
  {
    id: "imageCount",
    condition: (settings, globalState) => settings.imageCountShown,
    content: (globalState) => {
      const current = globalState.displayedImageIndex + 1;
      const total = globalState.imageUrls.length;
      const maxDigits = total.toString().length;
      const paddedCurrent = current.toString().padStart(maxDigits, ' ');
      return `${paddedCurrent} / ${total}`;
    },
    shortcut: "c",
    action: (settings) => settings.imageCountShown = !settings.imageCountShown,
    modifiesSettings: true,
    help: "Display current image count out of total images",
    helpShort: "Image count"
  },
  
  {
    id: "imageFilename",
    condition: (settings, globalState) => settings.imageFilenameShown,
    content: (globalState) => globalState.originalImageNames[globalState.displayedImageIndex],
    shortcut: "n",
    action: (settings) => settings.imageFilenameShown = !settings.imageFilenameShown,
    modifiesSettings: true,
    help: "Shows the file name of the current image.",
    helpShort: "Image filename"
  },
  {
    id: "imageResolution",
    condition: (settings, globalState) => settings.imageResolutionShown,
    content: (globalState) => {
      const img = $("#targetImg")[0];
      return `${img.naturalWidth}x${img.naturalHeight}`;
    },
    shortcut: "r",
    action: (settings) => settings.imageResolutionShown = !settings.imageResolutionShown,
    modifiesSettings: true,
    help: "Toggle display of the image's resolution.",
    helpShort: "Image resolution"
  },
  {
    id: "imageMegapixels",
    condition: (settings, globalState) => settings.imageMegapixelsShown,
    content: (globalState) => {
      const img = $("#targetImg")[0];
      return `${(img.naturalWidth * img.naturalHeight / 1000 / 1000).toFixed(1)}m`;
    },
    shortcut: "m",
    action: (settings) => settings.imageMegapixelsShown = !settings.imageMegapixelsShown,
    modifiesSettings: true,
    help: "Toggle display of the image's megapixels.",
    helpShort: "Image megapixels"
  },
  {
    id: "postTime",
    condition: (settings, globalState) => settings.postTimeShown,
    content: (globalState) => {
      const timestamp = globalState.postTimestamps[globalState.displayedImageIndex];
      if (!timestamp) return '';
      
      const timestampNum = parseInt(timestamp);
      if (isNaN(timestampNum)) return '';
      
      const postDate = new Date(timestampNum * 1000);
      const now = new Date();
      const diffMs = now.getTime() - postDate.getTime();
      
      if (diffMs < 0) return postDate.toLocaleDateString();
      
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      const diffMonths = Math.floor(diffDays / 30);
      
      if (diffSeconds < 60) {
        return diffSeconds === 1 ? '1 second ago' : `${diffSeconds} seconds ago`;
      }
      if (diffMinutes < 60) {
        return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
      }
      if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
      }
      if (diffDays < 60) {
        return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      }
      if (diffMonths < 12) {
        return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
      }
      return postDate.toLocaleDateString();
    },
    shortcut: "t",
    action: (settings) => settings.postTimeShown = !settings.postTimeShown,
    modifiesSettings: true,
    help: "Toggle display of when the post was made.",
    helpShort: "Post timestamp"
  },
  {
    id: "postText",
    condition: (settings, globalState) => settings.postTextShown,
    content: (globalState) => {
      const text = globalState.postTexts[globalState.displayedImageIndex];
      return text || '';
    },
    shortcut: "x",
    action: (settings) => settings.postTextShown = !settings.postTextShown,
    modifiesSettings: true,
    help: "Toggle display of the post text/comment.",
    helpShort: "Post text/comment"
  },
  {
    id: "preloadLabel",
    condition: (settings, globalState) => settings.preloadLabelShown,
    content: (globalState) => globalState.preloadCount,
    shortcut: "p",
    action: (settings) => settings.preloadLabelShown = !settings.preloadLabelShown,
    modifiesSettings: true,
    help: "Toggle display of the preload count.",
    helpShort: "Preload count"
  },
  {
    id: "anyImagePreloadedLabel",
    condition: (settings, globalState) => settings.anyImagePreloadedLabelShown,
    content: (globalState) => globalState.preloadCount > 0 ? "." : "",
    shortcut: "a",
    action: (settings) => settings.anyImagePreloadedLabelShown = !settings.anyImagePreloadedLabelShown,
    modifiesSettings: true,
    help: "Toggle display of a dot when the next image is preloaded.",
    helpShort: "Preload indicator dot"
  },

  {
    id: "displayOptionsMenu",
    condition: (settings, globalState) => globalState.displayOptionsShown,
    action: (settings, globalState) => {
      globalState.displayOptionsShown = !globalState.displayOptionsShown;
      globalState.keyboardShortcutsShown = false;
    },
    content: (globalState) => {
      const toggleableLabels = labels.filter(l => l.helpShort && l.modifiesSettings);
      
      const displayOrder = settingsModule.settings.displayOrder || [];
      
      const orderedLabels = [...toggleableLabels].sort((a, b) => {
        const indexA = displayOrder.indexOf(a.id);
        const indexB = displayOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
      
      const toggleableItems = orderedLabels.map(label => {
        let settingKey = '';
        if (label.id.endsWith('Label')) {
          settingKey = label.id + 'Shown';
        } else {
          settingKey = label.id + 'Shown';
        }
        
        const isShown = settingsModule.settings[settingKey];
        const indicator = isShown 
          ? '<span class="status-indicator status-shown">●</span>' 
          : '<span class="status-indicator status-hidden">●</span>';
        
        const shortcutDisplay = Array.isArray(label.shortcut) ? label.shortcut[0] : label.shortcut;
        
        return `<li class="help-item-toggleable" draggable="true" data-label-id="${label.id}" data-setting-key="${settingKey}"><span class="drag-handle">⋮⋮</span> ${indicator} <kbd>${shortcutDisplay}</kbd> ${label.helpShort}</li>`;
      });
      
      return `<div class="help-menu-panel"><h3>Display Options <small>(drag to reorder)</small></h3><ul id="displayOptionsList">${toggleableItems.join('')}</ul></div>`;
    },
    shortcut: "v",
    help: null
  },
  {
    id: "keyboardShortcutsMenu",
    condition: (settings, globalState) => globalState.keyboardShortcutsShown,
    action: (settings, globalState) => {
      globalState.keyboardShortcutsShown = !globalState.keyboardShortcutsShown;
      globalState.displayOptionsShown = false;
    },
    content: (globalState) => {
      const shortcutItems = [];
      
      labels.forEach(label => {
        if (!label.help || label.modifiesSettings) return;
        const shortcutDisplay = Array.isArray(label.shortcut) ? label.shortcut.join(' ') : label.shortcut;
        shortcutItems.push(`<li>${shortcutDisplay} - ${label.help}</li>`);
      });
      
      return `<div class="help-menu-panel"><h3>Keyboard Shortcuts</h3><ul>${shortcutItems.join('')}</ul></div>`;
    },
    shortcut: "?",
    help: null
  },
  
  {
    id: "navigatePrevious",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => {
      globalState.displayedImageIndex -= 1;
      globalState.displayOptionsShown = false;
      globalState.keyboardShortcutsShown = false;
    },
    shortcut: ["ArrowLeft", "ArrowUp","MouseWheelUp"], 
    content: () => "",
    help: "Navigate to the previous image."
  },
  {
    id: "navigateNext",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => {
      globalState.displayedImageIndex += 1;
      globalState.displayOptionsShown = false;
      globalState.keyboardShortcutsShown = false;
    },
    shortcut: ["ArrowRight", "ArrowDown","MouseWheelDown"],
    content: () => "",
    help: "Navigate to the next image."
  },
  {
    id: "jumpToStart",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => {
      globalState.displayedImageIndex = 0;
      globalState.displayOptionsShown = false;
      globalState.keyboardShortcutsShown = false;
    },
    shortcut: ["Home"],
    content: () => "",
    help: "Jump to the first image."
  },
  {
    id: "jumpToEnd",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => {
      globalState.displayedImageIndex = globalState.imageUrls.length - 1;
      globalState.displayOptionsShown = false;
      globalState.keyboardShortcutsShown = false;
    },
    shortcut: ["End"],
    content: () => "",
    help: "Jump to the last image."
  },
  {
    id: "pageUp",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => {
      globalState.displayedImageIndex -= PAGE_JUMP_SIZE;
      globalState.displayOptionsShown = false;
      globalState.keyboardShortcutsShown = false;
    },
    shortcut: ["PageUp"],
    content: () => "",
    help: `Jump ${PAGE_JUMP_SIZE} images back.`
  },
  {
    id: "pageDown",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => {
      globalState.displayedImageIndex += PAGE_JUMP_SIZE;
      globalState.displayOptionsShown = false;
      globalState.keyboardShortcutsShown = false;
    },
    shortcut: ["PageDown"],
    content: () => "",
    help: `Jump ${PAGE_JUMP_SIZE} images forward.`
  },
  {
    id: "quadraticNavForward",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => {
      const lastIndex = globalState.imageUrls.length - 1;
      const jump = Math.floor((lastIndex - globalState.displayedImageIndex) / 2);
      globalState.displayedImageIndex += jump;
      globalState.displayOptionsShown = false;
      globalState.keyboardShortcutsShown = false;
    },
    shortcut: ["Ctrl+ArrowRight", "Ctrl+ArrowDown", "Ctrl+PageDown"],
    content: () => "",
    help: "Jump halfway to the end."
  },
  {
    id: "quadraticNavBackward",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => {
      const jump = Math.floor(globalState.displayedImageIndex / 2);
      globalState.displayedImageIndex -= jump;
      globalState.displayOptionsShown = false;
      globalState.keyboardShortcutsShown = false;
    },
    shortcut: ["Ctrl+ArrowLeft", "Ctrl+ArrowUp", "Ctrl+PageUp"],
    content: () => "",
    help: "Jump halfway to the start."
  },
  {
    id: "exitGallery",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => globalState.doExit=true,
    shortcut: "Escape",
    content: () => "",
    help: "Exit the gallery view."
  },
  {
    id: "toggleHelp",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => {
      globalState.keyboardShortcutsShown = !globalState.keyboardShortcutsShown;
      globalState.displayOptionsShown = false;
    },
    shortcut: ["?", "/"],
    content: () => "",
    help: "Toggle help display."
  },
  {
    id: "fastSaveImage",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => globalState.doSave=true,
    shortcut: "s",
    content: () => "",
    help: "Fast Save Image (immediately) without 'save as...' popup."
  },
  {
    id: "distractionFreeMode",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => {
      globalState.distractionFreeMode = !globalState.distractionFreeMode;
      toggleDistractionFreeUI(globalState.distractionFreeMode);
    },
    shortcut: "d",
    content: () => "",
    help: "Toggle distraction-free mode (hide UI)."
  },
  {
    id: "openOptions",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => window.openOptionsPage(),
    shortcut: "o",
    content: () => "",
    help: "Open options page."
  }
];
