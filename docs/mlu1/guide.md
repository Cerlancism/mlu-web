# MLU 1: how to play well

This guide explains how to take Motherload Unlimited 1 from a new game to the victory, stage by stage. Its rules come from the game's own numbers, set out in the [specification](specifications.md). The game's autopilot (Game > Autopilot) plays by this guide.

## 1. The rules that end a game

Most mistakes in MLU 1 end the game at once. The game shows a fatal message and returns to the start page. Know these limits before going deeper.

### Engine load

Every tick, the energy the pod uses, times 5,500, is its engine load. If the load is above the engine's power, the game shows "ENGINE FAILURE!". A dig uses more energy the deeper it is, so the engine sets the deepest row the pod can dig. The radiator's running cost is part of the load too, unless Ice9 is cooling the pod. Flying with a heavy cargo bay and a full fuel tank adds load. Holding Up and an arrow together adds more, and the jet booster doubles the cost of flying.

### Heat

The pod's temperature is half its row, less 10 degrees. If it is above the radiator's limit while no Ice9 is left, digging down or falling shows "OVERHEAT!". Digging sideways and flying never overheat. Magma and lava each add 100 degrees.

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

The Mega cooling system's running cost is high. With it, a 12-cylinder engine can dig only to 7,200 ft, and a Turbo-X only to 13,100 ft. A pod that picks up the Mega cooling system deeper than its engine allows fails at once. So collect the Mega engine first, or have the Turbo-X.

### Fuel

Flying up costs far more than falling, which is almost free. Every trip must keep enough fuel for the climb home, and the climb is slower than it looks: each climb starts slowly while the lift builds up. Keep a fifth more than the climb needs, and a little in hand. Without a teleporter, work no deeper than the depth whose climb takes a third of the tank.

### Radiation

Radioactive minerals add their radiation to the pod while they are carried. Above the Bio-X shielding's limit, the game shows "RADIATION EXPOSURE!". With the stock shielding (10), two pieces of lead are enough to end the game. Selling the cargo clears the radiation. A mineral that does not fit in the cargo bay is not taken, and adds none.

### Damage

The hull takes damage from hard landings, gas pockets (20), lava (100), magma (10 every tick), earthquake rocks (80) and a jet booster bumping into rock (3). Past the hull's limit the game shows "SHIP DAMAGED!". A fall only hurts when the fall speed has grown past 8. Each press of Up resets the fall speed to 7, so tapping Up during long falls makes every landing safe.

### Magma

Below row 1,190, magma flows into any open tile beside it or below it. Opening a tile next to magma (left, right or below it) floods the pod and the tunnels it is joined to. The normal pod must never do that. An ice bomb freezes all magma around the pod into earth.

## 2. Choosing what to dig

The whole map is generated when the game starts. A good player, or the autopilot, which can see the whole map, goes straight for the best tile in reach. There is no need to search.

- **Value per tick:** weigh each mineral by its sale price per tick: the time to dig the way to it, and the extra climb home from its depth.
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
- **The hull:** keep a hull that the working depth needs: 10 hits at first, 30 below 1,500 ft, 200 below 6,000 ft (gas and lava), and 600 below 10,000 ft (earthquakes).
- **Never go broke:** always keep money for two full refills. Before any purchase, check that what is left to mine in reach, with the money remaining, still pays for the next deeper upgrade. Otherwise the shallow rows can run out before the pod can go deeper.
- **A cargo bay or fuel tank that is too big:** flying with a full cargo bay and tank must stay within the engine's power, so a bigger one may need a bigger engine first.

## 4. The stages

1. **The surface (to $2,000):** coal, iron, copper and quartz near the top, with the stock pod. First buy the small engine and radiator, then a bigger fuel tank and cargo bay.
2. **Silver and gold (to $50,000):** between 700 and 2,500 ft. They are radioactive, so buy Bio-X shielding as they appear. The jet booster makes climbs quicker and cheaper.
3. **Gems (to $1,000,000):** opal to diamond, between 4,000 and 12,000 ft, with the radioactive gems (moonstone to dark matter) between 7,500 and 10,000 ft for strong shielding. Teleporter 1 brings the pod home from down to 8,000 ft and saves the long climb.
4. **The Mega parts:** the five parts of the Superboring Machine lie between rows 800 and 1,200 (7,960 to 11,960 ft). Each installs the best of its category for nothing. Get the Mega engine before the Mega cooling system.
5. **Deep crystals (rows 1,200 to 2,000):** each worth $75,000 to $500,000 times the money factor. Below 10,000 ft earthquakes can close the way up, so carry Teleporter 2s, and a hull that takes the rocks.
6. **The deep layer (rows 2,000 to 2,999):** super-ship materials (150 mithril, 75 unobtainium, 100 adamantium), Martian bombs (explosives for the mantle) and Ice9. Below 24,000 ft only Ice9 keeps the pod cool. Magma is everywhere: never open a tile next to it.
7. **The super-ship ($100,000,000 and the materials):** it cannot be damaged and lives in magma, and its laser clears a tile at once. Collect Martian bombs until the explosives reach 45,600 tons, then lava for the battery, then Ice9 until it reaches 470.
8. **The mantle:** dive at full speed, dodge the rising rocks, and set off a detonation within 150 ft of each target depth: 85,200, 102,300, 105,000, 147,300 and 162,500 ft. The fifth restarts the core and wins the game.
