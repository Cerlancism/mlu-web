# MLU 1 web port: specification

This document specifies the web version of Motherload Unlimited 1, "Version 3.1 January 1, 2008 (a.k.a. Shaken Snowglobe Edition)". It covers how the game behaves and how the web version is built, and it is complete without the original program. It describes the web version's behaviour, bug fixes included.

## 1. Scope

- **The game:** Motherload Unlimited is a mining game. The player drives a digging pod under the surface of Mars, collects minerals, and sells them at a base on the surface for upgrades, repairs and fuel. Deep down, the player collects materials for a super-ship, dives into the liquid mantle and sets off five detonations to restart the planet's core, which wins the game.
- **Fidelity:** the web version plays the same as the original applet, with the same rules, numbers, screens, images and sounds. Where the original behaves oddly but harmlessly, the web version keeps that behaviour, and section 13 records it. Where the original had a bug, the web version fixes it.
- **Platform:**
  - The game runs in a browser page, with a menu bar above the controls card and the game screen, and has a launcher page for its saved games and options (section 2).
  - There is no network access of any kind.
  - The game runs at a fixed 60 ticks a second, paced by the display refresh, with no speed setting (section 3).
  - Saved games are kept in the browser's local storage, and snapshots of games in progress in its IndexedDB (section 11).
  - Music and sound effects start on the first time, and after that as the player last left them (section 11).
  - Music is played by a small built-in synthesiser, because browsers cannot play MIDI files (section 10).

## 2. Page and shell

