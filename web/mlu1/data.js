// Fixed tables: tiles, minerals, upgrades, gadgets, transmissions, cheat codes, key codes.
// See "World", "Economy", "Screens and states" and "Cheat codes" in docs/mlu1/specifications.md.

// ---- Map and tiles --------------------------------------------------------------------------

export const MAP_W = 48;
export const MAP_H = 3015;          // rows 3000..3014 are always magma (the mantle edge)
export const MAGMA = 54;            // tile value of magma; values >= MAGMA are passable
export const EMPTY = 80;            // a dug-out or open tile
export const GRANITE = 29;
export const MARBLE = 30;
export const LAVA = 31;
export const GAS = 28;
export const ICE9 = 50;
export const SHM = 30;              // particle slots
export const RCK = 15;              // falling rock slots
export const RW = 800;
export const RH = 600;

/** Image slot names for tile values 1..53 and magma, as used underground. */
export const GAME_TILES = {
  1: 'coal.png', 2: 'petrol.png', 3: 'iron.png', 4: 'copper.png', 5: 'quartz.png', 6: 'lead.png',
  7: 'bronze.png', 8: 'silver.png', 9: 'gold.png', 10: 'palladium.png', 11: 'cesium.png',
  12: 'platinum.png', 13: 'opal.png', 14: 'topaz.png', 15: 'emerald.png', 16: 'saphire.png',
  17: 'ruby.png', 18: 'diamond.png', 19: 'amazonite.png', 20: 'thorium.png', 21: 'uranium.png',
  22: 'plutonium.png', 23: 'moonstone.png', 24: 'starstone.png', 25: 'sunstone.png',
  26: 'kryptonite.png', 27: 'dark matter.png', 28: 'gas.png', 29: 'granite.png', 30: 'marble.png',
  31: 'lava.png', 32: 'adamite.png', 33: 'selenite.png', 34: 'gyrite.png', 35: 'froyite.png',
  36: 'aquamarine.png', 37: 'mimetite.png', 38: 'orpiment.png', 39: 'caledonite.png',
  40: 'fedgarnet.png', 41: 'tanzanite.png', 42: 'eng8.png', 43: 'fuel8.png', 44: 'cargo8.png',
  45: 'hull8.png', 46: 'rad8.png', 47: 'mithril.png', 48: 'unobtainium.png', 49: 'adamantium.png',
  50: 'ice9.png', 51: 'bomb1.png', 52: 'bomb2.png', 53: 'bomb3.png', 54: 'magma.png',
};
/** Christmas replacements for some tiles (snowglobe cheat). */
export const GAME_TILES_XMAS = {
  5: 'Xmass/quartz.png', 4: 'Xmass/copper.png', 14: 'Xmass/topaz.png', 17: 'Xmass/ruby.png',
  3: 'Xmass/iron.png',
};

/** Image slots 0..55 in the upgrades shop: 8 columns of 7. */
export const MENU_TILES = [
  'eng1.png', 'eng2.png', 'eng3.png', 'eng4.png', 'eng5.png', 'eng6.png', 'eng7.png',
  'fuel1.png', 'fuel2.png', 'fuel3.png', 'fuel4.png', 'fuel5.png', 'fuel6.png', 'fuel7.png',
  'cargo1.png', 'cargo2.png', 'cargo3.png', 'cargo4.png', 'cargo5.png', 'cargo6.png', 'cargo7.png',
  'rad1.png', 'rad2.png', 'rad3.png', 'rad4.png', 'rad5.png', 'rad6.png', 'rad7.png',
  'hull1.png', 'hull2.png', 'hull3.png', 'hull4.png', 'hull5.png', 'hull6.png', 'hull7.png',
  'bio1.png', 'bio2.png', 'bio3.png', 'bio4.png', 'bio5.png', 'bio6.png', 'bio7.png',
  'drill2.png', 'drill1.png', 'drill3.png', 'drill4.png', 'drill5.png', 'drill6.png', 'drill7.png',
  'bat1.png', 'bat2.png', 'bat3.png', 'bat4.png', 'bat5.png', 'bat6.png', 'bat7.png',
];
export const MENU_TILES_XMAS = { 42: 'Xmass/drill1.png', 28: 'Xmass/hull1.png' };

