# Layout Modes

The device supports four keyboard layout modes, each defining how the braille dots and side buttons are positioned in 3D space. Each mode is a subclass of `DeviceMode` that implements its own geometry, surface orientation and dot placement.

## The Mode Abstraction

The `DeviceMode` class (`js/device/mode.js`) is abstract and cannot be instantiated directly. Each subclass must implement these four methods:

- **createLayout()**: Returns an object with control surface position, rotation, and base offsets. Called once in the constructor and cached on `this.layout`.
- **buildBody()**: Creates and returns the physical device body as a THREE.Mesh.
- **getDotOffset(position)**: Maps a braille dot position (with number 1–6) to local coordinates `{ x, z }` on the control surface.
- **getTiltAngle(angleDeg)**: Returns the rotation (in radians) to tilt the device. Only Triangular honours this; others return 0.

The base class also provides:

- **createControlSurface()**: Builds the surface group using layout properties (positioned at `controlSurfacePositionY` with rotation `controlSurfaceRotationX`).
- **buildCell()**: Builds a cell group of six key cylinders, each with a squashed hemispherical cap, positioned by the mode's `getDotOffset()`.
- **getSideButtonSpec(direction, bodyWidth, bodyDepth)**: Default side button positions (small buttons on the sides). Modes can override this.

The transform chain is: root → pivot (tilt) → deck → controlSurface → cellsGroup → cell → key → cap. Dot offsets are in control-surface local space, so they inherit the surface's rotation and height.

## Shared Constants

All modes use these from `js/config.js`:

- DOT_SPACING = 0.7 — the shared 2×3 grid pitch, used only by Triangular and Integrated (Arc and Hable use absolute offset tables)
- KEY_HEIGHT = 0.12
- KEY_RISE_MAX = 0.14 (indent range)
- PRESS_DEPTH = 0.09 (how far dots move down when pressed)

## The Four Modes

### Triangular

- **Body**: Wedge (triangular extrusion along the width axis).
- **Dimensions**: depth 2.4, height 0.82.
- **Surface**: Sloped at ~18.9° (atan2(0.82, 2.4)), positioned at height 0.41.
- **Dot layout**: Uses the shared 2×3 braille grid from `getDotOffset()`, centred at control-surface origin.
- **Tilt**: The ONLY mode where `getTiltAngle()` uses the `angleDeg` parameter. Others always return 0.
- **Side buttons**: Small rectangles on the sides at Z offset 0. Their vertical response to the indent slider is scaled by `sideIndentFactor` = 0.25, so they rise or sink at a quarter of the dots' rate (the other three modes use 1).

### Integrated

- **Body**: Flat rounded slab (extruded rounded rectangle, corner radius 0.38, bevel 0.07).
- **Dimensions**: depth 2.4, height 0.68.
- **Surface**: Flat (rotationX = 0), positioned at height 0.68.
- **Dot layout**: Shared 2×3 grid at the same positions as Triangular.
- **Side buttons**: Small buttons on the sides at Z offset 0.
- **Note**: Also serves as the fallback mode when an unknown mode string is passed.

### Arc