- **Pages:** the game has two pages in one folder. The launcher (the folder's index page) starts the game and manages its saved games and options; the game page holds the game itself and can also be opened directly. The site's landing page, one folder up, links to the launchers of both games, and its footer has the same links as the launcher's.
- **Launcher:** in the game's colours: the start page, blurred and darkened, behind orange panels with a 3-pixel #AA1111 border, and a red Play button. It has, from top to bottom:
  - a link back to the landing page;
  - the title band of the game's start page;
  - **Play**, which opens the game page with the scaling in use named in its URL (`scale=crisp` or `scale=integer`);
  - **Saved games:** every save in this browser's local storage, by name, with its size, or "Finished: cannot be loaded" for a save the victory erased. Export downloads a save as the game's own save file, `<name>.ml`, byte for byte, so it can be kept, moved to another browser or used by the original game. Delete removes a save after a confirmation. Rename moves a save to a new name, which must be a valid game name too, the name the start page loads it by; the launcher asks again while the name is not valid, and asks before replacing a save of that name. Import save files reads one or more `.ml` files, from this launcher or from the original game, byte for byte, and stores each under its file name, which must be a valid game name (3 to 13 lower-case letters and digits; upper case is lowered); otherwise the launcher asks for a name. Replacing an existing save asks first. Empty files, files over 4 MB and files with zero bytes in them are refused. The list is read again when the page is shown from the browser's back-forward cache;
  - **Snapshots:** every snapshot kept in this browser (section 11, "Snapshots"), newest first: its name, and below it when it was taken, whether in a base or paused, the money and score, and its size. Resume opens the game page on the snapshot, with the scaling in use. Rename gives it any name of up to 100 characters. Export downloads it as `<name>.mlu1-snapshot.json`, with the characters file names cannot hold replaced by hyphens. Delete removes it after a confirmation. Import snapshots reads one or more such files and adds each as a new snapshot under the name it holds. Files of the other game, of another snapshot format or that are not snapshots, and files over 32 MB, are refused, each with the reason. On narrow screens each row shows the name, the details and the buttons one below the other, with the buttons in one row of equal widths (two rows of two below 360 pixels).
  - **Options**, stored as soon as they change (section 11, "Settings"): scaling, "Fill the window" (crisp) or "Whole-number pixels (Integer Scaling)"; touch controls (below), "Automatic" (the default), "Always" or "Never"; and the Music and Sound effects switches the game starts with. When the launcher's own URL has `scale=`, the scaling option shows that value and Play passes it on; choosing an option replaces it;
  - a footer with the game's name, release and credits, and links to the project's source code on GitHub and to its documentation, each opening in a new tab. Below them, "Updated" and the date and time of the port's latest change, as YYYY-MM-DD-HHMM in UTC+8.
- **Layout of the game page:** a menu bar above two panels that follow the original applet page: the controls card (189×600 pixels) on the left and the game screen on the right, in panels coloured #CC6600 with a 3-pixel #AA1111 border. The menu bar spans both panels, and the whole is centred on a black page.
- **Fit to window (game page):** the card and the game screen are scaled together, with the same height, and each keeps its own aspect ratio: 189:600 for the card and 4:3 for the game. The menu bar keeps a fixed height of 20 pixels, and the panels fit in the height that remains. The page never scrolls. Resizing the window, zooming, or moving to a screen with a different pixel density rescales the game at once.
- **Scaling modes:** the URL parameter `scale` (`crisp` or `integer`) picks one of two modes; without it, or with any other value, the launcher's scaling option does (crisp unless changed).
  - **Crisp** (the default): the largest size at which both panels fit in the window.
  - **Integer**: the largest whole-number multiple of the original size that fits, counted in physical screen pixels, so every original pixel becomes the same square block. It never goes below the original size, even if the window is smaller.
  - Both modes draw hard-edged pixels with no smoothing. In crisp mode, at sizes between whole-number multiples, neighbouring pixels can differ in width by one screen pixel.
- **Menu bar:** a 20-pixel strip with one menu, "Game", which opens on a click. Opening it does not pause the game, and closing it gives keyboard focus back to the game screen. While it is open, Up and Down move through the items, Enter or Space picks one, and Esc or a click elsewhere closes it. Its items, in order:

  | Item | Action |
  |---|---|
  | Restart | Asks "Are you sure you want to quit this game?" with Yes, No and Cancel. Yes ends the game as a game over does (section 3) and shows the start page; saves are kept. The other two do nothing. |
  | Take Snapshot | Keeps the whole game as it is now as a snapshot (section 11, "Snapshots"), named after the game's name and the local date and time to the second, such as "rover 2026-11-26 14:05:09", and says so in a message box titled "Snapshot". It works only in a base or on the pause screen; anywhere else, on the start page, once the game is over or while a save is being written, the box says why instead. |
  | Game Controls | A message box titled "Controls" listing the play keys and the mantle keys (section 5). |
  | Shop Controls | A message box titled "Controls" listing the base keys: arrows to choose, Space to buy, fix or refill, Enter for the next shop, Esc to leave. |
  | Music | A check box showing the game's music switch, the one on the start page and in the inventory. Ticking it turns the switch on and plays the tune of the current screen (title tune on the start page, shop tune in the base, in-game tune in play and the mantle); clearing it turns the switch off and stops the music. |
  | Sounds | A check box showing the game's sound switch, which it sets as the inventory's sound switch does, the lava sound included (section 5, "Mouse"). |
  | Autopilot | A check box that switches the autopilot on and off, at any time (below, "Autopilot"). |
  | Help | A message box titled "About" with the game's name, version and credits and a short description of the game. |
  | Exit | Returns to the launcher, keeping the game page's URL parameters. During a game it first asks "Are you sure you want to quit this game?" with Yes, No and Cancel, and leaves only on Yes; on the start page it leaves at once. |

  - Message boxes and the question appear over the game screen. The game keeps running behind them, but keys go to the box until it is closed. Enter, Space or Esc closes a message box; Esc answers the question as Cancel.
  - Keys held down when the menu or a box opens are treated as released.
- **Autopilot:** a virtual player that plays the game through to the victory. It follows the strategy of the guide to playing well ([guide.md](guide.md)).
  - **Keys only:** before each tick it presses and releases the same keys a player would, so the game's rules are unchanged. It can see the whole game state, the map included, and it keeps its plans apart from the game, so snapshots and saves never hold them.
  - **The player's keys:** while it is on, the player's keys, touches and clicks do not reach the game, except on the start page, where they still type a name and start or load a game. Keys held when it is switched on or off are released.
  - **Indicator:** while it is on, the right of the menu bar shows "Autopilot:" and what it is doing, such as "Digging for minerals at 2,150 ft".
  - **Where it waits:** on the start page it waits for a game to be started or loaded. After a game over it waits there too. It stops at the victory transmission and leaves it for the player to close, because closing it ends the game.
  - **Transmissions:** it closes each other transmission two seconds after it appears.
  - **Choosing what to dig:** it plans routes over the map, by flying, falling, driving and digging. It counts each in ticks, money and energy, and goes for the tile worth most per tick. Each tile bears its share of the climb home: the part of the cargo bay's free room its weight takes up. Of the best five tiles, it takes the one that, with the best tile to dig after it, makes the best pair. It digs only where it is safe: within the engine's power and the radiator's limit, the hull's and the shielding's limits, and only with the fuel for the way there and back. It digs a tile beside magma, or through magma, only with an ice bomb, which it sets off just before, counting the bomb's price in the tile's cost.
  - **Energy, drill and hull deep down:** below row 1,100, a route's energy also counts as 20,000 ticks per tankful (the fuel tank's and battery's capacities together), the drill wear of its digs as 20,000 ticks per whole drill, and their damage as 20,000 ticks per whole hull. So it keeps to open tunnels and goes round rock and lava. Below row 1,000 it keeps 254 damage in hand, and uses a hull repair kit once the damage passes half the hull.
  - **Never into magma:** in the air above a drop that ends in magma, it holds Up and plans again rather than fall.
  - **The tractor beam:** once it works below row 1,000 with $2,000,000, it buys the beam. Standing below row 1,000, it pulls in a neighbouring tile worth taking (anything with weight but the Mega parts) instead of digging it. It also plans routes to a tile it can stand in beside such a tile.
  - **Heat:** in the magma rows it works no deeper than 200 rows above the radiator's limit, a margin for magma's 100 degrees, unless it has more than 30 Ice9. With the Mega cooling system it may work the whole map. Below the cooling system's limit, it plans a downward dig or a fall only with Ice9 for that move and 2,000 ticks more, and checks again just before each one. Below the cooling system's limit it values Ice9 at $500,000 a tile until it holds 150. In the 150 rows above that limit it leaves Ice9 alone, as keys for the way down, until its own Ice9 is down to 6: then it values a key at $200,000, or $500,000 once within those rows. Higher up it leaves Ice9 alone.
  - **The main shaft:** digging down in the column two tiles left of the base's door counts half, so trips share one shaft and branch out sideways from it, going round rock and back into it. With TNT, a rock in the shaft counts 120 ticks and is blasted away, if no Martian bomb, Ice9 or mineral worth over $2,000 lies in the blast's 5 by 5 tiles and no magma within a tile of them.
  - **Energy:** once it has the coal burner, the refinery or a reactor, it keeps the processor on. It then counts coal and petroleum as the charge they give, if the battery has room, taking no cargo. Without the burners, it counts them at under a third of their price.
  - **Moving:** it presses Up during long falls, so every landing is safe. In the air it holds its height by pressing Up in short bursts. It uses the jet booster for long climbs, and turns it off near rock.
  - **Going home:** it heads home when the cargo bay is full, the fuel is down to the climb home, the drill or hull is worn, or nothing worth digging is in reach. Below the depth its fuel tank can fly home from, and below 10,000 ft, it goes home by teleporter. Above that it flies, unless the cargo is worth five times the teleporter's price or the fuel cannot cover the climb.
  - **Teleporter 2 hops:** below row 1,100 it carries the Teleporter 2s the way home is likely to take, as the landing rule in section 6 gives, plus one. It works no deeper than they allow, and heads home when the count in hand falls below what its row needs. The shop keeps that many in stock for the deepest rows the rest of the pod allows.
  - **Magma:** caught in magma, it teleports home at once, or sets off an ice bomb, or else flies up.
  - **No way home:** if no route home is left, it plans again without the tiles it set aside after getting stuck.
  - **In the base:** it sells the cargo and buys, one key at a time:
    - the upgrade that lets it work deepest per dollar, or one that stops trips ending early;
    - the coal burner after the first engine upgrade, and the refinery after the second;
    - a bigger battery once the burners have filled it;
    - teleporters, when the climb home limits the depth, once its drill reaches 1,000, and only when no upgrade goes deeper or what is left to mine can no longer pay for one;
    - later, repair kits (more of them once it has $20,000,000), TNT once it has $5,000,000, ice bombs once it works below row 1,190, and other gadgets;
    - then it refuels, repairs, saves the game under its name and leaves.

    It always keeps money for two refills. If its last trip found nothing to dig and there is nothing to buy, it lets the climb home take 45 % of a tank of 200 or more instead of a third, and goes out again. If that finds nothing either, it stays in the base.
  - **The super-ship and the mantle:** once it has $100,000,000, it keeps that sum back for the super-ship, and buys the super-ship once the materials are in too. Then it collects Martian bombs, lava for the battery and Ice9 until it has what the dive needs: 45,600 tons of explosives, 9,500 fuel and battery charge together, and 570 Ice9, of which the way down drains about 100. Once on its way down it keeps going while it has 410 Ice9 or more. It digs down below the cooling's limit only with Ice9 for the dig. There it dodges the rocks and sets off each detonation within 150 ft of its target depth.
- **Game screen:** one canvas whose drawing surface is always 800×600. The game draws in those coordinates whatever size the canvas is shown at, and mouse positions are converted from screen size back to 800×600 before the game sees them. The canvas takes keyboard focus when the page loads and when it is clicked.
- **Touch controls:** a translucent overlay over the game page, for phones and tablets. It is shown on screens whose main pointer is touch, and on any screen from its first touch; the launcher's touch option can instead show it always or never. Its keys send the same keys the keyboard does, so the game cannot tell them apart:
  - **Pad**, at the bottom right: a round eight-way pad for the arrow keys. A touch picks one of eight directions by its angle from the centre, so a diagonal holds two arrows; a touch near the centre holds none. Sliding the finger to another direction releases only the arrow it no longer holds, so Up stays held from up-left to up-right.
  - **Keys**, at the bottom left: Z, X, 1, 2, M, A, S, Q, W and C, above Ctrl ("Beam"), Shift ("Jet") and Enter ("OK"). Each shows its key and what it does in play. Ctrl stays held from one tap to the next, so the pad can steer the tractor beam with one thumb.
  - **Space** ("Drill"), a wide bar at the bottom centre, and **Esc** ("Leave") at the top left, below the menu bar.
  - A held pad direction or Space repeats, after 0.4 seconds and then 25 times a second, as a held keyboard key does, so holding them keeps drilling; the other keys press once and release when let go.
  - **Keyboard**, at the top right, opens the device's own keyboard, for typing a game name (and the other names the game asks for), and closes it on the next tap. Each letter, digit or space typed reaches the game as that key, and each character deleted as Backspace; Enter is Enter. A word the keyboard corrects arrives as the deletions and retyping that turn the old word into the new one. Touching the game screen also closes the keyboard. While the keyboard is open the page shrinks to the space above it, where the browser allows.
  - **Full screen**, at the top right, where the browser allows it: shows the whole page full screen and, on phones, turns it to landscape; tapped again, it leaves full screen.
  - While a message box or the menu is open, the overlay's game keys are dimmed and do nothing. Keys the overlay holds are released whenever held keys are (losing focus, being hidden). The page does not scroll, zoom on a double tap or reload on a downward swipe.
- **Status line:** a strip along the bottom of the game screen shows loading progress and errors, such as a save that could not be stored, and the Ctrl+W warning (section 5). It is hidden when it has nothing to show.
- **Files:** the game page, its stylesheet, its entry module, the launcher page with its stylesheet and module, the game modules and the icons sit in one folder. The web app manifest, its icons and the service worker are the site's, one folder up. The images and sounds are beside them, in an `images` folder that keeps the original paths and file names exactly, including upper-case `.PNG` and `.JPG` extensions and a space in "dark matter.png". A generated list of every image file sits beside the modules so that all images can be loaded at start-up.
- **Page metadata:** each page has a title, a description for search engines and link previews, a theme colour, a favicon and an icon for phone home screens: the game's own sprites scaled up, MLU 1's mining pod, standing on the ground with its starting drill and hull, for MLU 1 and the landing page, MLU 2's alexxzandrite crystal for MLU 2. The landing page and the launchers also have a link-preview image of 1200×630 pixels, given with the published site's full address. A launcher's image shows its game's title band, the digging pod and five minerals on the blurred start page, with "Play in your browser" and the game's edition. The landing page's image shows both title bands, each on its own start page. The game page asks search engines not to index it, so that searches lead to the launcher.
- **Installing:** every page links to the site's one web app manifest, so the whole site (the landing page and both games) installs as a single app, which opens on the landing page. Where the browser offers to install it (Chromium-based browsers), the landing page shows an "Install as an app (PWA)" button that brings up the browser's install prompt. It is hidden after the prompt has been shown, until the browser offers again, and whenever the site runs as the installed app. On an iPhone or iPad the landing page instead says how to add the site to the home screen. Its icons are MLU 1's mining pod on orange, in plain and maskable versions; the maskable ones keep the pod inside the central circle, so phones can crop them to their own icon shape.
- **Offline:** the site's service worker, which every page registers, answers each request from the network and keeps a copy of every successful answer. When the network cannot be reached, it answers from those copies, matching pages without their URL parameters, so any page opened before works offline. The game fetches every image and sound when it starts, so opening it once online is enough to play it offline; saves and settings are in the browser and need no network. Errors such as a missing file are passed on, never replaced by a copy. The worker keeps its copies in caches whose names start with "mlu-web-", and removes only those of its own older versions.
- **Serving:** the pages use JavaScript modules, so it has to be served over HTTP; opening the file directly does not work. Any static web server will do. It needs no build step and no third-party code.

## 3. Lifecycle and main loop

### Game time

- **Ticks:** all game time is counted in ticks. Every rule that involves time (movement, timers, animation, fuel use, message durations) advances by a fixed amount per tick, never by elapsed real time. One tick updates the whole game once.
- **Updates made while drawing:** the original advanced some things while drawing a frame, not in its tick: particles, the explosion animation, floating labels, the sonic, ice and nuclear bomb blasts (which change the map), the tractor beam and laser timers, the wreck's position, the countdown after a fatal message, the start-page text cursor, the inventory's pause, the mantle scroll and its detonations, and the victory scoring. Because the original drew once after every tick, these advanced once per tick. The web version makes them part of the tick, run straight after the tick's other updates in the order the original drew them, so they still advance exactly once per tick whether or not a frame is drawn. Drawing changes nothing. The original drew a timed effect (an explosion, a beam, a label, a bomb's ring) once more on the frame where it ended; the web version notes such effects when they end in a tick and draws them that one more time.
- **Speed:** a fixed 60 ticks a second, one tick every 16.67 ms. There is no speed setting, and the `-` and `=` keys do nothing.
- **Input between ticks:** key presses and clicks are handled the moment they arrive, between ticks, as in the original, where they arrived on a separate thread.

### Frame pacing

