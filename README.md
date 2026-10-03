# MARTIN'S ARCADE

The authenticated game library at `/` now offers two games. Client-side navigation preserves a shared Sunshine Live radio player across the library and both games.

## STRIKEPOINT (`/strikepoint`)

An independent, stylized browser FPS against five bots. Two original maps (Dockyard and Relay), 27 selectable weapons including the RPG-7, three difficulty levels, unlimited ammunition without reloads, secondary weapons, ballistic frag grenades, remote C4, health regeneration and respawns. Head hits, including the visor, immediately eliminate a bot. A round ends at 25 eliminations or three minutes.

This is a playable prototype, not an official Call of Duty game. Geometry, sounds, maps and tuning are original. It does not reproduce Activision assets or exact weapon balance. No online multiplayer, campaign, progression database or persistent match history is included.

The environments include textured paving, container doors and locks, cargo labels, perimeter equipment, research-building doors, window frames, ventilation units, antennas and surrounding trees. Walkable stacked containers, roof bridges, ladders, solar arrays, pipes, drainage grilles, barriers and a control cabin add detail. Climbing reaches nearby ledges and marked ladders; flight stays inside the arena and below 25 meters. Weapon models include additional mechanical detail and a dedicated launcher.

## PINK PEDAL (`/pink-pedal`)

If WebGL is unavailable, Pink Pedal automatically switches to a Canvas 2D park renderer. The same round, moving targets, weapons, scores and voices remain playable. The start screen also offers a manual 2D mode and a retry button. A lost WebGL context restarts in 2D. STRIKEPOINT still requires WebGL for its first-person 3D world.

An original arcade shooting gallery with adult, round-bodied cartoon e-bike riders wearing pink dresses. Three lanes award 75, 50 and 25 points per hit. Consecutive hits increase a multiplier up to 4x; a miss resets the streak. Each round lasts 90 seconds. Six paint shots per magazine, with a 1.1-second reload. Hits create colorful confetti, without gore.

- Choose Paintball or Schnitzel, then click or tap a rider. Schnitzels have unlimited supply and an animated flight before the hit is scored.
- R, right-click, or the reload button reloads; an empty magazine reloads automatically.
- Escape or the pause button pauses the round. Leaving the browser pauses it too.
- The result screen displays score, hits and accuracy, with replay and library navigation.
- Hits trigger a synthesized cartoon scream and Austrian-dialect phrases with captions. A voice toggle silences both. Speech uses the browser's de-AT voice when installed, otherwise another German voice or the browser default; pronunciation depends on the installed voices. Captions and the synthesized yelp also work without installed speech voices.

## Background Radio

The fixed radio player uses the [official Sunshine Live simulcast endpoint](https://stream.sunshine-live.de/live). Playback starts only after a click. Controls include stop, mute and separate radio volume. Route changes within the library preserve the same audio element. Full page reloads do not autoplay. Volume is stored on this device; music is streamed directly from the broadcaster, not downloaded, recorded or rehosted. A stalled or unavailable stream offers a retry and a link to the broadcaster.

## Run

Requires Node.js 22.13+ and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by the server, normally http://127.0.0.1:5173.

```sh
npx tsc --noEmit
npm run build
npm start
```

## Controls

| Action | Control |
| --- | --- |
| Move | WASD |
| Look | Mouse |
| Fire | Left mouse button |
| Aim | Hold right mouse button |
| Ammunition | Unlimited, no reload required |
| Sprint | Left Shift |
| Crouch camera / slow movement | C or Left Ctrl |
| Jump | Space |
| Cycle weapons | Q |
| Primary / secondary / RPG | 1 / 2 / 3 |
| Frag grenade | G |
| Place C4 / detonate all (up to 4) | V / X |
| Climb ledge or nearby ladder | E |
| Toggle flight | F |
| Ascend / descend in flight | Space / Left Ctrl |
| Pause / release mouse | Escape |

Touch devices have a movement stick, a swipe area on the right and buttons for firing, aiming, jumping, weapon switching, grenades, C4, climbing and flight. Hold the flight arrow buttons to ascend or descend. Desktop with a mouse is recommended. Fullscreen, sensitivity and volume controls are available in Settings. Only sensitivity and volume are saved locally.

## Authentication And Hosting

Production pages require the Sites platform's Sign in with ChatGPT. Authorization is checked on the server using the bundled auth helpers; identity is not stored in localStorage. The initial hosted site is private to its owner. The Sites platform manages access policy and sign-in routes. There is no separate password database.

Development permits a local operator without sign-in. This exception is guarded by NODE_ENV === development and is absent from production behavior. The starter also supports local simulated sign-in at /signin-with-chatgpt?return_to=/.

`.openai/hosting.json` identifies this Site. Publish through the Sites plugin workflow, which builds a Worker and static assets, pushes source, packages the output and deploys the matching version. No database or external API keys are required.

## Implementation

- `app/page.tsx`: game library.
- `app/radio.tsx`: persistent radio player.
- `app/game.tsx`: STRIKEPOINT lobby, arsenal, HUD, touch input and settings.
- `app/pink-pedal/pink-pedal.tsx`: Pink Pedal interface.
- `lib/pink-engine.ts`: Three.js park, animated riders, raycast hits, scoring and round lifecycle.
- `lib/engine.ts`: match state, combat, audio and input lifecycle.
- `lib/world.ts`: original Three.js scenes and weapon/bot geometry.
- `lib/arsenal.ts`: weapon roster and independent game tuning.
- `app/page.tsx`, `app/strikepoint/page.tsx`, `app/pink-pedal/page.tsx`: server-side authentication boundaries.
- Three.js Octree/Capsule handles collision; PathFinding.js A* handles bot navigation.
- Bot bullets and player hits are blocked by map geometry. Rockets trace each flight segment; grenades bounce and detonate after a fuse. C4 attaches to nearby surfaces and detonates on command. Blast damage checks line of sight. These are arcade-only mechanics, not real-world explosive simulations.
- WebMCP exposes an optional read-only match-state tool in compatible browsers.

Weapon names were cross-checked against the [CoD 4 weapon reference](https://www.imfdb.org/Call_of_Duty_4:_Modern_Warfare). Libraries retain their respective licenses in their packages.
