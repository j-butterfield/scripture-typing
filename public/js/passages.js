import { FOUNDING_TEXT, FOUNDING_DOCS } from './founding-text.js';

// Built-in passages from the King James Version (public domain).
// Level is worked out from length: 1 = short verse, 2 = a verse or two, 3 = a full passage.
// Parents can add more passages (any translation) from the Parent page in the app.

const RAW = [
  ['john-11-35', 'John 11:35', 'Jesus wept.'],
  ['1thess-5-16-17', '1 Thessalonians 5:16-17', 'Rejoice evermore. Pray without ceasing.'],
  ['psalm-23-1', 'Psalm 23:1', 'The LORD is my shepherd; I shall not want.'],
  ['psalm-56-3', 'Psalm 56:3', 'What time I am afraid, I will trust in thee.'],
  ['1john-4-19', '1 John 4:19', 'We love him, because he first loved us.'],
  ['genesis-1-1', 'Genesis 1:1', 'In the beginning God created the heaven and the earth.'],
  ['genesis-1-3', 'Genesis 1:3', 'And God said, Let there be light: and there was light.'],
  ['1peter-5-7', '1 Peter 5:7', 'Casting all your care upon him; for he careth for you.'],
  ['psalm-119-105', 'Psalm 119:105', 'Thy word is a lamp unto my feet, and a light unto my path.'],
  ['philippians-4-13', 'Philippians 4:13', 'I can do all things through Christ which strengtheneth me.'],
  ['ephesians-6-1', 'Ephesians 6:1', 'Children, obey your parents in the Lord: for this is right.'],
  ['hebrews-13-8', 'Hebrews 13:8', 'Jesus Christ the same yesterday, and to day, and for ever.'],
  ['proverbs-17-17', 'Proverbs 17:17', 'A friend loveth at all times, and a brother is born for adversity.'],
  ['psalm-150-6', 'Psalm 150:6', 'Let every thing that hath breath praise the LORD. Praise ye the LORD.'],
  ['john-15-12', 'John 15:12', 'This is my commandment, That ye love one another, as I have loved you.'],
  ['psalm-118-24', 'Psalm 118:24', 'This is the day which the LORD hath made; we will rejoice and be glad in it.'],
  ['colossians-3-20', 'Colossians 3:20', 'Children, obey your parents in all things: for this is well pleasing unto the Lord.'],
  ['matthew-5-9', 'Matthew 5:9', 'Blessed are the peacemakers: for they shall be called the children of God.'],
  ['hebrews-11-1', 'Hebrews 11:1', 'Now faith is the substance of things hoped for, the evidence of things not seen.'],
  ['james-1-22', 'James 1:22', 'But be ye doers of the word, and not hearers only, deceiving your own selves.'],
  ['psalm-34-8', 'Psalm 34:8', 'O taste and see that the LORD is good: blessed is the man that trusteth in him.'],
  ['proverbs-3-5-6', 'Proverbs 3:5-6', 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.'],
  ['romans-3-23', 'Romans 3:23', 'For all have sinned, and come short of the glory of God;'],
  ['romans-6-23', 'Romans 6:23', 'For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.'],
  ['john-3-16', 'John 3:16', 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'],
  ['john-14-6', 'John 14:6', 'Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.'],
  ['ephesians-4-32', 'Ephesians 4:32', "And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you."],
  ['ephesians-2-8-9', 'Ephesians 2:8-9', 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.'],
  ['exodus-20-12', 'Exodus 20:12', 'Honour thy father and thy mother: that thy days may be long upon the land which the LORD thy God giveth thee.'],
  ['deuteronomy-6-5', 'Deuteronomy 6:5', 'And thou shalt love the LORD thy God with all thine heart, and with all thy soul, and with all thy might.'],
  ['psalm-46-10', 'Psalm 46:10', 'Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.'],
  ['psalm-19-14', 'Psalm 19:14', 'Let the words of my mouth, and the meditation of my heart, be acceptable in thy sight, O LORD, my strength, and my redeemer.'],
  ['psalm-121-1-2', 'Psalm 121:1-2', 'I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth.'],
  ['matthew-7-7', 'Matthew 7:7', 'Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you:'],
  ['matthew-7-12', 'Matthew 7:12', 'Therefore all things whatsoever ye would that men should do to you, do ye even so to them: for this is the law and the prophets.'],
  ['matthew-19-14', 'Matthew 19:14', 'But Jesus said, Suffer little children, and forbid them not, to come unto me: for of such is the kingdom of heaven.'],
  ['matthew-22-37', 'Matthew 22:37', 'Jesus said unto him, Thou shalt love the Lord thy God with all thy heart, and with all thy soul, and with all thy mind.'],
  ['1john-1-9', '1 John 1:9', 'If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.'],
  ['romans-8-28', 'Romans 8:28', 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.'],
  ['2timothy-3-16', '2 Timothy 3:16', 'All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness:'],
  ['jeremiah-29-11', 'Jeremiah 29:11', 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.'],
  ['micah-6-8', 'Micah 6:8', 'He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?'],
  ['philippians-4-6', 'Philippians 4:6', 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.'],
  ['galatians-5-22-23', 'Galatians 5:22-23', 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, Meekness, temperance: against such there is no law.'],
  ['lamentations-3-22-23', 'Lamentations 3:22-23', "It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness."],
  ['joshua-1-9', 'Joshua 1:9', 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.'],
  ['isaiah-40-31', 'Isaiah 40:31', 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.'],
  ['isaiah-9-6', 'Isaiah 9:6', 'For unto us a child is born, unto us a son is given: and the government shall be upon his shoulder: and his name shall be called Wonderful, Counsellor, The mighty God, The everlasting Father, The Prince of Peace.'],
  ['numbers-6-24-26', 'Numbers 6:24-26', 'The LORD bless thee, and keep thee: The LORD make his face shine upon thee, and be gracious unto thee: The LORD lift up his countenance upon thee, and give thee peace.'],
  ['philippians-4-8', 'Philippians 4:8', 'Finally, brethren, whatsoever things are true, whatsoever things are honest, whatsoever things are just, whatsoever things are pure, whatsoever things are lovely, whatsoever things are of good report; if there be any virtue, and if there be any praise, think on these things.'],
  ['matthew-28-19-20', 'Matthew 28:19-20', 'Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost: Teaching them to observe all things whatsoever I have commanded you: and, lo, I am with you alway, even unto the end of the world. Amen.'],
  ['psalm-23', 'Psalm 23', "The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake. Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me. Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over. Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever."],
  ['psalm-100', 'Psalm 100', 'Make a joyful noise unto the LORD, all ye lands. Serve the LORD with gladness: come before his presence with singing. Know ye that the LORD he is God: it is he that hath made us, and not we ourselves; we are his people, and the sheep of his pasture. Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name. For the LORD is good; his mercy is everlasting; and his truth endureth to all generations.'],
  ['psalm-1-1-3', 'Psalm 1:1-3', 'Blessed is the man that walketh not in the counsel of the ungodly, nor standeth in the way of sinners, nor sitteth in the seat of the scornful. But his delight is in the law of the LORD; and in his law doth he meditate day and night. And he shall be like a tree planted by the rivers of water, that bringeth forth his fruit in his season; his leaf also shall not wither; and whatsoever he doeth shall prosper.'],
  ['matthew-6-9-13', 'Matthew 6:9-13', 'Our Father which art in heaven, Hallowed be thy name. Thy kingdom come. Thy will be done in earth, as it is in heaven. Give us this day our daily bread. And forgive us our debts, as we forgive our debtors. And lead us not into temptation, but deliver us from evil: For thine is the kingdom, and the power, and the glory, for ever. Amen.'],
  ['1cor-13-4-7', '1 Corinthians 13:4-7', 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up, Doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil; Rejoiceth not in iniquity, but rejoiceth in the truth; Beareth all things, believeth all things, hopeth all things, endureth all things.'],
  ['genesis-1-1-5', 'Genesis 1:1-5', 'In the beginning God created the heaven and the earth. And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters. And God said, Let there be light: and there was light. And God saw the light, that it was good: and God divided the light from the darkness. And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.'],
  ['john-1-1-5', 'John 1:1-5', 'In the beginning was the Word, and the Word was with God, and the Word was God. The same was in the beginning with God. All things were made by him; and without him was not any thing made that was made. In him was life; and the life was the light of men. And the light shineth in darkness; and the darkness comprehended it not.'],
  ['matthew-5-3-10', 'Matthew 5:3-10', "Blessed are the poor in spirit: for theirs is the kingdom of heaven. Blessed are they that mourn: for they shall be comforted. Blessed are the meek: for they shall inherit the earth. Blessed are they which do hunger and thirst after righteousness: for they shall be filled. Blessed are the merciful: for they shall obtain mercy. Blessed are the pure in heart: for they shall see God. Blessed are the peacemakers: for they shall be called the children of God. Blessed are they which are persecuted for righteousness' sake: for theirs is the kingdom of heaven."],
  ['luke-2-8-14', 'Luke 2:8-14', 'And there were in the same country shepherds abiding in the field, keeping watch over their flock by night. And, lo, the angel of the Lord came upon them, and the glory of the Lord shone round about them: and they were sore afraid. And the angel said unto them, Fear not: for, behold, I bring you good tidings of great joy, which shall be to all people. For unto you is born this day in the city of David a Saviour, which is Christ the Lord. And this shall be a sign unto you; Ye shall find the babe wrapped in swaddling clothes, lying in a manger. And suddenly there was with the angel a multitude of the heavenly host praising God, and saying, Glory to God in the highest, and on earth peace, good will toward men.'],
  ['ecclesiastes-3-1-4', 'Ecclesiastes 3:1-4', 'To every thing there is a season, and a time to every purpose under the heaven: A time to be born, and a time to die; a time to plant, and a time to pluck up that which is planted; A time to kill, and a time to heal; a time to break down, and a time to build up; A time to weep, and a time to laugh; a time to mourn, and a time to dance;'],
];

export function levelFor(text) {
  if (text.length <= 80) return 1;
  if (text.length <= 200) return 2;
  return 3;
}

export const LEVELS = {
  1: { name: 'Level 1', label: 'Short verses', emoji: '🌱' },
  2: { name: 'Level 2', label: 'Longer verses', emoji: '🌿' },
  3: { name: 'Level 3', label: 'Whole passages', emoji: '🌳' },
};

export const COLLECTIONS = {
  bible: { name: 'Bible', emoji: '📖' },
  founding: { name: 'Founding Documents', emoji: '🇺🇸' },
};
export { FOUNDING_DOCS };

// Bible passages (the verse of the day comes only from these).
export const PASSAGES = RAW.map(([id, ref, text]) => ({
  id, ref, text, level: levelFor(text), translation: 'KJV', builtIn: true, collection: 'bible',
}));

// The Declaration of Independence, the Constitution and the Bill of Rights, in document order.
export const FOUNDING = FOUNDING_TEXT.map(([id, doc, ref, text]) => ({
  id, doc, ref, text, level: levelFor(text), translation: '', builtIn: true, collection: 'founding',
}));
