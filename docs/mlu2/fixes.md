# MLU 2 web port: fixes to the original

The web version of MLU2: Crematoria plays like the original program. This list covers the places where it does not, because the original had a bug. Each entry says what the original did, what that did to the game, and what the web version does instead.

Odd behaviour that looks deliberate, or that does no harm, is kept. The specification lists it under "Known quirks kept from the original".

The first section, "Core fixes", lists the fixes to how the game itself runs. The sections after it group the other fixes by topic.

## Core fixes

### The online high-score list no longer answered

- **Original:** the bases' high-score tab showed a list fetched from the author's server, and recording a score sent it there. The server no longer answers, so the tab was skipped and the last base, whose only tab it is, never let the player in. The victory transmission told the player to connect to the internet and send the score.
- **Web version:** there is no network access of any kind. The list is kept in the browser, the tab and the last base are always open, and the victory transmission tells the player to enter the base to record the score.

### The Lightning Charger failed while gliding

- **Original:** a lightning strike on a pod with the Lightning Charger charges the battery instead of damaging the hull, but only while the pod was flying up or falling. The Jet Glider holds the pod level, so a gliding pod took the strike as damage.
- **Web version:** a strike also charges a pod with the Jet Glider switched on.

### Sound effects stopped the game

- **Original:** stopping all sounds, which happens when a game starts, at transmissions, on entering a base and on restarting, included a shield sound that the game never loads. With Sound FX on, a new game never got past the start page.
- **Web version:** a sound that is not loaded is skipped.

### Saving froze the game

- **Original:** a save is about 513,000 characters, and the game wrote it to the file one character at a time, about a second per save on a fast disk. Keys did nothing until it was done.
- **Web version:** the save is written in one go. Keys and clicks still wait until it is done, but that takes a moment. Its text is the same as the original's.

### Esc left the base with a pop-up still open

- **Original:** in a base, Esc with a pop-up open ("Game Saved", "Not enough cash", "Limit reached") opened the departure-time dialog behind it, and a second Esc left the base with the pop-up still showing over the play screen.
- **Web version:** Esc closes the pop-up, as Enter does; the next Esc opens the departure-time dialog.

### Digging while holding an arrow key could cause engine failure

- **Original:** a dig starts when Space or Down is pressed, but the game only counts the pod as drilling once the dig's first tick has run. On that first tick, an arrow key still held for driving also drove the pod: the engine carried the driving load on top of the drilling load, and the pod moved a tenth of a tile off its tile. The engine gauge jumped for that tick. With the starting engine (150 HP), a sideways dig at 120 feet read 148 with the arrow held against 102 with it released, so a little deeper the jump alone caused "ENGINE FAILURE!".
- **Web version:** a dig counts as drilling from the moment it starts, so the pod does not drive on its first tick.

### The menu's check boxes disagreed with the start page

- **Original:** the menu bar's Music and Sounds check boxes kept their own ticks. The start page's Music and Sounds switches did not tick or clear them, and the Music box played or stopped the music without changing the game's music switch. The menu could show music off while it played, and with the switch off a tune started from the box kept playing across screens.
- **Web version:** the boxes show the game's switches whenever the menu opens, and the Music box sets the music switch as the start page does.

## Economy

### Bonuses could pay out on every tick

The game pays a bonus each time the score passes the next step of a fixed ladder, from 100 up to 200,000,000, each multiplied by the difficulty's score factor.

- **Original:** loading a save works out the next step from the saved score. For scores between 1,000,000 and 2,500,000 (times the score factor) it chose 25,000,000 instead of 2,500,000, and for scores between 20,000,000 and 100,000,000 it chose 100,000,000 instead of 200,000,000. For higher scores it chose nothing and left the starting value of 1,000. None of these values is the step the ladder expects, so once the score passed it the game paid that bonus on every tick without moving on: an endless stream of money.
- **Web version:** loading picks the correct step, and any score past 20,000,000 waits for the top step.

### Mineral counts wrapped around after 127

- **Original:** the number of each mineral in the cargo bay was a small signed number that wrapped from 127 to -128. Collecting a 128th piece of one kind made its count negative, and selling the cargo then took money away.
- **Web version:** counts do not wrap.

### Money wrapped around past 2,147,483,647

