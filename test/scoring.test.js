import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TypingSession, computeStats, easyText, normalizeText, starsFor } from '../public/js/scoring.js';
import { PASSAGES } from '../public/js/passages.js';

test('perfect typing gives 100% accuracy and correct WPM', () => {
  const s = new TypingSession('Jesus wept.');
  let t = 1000;
  for (const ch of 'Jesus wept.') s.input(ch, (t += 100));
  assert.equal(s.done, true);
  const st = s.stats();
  assert.equal(st.accuracy, 100);
  assert.equal(st.correctChars, 11);
  // 11 chars over 1.0 s (first key starts the clock) = 2.2 words / (1/60 min) = 132 WPM
  assert.equal(st.wpm, 132);
});

test('mistakes count against accuracy even after fixing them', () => {
  const s = new TypingSession('abc');
  s.input('a', 0);
  s.input('x', 100);   // wrong
  s.backspace();
  s.input('b', 200);
  s.input('c', 300);
  const st = s.stats();
  assert.equal(st.keystrokes, 4);
  assert.equal(st.errors, 1);
  assert.equal(st.accuracy, 75);
  assert.equal(st.correctChars, 3);
  assert.deepEqual(s.missed, { b: 1 });
});

test('uncorrected mistakes do not count toward speed', () => {
  const s = new TypingSession('aaaaaaaaaa');
  for (let i = 0; i < 10; i++) s.input(i < 5 ? 'a' : 'z', i * 6000);
  // 54 s elapsed, 5 correct chars = 1 word -> ~1.1 WPM
  const st = s.stats();
  assert.equal(st.correctChars, 5);
  assert.equal(st.wpm, 1);
  assert.equal(st.rawWpm, 2);
});

test('stop-on-error waits for the right key', () => {
  const s = new TypingSession('ab', { stopOnError: true });
  assert.equal(s.input('x', 0), 'blocked');
  assert.equal(s.position, 0);
  assert.equal(s.input('a', 10), 'correct');
  assert.equal(s.backspace(), false);
  assert.equal(s.input('b', 20), 'correct');
  assert.equal(s.done, true);
  assert.equal(s.stats().errors, 1);
});

test('computeStats handles zero time', () => {
  const st = computeStats({ correctChars: 0, typedChars: 0, keystrokes: 0, errors: 0, elapsedMs: 0 });
  assert.equal(st.wpm, 0);
  assert.equal(st.accuracy, 100);
});

test('text helpers', () => {
  assert.equal(normalizeText('“Hi” — it’s\n ok'), '"Hi" - it\'s ok');
  assert.equal(easyText('The LORD is my shepherd; I shall not want.'), 'The LORD is my shepherd I shall not want');
  assert.equal(easyText("for his name's sake, Beth-el"), 'for his names sake Bethel');
  assert.equal(starsFor(99), 3);
  assert.equal(starsFor(92), 2);
  assert.equal(starsFor(50), 1);
});

test('built-in passages are typeable on a normal keyboard', () => {
  const ids = new Set();
  for (const p of PASSAGES) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    assert.match(p.text, /^[\x20-\x7E]+$/, `${p.ref} has untypeable characters`);
    assert.ok(p.ref && p.text.length > 5);
  }
});

test('easy mode accepts capitals typed without Shift and keeps them capital', () => {
  const s = new TypingSession('Jesus wept', { ignoreCase: true });
  for (const ch of 'jesus wept') s.input(ch, 0);
  assert.equal(s.done, true);
  assert.equal(s.stats().errors, 0);
  assert.equal(s.typed.join(''), 'Jesus wept');
  const strict = new TypingSession('Jesus');
  strict.input('j', 0);
  assert.equal(strict.stats().errors, 1);
});
