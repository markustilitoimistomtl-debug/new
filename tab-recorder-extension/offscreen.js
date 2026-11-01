let recorder = null, stream = null, audioCtx = null, chunks = [], meta = null;

function stamp() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function safeName(t) {
  return (t || 'valilehti').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'valilehti';
}

async function start({ streamId, settings, title }) {
  if (recorder) return { ok: false, error: 'Tallennus on jo käynnissä.' };
  const R = RESOLUTIONS[settings.res] || RESOLUTIONS['1440'];
  const video = {
    mandatory: {
      chromeMediaSource: 'tab',
      chromeMediaSourceId: streamId,
      maxWidth: R.w,
      maxHeight: R.h,
      maxFrameRate: settings.fps,
      minFrameRate: Math.min(settings.fps, 30)
    }
  };
  // Asking for the same minimum makes Chrome render the tab at the full target size
  // (high-DPI capture) instead of the window's own, smaller pixel size.
  if (settings.exact) { video.mandatory.minWidth = R.w; video.mandatory.minHeight = R.h; }
  const audio = settings.audio ? { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } } : false;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video, audio });
  } catch (e) {
    return { ok: false, error: 'Kaappaus estettiin: ' + (e.message || e.name) };
  }

  // Tab capture mutes the tab; play its sound back so you still hear it while recording.
  if (settings.audio && stream.getAudioTracks().length) {
    audioCtx = new AudioContext();
    audioCtx.createMediaStreamSource(stream).connect(audioCtx.destination);
  }

  const mime = pickMime(settings.format, settings.audio && stream.getAudioTracks().length > 0);
  const opts = { videoBitsPerSecond: bitrateFor(settings), audioBitsPerSecond: 192000 };
  if (mime) opts.mimeType = mime;
  try {
    recorder = new MediaRecorder(stream, opts);
  } catch (e) {
    cleanup();
    return { ok: false, error: 'Tallenninta ei voitu luoda: ' + (e.message || e.name) };
  }

  const vs = stream.getVideoTracks()[0].getSettings();
  meta = { res: settings.res, title, ext: (recorder.mimeType || mime).includes('mp4') ? 'mp4' : 'webm' };
  chunks = [];
  recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  recorder.onstop = finish;
  recorder.onerror = e => fail('Tallennusvirhe: ' + (e.error && e.error.message || 'tuntematon'));
  // stop cleanly if the tab is closed or capture ends
  stream.getVideoTracks()[0].addEventListener('ended', () => { if (recorder && recorder.state !== 'inactive') recorder.stop(); });
  recorder.start(1000);

  return { ok: true, actual: `${vs.width}×${vs.height}`, mime: recorder.mimeType || mime };
}

function finish() {
  const type = (recorder && recorder.mimeType) || (meta.ext === 'mp4' ? 'video/mp4' : 'video/webm');
  const blob = new Blob(chunks, { type });
  chunks = [];
  const url = URL.createObjectURL(blob);
  const filename = `Välilehtitallennin/${safeName(meta.title)}_${stamp()}_${meta.res}p.${meta.ext}`;
  cleanup();
  chrome.runtime.sendMessage({ target: 'background', type: 'saved', url, filename, size: blob.size });
}

function fail(error) {
  cleanup();
  chrome.runtime.sendMessage({ target: 'background', type: 'failed', error });
}

function cleanup() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  if (audioCtx) audioCtx.close().catch(() => {});
  stream = null; audioCtx = null; recorder = null;
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.target !== 'offscreen') return;
  if (msg.type === 'start') { start(msg).then(reply); return true; }
  if (msg.type === 'stop') {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    reply({ ok: true });
  }
});
