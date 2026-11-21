// Typing session engine and scoring. Pure logic, no DOM, so it can be unit tested.

// Turn curly quotes, dashes and line breaks into plain keys a child can type.
export function normalizeText(text) {
  return String(text)
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

// Easy mode: letters and spaces only (no punctuation). Capitals stay as written, so names and
// God's names keep their capital letters; easy mode accepts them typed without Shift.
export function easyText(text) {
  return normalizeText(text)
    .replace(/[^A-Za-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class TypingSession {
  constructor(text, { stopOnError = false, ignoreCase = false } = {}) {
    this.text = text;
    this.stopOnError = stopOnError;
    this.ignoreCase = ignoreCase;   // easy mode: a lowercase letter counts for a capital
    this.typed = [];            // what was typed at each position
    this.keystrokes = 0;        // every character key pressed
    this.errors = 0;            // every wrong key pressed (even if fixed later)
    this.missed = {};           // expected character -> times missed
    this.startedAt = null;
    this.finishedAt = null;
  }

  get position() { return this.typed.length; }
  get done() { return this.finishedAt !== null; }

  // Returns 'correct', 'wrong', 'blocked' (wrong key in stop-on-error mode) or 'ignored'.
  input(ch, now = Date.now()) {
    if (this.done || this.position >= this.text.length) return 'ignored';
    if (this.startedAt === null) this.startedAt = now;
    const expected = this.text[this.position];
    this.keystrokes++;
    const ok = this.ignoreCase ? ch.toLowerCase() === expected.toLowerCase() : ch === expected;
    if (!ok) {
      this.errors++;
      const key = this.ignoreCase ? expected.toLowerCase() : expected;
      this.missed[key] = (this.missed[key] || 0) + 1;
      if (this.stopOnError) return 'blocked';
    }
    this.typed.push(ok ? expected : ch);
    if (this.position >= this.text.length) this.finishedAt = now;
    return ok ? 'correct' : 'wrong';
  }

  backspace() {
    if (this.done || this.stopOnError || this.typed.length === 0) return false;
    this.typed.pop();
    return true;
  }

  finish(now = Date.now()) {
    if (this.finishedAt === null) this.finishedAt = now;
  }

  isCorrectAt(i) { return this.typed[i] === this.text[i]; }

  correctChars() {
    let n = 0;
    for (let i = 0; i < this.typed.length; i++) if (this.typed[i] === this.text[i]) n++;
    return n;
  }

  elapsedMs(now = Date.now()) {
    if (this.startedAt === null) return 0;
    return (this.finishedAt ?? now) - this.startedAt;
  }

  stats(now = Date.now()) {
    return computeStats({
      correctChars: this.correctChars(),
      typedChars: this.typed.length,
      keystrokes: this.keystrokes,
      errors: this.errors,
      elapsedMs: this.elapsedMs(now),
    });
  }
}

// Speed: one "word" is 5 characters. WPM counts only correct characters,
// so rushing with mistakes does not raise the score.
// Accuracy: share of all key presses that were right the first time.
export function computeStats({ correctChars, typedChars, keystrokes, errors, elapsedMs }) {
  const minutes = elapsedMs / 60000;
  const wpm = minutes > 0 ? correctChars / 5 / minutes : 0;
  const rawWpm = minutes > 0 ? typedChars / 5 / minutes : 0;
  const accuracy = keystrokes > 0 ? ((keystrokes - errors) / keystrokes) * 100 : 100;
  return {
    wpm: Math.round(wpm),
    rawWpm: Math.round(rawWpm),
    accuracy: Math.round(accuracy * 10) / 10,
    correctChars,
    typedChars,
    keystrokes,
    errors,
    seconds: Math.round(elapsedMs / 1000),
  };
}

// 1 star for finishing, 2 for 90%+ accuracy, 3 for 97%+.
export function starsFor(accuracy) {
  if (accuracy >= 97) return 3;
  if (accuracy >= 90) return 2;
  return 1;
}
