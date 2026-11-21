// On-screen keyboard that lights up the next key and shows which finger to use.
// The letter keys are the same on Mac and Windows; only the names of a few keys
// (delete/Backspace, return/Enter) and the bottom row (command/option vs Ctrl/Win/Alt) differ.

const ROWS = [
  [['`', '~'], ['1', '!'], ['2', '@'], ['3', '#'], ['4', '$'], ['5', '%'], ['6', '^'], ['7', '&'], ['8', '*'], ['9', '('], ['0', ')'], ['-', '_'], ['=', '+'], ['Backspace']],
  [['Tab'], ['q'], ['w'], ['e'], ['r'], ['t'], ['y'], ['u'], ['i'], ['o'], ['p'], ['[', '{'], [']', '}'], ['\\', '|']],
  [['Caps'], ['a'], ['s'], ['d'], ['f'], ['g'], ['h'], ['j'], ['k'], ['l'], [';', ':'], ["'", '"'], ['Enter']],
  [['ShiftL'], ['z'], ['x'], ['c'], ['v'], ['b'], ['n'], ['m'], [',', '<'], ['.', '>'], ['/', '?'], ['ShiftR']],
  [['Mod1'], ['Mod2'], ['Mod3'], ['Space'], ['Mod4'], ['Mod5'], ['Mod6']],
];

// Finger for each base key. L/R + pinky(1) ring(2) middle(3) index(4), thumb = T.
const FINGER = {};
const assign = (keys, f) => keys.split('').forEach((k) => { FINGER[k] = f; });
assign('`1qaz', 'L1'); assign('2wsx', 'L2'); assign('3edc', 'L3'); assign('45rtfgvb', 'L4');
assign('67yuhjnm', 'R4'); assign('8ik,', 'R3'); assign('9ol.', 'R2'); assign("0p;/-=[]\\'", 'R1');
FINGER.ShiftL = 'L1'; FINGER.ShiftR = 'R1'; FINGER.Space = 'T'; FINGER.Tab = 'L1'; FINGER.Caps = 'L1';
FINGER.Enter = 'R1'; FINGER.Backspace = 'R1';

export const FINGER_NAMES = {
  L1: 'left pinky', L2: 'left ring finger', L3: 'left middle finger', L4: 'left pointer finger',
  R4: 'right pointer finger', R3: 'right middle finger', R2: 'right ring finger', R1: 'right pinky', T: 'thumb',
};

// ---- Mac or Windows: detected, and changeable on each computer ----
const OS_KEY = 'stt-keyboard';
export function detectOS() {
  const p = (navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || '');
  return /mac|iphone|ipad/i.test(p) ? 'mac' : 'windows';
}
export function getOS() {
  try { const v = localStorage.getItem(OS_KEY); if (v === 'mac' || v === 'windows') return v; } catch { /* ignore */ }
  return detectOS();
}
export function setOS(os) { try { localStorage.setItem(OS_KEY, os); } catch { /* ignore */ } }

const LABELS = {
  windows: {
    Backspace: 'Backspace', Tab: 'Tab', Caps: 'Caps Lock', Enter: 'Enter', ShiftL: 'Shift', ShiftR: 'Shift', Space: '',
    Mod1: 'Ctrl', Mod2: '⊞ Win', Mod3: 'Alt', Mod4: 'Alt', Mod5: '⊞ Win', Mod6: 'Ctrl',
  },
  mac: {
    Backspace: 'delete', Tab: 'tab', Caps: 'caps lock', Enter: 'return', ShiftL: 'shift', ShiftR: 'shift', Space: '',
    Mod1: 'control', Mod2: 'option', Mod3: '⌘ command', Mod4: '⌘ command', Mod5: 'option', Mod6: '',
  },
};
export const keyNames = (os = getOS()) => ({
  erase: os === 'mac' ? 'delete' : 'Backspace',
  enter: os === 'mac' ? 'return' : 'Enter',
  shift: os === 'mac' ? 'shift' : 'Shift',
});

const SHIFTED = {};
for (const row of ROWS) for (const [base, shifted] of row) if (shifted) SHIFTED[shifted] = base;

// Which physical key (and shift?) makes a character.
export function keyFor(ch) {
  if (ch === ' ') return { key: 'Space', shift: false };
  if (/[A-Z]/.test(ch)) return { key: ch.toLowerCase(), shift: true };
  if (SHIFTED[ch]) return { key: SHIFTED[ch], shift: true };
  return { key: ch, shift: false };
}

// The fingers used for a character, e.g. 'E' -> { L3: 'E', R1: 'shift' }.
export function fingersFor(ch, os = getOS()) {
  if (ch === undefined) return {};
  const { key, shift } = keyFor(ch);
  const f = FINGER[key];
  if (!f) return {};
  const label = key === 'Space' ? 'space' : (/[a-z]/.test(key) ? key.toUpperCase() : (shift ? ch : key));
  const out = { [f]: label };
  if (shift) out[f.startsWith('R') ? 'L1' : 'R1'] = keyNames(os).shift;
  return out;
}

export function renderKeyboard(container, { os = getOS(), mark = [] } = {}) {
  const labels = LABELS[os];
  const wrap = document.createElement('div');
  wrap.className = `kb kb-${os}`;
  for (const row of ROWS) {
    const r = document.createElement('div');
    r.className = 'kb-row';
    for (const [base, shifted] of row) {
      const k = document.createElement('div');
      const isMod = base.startsWith('Mod');
      k.className = `kb-key f-${FINGER[base] || 'none'} k-${isMod ? 'mod' : base.length > 1 ? base : 'char'}`;
      k.dataset.key = base;
      if (labels[base] !== undefined) { k.textContent = labels[base]; if (labels[base].length > 1) k.classList.add('word'); }
      else if (/[a-z]/.test(base)) k.textContent = os === 'mac' ? base : base.toUpperCase();
      else k.innerHTML = `<small>${escapeHtml(shifted || '')}</small><span>${escapeHtml(base)}</span>`;
      if (base === 'f' || base === 'j') k.classList.add('bump');
      if (mark.includes(base)) k.classList.add('marked');
      r.appendChild(k);
    }
    wrap.appendChild(r);
  }
  const hint = document.createElement('div');
  hint.className = 'kb-hint';
  container.replaceChildren(wrap, hint);

  return {
    highlight(ch) {
      wrap.querySelectorAll('.next').forEach((el) => el.classList.remove('next'));
      if (ch === undefined) { hint.textContent = ''; return; }
      const { key, shift } = keyFor(ch);
      const el = wrap.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (el) el.classList.add('next');
      let text = `Use your ${FINGER_NAMES[FINGER[key]] || 'finger'}`;
      if (shift) {
        // Shift with the opposite hand from the key.
        const right = (FINGER[key] || '').startsWith('R');
        wrap.querySelector(`[data-key="${right ? 'ShiftL' : 'ShiftR'}"]`)?.classList.add('next');
        text += ` + ${right ? 'left' : 'right'} pinky on ${keyNames(os).shift}`;
      }
      hint.textContent = text;
    },
  };
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
