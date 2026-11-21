import { store } from './store.js';
import { PASSAGES, FOUNDING, FOUNDING_DOCS, COLLECTIONS, LEVELS, levelFor } from './passages.js';
import { TypingSession, normalizeText, easyText, starsFor, computeStats } from './scoring.js';
import { renderKeyboard, fingersFor, getOS, setOS, keyNames, escapeHtml as esc } from './keyboard.js';
import { renderHands } from './hands.js';
import { LESSONS, UNITS, POSTURE, PASS_ACCURACY, buildExercises, lessonGuide, fingerOf } from './lessons.js';

const app = document.getElementById('app');
const LAST_PROFILE_KEY = 'stt-last-profile';
const AVATARS = ['🐑', '🦁', '🐻', '🦊', '🐰', '🐼', '🐯', '🐸', '🦉', '🐢', '🐳', '🦋', '🐝', '🐞', '🕊️', '⭐'];
const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#c0392b'];

let ui = { profileId: null, collection: 'bible', level: 1, doc: 'declaration', testCollection: 'bible', testLevel: 1, testDoc: 'all', testMinutes: 1, search: null };
let cleanup = null;

// ---------------- helpers ----------------
function go(view, ...args) {
  if (cleanup) { cleanup(); cleanup = null; }
  window.scrollTo(0, 0);
  view(...args);
}
const $ = (sel, root = app) => root.querySelector(sel);
const $$ = (sel, root = app) => [...root.querySelectorAll(sel)];
function on(sel, fn) { $$(sel).forEach((el) => el.addEventListener('click', (e) => fn(el, e))); }
const me = () => store.profile(ui.profileId);
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; };
const starStr = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

function allPassages() {
  const custom = store.customPassages.map((p) => ({ ...p, level: levelFor(normalizeText(p.text)), builtIn: false, collection: 'bible' }));
  return [...PASSAGES, ...custom, ...FOUNDING];
}
const passageById = (id) => allPassages().find((p) => p.id === id);

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function verseOfDay() {
  const pool = PASSAGES.filter((p) => p.level <= 2);
  const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  return pool[day % pool.length];
}

// ---- sounds: a soft "bonk" on a wrong key, a little chime when a passage or lesson is done ----
let audio;
function audioCtx() {
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  // Browsers start page audio paused; it may only start after the child has pressed a key or clicked.
  if (audio.state === 'suspended') audio.resume();
  return audio;
}
function tone(freq, at, dur, type = 'triangle', vol = 0.3) {
  const a = audioCtx();
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}
function playSound(kind, always = false) {
  if (!always && !me()?.settings.sound) return;
  try {
    if (kind === 'mistake') { tone(330, 0, 0.12, 'square', 0.12); tone(247, 0.07, 0.16, 'square', 0.12); }
    if (kind === 'done') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.3, 'triangle', 0.25));
  } catch { /* this browser has no sound */ }
}
const beep = () => playSound('mistake');

function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const bits = ['⭐', '✨', '🎉', '💛', '🌟'];
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('span');
    s.className = 'confetti';
    s.textContent = bits[i % bits.length];
    s.style.left = `${Math.random() * 100}vw`;
    s.style.animationDelay = `${Math.random() * 0.6}s`;
    s.style.fontSize = `${18 + Math.random() * 18}px`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 3200);
  }
}

// ---------------- progress maths ----------------
const BADGES = [
  { id: 'first', emoji: '🌟', name: 'First Steps', desc: 'Finish your first passage', test: (s) => s.completedCount >= 1 },
  { id: 'wpm10', emoji: '🐢', name: 'On the Move', desc: 'Reach 10 WPM in a speed test', test: (s) => s.bestWpm >= 10 },
  { id: 'wpm20', emoji: '🐇', name: 'Quick Feet', desc: 'Reach 20 WPM in a speed test', test: (s) => s.bestWpm >= 20 },
  { id: 'wpm30', emoji: '🐎', name: 'Swift Runner', desc: 'Reach 30 WPM in a speed test', test: (s) => s.bestWpm >= 30 },
  { id: 'wpm40', emoji: '🦅', name: 'Wings as Eagles', desc: 'Reach 40 WPM in a speed test (Isaiah 40:31)', test: (s) => s.bestWpm >= 40 },
  { id: 'acc95', emoji: '🎯', name: 'Sharp Shooter', desc: '95% accuracy or better in a speed test', test: (s) => s.bestTestAcc >= 95 },
  { id: 'perfect', emoji: '💎', name: 'Spotless', desc: 'No mistakes on a passage of 50+ letters', test: (s) => s.perfect },
  { id: 'days5', emoji: '🔥', name: 'Faithful', desc: 'Type on 5 different days', test: (s) => s.days >= 5 },
  { id: 'shepherd', emoji: '🐑', name: 'Good Shepherd', desc: 'Type all of Psalm 23', test: (s) => s.done.has('psalm-23') },
  { id: 'prayer', emoji: '🙏', name: "The Lord's Prayer", desc: 'Type Matthew 6:9-13', test: (s) => s.done.has('matthew-6-9-13') },
  { id: 'ten', emoji: '📜', name: 'Scroll Keeper', desc: 'Finish 10 different passages', test: (s) => s.done.size >= 10 },
  { id: 'homerow', emoji: '🏠', name: 'Home Row Hero', desc: 'Pass the home row review lesson', test: (s) => s.lessonsPassed.has('home-review') },
  { id: 'graduate', emoji: '🎓', name: 'Graduate', desc: 'Pass every typing lesson', test: (s) => s.lessonsPassed.size >= LESSONS.length },
  { id: 'people', emoji: '🏛️', name: 'We the People', desc: 'Type the Preamble to the Constitution', test: (s) => s.done.has('const-preamble') },
  { id: 'rights', emoji: '⚖️', name: 'Bill of Rights', desc: 'Type all ten amendments of the Bill of Rights', test: (s) => FOUNDING.filter((x) => x.doc === 'bill-of-rights').every((x) => s.done.has(x.id)) },
  { id: 'scholar', emoji: '🏆', name: 'Bible Scholar', desc: 'Finish 30 different passages', test: (s) => s.done.size >= 30 },
];

function summarize(results) {
  const tests = results.filter((r) => r.mode === 'test');
  const completed = results.filter((r) => r.kind === 'passage' && r.completed);
  const done = new Set(completed.flatMap((r) => r.passageIds));
  const best = {};
  for (const r of completed) for (const id of r.passageIds) best[id] = Math.max(best[id] || 0, starsFor(r.accuracy));
  const days = new Set(results.map((r) => dayKey(r.date)));
  let streak = 0;
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
  const recent = results.slice(-10);
  const s = {
    tests,
    done,
    stars: best,
    completedCount: completed.length,
    lessonsPassed: new Set(results.filter((r) => r.mode === 'lesson' && r.completed).flatMap((r) => r.passageIds)),
    lessonStars: Object.fromEntries(results.filter((r) => r.mode === 'lesson' && r.completed)
      .map((r) => [r.passageIds[0], starsFor(r.accuracy)]).sort((a, b) => a[1] - b[1])),
    bestWpm: Math.max(0, ...tests.map((r) => r.wpm)),
    bestTestAcc: Math.max(0, ...tests.map((r) => r.accuracy)),
    avgAcc: recent.length ? Math.round(recent.reduce((a, r) => a + r.accuracy, 0) / recent.length) : 0,
    perfect: completed.some((r) => r.errors === 0 && r.correctChars >= 50),
    days: days.size,
    streak,
  };
  s.badges = BADGES.filter((b) => b.test(s)).map((b) => b.id);
  return s;
}

function missedKeys(results, limit = 10) {
  const tally = {};
  for (const r of results) for (const [k, n] of Object.entries(r.missed || {})) tally[k] = (tally[k] || 0) + n;
  return Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, limit);
}
const keyLabel = (k) => (k === ' ' ? 'space' : k);