- **Driven by the display:** the game loop runs once per display refresh (vsync) and works from the real time between refreshes (the frame delta). It adds that time to a time bank, then runs one tick and takes one tick length out of the bank for as long as the bank holds at least half a tick length, so the bank can go up to half a tick into debt. This rounds to the nearest tick. No time is lost or added, so game speed is the same on any refresh rate: 60 Hz, 120 Hz, 144 Hz or variable.
- **Smoothing:** the bank is fed a moving average of the frame delta, in which the newest delta counts for a tenth, not the raw delta. Refresh timestamps wobble by a fraction of a millisecond. Fed raw, that wobble would make some refreshes run two ticks and the next none whenever the bank sits near the rounding point. The average holds back part of a longer delta and pays it out over the following refreshes, so over time it adds exactly the time that passed. After a change of refresh rate, for example when the window moves to another monitor, it settles within a few dozen refreshes.
- **Drawing every refresh:** the screen is drawn on every refresh, whether or not a tick ran. Each drawing is given how far real time has moved from the latest tick towards the next one, as a fraction from 0 to 1.
- **Interpolation:** just before each tick the positions of moving things are noted. Drawing places them that fraction of the way between the noted positions and their positions after the tick, rounded to whole pixels: the pod, the sky, particles, earthquake rocks, the rising mineral label, mantle rocks and the mantle's scrolling background. Motion therefore advances by an even amount on every refresh at any refresh rate, instead of in whole-tick steps that some refreshes repeat. The picture is up to one tick (16.7 ms) behind the latest tick.
- **Jumps are not interpolated:** a move that is a jump in the original appears at once, without sliding. Nothing is interpolated across a tick in which the view scrolled by whole tiles or the screen changed (entering or leaving the base, the start page, the mantle). The pod is not interpolated when it moved more than 25 pixels in one tick (teleports, settling onto the tile grid), particles not beyond 40 pixels, rocks not beyond 30, and the mantle background not when it wraps round. Things that appear or disappear, the earthquake shake and animation frames change at once.
- **Game state:** the fraction affects only the drawing. The game's rules and state depend on ticks alone.
- **Ticks per refresh:** a 60 Hz display runs exactly one tick per refresh. Faster displays run one tick or none per refresh, which is still 60 ticks a second: a faster display gives smoother motion, not a faster game. A display slightly slower than 60 Hz, such as 59.94 Hz, needs about four refreshes a minute that run two ticks, which interpolation hides.
- **Checked:** in a simulation with refresh timing wobbling by up to half a millisecond, at 59.94, 60, 75, 90, 100, 120, 144, 165 and 240 Hz, the game ran at 60.00 ticks a second. Between consecutive refreshes, the drawn position of something moving 5 pixels per tick never strayed more than 0.02 pixels from an even step. In a browser on a 120 Hz display the game drew 120 frames and ran 60 ticks a second, and drawing a frame took under a millisecond.
- **Stalls:** if more than 250 ms passes between refreshes (for example a hidden tab or a busy computer), that gap counts as no time: the game pauses rather than jumping ahead. At most 8 ticks run in one refresh, and any time beyond that is dropped. Returning to a hidden tab resumes from the current time. Browsers stop refreshing a page that is hidden or fully covered by other windows, so the game pauses then too.

### Start-up, pausing and restarting

- **Start-up:** the page first loads every image, showing "Loading images n/total" in the status line, then every sound. Then the game is set up as after a restart (below), the start page appears and the clock starts. If loading fails outright, the status line shows the error.
- **Images:** the game asks for images by file name. A name with no file (three such names exist: a music-off and level-off picture for the start page, and a second cursor for the upgrades shop) has no image and draws nothing, as in the original, where a missing image also drew nothing.
- **Sound unlock:** browsers keep a page silent until the player presses a key or clicks. Sound starts working from the first key press or click; music that should already be playing then starts.
- **Pausing:** there is no general pause. The inventory screen (key M) freezes the fuel, battery, Ice9 and the clock, by putting their values back every tick, and stops the pod from falling; anything else, including driving with a key that was already held, carries on.
- **Game over:** a fatal message (section 4) shows in red in the middle of the screen. After 80 more ticks the music stops, the game restarts and the start page appears.
- **Restart:** happens at launch, after a game over, after the victory and on the menu's Restart (section 2). It sets everything back to a new game: money, gauges, upgrades and gadgets to their starting values, the map cleared to earth with magma below row 3000, the pod at column 23, row 4, transmissions back to the first one, no explosion, beam, label, bomb, earthquake or particles, and the normal fall speed. It keeps the music and sound switches and the difficulty level. The theme music becomes the title tune, which plays if music is on. The typed name, menu selection and cheat are cleared.

## 4. Screens and states

The game is always on one of these screens. The start page and the base are menus; play and the mantle are the two kinds of play, chosen by the pod's row (the mantle is row 3000 and below).

### Start page

- **Layout:** the title picture with six rows, selected with Up and Down (wrapping round): Start New Game, Load Saved Game, Enter Cheat Code, Music, Sound FX and Difficulty Level. The first three rows have a text box; the selected one is drawn highlighted. On the last three rows the selection is shown by a highlight picture over the row's label.
- **Switches:** on the Music, Sound FX and Difficulty rows, Left and Right change the setting: music and sound toggle, and difficulty steps through Easy, Normal and Difficult (wrapping round). Green and black lights show the current settings. Music and sound start on the first time, and after that as the player last left them (section 11); difficulty starts at Easy.
- **Typing:** letters and digits are typed into the selected row's text box, as lower case, up to 13 characters; Backspace deletes. The same text is shared by the three boxes and is drawn in the selected one, with a blinking cursor shown for 14 of every 30 ticks.
- **Enter** with at least 3 characters typed:
  - On Start New Game: generates a new map at the chosen difficulty (section 6) and starts play. The typed text stays as the game's name, used for saving.
  - On Load Saved Game: loads the save of that name (section 11) and starts play. If there is none, or it cannot be read, the typed text is cleared and the "File not found" pop-up appears.
  - On Enter Cheat Code: if the text is a cheat code (section 12), its description appears in blue at the top right and it applies to the next game started or loaded; otherwise the "wrong password" pop-up appears. The text is cleared either way.
- **Pop-ups:** a pop-up picture is drawn over a dimmed screen. Enter closes it.

### Play

The map seen from the side, the pod, the sky and base on the surface, and the panel along the bottom (section 9). The pod drives, flies, falls and drills (section 7). Over it can appear:

- **Floating mineral label:** the name, sale price and weight of a mineral just collected, in red, rising 3 pixels a tick for 50 ticks. Also used for "Cargo Bay is Full" and the Mega part messages.
- **Bonus label:** "Bonus - $n", flashing red and green every two ticks, for 150 ticks.
- **Transmissions:** messages from the base, shown when the pod first reaches certain rows (section 6). The game carries on underneath. Enter closes a transmission and sets up the next one.
- **Fatal messages:** "FUEL TANK EMPTY!", "ENGINE FAILURE!", "OVERHEAT!", "SHIP DAMAGED!", "RADIATION EXPOSURE!" and, after loading a modified save, "Save file has been modified. All data has been erased." Each leads to game over (section 3). A later message replaces an earlier one's text but the countdown continues.
- **Inventory:** key M opens it and any other key closes it. It lists the minerals carried with amounts and weights, the super-ship materials with progress towards their targets, the gadgets, the installed burners and reactors, and the current upgrades with their names and amounts. Two buttons at the top right switch music and sound with a click; a stop sign shows over a switch that is off. Opening it also refreshes the shown mineral profit.

### The base

Driving onto the surface at the far right enters the base. Play stops, the base's three tabs are shown one at a time, and the shop tune plays if music is on.

- **Enter** moves to the next tab: Repairs, Upgrades, Gadgets, then Repairs again, resetting the selection.
- **Esc** leaves: the pod reappears on the surface beside the base, facing the way it was. If the super-ship has been bought and the victory has not happened, leaving shows the super-ship transmission.
- **Space** buys or performs the selected item; a click on an item selects it, and a click on the item already selected buys it.
- **Repairs tab:** six rows: Update All, Save Game, Sell Cargo, Refill Fuel, Fix Drill, Fix Hull. It lists the minerals carried with their counts and sale values, and shows the cargo weight, fuel, drill and hull values, the cargo's sale value, the cost of all repairs and the money.
- **Upgrades tab:** a grid of 8 categories by 7 tiers, selected with the arrow keys (Left and Right wrap round the 8 columns, Up and Down the 7 rows). Owned tiers and available tiers have different frames. The selected tier is shown large with its name, category, amount, price and whether it is already purchased, available or unaffordable.
- **Gadgets tab:** 15 rows of gadgets, plus a 16th row for the super-ship once the materials for it are collected (section 8). Lights show what is owned, with the number carried for the countable gadgets. With the materials collected, or the super-ship bought, the tab also shows the material weights collected.
- **Pop-ups:** "Game saved", "Not enough cash" and "Limit reached". Enter or Esc closes them; Esc with a pop-up open does not leave the base.

### The mantle

Row 3000 and below. The view is a magma background scrolling upwards past the ship, which moves freely on the screen. Section 6 describes it.

### Victory

After the fifth successful detonation in the mantle, the pod is put back on the surface at its starting place and the victory transmission appears: a congratulation, a randomly chosen cheat code as a reward, and the final score made up of the score so far, a money bonus and a time bonus (section 8). Closing it with Enter ends the game: the save under the game's name is deleted and the start page appears.

## 5. Controls

Keys are handled as they arrive, including the repeats the system generates while a key is held. Holding Down or Space keeps drilling only because of those repeats: each repeat that arrives while the pod is ready starts the next tile. Letters follow the keyboard layout. Keys still held when the page loses focus or is hidden are treated as released, and so is Ctrl whenever a key event shows it up (its release can be lost to a browser dialog). Keys the game uses do not reach the browser (so Space does not scroll the page), except combinations with Alt or the system key, and letters and digits pressed with Ctrl, which reach both the game and the browser so that browser shortcuts such as Ctrl+R keep working. The `-` and `=` keys are left to the browser.

Any key other than M closes the inventory.

While the menu or a message box is open, keys go to it and not to the game (section 2).

### Play

| Key | Action |
|---|---|
| Left, Right | Drive, and face that way. |
| Up | Fly. Each press resets the fall speed. |
| Down | Drill down. |
| Space | Drill sideways in the direction faced. |
| Ctrl + arrow | Tractor beam in that direction, if owned. |
| Shift | Jet booster on or off, if owned. |
| Z | Dynamite. |
| X | TNT. |
| 1 | Sonic bomb. |
| 2 | Ice bomb. |
| A | Hull repair kit. |
| S | Drill repair kit. |
| Q | Teleporter 1. |
| W | Teleporter 2. |
| C | Mineral processor on or off. |
| M | Inventory open or closed. |
| Enter | Close the transmission or pop-up. |

