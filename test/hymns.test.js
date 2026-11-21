import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HYMNS } from '../public/js/hymns-data.js';

test('every hymn is complete and playable', () => {
  assert.ok(HYMNS.length >= 15);
  for (const h of HYMNS) {
    assert.ok(h.title && h.bpm > 30 && h.bpm < 200 && h.notes.length > 20, h.id);
    for (const [p, len] of h.notes) assert.ok((p === 0 || (p >= 48 && p <= 96)) && len > 0, `${h.id} note ${p}/${len}`);
    const total = h.notes.reduce((n, x) => n + x[1], 0);
    for (const [sym, pos] of h.chords) assert.ok(/^[A-G]/.test(sym) && pos >= 0 && pos < total, `${h.id} chord ${sym}@${pos}`);
  }
});

test('no hymn still under copyright', () => {
  const ids = HYMNS.map((h) => h.id);
  assert.ok(!ids.includes('great-is-thy-faithfulness'));
  assert.ok(!ids.includes('this-little-light'));
});

test('every chord symbol becomes a real chord', async () => {
  const { parseChord } = await import('../public/js/harmony.js');
  const N = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = (m) => N[m % 12];
  for (const sym of new Set(HYMNS.flatMap((h) => h.chords.map((c) => c[0])))) {
    const c = parseChord(sym);
    assert.ok(c, `could not read chord ${sym}`);
    assert.equal(name(c.root), sym.match(/^[A-G]#?/)[0], `${sym} root`);
    if (sym.includes('/')) assert.equal(name(c.bass), sym.split('/')[1], `${sym} bass`);
  }
  assert.deepEqual(parseChord('Am').pcs.map(name), ['A', 'C', 'E']);
  assert.deepEqual(parseChord('G7').pcs.map(name), ['G', 'B', 'D', 'F']);
  assert.deepEqual(parseChord('Bdim').pcs.map(name), ['B', 'D', 'F']);
});

test('four-part harmony: every chord gets bass, tenor and alto, below the melody', async () => {
  const { arrange } = await import('../public/js/harmony.js');
  for (const h of HYMNS) {
    const { notes } = arrange(h);
    const mel = notes.filter((n) => n.voice === 's');
    for (const v of ['b', 't', 'a']) {
      const part = notes.filter((n) => n.voice === v);
      assert.ok(part.length >= h.chords.length * 0.9, `${h.id}: ${v} part is missing notes`);
      for (const n of part) {
        const above = mel.filter((m) => m.at16 < n.at16 + n.len16 && m.at16 + m.len16 > n.at16);
        assert.ok(above.every((m) => m.midi > n.midi), `${h.id}: ${v} ${n.midi} crosses above the melody`);
      }
    }
    for (const n of notes.filter((x) => x.voice === 'b')) assert.ok(n.midi >= 40 && n.midi <= 55, `${h.id}: bass ${n.midi}`);
  }
});

test('every piano note the hymns need is in the box', async () => {
  const fs = await import('node:fs');
  const { INSTRUMENTS } = await import('../public/js/instruments.js');
  const { arrange } = await import('../public/js/harmony.js');
  for (const n of INSTRUMENTS.piano.notes) assert.ok(fs.existsSync(new URL(`../public/instruments/piano/${n}.mp3`, import.meta.url)), `piano note ${n}`);
  const all = HYMNS.flatMap((h) => arrange(h).notes.map((n) => n.midi));
  // every note is within a minor third of a recorded one (at most a 1-2 semitone re-pitch)
  assert.ok(Math.min(...all) >= INSTRUMENTS.piano.notes[0] - 1 && Math.max(...all) <= INSTRUMENTS.piano.notes.at(-1) + 2);
});
