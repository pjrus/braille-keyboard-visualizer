import { buildIntegratedBody } from "./integratedBody.js";
import { DeviceMode } from "./mode.js";

const BODY_DEPTH = 3.2;
const BODY_HEIGHT = 0.68;
const DOT_BASE_OFFSET = 0.8;
const SIDE_BASE_OFFSET = 0.2;
const SIDE_HEIGHT = 0.3;

// Thumb pad geometry and placement
const THUMB_OFFSET_X = 0.50;
const THUMB_OFFSET_Z = 1.10;
const THUMB_WIDTH = 0.90; // x extent (wide axis)
const THUMB_DEPTH = 0.40; // z extent (narrow axis)

// Diagonal staircase key positions matching the reference layout:
// each hand's three keys step from inner-back to outer-front.
const HABLE_DOT_OFFSETS = Object.freeze({
  1: { x: -0.30, z: -0.55 },
  2: { x: -0.67, z: -0.02 },
  3: { x: -1.00, z:  0.52 },
  4: { x:  0.30, z: -0.55 },
  5: { x:  0.67, z: -0.02 },
  6: { x:  1.00, z:  0.52 },
});

export class HableMode extends DeviceMode {
  buildBody(materials) {
    return buildIntegratedBody(this.metrics, materials);
  }

  createLayout() {
    const bodyHeight = this.metrics.bodyHeight ?? BODY_HEIGHT;

    return {
      bodyDepth: this.metrics.bodyDepth ?? BODY_DEPTH,
      bodyHeight,
      controlSurfacePositionY: bodyHeight,
      controlSurfaceRotationX: 0,
      dotBaseOffset: DOT_BASE_OFFSET,
      dotRotationX: 0,
      sideBaseOffset: SIDE_BASE_OFFSET,
      sideHeight: SIDE_HEIGHT,
      sideIndentFactor: 1,
      sideOffsetZ: THUMB_OFFSET_Z,
      sideRotationX: 0,
    };
  }

  getDotOffset(position) {
    return HABLE_DOT_OFFSETS[position.number];
  }

  // Thumb pads sit side-by-side near the front edge rather than on the sides.
  getSideButtonSpec(direction) {
    return {
      baseY: this.getSideBaseY(),
      depth: THUMB_DEPTH,
      height: SIDE_HEIGHT,
      offsetX: direction * THUMB_OFFSET_X,
      offsetZ: THUMB_OFFSET_Z,
      rotationX: 0,
      width: THUMB_WIDTH,
    };
  }

  getTiltAngle() {
    return 0;
  }
}
