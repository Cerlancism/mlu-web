# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This repository is a port of MLU (Motherload Unlimited), a community remake of the Flash game Motherload, from Java to the web browser. It covers two games, and both ports are complete:

- MLU 1, "Version 3.1 January 1, 2008 (a.k.a. Shaken Snowglobe Edition)", by alexxz4, with graphics by SethNess;
- MLU 2, "MLU2: Crematoria", by the same author.

Each port is written in plain HTML, CSS and JavaScript ES modules, with no build step and no runtime dependencies. The site is published with GitHub Pages at <https://cerlancism.github.io/mlu-web/web/>, from the repository <https://github.com/Cerlancism/mlu-web>. Pages deploys the whole repository from its root, so the site sits under `web/`, and `https://cerlancism.github.io/mlu-web/` shows the README, rendered by Pages' Jekyll. Do not add `.nojekyll`, which would turn that page into a 404.

[README.md](README.md) is the public landing page. Keep it minimal, and put technical detail here.

Before working on a port, read its specification: [docs/mlu1/specifications.md](docs/mlu1/specifications.md) or [docs/mlu2/specifications.md](docs/mlu2/specifications.md).

## Layout

| Path | Contents |
|---|---|
| `web/` | The site, published by GitHub Pages at `/mlu-web/web/`. `index.html` is the landing page: it links to both games and has its own stylesheet, icons and Install button. `site.webmanifest` is the one web app manifest every page links to, so the site installs as one app. `sw.js` is the service worker that keeps every page opened once working offline. |
| `web/mlu1/` | The web port of MLU 1, self-contained. `index.html` is the launcher (Play, saved games, snapshots, options), with `launcher.css` and `launcher.js`. `play.html` is the game, with `play.css` and `play.js`, and with `touch.css` and `touch.js` for its touch controls. `snapshots.js` takes, stores and restores snapshots. The game modules sit in the same folder, with the favicon and touch icon. `images/` holds the original game's images and sounds, byte for byte, under the `images/...` paths the game asks for. `commands.jpg` is the controls card from the release. |
| `web/mlu2/` | The web port of MLU 2, laid out the same way. |
| `docs/README.md` | The landing page for the documentation. The README and the footers of the site's pages link to it. |
| `docs/mlu1/specifications.md` | The specification of the MLU 1 web port: how the game behaves and how the port is built. It is kept in step with `web/mlu1/`. |
| `docs/mlu1/fixes.md` | The bugs in the original that the web port fixes, each with what the original did and what the port does instead. |
| `docs/mlu1/guide.md` | How to play MLU 1 well, stage by stage. The MLU 1 autopilot (`web/mlu1/autopilot.js`) follows it, so change both together. |
| `docs/mlu2/specifications.md`, `docs/mlu2/fixes.md` | The same for MLU 2, kept in step with `web/mlu2/`. |
| `tools/` | `serve.py`, the local web server; `make_icons.py`, which makes the site icons from the games' sprites; `make_og_images.py`, which makes the link-preview images (both need Pillow); and `autopilot_sim.mjs`, which tests the MLU 1 autopilot without a browser. |
| `LICENSE` | GPL-2.0, the license the Motherload Unlimited project declares on SourceForge (<https://sourceforge.net/projects/motherloadunlim>). |

## Commands

Run everything from the repository root. Python is MSYS2's and is not on Git Bash's `PATH`, so call it as `/d/dev/msys64/clangarm64/bin/python3 -I`.

- **Serve the web port:** `python3 -I tools/serve.py [port]` (port 8000 by default). Then open:
  - `http://localhost:8000/mlu-web/web/`, the landing page;
  - `http://localhost:8000/mlu-web/web/mlu1/`, the MLU 1 launcher;
  - `http://localhost:8000/mlu-web/web/mlu1/play.html`, the MLU 1 game;
  - the same under `mlu2/` for MLU 2.
- **Remake the site icons:** `python3 -I tools/make_icons.py` builds them from the games' sprites.
  - It writes `favicon.ico` and `apple-touch-icon.png` in `web/`, `web/mlu1/` and `web/mlu2/`.
  - It writes the app icons `icon-192.png`, `icon-512.png`, `icon-maskable-192.png` and `icon-maskable-512.png` in `web/`.
- **Remake the link-preview images:** `python3 -I tools/make_og_images.py` writes `og-image.jpg` (1200×630) in `web/`, `web/mlu1/` and `web/mlu2/`. They are made from the start pages, title bands and sprites. The pages' `og:image` and `og:url` tags give the published site's full addresses, because link previews need absolute URLs.
- **Test the MLU 1 autopilot:** `node tools/autopilot_sim.mjs --seed 1 --games 3 --ticks 5000000` plays whole games with the autopilot in Node, without a browser.
  - The random numbers are seeded, so a game can be replayed.
  - It prints progress, then how each game ended, with its time, deepest row, money and score.
  - It runs the game modules themselves, through `web/mlu1/game.js`, so keep those free of page code.
  - Node is at `/c/Program Files/nodejs/node`.
- **Build, lint and tests:** there is no build step, linter or test suite. See "Testing in a browser" below.

## Running the web port

- **HTTP only:** ES modules do not load from `file://`, so the page must be served over HTTP.
- **Self-contained ports:** `web/mlu1/` and `web/mlu2/` each hold everything their pages load, so either can be served from any static web server, at any path.
  - Every URL a port uses is relative to its own folder. Never use root-relative URLs (`/...`).
  - The exceptions are the launcher's "All games" link, the web app manifest and the service worker, which are the site's, one folder up. Without them a port still runs, but it cannot be installed or work offline.
- **serve.py:**
  - It serves `web/` under `/mlu-web/web/`, the path GitHub Pages gives it, so the ports run at the same paths locally as when published. It does not serve the rest of the repository.
  - It listens on localhost only, sets the right MIME types for modules and media, and turns off caching, so a reload picks up edited files.
  - It matches file names case-sensitively, as GitHub Pages does although Windows does not.
  - It redirects `/` and `/mlu-web/` to `/mlu-web/web/` and prints every request it answers with 404.
- **Scaling:** the game fills the window. The launcher's scaling option, or `?scale=integer` on the launcher's or the game's URL, gives whole-number scaling instead. The game menu's Exit returns to the launcher.
- **Storage:**
  - Saved games are kept in the browser: MLU 1's in local storage, and MLU 2's, with its high-score list, in IndexedDB.
  - Snapshots are kept in IndexedDB, in a database of their own per game (`mlu1-snapshots`, `mlu2-snapshots`).
  - Browser storage belongs to the site (scheme, host and port), not the path. Saves made on localhost do not appear on the published site, and a GitHub Pages site shares its storage with the account's other project sites.
  - The ports' storage keys start with `mlu1` and `mlu2`.
- **imagelist.js:** each port's `imagelist.js` lists every image in its `images/` folder for preloading. Regenerate it if images are added or renamed.
- **The service worker:** `web/sw.js` stays registered in the browser.
  - It goes to the network first, so edits show on reload, but with the server stopped the pages still open from its cache.
  - To clear it, use DevTools > Application > Storage > Clear site data, or unregister it under Service workers.
  - Bump its cache version (`mlu-web-v1`) only if the caching itself changes.

## Working rules

- **Behaviour:** the specifications define how the games behave, and the ports reproduce the original games: the same constants, timing, rules and draw order.
  - Where the original does something odd but harmless, keep it and record it in the specification's quirks section.
  - Where it is a real bug, fix it with a "Fix:" comment and describe it in the port's `fixes.md`. "Core fixes" covers how the game itself runs; other fixes go in the section for their topic.
  - Never change behaviour silently.
- **Specifications:** each port's specification stands on its own.
  - It describes behaviour and design in prose and tables, with no code samples and no references to source files or line numbers. A reader should be able to rebuild the game from it.
  - Update the specification and `fixes.md` in the same change as the port. `fixes.md` follows the same rules as the specification.
  - The specification describes the web version's behaviour as it is. It does not say where that differs from the original, and it does not mention `fixes.md`.
- **Updated stamp:** each launcher's footer shows when its port last changed, as `Updated YYYY-MM-DD-HHMM` (UTC+8), with an ISO `datetime` on its `<time>` element. When a change to a port (`web/mlu1/` or `web/mlu2/`) is committed, set that port's stamp to the commit's time, in the same commit.
- **README:** `README.md` stays a minimal public landing page: what the project is, the play link, links to the docs, credits and the license.
- **Assets:** asset file names are case-sensitive in URLs, so URLs must match them exactly.
  - Several MLU 1 names end in `.PNG`, and one contains a space (`dark matter.png`).
  - Several MLU 2 names end in `.JPG`.
  - `.gitattributes` keeps the images, the controls card and the icons `-text`, so that the global `core.autocrlf=true` cannot alter their bytes. Keep it.

## Testing in a browser

- **Setup:** start `serve.py`, then drive the page with `playwright-cli`, attached to the operator's Edge as described in the workspace `CLAUDE.md` (`/d/dev/CLAUDE.md`).
- **window.mlu:** the game page exposes `window.mlu` for tests.
  - `mlu.state` is the game state.
  - `mlu.clock` is the clock.
  - `mlu.step(n)` runs n ticks and draws a frame.
- **Hidden windows:** browsers stop the animation loop while the window is hidden or fully covered. Use `mlu.step` to advance the game then; screenshots still work.
