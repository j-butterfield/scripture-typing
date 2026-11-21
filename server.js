// Scripture Typing Trainer - tiny web server with no dependencies.
// Serves the app and keeps every child's progress in one JSON file (DATA_DIR/db.json).
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadBible, search as searchBible } from './bible.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PORT = Number(process.env.PORT || 8080);
const MAX_BODY = 2 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

let bible = null;
function getBible() {
  if (!bible) bible = loadBible(path.join(ROOT, 'bible', 'kjv.json'));
  return bible;
}

const emptyDb = () => ({ version: 1, profiles: [], results: [], passages: [] });

// ---------- storage ----------
let db = null;
let writeChain = Promise.resolve();

async function loadDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    db = { ...emptyDb(), ...JSON.parse(await fs.readFile(DB_FILE, 'utf8')) };
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // Keep the unreadable file instead of overwriting it.
      const backup = `${DB_FILE}.corrupt-${Date.now()}`;
      await fs.rename(DB_FILE, backup).catch(() => {});
      console.error(`Could not read ${DB_FILE}; moved it to ${backup}`);
    }
    db = emptyDb();
  }
}

function saveDb() {
  const snapshot = JSON.stringify(db, null, 2);
  writeChain = writeChain.then(async () => {
    const tmp = `${DB_FILE}.tmp`;
    await fs.writeFile(tmp, snapshot);
    await fs.rename(tmp, DB_FILE);
  }).catch((err) => console.error('Save failed:', err));
  return writeChain;
}

// ---------- validation helpers ----------
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};
const id = () => crypto.randomUUID();

function cleanSettings(s = {}) {
  return {
    easyMode: Boolean(s.easyMode),
    stopOnError: s.stopOnError === undefined ? true : Boolean(s.stopOnError),
    showKeyboard: s.showKeyboard === undefined ? true : Boolean(s.showKeyboard),
    sound: Boolean(s.sound),
    unlockLessons: Boolean(s.unlockLessons),
    goalWpm: num(s.goalWpm ?? 20, 1, 200),
  };
}

function cleanProfile(body, existing = {}) {
  return {
    id: existing.id || id(),
    name: str(body.name ?? existing.name, 40) || 'Typist',
    avatar: str(body.avatar ?? existing.avatar, 12) || 'bunny',
    color: /^#[0-9a-f]{6}$/i.test(body.color ?? '') ? body.color : existing.color || '#2a78d6',
    settings: cleanSettings({ ...existing.settings, ...body.settings }),
    createdAt: existing.createdAt || new Date().toISOString(),
  };
}

function cleanResult(b) {
  const missed = {};
  if (b.missed && typeof b.missed === 'object') {
    for (const [k, v] of Object.entries(b.missed).slice(0, 100)) {
      if (k.length === 1) missed[k] = num(v, 0, 100000);
    }
  }
  return {
    id: id(),
    profileId: str(b.profileId, 64),
    date: new Date().toISOString(),
    mode: ['test', 'lesson'].includes(b.mode) ? b.mode : 'practice',
    kind: ['timed', 'passage', 'lesson'].includes(b.kind) ? b.kind : 'passage',
    passageIds: Array.isArray(b.passageIds) ? b.passageIds.slice(0, 50).map((x) => str(x, 64)) : [],
    refs: str(b.refs, 300),
    completed: Boolean(b.completed),
    easyMode: Boolean(b.easyMode),
    seconds: num(b.seconds, 0, 36000),
    wpm: num(b.wpm, 0, 400),
    rawWpm: num(b.rawWpm, 0, 400),
    accuracy: num(b.accuracy, 0, 100),
    correctChars: num(b.correctChars, 0, 1e6),
    keystrokes: num(b.keystrokes, 0, 1e6),
    errors: num(b.errors, 0, 1e6),
    missed,
  };
}

function cleanPassage(b) {
  const text = str(b.text, 3000).replace(/\s+/g, ' ');
  const ref = str(b.ref, 80);
  if (!text || !ref) return null;
  return { id: `custom-${id()}`, ref, text, translation: str(b.translation, 20), createdAt: new Date().toISOString() };
}

