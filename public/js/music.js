// Ambient background hymns: public domain hymn tunes played softly by the browser itself
// (no audio files): a gentle melody over a quiet chord pad, slowed down, with a soft echo.
// On/off and volume are remembered on each computer.
import { HYMNS } from './hymns-data.js';

const PREF_KEY = 'stt-music';
const SLOWER = 0.72;          // play at about 3/4 of the hymnal tempo for a calm, ambient feel
const GAP_SECONDS = 4;        // quiet pause between hymns
const LOOKAHEAD = 2.0;        // schedule notes this many seconds ahead

function loadPrefs() {
  try { return { on: false, volume: 0.5, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch { return { on: false, volume: 0.5 }; }
}
function savePrefs(p) { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* ignore */ } }

const ROOTS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// "Am/C" -> { notes: [57, 60, 64], bass: 48 }, voiced around the middle of the keyboard
function chordNotes(sym) {
  const m = /^([A-G])([#b]?)(m(?!aj)|dim|aug|sus4|sus2)?(maj7|7)?(?:\/([A-G])([#b]?))?$/.exec(sym);
  if (!m) return null;
  const root = ROOTS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const third = m[3] === 'm' || m[3] === 'dim' ? 3 : m[3] === 'sus4' ? 5 : m[3] === 'sus2' ? 2 : 4;
  const fifth = m[3] === 'dim' ? 6 : m[3] === 'aug' ? 8 : 7;
  const ivs = [0, third, fifth];
  if (m[4] === '7') ivs.push(10);
  if (m[4] === 'maj7') ivs.push(11);
  const base = 52 + ((root - 4 + 12) % 12);          // root between E3 and D#4
  const bassPc = m[5] ? ROOTS[m[5]] + (m[6] === '#' ? 1 : m[6] === 'b' ? -1 : 0) : root;
  return { notes: ivs.map((i) => base + i), bass: 40 + ((bassPc - 4 + 12) % 12) };
}
const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

class HymnPlayer {
  constructor() {
    this.prefs = loadPrefs();
    this.ctx = null;
    this.bus = null;
    this.timer = null;
    this.order = [];
    this.current = null;
    this.listeners = new Set();
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { this.listeners.forEach((fn) => fn(this)); }
  get on() { return this.prefs.on; }
  get volume() { return this.prefs.volume; }

  setVolume(v) {
    this.prefs.volume = Math.min(1, Math.max(0, v));
    savePrefs(this.prefs);
    if (this.bus) this.bus.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.1);
    this.emit();
  }
  level() { return 0.35 * this.prefs.volume ** 1.5; }

  toggle() { return this.prefs.on ? this.stop() : this.start(); }

  // Must be called from a click or key press the first time (browsers block sound until then).
  start() {
    this.prefs.on = true;
    savePrefs(this.prefs);
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { this.prefs.on = false; this.emit(); return; }
    if (!this.bus) this.openBus();
    if (!this.timer) this.nextHymn(this.ctx.currentTime + 0.3);
    this.emit();
  }

  stop() {
    this.prefs.on = false;
    savePrefs(this.prefs);
    clearInterval(this.timer);
    this.timer = null;
    this.current = null;
    if (this.bus) {
      const bus = this.bus;
      const t = this.ctx.currentTime;
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.linearRampToValueAtTime(0, t + 0.6);   // fade out instead of cutting off
      setTimeout(() => bus.disconnect(), 800);
      this.bus = null;
    }
    this.emit();
  }

  skip() {
    if (!this.prefs.on) return;
    this.stop();
    this.start();
  }

  openBus() {
    const c = this.ctx;
    this.bus = c.createGain();
    this.bus.gain.value = 0;
    this.bus.gain.setTargetAtTime(this.level(), c.currentTime, 0.5);
    // A soft echo: two quiet, filtered repeats make it sound like a room rather than a beeper.
    const wet = c.createGain(); wet.gain.value = 0.28;
    const d1 = c.createDelay(1); d1.delayTime.value = 0.23;
    const d2 = c.createDelay(1); d2.delayTime.value = 0.41;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    this.input = c.createGain();
    this.input.connect(this.bus);
    this.input.connect(lp); lp.connect(d1); lp.connect(d2); d1.connect(wet); d2.connect(wet); wet.connect(this.bus);
    this.bus.connect(c.destination);
  }

  nextHymn(when) {
    if (!this.order.length) this.order = [...HYMNS].sort(() => Math.random() - 0.5);
    const hymn = this.order.shift();
    const sixteenth = (60 / (hymn.bpm * SLOWER)) / hymn.beat;   // seconds per 16th note
    // Keep the melody in a gentle range: drop high tunes an octave.
    const top = Math.max(...hymn.notes.map((n) => n[0]));
    const shift = top > 79 ? -12 : 0;
    const events = [];
    let t = 0;
    for (const [pitch, len, fermata] of hymn.notes) {
      const dur = len * sixteenth * (fermata ? 1.6 : 1);
      if (pitch) events.push({ type: 'note', at: t, dur, midi: pitch + shift });
      t += dur;
    }
    const total = t;
    // Chords last until the next chord symbol (time in 16ths, mapped through the same fermata stretch).
    const timeAt = (pos16) => {
      let acc16 = 0; let secs = 0;
      for (const [, len, fermata] of hymn.notes) {
        if (acc16 + len > pos16) return secs + (pos16 - acc16) * sixteenth * (fermata ? 1.6 : 1);
        acc16 += len; secs += len * sixteenth * (fermata ? 1.6 : 1);
      }
      return secs;
    };
    hymn.chords.forEach(([sym, pos], i) => {
      const start = timeAt(pos);
      const end = i + 1 < hymn.chords.length ? timeAt(hymn.chords[i + 1][1]) : total;
      if (end > start) events.push({ type: 'chord', at: start, dur: end - start, sym });
    });
    events.sort((a, b) => a.at - b.at);
    this.current = { hymn, start: when, events, next: 0, end: when + total };
    this.emit();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 250);
    this.schedule();
  }

  schedule() {
    const cur = this.current;
    if (!cur || !this.bus) return;
    const now = this.ctx.currentTime;
    while (cur.next < cur.events.length && cur.start + cur.events[cur.next].at < now + LOOKAHEAD) {
      const e = cur.events[cur.next++];
      const at = Math.max(now, cur.start + e.at);
      if (e.type === 'note') this.playNote(e.midi, at, e.dur);
      else this.playChord(e.sym, at, e.dur);
    }
    if (cur.next >= cur.events.length && now > cur.end) this.nextHymn(cur.end + GAP_SECONDS);
  }

  voice(f, at, dur, type, peak, attack, release) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + attack);
    g.gain.setTargetAtTime(peak * 0.55, at + attack, dur * 0.5);
    g.gain.setTargetAtTime(0.0001, at + dur, release / 3);
    o.connect(g).connect(this.input);
    o.start(at);
    o.stop(at + dur + release + 0.1);
  }

  playNote(midi, at, dur) {
    // A soft, music-box-like tone: a sine with a quieter octave above.
    this.voice(freq(midi), at, dur * 0.95, 'sine', 0.22, 0.03, 0.6);
    this.voice(freq(midi + 12), at, dur * 0.6, 'sine', 0.04, 0.02, 0.4);
  }

  playChord(sym, at, dur) {
    const ch = chordNotes(sym);
    if (!ch) return;
    for (const n of ch.notes) this.voice(freq(n), at, dur, 'triangle', 0.035, 0.35, 0.8);
    this.voice(freq(ch.bass), at, dur, 'sine', 0.06, 0.2, 0.8);
  }
}

export const music = new HymnPlayer();
export { HYMNS, chordNotes };
