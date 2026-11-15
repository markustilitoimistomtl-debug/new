importScripts('settings.js');

const OFFSCREEN = 'offscreen.html';

async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return Object.assign({}, DEFAULTS, settings || {});
}

async function getState() {
  const { state } = await chrome.storage.session.get('state');
  return state || { recording: false };
}

async function setState(state) {
  await chrome.storage.session.set({ state });
  await chrome.action.setBadgeText({ text: state.recording ? 'REC' : '' });
  if (state.recording) await chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
}

async function ensureOffscreen() {
  const ctx = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (ctx.length) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN,
    reasons: ['USER_MEDIA', 'AUDIO_PLAYBACK', 'BLOBS'],
    justification: 'Records the tab video and audio with MediaRecorder.'
  });
}

async function start(tab, streamId) {
  const state = await getState();
  if (state.recording) return { ok: false, error: 'A recording is already running.' };
  if (!tab || !tab.id) return { ok: false, error: 'No active tab found.' };
  if (/^(chrome|edge|about|chrome-extension):/.test(tab.url || '')) {
    return { ok: false, error: 'Browser pages can\'t be recorded.' };
  }
  const settings = await getSettings();
  if (!streamId) streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
  await ensureOffscreen();
  const res = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'start', streamId, settings, title: tab.title || '', tabId: tab.id });
  if (!res || !res.ok) return res || { ok: false, error: 'Could not start recording.' };
  await setState({ recording: true, startedAt: Date.now(), tabId: tab.id, res: settings.res, audioOnly: !!res.audioOnly, jobName: (settings.jobName || '').trim(), actual: res.actual, mime: res.mime });
  return res;
}

async function stop() {
  const state = await getState();
  if (!state.recording) return { ok: true };
  await chrome.runtime.sendMessage({ target: 'offscreen', type: 'stop' });
  return { ok: true };
}

// Close the offscreen document only when nothing in it is still needed.
async function closeOffscreenIfIdle() {
  const { pendingDownload } = await chrome.storage.session.get('pendingDownload');
  if (pendingDownload != null) return;
  if ((await getState()).recording) return;
  chrome.offscreen.closeDocument().catch(() => {});
}

async function cancel() {
  const state = await getState();
  if (!state.recording) return { ok: false, error: 'No recording is running.' };
  const res = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'cancel' }).catch(() => null);
  // if the offscreen document is gone, the recording is gone too: just clear the state
  if (res && !res.ok && /already finishing/.test(res.error || '')) return res;
  await setState({ recording: false, cancelled: true });
  await closeOffscreenIfIdle();
  return { ok: true };
}

async function screenshot(tab, streamId) {
  if (!tab || !tab.id) return { ok: false, error: 'No active tab found.' };
  if (/^(chrome|edge|about|chrome-extension):/.test(tab.url || '')) {
    return { ok: false, error: 'Browser pages can\'t be captured.' };
  }
  const state = await getState();
  const settings = await getSettings();
  // a tab that is being recorded can't be captured a second time; the recording's stream is used instead
  const sameTab = state.recording && state.tabId === tab.id;
  if (sameTab && state.audioOnly) {
    // MP3 recording has no picture: take a plain screenshot of the visible tab (window size)
    try {
      const url = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: settings.shotQuality });
      const name = (settings.jobName || '').trim();
      const p = n => String(n).padStart(2, '0'), d = new Date();
      const st = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
      const base = (name || tab.title || 'tab').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'tab';
      const filename = `TabRec/${name ? base : base + '_' + st}.jpg`;
      await chrome.downloads.download({ url, filename, saveAs: false, conflictAction: 'uniquify' });
      return { ok: true, filename, size: Math.round(url.length * 0.75), actual: 'window size' };
    } catch (e) {
      return { ok: false, error: 'Screenshot failed: ' + (e.message || e) };
    }
  }
  if (!sameTab && !streamId) streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
  await ensureOffscreen();
  const res = await chrome.runtime.sendMessage({
    target: 'offscreen', type: 'screenshot',
    streamId: sameTab ? null : streamId, settings, title: tab.title || '', tabId: tab.id
  });
  if (!res || !res.ok) { await closeOffscreenIfIdle(); return res || { ok: false, error: 'Screenshot failed.' }; }
  try {
    await chrome.downloads.download({ url: res.url, filename: res.filename, saveAs: false, conflictAction: 'uniquify' });
  } catch (e) {
    await closeOffscreenIfIdle();
    return { ok: false, error: 'Could not save the image: ' + (e.message || e) };
  }
  await closeOffscreenIfIdle();
  return { ok: true, filename: res.filename, size: res.size, actual: res.actual };
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.target !== 'background') return;
  (async () => {
    switch (msg.type) {
      case 'start': return start(msg.tab, msg.streamId);
      case 'stop': return stop();
      case 'cancel': return cancel();
      case 'screenshot': return screenshot(msg.tab, msg.streamId);
      case 'state': return getState();
      case 'saved': {
        // the offscreen document hands over the finished file
        let error;
        try {
          const id = await chrome.downloads.download({ url: msg.url, filename: msg.filename, saveAs: false, conflictAction: 'uniquify' });
          await chrome.storage.session.set({ pendingDownload: id });
        } catch (e) {
          error = 'Could not save the file: ' + (e.message || e);
        }
        await setState({ recording: false, lastFile: msg.filename, lastSize: msg.size, error });
        return { ok: true };
      }
      case 'failed':
        await setState({ recording: false, error: msg.error });
        await closeOffscreenIfIdle();
        return { ok: true };
    }
  })().then(reply, e => reply({ ok: false, error: String(e && e.message || e) }));
  return true;
});

// The blob lives in the offscreen document: close it only once the download has finished,
// and never while a new recording is running.
chrome.downloads.onChanged.addListener(async d => {
  if (!d.state || d.state.current === 'in_progress') return;
  const { pendingDownload } = await chrome.storage.session.get('pendingDownload');
  if (d.id !== pendingDownload) return;
  await chrome.storage.session.remove('pendingDownload');
  await closeOffscreenIfIdle();
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'cancel-recording') { await cancel(); return; }
  if (command === 'screenshot') {
    if (!tab) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const r = await screenshot(tab).catch(e => ({ ok: false, error: String(e && e.message || e) }));
    if (!r.ok) console.warn(r.error);
    return;
  }
  if (command !== 'toggle-recording') return;
  const state = await getState();
  if (state.recording) await stop();
  else {
    if (!tab) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const r = await start(tab);
    if (!r.ok) console.warn(r.error);
  }
});

// If the browser restarted mid-recording, clear the stale state.
chrome.runtime.onStartup.addListener(() => setState({ recording: false }));
