// Real instrument sounds for the background hymns: recorded grand piano notes, pitched to the
// nearest note and played through a soft room echo. (Looping, for sustained instruments like organ,
// is supported too.)

const range = (a, b, step = 1) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step);

export const INSTRUMENTS = {
  piano: {
    name: 'Piano',
    credit: 'Salamander Grand Piano by Alexander Holm (CC BY 3.0)',
    folder: 'instruments/piano/',
    notes: range(33, 84, 3),       // recorded every minor third, A1 to C6
    loop: null,                    // piano notes ring out and fade naturally
    attack: 0.004,
    release: 0.6,
    tempo: 0.8,                    // a little slower than hymnal tempo
    echo: 1.8,                     // seconds of room echo
    wet: 0.22,
    level: { s: 0.85, a: 0.38, t: 0.38, b: 0.5 },
  },
};

// Load every recorded note of an instrument: Map midi -> AudioBuffer
export async function loadInstrument(ctx, inst, base = '') {
  const entries = await Promise.all(inst.notes.map(async (midi) => {
    const res = await fetch(`${base}${inst.folder}${midi}.mp3`);
    if (!res.ok) throw new Error(`missing ${inst.folder}${midi}.mp3`);
    const buf = await ctx.decodeAudioData(await res.arrayBuffer());
    if (inst.loop) smoothLoop(buf, inst.loop);
    return [midi, buf];
  }));
  return new Map(entries);
}

// Blend the end of the loop into the sound just before its start, so jumping back from the end
// to the start is seamless (no click each time a long organ note repeats).
function smoothLoop(buf, [start, end], fade = 0.12) {
  const r = buf.sampleRate;
  const ls = Math.floor(start * r);
  const le = Math.floor(end * r);
  const n = Math.floor(fade * r);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      d[le - n + i] = d[le - n + i] * Math.cos((t * Math.PI) / 2) + d[ls - n + i] * Math.sin((t * Math.PI) / 2);
    }
  }
}

// A soft, natural-sounding room echo made from fading noise (no extra files needed).
export function makeEcho(ctx, seconds) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const ir = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.5;
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  return conv;
}

// Play one note: the nearest recorded note, re-pitched, with a gentle start and end.
export function playNote(ctx, dest, inst, buffers, midi, at, dur, vol) {
  let best = inst.notes[0];
  for (const n of inst.notes) if (Math.abs(n - midi) < Math.abs(best - midi)) best = n;
  const src = ctx.createBufferSource();
  src.buffer = buffers.get(best);
  src.playbackRate.value = 2 ** ((midi - best) / 12);
  if (inst.loop && dur > inst.loop[1] - 0.2) {
    src.loop = true;
    [src.loopStart, src.loopEnd] = inst.loop;
  }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + inst.attack);
  g.gain.setValueAtTime(vol, at + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur + inst.release);
  src.connect(g).connect(dest);
  src.start(at);
  src.stop(at + dur + inst.release + 0.05);
}
