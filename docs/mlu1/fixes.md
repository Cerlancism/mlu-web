# MLU 1 web port: fixes to the original

The web version of Motherload Unlimited 1 plays like the original applet ("Version 3.1 January 1, 2008, a.k.a. Shaken Snowglobe Edition"). This list covers the places where it does not, because the original had a bug. Each entry says what the original did, what that did to the game, and what the web version does instead.

Odd behaviour that looks deliberate, or that does no harm, is kept. The specification lists it under "Known quirks kept from the original".

The first section, "Core fixes", lists the fixes to how the game itself runs. The sections after it group the other fixes by topic.

## Core fixes

### The online high-score table no longer answered

- **Original:** entering the base fetched a high-score table from the author's server, shown on a fourth shop tab, and the game-over transmission offered to send the score there with Enter. The server no longer answers, so every visit to the base waited on the request, and the tab was skipped.
- **Web version:** there is no network access of any kind. The base has three tabs, which Enter cycles, and Enter on the game-over transmission just closes it.

### Saving froze the game

- **Original:** a save is about 147,000 characters, and the game wrote it to the file one character at a time. Keys did nothing until it was done.
- **Web version:** the save is written in one go.

### Esc left the base with a pop-up still open

- **Original:** in the base, Esc with a pop-up open ("Game saved", "Not enough cash" or "Limit reached") left the base at once. The pop-up stayed over the play screen until Enter was pressed.
- **Web version:** Esc closes the pop-up, as Enter does, and the next Esc leaves the base.

### Digging while holding an arrow key could cause engine failure

- **Original:** a dig starts when Space or Down is pressed, but the game only counts the pod as drilling once the dig's first tick has run. On that first tick, an arrow key still held for driving also drove the pod: the engine carried the driving load on top of the drilling load, and the pod moved a tenth of a tile off its tile. The engine gauge jumped for that tick, and the jump is enough for "ENGINE FAILURE!". With the starting engine, a sideways dig made while holding the arrow ended the game from 70 feet down, while the same dig with the arrow released was safe to about 430 feet.
- **Web version:** a dig counts as drilling from the moment it starts, so the pod does not drive on its first tick.

## Economy

### The Ice Bomb cost less than its price

- **Original:** the gadget shop lists the Ice Bomb at $50,000 and needs $50,000 in hand to sell one, but takes only $30,000.
- **Web version:** an Ice Bomb costs $50,000.

### Bonuses could pay out on every tick

The game pays a bonus each time the score passes the next step of a fixed ladder, from 100 up to 100,000,000, each multiplied by the difficulty's score factor. Two bugs could make it pay the same bonus on every tick, which is an endless stream of money.

- **Original, loading a save:** loading works out the next step from the saved score. For scores between 1,000,000 and 2,500,000 (times the score factor) it chose 25,000,000 instead of 2,500,000. That value is not on the ladder, so once the score passed it, the game paid the bonus without ever moving on to the next step.
- **Original, top of the ladder:** after the last step was paid, the target stayed where it was, so every later tick paid that bonus again. A loaded save whose score was already past the top step had the same problem with a small bonus.
- **Web version:** loading uses the correct step, and once the top step has been paid there are no more bonuses.

### Mineral counts wrapped around after 127

- **Original:** the number of each mineral in the cargo bay was a small signed number that wrapped from 127 to -128. Collecting a 128th piece of one kind made its count negative. Selling the cargo then took money away, and the shop and inventory showed negative amounts. Gems weigh only 5 pounds, so a large cargo bay reaches this easily.
- **Web version:** counts do not wrap.

### Money and score wrapped around past 2,147,483,647

- **Original:** money and score wrapped to large negative numbers past 2,147,483,647.
- **Web version:** they keep counting. A save with money or score above that limit cannot be loaded by the original.

## Damage and game over

### Some damage wrecked the pod without ending the game