// ---- Minerals -------------------------------------------------------------------------------

const NAMES = {
  1: 'Coal', 2: 'Petroleum', 3: 'Iron', 4: 'Copper', 5: 'Quartz', 6: 'Lead', 7: 'Bronze',
  8: 'Silver', 9: 'Gold', 10: 'Palladium', 11: 'Cesium', 12: 'Platinum', 13: 'Opal', 14: 'Topaz',
  15: 'Emerald', 16: 'Saphire', 17: 'Ruby', 18: 'Diamond', 19: 'Amazonite', 20: 'Thorium',
  21: 'Uranium', 22: 'Plutonium', 23: 'Moonstone', 24: 'Starstone', 25: 'Sunstone',
  26: 'Kryptonite', 27: 'Dark Matter', 28: 'Granite', 29: 'Marble', 30: 'Lava', 31: 'Gas',
  32: 'Adamite', 33: 'Selenite', 34: 'Gyrite', 35: 'Froyite', 36: 'Aquamarine', 37: 'Mimetite',
  38: 'Orpiment', 39: 'Caledonite', 40: 'Fedgarnet', 41: 'Tanzanite', 47: 'Mithril',
  48: 'Unobtainium', 49: 'Adamantium', 50: 'Ice9', 51: 'Bomb1', 52: 'Bomb2', 53: 'Bomb3',
};
export function mineralName(v) {
  return NAMES[v] ?? '';
}

const PRICES = {
  1: 15, 2: 40, 3: 30, 4: 50, 5: 75, 6: 90, 7: 120, 8: 250, 9: 750, 10: 1000, 11: 1250,
  12: 1500, 13: 2500, 14: 3000, 15: 4000, 16: 5000, 17: 7500, 18: 12000, 19: 20000, 20: 25000,
  21: 30000, 22: 50000, 23: 100000, 24: 200000, 25: 300000, 26: 500000, 27: 1000000, 32: 75000,
  47: 5000, 48: 500000, 49: 50000,
};
/** Base price in dollars (before the difficulty's money factor). */
export function mineralPrice(v) {
  if (v > 32 && v < 42) return (v - 32) * 50000 + 50000;
  return PRICES[v] ?? 0;
}

/** Weight in pounds (Dark Matter in ounces, counted the same). 0 means not collectable. */
export function mineralWeight(v) {
  if (v === 0) return 0;
  if (v === 1 || v === 48 || v === 53) return 40;
  if (v === 2 || v === 49) return 50;
  if (v === 3) return 30;
  if (v === 4) return 25;
  if (v === 5) return 15;
  if (v === 6) return 80;
  if (v >= 7 && v <= 9) return 30;
  if (v === 10) return 25;
  if (v === 11 || v === 52) return 20;
  if (v === 12) return 35;
  if (v <= 19) return 5;
  if (v === 20) return 35;
  if (v === 21) return 30;
  if (v === 22) return 25;
  if (v >= 23 && v <= 27) return 1;
  if (v === 32 || v === 33) return 100;
  if (v === 34) return 130;
  if (v === 35) return 150;
  if (v === 36) return 200;
  if (v === 37) return 220;
  if (v === 38) return 250;
  if (v === 39) return 280;
  if (v === 40) return 300;
  if (v === 41) return 350;
  if (v === 47) return 10;
  if (v === 50 || v === 51) return 10;
  return 0;
}

const RX = { 6: 8, 8: 3, 9: 5, 10: 30, 11: 25, 12: 30, 20: 100, 21: 200, 22: 500, 23: 300,
  24: 1000, 25: 2000, 26: 5000, 27: 10000 };
