// data: Fixed game data: map size and tile ids, sizes of the effect arrays, the four bases, gadget
// names and prices, the columns that trigger transmissions, the cheat codes, fonts and colours.
// The mineral and upgrade tables are in stats.js.
// Specification: docs/mlu2/specifications.md, World (6), Economy (9), Graphics (11), Cheat codes (14).

/** Map size: 5000 columns, 100 rows of ground plus two rows of bedrock. */
export const MAP_W = 5000;
export const MAP_H = 102;

/** Tile ids with a special meaning. */
export const MAGMA = 79;
export const SPACE = 80;
export const HILLX = 20;
export const VOLCX = 21;

/** The game screen. */
export const RW = 800;
export const RH = 600;

/** Sizes of the effect arrays: particles, rocks, volcanoes, clouds, wind streaks, bases. */
export const SHM = 30;
export const RCK = 15;
export const VOLC = 20;
export const CLOUD = 30;
export const WIND = 30;
export const BASE = 4;

/** The column of each base. */
export const BASEX = [0, 2603, 4000, 4990];

export const GADGETSTR = [
  'Teleporter 1', 'Teleporter 2', 'Dynamite', 'TNT', 'Shield', 'Hull Repair', 'Drill Repair',
  'Sonic Bomb', 'Ice Bomb', 'Radiation Bomb', 'Coal Burner', 'Petroleum Refinery',
  'Natural Gas Burner', 'Nuclear Reactor', 'Nuclear Reactor X', 'Jet Glider', 'Tractor Beam',
  'Heating Unit', 'Matter Transmitter', 'Lightning Charger',
];

/** The gadgets on the in-game gadget panel. */
export const GPANELSTR = [
  'Teleporter 1', 'Teleporter 2', 'Dynamite', 'TNT', 'Shield', 'Hull Repair', 'Drill Repair',
  'Sonic Bomb', 'Ice Bomb', 'Radiation Bomb', 'Matter Transmitter',
];

export const GADGETPRICE = [
  20000, 100000, 2000, 10000, 10000, 20000, 100000, 30000, 50000, 75000, 1000, 5000, 50000,
  200000, 1000000, 5000, 150000, 50000, 10000, 60000,
];

/** The columns at which the transmissions arrive, in order. */
export const TRANSARR = [
  0, 20, 40, 70, 120, 150, 300, 500, 1580, 2000, 2300, 2800, 3005, 3050, 3610, 3990, 4980, 5002,
];

/** The cheat codes. The original stores each with every character shifted down by 50. */
export const CHEATS = [
  '2=</:2B@C;>', ':=1=;=B7D3', 'B/<96C<B3@', '27/;=<20=F', '75:==', ';3B/:>:/B3', '5@33<23/B6',
  '23E/:B', '3<3@57H3@', ':7438/193B',
].map((code) => Array.from(code, (c) => String.fromCharCode(c.charCodeAt(0) + 50)).join(''));

// Font stacks: the original font, then the closest Windows or Office font, then macOS and Linux
// near matches, then a generic family (see "Fonts" in the specification).
const ARIAL = 'Arial, "Liberation Sans", Helvetica, sans-serif';
const CENTURY = 'Century, "Century Schoolbook", "Century Schoolbook L", C059, "TeX Gyre Schola", Georgia, serif';
const COMMERCE = '"Commerce SF", Rockwell, "Rockwell Nova", "American Typewriter", serif';
const NIAGARA = '"Niagara Solid", "Agency FB", "Arial Narrow", "Liberation Sans Narrow", "Avenir Next Condensed", sans-serif';
const ULTRA = '"Ultra Serif SF", "Cooper Black", "Bookman Old Style", "URW Bookman", Bookman, serif';
const IMPACT = 'Impact, Haettenschweiler, "Arial Narrow", sans-serif';

/** The game's fonts as canvas font strings, by the original's names. */
export const FONTS = {
  labelfont: `bold 11px ${ARIAL}`,
  dfont: `bold 14px ${ARIAL}`,
  barfont: `bold 16px ${CENTURY}`,
  font20: `bold 20px ${ARIAL}`,
  bardraw: `bold 15px ${COMMERCE}`,
  narrowfont: `bold 17px ${NIAGARA}`,
  ultra24: `bold 24px ${ULTRA}`,
  arial13: `bold 13px ${ARIAL}`,
  impact14: `14px ${IMPACT}`,
  arial36: `bold 36px ${ARIAL}`,
};

