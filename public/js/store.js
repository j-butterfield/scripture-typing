// Data layer. Uses the NAS server when it is there (progress shared across every
// computer in the house); falls back to this browser's storage when opened as a plain file.

const LOCAL_KEY = 'scripture-typing-trainer';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const empty = () => ({ version: 1, profiles: [], results: [], passages: [] });

async function http(method, url, body) {
  // The server restarts for a few seconds after a NAS update, so a dropped connection is retried.
  let res;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      break;
    } catch {
      if (attempt >= 4) throw new Error('could not reach the server');
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (!res.ok) {
    let msg = `${res.status}`;
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

function defaultSettings(s = {}) {
  return { easyMode: false, stopOnError: true, showKeyboard: true, sound: false, unlockLessons: false, goalWpm: 20, ...s };
}

class Store {
  constructor() {
    this.state = empty();
    this.remote = false;
  }

  async init() {
    try {
      const res = await fetch('api/health', { cache: 'no-store' });
      this.remote = res.ok;
    } catch { this.remote = false; }
    if (this.remote) {
      this.state = await http('GET', 'api/state');
    } else {
      try { this.state = { ...empty(), ...JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') }; }
      catch { this.state = empty(); }
    }
  }

  async refresh() {
    if (this.remote) this.state = await http('GET', 'api/state');
  }

  saveLocal() {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(this.state)); } catch { /* storage full or blocked */ }
  }

  get profiles() { return this.state.profiles; }
  get customPassages() { return this.state.passages; }
  profile(id) { return this.state.profiles.find((p) => p.id === id); }
  resultsFor(profileId) { return this.state.results.filter((r) => r.profileId === profileId); }

  async addProfile(data) {
    let p;
    if (this.remote) p = await http('POST', 'api/profiles', data);
    else {
      p = { id: uid(), name: data.name || 'Typist', avatar: data.avatar || '🐑', color: data.color || '#2a78d6',
        settings: defaultSettings(data.settings), createdAt: new Date().toISOString() };
    }
    this.state.profiles.push(p);
    this.saveLocal();
    return p;
  }

  async updateProfile(id, data) {
    const i = this.state.profiles.findIndex((p) => p.id === id);
    if (i < 0) return null;
    let p;
    if (this.remote) p = await http('PATCH', `api/profiles/${encodeURIComponent(id)}`, data);
    else {
      const cur = this.state.profiles[i];
      p = { ...cur, ...data, settings: defaultSettings({ ...cur.settings, ...data.settings }) };
    }
    this.state.profiles[i] = p;
    this.saveLocal();
    return p;
  }

  async deleteProfile(id) {
    if (this.remote) await http('DELETE', `api/profiles/${encodeURIComponent(id)}`);
    this.state.profiles = this.state.profiles.filter((p) => p.id !== id);
    this.state.results = this.state.results.filter((r) => r.profileId !== id);
    this.saveLocal();
  }

  async addResult(data) {
    const r = this.remote
      ? await http('POST', 'api/results', data)
      : { ...data, id: uid(), date: new Date().toISOString() };
    this.state.results.push(r);
    this.saveLocal();
    return r;
  }

  async addPassage(data) {
    const p = this.remote
      ? await http('POST', 'api/passages', data)
      : { id: `custom-${uid()}`, ref: data.ref.trim(), text: data.text.trim().replace(/\s+/g, ' '),
          translation: data.translation || '', createdAt: new Date().toISOString() };
    this.state.passages.push(p);
    this.saveLocal();
    return p;
  }

  async deletePassage(id) {
    if (this.remote) await http('DELETE', `api/passages/${encodeURIComponent(id)}`);
    this.state.passages = this.state.passages.filter((p) => p.id !== id);
    this.saveLocal();
  }

  async importAll(data) {
    if (!Array.isArray(data.profiles) || !Array.isArray(data.results)) throw new Error('That is not a backup file.');
    if (this.remote) this.state = await http('POST', 'api/import', data);
    else this.state = { ...empty(), ...data };
    this.saveLocal();
  }
}

export const store = new Store();
