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
    justification: 'Tallentaa välilehden kuvan ja äänen MediaRecorderilla.'
  });
}

async function start(tab, streamId) {
  const state = await getState();
  if (state.recording) return { ok: false, error: 'Tallennus on jo käynnissä.' };
  if (!tab || !tab.id) return { ok: false, error: 'Aktiivista välilehteä ei löytynyt.' };
  if (/^(chrome|edge|about|chrome-extension):/.test(tab.url || '')) {
    return { ok: false, error: 'Selaimen omia sivuja ei voi tallentaa.' };
  }
  const settings = await getSettings();
  if (!streamId) streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
  await ensureOffscreen();
  const res = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'start', streamId, settings, title: tab.title || '' });
  if (!res || !res.ok) return res || { ok: false, error: 'Tallennuksen aloitus epäonnistui.' };
  await setState({ recording: true, startedAt: Date.now(), tabId: tab.id, res: settings.res, actual: res.actual, mime: res.mime });
  return res;
}

async function stop() {
  const state = await getState();
  if (!state.recording) return { ok: true };
  await chrome.runtime.sendMessage({ target: 'offscreen', type: 'stop' });
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.target !== 'background') return;
  (async () => {
    switch (msg.type) {
      case 'start': return start(msg.tab, msg.streamId);
      case 'stop': return stop();
      case 'state': return getState();
      case 'saved': {
        // the offscreen document hands over the finished file
        let error;
        try {
          const id = await chrome.downloads.download({ url: msg.url, filename: msg.filename, saveAs: false });
          await chrome.storage.session.set({ pendingDownload: id });
        } catch (e) {
          error = 'Tiedoston tallennus epäonnistui: ' + (e.message || e);
        }
        await setState({ recording: false, lastFile: msg.filename, lastSize: msg.size, error });
        return { ok: true };
      }
      case 'failed':
        await setState({ recording: false, error: msg.error });
        chrome.offscreen.closeDocument().catch(() => {});
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
  if (!(await getState()).recording) chrome.offscreen.closeDocument().catch(() => {});
});

chrome.commands.onCommand.addListener(async (command, tab) => {
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