// ---------- http ----------
function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isJson ? MIME['.json'] : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Too large'), { status: 413 });
    chunks.push(c);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Bad JSON'), { status: 400 });
  }
}

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // drop "api"
  const [resource, itemId] = parts;
  const m = req.method;

  if (resource === 'health') return send(res, 200, { ok: true });
  if (resource === 'state' && m === 'GET') return send(res, 200, db);
  if (resource === 'bible' && m === 'GET') return send(res, 200, searchBible(getBible(), url.searchParams.get('q'), url.searchParams.get('mode')));

  if (resource === 'profiles') {
    if (m === 'POST' && !itemId) {
      const p = cleanProfile(await readBody(req));
      db.profiles.push(p);
      await saveDb();
      return send(res, 201, p);
    }
    const idx = db.profiles.findIndex((p) => p.id === itemId);
    if (idx < 0) return send(res, 404, { error: 'Profile not found' });
    if (m === 'PATCH') {
      db.profiles[idx] = cleanProfile(await readBody(req), db.profiles[idx]);
      await saveDb();
      return send(res, 200, db.profiles[idx]);
    }
    if (m === 'DELETE') {
      db.profiles.splice(idx, 1);
      db.results = db.results.filter((r) => r.profileId !== itemId);
      await saveDb();
      return send(res, 204, '');
    }
  }

  if (resource === 'results' && m === 'POST') {
    const r = cleanResult(await readBody(req));
    if (!db.profiles.some((p) => p.id === r.profileId)) return send(res, 400, { error: 'Unknown profile' });
    db.results.push(r);
    await saveDb();
    return send(res, 201, r);
  }

  if (resource === 'passages') {
    if (m === 'POST' && !itemId) {
      const p = cleanPassage(await readBody(req));
      if (!p) return send(res, 400, { error: 'Reference and text are required' });
      db.passages.push(p);
      await saveDb();
      return send(res, 201, p);
    }
    if (m === 'DELETE' && itemId) {
      db.passages = db.passages.filter((p) => p.id !== itemId);
      await saveDb();
      return send(res, 204, '');
    }
  }

  if (resource === 'import' && m === 'POST') {
    const b = await readBody(req);
    if (!Array.isArray(b.profiles) || !Array.isArray(b.results)) return send(res, 400, { error: 'Not a backup file' });
    const profiles = b.profiles.map((p) => ({ ...cleanProfile(p), id: str(p.id, 64) || id(), createdAt: str(p.createdAt, 40) || new Date().toISOString() }));
    const known = new Set(profiles.map((p) => p.id));
    const results = b.results
      .filter((r) => known.has(r.profileId))
      .map((r) => ({ ...cleanResult(r), date: str(r.date, 40) || new Date().toISOString() }));
    const passages = (b.passages || []).map(cleanPassage).filter(Boolean);
    db = { ...emptyDb(), profiles, results, passages };
    await saveDb();
    return send(res, 200, db);
  }

  return send(res, 404, { error: 'Not found' });
}

async function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, 'Forbidden');
  try {
    const data = await fs.readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(data);
  } catch {
    send(res, 404, 'Not found');
  }
}

export async function createServer() {
  await loadDb();
  try { getBible(); } catch (err) { console.error('Could not load the Bible for search:', err.message); }
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
      return await serveStatic(req, res, url);
    } catch (err) {
      if (!res.headersSent) send(res, err.status || 500, { error: err.status ? err.message : 'Server error' });
      if (!err.status) console.error(err);
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createServer();
  server.listen(PORT, () => {
    console.log(`Scripture Typing Trainer running on http://localhost:${PORT}`);
    if (process.env.PUBLIC_URL) console.log(`Family opens:  ${process.env.PUBLIC_URL}`);
    console.log(`Saving progress to ${DB_FILE}`);
  });
  const stop = () => writeChain.finally(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);

  // On the NAS: Scripture-Typing-nas-update.bat copies the new version over and leaves a
  // note (RESTART_FILE). Finding it, the server saves and exits, and Container Station
  // ("restart: unless-stopped") starts it straight back up on the new files.
  if (process.env.RESTART_FILE) {
    const marker = path.resolve(ROOT, process.env.RESTART_FILE);
    // Files made here stay writable by the NAS administrators group, so they can be tidied over the network.
    try { process.umask(0o002); } catch { /* not supported on this system */ }
    // A note already waiting is from an update copied while the app was stopped: this start is already on it.
    await fs.unlink(marker).catch(() => {});
    setInterval(async () => {
      try { await fs.access(marker); } catch { return; }
      await fs.unlink(marker).catch(() => {});
      console.log('An update was copied over - restarting onto it...');
      server.close();
      stop();
    }, 3000).unref();
  }
}
