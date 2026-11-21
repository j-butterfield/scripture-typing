// Search the whole King James Bible by reference ("John 3:16", "Ps 23", "1 Cor 13:4-7")
// or by words ("be strong"). Long passages come back split at verse boundaries into
// typing-sized parts, each labeled with its real verse range.
import fs from 'node:fs';

const PART_TARGET = 300;   // aim for about 300 characters (about 50 words) per part
const MAX_VERSES = 200;    // the most verses one search returns
const MAX_WORD_RESULTS = 60;

// Extra names people type for each book (the full name always works too).
const ALIASES = {
  Genesis: 'gen ge gn', Exodus: 'exod exo ex', Leviticus: 'lev le lv', Numbers: 'num nu nm nb',
  Deuteronomy: 'deut de dt', Joshua: 'josh jos jsh', Judges: 'judg jdg jg jdgs', Ruth: 'rth ru',
  '1 Samuel': '1sam 1sa 1sm', '2 Samuel': '2sam 2sa 2sm', '1 Kings': '1kgs 1ki 1kg', '2 Kings': '2kgs 2ki 2kg',
  '1 Chronicles': '1chr 1chron 1ch', '2 Chronicles': '2chr 2chron 2ch', Ezra: 'ezr', Nehemiah: 'neh ne',
  Esther: 'esth es', Job: 'jb', Psalms: 'psalm ps psa pss psm', Proverbs: 'prov pro pr prv',
  Ecclesiastes: 'eccl ecc eccles qoh', 'Song of Solomon': 'song sos ss songofsongs canticles',
  Isaiah: 'isa is', Jeremiah: 'jer je jr', Lamentations: 'lam la', Ezekiel: 'ezek eze ezk', Daniel: 'dan da dn',
  Hosea: 'hos ho', Joel: 'jl', Amos: 'am', Obadiah: 'obad ob', Jonah: 'jon jnh', Micah: 'mic mc', Nahum: 'nah na',
  Habakkuk: 'hab hb', Zephaniah: 'zeph zep zp', Haggai: 'hag hg', Zechariah: 'zech zec zc', Malachi: 'mal ml',
  Matthew: 'matt mt mat', Mark: 'mk mrk mr', Luke: 'lk luk', John: 'jn jhn joh', Acts: 'ac',
  Romans: 'rom ro rm', '1 Corinthians': '1cor 1co', '2 Corinthians': '2cor 2co', Galatians: 'gal ga',
  Ephesians: 'eph ephes', Philippians: 'phil php pp', Colossians: 'col', '1 Thessalonians': '1thess 1thes 1th',
  '2 Thessalonians': '2thess 2thes 2th', '1 Timothy': '1tim 1ti', '2 Timothy': '2tim 2ti', Titus: 'tit',
  Philemon: 'philem phm pm', Hebrews: 'heb', James: 'jas jm', '1 Peter': '1pet 1pe 1pt', '2 Peter': '2pet 2pe 2pt',
  '1 John': '1jn 1jo 1jhn', '2 John': '2jn 2jo 2jhn', '3 John': '3jn 3jo 3jhn', Jude: 'jud jd',
  Revelation: 'rev re rv revelations',
};
const ONE_CHAPTER = new Set(['Obadiah', 'Philemon', '2 John', '3 John', 'Jude']);

export function loadBible(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const books = data.books.map(([name, chapters], i) => ({ name, chapters, index: i }));
  const byKey = new Map();
  const key = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const b of books) {
    byKey.set(key(b.name), b);
    for (const a of (ALIASES[b.name] || '').split(' ').filter(Boolean)) byKey.set(key(a), b);
  }
  // Every verse, lowercased once, for word search.
  const flat = [];
  for (const b of books) b.chapters.forEach((vs, c) => vs.forEach((t, v) => flat.push({ b, c: c + 1, v: v + 1, t, low: t.toLowerCase() })));
  return { books, byKey, key, flat, translation: data.translation };
}

