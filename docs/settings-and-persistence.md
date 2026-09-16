# Settings and Persistence

Settings control the keyboard layout mode, geometry, visibility overlays and key bindings. They are stored to localStorage and restored on page reload, with fallback to defaults when storage is unavailable.

## Settings schema

The complete settings object holds seven persisted fields plus a non-persisted field:

| Field | Type | Notes |
|-------|------|-------|
| `mode` | string | One of `"triangular"`, `"integrated"`, `"arc"`, `"hable"` |
| `modeGeometry` | object | Geometry values keyed by mode name, each holding `{indent, angleDeg, keyDia}` |
| `showSides` | boolean | Show or hide side action buttons |
| `showNumbers` | boolean | Show or hide dot numbers 1–6 |
| `showLetters` | boolean | Show or hide letter mapping overlay (A–J preview) |
| `keyToDot` | object | Map from keyboard key to dot number, e.g. `{f: 1, d: 2, s: 3, j: 4, k: 5, l: 6}` |
| `sideKeys` | object | Map `{left: "a", right: ";"}` for the side action buttons |
| `cells` | number | Non-persisted; always 1. No UI control exists |

## Defaults and geometry ranges

### Defaults

~~~javascript
mode: "triangular"
cells: 1
showSides: true
showNumbers: false
showLetters: false
keyToDot: {f: 1, d: 2, s: 3, j: 4, k: 5, l: 6}
sideKeys: {left: "a", right: ";"}

// Each mode gets this geometry:
modeGeometry: {
  triangular: {indent: 0.35, angleDeg: 16, keyDia: 0.52},
  integrated: {indent: 0.35, angleDeg: 16, keyDia: 0.52},
  arc: {indent: 0.35, angleDeg: 16, keyDia: 0.52},
  hable: {indent: 0.35, angleDeg: 16, keyDia: 0.52}
}
~~~

### Geometry ranges

| Property | Min | Max | UI step |
|----------|-----|-----|---------|
| `indent` | −1 | 1 | 0.01 |
| `angleDeg` | 0 | 35 | 0.5 |
| `keyDia` | 0.4 | 0.62 | 0.01 |

The UI enforces its step value for usability, but off-step values can exist if storage is hand-edited.

## Validation semantics

Validation does **not clamp** out-of-range values—it **falls back to the default**. For example, a stored `keyDia` of 0.9 becomes 0.52, not 0.62.

### Type strictness

- Numeric fields (`indent`, `angleDeg`, `keyDia`) require `typeof number` and must pass `Number.isNaN()` check. Numeric strings like `"0.5"` are rejected outright.
- Boolean fields (`showSides`, `showNumbers`, `showLetters`) require `typeof boolean`.

### Keymap validation (all-or-nothing)

Both maps are validated as complete units, with different checks:

- `keyToDot` resets entirely if the entry count is not 6, or any key is unassignable, any dot falls outside 1–6, or any key or dot is duplicated.
- `sideKeys` resets entirely if `left` or `right` is missing or unassignable, or both name the same key. Extra properties are ignored rather than rejected, because validation iterates `SIDE_NAMES`.

If a key appears in both `keyToDot` and `sideKeys`, **both maps reset together**.

### Key assignability

Only single-character, printable keys are assignable via `normaliseDotKey()`:
- Input must be a single character (`length === 1`)
- The character is lowercased; `trim()` is used only as an emptiness test, so a whitespace character (including Space) returns `null` rather than being stripped
- Invalid keys reset the affected map

## Persistence and SSR safety

### Storage location

Settings are stored at the key `"braille-keyboard-visualiser.settings"` in `window.localStorage`.

### SSR and private browsing

- `loadSettings()` returns defaults when `typeof window === "undefined"` (server-side render)
- `persistSettings()` no-ops when `typeof window === "undefined"`
- Both functions wrap localStorage access in try/catch to handle private or restricted browsing

### Exclusion of `cells`

The field `cells` is **deliberately excluded** from `persistSettings()`. The function writes exactly seven fields: `mode`, `modeGeometry`, `showSides`, `showNumbers`, `showLetters`, `keyToDot`, `sideKeys`. Since `sanitiseSettings()` spreads defaults first, unknown stored keys are dropped and `cells` always resets to 1.

