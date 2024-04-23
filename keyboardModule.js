const keyboardShortcuts = [
  {
    keycodes: [27], // esc
    type: 'exit',
  },
  {
    keycodes: [33], // pgup
    action: (settings) => settings.displayedImageIndex -= 5,
    type: 'image',
  },
  {
    keycodes: [34], // pgdown
    action: (settings) => settings.displayedImageIndex += 5,
    type: 'image',
  },
  {
    keycodes: [35], // end
    action: (settings) => settings.displayedImageIndex = imageUrls.length - 1,
    type: 'image',
  },
  {
    keycodes: [36], // home
    action: (settings) => settings.displayedImageIndex = 0,
    type: 'image',
  },
  {
    keycodes: [37, 38], // left, up
    action: (settings) => settings.displayedImageIndex -= 1,
    type: 'image',
  },
  {
    keycodes: [39, 40], // right, down
    action: (settings) => settings.displayedImageIndex += 1,
    type: 'image',
  },
  {
    keycodes: [65], // a
    action: (settings) => settings.anyImagePreloadedLabelShown =!settings.anyImagePreloadedLabelShown,
    type: 'labels',
  },
  {
    keycodes: [67], // c
    action: (settings) => {
      settings.imageCountShown =!settings.imageCountShown
    },
    type: 'labels',
  },
  {
    keycodes: [77], // m
    action: (settings) => settings.imageMegapixelsShown =!settings.imageMegapixelsShown,
    type: 'labels',
  },
  {
    keycodes: [78], // n
    action: (settings) => settings.imageFilenameShown =!settings.imageFilenameShown,
    type: 'labels',
  },
  {
    keycodes: [80], // p
    action: (settings) => settings.preloadLabelShown =!settings.preloadLabelShown,
    type: 'labels',
  },
  {
    keycodes: [82], // r
    action: (settings) => settings.imageResolutionShown =!settings.imageResolutionShown,
    type: 'labels',
  },
  {
    keycodes: [83], // s
    type: 'ai',
  },
  {
    keycodes: [88], // x
    action: (settings) => {
      settings.preloadLabelShown = false;
      settings.anyImagePreloadedLabelShown = false;
      settings.imageMegapixelsShown = false;
      settings.imageResolutionShown = false;
      settings.imageFilenameShown = false;
      settings.imageCountShown = false;
    },
    type: 'clear',
  },
  {
    keycodes: [191], // / or?
    type: 'help',
  },
];  
