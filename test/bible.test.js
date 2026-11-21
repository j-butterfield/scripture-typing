import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBible, search, parseReference } from '../bible.js';

const bible = loadBible(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bible', 'kjv.json'));
const one = (q) => search(bible, q);

test('the whole KJV is there', () => {
  assert.equal(bible.books.length, 66);
  assert.equal(bible.flat.length, 31102);
});

test('finds references written many ways', () => {
  const jn = 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.';
  for (const q of ['John 3:16', 'john 3:16', 'Jn 3:16', 'jn 3 16', 'John 3.16', 'JOHN 3:16 ']) {
    const r = one(q);
    assert.equal(r.kind, 'reference', q);
    assert.equal(r.parts[0].text, jn, q);
    assert.equal(r.title, 'John 3:16', q);
  }
  assert.equal(one('1 Cor 13:4-7').title, '1 Corinthians 13:4-7');
  assert.equal(one('first john 4:8').parts[0].text, 'He that loveth not knoweth not God; for God is love.');
  assert.equal(one('I John 4:8').title, '1 John 4:8');
  assert.equal(one('Jude 3').title, 'Jude 3');
  assert.equal(one('John 3:16-4:2').title, 'John 3:16-4:2');
  assert.equal(one('Psalms 117').title, 'Psalm 117');
});

test('a whole chapter comes back in short parts labeled with real verses', () => {
  const r = one('Psalm 23');
  assert.equal(r.title, 'Psalm 23');
  assert.equal(r.verseCount, 6);
  assert.ok(r.parts.length >= 2);
  assert.match(r.parts[0].ref, /^Psalm 23:1-\d$/);
  assert.equal(r.parts.map((p) => p.text).join(' ').split(' ')[0], 'The');
  for (const p of one('Psalm 119').parts) assert.ok(p.text.length <= 420 || p.verses === 1, p.ref);
  assert.equal(r.after, 'Psalm 24');
  assert.equal(one('John 3:16').after, 'John 3:17-36');
});

test('word search finds verses with all the words, exact phrases first', () => {
  const r = one('the lord is my shepherd');
  assert.equal(r.kind, 'words');
  assert.equal(r.results[0].ref, 'Psalm 23:1');
  const s = one('be strong and of a good courage');
  assert.ok(s.results.some((x) => x.ref === 'Joshua 1:9'));
  assert.equal(one('xyzzyplugh').total, 0);
});

test('bad references explain themselves', () => {
  assert.equal(one('John 30').kind, 'error');
  assert.equal(parseReference(bible, 'Hezekiah 3:1'), null);
});
