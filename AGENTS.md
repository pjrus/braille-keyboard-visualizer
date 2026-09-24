# Braille Keyboard Visualiser

The project is a Next.js 16 App Router application for exploring configurable
braille keyboard layouts in 3D. It uses React for the interface and local
Three.js modules for the browser-only renderer.

## Project conventions

- Write UI copy, documentation and comments in Australian English where practical.
- Keep the interface visually flat. Use solid colours, clean borders, spacing,
  layering and subtle shadows. Do not introduce gradients, gloss, blur or
  decorative effects.
- Keep code simple, production-ready and easy to maintain.
- Prefer focused components and existing module boundaries over new abstraction
  layers without a clear payoff.
- Add short comments only where logic is genuinely non-obvious.
- Remove unused or redundant code when touching nearby areas, when it is safe.

## Run and verify

~~~bash
npm install
npm run dev
~~~

Open http://localhost:3000.

~~~bash
npm run build
npm start
~~~

Use Node.js 20.9 or newer. Run `npm run typecheck` and `npm run lint` before building. The GitHub Actions workflow performs the production
build on pushes to main.

## Project shape

- src/app/layout.tsx sets shared metadata and imports global styles.
- src/app/page.tsx is the server route entry point.
- src/app/globals.css contains all application styling.
- src/components/braille-keyboard-visualiser.tsx owns React state and composes the screen.
- src/components/control-panel.tsx renders settings and key-mapping controls.
- src/components/keyboard-hud.tsx renders current chord and typed output.
- src/components/keyboard-scene.tsx owns the browser-only Three.js lifecycle.
- src/components/orbit-gizmo.tsx is the React orbit control overlay.
- src/lib/visualiser-settings.ts validates and persists user preferences.
- src/lib/config.ts holds braille mappings, key defaults and shared dimensions.
- src/lib/scene/scene.ts creates the Three.js renderer, camera, controls and lighting.
- src/lib/scene/interactions.ts handles keyboard and pointer input, then reports state to React.
- src/lib/device/ contains shared device infrastructure; bodies/ contains body geometry and modes/ contains layout behaviour.

## Application flow

The page renders the client-side BrailleKeyboardVisualiser component. It loads
saved settings after hydration, persists valid changes, and passes flattened
active-mode settings to KeyboardScene.

KeyboardScene is dynamically imported without server rendering so Three.js stays
out of the initial server bundle. It creates a mutable runtime interaction state
for the renderer, while React remains responsible for all interface state and
DOM rendering.

The renderer must be disposed when the scene unmounts, but do not forcibly lose
its WebGL context. React development mode may replay effects, and a forced
context loss prevents the following renderer initialisation in Chrome.

## State and rebuild rules

Persistent settings live in localStorage under
braille-keyboard-visualiser.settings. They include:

- the active mode and separate geometry values for each mode
- overlay visibility
- dot and side-button key mappings

These settings rebuild the device: mode, incline angle, key diameter and side
buttons. Key indent and overlay visibility update existing meshes in place.

Runtime-only state includes active dots, held keys, typed characters and pressed
side buttons. It stays inside KeyboardScene and is sent to React through a small
state-change callback.

## Input model

~~~text
F D S  -> dots 1 2 3
J K L  -> dots 4 5 6
A      -> left side action
;      -> right side action
Space  -> commit a chord or add a space
Esc    -> clear the active chord
Backspace -> delete the previous typed character
~~~

Every dot and side-button shortcut is configurable. A key may only be assigned
once.

## Common changes

To add a visible control, update ControlPanel and the state handlers in
BrailleKeyboardVisualiser. Add persistence validation in visualiser-settings.ts
when the value should survive reloads.

To change braille mappings or key defaults, edit src/lib/config.ts. To adjust device
bodies, use src/lib/device/bodies/; to adjust mode layouts, use src/lib/device/modes/.
To change camera views or lighting, edit src/lib/scene/scene.ts.

Use the browser-only KeyboardScene boundary for all code that accesses window,
document, canvas or WebGL.
