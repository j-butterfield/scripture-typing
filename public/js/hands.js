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
      <rect x="44" y="118" width="178" height="100" rx="40" class="palm"/>
      <rect x="340" y="118" width="178" height="100" rx="40" class="palm"/>
      <g class="finger" data-f="T"><rect x="226" y="118" width="${W}" height="78" rx="17" class="fill-T" transform="rotate(-40 243 157)"/>
        <rect x="302" y="118" width="${W}" height="78" rx="17" class="fill-T" transform="rotate(40 319 157)"/></g>
      ${fingers}
      <text x="133" y="190" text-anchor="middle" class="handlabel">left hand</text>
      <text x="429" y="190" text-anchor="middle" class="handlabel">right hand</text>
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
