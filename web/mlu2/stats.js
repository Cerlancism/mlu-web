// stats: The fixed tables of minerals and upgrades, looked up by id: a mineral's name, price,
// weight and radiation, and each upgrade tier's name, weight, amounts and price.
// Specification: docs/mlu2/specifications.md, Economy (9).
//
// Mineral ids are tile ids (1 to 41 minerals and rocks, 47 to 53 items). Upgrade ids are
// 7 * column + tier: engine, fuel tank, cargo bay, radiator, hull, bio shield, drill, battery.
// Every lookup gives the original's answer for any id, including its fallback for ids outside
// the table.

// Index = mineral id; '' where the original has no name.
const NAMES = [
  '', 'Coal', 'Petroleum', 'Iron', 'Copper', 'Quartz', 'Lead', 'Bronze', 'Silver', 'Gold',
  'Palladium', 'Cesium', 'Platinum', 'Opal', 'Topaz', 'Emerald', 'Saphire', 'Ruby', 'Diamond',
  'Amazonite', 'Thorium', 'Uranium', 'Plutonium', 'Moonstone', 'Starstone', 'Sunstone',
  'Kryptonite', 'Dark Matter', 'Granite', 'Marble', 'Lava', 'Gas', 'Adamite', 'Selenite',
  'Alexxzandrite', 'Froyite', 'Aquamarine', 'Mimetite', 'Orpiment', 'Caledonite', 'Fedgarnet',
  'Tanzanite', '', '', '', '', '', 'Mithril', 'Unobtainium', 'Adamantium', 'Ice9', 'Bomb1',
  'Bomb2', 'Bomb3',
];

// Index = mineral id 0 to 27; the few priced ids above that are in PRICE_HIGH.
const PRICES = [
  0, 15, 40, 30, 50, 75, 90, 120, 250, 750, 1000, 1250, 1500, 2500, 3000, 4000, 5000, 7500,
  12000, 20000, 25000, 30000, 50000, 100000, 200000, 300000, 500000, 1000000,
];
const PRICE_HIGH = { 32: 75000, 34: 4000000, 47: 5000, 48: 500000, 49: 50000 };

// Index = mineral id 0 to 53.
const WEIGHTS = [
  0, 40, 50, 30, 25, 15, 80, 30, 30, 30, 25, 20, 35, 5, 5, 5, 5, 5, 5, 5, 35, 30, 25, 1, 1, 1,
  1, 1, 0, 0, 0, 0, 100, 100, 4, 150, 200, 220, 250, 280, 300, 350, 0, 0, 0, 0, 0, 10, 40, 50,
  10, 10, 20, 60,
];

// Radiation per mineral id; every other id gives 0.
const RX = {
  6: 8, 8: 3, 9: 5, 10: 30, 11: 25, 12: 30, 20: 100, 21: 200, 22: 500, 23: 300, 24: 1000,
  25: 2000, 26: 5000, 27: 10000,
};

// Upgrade tables, one row per column, tiers 0 to 6 (tier 0 is the stock part).
const UPGRADE_NAMES = [
  ['', 'Small', 'Medium', '4-cylinder', '6-cylinder', '12-cylinder', 'Turbo-X'],
  ['', 'Small', 'Medium', 'Large', 'Extra Large', 'Gigantic', 'Super'],
  ['', 'Small', 'Medium', '2-Chamber', '4-Chamber', 'Large', 'Gigantic'],
  ['', 'Small', '2-Turbine', '3-Turbine', 'Eon', 'Freon', 'Liquid Nitrogen'],
  ['', 'Bronze', 'Steel', 'Tungsten', 'Diamond-Coated', 'Kryptonite', 'Energy-Shielded'],
  ['', 'Iron-Coated', "1'' Lead", "3'' Lead", "5'' Lead", 'Energy Deflector', 'Super Shield'],
  ['', 'Steel', 'Carbide', 'Tungsten', 'Ruby', 'Diamond', 'NanoTube'],
  ['', 'Small', 'Lithium-1', 'Lithium-2', 'Cadmium', 'Hydrogen Cell', 'Kryptonite'],
].flat();

