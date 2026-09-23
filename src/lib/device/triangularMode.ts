import type { DeviceMaterials, DotPosition } from "@/types/device";
import * as THREE from "three";
import { KEY_HEIGHT, getDotOffset } from "../config";
import { buildTriangularBody } from "./triangularBody";
import { DeviceMode } from "./mode";

const BODY_DEPTH = 2.4;
const BODY_HEIGHT = 0.82;
const SIDE_HEIGHT = 0.2;
const SIDE_BASE_OFFSET = -0.3;
const SIDE_INDENT_FACTOR = 0.25;

export class TriangularMode extends DeviceMode {
  buildBody(materials: DeviceMaterials) {
    return buildTriangularBody(this.metrics, materials);
  }

  createLayout() {
    const bodyDepth = this.metrics.bodyDepth ?? BODY_DEPTH;
    const bodyHeight = this.metrics.bodyHeight ?? BODY_HEIGHT;
    const surfaceAngle = Math.atan2(bodyHeight, bodyDepth);

    return {
      bodyDepth,
      bodyHeight,
      controlSurfacePositionY: bodyHeight / 2,
      controlSurfaceRotationX: surfaceAngle,
      dotBaseOffset: KEY_HEIGHT / 2,
      dotRotationX: 0,
      sideBaseOffset: SIDE_BASE_OFFSET,
      sideHeight: SIDE_HEIGHT,
      sideIndentFactor: SIDE_INDENT_FACTOR,
      sideOffsetZ: 0,
      sideRotationX: 0,
    };
  }

  getTiltAngle(angleDeg: number) {
    return THREE.MathUtils.degToRad(angleDeg);
  }

  getDotOffset(position: DotPosition) {
    return getDotOffset(position);
  }
}
