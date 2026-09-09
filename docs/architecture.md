# Braille Keyboard Visualiser — Architecture

This document explains the layering, module boundaries, data flow and lifecycle rules of the Braille Keyboard Visualiser. See [AGENTS.md](../AGENTS.md) for project conventions and common changes.

## Stack

- Next.js 16.2.10 with React 19.2.7 (App Router, `"use client"` boundary in components/)
- Three.js 0.183.1 from npm (browser-only)
- Plain JavaScript, no TypeScript
- Node.js >= 20.9
- Plain CSS in app/globals.css; no CSS-in-JS

## Rendering boundary

app/page.js is a server component. It renders a single client component, BrailleKeyboardVisualiser, which owns all React state and UI logic.

KeyboardScene (the Three.js view) is imported via next/dynamic with ssr:false. This keeps the Three.js bundle out of the server and initial SSR HTML. The loading placeholder reads "Preparing the 3D keyboard…".

All browser APIs (canvas, WebGL, window, document) live behind the `"use client"` boundary, which starts in components/. The js/ modules are browser-only and import no React.

## Component tree and state ownership

~~~
<main> (BrailleKeyboardVisualiser — "use client")
  <section>
    <KeyboardScene /> (dynamic, ssr:false)
      <canvas />
      <OrbitGizmo />   (replaced by .webgl-fallback when WebGL is unavailable)
    </KeyboardScene>
    <KeyboardHud />
  </section>
  <ControlPanel />
</main>
~~~

**BrailleKeyboardVisualiser** owns all React state:
- settings: the merged persistent config object
- hud: { dots, letter, typed } — what the HUD displays
- cameraView: the current camera preset name
- hasLoadedSettings: hydration guard
- isSceneReady: gates the screenshot button

It also holds one ref, `sceneApiRef` — not state. KeyboardScene writes its imperative handle (saveScreenshot, setView) into `sceneApiRef.current` on mount and nulls it on unmount. Because a ref write does not re-render, the separate `isSceneReady` state exists to drive the button's disabled attribute.

Hydration: the first render uses createDefaultSettings() so server and client markup match. loadSettings() runs in a post-mount useEffect and sets hasLoadedSettings. A second useEffect watches hasLoadedSettings and persists on every change, but only if hasLoadedSettings is true. This guards against overwriting stored data with pre-load defaults.

## Settings flow

Settings are a small nested object:
- `mode` — the active layout mode
- `modeGeometry` — `{ [mode]: { indent, angleDeg, keyDia } }`, one geometry record per mode
- `cells` — cell count (session-only; see below)
- `showSides`, `showNumbers`, `showLetters` — overlay and visibility flags
- `keyToDot`, `sideKeys` — the key mappings

All of these except `cells` persist to localStorage under `braille-keyboard-visualiser.settings` via persistSettings(). `cells` is deliberately omitted from the persisted payload, so it resets to 1 on reload.

Validation runs at two different points:

- **On write, key bindings only.** getKeymapValidationError() rejects a rebind that is not a single printable key, or that collides with an existing dot or side-button assignment; the change is discarded and an error string is returned to the control panel. No other setting is validated on write.
- **On read, everything.** loadSettings() runs sanitiseSettings(), which checks each mode's geometry (indent −1…1, angleDeg 0…35, keyDia 0.4…0.62), coerces the booleans, and falls back to the default key maps if the stored maps are incomplete, duplicated or conflicting.

Settings flow down to KeyboardScene as sceneSettings (a flattened, mode-agnostic copy created by createSceneSettings). Key mappings are read live off the runtime state object by the interaction controller, so remapping is instant; no scene rebuild needed.

## Runtime state

KeyboardScene creates a single mutable runtime state object once on mount:

~~~javascript
{
  ...settings,                     // flattened scene settings: top-level flags
                                   // plus the active mode's geometry
  activeDots: Set<number>,         // active dot indices (1–6)
  kbHeld: Set<number>,             // dot numbers currently held via the keyboard
  wasKbChording: boolean,          // a chord is in progress; commits when kbHeld empties
  typed: string,                   // output so far
  sidePressed: { left, right },    // side button states
}
~~~

This object is **never replaced**, only mutated. It is shared by reference with the device and interaction controllers. When settings change from React, Object.assign(state, settings) merges the new values in place.

The interaction controller publishes state changes to React via onStateChange({ dots, letter, typed }), which updates the HUD. The scene does not subscribe to DOM state; it reads everything from the mutable object.

## Rebuild rules

The sync effect takes one of two branches. If requiresRebuild is true — mode, angleDeg, keyDia, cells or showSides changed — it calls device.buildDevice() and re-centres the camera with sceneController.setTarget(device.getFocusTarget()). buildDevice() re-applies indent and overlays itself via syncBuiltDevice().

Otherwise it applies in-place mesh updates: device.applyIndent() if indent changed, and device.applyOverlays() if showNumbers or showLetters changed.

Key mapping changes (keyToDot, sideKeys) need neither branch; the interaction controller reads them live off the mutable state object.

**Critical:** requiresRebuild is a hand-maintained key list in keyboard-scene.jsx. A new geometry setting must be added to it manually.

## Scene, camera and lighting

Renderer: WebGLRenderer with antialias:true, preserveDrawingBuffer:true. Pixel ratio clamped to min(devicePixelRatio, 2). Shadows enabled (PCFShadowMap, SRGBColorSpace, ACESFilmicToneMapping @ 1.15 exposure).