- **Body**: Reuses Integrated's slab body.
- **Dimensions**: depth 3.9 (wider to accommodate splayed layout).
- **Surface**: Flat, positioned at height 0.68.
- **Dot layout**: Hard-coded mirror-symmetric fanned table: each hand's keys splay outward and backward. Dots are NOT in the shared grid.
- **Side buttons**: Replaced by wide, shallow thumb bars. `getSideButtonSpec()` calls `super` then swaps the two axes: width (X) = `min(bodyDepth × 0.62, 1.5)` = 1.5, depth (Z) = 0.34 (the base class's `sideWidth`), height 0.3.
- **Thumb bar position**: ±0.96 in X — `ARC_THUMB_BASE_X` (0.82) plus `ARC_HALF_GAP_X` (0.14), so the bars track their dot group when the halves are pushed apart — and Z −0.82 (`THUMB_ROW_OFFSET_Z`, dot 3's z of −0.14 minus `DOT_TO_THUMB_GAP` 0.68).
- **Export**: `ARC_HALF_GAP_X` is imported by `controller.js` to widen the device body.

### Hable

- **Body**: Reuses Integrated's slab body.
- **Dimensions**: depth 3.2 (wider than Integrated, narrower than Arc).
- **Surface**: Flat, positioned at height 0.68.
- **Dot layout**: Hard-coded diagonal staircase table: each hand's three keys step from inner-back to outer-front (outward in X, forward in Z), roughly mirroring Arc's Z progression. Dots are NOT in the shared grid.
- **Side buttons**: Two thumb PADS side-by-side near the front edge (width 0.90, depth 0.40). Centred at ±0.50 in X, positioned at Z 1.10. Fully replaces the base class spec.

## Adding a Mode

To add a new mode:

1. Create a new file `js/device/yourMode.js` (files in `js/device/` use lowercase-initial camelCase, for example `arcMode.js`) as a subclass of `DeviceMode`:
   ~~~javascript
   import { DeviceMode } from "./mode.js";

   export class YourMode extends DeviceMode {
     createLayout() {
       // Return { bodyDepth, bodyHeight, controlSurfacePositionY, controlSurfaceRotationX,
       //          dotBaseOffset, dotRotationX, sideBaseOffset, sideHeight,
       //          sideIndentFactor, sideOffsetZ, sideRotationX }
       // sideIndentFactor is REQUIRED — it has no default, and omitting it makes the
       // side buttons' baseY NaN in applyIndent(). Use 1 for a flat deck, or a smaller
       // value (Triangular uses 0.25) to damp their response to the indent slider.
     }

     buildBody(materials) {
       // Return a THREE.Mesh using materials.body
     }

     getDotOffset(position) {
       // Return { x, z } for position.number (1–6)
     }

     getTiltAngle(angleDeg) {
       // Return radians, or 0 if no tilt
     }
   }
   ~~~

2. Register it in `js/device/modes.js`:
   ~~~javascript
   import { YourMode } from "./yourMode.js";

   const MODE_CLASSES = Object.freeze({
     // ... existing modes ...
     yourmode: YourMode,
   });
   ~~~

3. Add the string to `MODES` in `lib/visualiser-settings.js`:
   ~~~javascript
   export const MODES = Object.freeze(["triangular", "integrated", "arc", "hable", "yourmode"]);
   ~~~

4. Add an option to `MODE_OPTIONS` in `components/control-panel.jsx`:
   ~~~javascript
   const MODE_OPTIONS = Object.freeze([
     // ... existing options ...
     { value: "yourmode", label: "Your Mode" },
   ]);
   ~~~

5. Update the selector grid. The container in `components/control-panel.jsx` uses the class `segmented-control--four`, defined in `app/globals.css`. Add or switch to a rule matching the new mode count.

## Geometry and Materials

- **Cells**: Each cell is a group of six key cylinders (radius from `state.keyDia`), each with a squashed hemispherical cap child. Also holds hidden number and letter sprites.
- **Indent**: Rise = `indent × KEY_RISE_MAX` (±0.14). Keys squash vertically when indent < 0. The cap becomes hidden at indent < −0.2, producing a recessed "dimple" look.
- **Press**: Dots move down by `PRESS_DEPTH` (0.09); side buttons by 0.05.
- **Animation**: `updateAnimations()` uses fixed lerp factors (0.28 for dots, 0.32 for side buttons) and snaps within 0.0005. **Frame-rate dependent** — no delta-time scaling.
- **Materials**: Created once per controller and SHARED by all meshes. Pressing a key swaps the material reference; it does not clone. Geometries are per-mesh and disposed on rebuild.
- **Picking**: `buildInteractiveTargets()` collects all meshes under cells plus side buttons. The device body is NOT clickable. Raycasting walks up parents to find the first `userData.kind` ("dot", "side-left", "side-right"), so a cap hit resolves to its owning dot.

## Known Constraints

- **angleDeg inert**: Only Triangular mode honours the tilt angle; the other three modes ignore it and always return 0 from `getTiltAngle()`.
- **Multi-cell support partial**: Code exists to render multiple cells (via `metrics.pitch`), but `cells` is hardcoded to 1 with no UI control. Arc and Hable use absolute dot tables that would overlap at a 1.45 cell pitch.
- **materials.hand unused**: Allocated but never assigned to any mesh in the current code.

For more on the app architecture and settings, see `docs/architecture.md` and `docs/settings-and-persistence.md`.
