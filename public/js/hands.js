// Two hands resting on the home row. Fingers are colored like the on-screen keyboard,
// and the finger(s) to use next light up, labeled with the key they press.

const FINGERS = [
  // id, x, top of finger, home key
  ['L1', 52, 74, 'A'], ['L2', 94, 44, 'S'], ['L3', 136, 30, 'D'], ['L4', 178, 46, 'F'],
  ['R4', 350, 46, 'J'], ['R3', 392, 30, 'K'], ['R2', 434, 44, 'L'], ['R1', 476, 74, ';'],
];
const W = 34;

export function renderHands(container) {
  const fingers = FINGERS.map(([id, x, top, home]) => `
    <g class="finger" data-f="${id}">
      <rect x="${x}" y="${top}" width="${W}" height="${150 - top}" rx="17" class="fill-${id}"/>
      <circle cx="${x + W / 2}" cy="${top + 18}" r="13" class="tipdot"/>
      <text x="${x + W / 2}" y="${top + 23}" text-anchor="middle" class="tiplabel" data-home="${home}">${home}</text>
    </g>`).join('');
  container.innerHTML = `
    <svg class="hands" viewBox="0 0 562 230" role="img" aria-label="Hands on the home row">
      <!-- Each thumb grows from the lower inner corner of its palm and angles up toward the
           middle, resting on the space bar. Drawn before the palms so the bases tuck under them. -->
      <g class="finger" data-f="T">
        <rect x="-12" y="-18" width="97" height="36" rx="18" class="fill-T" transform="translate(206 192) rotate(-48)"/>
        <rect x="-85" y="-18" width="97" height="36" rx="18" class="fill-T" transform="translate(356 192) rotate(48)"/>
        <circle cx="251" cy="142" r="9" class="tipdot"/>
        <circle cx="311" cy="142" r="9" class="tipdot"/>
      </g>
      <path d="M44,142 Q44,118 68,118 L198,118 Q222,118 222,142 L214,198 Q210,226 182,226 L88,226 Q58,226 54,198 Z" class="palm"/>
      <path d="M518,142 Q518,118 494,118 L364,118 Q340,118 340,142 L348,198 Q352,226 380,226 L474,226 Q504,226 508,198 Z" class="palm"/>
      ${fingers}
      <text x="133" y="196" text-anchor="middle" class="handlabel">left hand</text>
      <text x="429" y="196" text-anchor="middle" class="handlabel">right hand</text>
    </svg>`;
  const svg = container.querySelector('svg');
  return {
    // fingers: { L3: 'E', L1: 'Shift' } -> those fingers light up with that label
    show(fingers = {}) {
      const any = Object.keys(fingers).length > 0;
      svg.classList.toggle('focus', any);
      svg.querySelectorAll('.finger').forEach((g) => {
        const label = fingers[g.dataset.f];
        g.classList.toggle('on', label !== undefined);
        const t = g.querySelector('.tiplabel');
        if (t) {
          t.textContent = label ?? t.dataset.home;
          t.classList.toggle('small', (label ?? '').length > 1);
        }
      });
    },
  };
}