/** Radiation added to the pod per piece collected. */
export function mineralRx(v) {
  return RX[v] ?? 0;
}

// ---- Upgrades (index = 7 * category + tier) -------------------------------------------------

export const UPGRADE_CATEGORIES = ['Engine', 'Fuel Tank', 'Cargo Bay', 'Radiator', 'Hull',
  'Bio-X Shielding', 'Drill', 'Battery'];
export const UPGRADE_UNITS = [' HP', ' L', ' lbs.', ' F', ' Hits', ' Rx', ' DL', ' MW'];

const UPGRADE_PRICES = [
  0, 300, 2000, 10000, 30000, 100000, 500000,
  0, 200, 1000, 3000, 10000, 50000, 200000,
  0, 1000, 3000, 10000, 40000, 200000, 1000000,
  0, 500, 2000, 10000, 50000, 300000, 2000000,
  0, 400, 2000, 7000, 15000, 50000, 200000,
  0, 1000, 5000, 20000, 100000, 500000, 3000000,
  0, 1500, 6000, 30000, 150000, 700000, 5000000,
  0, 400, 1000, 10000, 50000, 1000000, 10000000,
];
export function upgradePrice(i) {
  if (i % 7 === 0) return 0;
  return i >= 0 && i < UPGRADE_PRICES.length ? UPGRADE_PRICES[i] : 10000000;
}

const UPGRADE_NAMES = [
  'Stock ', 'Small', 'Medium', '4-cylinder', '6-cylinder', '12-cylinder', 'Turbo-X',
  'Stock ', 'Small', 'Medium', 'Large', 'Extra Large', 'Gigantic', 'Super',
  'Stock ', 'Small', 'Medium', '2-Chamber', '4-Chamber', 'Large', 'Gigantic',
  'Stock ', 'Small', '2-Turbine', '3-Turbine', 'Eon', 'Freon', 'Liquid Nitrogen',
  'Stock ', 'Bronze', 'Steel', 'Tungsten', 'Diamond-Coated', 'Kryptonite', 'Energy-Shielded',
  'Stock ', 'Iron-Coated', "1'' Lead", "3'' Lead", "5'' Lead", 'Energy Deflector', 'Super Shield',
  'Stock ', 'Steel', 'Carbide', 'Tungsten', 'Ruby', 'Diamond', 'NanoTube',
  'Stock ', 'Small', 'Lithium-1', 'Lithium-2', 'Cadmium', 'Hydrogen Cell', 'Kryptonite',
];
export function upgradeName(i) {
  if (i % 7 === 0) return 'Stock ';
  return UPGRADE_NAMES[i] ?? '';
}

const UPGRADE_AMOUNTS = [
  100, 250, 400, 600, 750, 1000, 1500,
  30, 50, 100, 200, 500, 1000, 2000,
  500, 1000, 2000, 3000, 4000, 5000, 6000,
  50, 100, 200, 300, 400, 500, 600,
  5, 10, 30, 50, 200, 600, 1000,
  10, 50, 200, 500, 2000, 10000, 60000,
  50, 100, 200, 1000, 2000, 5000, 10000,
  50, 100, 400, 1000, 2000, 6000,
];
/** The capacity an upgrade gives; index 55 and anything past the table is 10000. */
export function upgradeAmount(i) {
  return i >= 0 && i < UPGRADE_AMOUNTS.length ? UPGRADE_AMOUNTS[i] : 10000;
}

/** Radiator fuel cost per tick by radiator level 1..8. */
export const RADIATOR_COST = [0, 0.001, 0.002, 0.003, 0.006, 0.01, 0.02, 0.03, 0.06];

/** Score thresholds that pay a bonus, as multiples of the difficulty's score factor. */
export const BONUS_STEPS = [100, 500, 2000, 10000, 100000, 300000, 1000000, 2500000, 10000000,
  20000000, 100000000];

