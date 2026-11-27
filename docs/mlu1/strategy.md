# MLU 1: how to play well

This strategy explains how to take Motherload Unlimited 1 from a new game to the victory, stage by stage, and section 5 gives the rules the autopilot plays by. Its rules come from the game's own numbers, set out in the [specification](specifications.md). The game's autopilot (Game > Autopilot) plays by it.

## 1. The rules that end a game

Most mistakes in MLU 1 end the game at once. The game shows a fatal message and returns to the start page. Know these limits before going deeper.

### Engine load

Every tick, the energy the pod uses, times 5,500, is its engine load. If the load is above the engine's power, the game shows "ENGINE FAILURE!". A dig uses more energy the deeper it is, so the engine sets the deepest row the pod can dig. The radiator's running cost is part of the load too, unless Ice9 is cooling the pod. Flying with a heavy cargo bay and a full fuel tank adds load. Holding Up and an arrow together adds more, and the jet booster doubles the cost of flying.

### Heat

The pod's temperature is half its row, less 10 degrees. If it is above the radiator's limit while no Ice9 is left, digging down or falling shows "OVERHEAT!". Digging sideways and flying never overheat. Magma and lava each add 100 degrees, so in the magma rows keep 100 degrees in hand: work no deeper than 200 rows above the radiator's limit. While any Ice9 is left, the pod cannot overheat at all.

### Depth limits by tier

The engine and the radiator each set a deepest row. With both at the same tier, these are the limits:

| Tier | Engine power | Deepest dig for the engine | Radiator limit | Deepest row for the radiator |
|---|---|---|---|---|
| 1 (stock) | 100 HP | 410 ft | 50 F | 1,160 ft |
| 2 | 250 HP | 2,120 ft | 100 F | 2,160 ft |
| 3 | 400 HP | 3,820 ft | 200 F | 4,160 ft |
| 4 | 600 HP | 5,990 ft | 300 F | 6,160 ft |
| 5 | 750 HP | 7,500 ft | 400 F | 8,160 ft |
| 6 | 1,000 HP | 9,800 ft | 500 F | 10,160 ft |
| 7 | 1,500 HP | 15,060 ft | 600 F | 12,160 ft |
| Mega | 3,000 HP | the whole map | 1,200 F | 24,160 ft |

The Mega cooling system's running cost is high: 0.06 energy a tick while no Ice9 is left. With it, a 12-cylinder engine can dig only to 7,200 ft, and a Turbo-X only to 13,100 ft. A pod that picks up the Mega cooling system deeper than its engine allows fails at once, and the running cost also shortens how deep the tank can climb home from. So collect the Mega engine first, or take the cooling with a Turbo-X only if the tank still climbs home from as deep.

### Fuel

Flying up costs far more than falling, which is almost free. Every trip must keep enough fuel for the climb home, and the climb is slower than it looks: each climb starts slowly while the lift builds up. Keep a third more than the climb needs, and a little in hand. Without a teleporter, work no deeper than the depth whose climb takes a third of the tank.

### Teleporters

A teleporter brings the pod home at once, but it is used up, so each use costs its price. Teleporter 1 works from down to 8,000 ft, Teleporter 2 from anywhere.

- **Below the depth the tank can fly home from:** the teleporter is the way home, and the trip must earn more than it costs.
- **Above that depth:** fly home and keep the teleporter for when the fuel runs short, unless the cargo is worth several times its price.
- **Below 10,000 ft,** where earthquakes can close the way up: always go home by Teleporter 2.
- **Below 10,960 ft (row 1,100):** a teleport does not always reach home. As often as (row ÷ 4 + 250) times in 1,000, it lands the pod on a random open tile up to 400 rows higher, and the pod must teleport again from there. That is 55 % of the time at row 1,200 and nearly always at the bottom of the map. So carry enough Teleporter 2s for several hops, with one to spare: 3 for rows down to about 1,600, 5 at row 2,200 and 8 at the bottom. Head home before the count in hand drops below what the depth needs.

### Battery and burners

The pod spends battery charge before fuel. The base refills only the fuel tank: the battery is charged in the field, and its charge weighs nothing.

