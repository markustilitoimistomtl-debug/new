const $ = id => document.getElementById(id);
let settings = Object.assign({}, DEFAULTS), tick = null;

for (const [k, r] of Object.entries(RESOLUTIONS)) {
  const o = document.createElement('option');
  o.value = k;
  o.textContent = r.label + (k === DEFAULTS.res ? ' – oletus' : '');
  $('res').appendChild(o);
}

function fill() {
  $('res').value = settings.res;
  $('fps').value = String(settings.fps);
  $('format').value = settings.format;
  $('audio').checked = settings.audio;
  $('exact').checked = settings.exact;
}

function read() {
  settings = {
    res: $('res').value,
    fps: +$('fps').value,
    format: $('format').value,
    audio: $('audio').checked,
    exact: $('exact').checked
  };
  chrome.storage.local.set({ settings });
}

for (const id of ['res', 'fps', 'format', 'audio', 'exact']) $(id).addEventListener('change', read);

function status(text, err) {
  $('status').textContent = text || '';
  $('status').className = 'status' + (err ? ' err' : '');
}

function fmt(ms) {
  const s = Math.floor(ms / 1000), p = n => String(n).padStart(2, '0');
  return (s >= 3600 ? Math.floor(s / 3600) + ':' : '') + p(Math.floor(s / 60) % 60) + ':' + p(s % 60);
}

function mb(b) { return (b / 1048576).toFixed(1).replace('.', ',') + ' Mt'; }

function render(state) {
  const rec = !!(state && state.recording);
  $('setup').hidden = rec;
  $('live').hidden = !rec;
  $('go').textContent = rec ? 'Lopeta ja tallenna' : 'Aloita tallennus';
  $('go').className = rec ? 'stop' : '';
  clearInterval(tick);
  if (rec) {
    const R = RESOLUTIONS[state.res];
    $('liveInfo').textContent = `${R ? R.label : state.res + 'p'} · kaappaus ${state.actual || '?'} · ${(state.mime || '').split(';')[0]}`;
    const upd = () => { $('timer').textContent = fmt(Date.now() - state.startedAt); };
    upd(); tick = setInterval(upd, 500);
  } else if (state && state.error) {
    status(state.error, true);
  } else if (state && state.lastFile) {
    status(`Tallennettu: ${state.lastFile.split('/').pop()} (${mb(state.lastSize || 0)})`);
  }
}

async function refresh() {
  render(await chrome.runtime.sendMessage({ target: 'background', type: 'state' }));
}

$('go').addEventListener('click', async () => {
  $('go').disabled = true;
  status('');
  try {
    const state = await chrome.runtime.sendMessage({ target: 'background', type: 'state' });
    if (state && state.recording) {
      await chrome.runtime.sendMessage({ target: 'background', type: 'stop' });
      status('Tallennetaan tiedostoa…');
      setTimeout(refresh, 800);
    } else {
      read();
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      // the stream id has to be requested here, while the click still counts as a user gesture
      let streamId;
      try {
        streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
      } catch (e) {
        status('Tätä välilehteä ei voi tallentaa: ' + (e.message || e), true);
        return;
      }
      const r = await chrome.runtime.sendMessage({ target: 'background', type: 'start', tab, streamId });
      if (!r || !r.ok) status((r && r.error) || 'Tallennus ei käynnistynyt.', true);
      await refresh();
    }
  } finally {
    $('go').disabled = false;
  }
});

chrome.storage.local.get('settings').then(({ settings: s }) => {
  settings = Object.assign({}, DEFAULTS, s || {});
  fill();
});
refresh();