- **Original:** the value of the cargo was added up in a number that wrapped to a large negative value past 2,147,483,647, so a very valuable load sold for a loss.
- **Web version:** it keeps counting. Money and score never wrap either.

### An Inventory Sphere charged for minerals it did not give

- **Original:** each line of an Inventory Sphere's loot, such as "4 Gold, 80 lbs.", added the weight, radiation and score of all the pieces listed, but put only one piece in the cargo bay. The player carried the weight of pieces that did not exist and could not sell them. The line for Teleporter 2 said "+1" but gave two.
- **Web version:** every piece listed goes into the cargo bay, and the Teleporter 2 line says "+2".

## Damage and game over

### A nuclear blast could leave the pod wrecked but still driving

- **Original:** the pod is wrecked when its damage passes the hull's limit, and almost every kind of damage checks for that. A nuclear mineral set off by an explosion or by the laser added 200, 500 or 1,500 damage without the check, so the pod could drive on past its limit until something else hurt it.
- **Web version:** this damage ends the game like any other, with "SHIP DAMAGED!".

### A new game inherited parts of the previous one

- **Original:** starting a new game after Restart or a game over kept the previous game's nanobots, sonic cannon and ice converter, three devices that are found in the ground and normally start switched off, along with any meteors still falling and an explosion, floating labels or loot panel still showing.
- **Web version:** a new game starts without them.

### A save that failed to load spoiled the next game

- **Original:** a save that could not be read left the map and values it had loaded so far, and a pending "Error loading data! Game session terminated." message. The start page showed "Invalid save-file!", but the next new game ended after about two seconds with that message.
- **Web version:** a failed load leaves the start page as it was, with the game name still typed in.

## Freezes

Each of these threw an error inside the original's game loop, which stopped the game for good: the picture froze and no key did anything.

### Teleporter 1 near the east end of the map

- **Original:** on the surface, Teleporter 1 jumps the pod about 500 columns in the direction it faces. A jump east that would pass the end of the map lands somewhere in the last 50 columns instead, but one time in 50 that spot was one column past the edge.
- **Web version:** that jump does not happen. The Teleporter 1 is used up all the same, since the original takes it when the key is pressed.

### Teleporter 2 from the surface

- **Original:** used on the surface, Teleporter 2 takes the pod to the first open tile below the furthest column reached so far. When that column had no open tile from row 5 down, for example a lava fall's column that the pod had flown over, the pod was placed outside the map.
- **Web version:** the teleport does not happen. The Teleporter 2 is used up all the same, since the original takes it when the key is pressed.

### A nuclear blast with the view at the bottom of the map

- **Original:** the blast clears the ground in a growing circle across the whole screen. With the view at the bottom of the map, the screen's lowest row lies below the map, and clearing it failed.
- **Web version:** rows below the map are skipped.

### Gliding off the edge of the map

- **Original:** the Jet Glider carries the pod along the surface until something stops it. The bases at the two ends normally catch it, but once the base at an end had been destroyed, the pod could glide past the edge of the map.
- **Web version:** the glider stops at the edge.

### Esc during the loot panel

- **Original:** closing a transmission with Esc while an Inventory Sphere's loot panel was still showing removed the panel the screen was drawing.
- **Web version:** the screen draws no panel then.

## The end of the map

### The game closed at the east edge

- **Original:** driving past column 5,000 showed "Thank you for playing this betta version of MLU2: Crematoria." and then closed the program.
- **Web version:** after the message the game returns to the start page. (A page cannot close itself.)

## Sound

### Sound cut out near the end of the map

- **Original:** the last transmission waits for the pod to come up to the surface at the east end. Until then the game stopped every sound on every tick, so the pod drove there in silence.
- **Web version:** sounds stop once, when a transmission opens.

### The rain sound kept playing after the rain stopped

- **Original:** rain stops when the temperature leaves its range, but its looping sound went on.
- **Web version:** the sound stops with the rain.

## The base

### The last three gadgets could not be clicked

- **Original:** the gadget shop lists 20 gadgets, but a click picked a row only among the first 17. Heating Unit, Matter Transmitter and Lightning Charger could be bought with the keys only.
- **Web version:** all 20 rows can be clicked.

### A save that could not be written still used up a save

- **Original:** Save Game used up one of the game's saves before writing the file, and kept it used up when the file could not be written.
- **Web version:** if the browser cannot store the save, the save is given back.