- **The coal burner ($1,000) and the petroleum refinery ($5,000):** with the processor on (key C), each piece of coal becomes 10 charge and each piece of petroleum 20, if the battery has room, instead of filling the cargo bay. That is worth more than selling them, and it lengthens every trip. Buy both early, and keep the processor on.
- **The natural gas burner ($50,000):** each gas pocket then adds 50 charge instead of exploding. Gas pockets lie from row 600 (5,960 ft) down to row 2,000, so buy the burner as soon as the pod works there and the money allows. Take the charge from the pockets the pod digs through anyway, but do not go out of the way for them: the time costs more than the charge is worth.
- **The nuclear reactors:** with the processor on, thorium, uranium and plutonium become 100, 150 and 250 charge, twice that with the improved reactor. The metals lie only above row 1,300 (12,960 ft), and they are soon mined out, but the battery keeps its charge from trip to trip, so charge made there powers the deep trips later. Buy the reactor ($200,000) once the Mega parts are in, turn the processor on at every depth, and buy a battery big enough to store the charge (6,000 or 10,000). Buy the improved reactor ($1,000,000) straight after, while radioactive metals are still left to dig; once they are gone it adds nothing.
- **Bigger batteries:** once the burners keep the battery full, a bigger one holds more.
- **Without the burners:** coal and petroleum are cheap and heavy, so take them only when nothing better is near.
- **Lava:** it charges the battery only for the super-ship. For the normal pod it is 100 damage.

### Radiation

Radioactive minerals add their radiation to the pod while they are carried. Above the Bio-X shielding's limit, the game shows "RADIATION EXPOSURE!". With the stock shielding (10), two pieces of lead are enough to end the game. Selling the cargo clears the radiation. A mineral that does not fit in the cargo bay is not taken, and adds none.

### Damage

The hull takes damage from hard landings, gas pockets (20), lava (100), magma (10 every tick), earthquake rocks (80) and a jet booster bumping into rock (3). Past the hull's limit the game shows "SHIP DAMAGED!". A fall only hurts when the fall speed has grown past 8. Each press of Up resets the fall speed to 7, so tapping Up just before the landing makes it safe, and lets the rest of the fall go at full speed. Turning off a fall sideways into a branch is a landing too: brake before it.

### Magma

Below row 1,190, magma flows into any open tile beside it or below it. Opening a tile next to magma (left, right or below it) floods the pod and the tunnels it is joined to. The normal pod must never do that. An ice bomb freezes the magma within about seven tiles of the pod into earth, so set one off before digging a tile beside magma. It needs no footing: above a magma pool, hover, set one off, and land on the frozen earth. Deep crystals often sit beside magma, and a bomb costs $50,000, far less than they are worth. Below about 13,000 ft, pools of magma bar the way down. An ice bomb set off beside one turns it into earth to dig through. A pod caught in magma loses 10 hull every tick, so it must get out at once: by teleporter, or by an ice bomb.

## 2. Choosing what to dig

The whole map is generated when the game starts. A good player, or the autopilot, which can see the whole map, goes straight for the best tile in reach. There is no need to search.

