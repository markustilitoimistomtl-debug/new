# TabRec

Chrome/Edge extension that records the active browser tab (video and audio) and takes JPG screenshots.
Resolution is selectable, default **1440p (2560×1440)**.

## Install

1. Download and **unzip** `TabRec.zip` (Chrome can't load the zip itself).
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and choose the unzipped `tabrec` folder.
5. Pin the red dot icon to the toolbar.

Keep the folder: Chrome runs the extension from it. Requires Chrome 116 or newer.

## Use

1. Open the page to record and click the TabRec icon.
2. Optional **Project name** (e.g. `Demo part 1`). The file is then named exactly that plus the
   extension: `Demo part 1.mp4`, screenshots `Demo part 1.jpg`. If the file already exists Chrome
   adds a number (`Demo part 1 (1).mp4`). Left empty, the name is the tab title + date, time and
   resolution. Enter in the name field starts recording.
3. Settings:
   - **Resolution**: 720p, 1080p, **1440p (default)** or 4K
   - **Frame rate**: 60 or 30 fps
   - **File format**: Automatic (MP4 if supported, otherwise WebM), MP4, WebM or **MP3 (audio only)**.
     With MP3 only the tab's sound is recorded; choose the bitrate (320 / **192 default** / 128 kbps).
     Cancel and project name work the same way.
   - **Record tab audio** on/off
   - **Exact 16:9 size**: the video is exactly the chosen size, with black bars if the page has
     another shape. Off: the aspect ratio is kept and the resolution is an upper limit.
4. **Start recording**. The icon shows `REC` while recording.
5. **Stop and save**, or **Alt+Shift+R** (also starts).
6. **Cancel (don't save)** or **Alt+Shift+X** stops at once and throws the recording away.

## Screenshot (JPG)

- **📷 Take screenshot (JPG)** or **Alt+Shift+S**.
- Own settings: resolution (**default 1440p**) and JPG quality (default 92 %).
- The tab is rendered directly at the chosen size, so the image is sharp, not upscaled.
- While recording MP3 on the same tab, the screenshot is the visible tab at window size.
- During a video recording the screenshot is taken from the recorded picture, so its size is the
  recording's resolution (a tab can't be captured twice at once).

Everything is saved to the `TabRec` folder in Downloads.

## Why the video is sharp

Chrome's tab capture defaults to a small size. TabRec asks the capture for the chosen size as both
minimum and maximum, so Chrome renders the tab at that size instead of upscaling a small picture.
Bitrate follows the resolution (1440p60 ≈ 24 Mbit/s). Tab audio still plays through the speakers
while recording.

## Third-party

MP3 encoding uses [lamejs](https://github.com/zhuker/lamejs) 1.2.1 (`vendor/lame.min.js`, LGPL-3.0),
a JavaScript port of [LAME](https://lame.sourceforge.io/). See `vendor/lamejs-LICENSE.txt`.
