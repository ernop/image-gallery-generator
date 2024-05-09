//no dependencies.

let settingsModule = {
  lastSavedSettings: null,
  settings:{}, //these are the ones who should be consulted all the time and modified.
  changed:false,
  onSettingPage:true, //just a tracker if we are being called via this other in-browser configuration method.
  loadSettings:async function() { //this populates settings, called at startup.
    //~ settingsModule.optionsHtmlPageInfo(null,"loading settings again.");
    try{
      await browser.storage.sync.get("settings").then((result) => {
        if (result.settings) {
          Object.assign(settingsModule.settings, result.settings);
        }else{
          settingsModule.optionsHtmlPageInfo(null,"got no settings.'");
        }
      });
    }catch{
      let defaultGuy=settingsModule.privateApplyDefaultSettings({});
      settingsModule.settings=defaultGuy;
    }
  },

  saveSettings: function(onSettingsConfigPage) {
    settingsModule.onSettingsConfigPage=onSettingsConfigPage;

    let toSaveSettings
    if (onSettingsConfigPage){
      toSaveSettings = settingsModule.pullSettingsFromHtml();
    }else{
      toSaveSettings = settingsModule.settings;
    }

    if (!util.apiKeyFormatIsValid(toSaveSettings.apiKey) && toSaveSettings.apiKey!='' && toSaveSettings.apiKey!=undefined) {
      settingsModule.optionsHtmlPageInfo("Invalid API key format. But we're saving it anyway because they may change the required format, and it would be very evil of this extension to just overtly refuse to save an apikey even if it were later valid.", null);
    }

    browser.storage.sync.set({ settings: toSaveSettings }).then(() => {
        settingsModule.optionsHtmlPageInfo(null, "Settings saved okay.");
        settingsModule.lastSavedSettings=toSaveSettings;
    })
  },

  //a function to update the output area of the options.html page during config.
  optionsHtmlPageInfo:function(keyRelatedMessage, generalMessage){
    const apiKeyStatusElement = document.getElementById('apiKeyStatus');
    const output = document.getElementById('output');

    if (keyRelatedMessage != null){
      if (settingsModule.onSettingPage){
        apiKeyStatusElement.innerHTML = `${keyRelatedMessage}<hr>${apiKeyStatusElement.innerHTML}`;
      }
    }

    if (generalMessage!= null){
      if (settingsModule.onSettingPage){
        output.innerHTML = `${generalMessage}<hr>${output.innerHTML}`;
      }
    }
  },

  //for slightly better checking on if we actually need to save settings.
  //also it's important to pull keys from candidate, since if the user is a returning, upgraded user with an old settings type object stored,
  //then they may have a sparse settings object, so we want to compare them against the NEW one.
  //hold on why don't i just adjust the name we save options into? well, first of all that would nuke any users settings every time we upgraded which would be very bad.
  settingsAreDifferentThanLastSaved: function(candidateSettings) {
    for (const key in candidateSettings) {
      if (candidateSettings[key] !== settingsModule.lastSavedSettings[key]) {
        return true;
      }
    }
    return false;
  },

  //when you load settings, run it through this, that way if the setting you got from storage is missing a key and its value, it'll be filled in from default.
  privateApplyDefaultSettings:function(settings) {
    const defaultSettings = {
      imageCountShown: true,
      imageFilenameShown: true,
      imageResolutionShown: true,
      imageMegapixelsShown: false,
      preloadLabelShown: false,
      anyImagePreloadedLabelShown: false,
      apiKey: ''  // Default to empty string if no key is stored
    };

    return Object.assign({}, defaultSettings, settings);
  },

  pullSettingsFromHtml:function(){
    const settings= {
      imageCountShown: document.querySelector("#imageCountShown").checked,
      imageFilenameShown: document.querySelector("#imageFilenameShown").checked,
      imageResolutionShown: document.querySelector("#imageResolutionShown").checked,
      imageMegapixelsShown: document.querySelector("#imageMegapixelsShown").checked,
      preloadLabelShown: document.querySelector("#preloadLabelShown").checked,
      anyImagePreloadedLabelShown: document.querySelector("#anyImagePreloadedLabelShown").checked,
      apiKey: document.querySelector("#apiKey").value
    };
    return settings;
  },

  applySettingsToConfigurationPage: function() {
    if (settingsModule.settings && settingsModule.settings!={}){
      //because this is what we just loaded, even though it may not be what should be saved, since they may have been missing defaults.
      settingsModule.lastSavedSettings=settingsModule.settings;
    }
    const settingsToRestore = settingsModule.privateApplyDefaultSettings(settingsModule.settings || {});
    //hmm what happens if i add more settings later, or change them. how does that fit with prior extension users who are upgrading?
    document.querySelector("#imageCountShown").checked = settingsToRestore.imageCountShown;
    document.querySelector("#imageFilenameShown").checked = settingsToRestore.imageFilenameShown;
    document.querySelector("#imageResolutionShown").checked = settingsToRestore.imageResolutionShown;
    document.querySelector("#imageMegapixelsShown").checked = settingsToRestore.imageMegapixelsShown;
    document.querySelector("#preloadLabelShown").checked = settingsToRestore.preloadLabelShown;
    document.querySelector("#anyImagePreloadedLabelShown").checked = settingsToRestore.anyImagePreloadedLabelShown;
    document.querySelector("#apiKey").value = settingsToRestore.apiKey;

    //if we loaded an apikey, hide it by default.
    const apiKeyInput = document.getElementById('apiKey');
    const toggleApiKeyMaskButton = document.getElementById('toggleApiKeyMask');
    if (settingsToRestore.apiKey){
      if (apiKeyInput.type === 'text') {
        apiKeyInput.type = 'password';
        toggleApiKeyMaskButton.textContent = 'Show';
      }
    }
  },

  setSettingsAsHavingUnsavedChanges: function(val){
    settingsModule.changed = val;
    var ss = '';
    if (val==true){
      ss="true";
    }else {
      ss="false";
    }
    document.querySelector("button[type='submit']").dataset.changed = ss;
    document.querySelector("#saveNotice").dataset.changed = ss;
  },

  setupOptionsHtmlPage:async function(){
    await settingsModule.loadSettings();
    console.log("setting up options page, loaded settings (internal):");
    const apiKeyInput = document.getElementById('apiKey');
    const apiKeyStatusElement = document.getElementById('apiKeyStatus');
    document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const candidateSettings = settingsModule.pullSettingsFromHtml();
        settingsModule.setSettingsAsHavingUnsavedChanges(settingsModule.settingsAreDifferentThanLastSaved(candidateSettings));
      });
    });

    apiKeyInput.addEventListener('input', function(e) {
      const candidateSettings = settingsModule.pullSettingsFromHtml();
      settingsModule.setSettingsAsHavingUnsavedChanges(settingsModule.settingsAreDifferentThanLastSaved(candidateSettings));
      const apiKey = apiKeyInput.value.trim();
      if (util.apiKeyFormatIsValid(apiKey)) {
        settingsModule.optionsHtmlPageInfo('<span style="color: green;">&#10004;</span> API key format is valid!', null);
      } else {
        if (apiKey !== ''){
          settingsModule.optionsHtmlPageInfo('<span style="color: red;">&#10006;</span> API key format is invalid!', null);
        }
      }
      e.stopPropagation();
    });

    //set up test button.
    const testButton= document.getElementById('testApiKeyButton');
    testButton.addEventListener('click', async () => {
      console.log("testButton.addEventListener('click'");
      const apiKey = apiKeyInput.value.trim();
      var isUsable = await util.apiKeyIsValidWithOpenAI(apiKey);
      if (isUsable[0]===true){
        settingsModule.optionsHtmlPageInfo(`<span style="color: green;">&#10004;</span> API key worked when calling OpenAI; there are ${isUsable[1]} models in the list.`, null);
      }else{
        settingsModule.optionsHtmlPageInfo(`<span style="color: red;">&#10006;</span>${isUsable[1]}`, null);
      }
    });

    //fix the way we mask
    const toggleApiKeyMaskButton = document.getElementById('toggleApiKeyMask');
    toggleApiKeyMaskButton.addEventListener('click', () => {
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleApiKeyMaskButton.textContent = 'Hide';
      } else {
        apiKeyInput.type = 'password';
        toggleApiKeyMaskButton.textContent = 'Show';
      }
    });

    document.querySelector("form").addEventListener("submit", function(){
      try{
          settingsModule.saveSettings(true);
          document.querySelector("button[type='submit']").dataset.changed = 'false';
          document.querySelector("#saveNotice").dataset.changed = 'false';
          changed=false;
      } catch (error) {
          settingsModule.optionsHtmlPageInfo(null, `failed to save options. ${error}`);
      }
    });

    //load the old settings and fire initial validation.
    try{
      settingsModule.applySettingsToConfigurationPage();
      //fake input event to force checking apiKey format even on load.
      //still weird, this should happen automatically since we theoretically have set up the form already, and then restoreSettings
      //is sticking stuff in the input, which should trigger the automatic checking...
      document.getElementById('apiKey').dispatchEvent(new Event('input'));
    } catch (error) {
      settingsModule.optionsHtmlPageInfo(null, "failed to restore options."+ error)

      //default to what they are now at least.
      settingsModule.lastSavedSettings = settingsModule.pullSettingsFromHtml();
      document.getElementById('apiKey').dispatchEvent(new Event('input'));
    }
  }
}

let setupCount=0;
if (document.getElementById("galleryWGOptionsBody")!=null){
  setupCount++;
  //~ console.log("setting up page since i referenced global settingsModule.", document.URL, setupCount);
  settingsModule.setupOptionsHtmlPage();
}else{
  //~ console.log("NOT setting up page since am not who I think i am", document.URL);
};