### Mantle

| Key | Action |
|---|---|
| Arrows | Move the ship. |
| X (held) | Dive faster. |
| Z (held) | Dive slower. |
| Space | TNT, using 100 tons of explosives. |
| Enter | Detonation, using 9,000 tons of explosives. |

### Base and start page

As described in section 4. Every change of selection plays the beep if sound is on.

### Mouse

A click (press and release) is used only in the base, to select and buy (section 4), and in the inventory, to switch music and sound. Click areas, in game coordinates:

- **Repairs tab:** x from 297 to 484; rows at y 159–209, 218–268, 280–329, 340–389, 401–450 and 459–510.
- **Upgrades tab:** the tile of column c (0–7) and row r (0–6) covers x from 20 + 83c to 87 + 83c and y from 107 + 69r to 169 + 69r.
- **Gadgets tab:** x from 331 to 719; each row is 17 pixels tall, starting at y 162, 181, 198, 216, 252, 270, 306, 324, 359, 377, 395, 413, 431, 468, 486 and 504. Where two rows overlap, the upper one wins. The 16th row responds only when the super-ship is available or bought.
- **Inventory:** music switch at x 633–657, y 108–131; sound switch at x 633–657, y 151–175. Turning sound on below row 1200 also starts the lava sound.

### Browser limits

Some key combinations belong to the browser and cannot be taken by a page. The one that matters is Ctrl+W, which closes the tab: pressing Teleporter 2 while holding Ctrl for the tractor beam would close the game. Using both together is never needed, since the tractor beam uses only the arrows.

- **Leave confirmation:** while a game is in progress (anywhere but the start page), closing, reloading or leaving the page first shows the browser's own "Leave site?" confirmation, so the game can be kept. The start page asks nothing, and neither does the menu's Exit after its own question.
- **Warning:** if Ctrl was held when the page was about to close, or if the browser passes Ctrl+W to the page, the status strip shows in bold on red, for 8 seconds: "Ctrl+W closes the browser tab. Release Ctrl (tractor beam) before pressing W (Teleporter 2)."
- The browser decides the confirmation's wording, and shows it only after the player has pressed a key or clicked on the page, which starting a game always involves.

## 6. World

### The map

- **Size:** 48 columns by 3015 rows of 50-pixel tiles. Rows 3000 to 3014 are always magma; the mantle lies beyond.
- **Depth:** the pod's depth in feet is 10 × (row − 4). The surface is row 4, so row 5 is 10 ft.
- **Tile values:**

| Value | Tile |
|---|---|
| 0 | Earth |
| 1–27 | Minerals: coal to dark matter (section 8) |
| 28 | Gas pocket |
| 29 | Granite |
| 30 | Marble |
| 31 | Lava |
| 32–41 | Deep crystals: adamite to tanzanite |
| 42–46 | Parts of the Superboring Machine: Mega engine, fuel tank, cargo bay, hull, cooling system |
| 47–49 | Super-ship materials: mithril, unobtainium, adamantium |
| 50 | Ice9 |
| 51–53 | Martian bombs, small to large |
| 54 | Magma |
| 80 | Open (dug out or a natural cave) |

- **Solid and open:** values below 54 are solid and must be drilled; 54 (magma) and above are open, so the pod can move through them.

### Generating a new map

The difficulty sets a density value: 1500 for Easy, 1550 for Normal and 1600 for Difficult. In what follows, "a random number" is a fresh number between 0 and 1, and "random × N" is such a number times N.

1. **Rows 0 to 1999.** For each row y and each column, a value r is drawn as random × density. Then:
   1. The first matching rule of the table below sets the tile. Each rule needs r strictly between its bounds, the row below its limit, and one or two tests on fresh random × y numbers; when there are two tests, the "less than" test is made first and the "greater than" test only if it passed, each with its own random number. Rules are tried in order and every test of a rule is evaluated left to right until one fails, so each failing rule uses up the random numbers drawn for it.
   2. If r is between 760 and 900, the tile becomes open, whatever was chosen.
   3. Below row 1200, deep crystals: the first matching rule of the second table sets the tile.
   4. If the tile is still earth and the row is 1200 or less, three independent chances follow: granite if random × (53 − 0.0333y) is below 1 and the row is over 100; then marble if random × (46 − 0.035y) is below 1 and the row is over 400; then lava if random × (42.5 − 0.03y) is below 1 and the row is over 600. A later one replaces an earlier one. Where the multiplier is zero or negative the test always passes.
   5. Below row 1200: an earth tile becomes marble if random × 4 is below 1; then an earth tile becomes lava if random × 6 is below 1; then an open tile becomes magma if random × (6 − 0.0025y) is below 1.
   6. Rows 0 to 4 are always open.

| Tile | r between | Random × y test | Rows below |
|---|---|---|---|
| Coal | 0 and 20 | less than 50 | 500 |
| Petroleum | 20 and 40 | less than 60 | 500 |
| Iron | 40 and 59 | less than 70 | 500 |
| Copper | 60 and 78 | less than 80 | 500 |
| Quartz | 80 and 98 | less than 100 | 500 |
| Lead | 100 and 118 | less than 100 | 500 |
| Bronze | 120 and 137 | less than 150, greater than 20 | 700 |
| Silver | 140 and 157 | less than 180, greater than 70 | 700 |
| Gold | 160 and 177 | less than 250, greater than 100 | 700 |
| Palladium | 180 and 196 | less than 300, greater than 240 | 700 |
| Cesium | 200 and 216 | less than 350, greater than 200 | 700 |
| Platinum | 220 and 236 | less than 280, greater than 340 (never both) | 700 |
| Opal | 240 and 258 | less than 750, greater than 400 | 1000 |
| Topaz | 260 and 278 | less than 800, greater than 440 | 1000 |
| Emerald | 280 and 297 | less than 820, greater than 460 | 1000 |
| Saphire | 300 and 317 | less than 840, greater than 480 | 1000 |
| Ruby | 320 and 337 | less than 860, greater than 500 | 1000 |
| Diamond | 340 and 357 | less than 880, greater than 600 | 1200 |
| Amazonite | 360 and 376 | less than 800, greater than 700 | 1200 |
| Thorium | 380 and 390 | less than 1000, greater than 600 | 1300 |
| Uranium | 400 and 410 | less than 1000, greater than 640 | 1300 |
| Plutonium | 420 and 428 | less than 1000, greater than 680 | 1300 |
| Moonstone | 440 and 453 | greater than 750, less than 1500 | 1000 |
| Starstone | 460 and 473 | greater than 800, less than 1500 | 1000 |
| Sunstone | 480 and 493 | greater than 850, less than 1500 | 1000 |
| Kryptonite | 500 and 512 | greater than 900, less than 1500 | 1000 |
| Dark matter | 520 and 528 | greater than 950, less than 1500 | 1000 |
| Gas pocket | 550 and 700 | greater than 600 | 1400 |

For the five gems from moonstone to dark matter the "greater than" test comes first.

| Deep crystal (rows over 1200) | r between | Random × y test |
|---|---|---|
| Adamite | 1000 and 1010 | less than 1600 |
| Selenite | 1020 and 1030 | less than 1700 |
| Gyrite | 1040 and 1050 | less than 1800 |
| Froyite | 1060 and 1070 | greater than 1300 |
| Aquamarine | 1080 and 1090 | greater than 1350 |
| Mimetite | 1100 and 1110 | greater than 1400 |
| Orpiment | 1120 and 1128 | greater than 1500 |
| Caledonite | 1140 and 1148 | greater than 1600 |
| Fedgarnet | 1160 and 1168 | greater than 1700 |
| Tanzanite | 1190 and 1296 | greater than 1800 |

2. **The cheat** chosen on the start page is applied (section 12).
3. **Row 5** is set to earth across the whole width, so the pod starts on solid ground.
4. **The five Mega parts** are placed one each, in that order: engine, fuel tank, cargo bay, hull, cooling system. Each goes in column floor(random × 47) (so never the last column) on row round(random × 400 + 800), drawn again until it differs from the rows already used.
5. **Rows 2000 to 2999** are generated afresh. For each tile, r is random × 1000, the tile starts as earth, and the first matching rule applies:

| Tile | r between | Rows over |
|---|---|---|
| Mithril | 0 and 5 | 2100 |
| Unobtainium | 10 and 14 on Easy, 10 and 13 otherwise | 2200 |
| Adamantium | 20 and 25 | 2300 |
| Tanzanite | 30 and 36 | any |
| Ice9 | 40 and 55 | any |
| Small bomb | 60 and 65 | 2100 |
| Medium bomb | 70 and 75 | 2200 |
| Large bomb | 80 and 85 | 2300 |
| Marble | 100 and (y ÷ 5 − 100) | any |
| Lava | 500 and (y ÷ 5 + 200) | any |
| Magma | 800 and (15y ÷ 100 + 550) | any |

   Divisions in this table drop the remainder.

6. **Difficulty factors** are set (section 8) and the first bonus step is 100 × the score factor. Play starts with the in-game tune if music is on.

### The view