- **The main shaft:** dig one straight shaft down right beside the base, in the column next to it, and make it the only hole in the surface: every trip falls down it, branches out sideways from it, and flies back up it straight into the base, so no trip spends time and energy digging its own way down, or a way back up from a hole far from the base. From where the teleporters land, hover across its mouth to the base. Where rock blocks it, go round and back into the shaft below the rock. Keep it as deep as the pod has ever dug, from the first trip on: start every trip by opening whatever is closed, from the top down, whether not yet dug or closed since (below 10,000 ft earthquakes shuffle tiles into it, and frozen magma turns to earth in it). A tile out of reach for now, rock the drill cannot take, say, is left for a later trip. Rock in the shaft can be drilled through, blasted with dynamite ($2,000 a stick, 3 by 3 tiles, granite but not marble) or blasted with TNT ($10,000 a stick, 5 by 5 tiles, marble included): take whichever costs less. Drilling granite or marble wears the drill by hundreds or thousands, but with repair kits in hand the drill is not what ends the trip. Before a blast, check that no Martian bomb, Ice9 or valuable mineral is in it and no magma is next to it, since the blast opens every tile in range.
- **Value per tick:** weigh each mineral by its sale price per tick: the time to dig the way to it, and its share of the climb home. The climb is made once a trip however full the cargo bay is, so a deep mineral bears only the part of the climb its weight takes up of the bay. That makes deep, valuable minerals worth the way down, and shallow, cheap ones worth only when they are near. Weigh money spent on the way (ice bombs, repair kits) by what the money is worth now: late in the game, with millions to spare and little left to sell, it is cheap.
- **Energy, drill and hull deep down:** below 11,000 ft a trip ends when the tank, the drill or the hull runs out, not when the money does. Each dig there costs a lot of energy, granite and marble wear the drill by hundreds or thousands, and lava and earthquake rocks hit the hull hard. So weigh all three as time: keep to the tunnels already open, go round rock, leave lava alone, and use a hull repair kit once the damage passes half the hull. Each repair kit in hand is another whole drill or hull, so with kits the drill and hull matter less.
- **Earthquakes:** below 10,000 ft each dig may start one, and each earthquake swaps 600 pairs of tiles above and below the pod. Tunnels deep down do not last, so do not count on the way back being open.
- **The tractor beam ($150,000):** with Ctrl and an arrow, it pulls in the neighbouring tile's contents without moving the pod. It wears no drill, starts no earthquake and opens nothing, since a tile that held something turns to earth. Deep down, use it instead of digging. It takes minerals beside magma with no ice bomb, and the tile below the pod with no Ice9.
- **Chains:** the best next mineral is the one that leads on to good ones. Of the best few, take the one whose best neighbour, dug next, makes the best pair.
- **Side branches on the way down:** the pod cannot dig upwards, so a mineral passed on the way down can only be reached again by flying back up and digging across to it. When digging down, take a mineral a few tiles to the side on the way, by a short branch dug out and driven back along, if it is worth more for the time than the target below. Keep the branches short: four tiles is about right.
- **In reach:** a tile is in reach only if the fuel takes the pod there and home again. It must also be safe to dig: within the engine's and radiator's limits, within the hull's and shielding's limits, and not next to magma.
- **Granite and marble:** these wear the drill hard and need a drill of at least 200, so dig round them.
- **When to go home:** when the cargo bay is full, the fuel is down to the climb home, the drill is worn, or nothing worth digging is left in reach.

## 3. Buying: fix the bottleneck

Deeper rows pay much more, so most of the money should go on working deeper.

- **The working depth:** the deepest row the pod can work at is the shallowest of three limits: the engine's, the radiator's and the fuel tank's. The fuel tank's limit is where the climb home takes a third of the tank.
- **The best buy:** of the engine, radiator and fuel tank upgrades (one, two or all three together), buy the set that adds most rows per dollar.
- **What makes trips end early:** while saving up for that set, buy the cheaper upgrade that fixes this:
  - a full cargo bay: a bigger cargo bay;
  - a worn drill: a better drill;
  - valuable radioactive minerals left behind: better Bio-X shielding.
- **Upgrades before teleporters:** spend on the engine, the radiator and the fuel tank while they still take the pod deeper. A teleporter is used up each time it saves a climb, so buy teleporters for depth only when no upgrade goes deeper, or when what is left to mine can no longer pay for one. Buy them only with a drill of at least 1,000. With a weaker one, each deep trip ends early and earns less than the teleporter it uses. And buy them only while a trip earns more than the teleporter that ends it, or the deep trips lose money until the next upgrade is out of reach for good. With fuel enough to fly home, fly, and keep the teleporter.
- **Stretching the rig:** when everything above the working depth is mined out and the next upgrade is out of reach, a tank of 200 or more can take a longer climb: let the climb home use nearly half of it.
- **The hull:** keep a hull that the working depth needs: 10 hits at first, 30 below 1,500 ft, 200 below 6,000 ft (gas and lava), and 600 below 10,000 ft (earthquakes).
- **The burners first:** the coal burner and the refinery cost little and pay for themselves within a trip or two.
- **Never go broke:** always keep money for two full refills. Before any purchase, check that what is left to mine in reach, with the money remaining, still pays for the next deeper upgrade. Otherwise the shallow rows can run out before the pod can go deeper. If they do run out, wait in the base rather than burn fuel on empty trips.
- **A cargo bay or fuel tank that is too big:** flying with a full cargo bay and tank must stay within the engine's power, so a bigger one may need a bigger engine first.

