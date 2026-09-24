# Architecture

The Braille Keyboard Visualiser is a Next.js 16 App Router application. React renders the controls and HUD; Three.js renders the keyboard in the browser. See [AGENTS.md](AGENTS.md) for project conventions and [docs/](docs/) for feature details.

## Boundaries

- `src/app/page.tsx` is the server entry point. `src/components/braille-keyboard-visualiser.tsx` is the client state owner and composes the screen.
- `KeyboardScene` is imported with `next/dynamic` and `ssr: false`. It owns the canvas, WebGL lifecycle and browser input. `ControlPanel`, `KeyboardHud` and `OrbitGizmo` render the surrounding interface.
- `src/lib/scene/` creates the renderer and handles keyboard and pointer interactions. `src/lib/device/` builds and animates the device, with body meshes in `bodies/`, mode behaviour in `modes/`, and shared builders and materials at the device level. `src/lib/config.ts` holds braille mappings and defaults.

## State flow

1. React starts with default settings, loads saved settings after hydration, then persists changes through `src/lib/visualiser-settings.ts`. The storage key is `braille-keyboard-visualiser.settings`. Mode, per-mode geometry, visibility and key mappings persist.
2. React passes the active mode's flattened settings to `KeyboardScene`. The scene merges changes into a shared mutable runtime state used by the device and interaction controllers. Active dots, held keys, typed text and side-button presses remain runtime-only.
3. Interactions report the current chord and typed text to React through a callback for the HUD. Key mappings take effect immediately because the interaction controller reads the shared state.

## Scene updates and lifecycle

- Changes to mode, angle, key diameter or side-button visibility rebuild the device. Indent and dot/letter overlays update existing meshes. Keep the `requiresRebuild` list in `keyboard-scene.tsx` in sync with new geometry settings.
- On mount, `KeyboardScene` creates the scene, device, input handler, resize handling and render loop. On unmount, it cancels the loop and disposes of those resources.
- Do not call `renderer.forceContextLoss()` during cleanup: React development mode can replay effects, and forced context loss prevents the next renderer initialisation in Chrome.

## Verification

Run `npm run typecheck`, `npm run lint` and `npm run build` before merging. Use Node.js 20.9 or newer.