- **Screen:** 16 columns by 12 rows of tiles, starting at a frame column and row. A new game starts at frame column 15, row 0. Screen pixel x of column c is 50 × (c − frame column), and likewise for rows.
- **Scrolling:** the view moves in jumps of 3 tiles. When the pod's screen x passes 600 going right, the frame moves 3 columns right (or 2, from column 30 to 32, the last); when it falls below 100 going left, 3 columns left (or 2, from column 2 to 0). When the pod's screen y falls below 150 while flying and the row is over 2, the frame moves 3 rows up; when it passes 400 while falling or drilling, 3 rows down. Everything on screen shifts with the view: the pod, labels, particles, rocks and bomb blasts.
- **Each vertical scroll** also updates the background colour, lets magma flow across the full width of the visible rows (below), and starts or stops the lava sound when sound is on: it starts below row 1200 and stops above it.
- **Background colour:** the colour behind earth tiles changes with depth. Above row 500 it is (145 − 0.21y, 120 − 0.174y, 87 − 0.128y); from 500 to 1199 it is (0.229y − 74, 36.57 − 0.007y, 23); from row 1200 it is (200, 28, 23). Values are rounded.
- **Sky and base:** while the frame row is below 4, the sky picture is drawn over the top of the view, scrolled sideways by −(pod column × 100 ÷ 47) pixels, updated as the pod drives. When the frame column is over 28 the base is drawn at x 650 − 50 × (frame column − 32), 213 pixels down (193 with the Christmas cheat), minus 50 per frame row.

### Transmissions

When the pod's row first reaches the next transmission row, that transmission appears. Enter closes it and sets the next row. The rows are 5, 12, 70, 100, 110, 150, 390, 590, 790, 996, 1190, 1300, 1500, 1700, 2000 and 2400. After the last, the next row is 9900, which the pod cannot reach. Leaving the base with the super-ship shows the super-ship transmission, whose successor (19900) is likewise unreachable. The victory transmission is described in section 4. Their topics in order: how to sell at the base, radioactive minerals, silver and gold, granite, heat and the radiator, the coal burner and petroleum refinery, gems and marble, lava, gas and nuclear fuel, the Superboring Machine, gems running out, large crystals and magma, radioactive metals running out, earthquakes and teleports, the dying core, the plan and Ice9, the super-ship materials, and the super-ship's gadgets and mission. The text is reproduced exactly, spelling mistakes included, with pictures of the minerals concerned.

### Magma flow

Below row 1190, magma spreads. Each pass looks at every magma tile in the visible rows and turns any open tile to its left, right or directly below into magma; passes repeat until nothing changes. Magma never flows upwards, and it reaches one row below the screen at most per flow. Two versions exist: one over the visible columns only, run after drilling a tile, after an explosion and when a bomb blast ends; one over the full width, run on vertical scrolls and teleports.

### Earthquakes

- **Causes:** below row 1000, each tile drilled has a chance of 0.000015 × row of starting an earthquake, dynamite 0.00002 × row and TNT 0.00003 × row. Blowing up a Martian bomb always starts one. Only one earthquake happens at a time.
- **Effect on the map:** 300 random swaps of a tile with its right-hand neighbour, in the band 10 to 110 rows above the top of the view; and, above row 2800, 300 more in the band 20 to 120 rows below it.
- **During the quake** (200 ticks): the view shakes 5 pixels left and right, changing every 2 ticks; for the first 150 ticks, each tick has a 7 % chance of dropping a rock from the top of the screen at a random x, falling 10 to 15 pixels a tick. A rock that hits the pod (within 30 pixels left, 40 right, 50 above or 10 below its position) explodes and adds 80 damage. The earthquake sound loops while it lasts.

### Teleporters

Teleporter 1 works down to 8,000 ft; Teleporter 2 works anywhere. Both act the same way: above row 1100, or when a roll of random × 1000 is not below (row ÷ 4 + 250), the pod goes back to its starting place on the surface. Otherwise it lands on a random open tile in the 400 rows above the top of the view (giving up after 100,000 tries and going to the surface instead), with the view placed around it. Teleporting clears particles, labels, the explosion and any earthquake, and stops the engine and lava sounds.

### Explosives and hazards

- **Dynamite (Z):** uses a stick, or 30 tons of explosives if there are none. Needs no explosion already showing, no drilling in progress and a row over 2. Clears the 3 by 3 tiles around the pod, except marble.
- **TNT (X):** uses a stick or 100 tons of explosives. Clears 5 columns by 5 rows around the pod (fewer at the map edges), marble included.
- **In a blast:** an Ice9 tile in range sets off an ice-bomb blast centred on it; a Martian bomb in range sets off a nuclear blast centred on it, starts an earthquake and adds damage: 200 (small, blast radius 10), 500 (medium, 14) or 1500 (large, 20). Every tile in range then becomes open, except marble for dynamite. The blast throws particles and plays its sound.
- **Sonic bomb (1):** costs 70 energy (battery first, then fuel). An expanding grey ring centred just right of and above the pod, growing 20 pixels a tick for (19 − row ÷ 200) ticks, shatters granite and marble into earth wherever a tile's corner, 15 pixels up and left of the tile, lies within the ring's radius of the pod's current position.
- **Ice bomb (2):** costs 100 energy. An expanding cyan ring, growing 15 pixels a tick for 25 ticks, freezes magma into earth and lava into marble wherever a tile's top-left corner lies within its radius; the tile the pod is in stays magma if it was magma.
- **Nuclear blast:** a translucent yellow disc growing 15 pixels a tick for its radius in ticks, clearing every tile whose centre it covers; then magma flows.
- **Gas pocket:** drilling one explodes, adding 20 damage, unless the gas burner is installed, in which case it adds 50 battery charge and 100 points if the battery has room.
- **Lava:** drilling one adds 100 damage and 100 degrees and explodes. The super-ship instead gains 100 battery charge if there is room for more than 100.
- **Magma:** each tick in magma adds 10 damage and 100 degrees to the normal pod and shows an explosion, and drains Ice9 faster.

### The mantle

- **Entering:** when the pod reaches row 3000 the mantle starts. The background becomes magma tiles on the 50-pixel grid plus 100 more at random places, scrolling upwards. The dive speed starts at 3; particles and rocks are cleared.
- **Each tick:** depth grows by the dive speed ÷ 2 (rounded); the temperature is depth ÷ 60 + 990; the battery, if below its capacity, gains (depth ÷ 157,000, remainder dropped) + 0.0889; Ice9 falls by depth ÷ 2,882,000 − 0.0041 and below zero means "OVERHEAT!"; fuel below zero means "FUEL TANK EMPTY!". A normal pod takes 10 damage a tick and explodes, which soon ends the game.
- **Moving:** the arrows move the ship 5 pixels a tick within the screen; X and Z raise and lower the dive speed by 0.1 a tick, between 0 and 20. Energy use per tick is dive speed ÷ 30, plus 0.05 for each arrow direction in use, taken from the battery while it is above zero, else from fuel.
- **Background:** scrolls up by the dive speed each tick; when it passes the top it restarts exactly one screen down, dropping any remainder.
- **Rocks:** below 32,000 ft, each tick has a chance of 0.0000005 × depth of a rock rising from below the screen: one of three pictures, at 30 % to 60 % size, at a random x, rising by the dive speed minus a random drift of −4 to 4 pixels a tick. Each rock has three collision boxes; the ship's position inside one means "SHIP DAMAGED!". TNT destroys rocks whose corner is within 170 pixels of the blast while the blast is in its first 30 frames. Rocks vanish 400 pixels above the screen.
- **Detonations:** the panel shows a red lamp and "LAUNCH!" while the depth is within 200 ft of the target depth. Enter with at least 9,000 tons of explosives sets off a detonation: a translucent orange disc growing for 25 ticks. If the depth is within 200 ft of the target, the target moves on: 85,200, 102,300, 105,000, 147,300, 162,500, then done. When the disc of the fifth successful detonation finishes, the game is won (section 4).

## 7. The pod

### Position

- The pod's position is kept two ways: in tile units (column and row, with fractions) and in screen pixels. Movement changes both together. At the start of each tick the tile position is rounded to the nearest tile (and also rounded up and down) for the rules below.
- A new game starts at column 23, row 4, screen position (390, 250), facing right.

### Modes

The pod is always in one of five modes: standing (1), drilling sideways (2), flying (3), drilling down (4) or falling (5). Each tick, in this order:

1. **Checks:** fuel at or below zero shows "FUEL TANK EMPTY!"; engine load above the engine's power shows "ENGINE FAILURE!" (each only if no message is showing). A bonus is paid if the score has passed the current step (section 8). Being in magma hurts (section 6). Reaching the next transmission row shows it. Ice9, if not negative, drains by 0.000001 × row + 0.0003, and by 0.003 more in magma. The super-ship, at 1250 degrees or more with room in its battery, gains 0.00007 × row − 0.03 battery, plus 0.1 in magma.
2. **Tractor beam:** with Ctrl held, the beam owned, the pod standing, at least 30 energy and no beam showing, an arrow pulls in the neighbouring tile in that direction (right, up, left or down, checked in that order). The tile is collected (below) without wearing the drill, and if it held something with weight it becomes earth. The beam costs 30 energy and shows for 20 ticks.
3. **Driving:** Right or Left (Right wins) without Ctrl, while not drilling (a dig started by a key since the last tick counts as drilling), moves the pod 5 pixels (0.1 tile) that way if the tile it is in and the tile it moves into are open and there is energy. It uses 0.000002 × (2000 + cargo + fuel) + 0.0015 energy, or half that plus 0.0005 if Up is also held.
4. **Flying:** Up without Ctrl while not drilling counts up a lift timer and uses 0.000005 × (2000 + cargo + fuel) + 0.002 energy, twice that with the jet booster on. If the pod's tile and the tile above its feet are open, the row is over 2 and there is energy, the pod rises: the speed is (lift − 1) × timer ÷ 50 + 1 pixels a tick, where lift is round(7 − 0.04 × engine load percentage), at most 5, then times 20 ÷ 8 with the jet booster, and exactly 4 in magma. The engine sound starts. If it cannot rise with the jet booster on, is not moving and the view is not at the top, it bumps its head: 3 damage and an explosion.
5. **Drilling** (normal pod only): a dig lasts 50 ticks. Drilling down moves the pod 1 pixel down a tick, sideways 1 pixel a tick towards the tile; both throw particles three times in ten and use 0.02 × (0.0077 × row + 0.5) energy a tick. On tick 45 the tile is collected, becomes open, scores 1 point, magma flows and the drill sound stops; on tick 50 the pod stands again.
6. **Falling:** if the tile below the pod's feet is open, Up is not held (or energy is below zero), nothing is drilling, no laser is firing and the inventory is closed, the pod falls. The fall speed grows by 0.05 a tick up to 10 and is exactly 4 in magma; the pod moves down by the fall speed in pixels. The fall goes on while the tile below is open (it also stops at once if the pod's own tile, rounded down, is solid and below 47, which keeps it out of rock). When a fall ends without Up held, a fall speed over 10 adds 5 damage and over 8 adds 3, each with an explosion.
7. **Energy:** the radiator's running cost (section 8) is added unless Ice9 is above zero. The tick's energy use comes from the battery if it holds any charge, else from fuel. The engine load (rpm) is round(5500 × energy used this tick).
8. **Settling:** if the pod did not move vertically, Up is not held and nothing is drilling, it snaps onto the tile grid and stands; if it is inside a solid tile it moves up one tile.
9. **Base:** at depth 0 and a column over 44, the pod enters the base.
10. **Earthquake** ticks run (section 6).

