const labels = [
    {
      id: "imageCount",
      condition: (settings, globalState) => settings.imageCountShown,
      content: (globalState) => `${globalState.displayedImageIndex} / ${globalState.imageUrls.length - 1}`
    },
    {
      id: "imageFilename",
      condition: (settings, globalState) =>settings.imageFilenameShown,
      content: (globalState) => globalState.originalImageNames[globalState.displayedImageIndex]
    },
    {
      id: "imageResolution",
      condition: (settings, globalState) => settings.imageResolutionShown,
      content: (globalState) => {
        const img = $("#targetImg")[0];
        return `${img.naturalWidth}x${img.naturalHeight}`;
      }
    },
    {
      id: "imageMegapixels",
      condition: (settings, globalState) => settings.imageMegapixelsShown,
      content: (globalState) => {
        const img = $("#targetImg")[0];
        return `${(img.naturalWidth * img.naturalHeight / 1000 / 1000).toFixed(1)}m`;
      }
    },
    {
      id: "preloadLabel",
      condition: (settings, globalState) => settings.preloadLabelShown,
      content: (globalState) => preloadCount
    },
    {
      id: "anyImagePreloadedLabel",
      condition: (settings, globalState) => settings.anyImagePreloadedLabelShown,
      content: (globalState) => preloadCount > 0? "." : ""
    },
    {
      id: "ImageGalleryHelp",
      condition: (settings, globalState) => globalState.helpShown,
      content: (globalState) => {
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