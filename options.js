(function() {
  let lastSavedSettings=null;

  function updateOutput(keyRelatedMessage, generalMessage){
    const apiKeyStatusElement = document.getElementById('apiKeyStatus');
    const output = document.getElementById('outputA');
    
    if (keyRelatedMessage!= null){
      apiKeyStatusElement .innerHTML = `${keyRelatedMessage}<hr>${apiKeyStatusElement.innerHTML}`;
    }
    
    if (generalMessage!= null){
      output.innerHTML = `${generalMessage}<hr>${output.innerHTML}`;
    }
  }

  const apiKeyRegex = /^sk-[a-zA-Z0-9]{48}$/;  
  
  function formatIsValid(apiKey) {
    return apiKeyRegex.test(apiKey);
  }
  
  //for slightly better checking on if we actually need to save settings.
  function settingsAreDifferent(candidateSettings, lastSavedSettings) {
    for (const key in candidateSettings) {
      if (candidateSettings[key] !== lastSavedSettings[key]) {
        //~ updateOutput(null, `${candidateSettings[key]}!==${lastSavedSettings[key]} key=${key}`);
        return true; // Found a difference, so return true
      }
    }
    return false; // No differences found, so return false
  }
  
  function pullSettings(){
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
  }
  
  function saveSettings() {
    const settings=pullSettings();
    if (!formatIsValid(settings.apiKey)) {
      document.getElementById('apiKeyStatus').textContent='';
      updateOutput("Invalid API key format. but we're saving it anyway cause you never know whats gonna happen.", null);
    }

    browser.storage.sync.set({ settings: settings }).then(() => {
        updateOutput(null, "Settings saved okay.");
        lastSavedSettings=settings;
    }).catch((error) => {
        updateOutput(null, "Error saving settings:" + error);
    });
  }

  function restoreSettings() {
    return browser.storage.sync.get("settings").then((result) => {
      if (result.settings) {
        lastSavedSettings=result.settings;
        document.querySelector("#imageCountShown").checked = result.settings.imageCountShown;
        document.querySelector("#imageFilenameShown").checked = result.settings.imageFilenameShown;
        document.querySelector("#imageResolutionShown").checked = result.settings.imageResolutionShown;
        document.querySelector("#imageMegapixelsShown").checked = result.settings.imageMegapixelsShown;
        document.querySelector("#preloadLabelShown").checked = result.settings.preloadLabelShown;
        document.querySelector("#anyImagePreloadedLabelShown").checked = result.settings.anyImagePreloadedLabelShown;
        document.querySelector("#apiKey").value = result.settings.apiKey;
        
        //if we loaded an apikey, hide it by default. 
        const apiKeyInput = document.getElementById('apiKey');
        const toggleApiKeyMaskButton = document.getElementById('toggleApiKeyMask');
        if (result.settings.apiKey!='' && result.settings.apiKey!= null && result.settings.apiKey!=undefined){
          if (apiKeyInput.type === 'text') {
            apiKeyInput.type = 'password';
            toggleApiKeyMaskButton.textContent = 'Show';
          }
        }
      } else {
        updateOutput(null, 'No settings loaded. using default.');
      }
    }).catch((error) => {
      updateOutput(null, "Error restoring settings: " + error.message);
    });
  }

    async function keyIsUsable(apiKey){
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
    }

    let changed = false;
    document.addEventListener("DOMContentLoaded", async function() {
      
      //set up monitoring for format of entered apikeys.
      //theory: the number one blocker for this is just not understanding whta it is or why things might not work.
      //todo: is this UI enough to cover cases where they *do* have an apikey, but it's unpaid so is being blocked for that reason?
      //ideally, we'd tell them that level of detail, too.
      const apiKeyInput = document.getElementById('apiKey');
      
      //monitor (badly) if anything "changes" and tell the user.
      const apiKeyStatusElement = document.getElementById('apiKeyStatus');
      document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
          const candidateSettings = pullSettings();
          if (settingsAreDifferent(candidateSettings, lastSavedSettings)){
            changed = true;
            document.querySelector("button[type='submit']").dataset.changed = 'true';
            document.querySelector("#saveNotice").dataset.changed = 'true';
          }else{
            changed=false;
            document.querySelector("button[type='submit']").dataset.changed = 'false';
            document.querySelector("#saveNotice").dataset.changed = 'false';
          }
        });
      });

      apiKeyInput.addEventListener('input', function(e) {
        const candidateSettings = pullSettings();
        if (settingsAreDifferent(candidateSettings, lastSavedSettings)){
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
          updateOutput('<span style="color: green;">&#10004;</span> API key format is valid!', null);
        } else {
          updateOutput('<span style="color: red;">&#10006;</span> API key format is invalid!', null);
        }
        e.stopPropagation();
      });

      //set up test button.
      const testButton= document.getElementById('testApiKeyButton');
      testButton.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        var isUsable = await keyIsUsable(apiKey);
        if (isUsable[0]===true){
          updateOutput(`<span style="color: green;">&#10004;</span> API key worked when calling OpenAI; there are ${isUsable[1]} models in the list.`, null);
        }else{
          updateOutput(`<span style="color: red;">&#10006;</span>${isUsable[1]}`, null);
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
      
      
      //load the old settings and fire initial validation.
      try{
        await restoreSettings();
        //fake input event to force checking apiKey format even on load.
        //still weird, this should happen automatically since we theoretically have set up the form already, and then restoreSettings 
        //is sticking stuff in the input, which should trigger the automatic checking...
        document.getElementById('apiKey').dispatchEvent(new Event('input'));
      } catch (error) {
          updateOutput(null, "failed to restore options."+ error)
          
          //default to what they are now at least.
          lastSavedSettings=pullSettings();
      }
      
      document.querySelector("form").addEventListener("submit", function(){
        try{
            saveSettings();
            changed=false;
        } catch (error) {
            updateOutput(null, "failed to save options." + error );
        }
      });
    });    
})()


