# Martin's Arcade

Implement and verify requested changes end to end when tools and permissions allow. Do not ask the owner to perform checks the agent can perform. Respect approval requirements.

## Product
- A private, authenticated browser game library, not a marketing landing page.
- Keep STRIKEPOINT, Pink Pedal and the shared Sunshine Live player functional.
- Read DESIGN.md before visual changes. Keep actual gameplay visible in library imagery.
- Preserve server-side Sites authentication and the existing hosting project ID.
- Do not change audience or create a replacement Site to publish an update.

## Structure
- app/page.tsx: library; app/library.css: library brand system.
- app/game.tsx and lib/engine.ts: FPS interface and simulation.
- app/pink-pedal and lib/pink-engine.ts: arcade interface and simulation.
- lib/world.ts: original 3D environments and models.
- public/: local game preview images and favicon. New reusable image assets belong here.
- app/app-link.tsx: static router navigation, avoiding the production vinext Link import defect.
- app/radio.tsx stays mounted in the root layout across navigation.

## Verification
- Run TypeScript checks, node tests/arcade-mechanics.cjs, and a production build.
- Test production navigation from the library into both games and back.
- Check desktop and narrow mobile layouts, canvas rendering, controls and console errors.
- Keep animation work bounded, cap renderer pixel ratio and release resources on route exit.
- Publish with Sites tooling from the exact tested source; preserve the existing repository history.
- Do not introduce stock imagery or nonfunctional decorative controls.
