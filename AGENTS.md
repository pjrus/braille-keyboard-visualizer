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

Use Node.js 20.9 or newer. Run `npm run format:check`, `npm run typecheck`, `npm run lint` and `npm test` before building. The GitHub Actions workflow checks formatting, types, lint and automated tests before building the application.

## Architecture reference

Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing component boundaries,
state flow, scene lifecycle or device rebuild rules. Keep this file focused on
project conventions and task-specific instructions rather than duplicating that overview.

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
