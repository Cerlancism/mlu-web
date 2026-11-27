# MLU 2 web port: specification

This document specifies the web version of MLU 2, "MLU2: Crematoria", the sequel to Motherload Unlimited. It covers how the game behaves and how the web version is built, and it is complete without the original program. It describes the web version's behaviour, bug fixes included.

## 1. Scope

- **The game:** MLU2: Crematoria is a mining game. The player drives a digging pod across and under the surface of the planet Crematoria, collects minerals, and sells them at four bases along the way for upgrades, repairs and fuel. Unlike MLU 1, the world is wide rather than deep: progress is eastward, across 5,000 columns of ground 100 rows deep. A day and night clock sets the temperature, which drives overheating, freezing, weather and the state of the ground. The game is won by reaching the far east of the map.
- **Fidelity:** the web version plays the same as the original program, with the same rules, numbers, timing, screens, images and sounds. Where the original behaves oddly but harmlessly, the web version keeps that behaviour, and section 15 records it. Where the original had a bug, the web version fixes it.
- **Platform:**
  - The game runs in a browser page, with the game's menu bar above the game screen, and has a launcher page for its saved games and options (section 2).
  - There is no network access of any kind.
  - The game runs at a fixed 60 ticks a second, paced by the display refresh, with no speed setting (section 3).
  - Saved games and the high-score list are kept in the browser, and so are snapshots of games in progress (sections 13 and 14).
  - Music and sound effects start on the first time, and after that as the player last left them (section 13).
  - Music is played by a small built-in synthesiser, because browsers cannot play MIDI files (section 12).
- **High scores:** the bases' high-score tab, and the last base, which shows only that tab, keep their list in the browser, beside the saves (section 13).
  - The last base always opens.
  - The list holds the scores recorded in this browser: name, score, days taken and the date recorded, highest score first. It is shared by every game played in that browser, and is not shared with other players or browsers.
  - Typing a name of at least five characters and pressing Space records the current score. Each game has one entry: recording again from the same game replaces its earlier entry.
  - The victory transmission tells the player to enter the base to record the score.

## 2. Page and shell