/** Every font the page uses, for preloading before the first frame. */
export const FONT_LIST = Object.values(FONTS);

/** The original's named colours. */
export const COLORS = {
  c_red: 'rgb(255,0,0)',
  c_bar: 'rgb(44,16,6)',
  c_black: 'rgb(0,0,0)',
  c_green: 'rgb(0,200,0)',
  c_blue: 'rgb(0,0,255)',
  c_grey: 'rgb(200,200,200)',
  c_grey2: 'rgb(80,80,80)',
  c_white: 'rgb(255,255,255)',
  c_brown: 'rgb(194,121,22)',
  c_rain: 'rgb(128,168,152)',
  c_laser1: 'rgb(66,255,235)',
  c_laser2: 'rgb(138,255,243)',
};

/** Message box texts from the original's Game menu. */
export const MENU_TEXT = {
  help: 'Motherload Unlimited 2 (MLU2). c. 2008\nMLU is a game that takes you underground in search of valuable Crematorian minerals.\nYou are in control of a state-of-the-art mining pod, and it is your job to upgrade\nand equip it with all kinds of gadgets and items. Make it all the way to the\nend, complete dangerous missions and you will be rewarded with a\nMOTHERLOAD of riches.',
  shops: '    Shop Controls:\nSpace Bar:       Buy item/Fix ship/Refill\nEnter Key:         Switch Shops\nEsc:                    Exit\nArrow Keys:     Scroll through items\n',
  game: '    Game Controls:\nArrow Keys:                        Move\nSpace Bar:                          Dig horizontal\nDown Key:                           Dig down\nShift:                                     Jet Booster On/Off\nV:                                           Shield\nC:                                           Mineral Converter On/Off\n1:                                           Sonic Bomb\n2:                                           Ice Bomb\n3:                                           Radiation Bomb\nQ:                                          Teleport 1\nW:                                         Teleport 2\nA:                                           Hull Repair\nS:                                           Drill Repair\nZ:                                           Dynamite\nX:                                          TNT Explosives\nM:                    \t                      Pause/Inventory/Datalog\nT:                                           Matter Transmitter\nCtrl + Arrow Keys             Tractor Beam\n',
};

/**
 * The touch controls' keys (touch.js), besides the arrows on the pad at the bottom right, as
 * Java key codes:
 * Esc at the top left; the item keys above the row of Ctrl, Shift and Enter, at the bottom
 * left; Space, a wide bar at the bottom centre. Each has the key it sends, the key's name and
 * what it does in play. "latch" keys stay down until tapped again; "repeat" keys send key
 * repeats while held, as a held keyboard key does.
 */
export const TOUCH_KEYS = {
  top: [
    { code: 27, key: 'Esc', does: 'Close' },
  ],
  items: [
    { code: 90, key: 'Z', does: 'Dynamite' },
    { code: 88, key: 'X', does: 'TNT' },
    { code: 49, key: '1', does: 'Sonic' },
    { code: 50, key: '2', does: 'Ice' },
    { code: 51, key: '3', does: 'Radiation' },
    { code: 65, key: 'A', does: 'Hull' },
    { code: 83, key: 'S', does: 'Drill' },
    { code: 81, key: 'Q', does: 'Tele 1' },
    { code: 87, key: 'W', does: 'Tele 2' },
    { code: 84, key: 'T', does: 'Transmit' },
    { code: 86, key: 'V', does: 'Shield' },
    { code: 67, key: 'C', does: 'Convert' },
    { code: 68, key: 'D', does: 'Cannon' },
    { code: 77, key: 'M', does: 'Inventory', keep: true }, // the pause: at the top right
  ],
  row: [
    { code: 17, key: 'Ctrl', does: 'Beam', latch: true },
    { code: 16, key: 'Shift', does: 'Jet' },
    { code: 10, key: 'Enter', does: 'OK' },
  ],
  space: { code: 32, key: 'Space', does: 'Dig', repeat: true },
};
