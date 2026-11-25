// audio: Sound effects and music. See "Sound" in docs/mlu2/specifications.md.
//
// Each effect is one clip that behaves like the original's sound clips: play() starts it from the
// beginning (cutting off the same clip if it is already playing), loop() repeats it until
// stopped, stop() silences it; a clip with no sound file (the shield) does nothing. Music is one
// MIDI song at a time, always looping, as the original's single sequencer.

import { parseMidi, MidiPlayer } from './midi.js';

const CLIPS = [
  'shipexpl', 'clank', 'earthquake', 'dynamite', 'tnt', 'beep', 'jet', 'prop', 'rain', 'thunder',
  'drill', 'lava', 'wind', 'boom', 'teleport', 'sonicbomb', 'icebomb',
];
/** stopAll() stops these, in the original's order; 'shield' and 'gate' have no sound file. */
const ALL = [
  'shipexpl', 'clank', 'earthquake', 'dynamite', 'tnt', 'beep', 'jet', 'prop', 'rain', 'thunder',
  'drill', 'lava', 'shield', 'wind', 'boom', 'teleport', 'sonicbomb', 'icebomb',
];
const SONGS = ['start_theme.mid', 'shops_theme.mid', 'game_theme.mid'];
const BASE = new URL('./images/Sounds/', import.meta.url);

/** Loads every sound. Resolves to the sfx interface the game state uses. */
export async function createAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = Ctx ? new Ctx() : null;
  const buffers = new Map();
  const songs = new Map();
  const playing = new Map();
  let music = null;
  let master = null;
  let song = null; // the sequencer's current song (the original's loadMidi)
  let running = false; // the sequencer is playing
  let unlocked = false; // the player has pressed a key or clicked, so sound may run

  if (ctx) {
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    music = new MidiPlayer(ctx, ctx.destination);
    await Promise.all([
      ...CLIPS.map(async (key) => {
        try {
          const res = await fetch(new URL(`${key}.wav`, BASE));
          buffers.set(key, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {
          // a sound that fails to load stays silent
        }
      }),
      ...SONGS.map(async (file) => {
        try {
          const res = await fetch(new URL(file, BASE));
          songs.set(file, parseMidi(await res.arrayBuffer()));
        } catch {
          // a song that fails to load stays silent
        }
      }),
    ]);
    // The game pauses while the page is hidden; so does all sound.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (ctx.state === 'running') ctx.suspend();
      } else if (unlocked && ctx.state !== 'running') {
        ctx.resume();
      }
    });
  }

  function start(key, loop) {
    if (!ctx) return;
    stop(key);
    const buf = buffers.get(key);
    if (!buf || ctx.state !== 'running') return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    src.connect(master);
    src.onended = () => { if (playing.get(key) === src) playing.delete(key); };
    src.start();
    playing.set(key, src);
  }

  function stop(key) {
    const src = playing.get(key);
    if (src) {
      playing.delete(key);
      try { src.stop(); } catch { /* already ended */ }
    }
  }

  function startSong() {
    if (!music || !running || ctx.state !== 'running') return;
    const parsed = songs.get(song);
    if (parsed) music.play(parsed);
    else music.stop();
  }

  return {
    play: (key) => start(key, false),
    loop: (key) => start(key, true),
    stop,
    stopAll() {
      for (const key of ALL) stop(key);
    },
    /** Sets the song without starting it; a playing sequencer carries on with the new song. */
    musicLoad(file) {
      song = file;
      if (running) startSong();
    },
    /** Plays the song from the start, looping; without a name, the song last set. */
    musicLoop(file) {
      if (file !== undefined) song = file;
      running = true;
      startSong();
    },
    musicStop() {
      running = false;
      music?.stop();
    },
    /** Browsers start audio suspended until the player presses a key or clicks. */
    unlock() {
      unlocked = true;
      if (!ctx || ctx.state === 'running' || document.hidden) return;
      ctx.resume().then(startSong);
    },
  };
}
