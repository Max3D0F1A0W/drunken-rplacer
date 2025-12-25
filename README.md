<h1 align="center">
  <img style="width: 10%" stlye="" src="https://upload.wikimedia.org/wikipedia/commons/0/0e/Place_2022.svg"/>

  Drunken rplacer
</h1>

<h2 align="center">
  [!WARNING]
</h2>

<p align="center">
  Educational purposes, people, educational purposes.

  This bot is still in development and should not be used in harmful ways, ruining others' work for your own benefits. It's main purpose is researching rplace.live's vulnerabilities and reporting them to the developer team.
</p>

## Usage:
1. Clone the repo or download its code as a ZIP-file and unpack it in any directory
2. Navigate to `chrome://extensions/` in any Chromium-based browser and turn on developer mode
3. Load the folder containing `manifest.json` via the button `Load unpacked`
4. Put your template anywhere in the extension's directory (it's recommended to pre-dither it using any tools beforehand)
5. Edit `placement.json` to configure the bot: set the coordinates for the template, enable unattended mode, choose a pixel selection algorithm and more.
6. Visit rplace.live and the bot will automatically start moving to the places where the pixels need to be placed

## How does it work:
Aside from rplace.live-specific quirks, it heavily relies on the Chrome API, specifically the debugger API to synthesize trusted events.

The web standard specifies the `isTrusted` field for events such as `keydown`, `mouse` and others. This way web-developers can detect fake keystrokes to prevent cheating, which is exactly what rplace.live uses. However, the debugger can be used to fire an event that has this field set to `true`, meaning it will bypass this check.

However, this requires a service worker, since the debugger field is not available from a content script. It's also used to reload the page.

This way the bot can move around and place pixels without the need to emulate keys system-wide (like it's done with AHK and PyAutoGUI).

## The banner vexes me:
To remove the banner warning about the browser being debugged, launch the browser with the `--silent-debugger-extension-api` command-line parameter.
Note: if the browser is already launched, nothing will change.