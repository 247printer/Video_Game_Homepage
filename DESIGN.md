# Martin's Arcade Design System

## Purpose
A personal, instantly playable game collection. The first screen is the game library. The primary action is choosing a game; there is no sales funnel or sign-up marketing page.

## Direction
Contemporary arcade cabinet meets a carefully typeset game library. Dark graphite, clear white lettering and a restrained coral brand accent surround full-color, honest gameplay imagery. STRIKEPOINT retains its tactical lime identity; Pink Pedal retains its bright rose and turquoise park palette. These are two game worlds inside one recognizable shell.

## Tokens
- Canvas: #101114. Surface: #1b1d22. Border: #34363d.
- Primary text: #f4f5f2. Secondary text: #b4b6be.
- Brand: #ff7965. STRIKEPOINT: #d7ef72. Pink Pedal: #f58cba.
- Arial/Helvetica system sans; monospace only for indices and numeric metadata.
- Library title: 48px desktop, 34px mobile. Section labels: 14px. Game titles: 30px desktop, 26px mobile. No viewport-scaled type or negative letter spacing.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48. Maximum content width: 1360px.
- Borders: 1px. Repeated game items: 6px corner radius. No nested cards.

## Composition
Compact account/navigation strip, literal Martin's Arcade title, then two equally important game entries. Fixed image ratios and generous art area keep the real games prominent. Metadata is concise and factual. Mobile stacks the games while preserving title, play affordance and readable labels.

## Assets
Use original rendered game scenes from this repository as previews. Update previews after major world changes. Do not imply photorealistic AAA gameplay with unrelated cinematic art. No stock photos or third-party game assets.

## Interaction
- Game cards are semantic links. Preserve modified-click and open-in-new-tab behavior.
- Hover/focus subtly highlights borders and the play icon; 160-220ms transitions, no layout shift.
- Respect prefers-reduced-motion for decorative transitions.
- Icon controls use the installed Lucide family and accessible names/tooltips.
- Radio persists across internal routes, starts on user action, and has independent volume.
- Mobile overlays must not block aiming, movement or the radio.

## Quality Gate
Check 1280x800 and 390x844. Verify no horizontal overflow, overlapping controls or blank canvases. Check real production navigation, play/pause, game selection, audio toggles and error states. Keep shaders and decorative animation out of the library so GPU capacity is available for games.

## Process Reference
Adapted to this product from the workflow in https://www.youtube.com/watch?v=pHstb0JGGhE: establish purpose and project context, define a repeatable visual system, verify in-browser, use original relevant imagery, refine individual components, optimize and save tested checkpoints. No third-party skill installation or model-setting change is required for this implementation.
