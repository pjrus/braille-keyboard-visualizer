import type { DotPosition } from "@/lib/types/device";
import { DeviceMode } from "./deviceMode";

const BODY_DEPTH = 3.2;

// Thumb pad geometry and placement
const THUMB_OFFSET_X = 0.50;
const THUMB_OFFSET_Z = 1.10;
const THUMB_WIDTH = 0.90; // x extent (wide axis)
const THUMB_DEPTH = 0.40; // z extent (narrow axis)

// Diagonal staircase key positions matching the reference layout:
// each hand's three keys step from inner-back to outer-front.
const HABLE_DOT_OFFSETS: Readonly<Record<number, { x: number; z: number }>> = Object.freeze({
  1: { x: -0.30, z: -0.55 },
  2: { x: -0.67, z: -0.02 },
  3: { x: -1.00, z: 0.52 },
  4: { x: 0.30, z: -0.55 },
  5: { x: 0.67, z: -0.02 },
  6: { x: 1.00, z: 0.52 },
});

export class HableMode extends DeviceMode {
  createLayout() {
    return {
      ...super.createLayout(),
      bodyDepth: this.metrics.bodyDepth ?? BODY_DEPTH,
      sideOffsetZ: THUMB_OFFSET_Z,
    };
  }

  getDotOffset(position: DotPosition) {
    // Each hand keeps its conventional dot numbering while following a mirrored diagonal staircase.
    return HABLE_DOT_OFFSETS[position.number];
  }

  // Thumb pads sit side-by-side near the front edge rather than on the sides.
  getSideButtonSpec(direction: number) {
    return {
      baseY: this.layout.sideBaseOffset,
      depth: THUMB_DEPTH,
      height: this.layout.sideHeight,
      offsetX: direction * THUMB_OFFSET_X,
      offsetZ: THUMB_OFFSET_Z,
      width: THUMB_WIDTH,
    };
  }
}