## 4. The stages

1. **The surface (to $2,000):** coal, iron, copper and quartz near the top, with the stock pod. First buy the small engine and radiator, then the coal burner, a bigger fuel tank and cargo bay.
2. **Silver and gold (to $50,000):** between 700 and 2,500 ft. They are radioactive, so buy Bio-X shielding as they appear. The jet booster makes climbs quicker and cheaper.
3. **Gems (to $1,000,000):** opal to diamond, between 4,000 and 12,000 ft, with the radioactive gems (moonstone to dark matter) between 7,500 and 10,000 ft for strong shielding. Teleporter 1 brings the pod home from down to 8,000 ft and saves the long climb.
4. **The Mega parts:** the five parts of the Superboring Machine lie between rows 800 and 1,200 (7,960 to 11,960 ft). Each installs the best of its category for nothing. Get the Mega engine before the Mega cooling system.
5. **Deep crystals (rows 1,200 to 2,000):** each worth $75,000 to $500,000 times the money factor. Below 10,000 ft earthquakes can close the way up, so carry Teleporter 2s, and a hull that takes the rocks. Carry ice bombs for the crystals beside magma.
6. **The deep layer (rows 2,000 to 2,999):** super-ship materials (150 mithril, 75 unobtainium, 100 adamantium), Martian bombs (explosives for the mantle) and Ice9. Below 22,000 ft, with magma about, only Ice9 keeps the pod safe from heat. So collect Ice9 first, keep about 150 in hand, and carry spare drill and hull repair kits. Below the radiator's limit, climbing and digging sideways stay safe without Ice9; only digging down and falling need it, so the Ice9 found on the way keeps the pod going deeper. Once the pod runs out of Ice9 there, it cannot get below the limit again without more Ice9 from above, so below the limit take Ice9 before minerals until about 100 is in hand: the next trip down drains about 20 on the way, and once the Ice9 just below the limit is used up, more is needed to dig down to the next. Within 200 rows above that limit, magma's 100 degrees overheat a pod without Ice9 at once, so never fall into magma there, even after a teleport lands the pod above it.
   - **Ice9 keys:** Ice9 drains all the time, so Ice9 dug far above the limit is gone before the pod gets down. Leave the Ice9 in the 150 rows just above the limit alone, and more rows as the keys there run out. Once the pod's own Ice9 is used up, take a few keys, about 40 Ice9, and go straight down with them, collecting the Ice9 below as it goes. Ice9 is the one way below the limit, so every tile wasted higher up is a trip lost later. Magma is everywhere: never open a tile next to it without freezing it first.
7. **The super-ship ($100,000,000 and the materials):** keep the $100,000,000 aside once it is in, while the materials are still coming. The super-ship cannot be damaged and lives in magma, and its laser clears a tile at once, but it still overheats digging down or falling below the cooling's limit without Ice9, and magma drains Ice9 fast. Never let it fall through a magma pool past that limit, and keep some Ice9 in hand, about 40, to dig down to the Martian bombs below it. Collect Martian bombs until the explosives reach 45,600 tons (those collected before the purchase count), then lava for the battery, then Ice9 until it reaches about 570. The way down drains about 100 of it, and the mantle needs 470.
8. **The mantle:** dive at full speed, dodge the rising rocks, and set off a detonation within 150 ft of each target depth: 85,200, 102,300, 105,000, 147,300 and 162,500 ft. The fifth restarts the core and wins the game.

## 5. The autopilot's rules

The game's autopilot (Game > Autopilot, described in section 2 of the [specification](specifications.md)) plays by this strategy. Its rules, in full, with "it" for the autopilot:

