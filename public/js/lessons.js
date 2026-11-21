// Touch-typing lessons: posture first, then the home row, top row and bottom row, a key or two
// at a time, then capitals and punctuation. Each key is drilled on its own (reaching from its
// home key and back), then mixed with keys already learned, then used in real words and short
// Bible phrases. Lessons pass on accuracy, not speed: accuracy first, speed comes later.

export const PASS_ACCURACY = 90;

// Home key for each finger, and where every key sits.
const HOME = { L1: 'a', L2: 's', L3: 'd', L4: 'f', R4: 'j', R3: 'k', R2: 'l', R1: ';' };
const FINGER_OF = {};
const put = (keys, f) => [...keys].forEach((k) => { FINGER_OF[k] = f; });
put('qaz', 'L1'); put('wsx', 'L2'); put('edc', 'L3'); put('rfvtgb', 'L4');
put('yhnujm', 'R4'); put('ik,', 'R3'); put('ol.', 'R2'); put("p;/'", 'R1');
const ROW = {};
[...'qwertyuiop'].forEach((k) => { ROW[k] = 'top'; });
[...'asdfghjkl;\''].forEach((k) => { ROW[k] = 'home'; });
[...'zxcvbnm,./'].forEach((k) => { ROW[k] = 'bottom'; });

const FINGER_WORDS = {
  L1: 'left pinky', L2: 'left ring finger', L3: 'left middle finger', L4: 'left pointer finger',
  R4: 'right pointer finger', R3: 'right middle finger', R2: 'right ring finger', R1: 'right pinky',
};
const KEY_NAME = { ';': 'semicolon (;)', ',': 'comma (,)', '.': 'period (.)', '/': 'slash (/)', "'": "apostrophe (')" };
const name = (k) => KEY_NAME[k] || k.toUpperCase();

export function fingerOf(k) { return FINGER_OF[k.toLowerCase()]; }

// "Reach up with your left middle finger from D to E, then come back to D."
export function howToReach(k) {
  const f = FINGER_OF[k];
  const home = HOME[f];
  const who = FINGER_WORDS[f];
  if (k === home) return `${name(k)} is a home key. Your ${who} rests on it.`;
  const sideways = (k === 'g' || k === 'h' || k === "'");
  if (sideways) {
    const dir = f.startsWith('L') ? 'right' : (k === "'" ? 'right' : 'left');
    return `Stretch your ${who} one key to the ${dir}, from ${name(home)} to ${name(k)}, then slide back to ${name(home)}.`;
  }
  const dir = ROW[k] === 'top' ? 'up' : 'down';
  const inward = ['t', 'b', 'y', 'n'].includes(k) ? ' and a little toward the middle' : '';
  return `Reach ${dir}${inward} with your ${who} from ${name(home)} to ${name(k)}, then come back to ${name(home)}.`;
}

const TIPS = [
  'Keep your eyes on the screen, not on your hands. Peek at the keyboard picture instead.',
  'Feel for the little bumps on F and J. They help you find home without looking.',
  'Tap the keys lightly, like raindrops. No need to press hard.',
  'Let your wrists float just above the keyboard while you type.',
  'Keep your fingers curved, like you are holding a small ball.',
  'After every key, your finger goes back home.',
  'Go slowly and get it right. Speed comes by itself later.',
  'Sit tall with your feet flat on the floor (or on a box if they do not reach).',
  'Press the space bar with your thumb.',
  'If your hands get tired, stop and stretch your fingers for a moment.',
];

export const UNITS = ['Start here', 'Home row', 'Top row', 'Bottom row', 'Capitals and punctuation', 'Graduation'];

