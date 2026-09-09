# Documentation

Reference documentation for the Braille Keyboard Visualiser. Read in this order.

1. **[User guide](user-guide.md)** — what the application does and how to drive it:
   layout modes, geometry controls, overlays, chord typing, shortcut remapping,
   camera presets and screenshots.

2. **[Architecture](architecture.md)** — how the application is put together: the
   server/client boundary, React state ownership, the mutable runtime state shared
   with the renderer, rebuild rules, and the scene lifecycle and disposal rules.

3. **[Layout modes](layout-modes.md)** — the `DeviceMode` abstraction, the geometry of
   the four modes, the key press and indent animation, and how to add a mode.

4. **[Settings and persistence](settings-and-persistence.md)** — the settings schema,
   defaults and ranges, validation semantics, legacy migration and the exported API.

For project conventions and the development workflow, see [AGENTS.md](../AGENTS.md).
For a short overview and setup instructions, see [README.md](../README.md).

## Scope

These documents describe the application as it is implemented. Where behaviour is
constrained or incomplete, it is recorded in the relevant document rather than
omitted — for example the incline angle applying only to Triangular mode, and the
cell count being fixed at one with no interface control.

There is no test framework, linter or type checker in this project. The only
automated check is the production build:

~~~bash
npm run build
~~~
