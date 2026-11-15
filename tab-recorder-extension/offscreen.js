let recorder = null, stream = null, audioCtx = null, chunks = [], meta = null, recTabId = null;

function stamp() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function safeName(t) {
  return (t || 'valilehti').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'valilehti';
}

function videoConstraints(streamId, res, fps, exact) {
  const R = RESOLUTIONS[res] || RESOLUTIONS['1440'];
  const video = {
    mandatory: {
      chromeMediaSource: 'tab',
      chromeMediaSourceId: streamId,
      maxWidth: R.w,
      maxHeight: R.h,
      maxFrameRate: fps,
      minFrameRate: Math.min(fps, 30)
    }
  };
  // Asking for the same minimum makes Chrome render the tab at the full target size
  // (high-DPI capture) instead of the window's own, smaller pixel size.
  if (exact) { video.mandatory.minWidth = R.w; video.mandatory.minHeight = R.h; }
  return video;
}

// Named work: exactly "name.ext". Otherwise tab title + time + resolution.
function fileName(job, title, res, ext) {
  const base = job ? safeName(job) : `${safeName(title)}_${stamp()}_${res}p`;
  return `Välilehtitallennin/${base}.${ext}`;
}

async function start({ streamId, settings, title, tabId }) {
  if (recorder) return { ok: false, error: 'Tallennus on jo käynnissä.' };
  const video = videoConstraints(streamId, settings.res, settings.fps, settings.exact);
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
  meta = { res: settings.res, title, job: (settings.jobName || '').trim(), ext: (recorder.mimeType || mime).includes('mp4') ? 'mp4' : 'webm' };
  chunks = [];
  recTabId = tabId;
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
  const filename = fileName(meta.job, meta.title, meta.res, meta.ext);
  cleanup();
  chrome.runtime.sendMessage({ target: 'background', type: 'saved', url, filename, size: blob.size });
}

// Cancel: stop without saving anything; the recorded data is thrown away.
function cancel() {
  if (!recorder) return { ok: false, error: 'Tallennus ei ole käynnissä.' };
  if (recorder.state === 'inactive') return { ok: false, error: 'Tallennus on jo päättymässä, sitä ei voi enää peruuttaa.' };
  recorder.onstop = null;
  recorder.ondataavailable = null;
  recorder.onerror = null;
  recorder.stop();
  chunks = [];
  cleanup();
  return { ok: true };
}

/* ============ screenshot (JPG) ============ */

// Draw one real frame of a video track onto a canvas and encode it as JPG.
async function frameToJpeg(track, quality, skipFrames) {
  const v = document.createElement('video');
  v.muted = true;
  v.srcObject = new MediaStream([track]);
  await v.play();
  // a fresh capture can start with a blank frame: wait a few frames first
  for (let i = 0; i < skipFrames; i++) {
    await new Promise(r => v.requestVideoFrameCallback ? v.requestVideoFrameCallback(() => r()) : setTimeout(r, 50));
  }
  const c = document.createElement('canvas');
  c.width = v.videoWidth; c.height = v.videoHeight;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(v, 0, 0, c.width, c.height);
  v.pause(); v.srcObject = null;
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', Math.max(0.5, Math.min(1, quality / 100))));
  if (!blob) throw new Error('JPG-pakkaus epäonnistui');
  // a data URL survives closing this document, unlike a blob URL
  const url = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(blob);
  });
  return { url, size: blob.size, w: c.width, h: c.height };
}

async function screenshot({ streamId, settings, title, tabId }) {
  let track, temp = null, res = settings.shotRes;
  try {
    if (recorder && stream && tabId === recTabId) {
      // the tab is already being recorded and can't be captured twice: use the recording's picture
      track = stream.getVideoTracks()[0].clone();
      res = meta.res;
    } else {
      if (!streamId) return { ok: false, error: 'Kaappaustunnus puuttuu.' };
      temp = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints(streamId, settings.shotRes, 30, settings.exact),
        audio: false
      });
      track = temp.getVideoTracks()[0];
    }
    const shot = await frameToJpeg(track, settings.shotQuality, temp ? 3 : 1);
    const filename = fileName((settings.jobName || '').trim(), title, res, 'jpg');
    return { ok: true, url: shot.url, filename, size: shot.size, actual: `${shot.w}×${shot.h}` };
  } catch (e) {
    return { ok: false, error: 'Kuvakaappaus epäonnistui: ' + (e.message || e.name || e) };
  } finally {
    if (track) track.stop();
    if (temp) temp.getTracks().forEach(t => t.stop());
  }
}

function fail(error) {
  cleanup();
  chrome.runtime.sendMessage({ target: 'background', type: 'failed', error });
}

function cleanup() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  if (audioCtx) audioCtx.close().catch(() => {});
  stream = null; audioCtx = null; recorder = null; recTabId = null;
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.target !== 'offscreen') return;
  if (msg.type === 'start') { start(msg).then(reply); return true; }
  if (msg.type === 'screenshot') { screenshot(msg).then(reply); return true; }
  if (msg.type === 'cancel') { reply(cancel()); return; }
  if (msg.type === 'stop') {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    reply({ ok: true });
  }
});
