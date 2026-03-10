# 4Chan Gallery Viewer WG - Agent Guidelines

This is a Firefox browser extension that adds gallery mode to 4chan threads. Start here to understand the project.

## What This Extension Does

Transforms 4chan thread browsing into a fullscreen gallery experience:
- Click "GalleryMode WG6" link in thread navigation to enter gallery
- Navigate images/videos with keyboard, mouse wheel, or mouse side buttons
- Fast-save images with a single keypress
- Toggle metadata overlays (resolution, filename, count)
- Distraction-free mode hides all UI
- Optional loop navigation (wrap around at ends)
- User-configurable custom site support

**Target users**: People browsing image-heavy threads on 4chan who want faster navigation than the default thread view.

## Architecture

```
manifest.json     - Extension config (Manifest v3)
main.js           - Core gallery logic, UI, event handling
labelsModule.js   - Label definitions + keyboard shortcuts (data-driven)
settingsModule.js - Settings persistence via browser.storage.sync
background.js     - Background script for downloads API
util.js           - Small utility functions
styles.css        - Gallery overlay styling
options.html      - Settings page
jquery.js         - jQuery 3.7.1 (bundled, but options.html uses CDN)
```

### Key Design Pattern

Keyboard shortcuts and labels are defined in a single `labels` array in `labelsModule.js`. Each entry specifies:
- `id`, `shortcut`, `action`, `content`, `condition`, `help`

Adding a new shortcut = adding an object to this array. No other wiring needed.

### State Management

`globalState` object in `main.js` holds all runtime state:
- `imageUrls`, `imageTypes`, `originalImageNames` - scraped from page
- `displayedImageIndex` - current position
- `galleryOn`, `distractionFreeMode`, `helpShown` - UI state
- `preloadCount` - preloading progress

## Development

### Testing Locally

1. Open `about:debugging` in Firefox
2. Click "This Firefox" > "Load Temporary Add-on"
3. Select `manifest.json`
4. Navigate to any 4chan thread to test

---

## Releasing a New Version

### Prerequisites (one-time)

1. Mozilla account with developer access
2. Logged in at: https://addons.mozilla.org/developers/

### Steps to Release

**1. Update version number in `manifest.json`:**
```json
"version": "0.0.26"
```

**2. Create the zip package:**
```powershell
# From the extension directory
$files = @("manifest.json", "main.js", "labelsModule.js", "settingsModule.js", "background.js", "util.js", "styles.css", "options.html", "jquery.js", "icon.png", "README.md")
Compress-Archive -Path $files -DestinationPath gallery-wg.zip -Force
```

**3. Upload to AMO:**
1. Go to: https://addons.mozilla.org/developers/addon/4chan-gallery-mode-wg/versions
2. Click "Upload New Version"
3. Upload `gallery-wg.zip`
4. Fill in release notes (what changed)
5. Submit for review

**4. Wait for review:**
- Usually 1-2 days for updates to existing extensions
- Check status at the developer dashboard

### After Approval

Users with the extension installed will get the update automatically (Firefox checks periodically), or they can manually check: `about:addons` → gear icon → "Check for Updates"

### Quick Release Command

```powershell
# One-liner to package (run from extension directory)
$v = (Get-Content manifest.json | ConvertFrom-Json).version; $files = @("manifest.json", "main.js", "labelsModule.js", "settingsModule.js", "background.js", "util.js", "styles.css", "options.html", "jquery.js", "icon.png", "README.md"); Compress-Archive -Path $files -DestinationPath "gallery-wg-$v.zip" -Force; Write-Host "Created gallery-wg-$v.zip"
```

---

## User Feedback (from Mozilla Add-ons reviews)

| Issue | Status |
|-------|--------|
| MP4 not supported | Fixed in v0.0.24 |
| Permissions concerns (OpenAI) | Removed in v0.0.22 |
| Download permission questions | Expected - needed for fast-save feature |

## Principles

1. **Keyboard-first** - Every action should be possible without mouse
2. **Non-intrusive** - Extension only activates when user clicks gallery link
3. **Fast** - Preloading ensures smooth navigation
4. **Simple permissions** - Only request what's needed, explain why

## Known Limitations

- Preloading doesn't work well for videos (browser limitation)
- Works on boards.4chan.org and boards.4channel.org by default
- Custom sites can be added via Options → Custom Sites (user grants permission per domain)

## Future Ideas

- Different gallery layouts
- Sort/search by filename
- Filter by filesize/resolution
- Autoplay mode for videos
- Batch download

## Quick Reference

| Shortcut | Action |
|----------|--------|
| Arrow keys / Mouse wheel | Navigate |
| Mouse back/forward buttons | Navigate |
| Home / End | Jump to first/last |
| PageUp / PageDown | Jump 5 images |
| Ctrl+Arrow | Jump halfway |
| s | Fast save |
| d | Distraction-free mode |
| c, n, r, m, p | Toggle labels |
| ? | Help |
| Escape | Exit gallery |
| o | Open options |

## Options

| Setting | Description |
|---------|-------------|
| Show Count/Filename/Resolution/Megapixels | Toggle overlay labels |
| Loop navigation | Wrap around at first/last image |
| Custom Sites | Add domains for archive sites etc. |

---

*Extension ID: {2381ef0e-653b-4549-b953-27124405c12e}*
*License: MIT*
*Mozilla Add-ons: https://addons.mozilla.org/firefox/addon/4chan-gallery-mode-wg/*
