const labels = [
    {
      id: "imageCount",
      condition: (settings) => settings.imageCountShown,
      content: () => `${displayedImageIndex} / ${imageUrls.length - 1}`
    },
    {
      id: "imageFilename",
      condition: (settings) =>settings.imageFilenameShown,
      content: () => originalImageNames[displayedImageIndex]
    },
    {
      id: "imageResolution",
      condition: (settings) => settings.imageResolutionShown,
      content: () => {
        const img = $("#targetImg")[0];
        return `${img.naturalWidth}x${img.naturalHeight}`;
      }
    },
    {
      id: "imageMegapixels",
      condition: (settings) => settings.imageMegapixelsShown,
      content: () => {
        const img = $("#targetImg")[0];
        return `${(img.naturalWidth * img.naturalHeight / 1000 / 1000).toFixed(1)}m`;
      }
    },
    {
      id: "preloadLabel",
      condition: (settings) => settings.preloadLabelShown,
      content: () => preloadCount
    },
    {
      id: "anyImagePreloadedLabel",
      condition: (settings) => settings.anyImagePreloadedLabelShown,
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