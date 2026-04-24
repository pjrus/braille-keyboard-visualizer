import { buildIntegratedBody } from "./integratedBody.js";
import { DeviceMode } from "./mode.js";

const BODY_DEPTH = 3.9;
const BODY_HEIGHT = 0.68;
const DOT_BASE_OFFSET = 0.8;
const SIDE_BASE_OFFSET = 0.2;
const SIDE_HEIGHT = 0.3;
// Increase this to push the left and right halves further apart.
export const ARC_HALF_GAP_X = 0.14;
// Increase this to move the thumb bars further out with their matching dot groups.
export const ARC_THUMB_BASE_X = 0.82;
// Increase this to push the thumb bars further away from the braille keys.
const DOT_TO_THUMB_GAP = 0.68;

const ARC_DOT_OFFSETS = Object.freeze({
  1: { x: -0.36 - ARC_HALF_GAP_X, z: 0.92 },
  2: { x: -0.74 - ARC_HALF_GAP_X, z: 0.46 },
  3: { x: -1.02 - ARC_HALF_GAP_X, z: -0.14 },
  4: { x: 0.36 + ARC_HALF_GAP_X, z: 0.92 },
  5: { x: 0.74 + ARC_HALF_GAP_X, z: 0.46 },
  6: { x: 1.02 + ARC_HALF_GAP_X, z: -0.14 },
});
const THUMB_ROW_OFFSET_Z = ARC_DOT_OFFSETS[3].z - DOT_TO_THUMB_GAP;

export class ArcMode extends DeviceMode {
  buildBody(materials) {
    return buildIntegratedBody(this.metrics, materials);
  }

  createLayout() {
    const bodyHeight = this.metrics.bodyHeight ?? BODY_HEIGHT;

    return {
      bodyDepth: this.metrics.bodyDepth ?? BODY_DEPTH,
      bodyHeight: this.metrics.bodyHeight ?? BODY_HEIGHT,
      controlSurfacePositionY: bodyHeight,
      controlSurfaceRotationX: 0,
      dotBaseOffset: DOT_BASE_OFFSET,
      dotRotationX: 0,
      sideBaseOffset: SIDE_BASE_OFFSET,
      sideHeight: SIDE_HEIGHT,
      sideIndentFactor: 1,
      sideOffsetZ: THUMB_ROW_OFFSET_Z,
      sideRotationX: 0,
    };
  }

  getDotOffset(position) {
    return ARC_DOT_OFFSETS[position.number];
  }

  getSideButtonSpec(direction, bodyWidth, bodyDepth) {
    const spec = super.getSideButtonSpec(direction, bodyWidth, bodyDepth);

    return {
      ...spec,
      depth: spec.width,
      offsetX: direction * (ARC_THUMB_BASE_X + ARC_HALF_GAP_X),
      offsetZ: THUMB_ROW_OFFSET_Z,
      rotationX: 0,
      width: spec.depth,
    };
  }

  getTiltAngle() {
    return 0;
  }
}
