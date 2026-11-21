// Two clay hands resting on the home row (the same clay artwork style as the rest of the app).
// Each fingertip carries a small dot in that finger's keyboard colour, labelled with its home key;
// the finger(s) to use next grow into a big glowing marker showing the key to press.

// Fingertip centres on public/art/hands.webp, in % of its width and height (found from the picture's outline).
const TIPS = {
  L1: [4.43, 26.21], L2: [12.83, 15.27], L3: [21.89, 9.22], L4: [31.7, 15.97],
  R4: [68.21, 15.75], R3: [78.02, 9.15], R2: [86.98, 15.04], R1: [95.47, 26.41],
  TL: [44.0, 48.62], TR: [55.9, 48.67],
};
const HOME = { L1: 'A', L2: 'S', L3: 'D', L4: 'F', R4: 'J', R3: 'K', R2: 'L', R1: ';', TL: '', TR: '' };
const finger = (tip) => (tip.startsWith('T') ? 'T' : tip);   // both thumbs are the "T" finger

export function renderHands(container) {
  container.innerHTML = `
    <div class="hands-art" role="img" aria-label="Hands on the home row">
      <img src="art/hands.webp" alt="" draggable="false">
      ${Object.entries(TIPS).map(([tip, [x, y]]) => `
        <span class="tip f-${finger(tip)}" data-tip="${tip}" style="left:${x}%;top:${y}%"><b>${HOME[tip]}</b></span>`).join('')}
    </div>`;
  const box = container.querySelector('.hands-art');
  const tips = [...container.querySelectorAll('.tip')];
  return {
    // fingers: { L3: 'E', L1: 'Shift' } -> those fingers light up with that label
    show(fingers = {}) {
      box.classList.toggle('many', Object.keys(fingers).length > 4);
      for (const el of tips) {
        const label = fingers[finger(el.dataset.tip)];
        const on = label !== undefined;
        el.classList.toggle('on', on);
        const b = el.querySelector('b');
        b.textContent = on ? label : HOME[el.dataset.tip];
        b.classList.toggle('small', on && label.length > 1);
      }
    },
  };
}
