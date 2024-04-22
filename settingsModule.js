let settingsModule={
  lastSavedSettings: null,
  activeSettings:{},
  changed:false,
  loadSettings:async function() {
    browser.storage.sync.get("settings").then((result) => {
      if (result.settings) {
        Object.assign(this.activeSettings, result.settings);
      }
    });
  },
  saveSettings: function(areOnOptionsPage) {
    let toSaveSettings = this.applyDefaultSettings(this.activeSettings);
    this.lastSavedSettings=toSaveSettings;
    
    if (!formatIsValid(toSaveSettings.apiKey)) {
      document.getElementById('apiKeyStatus').textContent='';
      optionsHtmlPageInfo("Invalid API key format. But we're saving it anyway because they may change the required format, and it would be very evil of this extension to just overtly refuse to save an apikey even if it were later valid.", null);
    }
    if (areOnOptionsPage){
      browser.storage.sync.set({ settings: toSaveSettings }).then(() => {
          optionsHtmlPageInfo(null, "Settings saved okay.");
          lastSavedSettings= toSaveSettings
      }).catch((error) => {
          optionsHtmlPageInfo(null, "Error saving settings:" + error);
      });
    }else{
      browser.storage.sync.set({ settings: toSaveSettings });
    }
  },

  //a function to update the output area of the options.html page during config.
  optionsHtmlPageInfo:function(keyRelatedMessage, generalMessage){
    const apiKeyStatusElement = document.getElementById('apiKeyStatus');
    const output = document.getElementById('output');
    
    if (keyRelatedMessage!= null){
      apiKeyStatusElement.innerHTML = `${keyRelatedMessage}<hr>${apiKeyStatusElement.innerHTML}`;
    }
    
    if (generalMessage!= null){
      output.innerHTML = `${generalMessage}<hr>${output.innerHTML}`;
    }
  },
   
  //for slightly better checking on if we actually need to save settings.
  //also it's important to pull keys from candidate, since if the user is a returning, upgraded user with an old settings type object stored,
  //then they may have a sparse settings object, so we want to compare them against the NEW one.
  //hold on why don't i just adjust the name we save options into? well, first of all that would nuke any users settings every time we upgraded which would be very bad.
  settingsAreDifferentThanLastSaved: function(candidateSettings) {
    for (const key in candidateSettings) {
      if (candidateSettings[key] !== lastSavedSettings[key]) {
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
  
  loadSettingsFromBrowserMemoryIntoConfigPage:async function() {
    let settings = await this.loadSettings();
    if (settings){
      //because this is what we just loaded, even though it may not be what should be saved, since they may have been missing defaults.
      lastSavedSettings=result.settings;
    }
    
    const settingsToRestore = this.privateApplyDefaultSettings(settings.settings || {});
    
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
    } else {
      optionsHtmlPageInfo(null, 'No settings loaded. using default.');
    }
  },

  apiKeyIsValidWithOpenAI: async function (apiKey){
    let apiUrl = "https://api.openai.com/v1/models";
    let apiOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    };

    try{
      const response = await fetch(apiUrl, apiOptions)
      var responseJson = await response.json();
      if (response.ok){
        return [true, responseJson.data.length];
      }else{
        return [false, responseJson.error.message];
      }
    }catch (error) {
      return [false, error];
    }
    return false,'xxx';
  },
  
  setSettingsAreChangedStatus: function(val){
    console.log("settings are:"+toString(val));
    this.changed = val;
    document.querySelector("button[type='submit']").dataset.changed = toString(val);
    document.querySelector("#saveNotice").dataset.changed = toString(val);
  },
  
  setupOptionsHtmlPage:async function(){
    console.log("Q");
    document.addEventListener("DOMContentLoaded", async function() {
      console.log("DOMContentLoaded");
      //set up monitoring for format of entered apikeys.
      const apiKeyInput = document.getElementById('apiKey');
      const apiKeyStatusElement = document.getElementById('apiKeyStatus');
      document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
          const candidateSettings = pullSettingsFromHtml();
          setSettingsAreChangedStatus(settingsAreDifferentThanLastSaved(candidateSettings));
        });
      });

      apiKeyInput.addEventListener('input', function(e) {
        console.log("apik input");
        const candidateSettings = pullSettingsFromHtml();
        if (settingsAreDifferentThanLastSaved(candidateSettings)){
          changed=true;
          document.querySelector("button[type='submit']").dataset.changed = 'true';
          document.querySelector("#saveNotice").dataset.changed = 'true';
        }else{
          changed=false;
          document.querySelector("button[type='submit']").dataset.changed = 'false';
          document.querySelector("#saveNotice").dataset.changed = 'false';
        }
        const apiKey = apiKeyInput.value.trim();
        if (apiKey===''){
          return;
        }
        if (formatIsValid(apiKey)) {
          optionsHtmlPageInfo('<span style="color: green;">&#10004;</span> API key format is valid!', null);
        } else {
          optionsHtmlPageInfo('<span style="color: red;">&#10006;</span> API key format is invalid!', null);
        }
        e.stopPropagation();
      });

      //set up test button.
      const testButton= document.getElementById('testApiKeyButton');
      testButton.addEventListener('click', async () => {
        console.log("testButton.addEventListener('click'");
        const apiKey = apiKeyInput.value.trim();
        var isUsable = await apiKeyIsValidWithOpenAI(apiKey);
        if (isUsable[0]===true){
          optionsHtmlPageInfo(`<span style="color: green;">&#10004;</span> API key worked when calling OpenAI; there are ${isUsable[1]} models in the list.`, null);
        }else{
          optionsHtmlPageInfo(`<span style="color: red;">&#10006;</span>${isUsable[1]}`, null);
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
      
      console.log("buttin stuf set.up.)");
      
      //load the old settings and fire initial validation.
      try{
        await this.loadSettingsFromBrowserMemoryIntoConfigPage();
        //fake input event to force checking apiKey format even on load.
        //still weird, this should happen automatically since we theoretically have set up the form already, and then restoreSettings 
        //is sticking stuff in the input, which should trigger the automatic checking...
        document.getElementById('apiKey').dispatchEvent(new Event('input'));
      } catch (error) {
        optionsHtmlPageInfo(null, "failed to restore options."+ error)
        
        //default to what they are now at least.
        lastSavedSettings=pullSettingsFromHtml();
      }
      
      document.querySelector("form").addEventListener("submit", function(){
        try{
            this.saveSettings();
            document.querySelector("button[type='submit']").dataset.changed = 'false';
            document.querySelector("#saveNotice").dataset.changed = 'false';
            changed=false;
        } catch (error) {
            optionsHtmlPageInfo(null, `failed to save options. ${error}`);
        }
      });
    });    
    console.log("Z");
  }
}