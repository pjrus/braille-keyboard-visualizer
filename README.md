# Braille Keyboard Visualiser

A small Three.js app for exploring a Hable-inspired braille keyboard layout in 3D.

It lets you switch between `triangular` and `integrated` body modes, adjust key geometry, preview braille chords, and type using a six-dot keyboard mapping plus two side actions.

## Features

- Two device modes:
  - `Triangular`: triangular shell with a sloped control face
  - `Integrated`: rectangular shell
- Adjustable geometry:
  - key indent
  - incline angle
  - key diameter
- Optional overlays:
  - side action buttons
  - dot numbers
  - letter mapping preview
- Keyboard chord input with a configurable dot-key mapping
- Click or tap interaction on the 3D model
- Camera presets for ergonomic, top, and side views
- PNG screenshot export
- Local settings persistence with `localStorage`

## Tech Stack

- Plain HTML, CSS, and JavaScript
- [Three.js](https://threejs.org/) loaded from a CDN
- Node.js with Express for local development

There is no build step, bundler, or framework.

## Getting Started

### Requirements

- Node.js 18+ is recommended

### Run locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

You can also run:

```bash
PORT=3000 npm start
```

## How to Use

### Layout modes

- `Triangular` uses a dedicated mode class with triangular shell and layout rules
- `Integrated` uses its own mode class with rectangular body and flat control surface

### Geometry controls

- `Key indent`: moves between recessed dimples and raised domes
- `Incline angle`: changes the overall device tilt
- `Key diameter`: changes the size of the six braille buttons

### Typing controls

Default dot keys:

- `F`, `D`, `S` for dots `1`, `2`, `3`
- `J`, `K`, `L` for dots `4`, `5`, `6`
- `A` for left side action
- `;` for right side action
- `Space` to commit the current chord
- `Esc` to clear the current chord
- `Backspace` to remove the last typed character

The dot-key mapping can be reassigned in the side panel. Side keys stay reserved.

### Mouse controls

- Drag to orbit
- Scroll to zoom
- Right-drag to pan

## Project Structure

```text
.
├── index.html
├── styles.css
├── server.js
└── js
    ├── app.js
    ├── config.js
    ├── interactions.js
    ├── scene.js
    ├── state.js
    ├── ui.js
    └── device
        ├── controller.js
        ├── cell.js
        ├── layout.js
        ├── materials.js
        ├── mode.js
        ├── modes.js
        ├── integratedBody.js
        ├── integratedMode.js
        ├── triangularBody.js
        └── triangularMode.js
```

## Architecture Notes

### App flow

- [`js/app.js`](js/app.js) wires together state, scene, device rendering, interactions, and UI bindings
- [`js/scene.js`](js/scene.js) creates the Three.js scene, lighting, camera, and orbit controls
- [`js/interactions.js`](js/interactions.js) handles keyboard and pointer input, chord commits, and HUD updates
- [`js/ui.js`](js/ui.js) binds panel controls and persists user settings
- [`js/state.js`](js/state.js) creates the app state and stores settings in `localStorage`

### Device system

- [`js/device/controller.js`](js/device/controller.js) builds and updates the current device
- [`js/device/mode.js`](js/device/mode.js) defines the abstract mode contract
- [`js/device/modes.js`](js/device/modes.js) resolves the active mode class
- [`js/device/integratedMode.js`](js/device/integratedMode.js) defines integrated layout and body behaviour
- [`js/device/triangularMode.js`](js/device/triangularMode.js) defines triangular layout and body behaviour

This split keeps each mode self-contained and makes it easier to add more body/layout modes later.

## Settings Persistence

The app stores the following in browser `localStorage`:

- layout mode
- geometry settings for each mode, so `triangular` and `integrated` keep separate values
- overlay toggles
- custom dot-key mapping

Stored values are validated before use, so invalid settings fall back safely to defaults. Older stored geometry values are also migrated into the per-mode format on load.

## Development Notes

- The app is served from [`server.js`](server.js) with Express
- Three.js and `OrbitControls` are loaded in [`index.html`](index.html) via CDN
- Local development includes automatic live reload when HTML, CSS, or JS files change

## GitHub Pages

This repo includes a GitHub Actions workflow at [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

- It deploys the static app to GitHub Pages on pushes to `main`
- It publishes `index.html`, `styles.css`, and the `js/` folder directly, with no build step
- If you add a repository secret named `PAGES_ENABLEMENT_TOKEN`, the workflow can also enable Pages on first deploy

To enable it in GitHub:

1. Open the repository settings
2. Go to `Pages`
3. Set `Source` to `GitHub Actions`

If Pages is not enabled yet and you want the workflow to do that for you, create a fine-grained token with `Pages: write` and repository administration access, then save it as `PAGES_ENABLEMENT_TOKEN`.

## Future Extension

The current mode system already separates:

- body geometry
- control layout
- shared device behaviour

To add a new mode later, the intended pattern is:

1. Add a new `*Mode.js` class extending [`js/device/mode.js`](js/device/mode.js)
2. Implement its body and layout behaviour
3. Register the mode in [`js/device/modes.js`](js/device/modes.js)

## Licence

No licence file is included in this repository yet.
