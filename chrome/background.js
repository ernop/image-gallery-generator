const CUSTOM_SCRIPT_ID = 'gallery-wg-custom-sites';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === 'openOptions') {
    chrome.runtime.openOptionsPage(() => {
      sendResponse({ status: 'success' });
    });
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
    try {
      await chrome.scripting.unregisterContentScripts({ ids: [CUSTOM_SCRIPT_ID] });
    } catch (e) { /* ignore */ }
    return;
  }

  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CUSTOM_SCRIPT_ID] });
  } catch (e) { /* ignore */ }

  await chrome.scripting.registerContentScripts([{
    id: CUSTOM_SCRIPT_ID,
    matches: patterns,
    js: ['browser-polyfill.js', 'jquery.js', 'util.js', 'settingsModule.js', 'labelsModule.js', 'main.js'],
    css: ['styles.css'],
    runAt: 'document_idle'
  }]);
}

async function getCustomSitesStatus() {
  try {
    const scripts = await chrome.scripting.getRegisteredContentScripts({ ids: [CUSTOM_SCRIPT_ID] });
    if (scripts && scripts.length > 0) {
      return { registered: true, patterns: scripts[0].matches };
    }
  } catch (e) { /* not registered */ }
  return { registered: false, patterns: [] };
}

chrome.storage.sync.get('settings', (result) => {
  if (result.settings && result.settings.customSitePatterns && result.settings.customSitePatterns.length > 0) {
    registerCustomSiteScripts(result.settings.customSitePatterns).catch(console.error);
  }
});