/** Difficulty levels: map density, money factor and score factor (tenths). */
export const LEVELS = {
  1: { density: 1500, money: 15, score: 5 },
  2: { density: 1550, money: 12, score: 7 },
  3: { density: 1600, money: 10, score: 10 },
};

// ---- Transmissions --------------------------------------------------------------------------

/** Depths (rows) at which transmissions appear, each followed by the next. */
export const TRANS_NEXT = {
  5: 12, 12: 70, 70: 100, 100: 110, 110: 150, 150: 390, 390: 590, 590: 790, 790: 996,
  996: 1190, 1190: 1300, 1300: 1500, 1500: 1700, 1700: 2000, 2000: 2400, 2400: 9900,
  10000: 19900,
};

// Each transmission: text x, first baseline, line step, lines, then pictures and captions.
// A picture is [image slot, x, y]; a numeric slot is a tile image, 'base' is the base building.
export const TRANSMISSIONS = {
  5: { x: 130, y: 130, step: 18, lines: [
    'Good! You know how to drill. Now get as many minerals as you can',
    'and fly or drive to the base. The base is on the surface at the far',
    "right. Watch your fuel gauge. Unless you buy more fuel at the base,",
    'you will probably run out of fuel before any other dangerous',
    "events occur. While you're inside the base, sell all minerals and",
    'try to upgrade your fuel tank. The first upgrade is only $200.',
    "Don't forget to fix your drill and refuel!",
    'Good luck!',
  ], pics: [['base', 320, 320]], captions: [['Base', 390, 380]] },
  12: { x: 130, y: 130, step: 18, lines: [
    'Some minerals glow. They are radioactive, so be careful',
    'while mining them. They are relatively valuable, but can',
    'quickly raise your radiation level. If the level rises too much,',
    "it's harmful to you. If you plan to mine many radioactive minerals,",
    'then you will need to upgrade your Bio-X.',
  ], pics: [[6, 340, 310]], captions: [['Lead', 365, 325]] },
  70: { x: 130, y: 130, step: 18, lines: [
    'The deeper you go, the more valuable minerals you find. Watch for',
    'silver and gold. They are 250$ and 750$ respectively',
  ], pics: [[8, 220, 280], [9, 470, 280]], captions: [['Silver', 250, 380], ['Gold', 500, 380]] },
  100: { x: 130, y: 130, step: 18, lines: [
    'The granite is harder than earth by about 100 times. It can really',
    'damage your drill if not carefull. A stick of dynamite can easily',
    'take care of it.',
  ], pics: [[29, 390, 310]], captions: [['Granite', 385, 380]] },
  110: { x: 130, y: 130, step: 18, lines: [
    "Getting hot, don't you think? You haven't been neglecting your",
    'radiator, have you? If you have, you need to upgrade it.',
    "Otherwise, you won't be able to go any deeper. If you already",
    'done so, too bad! It was using your fuel for no purpose.',
  ], pics: [], captions: [] },
  150: { x: 130, y: 130, step: 18, lines: [
    'You have probably noticed that the base has Coal Burner and',
    'Petroleum Refinery upgrades. Coal and Petroleum can be used to',
    'charge the battery when proper gadget is installed. When the',
    'battery is charged, the fuel is no longer used. This can be',
    'helpfull when you have a small fuel tank.',
  ], pics: [[1, 250, 310], [2, 500, 310]], captions: [['Coal', 255, 380], ['Petroleum', 480, 380]] },
  390: { x: 130, y: 130, step: 18, lines: [
    'There are a lot of gems further down. They are more valuable',
    'than precious metals, they weigh little, and they are not',
    'radioactive. You will also see marble rocks. Marble is much',
    'harder than granite. I would advise you not to drill through',
    'it unless you have a very powerful drill and a lot of drill',
    "fixes. Dynamite won't affect marble, but TNT explosives are",
    'effective.',
  ], pics: [[30, 390, 310]], captions: [['Marble', 385, 380]] },
  590: { x: 100, y: 130, step: 18, lines: [
    "There is a lot of lava below you, so be careful. You'll probably have",
    "to drill through it to get some precious minerals, so you'll need to",
    "upgrade your hull. Also, don't try to handle lava if you have a weak",
    'radiator. In addition, there are many gas pockets. They are hard to',
    'detect and can cause explosions. A Natural Gas Burner can be used to',
    'convert them to energy. The N. G. Burner sucks up the gas and',
    "prevents explosions. Furthermore, you'll find new, extremely",
    'radioactive minerals below 6000 ft. These valuable minerals are Thorium,',
    'Uranium, and Plutonium. They are powerful sources of alternative fuel',
    'that you can use if you install a nuclear reactor in your ship.',
  ], pics: [[31, 225, 310], [20, 300, 285], [21, 400, 285], [22, 500, 285]],
  captions: [['Lava', 230, 380], ['Thorium', 310, 380], ['Uranium', 410, 380], ['Plutonium', 510, 380]] },
  790: { x: 130, y: 130, step: 18, lines: [
    'Remains of an ancient Superboring Machine have been detected.',
    'All its blueprints have been lost, but its parts can be',
    'installed into your digger to make your vehicle more powerful.',
    'Can you locate all the parts?',
  ], pics: [], captions: [] },
  996: { x: 130, y: 130, step: 18, lines: [
    'Except for Diamond and Amazonite, most of the gems will not',
    'be found below this depth.',
  ], pics: [], captions: [] },
  1190: { x: 130, y: 130, step: 18, lines: [
    'At this high temerature, formation of large crystals occurs.',
    'You will need a large cargo bay, a powerful engine, and a lot',
    'of fuel to bring them back. Therefore, if you have not yet',
    'found all five parts of the Superboring Machine, you will need',
    "to do so. Otherwise, you won't be able to dig any further down.",
    'You will find many magma pockets. Be careful while using',
    'explosives or drilling near them. They will flow when exposed,',
    'and can flood all of your tunnels.',
  ], pics: [[MAGMA, 390, 310]], captions: [['Magma', 380, 380]] },
  1300: { x: 130, y: 130, step: 18, lines: [
    'Radioactive metals are no longer available because of the',
    'extremely high temperatures. You have only your fuel tank and',
    'gas pockets to rely on.',
  ], pics: [], captions: [] },
  1500: { x: 130, y: 130, step: 18, lines: [
    'We are as yet unable to determine the cause of the earthquakes',
    'and the teleportation problems which you have been experiencing',
    'Earthquakes are very rare on Mars and our teleporters are the',
    'most reliable in the solar system. Rest assured, our researchers',
    'are working hard to determine the causes of these unexpected',
    'problems.',
  ], pics: [], captions: [] },
  1700: { x: 130, y: 130, step: 18, lines: [
    'Our scientists have detemined that over-exploration of Mars',
    'caused its core to stop spinning. This is interfering with',
    'teleportation and causing earthquakes. The eventual outcome will',
    'will probably be destruction of all life on Mars. There is only',
    'one solution: we have to make it down to the core and somehow',
    'restart it.',
  ], pics: [], captions: [] },
  2000: { x: 130, y: 130, step: 18, lines: [
    'Our scientists and engineers have developed a plan to restart',
    'the Martian core. We must build a super-ship that can travel',
    'to the core and make a series of explosions that would, in',
    'theory, do the job. In addition, below this depth existance of',
    "a very rare mineral called 'Ice9' has been detected. It is a",
    'super-coolant 9000 times more effective than regular ice. A ship',
    'cooling itself with Ice9 can withstand virtually any temperatures.',
    'Also, watch out for Martian bombs and nukes.',
    "Don't blow one up!",
  ], pics: [[ICE9, 390, 310]], captions: [['Ice9', 400, 380]] },
  2400: { x: 130, y: 130, step: 18, lines: [
    'It turns out that many minerals found below 20000 ft. can be',
    'used in building the super-ship. We need 1500 lbs of mithril,',
    '4000 lbs of unobtainium, and 5000 lbs of adamantium. Plus,',
    'unobtainium can convert heat into energy that can power the ship',
    "Collect all these minerals and we'll build the ship in no time.",
  ], pics: [], captions: [] },
  10000: { x: 100, y: 120, step: 17, lines: [
    'Ok, this is important, so listen up. The super-ship has a few valuable',
    'gadgets. Number 1: The Unobtainium Heat Converter, which converts heat',
    'into energy at depths exceeding 12500 ft. Number 2: The Unobtainium',
    'Lava Converter, which extracts energy from lava. Number 3: A Nuclear',
    'Bomb Fuel Extractor, which extracts explosives from Martian bombs. Get',
    'enough Ice9 for the trip, and at least 45,000 MTons of explosives in',
    "order to restart Mars' core. Once you reach Mars' mantle (the liquid",
    "layer at 30,000 ft+), you'll need to set off 5 explosions (enter key).",
    'We made it easy for you; all you have to do is to set an explosion off',
    'when the red lamp on you panel lights up. Watch out for any potential',
    'hazards. Use arrow keys to steer the ship, and Z and X keys to slow',
    'down and speed up. You can use TNT (space bar) to blow up any obsticles',
    'This is probably the last transmission you will get from us since',
    'teleportations are becoming increasingly difficult. However, if you',
    "successfully restart the core, we'll be able to teleport you safely to",
    'the surface.                                              Good luck!',
  ], pics: [], captions: [] },
};