- **Original:** the pod is wrecked when its damage passes the hull's limit. Usually this happens through an explosion, which also ends the game. Two kinds of damage skipped that check: a falling rock hitting the pod during an earthquake, and a Martian bomb set off by dynamite or TNT. If either pushed the damage past the limit, the pod was drawn as a wreck at the place of some earlier crash (the top-left corner if there had been none), but the game went on. The player kept driving an invisible pod until something else exploded.
- **Web version:** this damage ends the game like any other, with "SHIP DAMAGED!", and the wreck is drawn where the pod was. The super-ship cannot be damaged, as before.

### A new game inherited effects from the previous one

- **Original:** starting a new game after a game over did not reset everything. An explosion, floating text or tractor beam that was showing carried on into the new game. In the mantle, the pod's fall speed holds the position of the scrolling background, a number of up to 600. After a game over there, the first fall of the next game ran at up to 600, about sixty times the normal limit, and the pod dropped many tiles at once, through solid ground.
- **Web version:** a new game starts with no leftover effects and the normal fall speed.

## Sound

### The earthquake rumble could loop forever

- **Original:** the earthquake sound loops until the quake ends by itself. When a quake was cut short by a teleport, a game over or a win, the sound was never stopped and kept looping for the rest of the session.
- **Web version:** the sound stops whenever the quake stops.

### Two tunes played at once after dying in the mantle

- **Original:** every game over starts the title music again. The other game overs stop the playing tune first. A game over in the mantle did not, so the in-game tune and the title tune played on top of each other.
- **Web version:** only one tune ever plays.

## Freezes

### A teleport could freeze the game

- **Original:** below row 1100 a teleporter may drop the pod into a random open tile up to 400 rows above. The game kept trying random tiles until it found an open one. Deep down, open tiles are rare, and magma fills tunnels, so when the range had none left the game froze for good.
- **Web version:** after 100,000 tries it gives up and sends the pod to the surface, which is what a teleport does when it works normally.

### Drilling sideways at the map's edge could freeze the game

- **Original:** a sideways dig always moves the pod exactly one tile. Normally it starts with the pod lined up on its tile, but the pod can be out of line, for example after a dig made while holding an arrow key (see "Digging while holding an arrow key could cause engine failure"), or while a wrecked pod is held in place on screen during the game-over countdown. A dig towards the left or right edge could then end a hair past the edge of the map, and the game stopped for good.
- **Web version:** the pod's tile is always taken as one inside the map.

## The end of the game

### Winning left the player stuck in the base

- **Original:** after the fifth detonation in the mantle, the pod returns to the surface and a transmission congratulates the player and says "Game Over" and "All game data is erased." Neither happened: after closing the transmission the game carried on, bonuses stopped, and once the player drove into the base, Esc and Enter no longer worked there, so the player could never leave. The save file was left as it was.
- **Web version:** closing the victory transmission ends the game, deletes the save under the current game name, and returns to the start page.

### The victory reward could change while it was shown

- **Original:** the cheat code offered as a reward is picked at random when the player wins, but the transmission read it each time it was drawn from a number that the floating mineral text also uses. Collecting anything while the transmission was open changed the code shown, usually to "hollandtunnel".
- **Web version:** the reward is fixed when the player wins.

## Saved games

### Loading a damaged or erased save did nothing

- **Original:** loading a save that did not have the expected layout stopped part way through. The start page stayed up with no message, sometimes after some of the save had already been read in. This always happened with a save the game had erased because its checksum did not match, since an erased save holds only ":(".
- **Web version:** such a save is not loaded at all, and the "File not found" message appears, the same as for a name with no save.

## Displays

### The Ice9 readout showed whole numbers

- **Original:** the Ice9 gauge was meant to show two decimal places but rounded down to a whole number, so it read 0 for most of the last unit.
- **Web version:** it shows up to two decimal places, for example 12.0, 12.3 or 12.34.

### The inventory showed an unobtainium count as a percentage

- **Original:** the inventory shows how far each super-ship material is towards its target. Mithril and adamantium showed a true percentage, but unobtainium showed the number of pieces, so it reached only 75 % when the target of 75 pieces was met.
- **Web version:** unobtainium shows its percentage of 75 pieces.
