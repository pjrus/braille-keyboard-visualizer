import type { DeviceMaterials, DotPosition, Offset } from "@/lib/types/device";
import { DeviceMode } from "../mode";
import { buildIntegratedBody } from "./integratedBody";

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
      bodyDepth: this.metrics.bodyDepth ?? 2.5,
      bodyHeight,
      controlSurfacePositionY: bodyHeight,
      controlSurfaceRotationX: 0,
      dotBaseOffset: 0.65,
      dotRotationX: 0,
      sideBaseOffset: 0.17,
      sideHeight: 0.25,
      sideIndentFactor: 1,
      sideOffsetZ: 0.78,
      sideRotationX: 0,
    };
  }

  buildBody(materials: DeviceMaterials) {
    return buildIntegratedBody(this.metrics, materials);
  }

  getDotOffset(position: DotPosition) {
    return DOT_OFFSETS[position.number];
  }

  getSideButtonSpec(direction: number) {
    return {
      baseY: this.layout.sideBaseOffset,
      depth: 0.36,
      height: this.layout.sideHeight,
      label: direction === -1 ? "DEL" : "SPACE",
      offsetX: direction * 0.43,
      offsetZ: this.layout.sideOffsetZ,
      rotationX: 0,
      width: 0.65,
    };
  }
}