### Starting a dig

- **Down:** if standing, not drilling, Ctrl not held and the drill above 0, and unless the drill is below 200 and the tile below is granite or marble: the pod is lined up on its column and starts drilling down, with the drill sound.
- **Space:** if standing, not drilling and the drill above 0: the pod is lined up on its tile (pulled halfway back if it was 20 or more pixels off), and if the neighbouring tile in the facing direction exists and is solid it starts drilling sideways, unless the drill is below 200 and the tile is granite or marble. It never drills sideways on the surface row next to the base.
- **The super-ship** has a laser instead: the tile is cleared at once, its contents collected, the drill set to 1000, 30 energy used and a beam with a translucent flash shown for 20 ticks; particles fly.

### Collecting a tile

When a tile's contents reach the pod (by drilling, laser or tractor beam):

- **Score:** the mineral's value × score factor ÷ 10 points.
- **Drill wear** (not by tractor beam): 0.003 × row + 1, plus 0.3 × row + 100 for granite or 0.75 × row + 250 for marble. The drill never goes below 0. Below row 1000 the tile may start an earthquake.
- **Mega part:** installs the top upgrade of its category (section 8), adds 1,000,000 points and shows its name. Not by tractor beam.
- **Gas, lava:** as in section 6.
- **Anything with weight** plays the clank. If it fits in the cargo bay, its label rises and it is counted: minerals by kind (raising radiation by their radiation value), super-ship materials and bombs by kind (bombs add 50, 120 or 300 tons of explosives, and 30,000, 100,000 or 250,000 points to the super-ship), Ice9 to the coolant (it raises the Ice9 gauge's full mark to 10 more than the current amount rounded up, and adds 10, without adding weight). Otherwise "Cargo Bay is Full" rises instead and nothing is taken.
- **Processor:** with the processor on (key C, shown by a green light on the panel), the coal burner turns coal into 10 battery charge and the petroleum refinery petroleum into 20, if the battery has room, instead of keeping it. With a nuclear reactor, thorium, uranium and plutonium give 100, 150 and 250 charge; the improved reactor gives twice that and works on thorium even with the processor off. Converted pieces leave the cargo and their radiation.
- **Radiation** above the Bio-X shielding's limit shows "RADIATION EXPOSURE!".

### Damage, heat and death

- **Damage** adds up in hits; the hull's capacity is the limit. Passing it shows "SHIP DAMAGED!" and the wrecked pod is drawn where it was hit, where it stays.
- **Heat:** the temperature is round(row ÷ 2) − 10 degrees, plus any heat from magma or lava this tick. Above the radiator's limit, while Ice9 is below zero, it shows "OVERHEAT!" (checked in magma, after drilling a tile down and while falling).
- **Ice9** keeps the pod cool while it lasts: the radiator stops costing energy and overheating cannot happen until it runs out.
- **The super-ship** cannot be damaged: every explosion resets its damage to zero, and magma does not hurt it.

## 8. Economy

### Difficulty

| Level | Map density | Money factor | Score factor |
|---|---|---|---|
| Easy | 1500 | 15 | 5 |
| Normal | 1550 | 12 | 7 |
| Difficult | 1600 | 10 | 10 |

Sale prices are value × money factor ÷ 10 and points are value × score factor ÷ 10, each per piece, with the remainder dropped.

### Minerals

| Mineral | Value ($) | Weight (lb) | Radiation | Glows |
|---|---|---|---|---|
| Coal | 15 | 40 | 0 | |
| Petroleum | 40 | 50 | 0 | |
| Iron | 30 | 30 | 0 | |
| Copper | 50 | 25 | 0 | |
| Quartz | 75 | 15 | 0 | |
| Lead | 90 | 80 | 8 | yes |
| Bronze | 120 | 30 | 0 | |
| Silver | 250 | 30 | 3 | yes |
| Gold | 750 | 30 | 5 | yes |
| Palladium | 1,000 | 25 | 30 | yes |
| Cesium | 1,250 | 20 | 25 | yes |
| Platinum | 1,500 | 35 | 30 | yes |
| Opal | 2,500 | 5 | 0 | |
| Topaz | 3,000 | 5 | 0 | |
| Emerald | 4,000 | 5 | 0 | |
| Saphire | 5,000 | 5 | 0 | |
| Ruby | 7,500 | 5 | 0 | |
| Diamond | 12,000 | 5 | 0 | |
| Amazonite | 20,000 | 5 | 0 | |
| Thorium | 25,000 | 35 | 100 | yes |
| Uranium | 30,000 | 30 | 200 | yes |
| Plutonium | 50,000 | 25 | 500 | yes |
| Moonstone | 100,000 | 1 | 300 | yes |
| Starstone | 200,000 | 1 | 1,000 | yes |
| Sunstone | 300,000 | 1 | 2,000 | yes |
| Kryptonite | 500,000 | 1 | 5,000 | yes |
| Dark Matter | 1,000,000 | 1 (shown as oz) | 10,000 | |
| Adamite | 75,000 | 100 | 0 | |
| Selenite | 100,000 | 100 | 0 | |
| Gyrite | 150,000 | 130 | 0 | |
| Froyite | 200,000 | 150 | 0 | |
| Aquamarine | 250,000 | 200 | 0 | |
| Mimetite | 300,000 | 220 | 0 | |
| Orpiment | 350,000 | 250 | 0 | |
| Caledonite | 400,000 | 280 | 0 | |
| Fedgarnet | 450,000 | 300 | 0 | |
| Tanzanite | 500,000 | 350 | 0 | |
| Mithril | 5,000 | 10 | 0 | |
| Unobtainium | 500,000 | 40 | 0 | |
| Adamantium | 50,000 | 50 | 0 | |
| Ice9 | 0 | 10 (not carried) | 0 | |
| Small, medium, large bomb | 0 | 10, 20, 40 | 0 | |

Glowing minerals are drawn larger, centred on their tile, after everything else on the map. Earth, gas, granite, marble, lava, the Mega parts and magma have no weight and are not carried. Mithril, unobtainium and adamantium are counted separately from other minerals and are not sold.

### Upgrades

Each category has seven tiers; the first is fitted at the start. Buying a tier also marks every lower tier as owned, and cannot be undone by buying a lower one.

| Category (unit) | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 | Tier 6 | Tier 7 |
|---|---|---|---|---|---|---|---|
| Engine (HP) | Stock 100, $0 | Small 250, $300 | Medium 400, $2,000 | 4-cylinder 600, $10,000 | 6-cylinder 750, $30,000 | 12-cylinder 1,000, $100,000 | Turbo-X 1,500, $500,000 |
| Fuel tank (L) | Stock 30 | Small 50, $200 | Medium 100, $1,000 | Large 200, $3,000 | Extra Large 500, $10,000 | Gigantic 1,000, $50,000 | Super 2,000, $200,000 |
| Cargo bay (lbs.) | Stock 500 | Small 1,000, $1,000 | Medium 2,000, $3,000 | 2-Chamber 3,000, $10,000 | 4-Chamber 4,000, $40,000 | Large 5,000, $200,000 | Gigantic 6,000, $1,000,000 |
| Radiator (F) | Stock 50 | Small 100, $500 | 2-Turbine 200, $2,000 | 3-Turbine 300, $10,000 | Eon 400, $50,000 | Freon 500, $300,000 | Liquid Nitrogen 600, $2,000,000 |
| Hull (Hits) | Stock 5 | Bronze 10, $400 | Steel 30, $2,000 | Tungsten 50, $7,000 | Diamond-Coated 200, $15,000 | Kryptonite 600, $50,000 | Energy-Shielded 1,000, $200,000 |
| Bio-X shielding (Rx) | Stock 10 | Iron-Coated 50, $1,000 | 1'' Lead 200, $5,000 | 3'' Lead 500, $20,000 | 5'' Lead 2,000, $100,000 | Energy Deflector 10,000, $500,000 | Super Shield 60,000, $3,000,000 |
| Drill (DL) | Stock 50 | Steel 100, $1,500 | Carbide 200, $6,000 | Tungsten 1,000, $30,000 | Ruby 2,000, $150,000 | Diamond 5,000, $700,000 | NanoTube 10,000, $5,000,000 |
| Battery (MW) | Stock 50 | Small 100, $400 | Lithium-1 400, $1,000 | Lithium-2 1,000, $10,000 | Cadmium 2,000, $50,000 | Hydrogen Cell 6,000, $1,000,000 | Kryptonite 10,000, $10,000,000 |

- **Effects of buying:** the category's capacity becomes the tier's amount. A fuel tank fills up, a hull is repaired to zero damage, a drill is restored to full, and the pod's pictures change to match the hull and drill.
- **Radiator running cost** per tick by tier: 0.001, 0.002, 0.003, 0.006, 0.01, 0.02, 0.03; the Mega cooling system 0.06.
- **Mega parts** (from the Superboring Machine): engine 3,000 HP, fuel tank 6,000 L, cargo bay 15,000 lbs, hull 2,000 hits, cooling system 1,200 F. Each marks its whole category as owned; the inventory names them "Mega".

### Repairs tab

| Row | Action |
|---|---|
| Update All | Sell cargo, refill fuel, fix hull, fix drill, in that order. |
| Save Game | Saves under the game's name (section 11) and shows "Game saved". |
| Sell Cargo | Adds the cargo's sale value to the money and empties the cargo and radiation. The super-ship keeps its bombs' weight as cargo. |
| Refill Fuel | Costs 2.5 per litre missing. Without enough money, all the money buys 2 litres per $5 (whole litres). |
| Fix Drill | Costs 3 per point missing. Without enough money, all the money buys a point per $3. |
| Fix Hull | Costs 20 per point of damage. Without enough money, all the money repairs a point per $20. |

Full costs are rounded to whole dollars. The shown cost of all repairs is 2.5 × fuel missing + 3 × drill missing + 20 × damage, rounded.

### Gadgets

| Gadget | Price | Most carried | Use |
|---|---|---|---|
| Teleporter 1 | $20,000 | no limit | Q, down to 8,000 ft |
| Teleporter 2 | $100,000 | no limit | W, any depth |
| Dynamite | $2,000 | 50 | Z |
| TNT Explosives | $10,000 | 30 | X |
| Hull Repair | $20,000 | 20 | A: repairs 250 damage |
| Drill Repair | $100,000 | 20 | S: restores the drill to full, if not full |
| Sonic Bomb | $30,000 | 20 | 1 |
| Ice Bomb | $50,000 | 20 | 2 |
| Coal Burner | $1,000 | 1 | coal to battery |
| Petroleum Refinery | $5,000 | 1 | petroleum to battery |
| Natural Gas Burner | $50,000 | 1 | gas to battery, no gas explosions |
| Nuclear Reactor | $200,000 | 1 | radioactive metals to battery |
| Nuclear Reactor X | $1,000,000 | 1 | twice the reactor's yield |
| Jet Booster | $3,000 | 1 | Shift: faster climbing |
| Tractor Beam | $150,000 | 1 | Ctrl + arrow |
| Super-ship | $100,000,000 | 1 | see below |

Hull and drill repairs, and teleports, only work while not drilling. Trying to buy without the money, or past the limit, shows "Limit reached".

### The super-ship

- **Materials:** the 16th row appears once 150 mithril, 75 unobtainium and 100 adamantium are collected (1,500, 3,000 and 5,000 lbs, shown in the tab). The transmission asks for 4,000 lbs of unobtainium, which is wrong; 75 pieces are needed.
- **Buying:** $100,000,000. The materials are used up. Capacities become cargo 20,000, fuel 6,000 (filled up) and engine 5,000; the panel, pictures and drilling change (laser), the pod cannot be damaged and can live in magma, and it gains energy from heat and lava (section 7).
- **The panel** shows battery, fuel, temperature, cargo, explosives (towards 45,000 tons), Ice9 and the detonation lamp.

### Score and bonuses

- **Points** come from collecting (section 7), 1 per tile drilled, 1,000,000 per Mega part, 100 per gas pocket burned, and the super-ship's bomb bonuses.
- **Bonuses:** when the score passes the current step, the money gains a tenth of the step, the bonus label shows it and the next step is set. The steps are 100, 500, 2,000, 10,000, 100,000, 300,000, 1,000,000, 2,500,000, 10,000,000, 20,000,000 and 100,000,000, each times the score factor. After the last one there are no more bonuses. After winning there are no more bonuses either.
- **Victory score:** the score so far, plus a money bonus of half the money, plus a time bonus of (4,320,000 − ticks played) × 50, or 5,000,000 if that is negative.
- **Panel clock:** days, hours and "seconds" counted from ticks: days are ticks ÷ 1,440,000, hours (ticks ÷ 60,000) modulo 24, and the last field (ticks ÷ 1,000) modulo 60.
- **Number format:** money, score and prices are shown with commas every three digits.

## 9. Graphics

### Drawing a frame

The whole 800×600 screen is first filled with #CC6600, then:

- **Play:** the map (or, during an earthquake, the map shaken sideways, with the earthquake rocks), the sky and base, the floating labels, particles, the explosion, the tractor beam, the pod (or super-ship), the sonic, ice and nuclear blasts, the inventory, the panel, the transmission, and the fatal message.
- **Mantle:** the scrolling background, the explosion, the rocks, the ship, the detonation disc, the fatal message and the panel.
- **Base and start page:** as in section 4.
- **Last,** any pop-up over a half-transparent dark grey (70, 70, 70) cover.

### The map

The map is filled with the background colour, then for each visible tile: the earth picture if solid, the tile's picture if it is between 1 and 79 and does not glow, and, for open tiles below row 4, edge pieces: vertical and horizontal edges and inner and outer corners wherever a solid tile is next to it, with the map's left and right edges treated as walls. Glowing minerals are drawn last, 25 pixels up and left, larger than a tile.

### The pod

- **Pictures:** the pod is a body (which differs by drill tier and direction, with three animation frames while drilling) plus a hull overlay (which differs by hull tier, with a small offset per tier). Flying and falling show a propeller animation (three frames, changing every tick while the lift timer counts); the jet booster shows a flame. A pod with no drill left shows the broken drill picture. A radiation symbol floats above the pod while radiation is over the limit. A wrecked pod is a single picture.
- **The super-ship** has its own pictures: standing, flying with flames, and a swimming animation in magma and the mantle.
- **Christmas cheat:** the stock drill and hull, the base, and the quartz, copper, topaz, ruby and iron tiles use Christmas pictures; so do the stock drill and hull in the upgrades shop.

### Effects

- **Particles:** small chips (earth, granite or marble, matching the tile being drilled seven times in ten) at 10 to 20 pixels, thrown from the drill and falling under gravity of 0.15 pixels a tick per tick; they vanish off screen.
- **Explosions:** animation strips played one frame a tick: the small explosion (32 frames of 64 pixels), dynamite (20 frames of 150) and TNT (40 frames of 250).
- **Translucent shapes** (the sonic ring, the laser flash, the nuclear disc and the detonation disc) are drawn at half opacity; the ice ring is solid.

### The panel

A picture along the bottom with gauges drawn as red bars that rise from the bottom of their slots, then a frame picture over them, then numbers. The normal pod's gauges: battery, fuel, drill, temperature (up to 1200), cargo, radiation (percentage of the shielding's limit), engine load (percentage) and damage; with money, depth and the clock. While Ice9 is above zero, a blue Ice9 bar with a black outline and its value appears at the right. The super-ship's panel is described in section 8. The score is drawn at the top left.

