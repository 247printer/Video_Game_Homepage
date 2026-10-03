# STRIKEPOINT

An independent, stylized browser FPS against five bots. Two original maps (Dockyard and Relay), 26 selectable weapons from the Call of Duty 4: Modern Warfare (2007) roster, three difficulty levels, reloads, secondary weapons, grenades, health regeneration and respawns. A round ends at 25 eliminations or three minutes.

This is a playable prototype, not an official Call of Duty game. Geometry, sounds, maps and tuning are original. It does not reproduce Activision assets or exact weapon balance. No online multiplayer, campaign, progression database or persistent match history is included.

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
| Reload | R |
| Sprint | Left Shift |
| Crouch camera / slow movement | C or Left Ctrl |
| Jump | Space |
| Switch primary / secondary | Q, 1 or 2 |
| Frag grenade | G |
| Pause / release mouse | Escape |

Touch devices have a movement stick, a swipe area on the right and buttons for firing, aiming, reload, jump, weapon switching and grenades. Desktop with a mouse is recommended. Fullscreen, sensitivity and volume controls are available in Settings. Only sensitivity and volume are saved locally.

## Authentication And Hosting

Production pages require the Sites platform's Sign in with ChatGPT. Authorization is checked on the server using the bundled auth helpers; identity is not stored in localStorage. The initial hosted site is private to its owner. The Sites platform manages access policy and sign-in routes. There is no separate password database.

Development permits a local operator without sign-in. This exception is guarded by NODE_ENV === development and is absent from production behavior. The starter also supports local simulated sign-in at /signin-with-chatgpt?return_to=/.

`.openai/hosting.json` identifies this Site. Publish through the Sites plugin workflow, which builds a Worker and static assets, pushes source, packages the output and deploys the matching version. No database or external API keys are required.

## Implementation

- `app/game.tsx`: lobby, arsenal, HUD, touch input and settings.
- `lib/engine.ts`: match state, combat, audio and input lifecycle.
- `lib/world.ts`: original Three.js scenes and weapon/bot geometry.
- `lib/arsenal.ts`: weapon roster and independent game tuning.
- `app/page.tsx`: server-side authentication boundary.
- Three.js Octree/Capsule handles collision; PathFinding.js A* handles bot navigation.
- Bot bullets and player hits are blocked by map geometry. Grenades use a short forward trace and fuse, not a full ballistic simulation.
- WebMCP exposes an optional read-only match-state tool in compatible browsers.

Weapon names were cross-checked against the [CoD 4 weapon reference](https://www.imfdb.org/Call_of_Duty_4:_Modern_Warfare). Libraries retain their respective licenses in their packages.
