// Ambient background hymns: public domain hymn tunes played on a recorded grand piano in
// four-part hymnal harmony (soprano melody with alto, tenor and bass), softly, with a room echo.
// The piano notes live on the NAS (public/instruments/piano), so no internet is needed.
// On/off and volume are remembered on each computer.
import { HYMNS } from './hymns-data.js';
import { arrange, clock } from './harmony.js';
import { INSTRUMENTS, loadInstrument, makeEcho, playNote } from './instruments.js';

const PREF_KEY = 'stt-music';
const GAP_SECONDS = 4;        // quiet pause between hymns
const LOOKAHEAD = 2.0;        // schedule notes this many seconds ahead
const PIANO = INSTRUMENTS.piano;

function loadPrefs() {
  try { return { on: false, volume: 0.5, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch { return { on: false, volume: 0.5 }; }
}
function savePrefs(p) { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* ignore */ } }

class HymnPlayer {
  constructor() {
    this.prefs = loadPrefs();
    this.ctx = null;
    this.bus = null;
    this.input = null;
    this.timer = null;
    this.order = [];
    this.current = null;
    this.piano = null;          // Promise of the loaded piano notes
    this.loading = false;
    this.listeners = new Set();
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { this.listeners.forEach((fn) => fn(this)); }
  get on() { return this.prefs.on; }
  get volume() { return this.prefs.volume; }
  get credit() { return PIANO.credit; }

  setVolume(v) {
    this.prefs.volume = Math.min(1, Math.max(0, v));
    savePrefs(this.prefs);
    if (this.bus) this.bus.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.1);
    this.emit();
  }
  level() { return 0.6 * this.prefs.volume ** 1.5; }

  toggle() { return this.prefs.on ? this.stop() : this.start(); }

  // Must be called from a click or key press the first time (browsers block sound until then).
  async start() {
    this.prefs.on = true;
    savePrefs(this.prefs);
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { this.prefs.on = false; this.emit(); return; }
    if (!this.bus) this.openBus();
    if (!this.piano) {
      this.loading = true;
      this.emit();
      this.piano = loadInstrument(this.ctx, PIANO).catch((err) => { this.piano = null; throw err; });
    }
    let buffers;
    try { buffers = await this.piano; } catch (err) {
      console.error('Could not load the piano:', err);
      this.loading = false; this.prefs.on = false; this.emit(); return;
    } finally { this.loading = false; }
    this.buffers = buffers;
    if (!this.prefs.on) return;            // switched off while the piano was loading
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
      bus.gain.linearRampToValueAtTime(0, t + 0.8);   // fade out instead of cutting off
      setTimeout(() => bus.disconnect(), 1000);
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
    this.bus.connect(c.destination);
    // Dry piano plus a living-room sized echo.
    this.input = c.createGain();
    this.input.connect(this.bus);
    const echo = makeEcho(c, PIANO.echo);
    const wet = c.createGain();
    wet.gain.value = PIANO.wet;
    this.input.connect(echo);
    echo.connect(wet).connect(this.bus);
  }

  nextHymn(when) {
    if (!this.order.length) this.order = [...HYMNS].sort(() => Math.random() - 0.5);
    const hymn = this.order.shift();
    const per16 = (60 / (hymn.bpm * PIANO.tempo)) / hymn.beat;   // seconds per 16th note
    const at = clock(hymn, per16);
    const { notes, total } = arrange(hymn);
    const events = notes.map((n) => {
      const start = at(n.at16);
      const end = at(n.at16 + n.len16);
      // A tiny gap between melody notes keeps repeated notes distinct.
      return { at: start, dur: Math.max(0.05, end - start - (n.voice === 's' ? 0.03 : 0)), midi: n.midi, vol: PIANO.level[n.voice] };
    });
    this.current = { hymn, start: when, events, next: 0, end: when + at(total) };
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
      playNote(this.ctx, this.input, PIANO, this.buffers, e.midi, Math.max(now, cur.start + e.at), e.dur, e.vol);
    }
    if (cur.next >= cur.events.length && now > cur.end) this.nextHymn(cur.end + GAP_SECONDS);
  }
}

export const music = new HymnPlayer();
export { HYMNS };