// ---------------- views ----------------
function viewHome() {
  const v = verseOfDay();
  app.innerHTML = `
    <header class="top">
      <h1 class="brand">📖 Scripture Typing</h1>
      <button class="ghost" data-act="parent">⚙️ Parents</button>
    </header>
    <section class="center">
      <h2 class="big">Who is typing today?</h2>
      <div class="profiles">
        ${store.profiles.map((p) => `
          <button class="profile-card" data-id="${esc(p.id)}" style="--accent:${esc(p.color)}">
            <span class="avatar">${esc(p.avatar)}</span><span class="pname">${esc(p.name)}</span>
          </button>`).join('')}
        <button class="profile-card add" data-act="add"><span class="avatar">＋</span><span class="pname">Add a typist</span></button>
      </div>
    </section>
    <blockquote class="votd"><p>${esc(v.text)}</p><cite>${esc(v.ref)}</cite></blockquote>
    ${store.remote ? '' : '<p class="note">Progress is saved in this browser only. Run the server on your NAS to share it between computers.</p>'}`;
  on('[data-id]', (el) => {
    ui.profileId = el.dataset.id;
    try { localStorage.setItem(LAST_PROFILE_KEY, ui.profileId); } catch { /* ignore */ }
    go(viewDashboard);
  });
  on('[data-act="add"]', () => go(viewProfileEditor, null, viewHome));
  on('[data-act="parent"]', () => go(viewParent));
}

function viewDashboard() {
  const p = me();
  if (!p) return go(viewHome);
  const rs = store.resultsFor(p.id);
  const s = summarize(rs);
  const v = verseOfDay();
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  app.innerHTML = `
    <header class="top">
      <button class="ghost" data-act="home">← Switch typist</button>
      <div></div>
      <button class="ghost" data-act="parent">⚙️</button>
    </header>
    <section class="center">
      <div class="hello" style="--accent:${esc(p.color)}"><span class="avatar lg">${esc(p.avatar)}</span>
        <h2 class="big">${hello}, ${esc(p.name)}!</h2></div>
      <div class="tiles">
        <div class="tile"><b>${s.bestWpm || '–'}</b><span>best speed (WPM)</span></div>
        <div class="tile"><b>${s.avgAcc ? `${s.avgAcc}%` : '–'}</b><span>recent accuracy</span></div>
        <div class="tile"><b>${s.streak}${s.streak ? ' 🔥' : ''}</b><span>day streak</span></div>
        <div class="tile"><b>${s.lessonsPassed.size} / ${LESSONS.length}</b><span>lessons passed</span></div>
      </div>
      <div class="menu">
        <button class="menu-btn lessons" data-act="lessons"><span>🖐️</span><b>Lessons</b><small>Learn where your fingers go</small></button>
        <button class="menu-btn practice" data-act="practice"><span>✏️</span><b>Practice</b><small>Bible verses or America's founding documents</small></button>
        <button class="menu-btn test" data-act="test"><span>⏱️</span><b>Speed Test</b><small>See how fast and careful you can type</small></button>
        <button class="menu-btn progress" data-act="progress"><span>📈</span><b>My Progress</b><small>Charts, badges and tricky keys</small></button>
      </div>
      <div class="votd small"><b>Verse of the day</b><p>${esc(v.text)}</p><cite>${esc(v.ref)}</cite>
        <button class="primary" data-act="votd">Type it</button></div>
    </section>`;
  on('[data-act="home"]', () => go(viewHome));
  on('[data-act="parent"]', () => go(viewParent));
  on('[data-act="practice"]', () => go(viewPractice));
  on('[data-act="test"]', () => go(viewTestSetup));
  on('[data-act="progress"]', () => go(viewProgress));
  on('[data-act="lessons"]', () => go(viewLessons));
  on('[data-act="votd"]', () => go(viewTyping, { mode: 'practice', kind: 'passage', passages: [v] }));
}

// ---------------- Bible search ----------------
async function bibleSearch(q, mode) {
  const res = await fetch(`api/bible?q=${encodeURIComponent(q)}${mode ? `&mode=${mode}` : ''}`);
  if (!res.ok) throw new Error(`search failed (${res.status})`);
  return res.json();
}
const searchedPassage = (part) => ({ id: part.id, ref: part.ref, text: part.text, translation: 'KJV', collection: 'bible', builtIn: true, searched: true });
// The parts a search found, in order, so "Next" can carry on through a chapter.
function searchItems(r) { return r?.kind === 'reference' ? r.parts : r?.kind === 'words' ? r.results : []; }
function practiceSearched(r, index) {
  const items = searchItems(r);
  go(viewTyping, { mode: 'practice', kind: 'passage', passages: [searchedPassage(items[index])], search: { result: r, index } });
}

function renderSearch(s) {
  const q = ui.search?.q || '';
  const r = ui.search?.result;
  const form = `
    <form class="bsearch" id="bsf" role="search">
      <input type="search" name="q" value="${esc(q)}" placeholder="Find any verse: John 3:16, Psalm 23, 1 Cor 13:4-7, or words like be strong" aria-label="Find a Bible verse" autocomplete="off" ${store.remote ? '' : 'disabled'}>
      <button class="primary" type="submit" ${store.remote ? '' : 'disabled'}>🔎 Search</button>
      ${r || ui.search?.error ? '<button class="ghost" type="button" data-act="clear-search">✕ Clear</button>' : ''}
    </form>
    ${store.remote ? '' : '<p class="note center">Searching the whole Bible needs the Scripture Typing server on the NAS.</p>'}`;
  if (ui.search?.error) return `${form}<p class="note center">${esc(ui.search.error)}</p>`;
  if (!r) return form;
  const items = searchItems(r);
  let head = '';
  if (r.kind === 'reference') {
    head = `<h3 class="center">${esc(r.title)} <span class="muted">· ${r.verseCount} verse${r.verseCount > 1 ? 's' : ''}${r.parts.length > 1 ? ` in ${r.parts.length} parts` : ''}</span></h3>
      ${r.truncated ? '<p class="note center">That is a lot of Scripture! Showing the first 200 verses.</p>' : ''}
      ${r.parts.length > 1 ? '<p class="note center">Start with part 1. After each part, "Next" carries on to the next one.</p>' : ''}
      ${r.alsoWords ? `<p class="center"><button class="ghost" data-act="words">Or find verses with the word "${esc(r.alsoWords)}"</button></p>` : ''}`;
  } else if (r.kind === 'words') {
    head = r.total
      ? `<h3 class="center">${r.total} verse${r.total > 1 ? 's' : ''} found${r.total > items.length ? ` <span class="muted">· showing the first ${items.length}. Add more words to narrow it down.</span>` : ''}</h3>`
      : '<p class="note center">No verses have all of those words. Try fewer words, or a reference like John 3:16.</p>';
  } else if (r.kind === 'error') {
    head = `<p class="note center">${esc(r.message)}</p>`;
  }
  return `${form}${head}
    <div class="passages">${items.map((x, i) => `
      <button class="passage" data-si="${i}">
        <span class="pref">${esc(x.ref)} <em>${LEVELS[levelFor(x.text)].emoji} ${x.text.split(' ').length} words</em></span>
        <span class="ptext">${esc(x.text.length > 140 ? `${x.text.slice(0, 140)}…` : x.text)}</span>
        <span class="stars ${s.stars[x.id] ? '' : 'none'}">${starStr(s.stars[x.id] || 0)}</span>
      </button>`).join('')}</div>`;
}

function wireSearch() {
  const f = $('#bsf');
  if (!f) return;
  const run = async (q, mode) => {
    ui.search = { q, result: null };
    try {
      ui.search.result = await bibleSearch(q, mode);
      if (ui.search.result.kind === 'empty') ui.search = null;
    } catch (err) { ui.search.error = `Could not search right now (${err.message}).`; }
    go(viewPractice);
  };
  f.addEventListener('submit', (e) => { e.preventDefault(); const q = new FormData(f).get('q').trim(); if (q) run(q); });
  on('[data-act="clear-search"]', () => { ui.search = null; go(viewPractice); });
  on('[data-act="words"]', () => run(ui.search.result.alsoWords, 'words'));
  on('[data-si]', (el) => practiceSearched(ui.search.result, Number(el.dataset.si)));
  if (!ui.search) f.querySelector('input').focus();
}