Camera: PerspectiveCamera, fov 38, near 0.1, far 200. Initial position [1, 5, 3], target [0, 0, 0].

Controls: OrbitControls with damping (0.08), minDistance 3, maxDistance 20, polar angle clamped near zero and pi.

Lighting rig: four lights:
- Hemisphere light (0xffffff, 0xb7bfcb, intensity 0.55)
- Key directional light (0xffffff, intensity 2.4) at [4.5, 8, 3.5], shadow-casting, 2048x2048 shadow map
- Rim light (0xdce4ff, intensity 0.7) at [-5, 3, -4]
- Fill light (0xfff0e0, intensity 0.35) at [0, 2, 6]

There is no ground plane or shadow-catcher mesh.

## Lifecycle and disposal

KeyboardScene is rendered unconditionally and stays mounted for the app lifetime; nothing unmounts or re-keys it. Its main effect has an empty dependency array, so it runs once per mount — but React StrictMode replays it in development, which is why the cleanup path must be genuinely reusable (see the forceContextLoss rule below). If supportsWebGL() fails the effect returns immediately, sets the fallback flag, and none of the setup below happens.

On a successful mount the effect sets up:

1. WebGL detection via supportsWebGL() — rejects degraded/software contexts
2. Scene, renderer, camera, controls
3. Device geometry
4. Interaction handler
5. ResizeObserver or fallback window resize listener
6. Animation frame loop

On unmount, the cleanup function:
- Cancels animation frame
- Disconnects resize observer
- Removes event listeners
- Calls interaction.dispose(), device.dispose(), sceneController.dispose()

**Critical rule:** do not call renderer.forceContextLoss(). React development mode replays effects, and a forced context loss prevents the next renderer initialisation in Chrome. sceneController.dispose() calls controls.dispose() and renderer.dispose() only, which is sufficient. There is no comment at the disposal site, so this rule is easy to "fix" away by accident — see also AGENTS.md.

## Module conventions

### Dependency direction (strictly one-way)

~~~
app/        → components/
components/ → lib/, js/
lib/        → js/config.js only (no React, no Three.js)
js/device/  → js/deps.js, js/config.js, js/utils.js (no React)
js/         → js/deps.js (the single `three` import point)
~~~

Nothing in js/ or lib/ imports React or anything from components/. lib/visualiser-settings.js reaches into js/config.js for the default key maps and dot numbers; that is the only lib/ → js/ edge.

No module imports `three` directly. js/deps.js is the single entry point — it re-exports THREE and OrbitControls — and every module that needs Three.js imports from there. Several modules (js/config.js, the per-mode geometry factories, and the modes.js and device.js barrels) need no Three.js at all.

js/device.js is a one-line barrel exporting createDeviceController. js/config.js holds braille mappings and input defaults. js/utils.js has shared geometry and disposal helpers.

js/device/ holds: controller.js (build, apply, pick, animate), mode.js (the DeviceMode base class), modes.js (a barrel mapping a mode name to its factory), the four factories triangularMode.js / integratedMode.js / arcMode.js / hableMode.js, the two body builders triangularBody.js / integratedBody.js, plus cell.js (dot mesh), layout.js (side buttons, pick targets, Y animation) and materials.js.

### Files to know

- **app/layout.js**: metadata, global styles
- **app/page.js**: server entry point, renders BrailleKeyboardVisualiser
- **app/globals.css**: all application styling
- **components/braille-keyboard-visualiser.jsx**: React state hub, composition
- **components/keyboard-scene.jsx**: Three.js lifecycle, mutable state, rebuild logic
- **components/control-panel.jsx**, **keyboard-hud.jsx**, **orbit-gizmo.jsx**: UI fragments
- **lib/visualiser-settings.js**: schema validation and localStorage I/O
- **js/scene.js**: renderer, camera, controls, lighting, animation
- **js/interactions.js**: keyboard and pointer input, HUD updates
- **js/device/**: geometry modes, materials, cell rendering
- **js/config.js**: braille mappings, key defaults, constants
- **js/deps.js**: Three.js + OrbitControls import point

### Code style notes

- No TypeScript; no linter; no test framework
- Comments only on non-obvious logic
- Prefer focused, reusable functions over new layers
- The only build check is `npm run build`

## Building and verifying

~~~bash
npm ci
npm run build
~~~

**Local development:**

~~~bash
npm run dev
~~~

Opens at http://localhost:3000 with Turbopack.

**Production build:**

~~~bash
npm run build
npm start
~~~

**CI:** verify.yml runs on main pushes. It runs Node 22, npm ci, npm run build. nextjs.yml builds and deploys to GitHub Pages on Node 20.

The repo has no next.config file, so a local `npm run build` and `npm start` run the default server build. The Pages workflow differs: it runs `actions/configure-pages` with `static_site_generator: next`, which injects Next configuration (including the Pages basePath) before building, and the deploy step then uploads `./out`. If you add a next.config by hand, keep that difference in mind — the Pages deploy expects a static export in `./out`.

## Related documentation

- **[AGENTS.md](../AGENTS.md)**: project conventions, common changes, input model
- **[User guide](user-guide.md)**: controls, features and how to use the app
- **[Layout modes](layout-modes.md)**: geometry and specifications for each device mode
- **[Settings and persistence](settings-and-persistence.md)**: the settings schema, validation and storage format