## Per-mode geometry

Geometry (indent, angleDeg, keyDia) is stored separately for each mode in `modeGeometry`. Switching modes restores that mode's own previously configured values.

## Legacy migration

Migration is split across two functions. `getStoredModeGeometry()` recognises the first two shapes below; `sanitiseModeGeometry()` handles the third through its `storedGeometry?.[mode] || rawSettings` fallback:

1. **Current format**: `modeGeometry` object with per-mode geometry
2. **Per-mode objects**: Mode names at the top level (e.g., `{triangular: {...}, integrated: {...}}`)
3. **Flat geometry**: A single `{indent, angleDeg, keyDia}` at the top level, copied into all four modes

There is no schema version field, so incompatible future changes have no upgrade hook beyond falling back to defaults.

## Exported API

### From `lib/visualiser-settings.js`

| Export | Type | Purpose |
|--------|------|---------|
| `STORAGE_KEY` | string | localStorage key |
| `MODES` | array | Valid mode names |
| `createDefaultSettings()` | function | Return a fresh defaults object |
| `loadSettings()` | function | Load from storage or return defaults |
| `persistSettings(settings)` | function | Write to storage (no-op on SSR/private browsing) |
| `getActiveGeometry(settings)` | function | Get geometry for the current mode |
| `createSceneSettings(settings)` | function | Flatten active geometry to top level for the renderer |
| `getKeymapValidationError(settings, binding, key)` | function | Validate a key binding; returns `""` if valid, user-facing error message otherwise |
| `normaliseKeyBinding(key)` | function | Normalise a key using `normaliseDotKey()` |
| `updateKeyBinding(settings, binding, key)` | function | Update a single binding and return new settings |

### From `js/config.js`

Settings-related exports only. The geometry constants are covered in [Layout Modes](layout-modes.md).

| Export | Purpose |
|--------|---------|
| `DEFAULT_KEY_TO_DOT` | Default keymap `{f: 1, d: 2, ...}` |
| `DEFAULT_SIDE_KEYS` | Default side buttons `{left: "a", right: ";"}` |
| `DOT_NUMBERS` | Array `[1, 2, 3, 4, 5, 6]` |
| `BRAILLE_MAP` | 26-letter braille chord map; keys are digit strings (e.g., `"145"` for D), values are uppercase letters |
| `LETTER_TO_DOTS` | Inverse of BRAILLE_MAP |
| `SIDE_NAMES` | Array `["left", "right"]`; drives `sideKeys` validation |
| `formatKeyLabel(key)` | Render a label: em dash `"—"` for a falsy key, an uppercased single character, otherwise the string unchanged |
| `normaliseDotKey(key)` | Single-char lowercase; returns `null` if invalid or whitespace-only |
| `isAssignableDotKey(key)` | Check if a key can be bound (uses `normaliseDotKey()`) |
| `createDotToKeyMap(keyToDot)` | Invert the keymap |

### Binding object structure

~~~javascript
{
  type: "dot" | "side",
  id: 1 | 2 | 3 | 4 | 5 | 6 | "left" | "right"
}
~~~

## Scene integration

`createSceneSettings()` flattens the active mode's geometry to the top level, so the Three.js renderer receives `indent`, `angleDeg`, and `keyDia` directly alongside `mode`, `showSides` and the key maps—without needing to look up `modeGeometry`.

## Known gaps

- **No schema version**: There is no stored schema version field. A future incompatible change to the settings format has no upgrade hook; only a fallback to defaults.
- **Corrupt keymap is all-or-nothing**: A single malformed entry in `keyToDot` or `sideKeys` discards all of the user's key customisation for that map.
- **Unused exports**: The constants `CELL_HEIGHT` and `KEY_BASE_OFFSET` in `js/config.js` are defined but have no consumers.

## Related documentation

- [User Guide](user-guide.md)—UI behaviour and keyboard controls
- [Layout Modes](layout-modes.md)—device geometry and layout specifications
- [Architecture](architecture.md)—scene lifecycle and renderer integration