export const LESSONS = [
  { id: 'posture', unit: 'Start here', title: 'Sitting and hands', keys: '', icon: '🪑' },
  { id: 'fj', unit: 'Home row', title: 'F and J', keys: 'fj' },
  { id: 'dk', unit: 'Home row', title: 'D and K', keys: 'dk' },
  { id: 'sl', unit: 'Home row', title: 'S and L', keys: 'sl' },
  { id: 'a;', unit: 'Home row', title: 'A and ;', keys: 'a;' },
  { id: 'gh', unit: 'Home row', title: 'G and H', keys: 'gh' },
  {
    id: 'home-review', unit: 'Home row', title: 'Home row review', keys: '', review: true,
    phrases: ['a lad has a flask', 'dad has a glass; a lad has a flask', 'all shall ask', 'glad lads dash', 'a sad lass falls; dad shall ask'],
  },
  { id: 'ei', unit: 'Top row', title: 'E and I', keys: 'ei' },
  { id: 'ru', unit: 'Top row', title: 'R and U', keys: 'ru' },
  { id: 'ty', unit: 'Top row', title: 'T and Y', keys: 'ty' },
  { id: 'wo', unit: 'Top row', title: 'W and O', keys: 'wo' },
  { id: 'qp', unit: 'Top row', title: 'Q and P', keys: 'qp' },
  {
    id: 'top-review', unit: 'Top row', title: 'Top row review', keys: '', review: true,
    // Before Shift is taught: only phrases that are correct all in lowercase (no names, no God or LORD, no "I").
    phrases: ['pray always', 'a joyful heart', 'the tree of life', 'ye are the salt of the earth', 'ye are the light of the world', 'keep thy heart', 'the path of the just'],
  },
  { id: 'c,', unit: 'Bottom row', title: 'C and comma', keys: 'c,' },
  { id: 'vm', unit: 'Bottom row', title: 'V and M', keys: 'vm' },
  { id: 'bn', unit: 'Bottom row', title: 'B and N', keys: 'bn' },
  { id: 'x.', unit: 'Bottom row', title: 'X and period', keys: 'x.' },
  { id: 'z', unit: 'Bottom row', title: 'Z', keys: 'z' },
  {
    id: 'bottom-review', unit: 'Bottom row', title: 'Bottom row review', keys: '', review: true,
    phrases: ['pray without ceasing.', 'rejoice evermore.', 'love one another.', 'be ye kind one to another,', 'a soft answer turneth away wrath', 'a merry heart doeth good like a medicine', 'in every thing give thanks', 'blessed are the meek', 'blessed are the merciful'],
  },
  {
    id: 'shift', unit: 'Capitals and punctuation', title: 'Capital letters (Shift)', keys: '', shift: true,
    phrases: ['Jesus wept.', 'God is love.', 'Noah built an ark.', 'David and Jonathan were friends.', 'The LORD is good.', 'Peter, James and John', 'We the People of the United States', 'Life, Liberty and the pursuit of Happiness'],
  },
  {
    id: 'punct', unit: 'Capitals and punctuation', title: 'Apostrophe, colon and question mark', keys: "'", extra: ':?/', shift: true,
    phrases: ['What time I am afraid, I will trust in thee.', 'Have not I commanded thee?', "for his name's sake", 'Jesus saith unto him, I am the way', "It is of the LORD's mercies"],
  },
  {
    id: 'graduation', unit: 'Graduation', title: 'Type a whole verse', keys: '', shift: true, icon: '🎓',
    verses: [
      'Thy word is a lamp unto my feet, and a light unto my path.',
      'The LORD is my shepherd; I shall not want.',
      'I can do all things through Christ which strengtheneth me.',
      'We the People of the United States, in Order to form a more perfect Union,',
    ],
  },
];

// Every character a child may meet in a lesson: everything taught up to and including it.
export function allowedChars(index) {
  let set = ' ';
  for (let i = 1; i <= index; i++) set += LESSONS[i].keys + (LESSONS[i].extra || '');
  if (LESSONS.slice(0, index + 1).some((l) => l.shift)) set += set.toUpperCase();
  return new Set(set);
}
const taughtKeys = (index) => {
  let s = '';
  for (let i = 1; i <= index; i++) s += LESSONS[i].keys;
  return [...new Set(s)];
};

const WORDS = `a ad add aid all also and any are as ask at away
back bad be bed been best big bless blessed boat body bread brother but by
call came can child children  church city cold come cross cup
dad day dear did do does door dove down dust
each ear earth east eat egg else end even ever every eye
face faith fall far fast father fear feet field fig fill find fire first fish five flag flock flask for forgive found free friend from fruit full
gave gift give glad glass glory go  gold good grace grass great green
had half hall hand happy has hat have he head heal hear heard heart heaven help her here hid high hill him his holy home hope house how
if in is it
jar joy just keep kid kind king kingdom know lad lake lamb lamp land last laugh lead leaf learn life lift light like lion little live long look  lost love
made make man many may me mercy might mind more most mother mount much must my
name near new night no not now oak of off oil old on one only open or our out over
path peace pray praise prayer psalm pure put
quiet quick rain read red rest right river road rock rose run
sad said salad salt sand sat saw say sea see seed send serve she sheep shepherd shield ship sing sister sit sky so son song soul sound spirit star still stone strong sun sword
take tell than thank that the their them then there they thing this those three throne to told took tree true trust truth two
under up us very voice walk wall want was water way we well went were west what when who why wind wine wise with word work world
yes yet you young your zeal`.split(/\s+/);

