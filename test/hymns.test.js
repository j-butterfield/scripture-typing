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
  const { chordNotes } = await import('../public/js/music.js');
  const N = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = (m) => N[m % 12];
  for (const sym of new Set(HYMNS.flatMap((h) => h.chords.map((c) => c[0])))) {
    const c = chordNotes(sym);
    assert.ok(c, `could not read chord ${sym}`);
    assert.equal(name(c.notes[0]), sym.match(/^[A-G]#?/)[0], `${sym} root`);
    if (sym.includes('/')) assert.equal(name(c.bass), sym.split('/')[1], `${sym} bass`);
  }
  assert.deepEqual(chordNotes('Am').notes.map(name), ['A', 'C', 'E']);
  assert.deepEqual(chordNotes('G7').notes.map(name), ['G', 'B', 'D', 'F']);
  assert.deepEqual(chordNotes('Bdim').notes.map(name), ['B', 'D', 'F']);
});
