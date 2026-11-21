// Turns a hymn (melody + chord symbols) into four-part hymnal harmony: soprano (the melody),
// alto and tenor filling in the chord just below it, and a bass line. Inner voices move to the
// nearest chord tone at each change, the way hymn parts are written, so the harmony flows smoothly.

const ROOTS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const acc = (s) => (s === '#' ? 1 : s === 'b' ? -1 : 0);

// "Am/C" -> { pcs: [9, 0, 4], bass: 0 }   (pitch classes, 0 = C)
export function parseChord(sym) {
  const m = /^([A-G])([#b]?)(m(?!aj)|dim|aug|sus4|sus2)?(maj7|7)?(?:\/([A-G])([#b]?))?$/.exec(sym);
  if (!m) return null;
  const root = (ROOTS[m[1]] + acc(m[2]) + 12) % 12;
  const third = m[3] === 'm' || m[3] === 'dim' ? 3 : m[3] === 'sus4' ? 5 : m[3] === 'sus2' ? 2 : 4;
  const fifth = m[3] === 'dim' ? 6 : m[3] === 'aug' ? 8 : 7;
  const ivs = [0, third, fifth];
  if (m[4] === '7') ivs.push(10);
  if (m[4] === 'maj7') ivs.push(11);
  return { pcs: ivs.map((i) => (root + i) % 12), root, bass: m[5] ? (ROOTS[m[5]] + acc(m[6]) + 12) % 12 : root };
}

// Every pitch in [lo, hi] whose pitch class is in pcs.
function pitchesIn(pcs, lo, hi) {
  const out = [];
  for (let p = lo; p <= hi; p++) if (pcs.includes(((p % 12) + 12) % 12)) out.push(p);
  return out;
}
const nearest = (cands, target) => cands.reduce((best, p) => (Math.abs(p - target) < Math.abs(best - target) ? p : best), cands[0]);

// Returns notes [{ voice: 's'|'a'|'t'|'b', at16, len16, midi, fermata }] in 16th-note units.
export function arrange(hymn) {
  const notes = [];
  let t = 0;
  for (const [midi, len, fermata] of hymn.notes) {
    if (midi) notes.push({ voice: 's', at16: t, len16: len, midi, fermata: !!fermata });
    t += len;
  }
  const total = t;
  let prev = { b: 48, t: 57, a: 64 };
  hymn.chords.forEach(([sym, start], i) => {
    const ch = parseChord(sym);
    const end = i + 1 < hymn.chords.length ? hymn.chords[i + 1][1] : total;
    if (!ch || end <= start) return;
    // The lowest melody note while this chord sounds: alto and tenor stay below it.
    const mel = notes.filter((n) => n.voice === 's' && n.at16 < end && n.at16 + n.len16 > start).map((n) => n.midi);
    const ceiling = (mel.length ? Math.min(...mel) : 72) - 1;
    const bass = nearest(pitchesIn([ch.bass], 40, 55), prev.b);
    // Alto stays within an octave below the melody, as in a hymnal, which leaves room for the tenor.
    let altoC = pitchesIn(ch.pcs, Math.max(55, ceiling - 11), ceiling);
    if (!altoC.length) altoC = pitchesIn(ch.pcs, 50, ceiling);
    const alto = altoC.length ? nearest(altoC, prev.a) : null;
    // Tenor: prefer the chord tone the bass and alto don't already have (usually the third).
    const have = [ch.bass, alto === null ? -1 : alto % 12];
    let tenC = pitchesIn(ch.pcs, Math.max(48, bass + 3), (alto ?? ceiling) - 1);
    const missing = tenC.filter((p) => !have.includes(p % 12));
    if (missing.length) tenC = missing;
    const tenor = tenC.length ? nearest(tenC, prev.t) : null;
    const len16 = end - start;
    const fermata = notes.some((n) => n.fermata && n.at16 + n.len16 === end);
    notes.push({ voice: 'b', at16: start, len16, midi: bass, fermata });
    if (tenor !== null) notes.push({ voice: 't', at16: start, len16, midi: tenor, fermata });
    if (alto !== null) notes.push({ voice: 'a', at16: start, len16, midi: alto, fermata });
    prev = { b: bass, t: tenor ?? prev.t, a: alto ?? prev.a };
  });
  return { notes: notes.sort((x, y) => x.at16 - y.at16), total };
}

// Seconds for every 16th-note position, holding fermatas a little longer.
export function clock(hymn, secondsPer16, fermataStretch = 1.6) {
  const marks = [[0, 0]];
  let pos = 0;
  let secs = 0;
  for (const [, len, fermata] of hymn.notes) {
    pos += len;
    secs += len * secondsPer16 * (fermata ? fermataStretch : 1);
    marks.push([pos, secs]);
  }
  return (p) => {
    for (let i = 1; i < marks.length; i++) {
      if (p <= marks[i][0]) {
        const [p0, s0] = marks[i - 1];
        const [p1, s1] = marks[i];
        return s0 + ((p - p0) / (p1 - p0 || 1)) * (s1 - s0);
      }
    }
    return marks.at(-1)[1];
  };
}
