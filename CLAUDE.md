# Braille Keyboard Visualiser

Small browser-based braille keyboard visualiser inspired by Hable-style layouts. The stack is intentionally light: plain HTML, plain CSS, plain browser JavaScript modules, Three.js from a CDN, and a tiny Node static server.

## Project conventions

- Write UI copy, docs, and comments in Australian English where practical.
- Keep the interface visually flat. Use solid colours, clean borders, spacing, layering, and subtle shadows. Do not introduce gradients, gloss, blur, or other decorative effects.
- Keep code simple, production-ready, and easy to maintain.
- Follow the existing module split instead of adding new abstraction layers unless there is a clear payoff.
- Add short comments only where the logic is genuinely non-obvious.
- Remove unused or redundant code when touching nearby areas, as long as the removal is safe.

## Run it

```bash
npm start
# or
node server.js
```

Open `http://localhost:5173`.

Do not open `index.html` directly with `file://`. The app uses browser ES modules, so direct file loading leaves the canvas blank.

## Project shape

- `index.html` - app shell, HUD, control panel, and script entry
- `styles.css` - all interface styling
- `server.js` - zero-dependency static server
- `js/app.js` - application entry point; wires scene, state, UI, device, and interactions together
- `js/config.js` - braille constants, dot maps, spacing, and row positioning helpers
- `js/state.js` - initial UI and interaction state, plus persisted settings via `localStorage`
- `js/scene.js` - renderer, camera, controls, lighting, and camera presets
- `js/interactions.js` - keyboard and pointer input, chord commit logic, and HUD updates
- `js/ui.js` - DOM collection and panel event binding
- `js/utils.js` - shared geometry and helper utilities
- `js/deps.js` - access to global `THREE` and `OrbitControls`
- `js/device.js` - thin export wrapper for the device controller
- `js/device/controller.js` - main device build, overlay, and pressed-state logic
- `js/device/cell.js` - braille cell mesh construction
- `js/device/layout.js` - side buttons, raycast targets, and mesh animation helpers
- `js/device/materials.js` - shared device materials
- `js/device/supports.js` - triangular support geometry and the currently unused integrated-base helper

## How the app boots

`js/app.js` is the composition root:

1. Collect DOM references.
2. Create the shared state object.
3. Create the Three.js scene.
4. Create the device controller.
5. Create the interaction controller.
6. Sync the initial controls and bind UI events.
7. Build the initial device.
8. Start the render loop.

If the app loads but nothing responds, start from `js/app.js`.

## Layout modes

There are two supported modes:

- `triangular` - tilts the deck and adds a separate rear wedge support
- `integrated` - keeps the body flat with no separate support mesh

`js/device/supports.js` still exports `addIntegratedBase()`, but the current controller does not call it. If integrated mode is meant to have its own base again, the change belongs in `addSupport()` inside `js/device/controller.js`.

## State and rebuild rules

`js/state.js` contains one shared state object with UI state and interaction state.

UI state:

- `mode`
- `indent`
- `angleDeg`
- `cells`
- `keyDia`
- `showSides`
- `showNumbers`
- `showLetters`
- `keyToDot`
- `sideKeys`

Interaction state:

- `activeDots`
- `kbHeld`
- `wasKbChording`
- `typed`
- `sidePressed`

Persisted settings are stored in `localStorage` under `braille-keyboard-visualiser.settings`.

These changes rebuild the device from scratch:

- `mode`
- `angleDeg`
- `cells`
- `keyDia`
- `showSides`

These changes update existing meshes in place:

- `indent`
- `showNumbers`
- `showLetters`
- pressed or held interaction state

## Device build flow

High-level flow in `js/device/controller.js`:

```text
buildDevice()
  -> dispose old root children
  -> calculate device metrics
  -> build body
  -> build braille cells
  -> build key indents
  -> build side buttons
  -> build tilt pivot
  -> add support if required
  -> restore overlays and pressed state
```

The important detail is that the deck tilts around its front edge in `triangular` mode. In `integrated` mode the tilt angle is `0`, so the body sits flat.

## Where to debug what

### Braille dot positions

Edit `js/config.js`.

- `DOT_POSITIONS` defines logical dot numbering.
- `getDotOffset()` defines rendered 3D placement.

If the keyboard looks upside down or the rows are flipped, start there.

### Key mesh shape

Edit `js/device/cell.js`.

That file owns:

- the cylinder body for each key
- the rounded cap
- dot number labels
- letter preview labels

### Support geometry

Edit `js/device/supports.js`.

For current behaviour, also inspect `addSupport()` in `js/device/controller.js`, because that decides whether support geometry is added at all.

### Side buttons

Edit `js/device/layout.js`.

That file owns:

- side action buttons
- interactive raycast target collection
- pressed-depth interpolation helper

### Pressed-state visuals

Mostly in `js/device/controller.js`.

Useful functions:

- `setDotPressed()`
- `applyIndent()`
- `restoreDotVisuals()`
- `restoreSideVisuals()`
- `updateAnimations()`

### Scene, camera, and lighting

Edit `js/scene.js`.

Useful notes:

- camera presets live in `CAMERA_VIEWS`
- screenshot support depends on `preserveDrawingBuffer: true`
- `addGround()` exists but is not currently used

### UI wiring

For panel controls, usually edit both:

- `index.html` for markup
- `js/ui.js` for DOM lookup and event binding

## Input model

Dot input defaults to a Perkins-style layout, and both the six braille dot keys and the two side-button keys are configurable from the control panel and persist across sessions.

```text
F D S -> dots 1 2 3
J K L -> dots 4 5 6
A     -> left side button
;     -> right side button
Space -> commit chord or insert space
Esc   -> clear current chord
Backspace -> delete last typed character
```

Keyboard remapping rules:

- each dot and side button must use a unique single printable key
- remap handling lives in `js/ui.js`
- keyboard chord handling still lives in `js/interactions.js`

Keyboard event handling and pointer picking both live in `js/interactions.js`. Raycast targets are created in `js/device/layout.js`.

## Rendering notes

- Three.js is loaded globally from unpkg.
- `OrbitControls` comes from the legacy non-module build attached to `THREE`.
- The renderer uses shadows, ACES tone mapping, and `preserveDrawingBuffer`.
- The render loop continuously updates controls and pressed-key animation.

If you change how Three.js is loaded, expect `index.html` and `js/deps.js` to need coordinated changes.

## Common changes

### Add a new control

Usually update:

- `index.html`
- `js/ui.js`
- `js/state.js` if it needs persisted state
- `js/device/controller.js` if it affects geometry or overlays

For controls that should survive reloads, also make sure `persistSettings()` and the settings sanitising in `js/state.js` are updated together.

### Change keyboard defaults or remap rules

Usually update:

- `js/config.js` for `DEFAULT_KEY_TO_DOT` and `DEFAULT_SIDE_KEYS`
- `js/ui.js` for remap UI behaviour and validation
- `js/state.js` for persisted key-map sanitising
- `js/interactions.js` if keyboard handling rules change

### Change braille mapping

Edit `BRAILLE_MAP` in `js/config.js`.

`LETTER_TO_DOTS` is derived from it, so do not maintain a second handwritten mapping.

### Change camera presets

Edit `CAMERA_VIEWS` in `js/scene.js`.

### Restyle the interface

Edit `styles.css`, but keep these constraints:

- flat colours only
- no gradients or glossy effects
- use spacing and layering for depth
- keep alignment structured, with asymmetry only when it improves the layout