### Fonts and colours

| Use | Font | Colour |
|---|---|---|
| Panel numbers | Commerce SF, bold, 15 px | black; money and depth (44, 16, 6) |
| Score, shop text, transmissions, cheat confirmation | Century, bold, 16 px | various |
| Upgrade details | Niagara Solid, bold, 17 px | (218, 174, 184) |
| Fatal messages, bonus label, inventory headings | Arial, bold, 20 px | red; bonus red and green |
| Inventory lists | Arial, bold, 12 px | black |
| Start page text boxes | Arial, bold, 13 px | (236, 88, 0) |
| Mineral labels | Arial, bold, 11 px | red |

The original asked for these fonts and, when one was not installed, used its default sans-serif font, which on Windows is Arial. The web version does the same: each font falls back to Arial and then to the browser's sans-serif font. Text is drawn at its baseline.

### Images

Image slots are swapped as the game moves between screens: the same numbered slots hold the start page's switch pictures, the map tiles, the upgrade pictures in the shop, and the rock pictures in the mantle. Transmissions show tile pictures from these slots.

## 10. Sound

### Effects

Effects play only while sound is on.

| Sound | When |
|---|---|
| Beep | Every selection change on the start page and in the base. |
| Engine (loops) | While flying, from when the pod starts to rise until Up is released or the pod stops flying. |
| Jet (loops) | Instead of the engine while the jet booster is on. |
| Drill | Starting a dig; stops when the tile is collected. |
| Clank | Collecting anything with weight. |
| Explosion | The small explosion. |
| Dynamite, TNT | Those blasts; TNT also for mantle TNT and detonations. |
| Teleport | Using a teleporter. |
| Earthquake (loops) | During an earthquake. |
| Lava (loops) | Below row 1200, checked on vertical scrolls and when sound is switched on in the inventory. |

Each sound is one clip: playing it again restarts it, and the looping ones repeat until stopped. Entering the base, teleporting and game over stop the engine, jet and lava sounds. While the page is hidden, all sound and music pause with the game and resume when it is shown again.

### Music

- **Tunes:** the title tune on the start page, the shop tune in the base and the in-game tune in play and the mantle. Only one plays at a time, always looping. Music is off at the start.
- **Switching:** turning music on at the start page plays the current tune; starting or loading a game, entering and leaving the base switch tunes if music is on; turning music on in the inventory plays the in-game tune; ticking the menu's Music box plays the tune of the current screen (section 2).
- **Playback:** browsers cannot play MIDI files, so the web version reads the original MIDI files and plays them with a small synthesiser: one simple waveform per note, chosen by the instrument's family, with a short attack and decay and a soft release; the percussion channel plays short filtered noise bursts (low for bass drums, high for cymbals, mid for the rest). It follows tempo changes, volume and expression controls and pitch bend. Notes are scheduled a fifth of a second ahead; notes that are already more than a tenth of a second late, because the page was busy, are skipped rather than played together. The music therefore keeps the melodies and timing of the MIDI files.

## 11. Saved games

### Storage

