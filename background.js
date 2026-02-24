const CUSTOM_SCRIPT_ID = 'gallery-wg-custom-sites';

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === 'downloadImage') {
    var use =message.url
    if (/^https?:\/\//i.test(use)) {
        use=message.url;
    }else{
        use = 'https:' + use;
    }
    browser.downloads.download({
      url: use,
      filename: message.filename,
      conflictAction: 'uniquify',
      saveAs: false
    }).then(() => {
      sendResponse({ status: 'success' });
    }).catch((error) => {
      //~ console.error('Error saving image:', error);
      sendResponse({ status: 'error', error: error });
    });
    return true; // Keep the messaging channel open for sendResponse
  }
  
  if (message.command === 'openOptions') {
    browser.runtime.openOptionsPage();
    sendResponse({ status: 'success' });
    return true;
  }

  if (message.command === 'registerCustomSites') {
    registerCustomSiteScripts(message.patterns)
      .then(() => sendResponse({ status: 'success' }))
      .catch((error) => sendResponse({ status: 'error', error: error.message }));
    return true;
  }

  if (message.command === 'getCustomSitesStatus') {
    getCustomSitesStatus()
      .then((status) => sendResponse(status))
      .catch((error) => sendResponse({ status: 'error', error: error.message }));
    return true;
  }
});

async function registerCustomSiteScripts(patterns) {
  if (!patterns || patterns.length === 0) {
    // Unregister if no patterns
    try {
      await browser.scripting.unregisterContentScripts({ ids: [CUSTOM_SCRIPT_ID] });
    } catch (e) {
      // Ignore if not registered
    }
    return;
  }

  // Unregister existing first
  try {
    await browser.scripting.unregisterContentScripts({ ids: [CUSTOM_SCRIPT_ID] });
  } catch (e) {
    // Ignore
  }

  // Register new scripts for custom patterns
  await browser.scripting.registerContentScripts([{
    id: CUSTOM_SCRIPT_ID,
    matches: patterns,
    js: ['jquery.js', 'util.js', 'settingsModule.js', 'labelsModule.js', 'main.js'],
    css: ['styles.css'],
    runAt: 'document_idle'
  }]);
}

async function getCustomSitesStatus() {
  try {
    const scripts = await browser.scripting.getRegisteredContentScripts({ ids: [CUSTOM_SCRIPT_ID] });
    if (scripts && scripts.length > 0) {
      return { registered: true, patterns: scripts[0].matches };
    }
  } catch (e) {
    // Not registered
  }
  return { registered: false, patterns: [] };
}

// On startup, re-register custom site scripts from saved settings
browser.storage.sync.get('settings').then((result) => {
  if (result.settings && result.settings.customSitePatterns && result.settings.customSitePatterns.length > 0) {
    registerCustomSiteScripts(result.settings.customSitePatterns).catch(console.error);
  }
});
