// On-screen keyboard that lights up the next key and shows which finger to use.

const ROWS = [
  [['`', '~'], ['1', '!'], ['2', '@'], ['3', '#'], ['4', '$'], ['5', '%'], ['6', '^'], ['7', '&'], ['8', '*'], ['9', '('], ['0', ')'], ['-', '_'], ['=', '+'], ['Backspace']],
  [['Tab'], ['q'], ['w'], ['e'], ['r'], ['t'], ['y'], ['u'], ['i'], ['o'], ['p'], ['[', '{'], [']', '}'], ['\\', '|']],
  [['Caps'], ['a'], ['s'], ['d'], ['f'], ['g'], ['h'], ['j'], ['k'], ['l'], [';', ':'], ["'", '"'], ['Enter']],
  [['ShiftL'], ['z'], ['x'], ['c'], ['v'], ['b'], ['n'], ['m'], [',', '<'], ['.', '>'], ['/', '?'], ['ShiftR']],
  [['Space']],
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

const SHIFTED = {};
for (const row of ROWS) for (const [base, shifted] of row) if (shifted) SHIFTED[shifted] = base;

// Which physical key (and shift?) makes a character.
export function keyFor(ch) {
  if (ch === ' ') return { key: 'Space', shift: false };
  if (/[A-Z]/.test(ch)) return { key: ch.toLowerCase(), shift: true };
  if (SHIFTED[ch]) return { key: SHIFTED[ch], shift: true };
  return { key: ch, shift: false };
}

const LABEL = { ShiftL: 'Shift', ShiftR: 'Shift', Space: '', Backspace: '⌫', Caps: 'Caps', Tab: 'Tab', Enter: 'Enter' };

export function renderKeyboard(container) {
  const wrap = document.createElement('div');
  wrap.className = 'kb';
  for (const row of ROWS) {
    const r = document.createElement('div');
    r.className = 'kb-row';
    for (const [base, shifted] of row) {
      const k = document.createElement('div');
      k.className = `kb-key f-${FINGER[base] || 'none'} k-${base.length > 1 ? base : 'char'}`;
      k.dataset.key = base;
      if (LABEL[base] !== undefined) k.textContent = LABEL[base];
      else if (/[a-z]/.test(base)) k.textContent = base.toUpperCase();
      else k.innerHTML = `<small>${escapeHtml(shifted || '')}</small><span>${escapeHtml(base)}</span>`;
      if (base === 'f' || base === 'j') k.classList.add('bump');
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
        text += ` + ${right ? 'left' : 'right'} Shift`;
      }
      hint.textContent = text;
    },
  };
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