function viewPractice() {
  const p = me();
  if (!p) return go(viewHome);
  const s = summarize(store.resultsFor(p.id));
  const bible = ui.collection === 'bible';
  const list = allPassages().filter((x) => (bible ? x.collection === 'bible' && x.level === ui.level : x.doc === ui.doc));
  app.innerHTML = `
    <header class="top">
      <button class="ghost" data-act="back">← Back</button>
      <h2>Practice</h2><div></div>
    </header>
    <div class="choices collections">${Object.entries(COLLECTIONS).map(([id, c]) => `
      <button class="choice ${id === ui.collection ? 'on' : ''}" data-col="${id}" aria-pressed="${id === ui.collection}">${c.emoji} ${c.name}</button>`).join('')}</div>
    ${bible ? renderSearch(s) : ''}
    ${bible && ui.search ? '' : `<div class="tabs" role="tablist">
      ${bible ? Object.entries(LEVELS).map(([n, L]) => `
        <button role="tab" class="tab ${Number(n) === ui.level ? 'on' : ''}" data-level="${n}" aria-selected="${Number(n) === ui.level}">
          ${L.emoji} ${L.name}<small>${L.label}</small></button>`).join('')
      : FOUNDING_DOCS.map((d) => {
        const n = FOUNDING.filter((x) => x.doc === d.id);
        const done = n.filter((x) => s.stars[x.id]).length;
        return `<button role="tab" class="tab ${d.id === ui.doc ? 'on' : ''}" data-doc="${d.id}" aria-selected="${d.id === ui.doc}">
          ${d.emoji} ${d.name}<small>${d.year} · ${done} of ${n.length} typed</small></button>`;
      }).join('')}
    </div>`}
    ${bible ? '' : '<p class="note center">Typed exactly as written, with the original spelling and capital letters (like "defence" and "Union"). Long sections are split into parts.</p>'}
    ${bible && ui.search ? '' : `<div class="passages">
      ${list.map((x) => `
        <button class="passage" data-pid="${esc(x.id)}">
          <span class="pref">${esc(bible ? x.ref : x.ref.replace(/^[^:]+: /, ''))}${x.builtIn ? '' : ' <em>family</em>'}${bible ? '' : ` <em>${LEVELS[x.level].emoji} ${Math.round(x.text.length / 6)} words</em>`}</span>
          <span class="ptext">${esc(x.text.length > 110 ? `${x.text.slice(0, 110)}…` : x.text)}</span>
          <span class="stars ${s.stars[x.id] ? '' : 'none'}" aria-label="${s.stars[x.id] || 0} of 3 stars">${starStr(s.stars[x.id] || 0)}</span>
        </button>`).join('') || '<p class="note">No passages at this level yet.</p>'}
    </div>`}`;
  on('[data-act="back"]', () => go(viewDashboard));
  wireSearch();
  on('[data-level]', (el) => { ui.level = Number(el.dataset.level); go(viewPractice); });
  on('[data-col]', (el) => { ui.collection = el.dataset.col; go(viewPractice); });
  on('[data-doc]', (el) => { ui.doc = el.dataset.doc; go(viewPractice); });
  on('[data-pid]', (el) => go(viewTyping, { mode: 'practice', kind: 'passage', passages: [passageById(el.dataset.pid)] }));
}

function viewTestSetup() {
  app.innerHTML = `
    <header class="top">
      <button class="ghost" data-act="back">← Back</button>
      <h2>Speed Test</h2><div></div>
    </header>
    <section class="center narrow">
      <p class="lead">Type as much as you can before the clock runs out. Speed only counts letters you typed correctly, so be careful!</p>
      <h3>How long?</h3>
      <div class="choices">${[1, 2, 3, 5].map((m) => `<button class="choice ${m === ui.testMinutes ? 'on' : ''}" data-min="${m}">${m} min</button>`).join('')}</div>
      <h3>What to type?</h3>
      <div class="choices">${Object.entries(COLLECTIONS).map(([id, c]) => `<button class="choice ${id === ui.testCollection ? 'on' : ''}" data-tc="${id}">${c.emoji} ${c.name}</button>`).join('')}</div>
      ${ui.testCollection === 'bible'
        ? `<h3>Which verses?</h3>
      <div class="choices">${Object.entries(LEVELS).map(([n, L]) => `<button class="choice ${Number(n) === ui.testLevel ? 'on' : ''}" data-tl="${n}">${L.emoji} ${L.label}</button>`).join('')}</div>`
        : `<h3>Which document?</h3>
      <div class="choices">${[{ id: 'all', name: 'All three', emoji: '🇺🇸' }, ...FOUNDING_DOCS].map((d) => `<button class="choice ${d.id === ui.testDoc ? 'on' : ''}" data-td="${d.id}">${d.emoji} ${d.name}</button>`).join('')}</div>`}
      <button class="primary huge" data-act="start">Start test</button>
    </section>`;
  on('[data-act="back"]', () => go(viewDashboard));
  on('[data-min]', (el) => { ui.testMinutes = Number(el.dataset.min); go(viewTestSetup); });
  on('[data-tl]', (el) => { ui.testLevel = Number(el.dataset.tl); go(viewTestSetup); });
  on('[data-tc]', (el) => { ui.testCollection = el.dataset.tc; go(viewTestSetup); });
  on('[data-td]', (el) => { ui.testDoc = el.dataset.td; go(viewTestSetup); });
  on('[data-act="start"]', () => {
    const pool = ui.testCollection === 'bible'
      ? allPassages().filter((x) => x.collection === 'bible' && x.level === ui.testLevel)
      : FOUNDING.filter((x) => ui.testDoc === 'all' || x.doc === ui.testDoc);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    go(viewTyping, { mode: 'test', kind: 'timed', passages: shuffled, seconds: ui.testMinutes * 60, level: ui.testLevel });
  });
}

// ---------------- typing ----------------
function buildText(passages, easy, minLength) {
  const segs = [];
  let text = '';
  const prep = (t) => (easy ? easyText(t) : normalizeText(t));
  let i = 0;
  do {
    const p = passages[i % passages.length];
    const t = prep(p.text);
    if (t) {
      if (text) text += ' ';
      segs.push({ start: text.length, p });
      text += t;
    }
    i++;
  } while (text.length < minLength && i < 500);
  return { text, segs };
}

