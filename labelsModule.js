

const labels = [
  {
    id: "imageCount",
    condition: (settings, globalState) => settings.imageCountShown,
    content: (globalState) => `${globalState.displayedImageIndex+1} / ${globalState.imageUrls.length }`,
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
      const helpText = labels.map(label => `${label.shortcut} - ${label.help}`).join("\n");
      return `<div id="${this.id}"><ul style="background: grey;">${helpText.split('\n').map(li => `<li>${li}</li>`).join("")}</ul></div>`;
    },
    shortcut: "?",
    help: "Display this help menu."
  },
  {
    id: "navigatePrevious",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => globalState.displayedImageIndex -= 1,
    shortcut: ["ArrowLeft", "ArrowUp"], // Using a descriptive shortcut name
    content: () => "",
    help: "Navigate to the previous image."
  },
  {
    id: "navigateNext",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => globalState.displayedImageIndex += 1,
    shortcut: ["ArrowRight", "ArrowDown"],
    content: () => "",
    help: "Navigate to the next image."
  },
  {
    id: "jumpToStart",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => globalState.displayedImageIndex = 0,
    shortcut: ["Home"],
    content: () => "",
    help: "Jump to the first image."
  },
  {
    id: "jumpToEnd",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => globalState.displayedImageIndex = globalState.imageUrls.length - 1,
    shortcut: ["End"],
    content: () => "",
    help: "Jump to the last image."
  },
  {
    id: "pageUp",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => globalState.displayedImageIndex -= 5,
    shortcut: ["PageUp"],
    content: () => "",
    help: "Jump five images back."
  },
  {
    id: "pageDown",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => globalState.displayedImageIndex += 5,
    shortcut: ["PageDown"],
    content: () => "",
    help: "Jump five images forward."
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
    id: "labelForDownloadedImage",
    condition: (settings, globalState) => globalState.doSave==true,
    action: (settings, globalState) => {},
    shortcut: [],
    content: () => "",
    temporary: true,
    help: "",
  },
  {
    id: "aiDescribeImage",
    condition: (settings, globalState) => true,
    action: (settings, globalState) => ai.DescribeImageAI(),
    shortcut: "q",
    content: () => "",
    help: "Activate AI to describe the image."
  }
];
