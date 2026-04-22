const BODY_DEPTH = 2.4;
const BODY_HEIGHT = 0.68;
const SIDE_HEIGHT = 0.3;
const DOT_BASE_OFFSET = 0.6;
const INTEGRATED_DOT_OFFSET_Y = 0.2;
const INTEGRATED_SIDE_BASE_OFFSET = 0.2;

export function createIntegratedLayout(metrics) {
  const bodyHeight = metrics.bodyHeight ?? BODY_HEIGHT;

  return {
    bodyDepth: BODY_DEPTH,
    bodyHeight: BODY_HEIGHT,
    controlSurfacePositionY: bodyHeight,
    controlSurfaceRotationX: 0,
    dotBaseOffset: DOT_BASE_OFFSET + INTEGRATED_DOT_OFFSET_Y,
    dotRotationX: 0,
    integratedSideBaseOffset: INTEGRATED_SIDE_BASE_OFFSET,
    sideHeight: SIDE_HEIGHT,
    sideIndentFactor: 1,
    sideOffsetZ: 0,
    sideRotationX: 0,
  };
}