const displayName = (b) => (b.name === 'Psalms' ? 'Psalm' : b.name);
const slug = (b) => b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// "first john" -> "1john", "ii kings" -> "2kings", "1st cor" -> "1cor"
function normalizeBook(s) {
  return s.toLowerCase().replace(/\./g, ' ')
    .replace(/^\s*(first|1st|i)\s+/, '1 ').replace(/^\s*(second|2nd|ii)\s+/, '2 ').replace(/^\s*(third|3rd|iii)\s+/, '3 ')
    .replace(/[^a-z0-9]/g, '');
}

function findBook(bible, text) {
  const k = normalizeBook(text);
  if (!k) return null;
  if (bible.byKey.has(k)) return bible.byKey.get(k);
  // A unique beginning of a book name, at least 3 letters ("phili" -> Philippians is ambiguous, "zech" is not)
  if (k.replace(/^\d/, '').length >= 3) {
    const hits = bible.books.filter((b) => bible.key(b.name).startsWith(k));
    if (hits.length === 1) return hits[0];
  }
  return null;
}

// Parse "Book C", "Book C:V", "Book C:V-V2", "Book C:V-C2:V2", "Book C-C2". Returns null if not a reference.
export function parseReference(bible, q) {
  const m = String(q).trim().match(/^((?:[1-3]|i{1,3}|first|second|third|1st|2nd|3rd)?\s*\.?\s*[a-z][a-z .']*?)\s*(\d+)(?:\s*[:. ]\s*(\d+))?(?:\s*[-–—]\s*(\d+)(?:\s*[:.]\s*(\d+))?)?\s*$/i);
  let book, c1, v1, c2, v2;
  if (m) {
    book = findBook(bible, m[1]);
    if (!book) return null;
    const n = [m[2], m[3], m[4], m[5]].map((x) => (x === undefined ? undefined : Number(x)));
    if (ONE_CHAPTER.has(book.name) && n[1] === undefined) {
      // "Jude 3" or "Jude 3-5" means verses
      c1 = 1; v1 = n[0]; c2 = 1; v2 = n[2] ?? n[0];
    } else if (n[1] === undefined) {
      c1 = n[0]; v1 = 1; c2 = n[2] ?? n[0]; v2 = Infinity;           // whole chapter(s)
    } else if (n[3] !== undefined) {
      c1 = n[0]; v1 = n[1]; c2 = n[2]; v2 = n[3];                     // C:V-C2:V2
    } else {
      c1 = n[0]; v1 = n[1]; c2 = n[0]; v2 = n[2] ?? n[1];              // C:V or C:V-V2
    }
  } else {
    book = findBook(bible, q);                                         // just a book name -> chapter 1
    if (!book) return null;
    c1 = 1; v1 = 1; c2 = 1; v2 = Infinity;
  }
  if (c1 < 1 || c1 > book.chapters.length) return { book, error: `${displayName(book)} has ${book.chapters.length} chapter${book.chapters.length > 1 ? 's' : ''}.` };
  c2 = Math.min(Math.max(c2, c1), book.chapters.length);
  v2 = Math.min(v2, book.chapters[c2 - 1].length);
  if (v1 < 1 || v1 > book.chapters[c1 - 1].length) return { book, error: `${displayName(book)} ${c1} has ${book.chapters[c1 - 1].length} verses.` };
  if (c2 === c1 && v2 < v1) v2 = v1;
  return { book, c1, v1, c2, v2 };
}

function rangeLabel(book, a, b) {
  const name = displayName(book);
  if (ONE_CHAPTER.has(book.name)) return a.v === b.v ? `${name} ${a.v}` : `${name} ${a.v}-${b.v}`;
  if (a.c === b.c) {
    const last = book.chapters[a.c - 1].length;
    if (a.v === 1 && b.v === last) return `${name} ${a.c}`;
    return a.v === b.v ? `${name} ${a.c}:${a.v}` : `${name} ${a.c}:${a.v}-${b.v}`;
  }
  return `${name} ${a.c}:${a.v}-${b.c}:${b.v}`;
}

function verseId(book, a, b) {
  return `kjv-${slug(book)}-${a.c}-${a.v}` + (a.c === b.c && a.v === b.v ? '' : `-${b.c}-${b.v}`);
}

// What comes after a passage: the rest of its chapter, or the next chapter.
function afterRef(bible, book, last) {
  const chapterLen = book.chapters[last.c - 1].length;
  if (last.v < chapterLen) return rangeLabel(book, { c: last.c, v: last.v + 1 }, { c: last.c, v: chapterLen });
  if (last.c < book.chapters.length) return `${displayName(book)} ${last.c + 1}`;
  const next = bible.books[book.index + 1];
  return next ? `${displayName(next)} 1` : null;
}

export function lookup(bible, ref) {
  const { book, c1, v1, c2, v2 } = ref;
  const verses = [];
  for (let c = c1; c <= c2 && verses.length < MAX_VERSES; c++) {
    const vs = book.chapters[c - 1];
    for (let v = c === c1 ? v1 : 1; v <= (c === c2 ? v2 : vs.length) && verses.length < MAX_VERSES; v++) verses.push({ c, v, t: vs[v - 1] });
  }
  const truncated = verses.length >= MAX_VERSES && !(verses.at(-1).c === c2 && verses.at(-1).v === v2);
  // Group whole verses into parts of about PART_TARGET characters.
  const groups = [];
  let cur = [];
  let len = 0;
  for (const vs of verses) {
    if (cur.length && len + 1 + vs.t.length > PART_TARGET) { groups.push(cur); cur = []; len = 0; }
    cur.push(vs);
    len += (len ? 1 : 0) + vs.t.length;
  }
  if (cur.length) groups.push(cur);
  // Fold a short last part into the one before when the two still make a comfortable size.
  if (groups.length > 1) {
    const last = groups.at(-1);
    const prevLen = groups.at(-2).reduce((n, x) => n + x.t.length + 1, 0);
    const lastLen = last.reduce((n, x) => n + x.t.length + 1, 0);
    if (lastLen < 80 && prevLen + lastLen <= 400) groups.at(-2).push(...groups.pop());
  }
  const parts = groups.map((g) => ({
    id: verseId(book, g[0], g.at(-1)),
    ref: rangeLabel(book, g[0], g.at(-1)),
    text: g.map((x) => x.t).join(' '),
    verses: g.length,
  }));
  const first = verses[0];
  const last = verses.at(-1);
  return {
    kind: 'reference',
    title: rangeLabel(book, first, last),
    verseCount: verses.length,
    truncated,
    parts,
    after: afterRef(bible, book, last),
  };
}

export function searchWords(bible, q) {
  const phrase = String(q).toLowerCase().replace(/[“”"]/g, '').replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = phrase.split(' ').filter((w) => w.length > 0);
  if (!words.length) return { kind: 'words', query: q, total: 0, results: [] };
  const res = words.map((w) => new RegExp(`(^|[^a-z'])${w.replace(/'/g, "'")}($|[^a-z'])`));
  const phraseRe = words.length > 1 ? new RegExp(`(^|[^a-z'])${words.join("[^a-z']+")}($|[^a-z'])`) : null;
  const exact = [];
  const loose = [];
  for (const x of bible.flat) {
    if (!res.every((r) => r.test(x.low))) continue;
    (phraseRe && phraseRe.test(x.low) ? exact : loose).push(x);
  }
  const all = phraseRe ? [...exact, ...loose] : loose;
  return {
    kind: 'words',
    query: q,
    total: all.length,
    phraseMatches: exact.length,
    results: all.slice(0, MAX_WORD_RESULTS).map((x) => ({
      id: verseId(x.b, x, x),
      ref: rangeLabel(x.b, x, x),
      text: x.t,
      verses: 1,
      after: afterRef(bible, x.b, x),
    })),
  };
}

export function search(bible, q, mode) {
  const query = String(q || '').trim().slice(0, 200);
  if (!query) return { kind: 'empty' };
  if (mode === 'words') return searchWords(bible, query);
  const ref = /\d/.test(query) || findBook(bible, query) ? parseReference(bible, query) : null;
  if (ref?.error) return { kind: 'error', message: ref.error };
  if (ref) {
    const r = lookup(bible, ref);
    // "song", "job", "acts"... could also mean the word: offer a word search too.
    if (!/\d/.test(query) && /^[a-z]+$/i.test(query)) r.alsoWords = query;
    return r;
  }
  return searchWords(bible, query);
}
