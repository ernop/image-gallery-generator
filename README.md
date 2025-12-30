v0.0.26 changes:
1. Mouse side button navigation (back/forward buttons)
2. Loop navigation option (wrap around at first/last image)
3. Custom site support — add your own domains in Options, extension requests permission dynamically
4. Redesigned Options page with dark theme
5. Simplified domain input — just type "example.com", auto-expands to match all subdomains
6. Cleaned up permissions (removed unused contextMenus, activeTab)

v0.0.24 changes:
1. Migrated to Manifest v3 for Firefox
2. Added MP4 and GIFV video support (addresses user feedback)
3. Cleaned up CSS

v0.0.23 changes: removed AI stuff. Now back to just showing the images. And some other little fixes and stuff that people have asked for.

v0.0.22 changes:
1. fix AI image description lookup. q looks up, and it displays, and also stores forever.

v0.0.21 changes:
1. fast save of an image using a keyboard shortcut (s), so you don't have to right-click save and pick the location - it just saves to your default download folder. there are also notifs.
2. fixed webm display, which had temporarily been broken!
3. fixed preloading so hopefully it works better now. Still doesn't work for webm, really.
4. reset vertical scroll position to top when exiting the gallery
5. improved appearance of the font.
6. switched indexing on count variable from 0-based to 1-based.
7. the name of the gallery mode on the replies page now contains a suffix M/N where M is the number of images in the thread, and N is the number of videos.

# image-gallery-generator

# TODO
* different layouts?
* sort/search by filename/order/etc
* filters by filesize/resolution
* autoplay mode for videos
* batch download

# Gallery Mode Extension for Firefox

This Firefox extension enhances the browsing experience on a specific website by providing a gallery mode for viewing images and videos. It allows users to easily navigate through the available media files, provides keyboard shortcuts for convenience, and displays relevant labels with additional information.

## Features

- Enables a gallery mode for viewing images and videos on supported websites
- Seamless navigation through media files using keyboard shortcuts or mouse wheel
- Displays informative labels with metadata about the currently viewed media
- Preloads upcoming images for smooth transitions
- Automatically detects and handles different media types (images and videos)
- Customizable settings for label display and behavior