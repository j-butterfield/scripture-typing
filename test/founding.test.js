import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOUNDING, FOUNDING_DOCS, PASSAGES } from '../public/js/passages.js';

const whole = (doc) => FOUNDING.filter((p) => p.doc === doc).map((p) => p.text).join(' ');

test('founding documents are complete, typeable and uniquely identified', () => {
  const ids = new Set(PASSAGES.map((p) => p.id));
  for (const p of FOUNDING) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    assert.match(p.text, /^[\x20-\x7E]+$/, `${p.ref} has untypeable characters`);
    assert.ok(p.text.length <= 720, `${p.ref} is too long to type in one go`);
    assert.ok(FOUNDING_DOCS.some((d) => d.id === p.doc));
  }
  assert.equal(FOUNDING.filter((p) => p.doc === 'bill-of-rights').length, 10);
});

test('each document runs from its first words to its last, in order', () => {
  const decl = whole('declaration');
  assert.match(decl, /^When in the Course of human events, it becomes necessary/);
  assert.match(decl, /We hold these truths to be self-evident, that all men are created equal/);
  assert.match(decl, /our Fortunes and our sacred Honor\.$/);
  const con = whole('constitution');
  assert.match(con, /^We the People of the United States, in Order to form a more perfect Union/);
  assert.match(con, /provide for the common defence/);
  for (const a of ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']) assert.ok(FOUNDING.some((p) => p.ref.includes(`Article ${a}`)), `Article ${a}`);
  assert.match(con, /subscribed our Names,$/);
  const bor = whole('bill-of-rights');
  assert.match(bor, /^Congress shall make no law respecting an establishment of religion/);
  assert.match(bor, /the right of the people to keep and bear Arms, shall not be infringed\./);
  assert.match(bor, /are reserved to the States respectively, or to the people\.$/);
});
