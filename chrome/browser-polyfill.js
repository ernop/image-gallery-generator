/**
 * Minimal browser.* polyfill for Chrome.
 * Maps Firefox's promise-based browser.* API to Chrome's chrome.* API.
 */
if (typeof globalThis.browser === "undefined") {
  const wrap = (chromeObj) => {
    if (!chromeObj) return chromeObj;
    return new Proxy(chromeObj, {
      get(target, prop) {
        const val = target[prop];
        if (typeof val === "function") {
          return (...args) => {
            return new Promise((resolve, reject) => {
              try {
                target[prop](...args, (...cbArgs) => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                  } else {
                    resolve(cbArgs.length <= 1 ? cbArgs[0] : cbArgs);
                  }
                });
              } catch (e) {
                reject(e);
              }
            });
          };
        }
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          return wrap(val);
        }
        return val;
      }
    });
  };

  const handler = {
    get(target, prop) {
      if (prop === "runtime") {
        return new Proxy(chrome.runtime, {
          get(rtTarget, rtProp) {
            if (rtProp === "getManifest") return chrome.runtime.getManifest.bind(chrome.runtime);
            if (rtProp === "sendMessage") {
              return (...args) => new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(...args, (response) => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                  } else {
                    resolve(response);
                  }
                });
              });
            }
            if (rtProp === "openOptionsPage") {
              return () => new Promise((resolve, reject) => {
                chrome.runtime.openOptionsPage(() => {
                  if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                  else resolve();
                });
              });
            }
            if (rtProp === "onMessage") return chrome.runtime.onMessage;
            if (rtProp === "id") return chrome.runtime.id;
            const val = rtTarget[rtProp];
            if (typeof val === "function") return val.bind(rtTarget);
            return val;
          }
        });
      }
      if (prop === "storage") {
        return {
          sync: wrap(chrome.storage.sync),
          local: wrap(chrome.storage.local),
          onChanged: chrome.storage.onChanged
        };
      }
      if (prop === "downloads") {
        return wrap(chrome.downloads);
      }
      if (prop === "permissions") {
        return wrap(chrome.permissions);
      }
      if (prop === "scripting") {
        return {
          registerContentScripts: (...args) => new Promise((resolve, reject) => {
            chrome.scripting.registerContentScripts(...args, () => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else resolve();
            });
          }),
          unregisterContentScripts: (...args) => new Promise((resolve, reject) => {
            chrome.scripting.unregisterContentScripts(...args, () => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else resolve();
            });
          }),
          getRegisteredContentScripts: (...args) => new Promise((resolve, reject) => {
            chrome.scripting.getRegisteredContentScripts(...args, (scripts) => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else resolve(scripts);
            });
          })
        };
      }
      const chromeVal = chrome[prop];
      if (typeof chromeVal === "object" && chromeVal !== null) {
        return wrap(chromeVal);
      }
      return chromeVal;
    }
  };

  globalThis.browser = new Proxy({}, handler);
}