const UPGRADE_WEIGHTS = [
  75, 100, 150, 200, 250, 350, 500,
  10, 15, 20, 30, 50, 75, 100,
  100, 150, 250, 350, 500, 600, 700,
  20, 30, 50, 70, 100, 110, 120,
  120, 150, 170, 200, 220, 300, 500,
  15, 20, 30, 70, 120, 150, 250,
  30, 50, 80, 100, 110, 120, 150,
  25, 30, 50, 75, 100, 100, 120,
];

const UPGRADE_AMOUNTS2 = [
  150, 250, 400, 600, 750, 1000, 1500,
  50, 100, 200, 500, 1000, 2000, 3000,
  500, 1000, 2000, 3000, 4000, 5000, 6000,
  100, 200, 300, 400, 500, 600, 800,
  5, 10, 30, 100, 250, 600, 1200,
  20, 50, 200, 500, 2000, 10000, 60000,
  100, 200, 500, 1000, 2000, 5000, 10000,
  50, 100, 400, 1000, 2000, 6000, 10000,
];

const UPGRADE_PRICES = [
  0, 500, 2000, 10000, 30000, 200000, 1500000,
  0, 300, 1000, 4000, 60000, 500000, 3000000,
  0, 1000, 3000, 10000, 40000, 200000, 1000000,
  0, 2000, 6000, 30000, 80000, 500000, 4000000,
  0, 400, 2000, 7000, 15000, 50000, 200000,
  0, 1000, 5000, 20000, 100000, 500000, 3000000,
  0, 2000, 8000, 50000, 250000, 1000000, 7500000,
  0, 400, 1000, 10000, 50000, 1000000, 10000000,
];

const UPGRADE_AMOUNTS = [
  100, 250, 400, 600, 750, 1000, 1500,
  30, 50, 100, 200, 500, 1000, 2000,
  500, 1000, 2000, 3000, 4000, 5000, 6000,
  50, 100, 200, 300, 450, 600, 800,
  5, 10, 30, 50, 200, 600, 1000,
  10, 50, 200, 500, 2000, 10000, 60000,
  50, 100, 200, 1000, 2000, 5000, 10000,
  50, 100, 400, 1000, 2000, 6000, 10000,
];

const inTable = (table, id) => Number.isInteger(id) && id >= 0 && id < table.length;

/** A mineral's name, or '' for ids without one. */
export function getName(id) {
  return inTable(NAMES, id) ? NAMES[id] : '';
}

/** What one unit of a mineral sells for, before the difficulty's money factor. */
export function getPrice(id) {
  if (inTable(PRICES, id)) return PRICES[id];
  return PRICE_HIGH[id] ?? 0;
}

/** A mineral's weight in pounds. */
export function getWeight(id) {
  if (inTable(WEIGHTS, id)) return WEIGHTS[id];
  // Quirk: the original's "id <= 19" step gives 5 for any negative id.
  return id < 0 ? 5 : 0;
}

/** A mineral's radiation. */
export function getRx(id) {
  return RX[id] ?? 0;
}

/** An upgrade tier's name; every stock part is 'Stock ' (with its trailing space). */
export function getUpgradeName(id) {
  if (id % 7 === 0) return 'Stock ';
  return inTable(UPGRADE_NAMES, id) ? UPGRADE_NAMES[id] : '';
}

/** An upgrade tier's weight; ids past the table weigh 120. */
export function getUpgradeWeight(id) {
  return inTable(UPGRADE_WEIGHTS, id) ? UPGRADE_WEIGHTS[id] : 120;
}

/** The amount an upgrade gives as shown and bought in the base (HP, L, lbs., F, Hits, Rx, DL, MW). */
export function getUpgradeAmount2(id) {
  return inTable(UPGRADE_AMOUNTS2, id) ? UPGRADE_AMOUNTS2[id] : 0;
}

/** An upgrade tier's price; stock parts are free and ids past the table cost $10,000,000. */
export function getUpgradePrice(id) {
  if (id % 7 === 0) return 0;
  return inTable(UPGRADE_PRICES, id) ? UPGRADE_PRICES[id] : 10000000;
}

/** The original's other upgrade-amount table (the game itself uses getUpgradeAmount2). */
export function getUpgradeAmount(id) {
  return inTable(UPGRADE_AMOUNTS, id) ? UPGRADE_AMOUNTS[id] : 0;
}
