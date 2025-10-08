
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
    help: "Toggle display of the current image count out of total images."
  },
  {
    id: "anyImagePreloadedLabel",
    condition: (settings, globalState) => settings.anyImagePreloadedLabelShown,
    content: (globalState) => globalState.preloadCount > 0 ? "." : "",
    shortcut: "a",
    action: (settings) => settings.anyImagePreloadedLabelShown = !settings.anyImagePreloadedLabelShown,
    help: "Toggle display of a dot when the next image is preloaded."
  },
  {
    id: "imageFilename",
    condition: (settings, globalState) => settings.imageFilenameShown,
    content: (globalState) => globalState.originalImageNames[globalState.displayedImageIndex],
    shortcut: "n",
    action: (settings) => settings.imageFilenameShown = !settings.imageFilenameShown,
    help: "Shows the file name of the current image."
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
    help: "Toggle display of the image's resolution."
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
    help: "Toggle display of the image's megapixels."
  },
  {
    id: "preloadLabel",
    condition: (settings, globalState) => settings.preloadLabelShown,
    content: (globalState) => globalState.preloadCount,
    shortcut: "p",
    action: (settings) => settings.preloadLabelShown = !settings.preloadLabelShown,
    help: "Toggle display of the preload count."
  },

  {
    id: "ImageGalleryHelp",
    condition: (settings, globalState) => globalState.helpShown,
    action: (settings, globalState) => globalState.helpShown = !globalState.helpShown,
    content: (globalState) => {
      const helpText = labels.map(label => {
        const shortcutDisplay = Array.isArray(label.shortcut) ? label.shortcut.join(' ') : label.shortcut;
        return `${shortcutDisplay} - ${label.help}`;
      }).join("\n");
      return `<div id="${this.id}"><ul style="background: grey;">${helpText.split('\n').map(li => `<li>${li}</li>`).join("")}</ul></div>`;
    },
    shortcut: "?",
    help: "Display this help menu."
  },
  
  {
    id: "navigatePrevious",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => {
      globalState.displayedImageIndex -= 1;
      globalState.helpShown = false;
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
      globalState.helpShown = false;
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
      globalState.helpShown = false;
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
      globalState.helpShown = false;
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
      globalState.helpShown = false;
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
      globalState.helpShown = false;
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
      globalState.helpShown = false;
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
      globalState.helpShown = false;
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
      globalState.helpShown = !globalState.helpShown;
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
