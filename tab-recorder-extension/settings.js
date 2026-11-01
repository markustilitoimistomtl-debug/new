// Shared defaults and option tables (loaded by popup, background and offscreen).
const RESOLUTIONS = {
  '720':  { w: 1280, h: 720,  label: '720p (HD)' },
  '1080': { w: 1920, h: 1080, label: '1080p (Full HD)' },
  '1440': { w: 2560, h: 1440, label: '1440p (QHD)' },
  '2160': { w: 3840, h: 2160, label: '2160p (4K)' }
};

// Video bitrate (bits/s) at 60 fps; 30 fps uses ~65 % of this.
const BITRATES = { '720': 8e6, '1080': 14e6, '1440': 24e6, '2160': 45e6 };

const DEFAULTS = {
  res: '1440',     // default resolution
  fps: 60,
  exact: true,     // exact 16:9 frame size (black bars if the page has another shape)
  audio: true,
  format: 'auto'   // auto = MP4 if the browser supports it, otherwise WebM
};

function bitrateFor(s) {
  const b = BITRATES[s.res] || BITRATES['1440'];
  return Math.round(s.fps >= 60 ? b : b * 0.65);
}

function pickMime(format, audio) {
  const mp4 = audio
    ? ['video/mp4;codecs=avc1.640033,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4']
    : ['video/mp4;codecs=avc1.640033', 'video/mp4;codecs=avc1', 'video/mp4'];
  const webm = audio
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const order = format === 'webm' ? webm : format === 'mp4' ? mp4.concat(webm) : mp4.concat(webm);
  return order.find(m => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || '';
}
