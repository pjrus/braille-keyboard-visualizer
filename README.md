# Braille Keyboard Visualiser

A component-based Next.js 16 application for exploring Hable-inspired braille
keyboard layouts in 3D.

## Features

- Four keyboard layouts: Triangular, Integrated, Arc and Hable
- Adjustable key indent, incline angle and key diameter
- Optional side buttons, dot labels and letter previews
- Configurable keyboard shortcuts with validated local persistence
- Clickable 3D dots, Perkins-style chord typing and side actions
- Camera presets, orbit controls and PNG screenshots
- A graceful message when WebGL is unavailable

## Stack

- Next.js 16 and React 19
- Three.js from npm, loaded only in the browser
- Plain CSS with flat colours and responsive layouts

## Getting started

Use Node.js 20.9 or newer.

~~~bash
npm install
npm run dev
~~~

Open http://localhost:3000.

Create a production build with:

~~~bash
npm run build
npm start
~~~

## Structure

~~~text
app/
  layout.js              Shared metadata and global styles
  page.js                Home route
components/
  braille-keyboard-visualiser.jsx
  control-panel.jsx
  keyboard-hud.jsx
  keyboard-scene.jsx
  orbit-gizmo.jsx
lib/
  visualiser-settings.js Persistence and validation
js/
  config.js              Braille data and input defaults
  scene.js               Camera, lighting and renderer
  interactions.js        Keyboard and pointer behaviour
  device/                Keyboard meshes and layout modes
~~~

## Input

The default Perkins-style mapping is:

~~~text
F D S  -> dots 1 2 3
J K L  -> dots 4 5 6
A      -> delete the previous character
;      -> add a space
Space  -> commit the active chord
Esc    -> clear the active chord
Backspace -> delete the previous character
~~~

Select a shortcut field in the control panel and press a printable key to
remap it. Mappings and visual preferences are stored locally in the browser.

## Development

The browser-only Three.js scene is dynamically imported, so server rendering
stays lightweight. React owns the controls and HUD; the renderer retains a small
mutable runtime state for responsive key animations.

Run npm run build before merging. The included GitHub Actions workflow performs
the same production build on pushes to main.
