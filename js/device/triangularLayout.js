import { KEY_HEIGHT } from "../config.js";

const TRIANGULAR_BODY_DEPTH = 2.4;
const TRIANGULAR_BODY_HEIGHT = 0.82;
const TRIANGULAR_SIDE_HEIGHT = 0.2;
const TRIANGULAR_SIDE_BASE_OFFSET = -0.3;
const TRIANGULAR_SIDE_INDENT_FACTOR = 0.25;

export function createTriangularLayout(metrics) {
  const bodyDepth = metrics.bodyDepth ?? TRIANGULAR_BODY_DEPTH;
  const bodyHeight = metrics.bodyHeight ?? TRIANGULAR_BODY_HEIGHT;
  const surfaceAngle = Math.atan2(bodyHeight, bodyDepth);

  return {
    bodyDepth,
    bodyHeight: TRIANGULAR_BODY_HEIGHT,
    controlSurfacePositionY: bodyHeight / 2,
    controlSurfaceRotationX: surfaceAngle,
    dotBaseOffset: KEY_HEIGHT / 2,
    dotRotationX: 0,
    triangularSideBaseOffset: TRIANGULAR_SIDE_BASE_OFFSET,
    sideHeight: TRIANGULAR_SIDE_HEIGHT,
    sideIndentFactor: TRIANGULAR_SIDE_INDENT_FACTOR,
    sideRotationX: 0,
  };
}