/** The victory reward: one of these cheat codes, picked at random, with its description. */
export const REWARDS = [
  ['filthyrich', 'for 1,000,000$'],
  ['enginefire', 'for a Turbo-X engine'],
  ['tankwars', 'for a Super Fuel Tank'],
  ['bayofpigs', 'for a Gigantic Cargo Bay'],
  ['coolbox', 'for a Liquid Nitrogen Radiator'],
  ['hullrat', 'for an Energy-Shielded Hull'],
  ['leadpoisoning', 'for a Super-Shield BioX'],
  ['toothache', 'for a Nano-Tube Drill'],
  ['batteryacid', 'for a Kryptonite Battery'],
  ['hollandtunnel', 'for a 12,000ft vertical tunnel'],
];

// ---- Cheat codes ----------------------------------------------------------------------------

/** Code typed on the start page, the number it selects, and the confirmation shown. */
export const CHEATS = [
  ['filthyrich', 1, '$1,000,000'],
  ['enginefire', 2, 'Turbo-X Engine'],
  ['tankwars', 3, 'Super Fuel Tank'],
  ['bayofpigs', 4, 'Gigantic Cargo Bay'],
  ['coolbox', 5, 'Liquid Nitrogen Radiator'],
  ['hullrat', 6, 'Energy-Shielded Hull'],
  ['leadpoisoning', 7, 'Super-Shield BioX'],
  ['toothache', 8, 'NanoTube Drill'],
  ['batteryacid', 9, 'Kryptonite Battery'],
  ['hollandtunnel', 10, '12,000ft. Vertical Tunnel'],
  ['snowglobe', 11, 'Christmas Special'],
];

