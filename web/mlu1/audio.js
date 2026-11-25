// Sound effects and music. See "Sound" in docs/mlu1/specifications.md.
//
// Each effect is one clip that behaves like the original's sound clips: play() starts it from the
// beginning (cutting off the same clip if it is already playing), loop() repeats it until
// stopped, stop() silences it. Music is one MIDI song at a time, always looping.

import { parseMidi, MidiPlayer } from './midi.js';

const CLIPS = {
  prop: 'prop_w.wav', shipexpl: 'shipexpl_w.wav', drill: 'drill_w.wav', clank: 'clank_w.wav',
  beep: 'beep_w.wav', earthquake: 'earthquake_w.wav', tnt: 'tnt_w.wav',
  dynamite: 'dynamite_w.wav', teleport: 'teleport_w.wav', jet: 'jet_w.wav', lava: 'lava_w.wav',
};
const SONGS = ['descent1.mid', 'shops_theme.mid', 'duke_nukem2.mid'];
const BASE = new URL('./images/Sounds/', import.meta.url);

/** Loads every sound. Resolves to the sfx interface the game state uses. */
export async function createAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = Ctx ? new Ctx() : null;
  const buffers = new Map();
  const songs = new Map();
  const playing = new Map();
  let music = null;
  let wanted = null; // the song that should be playing, kept while the context is suspended
  let unlocked = false; // the player has pressed a key or clicked, so sound may run

  if (ctx) {
    const master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    music = new MidiPlayer(ctx, ctx.destination);
    await Promise.all([
      ...Object.entries(CLIPS).map(async ([key, file]) => {
        try {
          const res = await fetch(new URL(file, BASE));
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
    ctx.master = master;
    // The game pauses while the page is hidden; so does all sound, which also keeps the music
    // scheduler from bunching notes when the browser slows its timers.
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
    src.connect(ctx.master);
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

  return {
    play: (key) => start(key, false),
    loop: (key) => start(key, true),
    stop,
    musicLoop(file) {
      wanted = file;
      if (!music || ctx.state !== 'running') return;
      const song = songs.get(file);
      if (song) music.play(song);
      else music.stop();
    },
    musicStop() {
      wanted = null;
      music?.stop();
    },
    /** Browsers start audio suspended until the player presses a key or clicks. */
    unlock() {
      unlocked = true;
      if (!ctx || ctx.state === 'running' || document.hidden) return;
      ctx.resume().then(() => {
        if (wanted) this.musicLoop(wanted);
      });
    },
  };
}
