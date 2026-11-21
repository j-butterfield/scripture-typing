import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let server, base, dir;

before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'stt-'));
  process.env.DATA_DIR = dir;
  const { createServer } = await import('../server.js');
  server = await createServer();
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.close(); await fs.rm(dir, { recursive: true, force: true }); });

const call = async (method, url, body) => {
  const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  return { status: res.status, body: res.status === 204 ? null : await res.json().catch(() => null) };
};

test('profiles, results and passages round-trip and persist to disk', async () => {
  const p = await call('POST', '/api/profiles', { name: 'Anna', avatar: '🐑', settings: { goalWpm: 15 } });
  assert.equal(p.status, 201);
  assert.equal(p.body.settings.goalWpm, 15);
  assert.equal(p.body.settings.stopOnError, true);

  const r = await call('POST', '/api/results', { profileId: p.body.id, mode: 'test', kind: 'timed', wpm: 22, accuracy: 96.5, seconds: 60, missed: { e: 2, toolong: 5 } });
  assert.equal(r.status, 201);
  assert.deepEqual(r.body.missed, { e: 2 });

  assert.equal((await call('POST', '/api/results', { profileId: 'nope' })).status, 400);
  assert.equal((await call('POST', '/api/passages', { ref: '', text: 'x' })).status, 400);
  const v = await call('POST', '/api/passages', { ref: 'Romans 12:12', text: 'Rejoicing in hope;  patient in tribulation;' });
  assert.equal(v.body.text, 'Rejoicing in hope; patient in tribulation;');

  await new Promise((res) => setTimeout(res, 50));
  const disk = JSON.parse(await fs.readFile(path.join(dir, 'db.json'), 'utf8'));
  assert.equal(disk.profiles.length, 1);
  assert.equal(disk.results.length, 1);
  assert.equal(disk.passages.length, 1);

  await call('DELETE', `/api/profiles/${p.body.id}`);
  const s = await call('GET', '/api/state');
  assert.equal(s.body.profiles.length, 0);
  assert.equal(s.body.results.length, 0);
});

test('serves the app and blocks path traversal', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Scripture Typing/);
  const bad = await fetch(`${base}/..%2fserver.js`);
  assert.notEqual(bad.status, 200);
});
