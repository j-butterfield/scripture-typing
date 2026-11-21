import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, allowedChars, buildExercises, howToReach, fingerOf } from '../public/js/lessons.js';

test('every lesson only uses keys that have been taught', () => {
  for (let i = 1; i < LESSONS.length; i++) {
    const allowed = allowedChars(i);
    for (let run = 0; run < 25; run++) {
      for (const ex of buildExercises(i)) {
        const bad = [...ex.text].filter((c) => !allowed.has(c));
        assert.deepEqual(bad, [], `${LESSONS[i].title} / ${ex.title}: "${ex.text}" uses untaught ${JSON.stringify(bad)}`);
        assert.ok(ex.text.length >= 10 && !/  /.test(ex.text) && ex.text === ex.text.trim());
      }
    }
  }
});

test('lessons teach every letter exactly once', () => {
  const taught = LESSONS.map((l) => l.keys).join('');
  assert.equal([...taught].filter((c) => /[a-z]/.test(c)).sort().join(''), 'abcdefghijklmnopqrstuvwxyz');
});

test('reach instructions name the right finger', () => {
  assert.match(howToReach('e'), /up with your left middle finger from D to E/);
  assert.match(howToReach('g'), /left pointer finger one key to the right, from F to G/);
  assert.match(howToReach('n'), /down and a little toward the middle with your right pointer finger from J to N/);
  assert.match(howToReach('f'), /home key/);
  assert.equal(fingerOf('P'), 'R1');
});