- **Choosing what to dig:** it plans routes over the map, by flying, falling, driving and digging. It counts each in ticks, money and energy, and goes for the tile worth most per tick. Money counts as ticks at what its recent trips earned per tick, or, if more, at its spare money (above the super-ship's $100,000,000 once that is put aside) spread over a million ticks, since late in the game it sells little. Each tile bears its share of the climb home: the part of the cargo bay's free room its weight takes up. Of the best five tiles, it takes the one that, with the best tile to dig after it, makes the best pair. When nothing near pays and it plans over more than 400 rows, it skips this look ahead, and looks for tiles to pull in with the beam only if none can be dug, to keep each plan quick. It digs only where it is safe: within the engine's power and the radiator's limit, the hull's and the shielding's limits, and only with the fuel for the way there and back. Before it has the Mega engine, it takes the Mega cooling system only if, with the cooling's running cost and without teleporters, it could still work as deep. It digs a tile beside magma, or through magma, only with an ice bomb, which it sets off just before, counting the bomb's price in the tile's cost.
- **Energy, drill and hull deep down:** below row 1,100, a route's energy also counts as 20,000 ticks per tankful (the fuel tank's and battery's capacities together), the drill wear of its digs as 20,000 ticks per whole drill, and their damage as 20,000 ticks per whole hull. So it keeps to open tunnels and goes round rock and lava. Each repair kit in hand counts as another whole drill or hull. Below row 1,000 it keeps 254 damage in hand, and uses a hull repair kit once the damage passes half the hull.
- **Never into magma:** a fall can be stopped at any row by flying, so it plans a fall tile by tile, each tile fallen into safe, and in the air above a drop into magma it lets a planned fall through only if it stops above the magma; the super-ship's falls must be safe over the whole drop. It plans a sideways move onto a drop only where the whole drop is safe, and to pass magma below, it hovers above it, sets off an ice bomb, which needs no footing, and lands on the frozen earth. Otherwise, in the air above a drop that ends in magma, it holds Up and plans again rather than fall. At the surface it crosses a deep drop, such as the shaft's mouth, in the air. It never digs into the row under the surface except down the main shaft, and sets off no blast that would reach that row, so the shaft is the only hole in the surface.
- **The tractor beam:** once it works below row 1,000 with $2,000,000, it buys the beam. Standing below row 1,000, it pulls in a neighbouring tile worth taking (anything with weight but the Mega parts) instead of digging it. It also plans routes to a tile it can stand in beside such a tile.
- **Heat:** in the magma rows it works no deeper than 200 rows above the radiator's limit, a margin for magma's 100 degrees, unless it has more than 30 Ice9. With the Mega cooling system it may work the whole map. Below the cooling system's limit, it plans a downward dig or a fall only with Ice9 for that move and 2,000 ticks more, and checks again just before each one. Below the cooling system's limit it values Ice9 at $4,000,000 a tile, ahead of the super-ship materials, until it holds 100, and at $500,000 until it holds 150. In the rows just above that limit (150, or more as the keys there run out, until the band holds six, at most 600) it leaves Ice9 alone, as keys for the way down, while it holds 40 Ice9 or more. Below that it values a key at $200,000, or $500,000 once within the band. Higher up it leaves Ice9 alone.
- **Keeping the shaft open:** at the start of every trip, with the energy for the way there and home, it opens any tile of the shaft that is closed above the deepest row it has ever reached, one at a time from the top down, before it goes mining. A tile it cannot get to is skipped for the trip, for the next closed one below, up to three in a row. It stops at magma in the shaft, at the deepest row it may work at, and 200 rows above the radiator's limit once that limit is below row 1,190, where magma begins.
- **The main shaft:** digging down in column 44, right beside the base, counts half, so trips share one shaft and branch out sideways from it, going round rock and back into it. A rock in the shaft is drilled through or blasted away, whichever costs less: dynamite for granite counts 40 ticks and TNT for granite or marble 80, each with the stick's price at the money it earns per tick. It blasts only if no Martian bomb, Ice9 or mineral worth over $2,000 lies in the blast's tiles (3 by 3 for dynamite, 5 by 5 for TNT) and no magma within a tile of them. Once it has $20,000 and works below row 100, where granite begins, it keeps 3 sticks of dynamite, 10 from $1,000,000 and 30 from $20,000,000.
- **Energy:** once it has the coal burner, the refinery or the nuclear reactor, it keeps the processor on. It buys the reactor once the five Mega parts are in and it has $500,000 to spare (or once it has $20,000,000 and works deep), and with it bigger batteries, up to the 10,000 one, to store the charge for the deep trips, if they leave its savings for the next upgrades on course, and then the improved reactor while 20 or more radioactive tiles are left above row 1,300. Upgrades come before gadgets. It buys the gas burner once it works at row 600 or deeper with $300,000, or has the sixth engine, if that leaves its savings for the next upgrades on course. With a burner and room in the battery, it counts coal and petroleum as the charge they give, taking no cargo, at $3.75 a unit of charge; without one, at under a third of their price. It does not go out of its way for gas pockets.
- **Side branches:** standing in its way down, before each dig down, it looks at the tile just left and the tile just right on its own row, each with ground under it. If a mineral there is worth more per tick, the dig out to it and the drive back counted, than the target it is digging for, it takes it first and then digs on down.
- **Moving:** it presses Up just before a fall lands, or within three rows of where the route turns off the fall into a branch, once the fall speed passes 7.5, so every landing is safe and the rest of the fall goes at full speed. In the air it holds its height by pressing Up in short bursts. It uses the jet booster for long climbs, and turns it off near rock.
- **Going home:** it heads home when the cargo bay is full, the fuel is down to the climb home, the drill or hull is worn, or nothing worth digging is in reach. Below the depth its fuel tank can fly home from, and below 10,000 ft, it goes home by teleporter, except that with fuel enough to fly home after all it keeps a Teleporter 1 unless the cargo is worth half of it. Above that it flies, unless the cargo is worth five times the teleporter's price or the fuel cannot cover the climb.
- **Teleporter 2 hops:** below row 1,100 it carries the Teleporter 2s the way home is likely to take, as the landing rule in section 6 of the [specification](specifications.md) gives, plus one. It works no deeper than they allow, and heads home when the count in hand falls below what its row needs. The shop keeps that many in stock for the deepest rows the rest of the pod allows. Since a hop may land the pod in magma, without Ice9 it first climbs out of the 200 rows above the Mega cooling system's limit, where magma's heat would overheat it, if its energy covers that climb and the teleport.
- **Magma:** caught in magma, it teleports home at once, or sets off an ice bomb, or else flies up.
- **No way home:** if no route home is left, it plans again without the tiles it set aside after getting stuck.
- **In the base:** it sells the cargo and buys, one key at a time:
  - the upgrade that lets it work deepest per dollar, or one that stops trips ending early;
  - the coal burner after the first engine upgrade, and the refinery after the second;
  - a bigger battery once the burners have filled it;
  - teleporters, when the climb home limits the depth, once its drill reaches 1,000, and only when no upgrade goes deeper or what is left to mine can no longer pay for one, and while its trips earn more than a Teleporter 1 costs; Teleporter 1s when they go less deep than Teleporter 2s but the pair of Teleporter 2s is beyond its money;
  - later, repair kits (more of them once it has $20,000,000), TNT once it has $5,000,000, ice bombs once it works below row 1,190 with $200,000, and other gadgets;
  - then it refuels, repairs, saves the game under its name and leaves.

  It always keeps money for two refills. If its last trip found nothing to dig and there is nothing to buy, it lets the climb home take 45 % of a tank of 200 or more instead of a third, and goes out again. If that finds nothing either, it stays in the base.
- **The super-ship and the mantle:** once it has $100,000,000, it keeps that sum back for the super-ship, and buys the super-ship once the materials are in too. Then it collects Martian bombs, lava for the battery and Ice9 until it has what the dive needs, taking Ice9 whenever it holds less than 40 so that it can dig down to the bombs: 45,600 tons of explosives, 9,500 fuel and battery charge together, and 570 Ice9, of which the way down drains about 100. Once on its way down it keeps going while it has 410 Ice9 or more. It digs down or falls below the cooling's limit only with Ice9 for the move, checking the whole drop of a fall, and in the air above a drop that reaches those rows without Ice9 it holds Up and plans again. There it dodges the rocks and sets off each detonation within 150 ft of its target depth.
