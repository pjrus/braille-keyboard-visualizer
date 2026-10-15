import type { SideAction } from "@/lib/types";
import type { DotPosition } from "@/lib/types/device";
import { DeviceMode } from "./deviceMode";

const BODY_DEPTH = 3.9;
// Increase this to push the left and right halves further apart.
export const ARC_HALF_GAP_X = 0.14;
// Increase this to move the thumb bars further out with their matching dot groups.
export const ARC_THUMB_BASE_X = 0.82;
// Increase this to push the thumb bars further away from the braille keys.
const DOT_TO_THUMB_GAP = 0.68;

const ARC_DOT_OFFSETS: Readonly<Record<number, { x: number; z: number }>> = Object.freeze({
  1: { x: -0.36 - ARC_HALF_GAP_X, z: 0.92 },
  2: { x: -0.74 - ARC_HALF_GAP_X, z: 0.46 },
  3: { x: -1.02 - ARC_HALF_GAP_X, z: -0.14 },
  4: { x: 0.36 + ARC_HALF_GAP_X, z: 0.92 },
  5: { x: 0.74 + ARC_HALF_GAP_X, z: 0.46 },
  6: { x: 1.02 + ARC_HALF_GAP_X, z: -0.14 },
});
const THUMB_ROW_OFFSET_Z = ARC_DOT_OFFSETS[3].z - DOT_TO_THUMB_GAP;

export class ArcMode extends DeviceMode {
  createLayout() {
    const layout = super.createLayout();
    return { ...layout, bodyDepth: this.metrics.bodyDepth ?? BODY_DEPTH, sideOffsetZ: THUMB_ROW_OFFSET_Z };
  }

  getDotOffset(position: DotPosition) {
    // The six dots fan outward around a shared rear centre, unlike the regular two-column cell.
    return ARC_DOT_OFFSETS[position.number];
  }

  getSideButtonSpec(
    direction: number,
    bodyWidth: number,
    bodyDepth: number,
    action: SideAction,
  ) {
    const spec = super.getSideButtonSpec(direction, bodyWidth, bodyDepth, action);

    // Turn inherited narrow/deep pads into wide thumb bars by swapping width and depth.
    return {
      ...spec,
      depth: spec.width,
      offsetX: direction * (ARC_THUMB_BASE_X + ARC_HALF_GAP_X),
      offsetZ: THUMB_ROW_OFFSET_Z,
      width: spec.depth,
    };
  }
}