function viewTyping(config) {
  const p = me();
  const lesson = config.kind === 'lesson' ? LESSONS[config.index] : null;
  if (!p || (!lesson && (!config.passages?.length || !config.passages[0]))) return go(viewDashboard);
  const st = p.settings;
  const timed = config.kind === 'timed';
  let text, segs;
  if (lesson) {
    const ex = config.exercises[config.step];
    text = ex.text;
    segs = [{ start: 0, p: { id: lesson.id, ref: `${lesson.title} · ${config.step + 1} of ${config.exercises.length}: ${ex.title}` } }];
  } else {
    ({ text, segs } = buildText(config.passages, st.easyMode, timed ? 4000 : 0));
  }
  const showKb = st.showKeyboard || !!lesson;
  const session = new TypingSession(text, { stopOnError: st.stopOnError });

  app.innerHTML = `
    <header class="top">
      <button class="ghost" data-act="quit">← Back</button>
      <div class="ref" id="ref"></div>
      <span class="mode-pill">${lesson ? '🖐️ Lesson' : timed ? `⏱️ ${config.seconds / 60} min test` : '✏️ Practice'}${st.easyMode && !lesson ? ' · easy' : ''}</span>
    </header>
    <div class="live">
      <div class="tile"><b id="lw">–</b><span>words / min</span></div>
      <div class="tile"><b id="la">100%</b><span>accuracy</span></div>
      <div class="tile"><b id="lt">${timed ? fmtTime(config.seconds) : '0:00'}</b><span>${timed ? 'time left' : 'time'}</span></div>
    </div>
    <div class="bar"><div id="pb"></div></div>
    <div class="textbox" id="tb"><div class="text" id="tx"></div></div>
    <p class="hint" id="hint">Start typing when you are ready. The clock starts with your first key.</p>
    <p class="warn" id="caps" hidden>⚠️ Caps Lock is on</p>
    <div id="kb" ${showKb ? '' : 'hidden'}></div>
    ${lesson ? '<div id="hands" class="hands-wrap"></div>' : ''}
    <div class="row center-row"><button class="ghost" data-act="restart">↻ Start over</button></div>`;

  // Render characters, grouped into words so lines only break between words.
  const tx = $('#tx');
  const els = [];
  const frag = document.createDocumentFragment();
  let word = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const span = document.createElement('span');
    span.className = 'ch';
    span.textContent = ch;
    if (ch === ' ') {
      span.classList.add('sp');
      frag.appendChild(span);
      word = null;
    } else {
      if (!word) { word = document.createElement('span'); word.className = 'word'; frag.appendChild(word); }
      word.appendChild(span);
    }
    els.push(span);
  }
  tx.appendChild(frag);

  const kb = showKb ? renderKeyboard($('#kb')) : { highlight() {} };
  const hands = lesson ? renderHands($('#hands')) : { show() {} };
  const tb = $('#tb');
  const refEl = $('#ref');
  let shownRef = null;

  function paint(i) {
    const el = els[i];
    if (!el) return;
    el.classList.remove('c', 'w', 'cur');
    if (i < session.position) el.classList.add(session.isCorrectAt(i) ? 'c' : 'w');
    else if (i === session.position) el.classList.add('cur');
  }
  function follow() {
    const pos = session.position;
    const cur = els[Math.min(pos, els.length - 1)];
    // Keep the line being typed as the 2nd of the 3 visible lines (the 1st while on line one),
    // measured from the top of the text itself, so the start of a passage is always shown first.
    const lh = parseFloat(getComputedStyle(tx).lineHeight) || 48;
    const line = Math.round((cur.getBoundingClientRect().top - tx.getBoundingClientRect().top) / lh);
    const target = Math.max(0, (line - 1) * lh);
    if (Math.abs(tb.scrollTop - target) > 2) tb.scrollTo({ top: target, behavior: 'smooth' });
    kb.highlight(text[pos]);
    hands.show(fingersFor(text[pos]));
    let seg = segs[0];
    for (const sg of segs) if (sg.start <= pos) seg = sg;
    if (seg !== shownRef) { shownRef = seg; refEl.textContent = seg.p.ref; }
    if (!timed) $('#pb').style.width = `${(pos / text.length) * 100}%`;
  }
  paint(0);
  follow();

  let ticker = null;
  function tick() {
    const now = Date.now();
    const elapsed = session.elapsedMs(now) / 1000;
    if (timed && elapsed >= config.seconds) {
      session.finish(session.startedAt + config.seconds * 1000);
      return finish();
    }
    const s = session.stats(now);
    $('#lw').textContent = elapsed >= 2 ? s.wpm : '–';
    $('#la').textContent = `${Math.round(s.accuracy)}%`;
    $('#lt').textContent = timed ? fmtTime(Math.max(0, Math.ceil(config.seconds - elapsed))) : fmtTime(elapsed);
    if (timed) $('#pb').style.width = `${Math.min(100, (elapsed / config.seconds) * 100)}%`;
  }

  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.getModifierState) $('#caps').hidden = !e.getModifierState('CapsLock');
    if (session.done) return;
    if (e.key === 'Tab') { e.preventDefault(); return; }
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (session.backspace()) { paint(session.position); paint(session.position + 1); follow(); }
      return;
    }
    if (e.key.length !== 1) return;
    e.preventDefault();
    const pos = session.position;
    const result = session.input(e.key);
    if (result === 'ignored') return;
    if (!ticker) {
      $('#hint').textContent = st.stopOnError ? 'If a letter shakes, look for the right key.' : `Made a mistake? Use ${keyNames().erase} to fix it.`;
      ticker = setInterval(tick, 200);
    }
    if (result === 'blocked') {
      beep();
      const el = els[pos];
      el.classList.remove('shake');
      void el.offsetWidth; // restart the animation
      el.classList.add('shake');
      return;
    }
    if (result === 'wrong') beep();
    paint(pos);
    paint(pos + 1);
    follow();
    if (session.done) finish();
  }

  async function finish() {
    clearInterval(ticker);
    document.removeEventListener('keydown', onKey);
    if (lesson) return finishLessonStep(config, session);
    const s = session.stats();
    const pos = session.position;
    const touched = segs.filter((sg) => sg.start < Math.max(pos, 1));
    const result = {
      profileId: p.id,
      mode: config.mode,
      kind: config.kind,
      passageIds: [...new Set(touched.map((sg) => sg.p.id))],
      refs: [...new Set(touched.map((sg) => sg.p.ref))].join(', ').slice(0, 300),
      completed: !timed && session.position >= text.length,
      easyMode: st.easyMode,
      seconds: timed ? config.seconds : s.seconds,
      wpm: s.wpm, rawWpm: s.rawWpm, accuracy: s.accuracy,
      correctChars: s.correctChars, keystrokes: s.keystrokes, errors: s.errors,
      missed: session.missed,
    };
    const before = summarize(store.resultsFor(p.id)).badges;
    let saved = result;
    try { saved = await store.addResult(result); } catch (err) { toast(`Could not save this result (${err.message}).`); }
    const after = summarize(store.resultsFor(p.id)).badges;
    const newBadges = BADGES.filter((b) => after.includes(b.id) && !before.includes(b.id));
    go(viewResults, saved, config, newBadges, touched.map((sg) => sg.p));
  }

  document.addEventListener('keydown', onKey);
  on('[data-act="quit"]', () => go(lesson ? viewLessonIntro : config.mode === 'test' ? viewTestSetup : viewPractice, config.index));
  on('[data-act="restart"]', (el) => { el.blur(); go(viewTyping, config); });
  cleanup = () => { clearInterval(ticker); document.removeEventListener('keydown', onKey); };
}

