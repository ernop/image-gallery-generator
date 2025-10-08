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
});
