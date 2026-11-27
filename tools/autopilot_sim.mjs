// Plays MLU 1 with the autopilot, headless and much faster than real time, to test the autopilot.
//
// Usage: node tools/autopilot_sim.mjs [--seed n] [--games n] [--level 1|2|3] [--ticks n] [--log n]
//
// Each game starts a new map, switches the autopilot on and runs until the game is won or lost,
// the autopilot stalls waiting in the base, or for at most --ticks ticks (default 6,000,000,
// about 28 hours of game time). The random numbers are seeded, so a game can be replayed. It
// prints progress every --log ticks (default 200,000) and a line per game: how it ended, the
// time, the deepest row, the money, the score.

import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).reduce((out, a, i, all) => {
  if (a.startsWith('--')) out.push([a.slice(2), all[i + 1]]);
  return out;
}, []));
const seed0 = Number(args.seed ?? 1);
const games = Number(args.games ?? 1);
const level = Number(args.level ?? 1);
const maxTicks = Number(args.ticks ?? 6e6);
const logEvery = Number(args.log ?? 2e5);

// A seeded replacement for Math.random (mulberry32), so every game can be replayed.
let rngState = 0;
Math.random = () => {
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const here = dirname(fileURLToPath(import.meta.url));
const mod = (name) => import(pathToFileURL(resolve(here, '../web/mlu1', name)).href);
const { createState } = await mod('state.js');
const { keyDown } = await mod('controls.js');
const { step } = await mod('game.js');
const { createAutopilot } = await mod('autopilot.js');
const { K } = await mod('data.js');

const ft = (row) => `${((row - 4) * 10).toLocaleString('en')} ft`;
const usd = (n) => `$${Math.round(n).toLocaleString('en')}`;
const tiers = (s) => ['engine', 'fueltank', 'cargobay', 'radiator', 'hullx', 'biox', 'drillx', 'batx']
  .map((k) => s[k]).join('');

function play(seed) {
  rngState = seed;
  const saves = new Map();
  const s = createState(undefined, { music: false, sounds: false });
  s.store = { read: (n) => saves.get(n) ?? null, write: (n, t) => { saves.set(n, t); return true; },
    remove: (n) => saves.delete(n) };
  s.level = level;
  for (const c of 'autopilot') keyDown(s, c.toUpperCase().charCodeAt(0));
  keyDown(s, K.ENTER);
  const ap = createAutopilot();
  ap.setOn(s, true);
  const started = performance.now();
  let deepest = 0;
  let end = 'time limit';
  let ticks = 0;
  let waited = 0;
  const events = [];
  const seen = new Set();
  const note = (key, text) => {
    if (seen.has(key)) return;
    seen.add(key);
    events.push(`${(s.time / 216000).toFixed(2)}h ${text}`);
  };
  for (; ticks < maxTicks; ticks++) {
    const wasMsg = s.msg;
    step(s, ap);
    if (!s.menu && s.iposy < 3000) deepest = Math.max(deepest, s.iposy);
    if (s.msg && !wasMsg) {
      end = `lost: ${s.msgstr} at ${ft(s.iposy)} (${ap.status})`;
      break;
    }
    if (s.trans && s.transy === 20000) { end = 'won'; break; }
    if (s.startpage) { end = 'back on the start page'; break; }
    waited = ap.status.startsWith('Waiting in the base') ? waited + 1 : 0;
    if (waited > 20000) { end = `stalled in the base at ${usd(s.money)}`; break; }
    for (const [k, t] of [['engine', 'engine'], ['radiator', 'radiator'], ['cargobay', 'cargo'],
      ['hullx', 'hull'], ['drillx', 'drill']]) {
      note(`${k}${s[k]}`, `${t} tier ${s[k]}`);
    }
    note(`bat${s.batx}`, `battery tier ${s.batx}`);
    for (const g of ['coalb', 'petrolr', 'gasb', 'nuc', 'tractor', 'jet', 'tel1', 'tel2', 'iceb']) {
      if (s[g] > 0) note(g, `first ${g}`);
    }
    for (const m of [1e5, 1e6, 1e7, 1e8]) if (s.money >= m) note(`m${m}`, `${usd(m)}`);
    if (s.explorer) note('explorer', 'super-ship');
    if (s.iposy >= 3000 && !s.menu) note('mantle', `mantle, nux ${s.nux}, ice9 ${s.ice9.toFixed(0)}`);
    if (ticks % logEvery === 0 && ticks > 0) {
      const rate = Math.round(ticks / ((performance.now() - started) / 1000));
      console.log(`  t=${(s.time / 216000).toFixed(2)}h (${rate}/s) row ${s.iposy} deepest ${ft(deepest)} `
        + `${usd(s.money)} tiers ${tiers(s)} fuel ${s.fuel.toFixed(0)}/${s.fuelmax} `
        + `cargo ${s.cargo}/${s.cargomax} mats ${s.mith}/${s.unob}/${s.adam} nux ${s.nux} | ${ap.status}`);
    }
  }
  return { seed, end, ticks, time: s.time, deepest, money: s.money, score: s.score,
    tiers: tiers(s), events };
}

for (let g = 0; g < games; g++) {
  const r = play(seed0 + g);
  console.log(`seed ${r.seed}: ${r.end}; ${(r.time / 216000).toFixed(2)} h game time, `
    + `deepest ${ft(r.deepest)}, ${usd(r.money)}, score ${r.score.toLocaleString('en')}, `
    + `tiers ${r.tiers}`);
  if (games === 1) for (const e of r.events) console.log(`    ${e}`);
}
