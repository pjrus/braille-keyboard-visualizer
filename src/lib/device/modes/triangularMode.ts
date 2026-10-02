import { KEY_HEIGHT } from "@/lib/config";
import type { DeviceMaterials } from "@/lib/types/device";
import * as THREE from "three";
import { buildTriangularBody } from "../bodies/triangularBody";
import { DeviceMode } from "./deviceMode";

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
      // Centre the control group on the sloped face and rotate it to match the triangular body.
      controlSurfacePositionY: bodyHeight / 2,
      controlSurfaceRotationX: surfaceAngle,
      dotBaseOffset: KEY_HEIGHT / 2,
      sideBaseOffset: SIDE_BASE_OFFSET,
      sideHeight: SIDE_HEIGHT,
      sideIndentFactor: SIDE_INDENT_FACTOR,
      sideOffsetZ: 0,
    };
  }

  getTiltAngle(angleDeg: number) {
    // Unlike the fixed sloped face, the whole triangular deck also supports the user angle control.
    return THREE.MathUtils.degToRad(angleDeg);
  }
}
