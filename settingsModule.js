//no dependencies.

const ERRORS = {
  SETTINGS_LOAD_FAILED: 'Failed to load settings. Using defaults.',
  SETTINGS_SAVE_FAILED: 'Failed to save settings. Please try again.',
};

const SUCCESS = {
  SETTINGS_SAVED: 'Settings saved successfully.',
};

let settingsModule = {
  lastSavedSettings: null,
  settings:{}, //these are the ones who should be consulted all the time and modified.
  changed:false,
  onSettingPage:true, //just a tracker if we are being called via this other in-browser configuration method.
  loadSettings:async function() { //this populates settings, called at startup.
    try{
      await browser.storage.sync.get("settings").then((result) => {
        if (result.settings) {
          settingsModule.settings = settingsModule.privateApplyDefaultSettings(result.settings);
          console.log('Settings loaded successfully');
        }else{
          console.info('No saved settings found, using defaults');
          settingsModule.settings = settingsModule.privateApplyDefaultSettings({});
        }
      });
    }catch(error){
      console.error(ERRORS.SETTINGS_LOAD_FAILED, error);
      settingsModule.optionsHtmlPageInfo(ERRORS.SETTINGS_LOAD_FAILED);
      settingsModule.settings = settingsModule.privateApplyDefaultSettings({});
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

    browser.storage.sync.set({ settings: toSaveSettings }).then(() => {
        if (onSettingsConfigPage) {
          settingsModule.optionsHtmlPageInfo(SUCCESS.SETTINGS_SAVED);
        }
        settingsModule.lastSavedSettings=toSaveSettings;
        console.log('Settings saved successfully');
    }).catch((error) => {
        if (onSettingsConfigPage) {
          settingsModule.optionsHtmlPageInfo(`${ERRORS.SETTINGS_SAVE_FAILED}: ${error.message}`);
        }
        console.error(ERRORS.SETTINGS_SAVE_FAILED, error);
    })
  },

  //a function to update the output area of the options.html page during config.
  optionsHtmlPageInfo:function(generalMessage){
    const output = document.getElementById('output');

    if (generalMessage!= null){
      if (settingsModule.onSettingPage){
        if (output&&output!=null){
          output.innerHTML = `${generalMessage}<hr>${output.innerHTML}`;
        }
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
  defaultDisplayOrder: [
    "imageCount", "imageFilename", "imageResolution",
    "imageMegapixels", "postTime", "preloadLabel", "anyImagePreloadedLabel"
  ],

  privateApplyDefaultSettings:function(settings) {
    const defaultSettings = {
      imageCountShown: true,
      imageFilenameShown: true,
      imageResolutionShown: true,
      imageMegapixelsShown: false,
      preloadLabelShown: false,
      anyImagePreloadedLabelShown: false,
      helpButtonShown: true,
      progressBarShown: true,
      postTimeShown: false,
      postTextShown: false,
      displayOrder: settingsModule.defaultDisplayOrder,
      loopNavigation: false,
      customSitePatterns: [],
    };

    const merged = Object.assign({}, defaultSettings, settings);

    if (!merged.displayOrder || merged.displayOrder.length === 0) {
      merged.displayOrder = settingsModule.defaultDisplayOrder;
    }

    return merged;
  },

  pullSettingsFromHtml:function(){
    const settings= {
      imageCountShown: document.querySelector("#imageCountShown").checked,
      imageFilenameShown: document.querySelector("#imageFilenameShown").checked,
      imageResolutionShown: document.querySelector("#imageResolutionShown").checked,
      imageMegapixelsShown: document.querySelector("#imageMegapixelsShown").checked,
      preloadLabelShown: document.querySelector("#preloadLabelShown").checked,
      anyImagePreloadedLabelShown: document.querySelector("#anyImagePreloadedLabelShown").checked,
      helpButtonShown: document.querySelector("#helpButtonShown").checked,
      progressBarShown: document.querySelector("#progressBarShown").checked,
      postTimeShown: document.querySelector("#postTimeShown").checked,
      postTextShown: document.querySelector("#postTextShown").checked,
      loopNavigation: document.querySelector("#loopNavigation").checked,
      customSitePatterns: settingsModule.getCustomSitePatternsFromHtml(),
    };
    return settings;
  },

  getCustomSitePatternsFromHtml: function() {
    const textarea = document.querySelector("#customSitePatterns");
    if (!textarea) return [];
    const rawLines = textarea.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    
    // Expand each line into proper match patterns
    const patterns = [];
    for (const line of rawLines) {
      patterns.push(...settingsModule.expandToMatchPatterns(line));
    }
    return [...new Set(patterns)]; // Remove duplicates
  },

  // Expands a user-friendly input into proper match patterns
  // Input: "x.com" or "https://x.com" or "*://x.com/*"
  // Output: ["*://x.com/*", "*://*.x.com/*"]
  expandToMatchPatterns: function(input) {
    let domain = input.trim();
    
    // Already a proper match pattern? Return as-is
    if (domain.includes('*://') && domain.endsWith('/*')) {
      return [domain];
    }
    
    // Strip protocol if present
    domain = domain.replace(/^https?:\/\//, '');
    domain = domain.replace(/^\*:\/\//, '');
    
    // Strip leading wildcard subdomain if present
    domain = domain.replace(/^\*\./, '');
    
    // Strip trailing path/wildcards
    domain = domain.replace(/\/\*$/, '');
    domain = domain.replace(/\/.*$/, '');
    
    // Strip leading/trailing dots
    domain = domain.replace(/^\.+|\.+$/g, '');
    
    if (!domain || !domain.includes('.')) {
      return []; // Invalid domain
    }
    
    // Generate patterns for base domain and all subdomains
    return [
      `*://${domain}/*`,
      `*://*.${domain}/*`
    ];
  },

  applySettingsToConfigurationPage: function() {
    const settingsToRestore = settingsModule.privateApplyDefaultSettings(settingsModule.settings || {});
    settingsModule.lastSavedSettings = settingsToRestore;
    //hmm what happens if i add more settings later, or change them. how does that fit with prior extension users who are upgrading?
    document.querySelector("#imageCountShown").checked = settingsToRestore.imageCountShown;
    document.querySelector("#imageFilenameShown").checked = settingsToRestore.imageFilenameShown;
    document.querySelector("#imageResolutionShown").checked = settingsToRestore.imageResolutionShown;
    document.querySelector("#imageMegapixelsShown").checked = settingsToRestore.imageMegapixelsShown;
    document.querySelector("#preloadLabelShown").checked = settingsToRestore.preloadLabelShown;
    document.querySelector("#anyImagePreloadedLabelShown").checked = settingsToRestore.anyImagePreloadedLabelShown;
    document.querySelector("#helpButtonShown").checked = settingsToRestore.helpButtonShown;
    document.querySelector("#progressBarShown").checked = settingsToRestore.progressBarShown;
    document.querySelector("#postTimeShown").checked = settingsToRestore.postTimeShown;
    document.querySelector("#postTextShown").checked = settingsToRestore.postTextShown;
    document.querySelector("#loopNavigation").checked = settingsToRestore.loopNavigation;
    
    const patternsTextarea = document.querySelector("#customSitePatterns");
    if (patternsTextarea) {
      patternsTextarea.value = (settingsToRestore.customSitePatterns || []).join('\n');
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
    const topNotice = document.querySelector("#saveNoticeTop");
    if (topNotice) topNotice.dataset.changed = ss;
  },

  setupOptionsHtmlPage:async function(){
    await settingsModule.loadSettings();
    console.log("setting up options page, loaded settings (internal):");

    //load the old settings first, before attaching change listeners
    try{
      settingsModule.applySettingsToConfigurationPage();
    } catch (error) {
      settingsModule.optionsHtmlPageInfo(`Failed to restore saved settings. Using current values. Error: ${error.message}`);
      console.error('Error restoring settings to UI:', error);

      //default to what they are now at least.
      settingsModule.lastSavedSettings = settingsModule.pullSettingsFromHtml();
    }

    settingsModule.setSettingsAsHavingUnsavedChanges(false);

    // Now attach change listeners after initial values are set
    document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const candidateSettings = settingsModule.pullSettingsFromHtml();
        settingsModule.setSettingsAsHavingUnsavedChanges(settingsModule.settingsAreDifferentThanLastSaved(candidateSettings));
      });
    });

    // Track changes in textarea too
    const patternsTextarea = document.querySelector("#customSitePatterns");
    if (patternsTextarea) {
      patternsTextarea.addEventListener('input', () => {
        const candidateSettings = settingsModule.pullSettingsFromHtml();
        settingsModule.setSettingsAsHavingUnsavedChanges(settingsModule.settingsAreDifferentThanLastSaved(candidateSettings));
        
        // Update steps: if textarea has content, highlight step 2 (grant permission)
        const hasContent = patternsTextarea.value.trim().length > 0;
        settingsModule.updateCustomSitesSteps(hasContent ? 1 : 0);
        
        // Clear status when editing
        const statusEl = document.querySelector("#customSitesStatus");
        if (statusEl) statusEl.textContent = "";
      });
    }

    // Handle custom sites button
    const enableBtn = document.querySelector("#enableCustomSites");
    if (enableBtn) {
      enableBtn.addEventListener('click', settingsModule.handleEnableCustomSites);
    }

    document.querySelector("form").addEventListener("submit", function(e){
      e.preventDefault();
      try{
          settingsModule.saveSettings(true);
          document.querySelector("button[type='submit']").dataset.changed = 'false';
          document.querySelector("#saveNotice").dataset.changed = 'false';
          const topNotice = document.querySelector("#saveNoticeTop");
          if (topNotice) topNotice.dataset.changed = 'false';
          changed=false;
          
          // Also register the custom site scripts after saving
          settingsModule.registerCustomSitesAfterSave();
          
          // Mark all steps done if custom sites were configured
          const patterns = settingsModule.getCustomSitePatternsFromHtml();
          if (patterns.length > 0) {
            settingsModule.updateCustomSitesSteps(3);
          }
      } catch (error) {
          settingsModule.optionsHtmlPageInfo(`${ERRORS.SETTINGS_SAVE_FAILED}: ${error.message}`);
          console.error('Error saving settings:', error);
      }
    });

    // Update custom sites status display
    settingsModule.updateCustomSitesStatus();
  },

  handleEnableCustomSites: async function() {
    const patterns = settingsModule.getCustomSitePatternsFromHtml();
    const statusEl = document.querySelector("#customSitesStatus");
    
    if (patterns.length === 0) {
      statusEl.textContent = " ⚠️ Enter domain first";
      settingsModule.updateCustomSitesSteps(0);
      return;
    }

    statusEl.textContent = " Requesting...";

    try {
      const granted = await browser.permissions.request({ origins: patterns });

      if (granted) {
        statusEl.textContent = " ✓ Granted — now Save (Firefox permissions tab needs manual refresh to show)";
        settingsModule.updateCustomSitesSteps(2);
        settingsModule.setSettingsAsHavingUnsavedChanges(true);
      } else {
        statusEl.textContent = " ✗ Permission denied";
        settingsModule.updateCustomSitesSteps(1);
      }
    } catch (error) {
      statusEl.textContent = ` ✗ ${error.message}`;
      settingsModule.updateCustomSitesSteps(1);
    }
  },

  updateCustomSitesSteps: function(completedStep) {
    const steps = document.querySelectorAll("#customSitesSteps li");
    if (!steps.length) return;
    
    steps.forEach((li, i) => {
      li.classList.remove('done', 'current');
      if (i < completedStep) {
        li.classList.add('done');
      } else if (i === completedStep) {
        li.classList.add('current');
      }
    });
  },

  registerCustomSitesAfterSave: async function() {
    const patterns = settingsModule.getCustomSitePatternsFromHtml();
    const statusEl = document.querySelector("#customSitesStatus");

    try {
      const response = await browser.runtime.sendMessage({
        command: 'registerCustomSites',
        patterns: patterns
      });

      if (response.status === 'success') {
        if (patterns.length > 0) {
          statusEl.textContent = ` ✓ Active on ${patterns.length} custom site(s)`;
        } else {
          statusEl.textContent = "";
        }
      } else {
        statusEl.textContent = ` ✗ Registration failed: ${response.error}`;
      }
    } catch (error) {
      statusEl.textContent = ` ✗ Error: ${error.message}`;
    }
  },

  updateCustomSitesStatus: async function() {
    const statusEl = document.querySelector("#customSitesStatus");
    if (!statusEl) return;

    try {
      const response = await browser.runtime.sendMessage({ command: 'getCustomSitesStatus' });
      if (response.registered && response.patterns.length > 0) {
        statusEl.textContent = ` ✓ Active on ${response.patterns.length} custom site(s)`;
      }
    } catch (error) {
      // Ignore
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
