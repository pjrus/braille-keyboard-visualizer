const BODY_DEPTH = 2.4;
const BODY_HEIGHT = 0.68;
const SIDE_HEIGHT = 0.2;
const DOT_BASE_OFFSET = 0.6;

export function createIntegratedLayout(metrics) {
  const bodyHeight = metrics.bodyHeight ?? BODY_HEIGHT;

  return {
    bodyDepth: BODY_DEPTH,
    bodyHeight: BODY_HEIGHT,
    controlSurfacePositionY: bodyHeight,
    controlSurfaceRotationX: 0,
    dotBaseOffset: DOT_BASE_OFFSET,
    dotRotationX: 0,
    sideHeight: SIDE_HEIGHT,
    sideIndentFactor: 1,
    sideRotationX: 0,
  };
}