- **Pages:** the game has two pages in one folder. The launcher (the folder's index page) starts the game and manages its saved games and options; the game page holds the game itself and can also be opened directly. The site's landing page, one folder up, links to the launchers of both games, and its footer has the same links as the launcher's.
- **Launcher:** in the game's colours: the start page, blurred and darkened, behind blue-grey metal panels, and a green Play button like the dashboard's lights. It has, from top to bottom:
  - a link back to the landing page;
  - the title band of the game's start page;
  - **Play**, which opens the game page with the scaling in use named in its URL (`scale=crisp` or `scale=integer`);
  - **Saved games:** every save in this browser's IndexedDB, by name, with its size, or "Finished: cannot be loaded" for a save the victory erased. Export downloads a save as the game's own save file, `<name>.ml2`, byte for byte, so it can be kept, moved to another browser or used by the original game. Delete removes a save after a confirmation. Rename moves a save to a new name, which must be a valid game name too, the name the start page loads it by; the launcher asks again while the name is not valid, and asks before replacing a save of that name. Import save files reads one or more `.ml2` files, from this launcher or from the original game, byte for byte, and stores each under its file name, which must be a valid game name (3 to 13 lower-case letters and digits; upper case is lowered); otherwise the launcher asks for a name. Replacing an existing save asks first. Empty files, files over 8 MB and files with zero bytes in them are refused. The list is read again when the page is shown from the browser's back-forward cache;
  - **Snapshots:** every snapshot kept in this browser (section 13, "Snapshots"), newest first: its name, and below it when it was taken, whether in a base or paused, the day, money and score, and its size. Resume opens the game page on the snapshot, with the scaling in use. Rename gives it any name of up to 100 characters. Export downloads it as `<name>.mlu2-snapshot.json`, with the characters file names cannot hold replaced by hyphens. Delete removes it after a confirmation. Import snapshots reads one or more such files and adds each as a new snapshot under the name it holds. Files of the other game, of another snapshot format or that are not snapshots, and files over 32 MB, are refused, each with the reason. On narrow screens each row shows the name, the details and the buttons one below the other, with the buttons in one row of equal widths (two rows of two below 360 pixels).
  - **Options**, stored as soon as they change (section 13, "Settings"): scaling, "Fill the window" (crisp) or "Whole-number pixels (Integer Scaling)"; touch controls (below), "Automatic" (the default), "Always" or "Never"; and the Music and Sound effects switches the game starts with. When the launcher's own URL has `scale=`, the scaling option shows that value and Play passes it on; choosing an option replaces it;
  - a footer with the game's name, release and credits, and links to the project's source code on GitHub and to its documentation, each opening in a new tab. Below them, "Updated" and the date and time of the port's latest change, as YYYY-MM-DD-HHMM in UTC+8.
- **Layout of the game page:** the menu bar and, below it, the game screen, centred together on a black page. The window frame itself is not reproduced.
- **Fit to window (game page):** the game screen is scaled to the window and keeps its 4:3 aspect ratio. The menu bar keeps a fixed height of 20 pixels and spans the game screen's width, and the game screen fits in the height that remains, as in the original's window, where the menu strip stayed 20 pixels tall while the game scaled. The page never scrolls. Resizing the window, zooming, or moving to a screen with a different pixel density rescales the game at once. (The original also scaled the game with its window, but stretched it to any shape.)
- **Scaling modes:** the URL parameter `scale` (`crisp` or `integer`) picks one of two modes; without it, or with any other value, the launcher's scaling option does (crisp unless changed).
  - **Crisp** (the default): the largest size that fits in the window.
  - **Integer**: the largest whole-number multiple of the original size that fits, counted in physical screen pixels, so every original pixel becomes the same square block. It never goes below the original size, even if the window is smaller.
  - Both modes draw hard-edged pixels with no smoothing. In crisp mode, at sizes between whole-number multiples, neighbouring pixels can differ in width by one screen pixel.
- **Game screen:** one canvas whose drawing surface is always 800×600. The game draws in those coordinates whatever size the canvas is shown at, and mouse positions are converted from screen size back to 800×600 before the game sees them. The canvas takes keyboard focus when the page loads and when it is clicked.
- **Touch controls:** a translucent overlay over the game page, for phones and tablets. It is shown on screens whose main pointer is touch, and on any screen from its first touch; the launcher's touch option can instead show it always or never. Its keys send the same keys the keyboard does, so the game cannot tell them apart:
  - **Pad**, at the bottom right: a round eight-way pad for the arrow keys. A touch picks one of eight directions by its angle from the centre, so a diagonal holds two arrows; a touch near the centre holds none. Sliding the finger to another direction releases only the arrow it no longer holds, so Up stays held from up-left to up-right.
  - **Keys**, at the bottom left: Z, X, 1, 2, 3, A, S, Q, W, T, V, C, D and M, above Ctrl ("Beam"), Shift ("Jet") and Enter ("OK"). Each shows its key and what it does in play. Ctrl stays held from one tap to the next, so the pad can steer the tractor beam with one thumb.
  - **Space** ("Dig"), a wide bar at the bottom centre, and **Esc** ("Close") at the top left, below the menu bar.
  - A held pad direction or Space repeats, after 0.4 seconds and then 25 times a second, as a held keyboard key does, so holding them keeps drilling; the other keys press once and release when let go.
  - **Keyboard**, at the top right, opens the device's own keyboard, for typing a game name (and the other names the game asks for), and closes it on the next tap. Each letter, digit or space typed reaches the game as that key, and each character deleted as Backspace; Enter is Enter. A word the keyboard corrects arrives as the deletions and retyping that turn the old word into the new one. Touching the game screen also closes the keyboard. While the keyboard is open the page shrinks to the space above it, where the browser allows.
  - **Full screen**, at the top right, where the browser allows it: shows the whole page full screen and, on phones, turns it to landscape; tapped again, it leaves full screen.
  - While a message box or the menu is open, the overlay's game keys are dimmed and do nothing. Keys the overlay holds are released whenever held keys are (losing focus, being hidden). The page does not scroll, zoom on a double tap or reload on a downward swipe.
- **Menu bar:** a 20-pixel strip with one menu, "Game". Opening it does not pause the game, and closing it gives keyboard focus back to the game screen. Its items, in order:

  | Item | Action |
  |---|---|
  | Restart | Asks "Are you sure you want to quit this game?" with Yes, No and Cancel. Yes returns to the start page; the other two do nothing. |
  | Take Snapshot | Keeps the whole game as it is now as a snapshot (section 13, "Snapshots"), named after the game's name and the local date and time to the second, such as "rover 2026-11-26 14:05:09", and says so in a message box titled "Snapshot". It works only in a base or on the pause screen; anywhere else, on the start page, once the game is over or while a save is being written or loaded, the box says why instead. |
  | Game Controls | A message box titled "Controls" listing the play keys, with the original's text. |
  | Shop Controls | A message box titled "Controls" listing the base keys, with the original's text. |
  | Mission | While a mission is active, a message box titled "Mission" with the mission's text; otherwise nothing. |
  | Music | A check box showing the game's music switch, the one shown on the start page. Ticking it turns the switch on and starts the tune for the current screen (start page, base or play); clearing it turns the switch off and stops the music. |
  | Sounds | A check box showing the game's sound switch, which it sets. |
  | Help | A message box titled "About" with the original's description of the game. |
  | Exit | Returns to the launcher, keeping the game page's URL parameters, once any save being written is stored. During a game it first asks "Are you sure you want to quit this game?" with Yes, No and Cancel, and leaves only on Yes; on the start page it leaves at once. |

  - Message boxes and the question appear over the game screen, with the original's titles and wording. The game keeps running behind them, as it did behind the original's dialogs, but keys go to the box until it is closed. Enter or Esc closes a message box.
- **Status line:** a strip along the bottom of the game screen shows loading progress and errors. It is hidden when it has nothing to show.
- **Files:** the game page, its stylesheet, its entry module, the launcher page with its stylesheet and module, the game modules and the icons sit in one folder. The web app manifest, its icons and the service worker are the site's, one folder up. The images and sounds are beside them, in an `images` folder that keeps the original paths and file names exactly, including upper-case `.JPG` extensions and a space in "dark matter.png".
- **Page metadata:** each page has a title, a description for search engines and link previews, a theme colour, a favicon and an icon for phone home screens: the game's own sprites scaled up, MLU 1's mining pod, standing on the ground with its starting drill and hull, for MLU 1 and the landing page, MLU 2's alexxzandrite crystal for MLU 2. The landing page and the launchers also have a link-preview image of 1200×630 pixels, given with the published site's full address. A launcher's image shows its game's title band, the digging pod and five minerals on the blurred start page, with "Play in your browser" and the game's edition. The landing page's image shows both title bands, each on its own start page. The game page asks search engines not to index it, so that searches lead to the launcher.
- **Installing:** every page links to the site's one web app manifest, so the whole site (the landing page and both games) installs as a single app, which opens on the landing page. Where the browser offers to install it (Chromium-based browsers), the landing page shows an "Install as an app (PWA)" button that brings up the browser's install prompt. It is hidden after the prompt has been shown, until the browser offers again, and whenever the site runs as the installed app. On an iPhone or iPad the landing page instead says how to add the site to the home screen. Its icons are MLU 1's mining pod on orange, in plain and maskable versions; the maskable ones keep the pod inside the central circle, so phones can crop them to their own icon shape.
- **Offline:** the site's service worker, which every page registers, answers each request from the network and keeps a copy of every successful answer. When the network cannot be reached, it answers from those copies, matching pages without their URL parameters, so any page opened before works offline. The game fetches every image and sound when it starts, so opening it once online is enough to play it offline; saves and settings are in the browser and need no network. Errors such as a missing file are passed on, never replaced by a copy. The worker keeps its copies in caches whose names start with "mlu-web-", and removes only those of its own older versions.
- **Serving:** the pages use JavaScript modules, so it has to be served over HTTP; opening the file directly does not work. Any static web server will do. It needs no build step and no third-party code.

## 3. Lifecycle and main loop

### Game time

- **Ticks:** all game time is counted in ticks. Every rule that involves time (movement, timers, animation, fuel use, the game clock, message durations) advances by a fixed amount per tick, never by elapsed real time. One tick updates the whole game once.
- **Updates made while drawing:** the original advanced many things while drawing a frame, not in its tick: falling rocks, meteors, particles, floating labels, explosions, the tractor beam, the sonic, ice, radiation and nuclear blasts (which change the map), lightning, wind, the shield and the laser with their energy drain, the radiation overlay, the countdown after a fatal message, the teleport and transporter animations, and the menu timers. Because the original drew once after every tick, these advanced once per tick. The web version makes them part of the tick, so they still advance exactly once per tick whether or not a frame is drawn. Drawing changes nothing.
- **Speed:** a fixed 60 ticks a second, one tick every 16.67 ms. There is no speed setting, and the `-` and `=` keys do nothing.
- **The game clock:** 300 ticks make one game minute and a game day has 8 hours. At 60 ticks a second a game hour lasts 5 real minutes and a day 40 minutes. The clock stays in step with everything else that is counted in ticks.

### Frame pacing

- **Driven by the display:** the game loop runs once per display refresh (vsync) and works from the real time between refreshes (the frame delta). It adds that time to a time bank, then runs one tick and takes one tick length out of the bank for as long as the bank holds at least half a tick length, so the bank can go up to half a tick into debt. This rounds to the nearest tick. No time is lost or added, so game speed is the same on any refresh rate: 60 Hz, 120 Hz, 144 Hz or variable.
- **Smoothing:** the bank is fed a moving average of the frame delta, in which the newest delta counts for a tenth, not the raw delta. Refresh timestamps wobble by a fraction of a millisecond. Fed raw, that wobble would make some refreshes run two ticks and the next none whenever the bank sits near the rounding point. The average holds back part of a longer delta and pays it out over the following refreshes, so over time it adds exactly the time that passed.
- **Drawing every refresh:** the screen is drawn on every refresh, whether or not a tick ran. Each drawing is given how far real time has moved from the latest tick towards the next one, as a fraction from 0 to 1.
- **Interpolation:** things that move smoothly are drawn that fraction of the way between where they were at the previous tick and where they are at the latest tick. Motion therefore advances by an even amount on every refresh at any refresh rate, instead of in whole-tick steps that some refreshes repeat. The picture is up to one tick (16.7 ms) behind the latest tick.
- **Jumps are not interpolated:** a move that is a jump in the original appears at once, without sliding: camera scroll jumps, teleports, restarts, entering and leaving a base, earthquake shakes, and anything that appears or disappears.
- **Game state:** the fraction affects only the drawing. The game's rules and state depend on ticks alone.
- **Ticks per refresh:** a 60 Hz display runs exactly one tick per refresh. Faster displays run one tick or none per refresh, which is still 60 ticks a second: a faster display gives smoother motion, not a faster game.
- **Stalls:** if more than 250 ms passes between refreshes (for example a hidden tab or a busy computer), that gap counts as no time: the game pauses rather than jumping ahead. At most 8 ticks run in one refresh, and any time beyond that is dropped. Returning to a hidden tab resumes from the current time.

### Start-up, pausing and restarting

- **Start-up:** before the first frame the page loads every image, showing "Loading images n/total" in the status line, then every sound and the three MIDI tunes ("Loading sounds…"), then every font the game draws with ("Loading fonts…"), so that no frame is drawn in a fallback font. Then the game state is created: the 20 background volcanoes and the 30 clouds are placed (below), the game is set up as after a restart, the field layer is drawn, the menu bar, input and leave confirmation are wired, the status line is cleared and the clock starts. If loading fails outright, the status line shows "Error:" and the reason.
- **Images:** the game asks for images by file name. An image that fails to load, or a name with no file (a few appear only in code the game never runs), draws nothing, as in the original.
- **Placed once per page load:** the background volcanoes, at x = 200 + random × 200 and then every 300 to 399 pixels, each of type 1 to 3 and 200 to 299 pixels wide; and the clouds, from x = random × 170 every 200 to 299 pixels, at y from −80 to 19, 250 to 349 pixels wide. A restart keeps the volcanoes; the clouds are spread again each time the pod leaves a base.
- **Sound unlock:** browsers keep a page silent until the player presses a key or clicks. Sound starts working from the first key press or click; a tune that should already be playing then starts.
- **What stops the game clock:** the play update (section 4), which advances the game clock and everything the pod does, runs only on the play screen while no transmission and no pause screen is open. The drawing-time updates (section 3, "Game time") run on every screen. Two message boxes that the original opened from inside its game loop stop everything, ticks and drawing, until they are closed: "Mission Complete!" on entering a base and the end-of-map message (section 4). Other message boxes, the menu bar and the departure-time dialog do not stop the game. A hidden page stops it too (section 3, "Frame pacing").
- **Pausing:** key M opens the pause screen (section 4), which stops the play update and every drawing-time update; Esc closes it.
- **Restart:** happens at launch, after a fatal message's countdown, after the final pick-up, on the menu's Restart, after a save that fails to load, and at the end of the map. It sets everything back to a new game and shows the start page:
  - Money, score and damage 0; every upgrade back to its stock tier (tier 1), with only the stock tiers owned; capacities from the stock tiers; fuel and drill full; battery empty; no gadgets, burners, reactors, heaters, power weapons, missions, Ice9, bomb fuel, minerals or frost.
  - The map cleared to earth in rows 0 to 99, with marble in rows 100 and 101.
  - The pod at column 5, row 4, screen position (240, 250), the view at column 0, row 0, standing. It keeps the direction it last faced (right in the first game).
  - The clock at day 0, 1:30, which is also the departure time; the next transmission the first one; all four bases standing, the last base visited the first one; the furthest column reached 0.
  - No weather, explosion, label, blast, beam, particle, rock, meteor, pop-up, panel or fatal message; the first bonus step 1,000; the cheat cleared; the difficulty back to Easy; the money and score factors 10 until a game starts; the converter switched on.
  - The typed text cleared, and the start-page row and the base tab back to the first.
  - It keeps the music and sound switches and the high-score list. The current tune becomes the title tune, which restarts if music is on, and all sound effects stop if sound is on.

## 4. Screens and states

The game is always on one of three screens: the start page, the play screen or a base. Over the play screen can appear a transmission, the pause screen or a fatal message; over a base, the departure-time dialog; over the start page or a base, a pop-up.

### Start page

- **Layout:** the title picture with six rows, chosen with Up and Down (wrapping round): New Game, Load Game, Cheat Code, Level, Music and Sounds. The first three rows have a text box, and the selected one is drawn highlighted; on the last three the selected row's label is highlighted with a picture. A credit line, "Created by Alexxz4. Summer 2009 Release.", sits near the top.
- **Switches:** on the Level row, Left and Right step the difficulty through Easy, Normal and Hard (wrapping round); on the Music and Sounds rows they switch music and sound effects on or off. Lights show the settings: green for the chosen level and for On or Off. Music and sound start on the first time, and after that as the player last left them (section 13); the level starts at Easy and goes back to Easy at every restart.
- **Typing:** letters and digits are typed, as lower case, up to 13 characters; Backspace deletes. The same text is shared by the three boxes and drawn in the selected one, with a cursor shown for 15 of every 30 ticks.
- **Enter** with at least 3 characters typed:
  - On New Game: generates a new world at the chosen difficulty (section 6), applies the cheat (section 14) and starts play with the transporter drop-in. The typed text stays as the game's name, under which it is saved.
  - On Load Game: reads the save of that name (section 13). Keys and clicks are ignored until it has been read. If there is no save of that name, the typed text is cleared and the "file not found" pop-up appears. If the save cannot be read, the game is restarted, the typed name, the selected row and the difficulty are put back, and a message box titled "Error" says "Invalid save-file!". Otherwise play starts beside the base where the game was saved, without the drop-in.
  - On Cheat Code: if the text is one of the ten codes, its reward is chosen for the next game started or loaded, and its name (section 14) flashes red and blue at the top right for 100 ticks; otherwise the "wrong password" pop-up appears. The text is cleared either way.
- **Generation is instant:** a new world is built between two ticks, with no loading screen.

### Transporter drop-in

A new game starts with the transporter bringing the pod down at the left of the screen. It counts 170 ticks: the transporter descends 3 pixels a tick from 150 pixels above the screen for 100 ticks, holds for 10 and rises 4 pixels a tick for 60. The pod is hidden for the first 100 ticks. Play keys are ignored and transmissions wait until it ends; the play update runs meanwhile.

### Play

The surface and the ground seen from the side, the pod, the weather and the heads-up display (section 11). The pod drives, flies, glides, falls and drills (section 8). Over it can appear:

- **Floating label:** two red lines (a mineral's name, then its sale price and weight) rising 3 pixels a tick for 50 ticks from where something was collected. Also used for the Mega parts and power weapons (name only), fuel caches ("n L of fuel"), "Cargo Bay is Full", and the Matter Transmitter's report, which does not rise.
- **Bonus label:** "Bonus - $n", flashing red and green every 2 ticks in the middle of the screen, for 150 ticks.
- **Inventory Sphere panel:** a small window listing what an Inventory Sphere gave (section 9), for 100 ticks.
- **Transmissions:** messages from the bases, shown when the pod first reaches certain columns (section 6) and when it finds a power weapon (section 8), in a large window headed "TRANSMISSION". The play update stops while one is open, but drawing-time updates (explosions, labels, the shield's countdown, meteors) go on. Opening one stops all sound effects. Esc closes it and sets up the next one; no other key does anything meanwhile.
- **Pause screen:** key M. The screen freezes on a picture of the moment, with a window headed "Game Paused" listing the minerals carried with amounts and weights, the cargo's sale value ("Mineral Profit"), the ship's total weight, the surface temperature at the pod's column and the temperature at the last base visited, the gadgets carried, the burners, reactors, tractor beam and charger owned, the saves left, pictures of the power weapons found, and each upgrade's current name and amount ("Mega" for a Mega part). Nothing moves, not even drawing-time updates, and pop-ups are not drawn. Only Esc does anything: it closes the screen.
- **Fatal messages:** "OVERHEAT!", "FUEL TANK EMPTY!", "ENGINE FAILURE!", "SHIP DAMAGED!", "RADIATION EXPOSURE" (without an exclamation mark) and "SHIP FROZEN!" (in blue; the others are red), centred on the screen; and, after loading a modified save, "Save file has been modified! Game session terminated." Play carries on underneath. After 80 more ticks (130 for the modified save) the music stops, the game restarts and the start page appears. While one shows, play keys are ignored, except during "OVERHEAT!". A later message replaces an earlier one's text but the countdown continues. While the pod is drilling, "ENGINE FAILURE!" is not drawn, and it is cancelled if the engine load falls back below 100 % before the dig ends; its countdown runs meanwhile.

### Bases

Driving onto a standing base's column on the surface row enters it (section 9 lists the four bases and what each offers). On entering: the Jet Glider switches off, the arrival time is noted, the radiation countdown is cancelled, the high-score list is read, the cargo's value and the repair cost are worked out (both 0 at the last two bases), all sound effects stop, the shop tune plays if music is on, and a mission is settled (section 10). The repairs tab is shown first, or the high-score tab at the last base. The play update stops.

- **Tabs:** Enter moves to the next tab, resetting the selection. At the first two bases the tabs are Repairs, Upgrades, Gadgets and High Scores, in a cycle; at the abandoned base Repairs and High Scores; at the last base only High Scores.
- **Repairs tab:** six rows: Update All, Save Game, Sell Cargo, Refill Fuel, Fix Drill, Fix Hull. It lists the minerals carried with counts and sale values, and shows the cargo weight, fuel, drill, damage, the cargo's value, the cost of all repairs and the money.
- **Upgrades tab:** a grid of 8 categories by 7 tiers. Left and Right choose the column (wrapping round), Up and Down the tier (wrapping round). Each tile shows the upgrade's picture in a frame that differs for owned tiers. The selected tier is shown large with its name, category, amount, price and "Already Purchased", "Available" or "Unavailable" (not enough money).
- **Gadgets tab:** 20 rows of gadgets with prices, and lights showing what is owned, with the number carried for the countable gadgets. The selected gadget's picture is shown at the top left.
- **High-score tab:** the local high-score list (section 1), 28 rows at a time with a scroll marker; Up and Down scroll it. Letters, digits and Backspace type a name (lower case, up to 13 characters, with a blinking cursor), shown with the current score; Space with at least 5 characters records the score.
- **Space** performs or buys the selected item. A click selects, and a click on the item already selected performs it (section 5).
- **Pop-ups:** "Game Saved" (with the saves left after its "Saves left:"), "not enough cash" and "limit reached", drawn over a dimmed screen. Enter or Esc closes them, and Enter does not change tab while one is open.
- **Leaving:** Esc opens the departure-time dialog, over a dimmed screen. Opening it rounds the game clock down to a whole number of 50-tick steps. It shows the departure time, starting at the last departure time chosen (1:30 in a new game), and the temperature it will be at the base's column at that time on the surface. Left and Right move the time one minute earlier or later, wrapping round the 8-hour day. A second Esc leaves:
  - Weather may have changed: beyond column 300 (furthest reached), rain stops with a chance of a half; beyond column 500, if the wind is blowing, rain stops (not the wind) with a chance of a half, and ash clouds stop with a chance of a half.
  - The pod appears on the surface 2 columns east of the base, the clock is set to the departure time, and if that is earlier in the day than the arrival time a day is added. The frost is cleared, the surface is melted or refrozen to suit the time (section 6), the clouds are spread again, the in-game tune plays if music is on, and the surface wind sound starts.
  - Leaving the last base starts the final pick-up.
  - At the first two bases, a new mission may be offered (section 10).

### The end of the game

- **Victory transmission:** when the pod reaches column 4980 on or above the surface, the last transmission appears: a congratulation, one of the ten cheat codes chosen at random as a reward with its reward's name, "All game data erased.", and the score so far, a money bonus of a fifth of the money, a time bonus of 1,000,000 × (150 − days), or 0 if that is negative, and the final score. The score becomes the final score (the money stays). The save under the game's name is overwritten so that it can no longer be loaded (section 13). Play then continues; there are no more transmissions.
- **Final pick-up:** leaving the last base (column 4990) brings the transporter down over the pod, on the same 170-tick path as the drop-in, 150 pixels left of the pod. The pod is shown for the first 100 ticks and then disappears. At the end the game restarts and the start page appears. To be on the high-score list, the score must be recorded in a base before this.
- **The end of the map:** if the pod ever gets past column 5000, a blocking message box titled "MLU2" says "Thank you for playing this betta version of MLU2: Crematoria." and "Please check http://mlu.aceboard.com for info about new version.", and the game then restarts.

## 5. Controls

Keys are handled the moment they arrive, between ticks, including the repeats the system generates while a key is held, as in the original. The arrow keys and Ctrl are held states that the play update reads; holding Down or Space keeps drilling only because each repeat that arrives while the pod stands ready starts the next tile. Letters follow the keyboard layout; digits are the main-row digits (the numeric keypad is not used). Keys still held when the page loses focus or is hidden are treated as released, and so is Ctrl whenever a key event shows it up. Keys the game uses do not reach the browser (so Space does not scroll the page), except combinations with Alt or the system key, and letters and digits pressed with Ctrl, which reach both the game and the browser so that shortcuts such as Ctrl+R keep working. The `-` and `=` keys are left to the browser.

While a message box or the menu is open, keys go to it and not to the game (section 2). While a save is being written or read, key presses and clicks are ignored, as the original handled saving and loading inside its key handler and took no other key meanwhile.

### Play

The arrow keys are noted as held on every screen except while a transmission or the pause screen is open. Everything else in this table is ignored while a fatal message other than "OVERHEAT!" shows and during the transporter drop-in and pick-up.

| Key | Action |
|---|---|
| Left, Right | Drive, and face that way (the facing does not change during a sideways dig). Pressing the opposite way while gliding stops the glide's speed. |
| Up | Fly. Each press sets the fall speed back to 7. Releasing it stops the propeller and jet sounds. |
| Down | Drill down (or fire the sonic cannon down). |
| Space | Drill sideways in the facing direction, underground only (or fire the sonic cannon). |
| Ctrl + arrow | Tractor beam in that direction, if owned. |
| Shift | Jet Glider on (only on the surface row) or off, if owned. |
| D (hold, then release) | Laser cannon, if found: hold to charge, release to fire. |
| C | Mineral converter on or off (a light on the display). |
| M | Pause screen. |
| Esc | Closes a transmission or the pause screen. |
| Enter | Closes a pop-up. |
| Z | Dynamite. |
| X | TNT. |
| A | Hull repair. |
| S | Drill repair. |
| Q | Teleporter 1. |
| W | Teleporter 2. |
| T | Matter Transmitter. |
| 1 | Sonic bomb. |
| 2 | Ice bomb. |
| 3 | Radiation bomb. |
| V | Shield. |

### Bases

| Key | Action |
|---|---|
| Up, Down | Selection up or down, wrapping round (6 rows on Repairs, 7 tiers on Upgrades, 20 gadgets); on the high-score tab they also scroll the list. Down does nothing in the departure-time dialog. |
| Left, Right | Upgrades column, wrapping round over 8; in the departure-time dialog, one minute earlier or later. |
| Enter | Next tab; closes a pop-up instead when one is open. |
| Space | Perform or buy the selected item; on the high-score tab, record the score (name of 5 or more characters). |
| Esc | Closes a pop-up; otherwise opens the departure-time dialog, and in the dialog leaves the base. |
| Letters, digits, Backspace | Type the name on the high-score tab. |

Up, Down, Left and Right play the beep if sound is on, except Left and Right in the departure-time dialog.

### Start page

| Key | Action |
|---|---|
| Up, Down | Row, wrapping round over 6, with the beep. |
| Left, Right | Change the level, music or sound setting on those rows. |
| Letters, digits, Backspace | Type the shared text. |
| Enter | Closes a pop-up; otherwise, with 3 or more characters, New Game, Load Game or Cheat Code by row. |

### Mouse

A click (press and release) counts, in game coordinates (section 2). The start page ignores the mouse.

- **Play:** with a mission active, a click on the mission box's close button (x 513 to 525, y 451 to 463) cancels the mission. Otherwise, while the gadget panel is open, a click uses the gadget on the highlighted row, exactly as its key would (the clicks are not blocked by a transmission, the pause screen or a fatal message).
- **Gadget panel:** moving the mouse over the button at the top left (x 11 to 59, y 26 to 44) opens a panel listing 11 gadgets: Teleporter 1, Teleporter 2, Dynamite, TNT, Shield, Hull Repair, Drill Repair, Sonic Bomb, Ice Bomb, Radiation Bomb and Matter Transmitter. Row i (0 to 10) is highlighted while the mouse is between y 73 + ⌊100i ÷ 3⌋ and y 101 + ⌊100i ÷ 3⌋, with the gadget's name. Moving right of x 92 or below y 435 closes the panel.
- **Repairs tab:** x 297 to 484; rows at y 159–209, 218–268, 280–329, 340–389, 401–450 and 459–510. A click anywhere in that strip plays the beep; a click that leaves the selection unchanged (on the selected row, or between rows) performs it.
- **Upgrades tab:** the tile of column c (0 to 7) and tier r (0 to 6) covers x 20 + 83c to 87 + 83c and y 107 + 69r to 169 + 69r, and a click on it plays the beep. A click that leaves the selection unchanged, including one outside every tile, buys the selected tier.
- **Gadgets tab:** x 314 to 719; row i (0 to 19) covers y 147 + 18i to 164 + 18i. A click that leaves the selection unchanged buys the selected gadget; every click in the strip plays the beep.

### Browser limits

Some key combinations belong to the browser and cannot be taken by a page. The one that matters is Ctrl+W, which closes the tab: pressing Teleporter 2 while holding Ctrl for the tractor beam would close the game.

- **Leave confirmation:** while a game is in progress (anywhere but the start page), closing, reloading or leaving the page first shows the browser's own "Leave site?" confirmation. The start page asks nothing, and neither does the menu's Exit after its own question. The browser decides the wording, and shows it only after the player has pressed a key or clicked on the page.
- **Warning:** if Ctrl was held when the page was about to close, or if the browser passes Ctrl+W to the page during a game, the status line shows in red, for 8 seconds: "Ctrl+W closes the browser tab. Release Ctrl (tractor beam) before pressing W (Teleporter 2)."

### Keeping the screen on

While a game is in progress (anywhere but the start page) and the page is visible, the page asks the browser to keep the screen on, with its screen wake lock, so that the display does not dim or lock during play. The browser drops the lock whenever the page is hidden; the page asks for it again within half a second of showing. It lets the lock go on the start page. Where the browser has no screen wake lock, or refuses one (on battery saver, say), the screen dims as usual, and the page asks again every 10 seconds.

## 6. World

### The map

- **Size:** 5000 columns by 102 rows of 50-pixel tiles. Rows 0 to 99 are the world; rows 100 and 101 are bedrock (marble, or downward-flowing magma under a lava fall). Rows 0 to 4 are sky except where hills stand. Row 4 is the surface row the pod drives along; row 5 is the top row of ground.
- **Depth and progress:** the pod's depth in feet is 10 × (row − 4). The game is played eastward: transmissions, regions, bases, missions and meteors depend on the column, which the display shows at the top right.
- **Each tile** has a value and a second value, its style:

| Value | Tile |
|---|---|
| 0 | Earth |
| 1–27 | Minerals: coal to dark matter (section 9) |
| 28 | Gas pocket |
| 29 | Granite |
| 30 | Marble |
| 31 | Lava rock |
| 33 | Obsidian |
| 34 | Alexxzandrite |
| 42–46 | Parts of the Superboring Machine: Mega engine, fuel tank, cargo bay, hull, cooling system |
| 50 | Ice9 canister |
| 51–53 | Old nuclear bombs: small, medium, large |
| 54 | Fuel cache |
| 55 | Inventory Sphere |
| 56–61 | Power weapons: laser cannon, nuclear fuel extractor, lava energy converter, sonic cannon, nanobots, Ice9 converter |
| 70 | Volcano cone (surface row) |
| 71, 72 | Hill edge, left and right (surface row) |
| 73 | Hill slope |
| 74 | Hill body |
| 75, 76 | Magma flowing down, up |
| 77, 78 | Magma flowing right, left |
| 79 | Magma |
| 80 | Open (sky, dug out, or a cave) |
| 81 | Volcanic ash |

- **Solid and open:** values below 75 are solid; 75 and above are open, so the pod can move through them. Values 32, 35 to 41 and 47 to 49 have names and prices but are never placed.
- **Style:** for solid tiles, one of six ground pictures (0 to 5) drawn behind the tile; for obsidian, its armour (5 when placed, section 8); for hill tiles a hill mark, for the volcano cone a volcano mark; for magma and flowing magma a magma mark. A tile with the magma mark is a magma cell: it burns the pod and is a source of magma flow, whatever its value.

### Generating a new world

In what follows, "random" is a fresh number from 0 up to 1, "random × N" such a number times N, x is the column and y the row. Every chance is tested with its own random number. Tiles are visited row by row within each step unless a step says otherwise, and later steps overwrite earlier ones.

1. **Difficulty:** sets the density n (1500 Easy, 1550 Normal, 1600 Hard), the money and score factors and the save count (section 9), and the first bonus step, 100 × the score factor.
2. **Base layer,** rows 0 to 99, every column. A value r = random × n is drawn, then:
   1. The first matching rule of the table below sets the tile. Each needs r strictly between its bounds and one or two tests on fresh random × y numbers; a "less than" test is made first and the "greater than" test only if it passed. Rules are tried in order, and every test of a rule is made until one fails, so each failing rule uses up the numbers drawn for it.
   2. If r is between 760 and 900, the tile becomes open.
   3. If the tile is still earth and y is over 40: granite if random × (14.7 − 0.117y) is below 1; then, if y is over 60, marble if random × (30 − 0.25y) is below 1. Where the multiplier is zero or negative the test always passes.
   4. Rows 0 to 4 are open.

| Tile | r between | Random × y test |
|---|---|---|
| Coal | 0 and 20 | less than 50 |
| Petroleum | 20 and 40 | less than 60 |
| Iron | 40 and 59 | less than 70 |
| Copper | 60 and 78 | less than 80 |
| Quartz | 80 and 98 | less than 100 |
| Lead | 100 and 118 | less than 100 |
| Bronze | 120 and 137 | less than 150, greater than 10 |
| Silver | 140 and 157 | less than 180, greater than 20 |
| Gold | 160 and 177 | less than 250, greater than 40 |
| Palladium | 180 and 196 | less than 300, greater than 70 |
| Cesium | 200 and 216 | less than 350, greater than 80 |
| Platinum | 220 and 236 | less than 280, greater than 90 |

3. **Row 5** becomes earth across the map, and rows 100 and 101 marble with random styles.
4. **Regions,** in this order. "Chance" is the chance per tile; where a result has shares, a second random number picks among them.

| Columns | Rows | Chance | Result |
|---|---|---|---|
| 100–149 | 20–99 | (−0.00016x² + 0.04x − 2.4)(0.0125y − 0.25) | quartz |
| 200–399 | 40–99 | (−0.00001x² + 0.006x − 0.8)(0.016y − 0.6) | cesium |
| 400–799 | 15–39 | 1.5(−0.0000075x² + 0.009x − 2.1)(0.016y + 0.36) | marble 30 %, granite 70 % |
| 400–599 | 40–99 | (−0.00002x² + 0.02x − 4.8)(0.01667y − 0.6667) | gold 60 %, platinum 40 % |
| 530–689 | 5 | always | magma flowing down (a strip of surface lava) |
| 1000–1999 | 60–99 (column by column) | 0.5(−0.00000024x² + 0.00072x − 0.44)(0.02y − 1) | gas |
| 1100–1399 | 60–99 | (−0.000003111x² + 0.007777x − 4.79)(0.01y) | a share drawn before the chance: below 0.3 opal, 0.6 topaz, 0.8 emerald, 0.9 saphire, otherwise unchanged |

5. **The magma lake:** columns 1000 to 1249 flow right from row 5 down to row ⌊3.62 ln(x − 999) + 5⌋, and columns 1250 to 1499 flow left from row 5 down to row ⌊3.62 ln(1501 − x) + 5⌋ (at most row 29). Columns 1249 to 1251 flow down from row 25 to the bottom: a lava fall.
6. **More regions:**

| Columns | Rows | Chance | Result |
|---|---|---|---|
| 1500–2099 | 10–99 (column by column) | (−0.000003333x² + 0.012x − 10.5)(0.005555y + 0.4444) | granite 60 %, marble 40 % |
| 1600–1999 | 60–99 (column by column) | (−0.00000125x² + 0.0045x − 4)(0.01667y − 0.6667) | diamond |

7. **Kimberlite pipes:** a count k = ⌊random × 15 + 8⌋ (8 to 22) and a divide ⌊random × k⌋ are drawn, then each pipe's column, 1600 + ⌊400 ÷ (k + 1)⌋ × (i + 1), plus random × 8 − 4 truncated toward zero (−3 to 3), for pipe i. Columns 1600, 1601, 1997 and 1998 flow down from row 5 to the bottom, with row 5 of columns 1599 and 1996 flowing right and of 1602 and 1999 flowing left. Each pipe then gets a depth ⌊random × 30 + 30⌋ (30 to 59) and flows down from row 5 to that depth. Finally each pipe's bottom row runs sideways: pipes before the divide flow left from the pipe until column 1601 or a downward flow, the others flow right until column 1999 or a downward flow.
8. **The middle regions** (all column by column):

| Columns | Rows | Chance | Result |
|---|---|---|---|
| 2000–2999 | 10–99 | 0.3(0.008889y + 0.1111) | marble 50 %, granite 20 %, lava rock 30 % |
| 2000–2999 | 60–99 | (0.00004x − 0.02)(0.0175y − 0.75) | gas |
| 2000–2999 | 50–99 | 0.05(0.014y − 0.4) | opal 30 %, topaz 20 %, emerald 15 %, saphire 20 %, ruby 5 %, diamond 5 %, amazonite 5 % |
| 2100–2899 | 60–94 | (−0.0000000625x² + 0.0003125x − 0.380625)(0.0125y − 0.25) | a mineral from gold to plutonium (⌊random × 14 + 9⌋), placed on that tile only, if any of 36 tests of 80 % passes |
| 2100–2799 | 55–99 | (−0.00000025x² + 0.001225x − 1.47)(0.01555y − 0.555) | thorium 50 %, uranium 30 %, plutonium 20 % |
| 2498–2501 | 50–101 | always | magma flowing down (a lava fall) |

9. **The lava pool:** for columns 2200 to 2799, with h = √(400 − 0.004444(x − 2500)²), rows 40 to 59 below ⌊60 − h⌋ and rows 60 to 79 above ⌊60 + h⌋ flow down: a disc centred on column 2500, row 60.
10. **Hills** from column 2020 to 2600, 2650 to 2800, 3640 to 3995 and 4020 to 4983 (below).
11. **The volcanic regions:**

| Columns | Rows | Chance | Result |
|---|---|---|---|
| 3000–3599 | 15–99 | 0.35(0.007y + 0.29) | granite 20 %, marble 50 %, unchanged 30 % |
| 3000–3599 | 6–59 | 0.3(1.07 − 0.012y) | magma 20 %, lava rock 80 % |
| 3000–3999 | 40–59 (column by column) | 0.1(0.01333y − 0.3333) | gas |
| 3000–3599 | 60–99 (column by column) | 0.03(0.02y − 1) | ruby 30 %, diamond 30 %, amazonite 20 %, moonstone 7 %, starstone 5 %, sunstone 4 %, kryptonite 3 %, dark matter 1 % |
| 3000–3599 | 70–99 (column by column) | 0.02(0.02y − 1) | uranium 60 %, plutonium 40 % |

12. **The magma chamber:** each column from 3050 to 3599 is magma from row ⌊0.000066667x² − 0.4433x + 767⌋ to row ⌊−0.000066667x² + 0.4433x − 667⌋.
13. **Volcanoes:** from column 3060, and then every ⌊random × 20 + 20⌋ columns while below 3580, a volcano: the cone on the surface row, magma above it on row 3, hill slope on rows 3 and 4 either side, and the column flowing down from row 5 to the bottom.
14. **The bomb fields,** columns 3600 to 3999:

| Rows | Chance | Result |
|---|---|---|
| 15–99 | 0.35(0.007y + 0.29) | granite 20 %, marble 50 %, unchanged 30 % |
| 6–59 | 0.3(1.07 − 0.012y) | magma 40 %, lava rock 60 % |
| 30–99 (column by column) | 0.15(−0.00000013333x² + 0.00098667x − 1.74)(0.0114y − 0.14) | small bomb 50 %, medium 30 %, large 20 % |

15. **Magma blobs:** ⌊random × 40 + 80⌋ (80 to 119) discs of magma, each centred at column 3600 + ⌊random × 400⌋ and row 20 + ⌊random × 80⌋ with radius 3 + ⌊random × 5⌋ (the centre moved up by twice the radius if it would reach past row 99), filling every tile within the radius.
16. **The east,** columns 4000 to 4999, generated afresh:
    1. The base layer again (step 2, each tile also given a random style), and row 5 earth.
    2. The hills from 3640 to 3995 and from 4020 to 4983 again; then rows 0 to 4 of columns 4024 to 4979 become earth: a mountain to dig through.
    3. These steps, each over all the east's columns:

       | Rows | Chance | Result |
       |---|---|---|
       | 6–99 (column by column) | 0.00421y + 0.078 | granite 25 %, marble 75 % |
       | 10–99 (column by column) | 0.05555 − 0.0005555y | gas |
       | 6–24 | 0.675 − 0.015y | magma 40 %, lava rock 60 % |
       | 45–99 | 0.5(0.0001818y − 0.00818) | uranium 60 %, plutonium 40 % |
       | 15–99 | 0.5(0.001176y + 0.0823) | obsidian |
       | 65–99 | 1.5(0.0002857y − 0.01857) | Ice9 canister |

    4. A magma chimney: in columns 4650 to 4849, rows 5 to 99, every tile with 0.02367y² − 2.462y + 4713.9 < x < −0.02367y² + 2.462y + 4736 is magma.
    5. Two masses of obsidian: in columns 4100 to 4299, rows 0 to 39, tiles with y < −0.004x² + 33.6x − 70520, each with chance −0.00005x² + 0.42x − 881; in columns 4400 to 4549, rows 60 to 99, tiles with y > 0.008x² − 71.6x + 160260, each with chance −0.00008x² + 0.716x − 1601.
    6. 500 short magma streams. Each draws a kind ⌊random × 3⌋ (0 down, 1 up, 2 right, and a 2 becomes 3, left, with a chance of a half), a length of 15 to 24, a column 4000 + ⌊random × 980⌋ and a row 1 + ⌊random × 99⌋. A stream starting above row 5 is skipped unless its column is between 4030 and 4945. A vertical stream that would reach row 100 starts its length higher, a horizontal one that would reach column 4999 its length further west. It covers length − 2 tiles from its start, down or right.
    7. The Alexxzandrite field: over the 40 by 40 tiles from column 4958, row 52 to column 4997, row 91, magma cells become marble (30 %), obsidian (20 %) or earth; then each tile within 20 tiles of column 4978, row 72 becomes Alexxzandrite with a chance of 20 %; every tile gets a random style.
17. **Inventory Spheres:** 30 to 44 of them, each at a random column and row 85 to 99, unless that tile is magma or flowing magma.
18. **Fuel caches:** 30 to 59, each at a random column and row 30 to 99, on the same condition.
19. **The five Mega parts,** in order engine, fuel tank, cargo bay, hull, cooling system, each at column 2000 + ⌊random × 1000⌋ and row 60 + ⌊random × 40⌋, drawn again while its column equals an earlier part's or its tile is open (the first part is never checked).
20. **The power weapons:** five, at column 3070 + ⌊random × 450⌋ and row 75 + ⌊random × 24⌋, drawn again (at rows 60 to 99) on the same conditions: the laser cannon, the nuclear fuel extractor, the lava energy converter, the Ice9 converter and the nanobots. The sonic cannon is never placed.
21. **Styles:** obsidian gets armour 5, every other solid tile a random ground style, and magma and flowing magma the magma mark.

Then the game starts: the cheat is applied (section 14), open tiles in rows 5 and 6 become earth, the columns where digging is not allowed are noted (below), the game gets an identity number (the seconds since 1970), the pod's weight is worked out and the transporter drop-in starts.

### Hills and volcanoes

- **A hill** from column a to column b: the left edge (71) at column a on row 4; slope tiles rising over the next three columns (a + 1 rows 3 and 4, a + 2 rows 2 to 4, a + 3 rows 0 to 4); the body (74) on rows 0 to 4 from a + 4 to b − 4; the mirrored slope from b − 3 to b − 1; and the right edge (72) at column b on row 4.
- Hills are solid from the sky down to the surface, so the pod can neither drive nor fly over them; it digs underneath. Digging down from the surface row is not allowed within two columns outside a hill's edge.
- **A volcano cone** (70) sits on the surface row with magma above it on row 3 and slope tiles on rows 3 and 4 either side.

### The view

- **Screen:** 16 columns by 12 rows of tiles from a frame column and row. Screen x of column c is 50 × (c − frame column), likewise for rows. The pod's screen position, when lined up on a tile, is x = 50 × (column − frame column) − 10 and y = 50 × (row − frame row + 1), the bottom of the tile.
- **Horizontal scroll:** the view jumps 3 columns right when the pod's screen x passes 600 going right (2 columns from frame column 4982, then 1 more from 4983 when driving or drilling; 4984 is the last), and 3 columns left when it falls below 100 going left (150 while gliding), or 2 from column 2 to 0.
- **Vertical scroll:** 3 rows up when the pod's screen y falls below 150 while flying, its row is over 2 and the frame row is over 2; 3 rows down when it passes 400 while falling or drilling down.
- **Placing the view** after a teleport or a load: frame column ⌊column ÷ 3⌋ × 3 − 3 (between 0 and 4984), frame row ⌊row ÷ 3⌋ × 3 − 6 (at least 0).
- **Every scroll** moves everything drawn in screen coordinates with it (the pod, labels, particles, rocks, meteors, the explosion and the bomb blasts), moves the backdrop (below), changes rocks coming into view (below), pops magma off screen (below), freezes magma in deep cold, lets magma flow, updates the background colour and redraws the field. A horizontal scroll also records the furthest column reached and updates the ash clouds; a vertical scroll starts or stops the surface wind sound (section 12).
- **Backdrop:** a horizontal scroll by d pixels moves the sky picture by d ÷ 5 (wrapping within 900 pixels), the background volcanoes by d ÷ 50 and the clouds by d ÷ 110, each division dropping the remainder, so a 100-pixel scroll does not move the clouds. Every scroll made while the pod's column is a multiple of 15 moves the far skyline one pixel.

### The bases

| Base | Column | Services |
|---|---|---|
| First | 0 | All four tabs |
| Second | 2603 | All four tabs |
| Abandoned | 4000 | Repairs (selling only dumps the cargo, nothing is refuelled or repaired; saving works) and High Scores |
| Last | 4990 | High Scores only; leaving it ends the game |

- **Entering:** the pod enters a standing base when its column is the base's column, its row is 4 and its depth 0, whether driving, falling or gliding.
- **The no-dig columns:** from one column west to three columns east of every base standing when the game was generated or loaded. The pod cannot dig down into them from the surface row, nor sideways into them on row 5. Every explosion puts earth back on row 5 of these columns, and of column 0.
- **Destruction:** the first base is destroyed by the transmission at column 3005, the second by the one at 3990; a destroyed base shows a ruin and cannot be entered. Dynamite set off on the surface row in a base's own column or the two east of it destroys that base; TNT destroys only the first base, used in columns up to 5 (section 15). When a game is loaded, a furthest column of 3005, 3990 or 4600 or more destroys the first, second or abandoned base, and the last base is gone if more than two days have passed since the transmission at column 3990.

### Transmissions

- **Trigger:** when the pod's column (rounded) reaches the next transmission's column, with no transmission open and the drop-in over, that transmission opens (section 4). The last one also needs the pod on or above the surface row. Closing it with Esc sets up the next. Power-weapon messages (section 8) use the same window without moving on to the next transmission.
- **Texts:** stored encrypted with the save cipher (section 13) and shown verbatim, spelling mistakes included, broken into lines in the window. Their content, by trigger column:

| Column | Content |
|---|---|
| 0 | Welcome to Crematoria: dig out minerals, watch the engine reading as the soil gets hard, do not spend more than 10 minutes on this run, and on leaving a base you can set the departure time. |
| 20 | The 8-hour day: up to 1000 degrees by day and −400 at night; set the time with the arrow keys; warmer soil is softer but limits time outside; engine and radiator upgrades widen the choice. |
| 40 | Silver, gold and platinum lie deeper in hard soil; head east for better minerals; the sun moves from west to east. |
| 70 | The Jet Glider (Shift; not over magma; it cannot pass obstacles; it takes engine power) and the teleporters: Teleporter 1 jumps about 5000 ft the way the pod faces on the surface, Teleporter 2 to the furthest point from the surface or to the base from underground. |
| 120 | A layer of quartz is close by. |
| 150 | Drilling can dislodge marble above the pod, and earthquakes cause rockfall; carry hull repairs and dynamite. |
| 300 | Acid showers, hypercane winds and mega lightning can destroy a ship that stays on the surface. |
| 500 | A permanent lake of magma ahead: fly over or dig under; it is hotter near flowing magma. |
| 1580 | Live kimberlite pipes (magma streams) ahead, where diamonds form. |
| 2000 | Parts of an ancient Superboring Machine are buried here and can be fitted to the pod. |
| 2300 | A fellow miner's warning: the surface melts when it is hot and refreezes later; carry explosives to blast back up. |
| 2800 | The same miner: mountains overhead, magma ahead, a long way to the base, and rumours of a forgotten base in the hills. |
| 3005 | The miner finds a motherload of power stones, then a strange glow from his cargo: dark matter, and an explosion. The first base is destroyed. |
| 3050 | Power weapons lie under a magma chamber nearby; beware of a meteor shower. |
| 3610 | The meteor shower may end the bases; find the 5 power weapons; nukes from an ancient war ahead give bomb fuel; carry the most gadgets possible. |
| 3990 | The last operating base: the others are abandoned or destroyed; an abandoned base above can shelter the pod but not refuel or repair it; the operator stays 2 more days; a field of a very valuable unknown mineral lies ahead; obsidian yields only to the laser and sometimes TNT. The second base is destroyed, and the day is noted for the last base's departure. |
| 4980 | The victory (section 4). |
| 5002 | Never reached. |

### Temperature

- **At the pod:** with h the hour of the day (hours + minutes ÷ 60 + (ticks mod 300) ÷ 19,000), x the pod's column and y its row (both with fractions), the temperature in degrees is (800 sin(0.83(h − x ÷ 5000) + 4.5) + 400)(1 − 0.007y) − 2y, truncated to a whole number, plus 100 while flowing magma is on screen. In a magma cell it rises by another 100, and digging lava rock adds 100 for that tick.
- **Range:** on the surface row from about −397 to 1,158. It is coldest around 0:15 and hottest around 4:00 at the west end, an hour later at the east end, and the cycle does not exactly fit the 8-hour day, so the temperature jumps at midnight. Deeper, the swing shrinks and it gets colder.
- **The departure-time dialog** shows the same formula for the base's column at the chosen time on the surface row; the pause screen shows it at the pod's column and at the last base visited.
- **What it drives:** overheating (above the radiator's limit), frost (below the heater limit), digging energy and drill wear, rain, magma popping and freezing, rocks changing, the ice bomb's duration, gas explosions and the background and sky colours.
- **Colours:** below 0 degrees (t), the ground background is (0.03t + 112, 0.075t + 130, 130 − 0.125t) and the sky (0.15t + 130, 0.15t + 130, 0.05t + 95); from 0 to 799 the ground is (0.11t + 112, 130 − 0.106t, 130 − 0.106t), from 800 (200, 45, 45), and the sky (0.079t + 130, 0.05t + 130, 0.029t + 95). Values are truncated. They are worked out on every scroll and teleport, every 100 ticks when the field is redrawn, every 80 ticks while flowing magma is on screen and on leaving a base.

### The day and the surface

- **The clock:** 300 ticks make a game minute, 60 minutes an hour and 8 hours a day. It runs only in the play update. A new game starts at day 0, 1:30.
- **Melting:** during hour 3, at every sixth minute (3:00, 3:06 and so on), a band of 500 columns starting at column 83.333 × minute, rounded, melts: wherever the surface row is open and row 5 is not flowing magma, row 5 becomes magma, and an open tile below it becomes earth. By 3:54 the whole surface has melted, west to east.
- **Refreezing:** during hour 5, at the same minutes, the same bands refreeze: row-5 magma under open sky becomes earth.
- **On leaving a base and on loading:** first every column with open sky on row 4 gets earth on row 5 (unless it is flowing magma) and on row 6 (if open); then, with m = 60 × hours + minutes + ⌊60 × column ÷ 5000⌋ for the pod's column, columns from ⌊column − (m − 180) × 5000 ÷ 60⌋ for 10,000 columns (both ends held between 0 and 5000) melt on row 5 under open sky.
- The field is redrawn after melting or freezing if the view shows the surface (frame row under 6).

### Magma

- **Flow:** each pass looks at every magma cell in the visible rows of the columns from 5 left of the view to 5 right of it, and turns open tiles to its left, right and directly below into magma cells. Passes repeat until nothing changes. If anything flowed and the temperature is below −300, the magma on screen freezes 5 ticks later (below). Magma never flows up.
- **Checking:** after every dig, explosion, scroll, teleport, laser hit, sonic cannon shot, nuclear blast and meteor crater, the game notes whether flowing magma (75 to 78) is on screen, lets magma flow if any magma cell or flowing magma is on screen, and starts or stops the lava sound.
- **Animation:** while flowing magma is on screen, every 8 ticks its animation steps (30 steps, then round again) and the field is redrawn.
- **Freezing:** 5 ticks after a flow in deep cold, magma (79) on screen turns to earth, except in the pod's own tile, unless the pod is between columns 3000 and 4400. On every scroll below −200 degrees west of column 3000, magma in the visible rows from 20 columns left of the view to 20 right of it turns to earth, except the pod's tile.
- **Popping:** on every scroll, except while the pod is between columns 3000 and 3600, a band off screen in the direction of the scroll is checked: 16 rows above the view (or below it, rows 16 to 30 from its top) across columns 1 to 14 of the view, or 16 columns beyond its side across rows 1 to 15. Normally a magma tile enclosed by solid tiles on all four sides opens with chance 0.714 − 0.0014 × temperature; above 500 degrees an enclosed open tile fills with magma instead, with chance 0.001 × temperature − 0.4.
- **Rocks changing:** on every scroll west of column 3000, in the 3 columns or rows at one side of the view, marble becomes lava rock with chance 0.0006667 × temperature − 0.1 above 300 degrees, and lava rock becomes marble with chance −0.002667 × temperature − 0.0667 below −100. For horizontal scrolls these are the columns just come into view; for vertical scrolls the rows at the far side (section 15).
- **Damage:** see section 8.

### Rockfall and earthquakes

- **Rockfall:** after each dig, the topmost marble on screen above the pod in its column falls with a chance of a fifth: it becomes earth and a rock drops from it at 9 pixels a tick.
- **Starting an earthquake:** every tile collected by drilling or by the sonic cannon (not by the tractor beam), and every stick of dynamite or TNT, starts one, if none is running and the pod is below row 15, with chance 0.01 ln(0.005x + 0.001) for the pod's column x: none west of column 200, 3.2 % at the east end. It notes whether any marble lies on screen between the pod's row and row 5; only then do rocks fall.
- **Off screen:** 500 swaps of a tile with its right-hand neighbour, each at a random column within 250 of the frame column and a random row from 45 to 94, skipped when the column is in view or at the map's last column or either tile is flowing magma. Styles swap too.
- **During the quake** (200 ticks): the screen shakes 5 pixels left and right, changing every 2 ticks. For the first 150 ticks, if there was marble, each tick has a 7 % chance of a rock dropping from the top of the screen at a random x, at 10 to 14 pixels a tick.
- **Rocks:** a rock that reaches the pod (within 75 pixels right of its screen x and between 50 above and 10 below its screen y) explodes and adds 30 damage (rockfall) or 80 (earthquake), unless the shield is on. Rocks vanish 50 pixels below the screen. At most 15 rocks exist at once.

### Explosives

- **Dynamite (Z):** needs a stick, no dig in progress and a row over 2. Plays its sound and its 20-frame, 150-pixel animation, fills every free particle slot, may start an earthquake, may destroy a base (above), and blasts 3 columns by 3 rows around the pod.
- **TNT (X):** the same with its 40-frame, 250-pixel animation and stronger particles, and 5 columns by 5 rows (fewer at the map's edges).
- **In a blast,** only rows 5 to 99 are touched, and hill tiles and flowing magma (75 to 78) are left alone. An Ice9 canister sets off an ice blast centred on it; a nuclear bomb sets off a nuclear blast centred on it, with radius 10, 14 or 20 tiles and 200, 500 or 1,500 damage to the pod. Marble survives dynamite and breaks under TNT; obsidian survives dynamite and breaks under TNT with a chance of a fifth. Every other tile, magma included, becomes open. Then the no-dig columns get their earth back, the nuclear fuel extractor and Ice9 converter work (section 8), magma flows and the field is redrawn.
- **Nuclear blast:** a translucent yellow disc that grows 15 pixels a tick; each tick it opens every tile on screen whose centre lies within its radius. After as many ticks as its radius in tiles, magma flows.
- **Ice blast** and the other bombs: see section 8.

### Teleporters

Using a teleporter (not while digging) uses it up, plays its sound and shows a sparkle for 20 ticks; then the jump is made. Teleporting clears particles, labels, the explosion and any earthquake, stops all sound effects, and redraws.

- **Teleporter 1 (Q):** works only on or above the surface row with the pod in an open tile. Facing east it aims at column + 500 + random × 50, rounded (5000 − ⌊random × 50⌋ if that is past the map); facing west, at column − 500 + random, truncated (a random column 0 to 49 if that is below 0). If the aim is past the map or row 2 there is not open, nothing happens. Otherwise the pod lands at row 2 of that column, standing, with the view placed around it; magma is checked and an ash storm starts (section 7).
- **Teleporter 2 (W):** below the surface, enters the last base visited and leaves the pod on its column on the surface row, if that base still stands (otherwise nothing happens). On or above the surface, drops the pod into the first open tile of the furthest column reached, from row 5 down (if there is none, the teleport does not happen and the Teleporter 2 is used up all the same).

## 7. Weather

Weather is worked out in the play update only while the view shows the surface (frame row under 6), and drawn only while the sky is in view (frame row under 4). It is the same across the whole map: it follows the pod rather than the place.

### Wind

- **Starting:** with no wind, each tick east of column 500 has a chance of 0.0005 of wind starting: a speed of 3 to 5 pixels, east or west with equal chance, rising, and a timer of 2,000 to 2,999 ticks.
- **Changing:** otherwise the timer counts down every tick (whether or not wind blows), and at 0 the wind stops rising. Each tick has a chance of 0.0005 of a speed step: a rising wind gains 1 in strength, up to 20; a falling wind loses 1, and drops to nothing once its strength is under 6.
- **Effect:** while the pod is hovering, falling or gliding on the surface rows (row 4 or above) with open tiles on both sides, the wind moves it by 0.3 × the speed (truncated) pixels a tick, and the view scrolls if needed.
- **Picture:** 30 grey dots, 2 pixels square, inside the stretch of open sky, drift sideways by the speed each tick (by at least 10 a tick; a slower wind blowing east is itself raised to 10 by this, section 15). A dot leaving one side comes back at the other. They are drawn only when it is not raining.

### Rain and lightning

- **Starting:** with no rain, each tick east of column 300 has a chance of 0.0003 of rain starting, if the temperature is above −120 and below 600: intensity 0, rising, for 1,000 to 1,499 ticks, with the rain sound looping.
- **Stopping:** the rain stops at once if the temperature leaves that range, with its sound.
- **Intensity:** while rising, the timer counts down and the rise ends at 0, at intensity 10, or by a chance of 0.001 a tick once over 5; each tick has a chance of 0.001 of a step up. While falling, each tick has a chance of 0.001 of a step down, and below 0 the rain ends, with any lightning, and its sound stops.
- **Acid:** while the pod is on the surface rows without the shield, each tick adds 0.004 × intensity + 0.005 to a store; when it reaches 1 the hull takes 1 damage and the store empties.
- **Picture:** grey-green lines (128, 168, 152) from the top of the screen down to the surface, slanted, spaced by about 30 − 2.4 × intensity pixels at random, across the stretch of open sky only, where no hill or mountain reaches the top row.
- **Lightning:** while raining, each tick with no bolt has a chance of 0.01 of thunder and a bolt at a random x on screen, lasting 12 ticks; a bolt that falls outside the open sky is cancelled at once, but its thunder still plays. While a bolt shows, a pod on the surface rows within 50 pixels of it:
  - with the Lightning Charger, while flying up, falling or gliding, gains 60 battery charge (up to the battery's capacity) once per bolt, and a spark shows on its antenna;
  - otherwise, unless the shield is on or an explosion is already showing, takes 70 damage and explodes.

### Volcanic ash

- **Starting and stopping:** each tick with no ash has a chance of 0.0002 of an ash storm; during one, each tick has a chance of 0.0001 of it ending, which clears the ash on screen. A successful Teleporter 1 jump also starts one.
- **Where:** columns in view that hold a volcano cone get ash on row 2, and columns with open sky on the surface row above flowing magma on row 5 (the surface lava strip and the magma lake) get ash on the surface row. While the storm lasts, every horizontal scroll does the same for the new view; with no storm, scrolls clear any ash in view.
- **Effect:** while the pod is on the surface rows in a column with ash on row 4 or row 2, without the shield: each tick a 30 % chance of 1 damage, a 2 % chance of losing hold of Up, Left and Right (they count as released until pressed again), and 0.02 more energy used.
- **Picture:** ash falling in those columns, scrolling with the magma animation.

### Meteors

- **When:** each tick a chance of 0.003, once the pod has been past column 3000 and is east of it, or has been past 3500 and is east of 1500.
- **Fall:** a meteor starts 50 pixels above the screen at a random x, with a speed of 20 to 29 pixels a tick in a direction up to 0.5 radians either side of straight down. Each tick (on every screen with play shown, even during a transmission) it moves. It is removed when it leaves the screen; when it is over a standing base (from one column west to three east, below row 1); and when it reaches any tile but open sky or ash (magma included), which, if its value is below 70 and it lies below the surface, it blasts open (a crater), letting magma flow if none is flowing on screen.
- **Hitting the pod:** within 15 pixels left, 65 right, 45 above and 15 below the pod's screen position, without the shield: 300 damage and an explosion.
- **Picture:** the meteorite turned to point along its path.

### Frost

- **Every 100 ticks**, if the temperature is below the heater limit (−100, lowered by Heating Units, section 9), the frost grows by 5 % of the temperature's size (up to 300); otherwise it melts by 0.04 × (temperature − limit) + 4, at most 20, down to 0.
- **At 250** the pod freezes: "SHIP FROZEN!" in blue, the frozen-pod picture, the Jet Glider off, Up, Left and Right released, standing.
- **Picture:** a frosted border as wide as the frost level on all four sides of the screen, with icicles along its inner edge. It is part of the field layer, so it changes when the field is redrawn.
- Leaving a base clears the frost.

## 8. The pod

### Position

- The pod's position is kept two ways: in tile units (column and row, with fractions; one pixel is 0.02 of a tile) and as its screen position. Movement changes both together. At the start of each play update the column and row are rounded to whole tiles: to the nearest, and also up and down, and the row rounded down after adding 0.01; each rule below uses its own rounding.
- A new game starts at column 5, row 4. After loading or leaving a base the pod stands on the surface row beside the base (section 4).

### The play update

The pod is always in one of five modes: standing (1), drilling sideways (2), flying (3), drilling down (4) or falling (5). Each tick on the play screen, with no transmission and no pause screen open, runs in this order:

1. **Clock:** one tick, and the surface melting or freezing on the minute (section 6).
2. **Checks:** the temperature is worked out (section 6). Above the radiator's limit it shows "OVERHEAT!". Fuel at or below 0 shows "FUEL TANK EMPTY!" if no message is showing. A bonus is paid if the score has passed the next step (section 9).
3. **Magma:** in a magma cell without the shield, the pod takes 10 damage and 100 degrees and explodes if no explosion is showing; it shows "OVERHEAT!" if then above the limit with no Ice9 left, and is wrecked if past the hull's limit.
4. **Transmission:** reaching the next transmission's column opens it (section 6, "Transmissions").
5. **Ice9:** while above 0 and the temperature above −100, the coolant falls by 0.00000454 × temperature + 0.000454, at least 0.001, plus 0.003 in a magma cell.
6. **Teleport:** the jump, 20 ticks after a teleporter was used (section 6).
7. **Ice blast's freeze** (section 6, "Magma"), and the **nanobots:** every 40 ticks, if found, 1 damage repaired.
8. **Dark matter:** carrying two or more pieces, each tick has a chance of 0.0001 of the cargo blowing up: the damage becomes the hull's limit plus 0 to 499, with an explosion.
9. **Weather** (section 7).
10. **Every 100 ticks:** the weight is worked out, frost grows or melts (section 7), and the field is redrawn if it was last redrawn 90 or more ticks before.
11. **Tractor beam:** with Ctrl held, the beam owned, the pod standing, at least 30 energy and no beam showing, an arrow pulls in the neighbouring tile in that direction (right, up, left or down, checked in that order; not past the map's sides). The tile is collected (below), the field redrawn, and 30 energy used. The beam shows for 20 ticks.
12. **Jet Glider,** **flying,** **driving,** **drilling** and **falling** (below).
13. **Energy:** the radiator's running cost (section 9) is added while no Ice9 is left and the temperature is above 50; each Heating Unit adds 0.005 below −10 degrees. The tick's energy use comes from the battery if it holds any charge, else from the fuel. The engine load is round(5500 × energy used this tick); above the engine's power it shows "ENGINE FAILURE!" if no message is showing. The display shows the load as a percentage of the power.
14. **Settling:** if the pod did not move up or down, Up is not held and no dig is running, it is lined up on its row and stands; if it is inside a solid tile it moves up one tile.
15. **Base:** entering a base (section 6).
16. **Earthquake** ticks (section 6) and the magma animation (section 6).

Every tick starts with an idle energy use of 0.0015, to which the steps add.

### Driving

- Right (which wins over Left) or Left, without Ctrl, while not drilling (a dig counts from the moment its key starts it, before its first tick) or gliding, moves the pod 5 pixels (0.1 tile) that way if the pod's tile and the tile it moves into are open and there is energy (fuel plus battery above 0). Holding the key turns the pod to face that way.
- It uses 0.000002 × (2000 + cargo + fuel) + 0.0015 energy a tick, or 0.000001 × (1300 + weight + cargo + fuel) + 0.0005 while Up is also held.

### Flying

- Up, without Ctrl, while not drilling or gliding, counts up a lift timer and uses 0.000005 × (1300 + weight + cargo + fuel) + 0.002 energy a tick.
- If the pod's tile and the tile at its feet are open, its row is above 0 and there is energy, it rises: the speed in pixels a tick is ⌊(v − 1) × lift timer ÷ 50⌋ + 1, at most 5, where v = round(7 − 0.04 × engine load percentage); in a magma cell it is exactly 4. The propeller sound starts. The pod is flying (mode 3). The wind may push it (section 7).
- Releasing Up resets the lift timer.

### Jet Glider

- Shift, with the Jet Glider bought, switches it on while the pod is on the surface row, with the jet sound; Shift again switches it off, rounding the pod to the nearest column.
- While it is on and there is energy, the pod glides the way it faces, speeding up by 0.1 pixels a tick each tick up to 12, using 0.000015 × (1300 + weight + cargo + fuel) + 0.01 energy a tick. The wind pushes it. When the view scrolls, the pod is lined up on its column.
- It stops at the edge of the map, and over surface magma (the pod then falls in). Meeting anything but open sky on the surface row stops it with a crash: an explosion and 10 damage, unless the shield is on.
- While gliding the pod cannot fly up, drive, dig or fall, and the propeller and tracks are replaced by the glider's flame.

### Drilling

- **Down:** if standing, not drilling, without Ctrl, with drill points left, not gliding, not charging the laser, and on row 4 to 98, the pod digs down unless:
  - the tile below is granite or marble and the drill has fewer than 200 points, or obsidian and fewer than 500, or obsidian without the sonic cannon;
  - it is on the surface rows in columns 0 to 3 or 4999;
  - it is on the surface row in a no-dig column (section 6), or within two columns outside a hill's edge.
  
  The pod is lined up on its column and the drill sound loops.
- **Sideways (Space):** if standing, not drilling, with drill points left, not gliding, not charging the laser and below the surface row. On row 5 it never digs into a no-dig column. The pod is lined up on its tile (pulled only halfway if it was 20 pixels or more off). If the tile in the facing direction exists and is solid, it digs, with the same exceptions for granite, marble and obsidian, and the drill sound loops.
- **A dig** lasts 50 ticks. Drilling down moves the pod 1 pixel down a tick (and scrolls the view at the bottom); drilling sideways moves it 1 pixel a tick towards the tile. Each tick throws a particle with a chance of 3 in 10. The energy use: the tick's use so far gains 0.01 − 0.00015 × temperature and is raised to at least 0.01, then the whole is multiplied by 1 + 0.03 × row. Cold, deep digging is costly.
- **On tick 45** the drill sound stops, the tile is collected (below) and opens, the score gains 1 point, magma flows, rock may fall (section 6) and the field is redrawn. On tick 50 the pod stands again. If the view scrolls down on tick 45 of a downward dig, the tile is not collected (section 15).

### Collecting a tile

When a tile's contents reach the pod (by drilling, the tractor beam or the sonic cannon):

- **Score:** the tile's value × the score factor ÷ 10 points.
- **Drill wear** (by drilling only): granite takes an extra max(100, 100 − 1.8 × temperature) points and marble max(250, 250 − 4.5 × temperature); then every tile takes max(1, (1 − 0.014 × temperature)(1 + 0.015 × row)). The drill never goes below 0; with 0 points it cannot dig, and its picture shows a broken drill.
- **Earthquake:** not by the tractor beam, the tile may start one (section 6).
- **Mega part:** installs the Mega upgrade of its category (section 9), owning every tier of it, adds 1,000,000 points and shows its name.
- **Power weapon** (not by the tractor beam): adds 1,000,000 points, shows its name, and opens a transmission window with its message (below); the pod stops digging.
- **Gas pocket:** explodes, adding 20 damage, unless the shield is on, or unless the Natural Gas Burner is fitted and the gas was drilled (not pulled by the beam or blasted by the sonic cannon) and a chance of 0.0008 × temperature − 0.16 (only above 200 degrees) does not set it off. When it does not explode it adds 50 battery charge and 100 points if the battery has room.
- **Lava rock:** without the lava energy converter or the shield, adds 100 damage, 100 degrees and an explosion. With either, if the battery has more than 80 room, it adds 80 charge, 80 points and 100 degrees.
- **Fuel cache** (not by the tractor beam): 100 to 299 litres of fuel, up to the tank's capacity, shown as "n L of fuel", and 1,000 points.
- **Inventory Sphere** (not by the tractor beam): its loot (section 9), shown in the panel for 100 ticks.
- **Anything with weight** plays the clank. If it fits in the cargo bay, its label rises and it is counted: minerals by kind, adding their weight and radiation; nuclear bombs by kind, adding their weight, bomb fuel (50, 100 or 300) and points (30,000, 100,000 or 250,000); an Ice9 canister adds 10 to the coolant, without weight, and sets the gauge's full mark to 10 more than the coolant carried (rounded up). Otherwise "Cargo Bay is Full" rises and nothing is taken. Either way, a tile pulled by the tractor beam becomes earth.
- **Converter:** with the converter switched on (key C, a light on the display; on at the start), the Coal Burner turns coal into 10 battery charge and the Petroleum Refinery petroleum into 20, if the battery has room, instead of keeping it. With the Nuclear Reactor, thorium, uranium and plutonium give 100, 150 and 250; with Nuclear Reactor X, which replaces it, 200, 300 and 500. A converted piece leaves the cargo with its weight and radiation.
- **Radiation:** carrying more than the Bio-X shielding's limit starts the radiation countdown (below).
- **Mission:** a mineral the mission wants is counted off, even if it did not fit in the cargo bay (section 10).

### Falling and landing

- The pod falls if the tile below its feet is open, Up is not held (or energy is below 0), no dig or sonic cannon shot is running, the pause screen is closed and it is not gliding. The fall speed grows by 0.05 a tick up to the terminal speed, ⌊0.00065 × (weight + cargo + fuel) + 8.7⌋, and is exactly 4 in a magma cell; the pod moves down by the speed, rounded, in pixels. The fall stops at once if the pod's own tile, rounded down, is solid below value 47. While falling it shows "OVERHEAT!" if above the radiator's limit with no Ice9 left, and the wind may push it.
- When a fall ends without Up held, a fall speed over 8 adds ⌊0.1 × speed² − 4⌋ damage and an explosion, unless the shield is on. The fall speed goes back to 7.

### Heat, Ice9 and freezing

- **Overheating:** above the radiator's limit the pod shows "OVERHEAT!" (section 6 gives the temperature). Higher radiator tiers allow more heat but cost more energy to run.
- **Ice9** is coolant collected from canisters. While any is left, the radiator costs no energy, and in a magma cell or while falling it prevents "OVERHEAT!"; the check at the start of each tick ignores it (section 15). A gauge at the right of the screen shows it.
- **Freezing:** see Frost (section 7). Heating Units lower the limit at which frost builds.

### Damage

- **Damage** adds up; the hull's capacity is the limit. Passing it shows "SHIP DAMAGED!", and the wrecked pod is drawn where it was hit and stays there.
- **Sources:** magma 10 a tick; rockfall 30 and earthquake rocks 80; landing; gas 20; lava rock 100; acid rain; ash; lightning 70; meteors 300; a glider crash 10; nuclear blasts 200, 500 or 1,500; dark matter.
- **The shield** (key V, 200 ticks) blocks all of these except nuclear blasts and dark matter.
- **Repairs:** at a base (section 9), the hull repair gadget (250 damage), and the nanobots (1 every 40 ticks).

### Radiation

- When the radiation carried passes the Bio-X shielding's limit, a countdown starts: a green tint over the screen grows from clear to solid over 255 ticks, and then "RADIATION EXPOSURE" ends the game. A radiation symbol floats over the pod while the radiation is over the limit.
- Only entering a base stops the countdown; selling the cargo then clears the radiation.

### Gadgets

Each needs at least one carried. Energy costs come from the battery if it holds enough, otherwise from what it holds and the rest from the fuel.

| Key | Gadget | Use |
|---|---|---|
| Z | Dynamite | Blasts 3 by 3 tiles (section 6). Not while digging, nor on rows 0 to 2. |
| X | TNT | Blasts 5 by 5 tiles, breaking marble and sometimes obsidian. Same conditions. |
| A | Hull Repair | Repairs 250 damage, if damaged. Not while digging. |
| S | Drill Repair | Restores the drill to full, if not full. Not while digging. |
| Q | Teleporter 1 | Jumps about 500 columns along the surface (section 6). Not while digging. |
| W | Teleporter 2 | To the last base from below ground; to the furthest column from the surface (section 6). Not while digging. |
| T | Matter Transmitter | Sends cargo to the last base visited, if it is the first or second base and still stands: minerals in the order of the mineral table (section 9), as many pieces as fit in 500 lbs, are taken out of the cargo, with their radiation, for their plain value in money (the difficulty's money factor is not applied). A label reports "n lbs worth n$" and "transmitted to the base". |
| 1 | Sonic Bomb | Costs 70 energy. A grey ring grows from just right of and above the pod, 20 pixels a tick, for (15 − 0.06 × row) ticks; each tick, granite and marble on screen turn to earth wherever a point 15 pixels up and left of the tile's corner lies within the ring's radius of the pod's current position. |
| 2 | Ice Bomb | Costs 100 energy. A cyan ring grows from the same place, 15 pixels a tick, for 15 ticks, or (15 − 0.01 × temperature) if fewer; each tick, magma on screen turns to earth and lava rock to marble wherever the tile's top-left corner lies within its radius of the ring's centre. The pod's own tile stays magma if it was. Then the Ice9 converter works. |
| 3 | Radiation Bomb | Costs 150 energy. A translucent green disc grows for 30 ticks, 12 pixels a tick; then tiles on screen whose top-left corner lies within 360 pixels of its centre may change (table below). |
| V | Shield | 200 ticks of protection, shown round the pod with the ticks left; it drains 0.05 energy a tick, from the battery while it holds more than 0.05, else from the fuel. |

A bomb cannot be set off while the same kind is still growing.

| Before | After | Chance |
|---|---|---|
| Earth | Iron | 50 % |
| Coal | Diamond | 5 % |
| Copper | Emerald | 15 % |
| Quartz | Topaz | 25 % |
| Lead | Palladium | 50 % |
| Palladium | Thorium | 20 % |
| Cesium | Uranium | 15 % |
| Topaz | Diamond | 50 % |
| Emerald | Kryptonite | 12 % |
| Ruby | Sunstone | 15 % |
| Diamond | Starstone | 30 % |
| Plutonium | Dark matter | 22 % |
| Granite | Quartz | 40 % |
| Marble | Topaz | 30 % |
| Lava rock | Granite | 50 % |
| Flowing magma | Earth | 60 % |

The burners, reactors, Heating Units and Lightning Charger work by themselves once bought (this section and section 9).

### Power weapons

Five power weapons lie under the magma chamber between columns 3070 and 3519 (section 6). Finding one opens a transmission window with its message, verbatim:

| Weapon | Message | Effect |
|---|---|---|
| Laser cannon | "You have found the laser cannon. Press 'D' to start charging the laser; release the key when  it's at the desired power level. Warning: the laser takes a lot of energy to use." | Below. |
| Nuclear fuel extractor | "You have found bomb fuel extractor. It can extract bomb fuel from any bomb you find and use it as dynamite or TNT." | Whenever a bomb or Ice9 canister is collected, an explosion goes off or an ice bomb is used, it turns bomb fuel into TNT (150 each, while fewer than 30 are carried, taking 30 lbs of cargo) and then dynamite (30 each, while fewer than 50, taking 6 lbs). The display then shows the bomb fuel in place of the engine load's number. |
| Lava energy converter | "You have found lava energy converter. You can use it to convert heat from lava into energy that goes into your battery by drilling through the lava. It also protects you from the damage from lava." | Lava rock gives energy instead of damage. |
| Sonic cannon | "You have found sonic cannon. With it you can blast the hardest rock in four directions around you." (never placed) | Replaces the drill: each dig key at once collects and opens the neighbouring tile (not obsidian) without wearing the drill, throws up to 8 particles, costs 30 energy, plays its boom and may drop a rock; its beam shows for 20 ticks. |
| Nanobots | "You have found self-replicating nanobots. They slowly repair your ship when it is damaged." | 1 damage repaired every 40 ticks. |
| Ice9 converter | "You have found ice9 converter. You can use it to convert 3 lbs. of ice9 into an ice bomb." | At the same moments as the extractor, turns 30 Ice9 into an ice bomb while fewer than 20 are carried. |

- With all five that can be found, the display's top changes to a second picture, and its engine-load gauge shows the bomb fuel, full at 40,000.
- **Laser cannon:** holding D while standing, outside a base, charges it, up to 50; releasing D fires it. Each tick while it holds a charge it uses 1 energy, 2 after D is released, from the battery while it holds any, else from the fuel (with neither, nothing happens that tick). A magenta bar at the top of the screen shows the charge. While firing, the charge counts down and a cyan beam runs from the pod in the facing direction to the first solid tile, up to 8 columns past the screen's edge, or off the screen on the surface rows, where it does nothing. Every 8th step below the surface, the tile it reaches breaks without being collected, throwing particles: obsidian loses a point of armour instead while it has any, and a nuclear bomb sets off a nuclear blast. Moving cancels the charge, and digging is not possible while the laser holds one.

### Death

The game ends after a fatal message (section 4):

| Message | Cause |
|---|---|
| OVERHEAT! | Temperature above the radiator's limit. |
| FUEL TANK EMPTY! | Fuel at or below 0. |
| ENGINE FAILURE! | Engine load above the engine's power. |
| SHIP DAMAGED! | Damage past the hull's limit. |
| SHIP FROZEN! | Frost at 250. |
| RADIATION EXPOSURE | The radiation countdown ran out. |
| Save file has been modified! Game session terminated. | A loaded save's checksum did not match (section 13). |

## 9. Economy

### Difficulty

| Level | Map density | Money factor | Score factor | Save count | First bonus step |
|---|---|---|---|---|---|
| Easy | 1500 | 15 | 5 | 50 | 500 |
| Normal | 1550 | 12 | 7 | 30 | 700 |
| Hard | 1600 | 10 | 10 | 20 | 1,000 |

Sale prices are value × count × money factor ÷ 10 for each kind, and points value × score factor ÷ 10 per piece, with the remainder dropped. The save count is the number of saves the game starts with (section 13).

### Minerals

| Value | Mineral | Price ($) | Weight (lb) | Radiation | Glows |
|---|---|---|---|---|---|
| 1 | Coal | 15 | 40 | 0 | |
| 2 | Petroleum | 40 | 50 | 0 | |
| 3 | Iron | 30 | 30 | 0 | |
| 4 | Copper | 50 | 25 | 0 | |
| 5 | Quartz | 75 | 15 | 0 | |
| 6 | Lead | 90 | 80 | 8 | yes |
| 7 | Bronze | 120 | 30 | 0 | |
| 8 | Silver | 250 | 30 | 3 | yes |
| 9 | Gold | 750 | 30 | 5 | yes |
| 10 | Palladium | 1,000 | 25 | 30 | yes |
| 11 | Cesium | 1,250 | 20 | 25 | yes |
| 12 | Platinum | 1,500 | 35 | 30 | yes |
| 13 | Opal | 2,500 | 5 | 0 | |
| 14 | Topaz | 3,000 | 5 | 0 | |
| 15 | Emerald | 4,000 | 5 | 0 | |
| 16 | Saphire | 5,000 | 5 | 0 | |
| 17 | Ruby | 7,500 | 5 | 0 | |
| 18 | Diamond | 12,000 | 5 | 0 | |
| 19 | Amazonite | 20,000 | 5 | 0 | |
| 20 | Thorium | 25,000 | 35 | 100 | yes |
| 21 | Uranium | 30,000 | 30 | 200 | yes |
| 22 | Plutonium | 50,000 | 25 | 500 | yes |
| 23 | Moonstone | 100,000 | 1 | 300 | yes |
| 24 | Starstone | 200,000 | 1 | 1,000 | yes |
| 25 | Sunstone | 300,000 | 1 | 2,000 | yes |
| 26 | Kryptonite | 500,000 | 1 | 5,000 | yes |
| 27 | Dark Matter | 1,000,000 | 1 (shown as oz) | 10,000 | |
| 34 | Alexxzandrite | 4,000,000 | 4 | 0 | |
| 50 | Ice9 | 0 | 10 (not carried) | 0 | |
| 51–53 | Bomb1, Bomb2, Bomb3 | 0 | 10, 20, 60 | 0 | |

- Earth, gas, granite, marble, lava rock, obsidian, the Mega parts, fuel caches, Inventory Spheres, power weapons and magma have no weight and are not carried.
- Glowing minerals are drawn larger, centred on their tile, after the other tiles.
- Bombs are carried as bomb fuel, not as minerals: they cannot be sold, and their weight stays in the cargo (a fifth of the bomb fuel) when the cargo is sold or dumped.
### Bases and services

The four bases are listed in section 6. The repairs tab at the first two bases:

| Row | Action |
|---|---|
| Update All | Sell cargo, refill fuel, fix hull, fix drill, in that order. |
| Save Game | Uses up one save and saves under the game's name (section 13), and shows "Game Saved" once the save is stored. Does nothing with no saves left, or if saving was disabled by a modified save. |
| Sell Cargo | Adds the cargo's sale value to the money, empties the minerals and the radiation, and leaves only the bomb fuel's weight. |
| Refill Fuel | Costs 2.5 per litre missing, rounded. Without enough money, all the money buys 2 litres per $5 (whole litres). |
| Fix Drill | Costs 3 per point missing, rounded. Without enough money, all the money buys a point per $3. |
| Fix Hull | Costs 20 per point of damage. Without enough money, all the money repairs a point per $20. |

- The shown cost of all repairs is 2.5 × fuel missing + 3 × drill missing + 20 × damage, rounded, and the cargo's value is shown beside it; both are updated after every action.
- At the abandoned base, Update All and Sell Cargo dump the cargo for nothing, the fuel, drill and hull rows do nothing, and Save Game works.

### Upgrades

Each category has seven tiers; the first, the stock part, is fitted and owned at the start. Buying a tier owns it and every lower tier.

| Category (unit) | Stock | Tier 2 | Tier 3 | Tier 4 | Tier 5 | Tier 6 | Tier 7 |
|---|---|---|---|---|---|---|---|
| Engine (HP) | 150 | Small 250, $500 | Medium 400, $2,000 | 4-cylinder 600, $10,000 | 6-cylinder 750, $30,000 | 12-cylinder 1,000, $200,000 | Turbo-X 1,500, $1,500,000 |
| Fuel Tank (L) | 50 | Small 100, $300 | Medium 200, $1,000 | Large 500, $4,000 | Extra Large 1,000, $60,000 | Gigantic 2,000, $500,000 | Super 3,000, $3,000,000 |
| Cargo Bay (lbs.) | 500 | Small 1,000, $1,000 | Medium 2,000, $3,000 | 2-Chamber 3,000, $10,000 | 4-Chamber 4,000, $40,000 | Large 5,000, $200,000 | Gigantic 6,000, $1,000,000 |
| Radiator (F) | 100 | Small 200, $2,000 | 2-Turbine 300, $6,000 | 3-Turbine 400, $30,000 | Eon 500, $80,000 | Freon 600, $500,000 | Liquid Nitrogen 800, $4,000,000 |
| Hull (Hits) | 5 | Bronze 10, $400 | Steel 30, $2,000 | Tungsten 100, $7,000 | Diamond-Coated 250, $15,000 | Kryptonite 600, $50,000 | Energy-Shielded 1,200, $200,000 |
| Bio-X Shielding (Rx) | 20 | Iron-Coated 50, $1,000 | 1'' Lead 200, $5,000 | 3'' Lead 500, $20,000 | 5'' Lead 2,000, $100,000 | Energy Deflector 10,000, $500,000 | Super Shield 60,000, $3,000,000 |
| Drill (DL) | 100 | Steel 200, $2,000 | Carbide 500, $8,000 | Tungsten 1,000, $50,000 | Ruby 2,000, $250,000 | Diamond 5,000, $1,000,000 | NanoTube 10,000, $7,500,000 |
| Battery (MW) | 50 | Small 100, $400 | Lithium-1 400, $1,000 | Lithium-2 1,000, $10,000 | Cadmium 2,000, $50,000 | Hydrogen Cell 6,000, $1,000,000 | Kryptonite 10,000, $10,000,000 |

- The stock part's name is "Stock", and it costs nothing.
- **Buying:** with enough money, an unowned tier sets the category's capacity to the tier's amount. A fuel tank fills up, a hull is fully repaired, a drill is restored to full, and the pod's hull or drill pictures change. Without enough money, the "not enough cash" pop-up appears. An owned tier does nothing.
- **Radiator running cost** per tick, by tier: 0.001, 0.002, 0.003, 0.006, 0.01, 0.02, 0.03; the Mega cooling system 0.06.
- **Mega parts** (from the Superboring Machine, section 8): engine 3,000 HP, fuel tank 6,000 L (not filled), cargo bay 15,000 lbs, hull 2,000 hits (with its own picture), cooling system 1,200 F. Each owns its whole category; the pause screen names them "Mega".

### Gadgets

| Row | Gadget | Price | Most | Weight (lb each) | Use |
|---|---|---|---|---|---|
| 1 | Teleporter 1 | $20,000 | no limit | 5 | Q |
| 2 | Teleporter 2 | $100,000 | no limit | 5 | W |
| 3 | Dynamite | $2,000 | 50 | 10 | Z |
| 4 | TNT | $10,000 | 30 | 15 | X |
| 5 | Shield | $10,000 | 20 | 5 | V |
| 6 | Hull Repair | $20,000 | 20 | 5 | A |
| 7 | Drill Repair | $100,000 | 20 | 5 | S |
| 8 | Sonic Bomb | $30,000 | 20 | 5 | 1 |
| 9 | Ice Bomb | $50,000 | 20 | 5 | 2 |
| 10 | Radiation Bomb | $75,000 | 20 | 3 | 3 |
| 11 | Coal Burner | $1,000 | 1 | 70 | coal to battery |
| 12 | Petroleum Refinery | $5,000 | 1 | 120 | petroleum to battery |
| 13 | Natural Gas Burner | $50,000 | 1 | 100 | gas to battery |
| 14 | Nuclear Reactor | $200,000 | 1 | 200 | radioactive metals to battery |
| 15 | Nuclear Reactor X | $1,000,000 | 1 | 300 | twice the reactor's yield |
| 16 | Jet Glider | $5,000 | 1 | 250 | Shift |
| 17 | Tractor Beam | $150,000 | 1 | 175 | Ctrl + arrow |
| 18 | Heating Unit | $50,000 | 5 | 200 | lowers the frost limit to −150, −225, −300, −375 and −425 for 1 to 5 units, at 0.005 energy a tick each below −10 degrees |
| 19 | Matter Transmitter | $10,000 | no limit | 5 | T |
| 20 | Lightning Charger | $60,000 | 1 | 10 | lightning to battery |

- Without enough money, the "not enough cash" pop-up appears; past the limit, "limit reached". Limits apply only to buying: loot can carry more.
- **Weight:** the pod weighs 8 lb plus the weight of each fitted upgrade tier and each gadget carried. By tier from stock up: engine 75, 100, 150, 200, 250, 350, 500; fuel tank 10, 15, 20, 30, 50, 75, 100; cargo bay 100, 150, 250, 350, 500, 600, 700; radiator 20, 30, 50, 70, 100, 110, 120; hull 120, 150, 170, 200, 220, 300, 500; Bio-X 15, 20, 30, 70, 120, 150, 250; drill 30, 50, 80, 100, 110, 120, 150; battery 25, 30, 50, 75, 100, 100, 120; the Mega engine 700, fuel tank 200, cargo bay 1,000, cooling system 175 and hull 1,000. The weight is worked out every 100 ticks, after upgrades, on fuel caches and when a game starts or loads; it sets the terminal fall speed and the energy for flying and gliding.

### Inventory Spheres

An Inventory Sphere's loot, listed under "Inventory Sphere" in its panel:

1. Three to seven tries at a mineral: a random kind from coal to amazonite and 2 to 6 pieces. If they fit in the cargo bay and their radiation would keep the total within the shielding's limit (or, with a chance of 3 %, anyway), they are loaded, with their weight, radiation and points, as "n Name, w lbs.". If the radiation then passes the limit, the countdown starts.
2. With a chance of 70 %, money: (random + 1) × 2 × (19.9 × column + 500), shown as "+$n".
3. With a chance of 0.0001 × column, one of ten gadget gifts, equally likely: 1 or 2 Shields, 2 to 4 Dynamites, 1 or 2 TNT, 1 or 2 Teleporter 1, 2 Teleporter 2, 2 Hull repairs, or 1 each of Drill repair, Sonic bomb, Ice bomb or Radiation bomb.
4. Always "+1 Save", which adds a save, and 1,000 points.

The sphere's tile becomes earth.

### Score and bonuses

- **Points** come from collecting (section 8): each tile's value × score factor ÷ 10, 1 per tile dug, 1,000,000 per Mega part and per power weapon, 30,000, 100,000 or 250,000 per bomb, 1,000 per fuel cache and per Inventory Sphere, 100 per gas pocket burned, 80 per lava rock converted, and the minerals from spheres. The victory adds the money and time bonuses (section 4).
- **Bonuses:** while the score is below 1,000,000,000, when it passes the next step the money gains a tenth of the step, the bonus label shows "Bonus - $n" and the next step is set. The steps are 100, 500, 2,000, 10,000, 100,000, 300,000, 1,000,000, 2,500,000, 10,000,000, 20,000,000 and 200,000,000, each times the score factor. The last step is never paid, as it lies at or beyond 1,000,000,000.
- **Clock on the display:** days, hours and minutes of the game clock (section 6).
- **Number format:** money, score and prices are shown with commas every three digits. Money and score never wrap round.

## 10. Missions

- **Offer:** on leaving the first or second base, if the cargo sold during that visit was worth at least $200 (the cargo's value on arrival less its value on leaving) and no mission is active, a mission is offered with a chance of 1 in 5. A message box titled "Mission" shows its text; play goes on behind it.
- **Text:** "Collect the following minerals and get", "$n bonus.", then one line per mineral with the number still wanted (never below 0) and its name. The menu's Mission item shows the same text while the mission is active.
- **Tracking:** each mineral of a wanted kind that reaches the pod (by drilling, the tractor beam or the sonic cannon, not from an Inventory Sphere) counts one off, even if it did not fit in the cargo bay. A box at the bottom right of the display shows a picture of each mineral still wanted. Clicking the box's close button cancels the mission.
- **Settling:** on entering any base, if every wanted count has reached 0, the bonus is added to the money and a blocking message box titled "Mission" says "Mission Complete!" and "Bonus: $n", with "+1 Save" half the time, which adds a save. Complete or not, the mission ends there.
- **What is asked:** by the furthest column reached, a number of different mineral kinds, each wanted in a number of pieces:

| Furthest column | Kinds | From | Pieces of each |
|---|---|---|---|
| below 100 | 3 to 5 | coal to lead | 1 or 2 |
| 100 to 149 | 2 to 5 | coal to lead | 1 to 4 |
| | or, half the time, quartz only | | 12 to 19 |
| 150 to 199 | 3 to 6 | coal to silver | 2 to 4 |
| 200 to 399 | 3 to 7 | petroleum to gold | 2 to 5 |
| | or, 60 % of the time, cesium only | | 15 to 24 |
| 400 to 999 | 4 to 9 | iron to platinum | 3 to 9 |
| | or, 60 % of the time, gold and platinum | | 15 to 24 |
| | or else, 20 % of the time, cesium only | | 10 to 14 |
| 1000 to 1499 | 4 to 9 | bronze to saphire | 3 to 7 |
| | or, 40 % of the time, 4 kinds | bronze to saphire | 8 to 14 |
| 1500 to 1999 | diamond only | | 25 to 39 |
| 2000 to 2999 | 3 to 9 | opal to plutonium | 8 to 14 |
| 3000 to 3599 | 3 or 4 | moonstone to dark matter | 1 to 3 |
| 3600 and beyond | 3 to 5 | coal to lead | 1 or 2 |

  Each kind is drawn at random from the range; a kind already on the list is drawn again from the range without its last kind (section 15). The piece counts are drawn uniformly.
- **Bonus:** 3 × the sum of pieces × price over the list, rounded down to whole hundreds, or $500 if three times the sum is below 500.

## 11. Graphics

All positions are in the 800×600 game picture, x to the right and y down; text is drawn left-aligned at its baseline. The canvas is never cleared between frames, as the original never cleared its frame: the strip that the earthquake shake uncovers, and the top row of the start page (drawn from y 1), keep what the previous frame left there.

### The field layer

The tiles, sky and backdrop are drawn into a separate 800×600 picture, the field layer, only when the game asks for it (a redraw): after digs, scrolls, explosions, blasts, teleports, melting and freezing, the magma animation, and every 100 ticks if 90 have passed since the last. Every play frame starts by copying it. In order:

1. The background colour (section 6) over the whole picture.
2. While the frame row is under 4 (the sky in view), with the sky shifted down by 50 pixels per frame row: the sky colour from the top down to y 250; the far skyline picture at y 115; the 20 background volcanoes (one of three pictures, at their own width and 150 pixels tall) at y 100; the sky picture twice, 900 pixels apart, at y 100; each base whose column is on screen, standing or ruined, 60 pixels left of its column at y 150; the 30 clouds, each as wide as its size and half as tall; falling ash in columns with ash; and a strip of rough ground on top of every column whose row 5 is solid.
3. Every visible tile (rows past the bottom of the map show bedrock: marble, or a lava fall where row 101 flows down):
   - solid tiles: the ground picture of its style;
   - then, for values 1 to 79 that do not glow, the tile's picture; hill slopes draw nothing (the hill picture covers them) and the hill body draws the ground picture 0; flowing magma draws a 50-pixel window of a 150-pixel magma strip, vertical for 75 and 76 and horizontal for 77 and 78, moving 5 pixels per animation step down, up, right or left;
   - open tiles from row 1 down: rim pieces wherever a solid tile (value below 70) is next to it: vertical and horizontal edges, outer corners and inner corners, with the map's sides treated as walls.
4. Glowing minerals, 25 pixels up and left of their tile, as larger glowing pictures.
5. While the sky is in view, from 6 columns left to 6 columns right of the screen: volcano cones (93 pixels left of the column, 61 above the surface row), left hill edges (the hill picture, 70 left and 200 up) and right hill edges (the same picture mirrored, 150 left and 200 up).
6. The frost border (section 7).

### Drawing a play frame

1. The field layer; during an earthquake shifted 5 pixels left or right, swapping every 2 ticks.
2. Falling rocks, centred on their position.
3. Meteors, turned to their path.
4. The floating label (red, Arial bold 11, two lines 20 and 8 pixels above its point) and the bonus label (Arial bold 20 at x 250, y 250, flashing red and green).
5. Particles: earth, granite or marble chips, 10 to 20 pixels square.
6. The explosion: one frame a tick from an animation strip: the pod's explosion (32 frames of 64 pixels), dynamite (20 of 150), TNT (40 of 250).
7. The tractor beam (a horizontal or vertical beam picture beside the pod).
8. The pod (below).
9. The transporter, during the drop-in and pick-up.
10. While the sky is in view: rain, the lightning bolt (its picture 100 pixels left of its x), and the wind dots.
11. The shield round the pod, with its ticks left in pink (255, 130, 160).
12. The blasts: the sonic ring (18 segments between radius 20t and 20(t − 1), grey-yellow (150, 150, 100), half transparent), the ice ring (between 15t and 15(t − 2), cyan, solid), the radiation disc (radius 12t, pale green (150, 255, 150), half transparent) and the nuclear disc (radius 15t, yellow (255, 255, 70), half transparent).
13. The heads-up display (below).
14. The teleport sparkle: one 60×100 frame every 2 ticks, from the Teleporter 1 or Teleporter 2 strip, over the pod.
15. The Inventory Sphere panel: its window at (200, 200) with the list in black Arial bold 11 from (210, 220), 12 pixels a line.
16. The radiation tint: green over the whole screen, from clear to solid over 255 ticks.
17. The laser: the charge bar, magenta (200, 0, 200), 4 pixels wide per charge step and 20 tall at (300, 10); the beam, cyan (66, 255, 235), 6 pixels tall, 20 above the pod's foot.
18. A fatal message, centred, Arial bold 20, red or blue, at y 300.
19. The column number at (758, 20) and the score at (10, 20), black Century bold 16.
20. A transmission window, when one is open.

Then, on every screen but the pause screen, a pop-up over a half-transparent dark grey (70, 70, 70) cover, its picture at (166, 200); "Game Saved" adds the saves left at (431, 336) in Arial bold 20, colour (127, 107, 100).

Things that move smoothly are drawn between their positions at the last two ticks (section 3): the pod, particles, rocks, meteors, the rising label, the transporter and the wind dots. Nothing is interpolated across a scroll, a screen change or the pause screen, or for a move longer than 30 pixels in a tick (40 for particles and wind dots, 60 for meteors, 10 for the label and the transporter).

### The pod

- **Pictures:** a body by drill tier (a drill head facing the way it faces, or pointing down while drilling down, with three frames cycling every tick of a dig), tracks underneath while on the ground, and a hull overlay by hull tier with a small offset per tier. The pictures for one direction are those of the other mirrored, except the propeller's (section 15).
- **Flying and falling** show a three-frame propeller, changing every tick while the lift timer counts. The Jet Glider shows its flame behind the pod instead. With the Lightning Charger, an antenna shows while flying or falling, with a spark during a strike.
- **Other states:** a pod with no drill points shows a broken drill; at full engine load (over 92 %) the hull shakes by a pixel every tick; with the laser cannon held, the cannon replaces the drill; a frozen pod is a single iced picture; a wrecked pod is a single picture where it was wrecked. A radiation symbol floats above the pod while the radiation is over the limit. The pod is hidden during the first 100 ticks of the drop-in and after the first 100 of the pick-up.

### Heads-up display

The display is a picture along the bottom (from y 490) with gauges drawn as red bars rising from y 574, up to 49 pixels tall, then the display's frame picture over them, then numbers. The frame changes to a second picture once all five power weapons are found.

| Gauge | Bar x, width | Number at x (y 597) |
|---|---|---|
| Battery | 161, 67 | 168 |
| Fuel | 236, 47 | 239 |
| Drill | 289, 52 | 294 |
| Temperature | 351, 20 (52 tall, from y 575) | 346 |
| Cargo | 381, 52 | 388 |
| Radiation (% of the limit) | 443, 61 | 452 |
| Engine load (%), or bomb fuel | 514, 63 | 524 |
| Damage | 587, 52 | 589 |

- Numbers are black Commerce SF bold 15. The temperature bar is red above 0, scaled to the radiator's limit, and blue below 0, scaled to the frost limit; past either limit it is full. The radiation and damage bars stop at full. With the extractor found the engine number shows the bomb fuel; with all five weapons the engine bar shows the bomb fuel out of 40,000.
- Money at (41, 559) and depth at (73, 589), in dark brown (44, 16, 6); days, hours and minutes (two digits) at x 692, 729 and 756, y 590.
- The converter light (green on, black off) at (655, 529).
- While Ice9 is carried: a black outline 22×102 at (759, 399) with a blue bar filling it in proportion to the coolant against its full mark, "Ice9" at (750, 390) and the amount in whole units at (750, 520).
- The gadget button at (10, 25); while the panel is open, the lit button, the panel picture at (0, 60) and, on the highlighted row, a highlight at y 72 + ⌊100i ÷ 3⌋ with the gadget's name in orange (255, 200, 0), Century bold 16.
- With a mission, the mission box at (512, 450) with a 25×25 picture of each mineral still wanted.

### Transmission and pause windows

- The window picture at (90, 20). A transmission has "TRANSMISSION" at (300, 125) and its text in Century bold 16, brown (100, 75, 0), from (140, 150), 15 pixels a line, broken at the first space or line break after 55 characters, or at any line break.
- The pause screen has "Game Paused" at (300, 125); "MINERALS" (Arial bold 14) at (120, 145) over a list in Arial bold 11, 12 pixels a line, with underlined headings Mineral, Amount and Weight, stopping before y 470, followed by the profit, weight and temperatures; "GADGETS" at (360, 145) with the counts of Teleport 1, Teleport 2, Protective Shield, Drill Repair, Hull Repair, Dynamite, TNT, Sonic Bomb, Ice Bomb, Radiation Bomb, Heating Unit and Matter Transmitter, then the names of the burners, reactors, tractor beam and charger owned; the power weapons' pictures at x 600 from y 120, 50 pixels apart; and "UPGRADES" below the gadgets, with each category's name, tier name and amount.

### Bases and the start page

- **Repairs tab:** its picture; the minerals carried from (37, 173), 16 pixels a line, with count at x 147 and value at x 182, in Century bold 16, gold (184, 156, 61); the row cursor at (286, 150 + 59 × row); cargo, fuel (shown as "lbs"), drill and damage at x 382, y 324, 383, 442 and 501; the cargo's value, the repair cost and the money at x 639, y 198, 262 and 324.
- **Upgrades tab:** its picture; each tier's picture, 69×64, at (19 + 83c, 106 + 69r), with an owned or not-owned frame at (5 + 83c, 95 + 69r); the cursor on the selected frame; the selected picture at 100×100 at (685, 47) in a frame at (678, 40); its name, category and amount in Niagara Solid bold 17, pink (218, 174, 184), at x 690, y 200, 216 and 232; its price in Century at (690, 248); its state at (690, 280) and (690, 296); the money at (41, 29) in Commerce SF.
- **Gadgets tab:** its picture; for each row at y 141 + 18i, black lights at x 307, 539 and 688, the name at x 350 and "$" with the price at x 575 (Century bold 16, pale green (180, 255, 180), baseline 20 lower); a highlight bar and green lights on the selected row; blue lights at x 688 for gadgets owned, with the count at x 735 for countable ones; the money at (614, 64); the selected gadget's picture at (69, 32).
- **High-score tab:** its picture; up to 28 rows from y 182, 14 pixels apart, in Arial bold 11: rank at x 273, name 327, score 435, date 554, days 648; a scroll marker 15×20 at x 759, from y 162 down to 552 as the list scrolls; the name being typed at (54, 86) and the score at (539, 86) in Arial bold 20, red (250, 60, 60).
- **Departure-time dialog:** the dimmed cover, its picture at (163, 111), the time "h:mm" at (356, 192) and the temperature at (356, 319) in Ultra Serif SF bold 24, orange (200, 70, 0).
- **Start page:** the title picture at (0, 1); the three text boxes at (250, 106), (250, 131) and (250, 156), the selected one lit; the highlight pictures for the last three rows at (270, 181), (270, 206) and (270, 231); the text in Arial bold 13, (158, 122, 92), at x 272 inside the selected box; the cheat's name at (496, 115) in Arial bold 20, red and blue alternating every 5 ticks; lights at x 345 (Easy, On), 472 (Normal, Off) and 607 (Hard), y 180, 205 and 230; and the credit line in Impact 14, (200, 184, 168), at (70, 93).

### Images

- Images are swapped in and out of fixed slots as the game moves between screens: the same numbered slots hold the map tiles in play, the upgrade pictures in a base (so leaving a base puts the tile pictures back), and the start page's highlight pictures. Mission boxes and the pause screen show tile pictures from these slots.
- Mirrored pictures are made from the originals when first needed: the right-facing hull overlays, the left-facing drill heads, the right hill edge, the glider's left flame, and the laser and sonic cannons' right-facing pictures.

### Fonts

The original asks for six fonts, all bold except Impact. Two of them, Commerce SF and Ultra Serif SF, are commercial fonts from SoftMaker (©1990–1993 Brendel Informatik & SoftMaker Software GmbH, all rights reserved). Century and Niagara Solid are commercial Monotype fonts that come with Microsoft Office. None of these four may be shipped with the web version. Java drew any font that was not installed in its default sans-serif font, so most players saw Arial in their place.

The web version ships no font files. Each font is a list of installed fonts, tried in order: the original font itself, then the closest font that comes with Windows or Microsoft Office, then close fonts common on macOS and Linux, then a generic family. A player who has the original font installed sees it; everyone else sees the nearest one they have.

| Original | Used for | Look | Fonts tried, in order |
|---|---|---|---|
| Arial, bold, 11 to 36 px | most text | sans-serif | Arial, Liberation Sans, Helvetica, sans-serif |
| Century, bold, 16 px | score and column readouts, shop text, gadget panel, transmissions | schoolbook serif | Century, Century Schoolbook, Century Schoolbook L, C059, TeX Gyre Schola, Georgia, serif |
| Commerce SF, bold, 15 px | panel numbers and money | geometric slab serif (a version of City) | Commerce SF, Rockwell, Rockwell Nova, American Typewriter, serif |
| Niagara Solid, bold, 17 px | upgrade details | tall, condensed sans | Niagara Solid, Agency FB, Arial Narrow, Liberation Sans Narrow, Avenir Next Condensed, sans-serif |
| Ultra Serif SF, bold, 24 px | the departure time | heavy, rounded serif | Ultra Serif SF, Cooper Black, Bookman Old Style, URW Bookman, Bookman, serif |
| Impact, 14 px | the start page's credit line | condensed heavy sans | Impact, Haettenschweiler, Arial Narrow, sans-serif |

- Text is drawn bold where the original asked for bold. Where the font found has no bold face, the browser thickens it, as Java did.
- The canvas draws no text until the page's fonts are ready, so the first frames never flash a different font.

## 12. Sound

### Effects

Effects play only while sound is on. Each is one clip: playing it again restarts it, and the looping ones repeat until stopped.

| Sound | When |
|---|---|
| Beep | Selection changes on the start page and in a base (section 5), and clicks in a base. |
| Propeller (loops) | While flying up, from when the pod starts to rise until Up is released or the pod stops flying. |
| Jet (loops) | From switching the Jet Glider on until it is switched off or Up is released. |
| Drill (loops) | From starting a dig until its tile is collected. |
| Clank | Collecting anything with weight. |
| Ship explosion | The pod's explosion: hazards, damage, crashes. |
| Dynamite, TNT | Those blasts. |
| Teleport | Using a teleporter. |
| Sonic bomb, ice bomb | Those bombs (the radiation bomb is silent). |
| Boom | A sonic cannon shot. |
| Rain (loops) | From rain starting until it ends. |
| Thunder | Each lightning bolt, including cancelled ones. |
| Lava (loops) | While flowing magma is on screen, checked whenever magma is checked (section 6). |
| Wind (loops) | A surface ambience, not tied to the weather: started when a game starts or loads and on leaving a base; stopped by a scroll down while the pod is below row 10, started again by a scroll up at row 10 or above. |

- **Stopping everything:** opening a transmission, a teleport's jump, entering a base and a restart stop every effect. The looping ones do not start again until their own trigger comes round again: the propeller after Up has been released, the lava sound after the screen has once been free of flowing magma, the wind after a scroll down past row 10 and back up.
- The earthquake sound is loaded but never played, and the shield and gate sounds have no file and are silent.
- While the page is hidden, all sound and music pause with the game and resume when it is shown again.
- **Browser audio unlock:** browsers keep a page silent until the player presses a key or clicks. Sound starts from the first key press or click on the page; a tune that should already be playing then starts.

### Music

- **Tunes:** the title tune (`start_theme.mid`) on the start page, the shop tune (`shops_theme.mid`) in a base and the in-game tune (`game_theme.mid`) in play. Only one plays at a time, always looping from its start.
- **Changes:** with music on, starting or loading a game, and leaving a base, play the in-game tune; entering a base plays the shop tune; a fatal message's countdown stops the music, and the restart then plays the title tune.
- **The start page's switches:** the game has one music switch and one sound switch, both on at the first launch and after that as the player last left them (section 13), set on the start page's Music and Sounds rows. Turning music on with Left plays the title tune from the start; with Right it restarts the tune last set, which on the start page is the title tune. Turning it off stops the music.
- **The menu bar's check boxes** (section 2) show the two switches each time the menu opens, so they always agree with the start page. The Music box sets the music switch and plays or stops the tune for the current screen. The Sounds box sets the sound switch. Screen changes act on the music only while the switch is on.
- **Playback:** browsers cannot play MIDI files, so the web version reads the original MIDI files and plays them with a small synthesiser: one simple waveform per note, chosen by the instrument's family, with a short attack and decay and a soft release; the percussion channel plays short filtered noise bursts (low for bass drums, high for cymbals, mid for the rest). It follows tempo changes, volume and expression controls and pitch bend. Notes are scheduled a fifth of a second ahead; notes that are already more than a tenth of a second late, because the page was busy, are skipped rather than played together. The music therefore keeps the melodies and timing of the MIDI files.

## 13. Saved games

### Names

A game is saved under its name, the text typed on the start page when it was started or loaded: 3 to 13 lower-case letters and digits. Saving again overwrites the save of that name, and loading needs the same name typed. Each save uses up one of the game's saves, which start at 50, 30 or 20 by difficulty (section 9); with none left, Save Game does nothing. A count of 999 or more is never used up. Saving is also refused after a modified save was loaded.

### Format

A save is text, the exact text the original wrote to its save file, with Windows line endings (carriage return and line feed):

1. `mlu 2`.
2. The difficulty level, 1 to 3.
3. The map: rows 0 to 99 in order, each of 5000 columns from west to east, one character per tile: the tile's value plus 33 (so `!` is earth and `q` open). The characters run on from row to row and are broken into 6,250 lines of 80 characters.
4. The property list, encrypted and broken into lines: the first line holds 79 characters, every following line 80, the last whatever remains.

The property list, before encryption, is `name:value` pairs joined by commas, in this order: money, fuel, battery, drill (these three truncated to whole numbers), hull (the damage), engine, fueltank, cargobay, radiator, hullx, biox, drillx, batx (the eight upgrade tiers, 1 to 7, or 8 for a Mega part), dyn, tnt, tel1, tel2, drillfix, hullfix (gadget counts), iceconverter, nanobots, scannon, extractor, converter, cannon (power weapons found, `T` or `F`), tractor, coalb, petrolr, jet, gasb, nuc, nucx (1 or 0), score, transc (the next transmission's number), sonb, iceb, time (ticks played), shield, radb, xhours, xminutes (the last departure time), days, saves (the saves left), xmax (the furthest column), baseidx (the last base visited, 0 to 3), gameid, nux (bomb fuel), base4day (the day of the transmission at column 3990), heater, mtrans, echarger, and last checksum.

- **Encryption** is a substitution of each character from space (32) to code 127: the character 32 + k becomes 32 + p(k), where p(0) to p(95) are 39, 94, 68, 65, 69, 61, 72, 83, 25, 43, 20, 40, 2, 76, 80, 8, 22, 36, 56, 41, 42, 35, 62, 79, 3, 5, 34, 23, 70, 28, 52, 37, 84, 48, 30, 93, 90, 7, 64, 21, 38, 57, 9, 13, 89, 73, 66, 44, 58, 4, 81, 54, 15, 32, 49, 16, 29, 71, 19, 53, 17, 85, 45, 26, 74, 0, 18, 14, 78, 67, 55, 51, 12, 87, 86, 60, 46, 77, 6, 10, 11, 47, 31, 1, 75, 24, 95, 33, 91, 88, 92, 82, 27, 59, 50, 63. Decryption reverses it and drops characters with no match.
- **Checksum:** 33 × level, plus every tile value in rows 0 to 99, plus every numeric property (money, the three truncated gauges, damage, tiers, counts, flags as 1 or 0, score, transc, sonb, iceb, time, radb, shield, xminutes, xhours, days, saves, xmax, the power-weapon flags, baseidx, gameid modulo 1,000,000, nux, base4day, heater, mtrans and echarger), added as 32-bit signed integers that wrap round.
- **Size:** about 513,000 characters, almost all of it the map.

Not saved: the minerals carried (the cargo comes back as only the bomb fuel's weight), the pod's position, a mission, Ice9, frost, weather, rows 100 and 101, the tile styles, the sound and music settings and the cheat.

### Loading

- **Reading:** the first line is ignored. A second line starting with 1, 2 or 3 sets the level and its factors; anything else leaves them as they were. Then 6,250 lines of at least 80 characters must follow. Open tiles on rows 5 and 6 become earth. All remaining lines are joined and decrypted, and each property is looked up by name; a missing property keeps its current value. Every number must be a plain whole number within the 32-bit range, and the last base visited must be 0 to 3. A save that is missing lines, has short lines or bad numbers is not loaded at all (section 4).
- **Checksum:** worked out the same way while reading (the three gauges are added without wrapping round). If it does not match, the save is still loaded, but saving is disabled and "Save file has been modified! Game session terminated." appears at once, ending the game after 130 ticks.
- **Rebuilding:** the cheat chosen on the start page is applied (section 14); capacities are set from the tiers, tier 8 meaning the Mega part; owned tiers are marked; the radiator's running cost, the heater limit and its energy use are set; the next bonus step becomes the first step above the score, or the top step past 20,000,000 × the score factor; tile styles are made afresh (obsidian armour back to 5, solid tiles random, hills, magma marks); columns whose row 99 flows down get rows 100 and 101 flowing down too; the weight is worked out.
- **Starting:** play starts with the clock at the last departure time, the bases destroyed as section 6 describes, the cargo set to the bomb fuel's weight, the in-game tune and the wind sound, and the pod standing on the surface row 3 columns east of the last base visited, with the view placed around it. The surface is melted or refrozen to suit the time (section 6); row 5 of columns 1000 to 1249 flows right and of 1250 to 1499 flows left (the magma lake's surface), and row 5 of columns 1550 to 2009 flows down wherever row 6 does; the no-dig columns are noted.
- **After the victory** the save holds only the line "Mission complete! Please, play again.", so loading it fails.
- **Compatibility:** saves are interchangeable with the original's files, except that the original cannot read money or score above 2,147,483,647.

### Storage in the browser

- **Where:** saves and the high-score list are kept in the browser's IndexedDB database for the page's site, one save per game name. IndexedDB is used rather than local storage because local storage holds only about 5 million characters per site, room for about nine saves, while IndexedDB has a share of the disk.
- **Format:** each save is stored as the exact text the original writes to its save file, about 513,000 characters with its Windows line endings, map and checksum included, so a stored save is interchangeable with the original's save files.
- **Timing:** writing and reading are not instant. "Game Saved" appears once the save has been written, and loading from the start page starts play once the save has been read.
- **Failure:** if a save cannot be written (storage full or blocked), the "Game Saved" pop-up does not appear, the save used up is given back, and the status line says why.
- **Persistence:** browsers may clear a site's stored data when the disk runs low. The page asks the browser to keep its data (persistent storage). If the browser declines, saves still work but are not protected from that clearing.
- **Settings:** the Music and Sounds switches, the scaling mode and the touch controls option are kept in the browser's local storage under "mlu2.settings". The switches are stored whether they were changed on the start page, with the menu's check boxes or in the launcher, and the game starts with them as they were last left; the scaling mode and touch controls are set in the launcher. Each change keeps the other settings. They are not part of any save: loading a game keeps the switches as they are. If storage is blocked, the switches still work but start on again next time.

### Snapshots

- **What:** a snapshot keeps the whole game as it was at one moment: the map, the pod, its gauges, upgrades, gadgets and cargo, the score, the screen and everything else the game holds, except the Music and Sounds switches, which stay as the options say, and the high-score list, which stays as the browser keeps it. It stands apart from saved games: taking or resuming one neither reads nor writes a save and uses up none of the game's saves.
- **When:** taken with the menu's Take Snapshot, only in a base or on the pause screen, where the game stands still.
- **Where:** in the browser's IndexedDB, in a database of their own, "mlu2-snapshots", under an id made when the snapshot is stored. Each holds its name, the game's name, the time it was taken, whether in a base or paused, the summary the launcher shows, and the game, about 1.4 MB.
- **Resuming:** the launcher's Resume opens the game page with `snapshot=` and the id in its URL. The page loads as usual, puts the snapshot's game in place of the start page and removes the parameter from its URL, so a reload or Exit does not resume it again. The game carries on from that moment: no key is held, the current screen's tune plays when music is on, and on the pause screen the wind, lava, rain and jet booster sounds start again as they were. The field, or on the pause screen the pause picture, is drawn afresh from the snapshot, and the high-score list is read again from the browser. Saving at a base afterwards saves under the game's name held in the snapshot. A snapshot that is gone or does not fit leaves the start page as it is, and the status line says why.
- **Fit:** a part the snapshot holds that the game no longer has is ignored, and a part it lacks keeps its starting value. A part of the wrong kind or size, such as a map of other dimensions or a number where a list belongs, refuses the whole snapshot and changes nothing.
- **Files:** an exported snapshot is JSON text: a record marked as an MLU web snapshot, naming the game ("mlu2") and the snapshot format (1), with the name, the game's name, the time, the place, the summary and the game. Maps of bytes are written as base64 text.

## 14. Cheat codes

Entered on the start page's Cheat Code row. The last one entered applies to the next game started or loaded, and to any other started before the game next restarts, which clears it. The codes are stored with every character shifted down by 50 in the character table.

| Code | Shown as | Effect in a new game | Effect on loading |
|---|---|---|---|
| donaldtrump | $1,000,000 | Money set to $1,000,000. | The same, replacing the saved money. |
| locomotive | Turbo-X Engine | Engine tier 7, 1,500 HP. | The same. |
| tankhunter | Super Fuel Tank | Fuel tank tier 7, 3,000 L, filled. | The same. |
| diamondbox | Gigantic Cargo Bay | Cargo bay tier 7, 6,000 lbs. | The same. |
| igloo | Liquid Nitrogen Radiator | Radiator tier 7, 600 F, running cost 0.03. | Radiator tier 7, 800 F (the shop's amount). |
| metalplate | Energy-Shielded Hull | Hull tier 7, 1,000 hits. | Hull tier 7, 1,200 hits (the shop's amount). |
| greendeath | Super-Shield BioX | Bio-X tier 7, 60,000 Rx. | The same. |
| dewalt | NanoTube Drill | Drill tier 7, 10,000, full. | The same. |
| energizer | Kryptonite Battery | Battery tier 7, 10,000 MW. | The same. |
| lifejacket | Unlimited Saves | Saves set to 1,000, which are never used up. | The same, replacing the saved count. |

- In a new game the cheat sets the tier and capacity but does not mark the tiers as owned, so the shop still offers the lower tiers, and buying one lowers the capacity (section 15). On loading, tiers are marked owned from the saved values after the cheat, and capacities are taken from the shop's tables, which gives the different amounts above.
- The hull and drill cheats change the pod's pictures.
- **The victory reward** (section 4) names one of these codes at random, with "Nano-Tube Drill" for dewalt and "1000 Saves" for lifejacket; the other names are as shown.

## 15. Known quirks kept from the original

Odd but harmless behaviour of the original that the web version keeps.

### Play

- **Ice9 and overheating:** the overheat check at the start of every tick ignores Ice9; only the checks in magma and while falling respect it. Ice9 mostly saves the radiator's running cost.
- **OVERHEAT! does not block keys:** during its countdown the pod can still dig and use gadgets, unlike every other fatal message.
- **Gadget panel clicks** work while a transmission, the pause screen or a fatal message is showing, though the keys do not.
- **A downward dig can miss its tile:** if the view scrolls down on the tick the tile would be collected, the tile is not collected and the pod pops back up.
- **The shield as a converter:** with the shield on, a gas pocket never explodes and a lava rock never hurts; both give battery charge instead, as if the burner or the converter were fitted.
- **The tractor beam and a full cargo bay:** a mineral pulled in that does not fit is lost; its tile becomes earth.
- **Drilling obsidian** with a drill of 500 or more but no sonic cannon starts the drill sound, which keeps looping although no dig starts, until the next dig ends or all sounds stop.
- **The jet boost on climbs** never applies: the climb's speed-up for the Jet Glider is checked only when the glider is off.
- **Releasing Up while gliding** silences the jet sound, though the glider keeps going.
- **Teleporter 1** starts an ash storm whenever it succeeds.
- **The sonic bomb's aim:** the ring is drawn where it was set off, but rock is shattered around the pod's current position, measured from a point 15 pixels up and left of each tile.
- **TNT and the bases:** TNT destroys only the first base, and only when set off in columns 0 to 3 below row 2, at any depth; dynamite destroys any base at its door.
- **Explosions restore column 0:** every explosion puts earth back on row 5 of column 0 as well as of the no-dig columns.
- **The Matter Transmitter** pays the minerals' plain value, ignoring the difficulty's money factor.
- **The pause screen during an Inventory Sphere:** pausing while a sphere's panel shows (100 ticks) shows the sphere's list under the heading "TRANSMISSION" instead of the pause page.

### Weather

- **Leaving a base in wind** stops the rain, not the wind, with a chance of a half.
- **The wind's timer** counts down while no wind blows.
- **Drawing the wind** raises a slow wind blowing east to 10, so such a wind speeds up while the sky is in view and it is not raining; a slow wind blowing west is only drawn faster.
- **The wind dots** never move up or down: their random wobble always rounds to 0, and the checks that would bring a dot back from above or below reset its horizontal position instead.
- **Rain slants the same way** whichever way the wind blows.
- **Meteors:** when one is removed, the next one in the list does not move that tick. A meteor over a standing base is removed but still finishes its tick, so it can still blast a crater or hit the pod.
- **Thunder** sounds for a lightning bolt even when the bolt is cancelled for falling outside the open sky.
- **Vertical scrolls change rocks out of turn:** the marble and lava rock changes on a vertical scroll affect the 3 rows at the far side of the view, which were already in view, rather than the rows coming into view.

### Generation

- **Single-tile clusters:** the mineral clusters between columns 2100 and 2899 were meant to fill 6 by 6 tiles, but each puts its mineral on its centre tile only.
- **The first Mega part and the first power weapon** are never checked for landing in magma, and a power weapon drawn again lands on rows 60 to 99 instead of 75 to 98.
- **The sonic cannon** is never placed, so it cannot be found; the Ice9 converter takes its place. The transmission at column 3610 speaks of 5 power weapons, which matches.

### Bases and missions

- **The repairs tab** shows the fuel in "lbs".
- **The first two drill pictures** in the upgrades shop are swapped.
- **Upgrade cheats and the shop:** in a new game the shop still offers the lower tiers, and buying one lowers the capacity.
- **Missions** count minerals that did not fit in the cargo bay, and end on entering any base, complete or not.
- **Mission draws:** a kind drawn again for being already on the list never picks the top of its range, and the piece count never reaches the top of its range (the table in section 10 gives the real ranges). A first count of kinds is always drawn and then replaced, which only shifts the random numbers.
- **The Ice9 converter's message** says 3 lbs of Ice9 make an ice bomb; it takes 30.
- **The high-score tab's cursor** blinks on the explosion timer, which the base otherwise leaves alone.
- **Negative numbers** with a multiple of three digits are shown with a stray comma, as "-,123".

### Display and controls

- **The Ice9 amount** is meant to show two decimals but shows whole units.
- **The propeller** uses the same, unmirrored pictures facing left and right.
- **The start page's Left and Right** never beep; the original beeped only the one time it loaded its sounds.
- **The looping sounds** stay silent after all sounds are stopped until their own trigger comes round again (section 12).
- **The difficulty** goes back to Easy at every restart.
- **The tile names** of granite, marble, lava rock and gas are shifted by one in the name list; they never appear because none of them can be carried.

### Invisible

Kept for exactness, with no visible effect: Esc also toggles a grid display that is never drawn; every background volcano is drawn, as its visibility test is always true; the background colour's first test reads the current temperature rather than the value passed, which is always the same; the save's unused number encoding cannot read back four-digit values; the first encrypted line of a save holds 79 characters, the others 80; the weight of a mineral with a negative value is 5.

## 16. Module structure

All modules are JavaScript modules in the same folder as the page. The game logic modules never touch the page. They work on one game state object, whose field names follow the original's, and reach the page only through four small interfaces that the entry module supplies on the state:

- **Sound:** play, loop and stop a sound effect by name, stop all effects, set the current tune, play it looping and stop it.
- **Message boxes:** show a titled box with an OK button, either alongside the game or blocking it until closed (section 3).
- **Storage:** read and write a save by game name, and read and write the high-score list. Every call is asynchronous; failures come back as an empty result rather than an error, and failed writes are reported in the status line.
- **Field-layer drawing:** draw the field layer now, and draw the pause screen's picture into it (section 11).

| Module | Responsibility |
|---|---|
| launcher | The launcher page: the Play link, listing, renaming, exporting, importing and deleting saves and snapshots, resuming snapshots, and the options. |
| play | Entry of the game page: sets up the page, its menu bar and message boxes, loads images, sounds and fonts, wires input, audio, storage and the field layer to the game, runs one tick (the play update, then the drawing-time updates; nothing while a blocking box is open), takes snapshots and resumes the one named in the URL, and starts the clock. Offers a test hook that runs ticks by hand. |
| viewport | Fits the game to the window, with crisp and integer scaling, and converts mouse positions. |
| clock | The display-driven loop: 60 ticks a second, a drawing every refresh with the interpolation fraction. |
| jmath | Java number rules: truncating division and casts, rounding, 32-bit and 8-bit wrap-around, random numbers. |
| input | Browser events to game key codes (with the system's key repeats), click positions and mouse moves; releases held keys when the page loses focus. |
| touch | The touch controls: the pad, the key buttons, the device keyboard and full screen. |
| midi | Reads the MIDI music files and plays them with simple synthesised voices. |
| imagelist | The list of every image file, for preloading. |
| data | Fixed tables: map size and tile values, effect counts, the bases, gadget names and prices, transmission columns, cheat codes, fonts, colours and the menu's texts. |
| stats | The mineral and upgrade tables: names, prices, weights, radiation, amounts. |
| assets | Preloading images by exact name, and the mirrored copies. |
| sprites | Which image each picture slot shows, for each screen, upgrade tier and gadget. |
| state | The game state and restart. |
| world | World generation, hills, volcanoes, clouds, the surface melt and freeze, scrolling, magma flow, popping and freezing, rockfall, earthquakes, explosions, teleports, weight, colours, and the non-drawing part of a field redraw. |
| pod | The play update: clock, temperature, bonuses, hazards, transmissions, weather, the tractor beam, glider, flying, driving, drilling, falling, energy and base entry; collecting tiles, the sonic cannon, the radiation bomb's changes, Inventory Spheres and the transmission texts. |
| effects | The updates the original made while drawing, run once per tick on every screen: rocks, meteors, labels, particles, explosions, beams, the transporter, rain and lightning, wind, the shield, the bombs, the radiation countdown, the laser, the fatal-message countdown and the start page's and base's timers; and a record of what each frame draws. |
| shop | The bases: entering, the repairs, upgrades and gadgets tabs, cargo value and repair cost, number formatting, and the high-score list. |
| mission | Missions: drawing one, counting minerals off, completion and the text. |
| controls | Key, click and mouse-move handling for each screen, the gadgets, leaving a base, the start page's actions, the menu's items, and making a game resumed from a snapshot play on. |
| savefile | The save format, cipher, checksum, cheats and rebuilding a game after loading. |
| storage | Saves and the high-score list in the browser's IndexedDB: read, write, delete and list. |
| snapshots | Snapshots: when one may be taken, its default name, capturing and restoring the game state, the snapshot file format, and the snapshots' own IndexedDB database. |
| settings | Keeping the Music and Sounds switches, the scaling mode and the touch controls option in the browser's local storage. |
| audio | Sound clips, loops, music and the browser's audio unlock. |
| guard | The leave confirmation and the Ctrl+W warning. |
| wake | Keeping the screen on during a game. |
| render | Drawing every screen in the original order, with interpolation, without changing the state; the field layer. |

## 17. Open decisions

None at present.