const NAMES = ['God', 'Jesus', 'Lord', 'Adam', 'Eve', 'Noah', 'Abraham', 'Sarah', 'Isaac', 'Jacob', 'Joseph', 'Moses',
  'Aaron', 'Joshua', 'Ruth', 'Samuel', 'David', 'Solomon', 'Elijah', 'Jonah', 'Daniel', 'Esther', 'Mary', 'Martha',
  'Peter', 'James', 'John', 'Paul', 'Luke', 'Mark', 'Matthew', 'Bethlehem', 'Jerusalem', 'Israel', 'Egypt'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const fits = (word, allowed) => [...word].every((c) => allowed.has(c));

// "ded ded ded kik kik kik dek kid ..." - reach from home, press, come back home.
function reachDrill(keys) {
  const parts = [];
  for (const k of keys) {
    const home = HOME[FINGER_OF[k]];
    if (home === k) parts.push(`${k}${k}${k} ${k}${k}${k}`);
    else parts.push(`${home}${k}${home} ${home}${k}${home} ${home}${k}${home}`);
  }
  if (keys.length === 2) {
    const [a, b] = keys;
    parts.push(`${a}${a} ${b}${b} ${a}${b} ${b}${a} ${a}${b}${a} ${b}${a}${b}`);
  } else {
    parts.push(`${keys[0]}${keys[0]} ${keys[0]} ${keys[0]}${keys[0]}${keys[0]}`);
  }
  return parts.join(' ');
}

// Nonsense groups mixing the new keys (about half the letters) with keys already learned.
function mixDrill(newKeys, known, groups = 10) {
  const out = [];
  for (let g = 0; g < groups; g++) {
    const len = 2 + Math.floor(Math.random() * 4);
    let s = '';
    for (let i = 0; i < len; i++) s += Math.random() < 0.5 || !known.length ? pick(newKeys) : pick(known);
    out.push(s);
  }
  return out.join(' ');
}

function wordDrill(index, newKeys, count = 10) {
  const allowed = allowedChars(index);
  const ok = WORDS.filter((w) => fits(w, allowed));
  const withNew = ok.filter((w) => !newKeys.length || newKeys.some((k) => w.includes(k)));
  const pool = withNew.length >= 6 ? withNew : ok;
  if (pool.length < 5) return null;
  const chosen = [];
  while (chosen.length < count) chosen.push(...shuffle(pool));
  return chosen.slice(0, count).join(' ');
}

// The exercises for one run of a lesson. Each is { title, text }.
export function buildExercises(index) {
  const lesson = LESSONS[index];
  const ex = [];
  if (lesson.id === 'posture') {
    ex.push({ title: 'Find home row', text: 'asdf jkl; asdf jkl; asdf jkl;' });
    ex.push({ title: 'Each finger in turn', text: 'fdsa jkl; fdsa jkl; aa ss dd ff jj kk ll ;;' });
    return ex;
  }
  if (lesson.verses) {
    lesson.verses.forEach((v, i) => ex.push({ title: `Verse ${i + 1}`, text: v }));
    return ex;
  }
  const newKeys = [...lesson.keys];
  const known = taughtKeys(index).filter((k) => !newKeys.includes(k));
  if (lesson.shift) {
    if (newKeys.length) {
      ex.push({ title: 'New keys', text: `${reachDrill(newKeys)} ;;: ;;: ::: //? //? ???` });
    } else {
      ex.push({ title: 'Shift practice', text: 'Ff Jj Dd Kk Ss Ll Aa Gg Hh Ee Ii Rr Uu Tt Yy' });
      ex.push({ title: 'Names from the Bible', text: shuffle(NAMES).slice(0, 10).join(' ') });
    }
  } else if (lesson.review) {
    ex.push({ title: 'Mix it up', text: mixDrill(known, [], 12) });
  } else {
    ex.push({ title: 'New keys', text: reachDrill(newKeys) });
    ex.push({ title: 'Mix it up', text: mixDrill(newKeys, known) });
  }
  const words = wordDrill(index, lesson.review || lesson.shift ? [] : newKeys);
  if (words) ex.push({ title: 'Real words', text: words });
  if (lesson.phrases) ex.push({ title: 'Bible phrases', text: shuffle(lesson.phrases).slice(0, 3).join(' ') });
  return ex;
}

export function lessonGuide(index) {
  const lesson = LESSONS[index];
  return {
    steps: [...lesson.keys].map(howToReach),
    tip: TIPS[index % TIPS.length],
  };
}

// Posture checklist for the first lesson.
export const POSTURE = [
  { icon: '🪑', title: 'Sit tall', text: 'Sit back in your chair with your back straight. Keep your feet flat on the floor. If they do not reach, rest them on a box or a stack of books.' },
  { icon: '🖥️', title: 'Screen in front of you', text: 'The screen should be about an arm\'s length away, with the top of it at or a little below your eyes.' },
  { icon: '💪', title: 'Relaxed arms', text: 'Let your shoulders relax. Keep your elbows close to your sides and bent about like an L.' },
  { icon: '🪶', title: 'Floating wrists', text: 'Keep your wrists straight and let them float just above the keyboard while you type. Rest them only when you take a break.' },
  { icon: '🖐️', title: 'Curved fingers', text: 'Curve your fingers like you are holding a small ball, and tap the keys lightly.' },
  { icon: '🏠', title: 'Home row', text: 'Left fingers go on A S D F and right fingers go on J K L ;. Feel the little bumps on F and J with your pointer fingers. Rest both thumbs on the space bar.' },
  { icon: '👀', title: 'Eyes on the screen', text: 'Try not to look down at your hands. Use the keyboard picture on the screen to find keys instead.' },
  { icon: '↩️', title: 'Always come home', text: 'After you press a key, your finger goes back to its home key.' },
  { icon: '⏸️', title: 'Take breaks', text: 'Every 10 to 15 minutes, stop to wiggle and stretch your fingers.' },
];