function viewResults(r, config, newBadges, typedPassages) {
  const p = me();
  const timed = config.kind === 'timed';
  const stars = timed ? 0 : starsFor(r.accuracy);
  const goal = p.settings.goalWpm;
  let msg;
  if (r.accuracy >= 97 && r.wpm >= goal) msg = 'Wonderful! Fast and careful. 🎉';
  else if (r.accuracy >= 97) msg = 'Very careful typing! Speed will come with practice.';
  else if (r.wpm >= goal) msg = `You beat your goal of ${goal} WPM! Now try to slow down a little and make fewer mistakes.`;
  else if (r.accuracy >= 90) msg = 'Good work! Keep your eyes on the screen and your fingers on the home row.';
  else msg = 'Nice try! Go a little slower and aim for the right key every time.';

  const missed = missedKeys([r], 8);
  const verse = !timed ? typedPassages[0] : null;
  const group = (x) => (verse.collection === 'founding' ? x.doc === verse.doc : x.collection !== 'founding' && x.level === verse.level);
  const sameLevel = verse ? allPassages().filter(group) : [];
  const idx = verse ? sameLevel.findIndex((x) => x.id === verse.id) : -1;
  let next = idx >= 0 ? sameLevel[(idx + 1) % sameLevel.length] : null;
  // A searched passage carries on through what the search found, then into the following verses.
  const sr = config.search;
  const srItems = sr ? searchItems(sr.result) : [];
  const srRef = sr?.result.kind === 'reference';
  const srNextPart = sr && srRef && sr.index < srItems.length - 1 ? sr.index + 1 : -1;
  const srAfter = sr && srRef && srNextPart < 0 ? sr.result.after : null;
  if (sr) next = null;

  app.innerHTML = `
    <header class="top">
      <button class="ghost" data-act="menu">← Menu</button>
      <h2>${timed ? 'Test results' : 'Well done!'}</h2><div></div>
    </header>
    <section class="center">
      ${stars ? `<div class="bigstars" aria-label="${stars} of 3 stars">${starStr(stars)}</div>` : ''}
      <div class="tiles">
        <div class="tile hero"><b>${r.wpm}</b><span>words per minute</span></div>
        <div class="tile hero"><b>${Math.round(r.accuracy)}%</b><span>accuracy</span></div>
        <div class="tile"><b>${fmtTime(r.seconds)}</b><span>time</span></div>
        <div class="tile"><b>${r.errors}</b><span>mistakes</span></div>
      </div>
      <p class="lead">${esc(msg)}</p>
      ${newBadges.length ? `<div class="newbadges">${newBadges.map((b) => `<div class="badge got"><span>${b.emoji}</span><b>New badge: ${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div>` : ''}
      ${missed.length ? `<div class="missed"><h3>Keys to practice</h3><div class="keycaps">${missed.map(([k, n]) => `<span class="keycap">${esc(keyLabel(k))}<small>×${n}</small></span>`).join('')}</div></div>` : ''}
      ${verse ? `<blockquote class="votd"><p>${esc(verse.text)}</p><cite>${esc(verse.ref)}${verse.translation ? ` (${esc(verse.translation)})` : ''}</cite></blockquote>`
        : `<p class="note">You typed: ${esc(r.refs)}</p>`}
      <div class="row center-row">
        <button class="primary" data-act="again">↻ Try again</button>
        ${next ? `<button class="primary alt" data-act="next">Next ${verse?.collection === 'founding' ? 'part' : 'verse'} →</button>` : ''}
        ${srNextPart >= 0 ? `<button class="primary alt" data-act="snext">Next: ${esc(srItems[srNextPart].ref)} →</button>` : ''}
        ${srAfter ? `<button class="primary alt" data-act="safter">Keep going: ${esc(srAfter)} →</button>` : ''}
        ${sr ? '<button class="ghost" data-act="sback">🔎 Back to search</button>' : ''}
        <button class="ghost" data-act="progress">📈 My progress</button>
      </div>
    </section>`;
  playSound('done');
  if (stars === 3 || newBadges.length) celebrate();
  on('[data-act="menu"]', () => go(viewDashboard));
  on('[data-act="progress"]', () => go(viewProgress));
  on('[data-act="again"]', () => {
    if (timed) config = { ...config, passages: [...config.passages].sort(() => Math.random() - 0.5) };
    go(viewTyping, config);
  });
  on('[data-act="next"]', () => go(viewTyping, { mode: 'practice', kind: 'passage', passages: [next] }));
  on('[data-act="snext"]', () => practiceSearched(sr.result, srNextPart));
  on('[data-act="sback"]', () => go(viewPractice));
  on('[data-act="safter"]', async () => {
    try {
      const r = await bibleSearch(srAfter);
      ui.search = { q: srAfter, result: r };
      if (searchItems(r).length) practiceSearched(r, 0);
    } catch (err) { toast(`Could not load ${srAfter} (${err.message}).`); }
  });
  const keyHandler = (e) => { if (e.key === 'Enter') { e.preventDefault(); $('[data-act="again"]')?.click(); } };
  document.addEventListener('keydown', keyHandler);
  cleanup = () => document.removeEventListener('keydown', keyHandler);
}

// ---------------- lessons ----------------
function osToggle() {
  const os = getOS();
  return `<div class="os-toggle" role="group" aria-label="Keyboard type">
    <button class="${os === 'windows' ? 'on' : ''}" data-os="windows" aria-pressed="${os === 'windows'}">⊞ Windows</button>
    <button class="${os === 'mac' ? 'on' : ''}" data-os="mac" aria-pressed="${os === 'mac'}">⌘ Mac</button></div>`;
}
function wireOsToggle(rerender) {
  on('[data-os]', (el) => { setOS(el.dataset.os); rerender(); });
}

const lessonUnlocked = (i, s, p) => i === 0 || p.settings.unlockLessons || s.lessonsPassed.has(LESSONS[i - 1].id);
const lessonKeys = (l) => [...(l.keys + (l.extra || ''))];
const capLabel = (k) => k.toUpperCase();

function viewLessons() {
  const p = me();
  if (!p) return go(viewHome);
  const s = summarize(store.resultsFor(p.id));
  const nextUp = LESSONS.findIndex((l) => !s.lessonsPassed.has(l.id));
  app.innerHTML = `
    <header class="top">
      <button class="ghost" data-act="back">← Back</button>
      <h2>Typing lessons</h2>
      ${osToggle()}
    </header>
    <p class="lead center">Learn to type without looking, one or two keys at a time. Pass a lesson with ${PASS_ACCURACY}% accuracy to open the next one. Being careful matters more than being fast!</p>
    ${UNITS.map((unit) => `
      <h3>${esc(unit)}</h3>
      <div class="lessons">
        ${LESSONS.map((l, i) => (l.unit !== unit ? '' : `
          <button class="lesson-card ${i === nextUp ? 'next-up' : ''}" data-lesson="${i}" ${lessonUnlocked(i, s, p) ? '' : 'disabled'}>
            <span class="lnum">${l.icon || i}</span>
            <span class="ltitle">${esc(l.title)}</span>
            <span class="lkeys">${lessonKeys(l).map((k) => `<span class="keycap sm">${esc(capLabel(k))}</span>`).join('')}</span>
            <span class="stars ${s.lessonStars[l.id] ? '' : 'none'}">${lessonUnlocked(i, s, p) ? starStr(s.lessonStars[l.id] || 0) : '🔒'}</span>
          </button>`)).join('')}
      </div>`).join('')}`;
  on('[data-act="back"]', () => go(viewDashboard));
  on('[data-lesson]', (el) => go(viewLessonIntro, Number(el.dataset.lesson)));
  wireOsToggle(() => go(viewLessons));
}

function lessonExplainer(l, names) {
  if (l.id === 'posture') return '';
  if (l.verses) return '<p>Time to put it all together! Type whole Bible verses and the opening of the Constitution, with capitals and punctuation. Keep your eyes on the screen and your fingers coming home.</p>';
  if (l.id === 'shift') {
    return `<p>To make a <b>capital letter</b>, use the <b>${names.shift}</b> key with the pinky of the <b>other</b> hand:</p>
      <ul><li>Letter on the left side of the keyboard (like <b>D</b>)? Hold the <b>right</b> ${names.shift} with your right pinky.</li>
      <li>Letter on the right side (like <b>J</b>)? Hold the <b>left</b> ${names.shift} with your left pinky.</li>
      <li>Hold ${names.shift} down, tap the letter, then let go of both and go back home.</li></ul>`;
  }
  if (l.id === 'punct') {
    return `<ul><li>The <b>apostrophe (')</b> is right next to ; - stretch your right pinky one key to the right.</li>
      <li>The <b>colon (:)</b> is ${names.shift} + ; and the <b>question mark (?)</b> is ${names.shift} + /. Hold the left ${names.shift} with your left pinky.</li></ul>`;
  }
  if (l.review) return '<p>No new keys this time. Practice all the keys you have learned so far, then type some real words and phrases.</p>';
  return '';
}

function viewLessonIntro(index) {
  const p = me();
  if (!p) return go(viewHome);
  const l = LESSONS[index];
  if (!l) return go(viewLessons);
  const s = summarize(store.resultsFor(p.id));
  if (!lessonUnlocked(index, s, p)) return go(viewLessons);
  const names = keyNames();
  const exercises = buildExercises(index);
  const guide = lessonGuide(index);
  const keys = lessonKeys(l);
  app.innerHTML = `
    <header class="top">
      <button class="ghost" data-act="back">← Lessons</button>
      <h2>${l.icon || `Lesson ${index}:`} ${esc(l.title)}</h2>
      ${osToggle()}
    </header>
    ${l.id === 'posture' ? `
      <p class="lead center">Before you type, get your body and hands ready. Good habits now make typing easier and keep your hands comfortable.</p>
      <div class="posture">${POSTURE.map((x) => `<div class="pcard"><span>${x.icon}</span><b>${esc(x.title)}</b><p>${esc(x.text)}</p></div>`).join('')}</div>
    ` : `
      <div class="lesson-intro">
        ${keys.length ? `<div class="newkeys"><span class="muted">New keys</span>${keys.map((k) => `<span class="keycap lg">${esc(capLabel(k))}</span>`).join('')}</div>` : ''}
        ${lessonExplainer(l, names)}
        ${guide.steps.length ? `<ul class="reach">${guide.steps.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        <p class="tipbox">💡 ${esc(guide.tip)}</p>
      </div>`}
    <div id="kb"></div>
    <div id="hands" class="hands-wrap"></div>
    <div class="panel steps">
      <h3>In this lesson</h3>
      <ol>${exercises.map((e) => `<li>${esc(e.title)}</li>`).join('')}</ol>
      <button class="primary huge" data-act="start">${l.id === 'posture' ? 'Put my fingers on home row' : 'Start lesson'}</button>
      <p class="note">Press ${names.enter} to start.</p>
    </div>`;
  renderKeyboard($('#kb'), { mark: l.id === 'posture' ? [...'asdfjkl;', 'Space'] : [...l.keys, ...[...(l.extra || '')].map((c) => ({ ':': ';', '?': '/' }[c] || c)), ...(l.id === 'shift' ? ['ShiftL', 'ShiftR'] : [])] });
  const hands = renderHands($('#hands'));
  const lit = {};
  if (l.id === 'posture') Object.assign(lit, { L1: 'A', L2: 'S', L3: 'D', L4: 'F', R4: 'J', R3: 'K', R2: 'L', R1: ';', T: 'space' });
  for (const k of l.keys) Object.assign(lit, { [fingerOf(k)]: k === ';' || k === ',' || k === '.' || k === "'" ? k : k.toUpperCase() });
  if (l.id === 'shift') Object.assign(lit, { L1: names.shift, R1: names.shift });
  hands.show(lit);
  const start = () => go(viewTyping, { kind: 'lesson', mode: 'lesson', index, step: 0, exercises });
  on('[data-act="start"]', start);
  on('[data-act="back"]', () => go(viewLessons));
  wireOsToggle(() => go(viewLessonIntro, index));
  const keyHandler = (e) => { if (e.key === 'Enter') { e.preventDefault(); start(); } };
  document.addEventListener('keydown', keyHandler);
  cleanup = () => document.removeEventListener('keydown', keyHandler);
}

async function finishLessonStep(config, session) {
  const s = session.stats();
  const t = config.totals || (config.totals = { keystrokes: 0, errors: 0, correctChars: 0, typedChars: 0, ms: 0, missed: {} });
  t.keystrokes += s.keystrokes; t.errors += s.errors; t.correctChars += s.correctChars; t.typedChars += s.typedChars;
  t.ms += session.elapsedMs();
  for (const [k, n] of Object.entries(session.missed)) t.missed[k] = (t.missed[k] || 0) + n;
  if (config.step < config.exercises.length - 1) return go(viewLessonStep, config, s);

  const p = me();
  const l = LESSONS[config.index];
  const stats = computeStats({ ...t, elapsedMs: t.ms });
  const passed = stats.accuracy >= PASS_ACCURACY;
  const before = summarize(store.resultsFor(p.id)).badges;
  try {
    await store.addResult({
      profileId: p.id, mode: 'lesson', kind: 'lesson', passageIds: [l.id], refs: `Lesson: ${l.title}`,
      completed: passed, easyMode: false, seconds: stats.seconds, wpm: stats.wpm, rawWpm: stats.rawWpm,
      accuracy: stats.accuracy, correctChars: stats.correctChars, keystrokes: stats.keystrokes, errors: stats.errors, missed: t.missed,
    });
  } catch (err) { toast(`Could not save this lesson (${err.message}).`); }
  const after = summarize(store.resultsFor(p.id)).badges;
  const newBadges = BADGES.filter((b) => after.includes(b.id) && !before.includes(b.id));
  go(viewLessonResults, config.index, stats, passed, newBadges, t.missed);
}

function viewLessonStep(config, s) {
  const next = config.exercises[config.step + 1];
  const good = s.accuracy >= PASS_ACCURACY;
  app.innerHTML = `
    <section class="center step-done">
      <div class="bigemoji">${good ? '👍' : '💪'}</div>
      <h2 class="big">${good ? 'Nice work!' : 'Keep going!'}</h2>
      <p class="lead">Part ${config.step + 1} of ${config.exercises.length} done with <b>${Math.round(s.accuracy)}%</b> accuracy.
        ${good ? '' : 'Slow down a little and keep your fingers on home row.'}</p>
      <p class="lead">Next: <b>${esc(next.title)}</b></p>
      <button class="primary huge" data-act="next">Keep going →</button>
      <p class="note">Press ${keyNames().enter} to keep going.</p>
    </section>`;
  const cont = () => go(viewTyping, { ...config, step: config.step + 1 });
  on('[data-act="next"]', cont);
  const keyHandler = (e) => { if (e.key === 'Enter') { e.preventDefault(); cont(); } };
  document.addEventListener('keydown', keyHandler);
  cleanup = () => document.removeEventListener('keydown', keyHandler);
}

function viewLessonResults(index, stats, passed, newBadges, missed) {
  const l = LESSONS[index];
  const next = LESSONS[index + 1];
  const stars = passed ? starsFor(stats.accuracy) : 0;
  const keys = Object.entries(missed).sort((a, b) => b[1] - a[1]).slice(0, 8);
  app.innerHTML = `
    <header class="top">
      <button class="ghost" data-act="lessons">← Lessons</button>
      <h2>${esc(l.title)}</h2><div></div>
    </header>
    <section class="center">
      ${passed ? `<div class="bigstars" aria-label="${stars} of 3 stars">${starStr(stars)}</div>` : '<div class="bigemoji">🌱</div>'}
      <h2 class="big">${passed ? (next ? 'Lesson passed!' : 'You finished every lesson! 🎓') : 'Almost there!'}</h2>
      <div class="tiles">
        <div class="tile hero"><b>${Math.round(stats.accuracy)}%</b><span>accuracy</span></div>
        <div class="tile hero"><b>${stats.wpm}</b><span>words per minute</span></div>
        <div class="tile"><b>${fmtTime(stats.seconds)}</b><span>time</span></div>
        <div class="tile"><b>${stats.errors}</b><span>mistakes</span></div>
      </div>
      <p class="lead">${passed
        ? (next ? `Great job! <b>${esc(next.title)}</b> is unlocked.` : 'Now try Practice and Speed Tests with Bible verses.')
        : `You need ${PASS_ACCURACY}% accuracy to pass. Go a little slower, keep your eyes on the screen and let each finger come back home. You can do it!`}</p>
      ${newBadges.length ? `<div class="newbadges">${newBadges.map((b) => `<div class="badge got"><span>${b.emoji}</span><b>New badge: ${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div>` : ''}
      ${keys.length ? `<div class="missed"><h3>Keys to practice</h3><div class="keycaps">${keys.map(([k, n]) => `<span class="keycap">${esc(keyLabel(k))}<small>×${n}</small></span>`).join('')}</div></div>` : ''}
      <div class="row center-row">
        ${passed && next ? '<button class="primary alt" data-act="next">Next lesson →</button>' : ''}
        <button class="${passed && next ? 'ghost' : 'primary'}" data-act="again">↻ ${passed ? 'Do it again' : 'Try again'}</button>
      </div>
    </section>`;
  if (passed) { playSound('done'); celebrate(); }
  on('[data-act="lessons"]', () => go(viewLessons));
  on('[data-act="next"]', () => go(viewLessonIntro, index + 1));
  on('[data-act="again"]', () => go(viewLessonIntro, index));
  const keyHandler = (e) => { if (e.key === 'Enter') { e.preventDefault(); $(passed && next ? '[data-act="next"]' : '[data-act="again"]')?.click(); } };
  document.addEventListener('keydown', keyHandler);
  cleanup = () => document.removeEventListener('keydown', keyHandler);
}

// ---------------- progress ----------------
function niceStep(range) {
  const raw = range / 4;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag * 10;
}

function lineChart(points, { title, unit, min, max, goal }) {
  const W = 640, H = 220, L = 52, R = 16, T = 14, B = 30;
  const n = points.length;
  const step = niceStep(max - min);
  const x = (i) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (v) => T + (H - T - B) * (1 - (v - min) / (max - min));
  const ticks = [];
  for (let v = min; v <= max + 1e-9; v += step) ticks.push(v);
  const d = points.map((pt, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(pt.v).toFixed(1)}`).join(' ');
  const labelEvery = Math.max(1, Math.ceil(n / 6));
  return `
    <figure class="chart" data-unit="${esc(unit)}">
      <figcaption>${esc(title)}</figcaption>
      <div class="chart-wrap">
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}: ${points.map((pt) => `${pt.v}${unit}`).join(', ')}">
          ${ticks.map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}${unit}</text>`).join('')}
          ${goal !== undefined && goal <= max ? `<line class="goal" x1="${L}" x2="${W - R}" y1="${y(goal)}" y2="${y(goal)}"/><text class="axis goal-label" x="${W - R}" y="${y(goal) - 6}" text-anchor="end">goal ${goal}${unit}</text>` : ''}
          ${points.map((pt, i) => (i % labelEvery === 0 || i === n - 1 ? `<text class="axis" x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(pt.label)}</text>` : '')).join('')}
          <line class="cross" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/>
          <path class="series" d="${d}"/>
          ${points.map((pt, i) => `<circle class="dot" cx="${x(i)}" cy="${y(pt.v)}" r="4.5"/>`).join('')}
        </svg>
        <div class="tip" hidden></div>
      </div>
    </figure>`;
}

function wireChart(fig, points) {
  const svg = $('svg', fig);
  const tip = $('.tip', fig);
  const cross = $('.cross', fig);
  const dots = $$('.dot', fig);
  const unit = fig.dataset.unit;
  svg.addEventListener('pointermove', (e) => {
    const box = svg.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * 640;
    let best = 0;
    dots.forEach((dot, i) => { if (Math.abs(dot.cx.baseVal.value - px) < Math.abs(dots[best].cx.baseVal.value - px)) best = i; });
    const dot = dots[best];
    dots.forEach((dd) => dd.classList.toggle('on', dd === dot));
    cross.setAttribute('x1', dot.cx.baseVal.value);
    cross.setAttribute('x2', dot.cx.baseVal.value);
    cross.setAttribute('visibility', 'visible');
    const pt = points[best];
    tip.innerHTML = `<b>${pt.v}${esc(unit)}</b><span>${esc(pt.full)}</span>`;
    tip.hidden = false;
    const left = (dot.cx.baseVal.value / 640) * box.width;
    const top = (dot.cy.baseVal.value / 220) * box.height;
    tip.style.left = `${Math.min(box.width - 150, Math.max(0, left - 70))}px`;
    tip.style.top = `${Math.max(0, top - 62)}px`;
  });
  svg.addEventListener('pointerleave', () => {
    tip.hidden = true;
    cross.setAttribute('visibility', 'hidden');
    dots.forEach((dd) => dd.classList.remove('on'));
  });
}

function viewProgress() {
  const p = me();
  if (!p) return go(viewHome);
  const rs = store.resultsFor(p.id);
  const s = summarize(rs);
  const tests = s.tests.slice(-30);
  const pts = (key) => tests.map((r) => ({
    v: Math.round(r[key]), label: fmtDate(r.date),
    full: `${fmtDate(r.date)} · ${r.seconds / 60} min test${r.easyMode ? ' (easy)' : ''}`,
  }));
  const wpmPts = pts('wpm');
  const accPts = pts('accuracy');
  const wpmMax = Math.max(p.settings.goalWpm, ...wpmPts.map((x) => x.v), 10);
  const accMin = Math.max(0, Math.floor(Math.min(90, ...accPts.map((x) => x.v)) / 10) * 10);
  const keys = missedKeys(rs.slice(-30), 10);
  const history = rs.slice(-20).reverse();

  app.innerHTML = `
    <header class="top">
      <button class="ghost" data-act="back">← Back</button>
      <h2>${esc(p.avatar)} ${esc(p.name)}'s progress</h2><div></div>
    </header>
    <div class="tiles">
      <div class="tile"><b>${s.bestWpm || '–'}</b><span>best test speed (WPM)</span></div>
      <div class="tile"><b>${p.settings.goalWpm}</b><span>goal (WPM)</span></div>
      <div class="tile"><b>${s.avgAcc ? `${s.avgAcc}%` : '–'}</b><span>recent accuracy</span></div>
      <div class="tile"><b>${s.done.size}</b><span>passages typed</span></div>
    </div>
    ${tests.length >= 2
      ? `<div class="charts">${lineChart(wpmPts, { title: 'Speed in speed tests (words per minute)', unit: '', min: 0, max: Math.ceil((wpmMax * 1.15) / 5) * 5, goal: p.settings.goalWpm })}
         ${lineChart(accPts, { title: 'Accuracy in speed tests', unit: '%', min: accMin, max: 100 })}</div>`
      : '<p class="note center">Take two or more speed tests to see your progress charts.</p>'}
    <section class="panel">
      <h3>Tricky keys (last 30 sessions)</h3>
      ${keys.length ? `<div class="keycaps">${keys.map(([k, n]) => `<span class="keycap">${esc(keyLabel(k))}<small>×${n}</small></span>`).join('')}</div>
        <p class="note">These are the keys you most often missed. Practice them slowly and they will get easier.</p>` : '<p class="note">No missed keys yet!</p>'}
    </section>
    <section class="panel">
      <h3>Badges (${s.badges.length} of ${BADGES.length})</h3>
      <div class="badges">${BADGES.map((b) => `<div class="badge ${s.badges.includes(b.id) ? 'got' : ''}" title="${esc(b.desc)}"><span>${b.emoji}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div>
    </section>
    <section class="panel">
      <h3>Recent sessions</h3>
      ${history.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Type</th><th>Verses</th><th class="num">WPM</th><th class="num">Accuracy</th><th class="num">Time</th></tr></thead>
        <tbody>${history.map((r) => `<tr><td>${fmtDate(r.date)}</td><td>${r.mode === 'test' ? '⏱️ Test' : r.mode === 'lesson' ? '🖐️ Lesson' : '✏️ Practice'}${r.easyMode ? ' (easy)' : ''}</td>
          <td class="refs">${esc(r.refs)}</td><td class="num">${r.wpm}</td><td class="num">${Math.round(r.accuracy)}%</td><td class="num">${fmtTime(r.seconds)}</td></tr>`).join('')}</tbody>
      </table></div>` : '<p class="note">Nothing yet. Go type a verse!</p>'}
    </section>`;
  on('[data-act="back"]', () => go(viewDashboard));
  const figs = $$('.chart');
  if (figs.length) { wireChart(figs[0], wpmPts); wireChart(figs[1], accPts); }
}

// ---------------- parents ----------------
function viewProfileEditor(profileId, back) {
  const p = profileId ? store.profile(profileId) : null;
  const st = p?.settings || { easyMode: false, stopOnError: true, showKeyboard: true, sound: false, goalWpm: 20 };
  const avatar = p?.avatar || AVATARS[store.profiles.length % AVATARS.length];
  const color = p?.color || COLORS[store.profiles.length % COLORS.length];
  app.innerHTML = `
    <header class="top">
      <button class="ghost" data-act="back">← Back</button>
      <h2>${p ? `Edit ${esc(p.name)}` : 'New typist'}</h2><div></div>
    </header>
    <form class="panel form" id="pf">
      <label>Name <input name="name" maxlength="40" required value="${esc(p?.name || '')}" autocomplete="off"></label>
      <fieldset><legend>Picture</legend><div class="pick">
        ${AVATARS.map((a) => `<label class="pick-item"><input type="radio" name="avatar" value="${a}" ${a === avatar ? 'checked' : ''}><span>${a}</span></label>`).join('')}
      </div></fieldset>
      <fieldset><legend>Color</legend><div class="pick">
        ${COLORS.map((c) => `<label class="pick-item"><input type="radio" name="color" value="${c}" ${c === color ? 'checked' : ''}><span class="swatch" style="background:${c}"></span></label>`).join('')}
      </div></fieldset>
      <fieldset><legend>Typing settings</legend>
        <label class="check"><input type="checkbox" name="easyMode" ${st.easyMode ? 'checked' : ''}> <span><b>Easy mode</b> - only lowercase letters and spaces (no capitals or punctuation). Good for young beginners.</span></label>
        <label class="check"><input type="checkbox" name="stopOnError" ${st.stopOnError ? 'checked' : ''}> <span><b>Wait for the right key</b> - the cursor will not move on until the correct key is pressed. Turn off for older kids, who will then use Backspace to fix mistakes.</span></label>
        <label class="check"><input type="checkbox" name="showKeyboard" ${st.showKeyboard ? 'checked' : ''}> <span><b>Show keyboard guide</b> - lights up the next key and which finger to use.</span></label>
        <label class="check"><input type="checkbox" name="unlockLessons" ${st.unlockLessons ? 'checked' : ''}> <span><b>Unlock all lessons</b> - normally each lesson opens once the one before it is passed with ${PASS_ACCURACY}% accuracy.</span></label>
        <label class="check"><input type="checkbox" name="sound" ${st.sound ? 'checked' : ''}> <span><b>Sounds</b> - a soft "bonk" when a wrong key is pressed, and a happy chime when a passage or lesson is finished.
          <button class="ghost small-btn" type="button" data-act="test-sound">🔊 Test sound</button></span></label>
        <label>Speed goal (words per minute) <input name="goalWpm" type="number" min="1" max="200" value="${st.goalWpm}"></label>
        <p class="note">Rough guide: ages 7-8 aim for 10-15 WPM, ages 9-11 for 15-25, teens 30-40+.</p>
      </fieldset>
      <div class="row">
        <button class="primary" type="submit">Save</button>
        ${p ? '<button class="danger" type="button" data-act="delete">Delete typist</button>' : ''}
      </div>
    </form>`;
  on('[data-act="back"]', () => go(back || viewParent));
  on('[data-act="test-sound"]', (el, e) => { e.preventDefault(); playSound('done', true); setTimeout(() => playSound('mistake', true), 700); });
  $('#pf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = {
      name: f.get('name').trim(),
      avatar: f.get('avatar'),
      color: f.get('color'),
      settings: {
        easyMode: f.has('easyMode'), stopOnError: f.has('stopOnError'), showKeyboard: f.has('showKeyboard'),
        sound: f.has('sound'), unlockLessons: f.has('unlockLessons'), goalWpm: Number(f.get('goalWpm')) || 20,
      },
    };
    try {
      if (p) await store.updateProfile(p.id, data);
      else await store.addProfile(data);
      go(back || viewParent);
    } catch (err) { toast(`Could not save: ${err.message}`); }
  });
  on('[data-act="delete"]', async () => {
    if (!confirm(`Delete ${p.name} and all of their results? This cannot be undone.`)) return;
    try {
      await store.deleteProfile(p.id);
      if (ui.profileId === p.id) ui.profileId = null;
      go(viewParent);
    } catch (err) { toast(`Could not delete: ${err.message}`); }
  });
}

function viewParent() {
  app.innerHTML = `
    <header class="top">
      <button class="ghost" data-act="home">← Home</button>
      <h2>Parent settings</h2><div></div>
    </header>
    <section class="panel">
      <h3>Typists</h3>
      <div class="plist">${store.profiles.map((p) => {
        const s = summarize(store.resultsFor(p.id));
        return `<div class="prow"><span class="avatar sm">${esc(p.avatar)}</span><b>${esc(p.name)}</b>
          <span class="muted">best ${s.bestWpm} WPM · ${s.avgAcc || '–'}% recent accuracy · ${s.done.size} passages${p.settings.easyMode ? ' · easy mode' : ''}</span>
          <button class="ghost" data-edit="${esc(p.id)}">Edit</button></div>`;
      }).join('') || '<p class="note">No typists yet.</p>'}</div>
      <button class="primary" data-act="add">＋ Add a typist</button>
    </section>
    <section class="panel">
      <h3>Family passages</h3>
      <p class="note">Add your own verses, such as this week's memory verse or another translation. They appear in Practice and in speed tests at the level that fits their length.</p>
      <form class="form" id="vf">
        <label>Reference <input name="ref" maxlength="80" placeholder="e.g. Romans 12:12" required></label>
        <label>Translation (optional) <input name="translation" maxlength="20" placeholder="e.g. ESV"></label>
        <label>Text <textarea name="text" rows="3" maxlength="3000" required></textarea></label>
        <button class="primary" type="submit">Add passage</button>
      </form>
      <div class="vlist">${store.customPassages.map((v) => `<div class="prow"><b>${esc(v.ref)}</b><span class="muted">${esc(v.text.slice(0, 80))}${v.text.length > 80 ? '…' : ''}</span>
        <button class="ghost danger-text" data-del="${esc(v.id)}">Remove</button></div>`).join('')}</div>
    </section>
    <section class="panel">
      <h3>This computer's keyboard</h3>
      <p class="note">Hand placement is the same on both. This only changes the key names shown, like <b>delete</b> and <b>return</b> on a Mac versus <b>Backspace</b> and <b>Enter</b> on Windows. It is remembered separately on each computer.</p>
      ${osToggle()}
    </section>
    <section class="panel">
      <h3>Backup</h3>
      <p class="note">${store.remote ? '✅ Progress is saved on the server (your NAS), so it is shared by every computer in the house.' : '⚠️ Progress is saved in this browser only.'}</p>
      <div class="row">
        <button class="ghost" data-act="export">⬇️ Download backup</button>
        <label class="ghost filebtn">⬆️ Restore backup<input type="file" accept="application/json,.json" id="imp" hidden></label>
      </div>
    </section>
    <section class="panel">
      <h3>How scores work</h3>
      <ul class="note">
        <li><b>Speed (WPM)</b> = correctly typed characters ÷ 5 ÷ minutes. Every 5 characters, including spaces, count as one word. Mistakes left in do not count.</li>
        <li><b>Accuracy</b> = the share of key presses that were right. A mistake still counts even if it is fixed with Backspace.</li>
        <li><b>Stars</b> on a passage: 1 for finishing, 2 for 90%+ accuracy, 3 for 97%+.</li>
        <li>Built-in verses are from the King James Version (public domain). The Declaration of Independence, Constitution and Bill of Rights are word for word from the National Archives transcripts, with their original spelling.</li>
      </ul>
    </section>`;
  on('[data-act="home"]', () => go(viewHome));
  on('[data-act="add"]', () => go(viewProfileEditor, null, viewParent));
  wireOsToggle(() => go(viewParent));
  on('[data-edit]', (el) => go(viewProfileEditor, el.dataset.edit, viewParent));
  on('[data-del]', async (el) => {
    if (!confirm('Remove this passage?')) return;
    try { await store.deletePassage(el.dataset.del); go(viewParent); } catch (err) { toast(err.message); }
  });
  $('#vf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const text = normalizeText(f.get('text'));
    if (!/^[\x20-\x7E]+$/.test(text)) {
      toast('That text has characters that are hard to type on a normal keyboard. Please remove them.');
      return;
    }
    try {
      await store.addPassage({ ref: f.get('ref'), text, translation: f.get('translation') });
      toast('Passage added');
      go(viewParent);
    } catch (err) { toast(err.message); }
  });
  on('[data-act="export"]', () => {
    const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `scripture-typing-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#imp').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Restoring replaces ALL current typists and results with the backup. Continue?')) return;
    try {
      await store.importAll(JSON.parse(await file.text()));
      toast('Backup restored');
      go(viewParent);
    } catch (err) { toast(`Restore failed: ${err.message}`); }
  });
}

// ---------------- start ----------------
(async function start() {
  try {
    await store.init();
  } catch (err) {
    app.innerHTML = `<p class="note center">Could not load data from the server: ${esc(err.message)}</p>`;
    return;
  }
  let last = null;
  try { last = localStorage.getItem(LAST_PROFILE_KEY); } catch { /* ignore */ }
  if (last && store.profile(last)) { ui.profileId = last; go(viewDashboard); } else go(viewHome);
})();
