// Launcher page for the MLU 2 web port: the Play button, the saved games kept in this browser
// (export to and import from the game's own .ml2 save files, delete), the snapshots (resume,
// rename, export, import, delete) and the options the game reads at start-up (scaling, touch
// controls, music, sound). See "Launcher" in docs/mlu2/specifications.md.

import { createStore } from './storage.js';
import { loadSettings, saveSettings } from './settings.js';
import { createSnapshotStore, parseSnapshot, snapshotText } from './snapshots.js';
import { FINISHED } from './savefile.js';

const GAME = {
  id: 'mlu2',
  ext: '.ml2',
  /** A save that the victory erased and that can no longer be loaded. */
  finished: (text) => text === FINISHED,
};

const NAME_RULE = /^[a-z0-9]{3,13}$/; // as typed on the start page
const SCALES = ['crisp', 'integer'];
const MAX_FILE = 8 * 1024 * 1024; // a save is about 513 KB

const el = (id) => document.getElementById(id);
const rows = el('save-rows');
const empty = el('saves-empty');
const message = el('saves-msg');

let lastError = '';
const store = createStore((why) => { lastError = why; });

function say(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

/** Save text to file bytes and back, one byte per character, so files stay byte-exact. */
function toBytes(text) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

function fromBytes(buffer) {
  const bytes = new Uint8Array(buffer);
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return text;
}

function sizeText(chars) {
  if (chars < 1024) return `${chars} B`;
  if (chars < 1024 * 1024) return `${Math.round(chars / 1024)} KB`;
  return `${(chars / (1024 * 1024)).toFixed(1)} MB`;
}

function button(label, onClick, className = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  if (className) b.className = className;
  b.addEventListener('click', onClick);
  return b;
}

// ---- Saved games ------------------------------------------------------------------------------

async function refreshSaves() {
  const saves = await store.list();
  rows.replaceChildren();
  if (saves === null) {
    empty.hidden = false;
    empty.textContent = 'Saved games cannot be read: this browser blocks storage for this site.';
    return;
  }
  empty.hidden = saves.length > 0;
  empty.textContent = 'No saved games yet. Save at the base during a game, or import a save file.';
  for (const { name, size } of saves) {
    const tr = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.className = 'save-name';
    nameCell.textContent = name;
    const info = document.createElement('td');
    info.className = 'save-info';
    info.textContent = sizeText(size);
    if (size < 200 && GAME.finished(await store.read(name))) {
      info.textContent = 'Finished: cannot be loaded';
      info.classList.add('finished');
    }
    const actions = document.createElement('td');
    actions.className = 'save-actions';
    actions.append(
      button('Rename', () => renameSave(name)),
      button('Export', () => exportSave(name)),
      button('Delete', () => deleteSave(name), 'danger'),
    );
    tr.append(nameCell, info, actions);
    rows.append(tr);
  }
}

async function exportSave(name) {
  const text = await store.read(name);
  if (text == null) {
    say(`"${name}" could not be read.`, true);
    return;
  }
  const url = URL.createObjectURL(new Blob([toBytes(text)], { type: 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name + GAME.ext;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  say(`Exported "${name}" as ${name}${GAME.ext}.`);
}

/** Moves a save to a new valid game name, the name the start page loads it by. */
async function renameSave(name) {
  let suggestion = name;
  let next;
  for (;;) {
    const answer = prompt(`New name for the saved game "${name}": 3 to 13 lower-case letters and`
      + ' digits, as typed on the start page.', suggestion);
    if (answer === null) return;
    next = answer.trim().toLowerCase();
    if (next === name) return;
    if (NAME_RULE.test(next)) break;
    suggestion = next.replace(/[^a-z0-9]/g, '').slice(0, 13);
  }
  const existing = new Set(((await store.list()) ?? []).map((s) => s.name));
  if (existing.has(next)
    && !confirm(`A saved game named "${next}" already exists. Replace it with "${name}"?`)) {
    return;
  }
  const text = await store.read(name);
  if (text == null) {
    say(`"${name}" could not be read.`, true);
    return;
  }
  lastError = '';
  if (!(await store.write(next, text))) {
    say(lastError || `"${name}" could not be renamed.`, true);
  } else if ((await store.remove(name)) === false) {
    say(lastError || `"${name}" was copied to "${next}" but could not be removed.`, true);
  } else {
    say(`Renamed "${name}" to "${next}".`);
  }
  await refreshSaves();
}

async function deleteSave(name) {
  if (!confirm(`Delete the saved game "${name}"? This cannot be undone.`)) return;
  lastError = '';
  if ((await store.remove(name)) === false) say(lastError || `"${name}" could not be deleted.`, true);
  else say(`Deleted "${name}".`);
  await refreshSaves();
}

/** The game name for an imported file: its file name if that is a valid name, else asked for. */
function nameFor(fileName) {
  const base = fileName.replace(/\.[^.]*$/, '').toLowerCase();
  if (NAME_RULE.test(base)) return base;
  let suggestion = base.replace(/[^a-z0-9]/g, '').slice(0, 13);
  for (;;) {
    const answer = prompt(
      `"${fileName}" needs a game name: 3 to 13 lower-case letters and digits, as typed on the`
      + ' start page. Name it:', suggestion);
    if (answer === null) return null;
    const name = answer.trim().toLowerCase();
    if (NAME_RULE.test(name)) return name;
    suggestion = name.replace(/[^a-z0-9]/g, '').slice(0, 13);
  }
}

async function importFiles(files) {
  const existing = new Set(((await store.list()) ?? []).map((s) => s.name));
  const done = [];
  const problems = [];
  for (const file of files) {
    if (file.size === 0 || file.size > MAX_FILE) {
      problems.push(`${file.name} is not a save file`);
      continue;
    }
    const name = nameFor(file.name);
    if (name === null) continue;
    if (existing.has(name)
      && !confirm(`A saved game named "${name}" already exists. Replace it with ${file.name}?`)) {
      continue;
    }
    const text = fromBytes(await file.arrayBuffer());
    if (text.includes('\0')) {
      problems.push(`${file.name} is not a save file`);
      continue;
    }
    lastError = '';
    if (await store.write(name, text)) {
      existing.add(name);
      done.push(name);
    } else {
      problems.push(lastError || `${file.name} could not be stored`);
    }
  }
  const parts = [];
  if (done.length) parts.push(`Imported ${done.map((n) => `"${n}"`).join(', ')}.`);
  if (problems.length) parts.push(`${problems.join('; ')}.`);
  if (parts.length) say(parts.join(' '), problems.length > 0);
  await refreshSaves();
}

// ---- Snapshots --------------------------------------------------------------------------------

const snapRows = el('snap-rows');
const snapsEmpty = el('snaps-empty');
const snapsMessage = el('snaps-msg');
const snapshots = createSnapshotStore();
const MAX_SNAPSHOT_FILE = 32 * 1024 * 1024;

function saySnaps(text, isError = false) {
  snapsMessage.textContent = text;
  snapsMessage.classList.toggle('error', isError);
}

/** When, where and how far: "26 Nov 2026, 14:05:09 · in a base · $1,200 · score 3,400". */
function snapshotInfo(meta) {
  const parts = [];
  const when = new Date(meta.created);
  if (!Number.isNaN(when.getTime())) {
    parts.push(when.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' }));
  }
  parts.push(meta.where === 'base' ? 'in a base' : 'paused');
  const sum = meta.summary ?? {};
  if (Number.isFinite(sum.days)) parts.push(`day ${sum.days}`);
  if (Number.isFinite(sum.money)) parts.push(`$${sum.money.toLocaleString()}`);
  if (Number.isFinite(sum.score)) parts.push(`score ${sum.score.toLocaleString()}`);
  if (Number.isFinite(meta.size)) parts.push(sizeText(meta.size));
  return parts.join(' \u00b7 ');
}

async function refreshSnapshots() {
  let list;
  try {
    list = await snapshots.list();
  } catch (err) {
    snapRows.replaceChildren();
    snapsEmpty.hidden = false;
    snapsEmpty.textContent = `Snapshots cannot be read: ${err.message}.`;
    return;
  }
  snapRows.replaceChildren();
  snapsEmpty.hidden = list.length > 0;
  snapsEmpty.textContent = 'No snapshots yet.';
  for (const meta of list) {
    const tr = document.createElement('tr');
    // The name with the details below it, so a long name and the details share one column.
    const main = document.createElement('td');
    main.className = 'snap-main';
    const nameLine = document.createElement('span');
    nameLine.className = 'save-name';
    nameLine.textContent = meta.name;
    const info = document.createElement('span');
    info.className = 'save-info';
    info.textContent = snapshotInfo(meta);
    main.append(nameLine, info);
    const actions = document.createElement('td');
    actions.className = 'save-actions';
    actions.append(
      button('Resume', () => resumeSnapshot(meta.id)),
      button('Rename', () => renameSnapshot(meta)),
      button('Export', () => exportSnapshot(meta)),
      button('Delete', () => deleteSnapshot(meta), 'danger'),
    );
    tr.append(main, actions);
    snapRows.append(tr);
  }
}

/** Opens the game on the snapshot, with the options the Play button has. */
function resumeSnapshot(id) {
  const url = new URL(document.querySelector('.play').href);
  url.searchParams.set('snapshot', id);
  location.assign(url);
}

async function renameSnapshot(meta) {
  const answer = prompt('New name for this snapshot:', meta.name);
  if (answer === null) return;
  const name = answer.trim().slice(0, 100);
  if (!name || name === meta.name) return;
  try {
    await snapshots.rename(meta.id, name);
    saySnaps(`Renamed to "${name}".`);
  } catch (err) {
    saySnaps(`Could not rename "${meta.name}": ${err.message}.`, true);
  }
  await refreshSnapshots();
}

/** A file name from the snapshot's name, without the characters file systems refuse. */
function snapshotFileName(name) {
  const safe = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/^[\s.]+|[\s.]+$/g, '');
  return `${safe || 'snapshot'}.${GAME.id}-snapshot.json`;
}

async function exportSnapshot(meta) {
  let record;
  try {
    record = await snapshots.get(meta.id);
  } catch (err) {
    saySnaps(`"${meta.name}" could not be read: ${err.message}.`, true);
    return;
  }
  if (!record) {
    saySnaps(`"${meta.name}" is no longer kept in this browser.`, true);
    await refreshSnapshots();
    return;
  }
  const file = snapshotFileName(meta.name);
  const url = URL.createObjectURL(new Blob([snapshotText(record)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  saySnaps(`Exported "${meta.name}" as ${file}.`);
}

async function deleteSnapshot(meta) {
  if (!confirm(`Delete the snapshot "${meta.name}"? This cannot be undone.`)) return;
  try {
    await snapshots.remove(meta.id);
    saySnaps(`Deleted "${meta.name}".`);
  } catch (err) {
    saySnaps(`Could not delete "${meta.name}": ${err.message}.`, true);
  }
  await refreshSnapshots();
}

async function importSnapshots(files) {
  const done = [];
  const problems = [];
  for (const file of files) {
    if (file.size === 0 || file.size > MAX_SNAPSHOT_FILE) {
      problems.push(`${file.name} is not a snapshot file`);
      continue;
    }
    try {
      const record = parseSnapshot(await file.text());
      await snapshots.add(record);
      done.push(record.name);
    } catch (err) {
      problems.push(`${file.name}: ${err.message}`);
    }
  }
  const parts = [];
  if (done.length) parts.push(`Imported ${done.map((n) => `"${n}"`).join(', ')}.`);
  if (problems.length) parts.push(`${problems.join('; ')}.`);
  if (parts.length) saySnaps(parts.join(' '), problems.length > 0);
  await refreshSnapshots();
}

// ---- Options ----------------------------------------------------------------------------------

/**
 * Shows the scaling in use and puts it in the Play link's query string, so the game page's URL
 * names it. A ?scale= on this page's URL wins over the stored setting, as it does in the game.
 */
function showScale(scale) {
  for (const radio of document.querySelectorAll('input[name="scale"]')) {
    radio.checked = radio.value === scale;
  }
  const params = new URLSearchParams(location.search);
  params.delete('snapshot'); // a snapshot is resumed from its own row only
  params.set('scale', scale);
  document.querySelector('.play').href = `play.html?${params}`;
}

function showOptions() {
  const settings = loadSettings();
  const fromUrl = new URLSearchParams(location.search).get('scale');
  showScale(SCALES.includes(fromUrl) ? fromUrl : settings.scale);
  for (const radio of document.querySelectorAll('input[name="touch"]')) {
    radio.checked = radio.value === settings.touch;
  }
  el('music').checked = settings.music;
  el('sounds').checked = settings.sounds;
}

function installOptions() {
  const stored = (ok) => {
    el('options-msg').textContent = ok ? '' : 'This browser blocks storage: the options are not kept.';
  };
  for (const radio of document.querySelectorAll('input[name="scale"]')) {
    radio.addEventListener('change', () => {
      stored(saveSettings({ scale: radio.value }));
      // The choice replaces any ?scale= on this page's URL too.
      const params = new URLSearchParams(location.search);
      if (params.has('scale')) {
        params.set('scale', radio.value);
        history.replaceState(null, '', `?${params}`);
      }
      showScale(radio.value);
    });
  }
  for (const radio of document.querySelectorAll('input[name="touch"]')) {
    radio.addEventListener('change', () => stored(saveSettings({ touch: radio.value })));
  }
  for (const id of ['music', 'sounds']) {
    el(id).addEventListener('change', () => stored(saveSettings({ [id]: el(id).checked })));
  }
}

// ---- Start-up ---------------------------------------------------------------------------------

el('import').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  if (files.length) await importFiles(files);
});
el('import-snaps').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  if (files.length) await importSnapshots(files);
});
// The site's service worker, one folder up, keeps the pages working offline (see sw.js). A port
// served on its own has none, which is fine.
navigator.serviceWorker?.register('../sw.js').catch(() => {});

installOptions();
showOptions();
refreshSaves();
refreshSnapshots();
// Coming back with the browser's Back button can show this page from its cache.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    showOptions();
    refreshSaves();
    refreshSnapshots();
  }
});