// ---- Key codes (Java virtual key codes, which the browser layer translates to) --------------

export const K = {
  BACKSPACE: 8, ENTER: 10, SHIFT: 16, CTRL: 17, ESC: 27, SPACE: 32,
  LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, MINUS: 45, EQUALS: 61,
  D1: 49, D2: 50, A: 65, C: 67, M: 77, Q: 81, S: 83, W: 87, X: 88, Z: 90,
};

// ---- Fonts and colours ----------------------------------------------------------------------

// Java substituted its default sans-serif font (Arial on Windows) for any font that was not
// installed; the stacks do the same.
export const FONTS = {
  label: 'bold 11px Arial, sans-serif',
  d: 'bold 12px Arial, sans-serif',
  start: 'bold 13px Arial, sans-serif',
  bar: 'bold 16px Century, Arial, sans-serif',
  f20: 'bold 20px Arial, sans-serif',
  bardraw: 'bold 15px "Commerce SF", Arial, sans-serif',
  narrow: 'bold 17px "Niagara Solid", Arial, sans-serif',
};

// The texts of the page's Game menu (Help, Game Controls, Shop Controls), shown in message boxes;
// an array is shown as columns side by side.
export const MENU_TEXT = {
  help: 'Motherload Unlimited\nVersion 3.1, January 1, 2008 (a.k.a. Shaken Snowglobe Edition)\n'
    + 'by alexxz4, graphics by SethNess\n\n'
    + 'Drive a digging pod under the surface of Mars, collect minerals and sell them at the\n'
    + 'base for upgrades, repairs and fuel. Deep down, collect materials for a super-ship,\n'
    + 'dive into the liquid mantle and set off five detonations to restart the planet\'s core.',
  game: ['Game Controls:\n'
    + 'Left, Right:  Drive\n'
    + 'Up:  Fly\n'
    + 'Down:  Drill down\n'
    + 'Space:  Drill sideways\n'
    + 'Ctrl + Arrow:  Tractor beam\n'
    + 'Shift:  Jet booster on/off\n'
    + 'Z:  Dynamite\n'
    + 'X:  TNT\n'
    + '1:  Sonic bomb\n'
    + '2:  Ice bomb\n'
    + 'A:  Hull repair\n'
    + 'S:  Drill repair\n'
    + 'Q:  Teleporter 1\n'
    + 'W:  Teleporter 2\n'
    + 'C:  Mineral processor on/off\n'
    + 'M:  Inventory\n'
    + 'Enter:  Close a transmission or pop-up',
  'In the mantle:\n'
    + 'Arrows:  Move\n'
    + 'X (held):  Dive faster\n'
    + 'Z (held):  Dive slower\n'
    + 'Space:  TNT\n'
    + 'Enter:  Detonation'],
  shops: 'Shop Controls:\n'
    + 'Arrow keys:  Choose an item\n'
    + 'Space:  Buy / fix / refill\n'
    + 'Enter:  Next shop\n'
    + 'Esc:  Leave the base',
};

