import { SIDE_ACTION_BUTTON_TAGS } from "@/lib/config";
import type { Side, SideAction } from "@/lib/types";
import type { DotPosition, Offset } from "@/lib/types/device";
import { DeviceMode } from "./deviceMode";

// A shallow mirrored finger row, viewed from above with the display behind it.
const DOT_OFFSETS: Readonly<Record<number, Offset>> = {
  1: { x: -1.62, z: -0.33 },
  2: { x: -0.98, z: -0.48 },
  3: { x: -0.34, z: -0.35 },
  4: { x: 0.34, z: -0.35 },
  5: { x: 0.98, z: -0.48 },
  6: { x: 1.62, z: -0.33 },
};

export class ChameleonMode extends DeviceMode {
  createLayout() {
    const bodyHeight = this.metrics.bodyHeight ?? 0.55;

    return {
      ...super.createLayout(),
      bodyDepth: this.metrics.bodyDepth ?? 2.5,
      bodyHeight,
      controlSurfacePositionY: bodyHeight,
      dotBaseOffset: 0.65,
      sideBaseOffset: 0.17,
      sideHeight: 0.25,
      sideOffsetZ: 0.78,
    };
  }

  getDotOffset(position: DotPosition) {
    // Numbered positions preserve braille semantics while this mode lays them out in one mirrored row.
    return DOT_OFFSETS[position.number];
  }

  getSideButtonSpec(
    direction: number,
    _bodyWidth?: number,
    _bodyDepth?: number,
    _side?: Side,
    action?: SideAction,
  ) {
    const defaultLabel = direction === -1 ? "DEL" : "SPACE";
    const label = action ? SIDE_ACTION_BUTTON_TAGS[action] : defaultLabel;

    return {
      baseY: this.layout.sideBaseOffset,
      depth: 0.36,
      height: this.layout.sideHeight,
      label,
      offsetX: direction * 0.43,
      offsetZ: this.layout.sideOffsetZ,
      width: 0.65,
    };
  }
}
