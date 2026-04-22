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
  - spacing guides
  - ghost finger placement
- Keyboard chord input with a configurable dot-key mapping
- Click or tap interaction on the 3D model
- Camera presets for ergonomic, top, and side views
- PNG screenshot export
- Local settings persistence with `localStorage`

## Tech Stack

- Plain HTML, CSS, and JavaScript
- [Three.js](https://threejs.org/) loaded from a CDN
- A tiny zero-dependency Node static server for local development

There is no build step, bundler, or framework.

## Getting Started

### Requirements

- Node.js 18+ is recommended

### Run locally

```bash
npm install
npm start
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

- `Triangular` uses a dedicated triangular shell and layout definition
- `Integrated` uses a rectangular body with its own layout definition

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
        ├── modes.js
        ├── integratedBody.js
        ├── integratedLayout.js
        ├── triangularBody.js
        └── triangularLayout.js
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
- [`js/device/modes.js`](js/device/modes.js) selects the active mode layout
- [`js/device/integratedBody.js`](js/device/integratedBody.js) defines the integrated shell geometry
- [`js/device/integratedLayout.js`](js/device/integratedLayout.js) defines integrated control placement
- [`js/device/triangularBody.js`](js/device/triangularBody.js) defines the triangular shell geometry
- [`js/device/triangularLayout.js`](js/device/triangularLayout.js) defines triangular control placement

This split keeps each mode self-contained and makes it easier to add more body/layout modes later.

## Settings Persistence

The app stores the following in browser `localStorage`:

- layout mode
- geometry settings
- overlay toggles
- custom dot-key mapping

Stored values are validated before use, so invalid settings fall back safely to defaults.

## Development Notes

- The app is served as static files from [`server.js`](server.js)
- Three.js and `OrbitControls` are loaded in [`index.html`](index.html) via CDN
- Since there is no build step, edits can be tested by refreshing the page

## Future Extension

The current mode system already separates:

- body geometry
- control layout
- shared device behaviour

To add a new mode later, the intended pattern is:

1. Add a new `*Body.js`
2. Add a new `*Layout.js`
3. Register the mode in [`js/device/modes.js`](js/device/modes.js)

## Licence

No licence file is included in this repository yet.