Saves are kept in the browser's local storage under "mlu1.save." followed by the game's name, one save per name, about 150 KB each. They belong to that browser and site. If a save cannot be stored (for example when storage is full, after roughly 15 to 30 saves, or blocked), the "Game saved" pop-up does not appear and the status line shows why, in red, for 8 seconds.

### Settings

The Music and Sound FX switches, the scaling mode and the touch controls option are kept in the browser's local storage under "mlu1.settings". The switches are stored whether they were changed on the start page, in the inventory, with the menu's check boxes or in the launcher, and the game starts with them as they were last left; the scaling mode and touch controls are set in the launcher. Each change keeps the other settings. They are not part of any save: loading a game keeps the switches as they are. If storage is blocked, the switches still work but start on again next time.

### Format

A save is text in the original's file format, with Windows line endings:

1. The difficulty level, 1 to 3.
2. 3000 lines, one per map row from the top, of 48 characters: each tile value plus 33, as a character.
3. One number per line: money, fuel, battery, drill (each of these three rounded), damage, then the tiers of engine, fuel tank, cargo bay, radiator, hull, Bio-X and drill and battery, then the counts of dynamite, TNT, Teleporter 1, Teleporter 2, drill repairs and hull repairs, then 1 or 0 for the tractor beam, coal burner, petroleum refinery, jet booster, gas burner, reactor and reactor X, then the score, the next transmission row, sonic bombs, ice bombs, ticks played, 1 or 0 for the super-ship, and the mithril, unobtainium and adamantium counts.
4. A checksum: 33 × level, plus every tile value, plus every number in step 3, added as 32-bit signed integers that wrap round.

The cargo, the pod's position, the fall state, the sound settings and the cheat are not saved.

### Loading

- **Reading:** a save starting with 1, 2 or 3 sets the level. One starting with anything else is an older save without a level line: its first line is map row 0 and it plays at Difficult. Every number must be a plain whole number. A save that is missing lines, has short rows or bad numbers is not loaded at all; "File not found" appears instead.
- **Checksum:** if it does not match, the save is still loaded, but "Save file has been modified. All data has been erased." appears at once, leading to game over, and the stored save is replaced by ":(". A save holding ":(" counts as not found.
- **Rebuilding:** the cheat chosen on the start page is applied, capacities are set from the tiers (tier 8 meaning a Mega part), owned tiers are marked, the radiator's running cost is set, the next bonus step is the first one above the score (none if past the last), the pictures are chosen, and a super-ship gets cargo 20,000, fuel 6,000, engine 5,000 and hull 10,000. Play starts with the pod on the surface at its starting place.
- **Compatibility:** saves are interchangeable with the original's files, except that the original cannot read money or score above 2,147,483,647.

### Snapshots

- **What:** a snapshot keeps the whole game as it was at one moment: the map, the pod, its gauges, upgrades, gadgets and cargo, the score, the screen and everything else the game holds, except the Music and Sound FX switches, which stay as the options say. It stands apart from saved games: taking or resuming one neither reads nor writes a save.
- **When:** taken with the menu's Take Snapshot, only in a base or on the pause screen, where the game stands still.
- **Where:** in the browser's IndexedDB, in a database of their own, "mlu1-snapshots", under an id made when the snapshot is stored. Each holds its name, the game's name, the time it was taken, whether in a base or paused, the summary the launcher shows, and the game, about 200 KB.
- **Resuming:** the launcher's Resume opens the game page with `snapshot=` and the id in its URL. The page loads as usual, puts the snapshot's game in place of the start page and removes the parameter from its URL, so a reload or Exit does not resume it again. The game carries on from that moment: no key is held, the current screen's tune plays when music is on, and on the pause screen the lava and earthquake sounds start again as they were. Saving at a base afterwards saves under the game's name held in the snapshot. A snapshot that is gone or does not fit leaves the start page as it is, and the status line says why.
- **Fit:** a part the snapshot holds that the game no longer has is ignored, and a part it lacks keeps its starting value. A part of the wrong kind or size, such as a map of other dimensions or a number where a list belongs, refuses the whole snapshot and changes nothing.
- **Files:** an exported snapshot is JSON text: a record marked as an MLU web snapshot, naming the game ("mlu1") and the snapshot format (1), with the name, the game's name, the time, the place, the summary and the game. Maps of bytes are written as base64 text.

## 12. Cheat codes

Entered on the start page; the last one entered applies to every game started or loaded until the next game over.

| Code | Shown as | Effect |
|---|---|---|
| filthyrich | $1,000,000 | Money set to $1,000,000. |
| enginefire | Turbo-X Engine | Engine tier 7, 1,500 HP. |
| tankwars | Super Fuel Tank | Fuel tank tier 7, 2,000 L, filled. |
| bayofpigs | Gigantic Cargo Bay | Cargo bay tier 7, 6,000 lbs. |
| coolbox | Liquid Nitrogen Radiator | Radiator tier 7, 600 F. |
| hullrat | Energy-Shielded Hull | Hull tier 7, 1,000 hits. |
| leadpoisoning | Super-Shield BioX | Bio-X tier 7, 60,000 Rx. |
| toothache | NanoTube Drill | Drill tier 7, 10,000, full. |
| batteryacid | Kryptonite Battery | Battery tier 7, 10,000 MW. |
| hollandtunnel | 12,000ft. Vertical Tunnel | Column 24 open from the top down to row 1200 (row 5 stays earth in a new game). |
| snowglobe | Christmas Special | Christmas pictures. |

The upgrade cheats set the capacity and tier but do not mark the tiers as owned in the upgrades shop (section 13). When loading, a cheat replaces the saved value.

## 13. Known quirks kept from the original

- **Upgrade cheats and the shop:** the shop still offers the lower tiers, and buying one lowers the capacity.
- **Tile name mix-up:** the names of gas, granite, marble and lava are shifted by one in the name list; they never appear because none of them can be carried.
- **Sonic bomb aim:** the ring is drawn where the bomb was set off, but rock is cleared around the pod's current position, measured from a point 15 pixels up and left of each tile.
- **Ice bomb aim:** measured from each tile's top-left corner.
- **Inventory pause:** only the gauges, the clock and falling stop; a held arrow key still drives the pod, using no fuel.
- **Any key closes the inventory,** including the repeats of a key already held.
- **Teleporting** stops the engine and lava sounds without forgetting that they were playing, so the engine stays silent until the pod has stopped flying once, and the lava sound until the pod has been above row 1200 again.
- **Ctrl while flying with the jet booster** stops the engine sound flag but leaves the jet sound looping until Up is released.
- **The detonation lamp** lights on the surface after the last detonation, because the depth is then within 200 ft of the finished target, 0.
- **The super-ship transmission's material weights** are wrong for unobtainium (it asks for 4,000 lbs; 3,000 are needed).
- **Limit reached** is also the message for not having enough money in the gadget shop.
- **Mantle fall:** the mantle background restarts exactly one screen down when it wraps, so it hitches slightly.
- **Transmission text** keeps its spelling and grammar mistakes.

## 14. Module structure

All modules are JavaScript modules in the same folder as the page. The game logic modules never touch the page: they work on one game state object and reach sound and storage only through two small interfaces the page supplies.

| Module | Responsibility |
|---|---|
| launcher | The launcher page: the Play link, listing, renaming, exporting, importing and deleting saves and snapshots, resuming snapshots, and the options. |
| play | Entry of the game page: sets up the page, its menu bar and message boxes, loads assets, wires input, audio, storage and the autopilot, takes snapshots and resumes the one named in the URL, and starts the clock. Offers a test hook that runs ticks by hand. |
| game | One tick, with no page code: the autopilot's keys, then the play or mantle update, then the drawing-time updates. The game page and the test harness both run it. |
| autopilot | The autopilot: route planning over the map, choosing what to dig, pressing the keys for each move, shopping in the base, and the mantle's dive and rock dodging. |
| viewport | Fits the game to the window, with integer and crisp scaling, and converts mouse positions. |
| clock | The display-driven loop: 60 ticks a second, a drawing every refresh with the interpolation fraction. |
| jmath | Java number rules: truncating division and casts, rounding, 32-bit and 8-bit wrap-around, random numbers. |
| data | Fixed tables: tiles, minerals, upgrades, levels, bonus steps, transmissions, rewards, cheat codes, key codes, fonts and the menu's texts. |
| imagelist | The list of every image file, for preloading. |
| state | The game state and restart. |
| sprites | Which image file each picture slot shows, for each screen, upgrade and cheat. |
| world | Map generation, cheats, scrolling, magma flow, earthquakes, teleports, explosives, background colour and the wreck check. |
| pod | The play tick: movement, drilling, energy, heat, damage, earthquakes, entering the base, explosions, particles, the laser and collecting. |
| mantle | The mantle tick, rocks, detonations and its drawing-time updates. |
| effects | Drawing-time updates of play and the start page, run once per tick; game over, bombs, victory scoring and the return to the surface. |
| shop | The base: tabs, repairs, upgrades, gadgets, leaving; number formatting, cargo value and repair cost. |
| controls | Key and click handling for each screen, the menu's Restart, Music and Sounds, and making a game resumed from a snapshot play on. |
| savefile | The save format, checksum and rebuilding a game after loading. |
| storage | Saves in the browser's local storage: read, write, delete and list. |
| snapshots | Snapshots: when one may be taken, its default name, capturing and restoring the game state, the snapshot file format, and the snapshots' own IndexedDB database. |
| settings | Keeping the Music and Sound FX switches, the scaling mode and the touch controls option in the browser's local storage. |
| assets | Preloading images by exact name. |
| audio | Sound clips, loops and music. |
| midi | Reading MIDI files and playing them with a simple synthesiser. |
| input | Browser events to game key codes and click positions. |
| touch | The touch controls: the pad, the key buttons, the device keyboard and full screen. |
| guard | The leave confirmation during a game and the Ctrl+W warning. |
| render | Drawing every screen in the original order, with interpolation, without changing state. |

## 15. Open decisions

None at present.