/**
 * The touch controls' keys (touch.js), besides the arrows on the pad at the bottom right:
 * Esc at the top left; the item keys above the row of Ctrl, Shift and Enter, at the bottom
 * left; Space, a wide bar at the bottom centre. Each has the key it sends, the key's name and
 * what it does in play. "latch" keys stay down until tapped again; "repeat" keys send key
 * repeats while held, as a held keyboard key does.
 */
export const TOUCH_KEYS = {
  top: [
    { code: K.ESC, key: 'Esc', does: 'Leave' },
  ],
  items: [
    { code: K.Z, key: 'Z', does: 'Dynamite' },
    { code: K.X, key: 'X', does: 'TNT' },
    { code: K.D1, key: '1', does: 'Sonic' },
    { code: K.D2, key: '2', does: 'Ice' },
    { code: K.M, key: 'M', does: 'Inventory' },
    { code: K.A, key: 'A', does: 'Hull' },
    { code: K.S, key: 'S', does: 'Drill' },
    { code: K.Q, key: 'Q', does: 'Tele 1' },
    { code: K.W, key: 'W', does: 'Tele 2' },
    { code: K.C, key: 'C', does: 'Process' },
  ],
  row: [
    { code: K.CTRL, key: 'Ctrl', does: 'Beam', latch: true },
    { code: K.SHIFT, key: 'Shift', does: 'Jet' },
    { code: K.ENTER, key: 'Enter', does: 'OK' },
  ],
  space: { code: K.SPACE, key: 'Space', does: 'Drill', repeat: true },
};
