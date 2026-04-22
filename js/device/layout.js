import { THREE } from "../deps.js";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  DOT_SPACING,
} from "../config.js";
import { extrudedSlab, roundedRectShape } from "../utils.js";

export function buildSideButtons(options) {
  const { bodyDepth, bodyWidth, materials, mode, modeLayout, parent, showSides } = options;
  const sideButtons = [];

  if (!showSides) {
    return sideButtons;
  }

  const sideWidth = 0.34;
  const sideDepth = Math.min(bodyDepth * 0.62, CELL_HEIGHT + 0.1);
  const sideHeight = modeLayout.sideHeight;
  const sideShape = roundedRectShape(sideWidth, sideDepth, Math.min(sideWidth, sideDepth) / 2);
  const sideGeometry = extrudedSlab(sideShape, sideHeight, 0.025);
  const offsetX = bodyWidth / 2 - sideWidth / 2 - 0.22;

  [-1, 1].forEach(function (direction) {
    const button = new THREE.Mesh(sideGeometry.clone(), materials.sideButton);
    button.castShadow = true;
    button.receiveShadow = true;
    button.rotation.x = modeLayout.sideRotationX;

    const baseY = mode === "triangular"
      ? modeLayout.triangularSideBaseOffset
      : 0.002;
    button.position.set(direction * offsetX, baseY, 0);
    button.userData = {
      baseY,
      kind: direction === -1 ? "side-left" : "side-right",
      mountBaseY: baseY,
      pressed: false,
      targetY: baseY,
    };

    parent.add(button);
    sideButtons.push(button);
  });

  return sideButtons;
}

export function buildGridGuides(rowWidth, cellCount, pitch) {
  const grid = new THREE.Group();
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x3562ff,
    opacity: 0.55,
    transparent: true,
  });

  for (let index = 0; index < cellCount; index += 1) {
    const centreX = -rowWidth / 2 + CELL_WIDTH / 2 + index * pitch;
    const halfWidth = DOT_SPACING / 2 + 0.12;
    const halfDepth = CELL_HEIGHT / 2 + 0.12;
    const points = [
      new THREE.Vector3(centreX - halfWidth, 0, -halfDepth),
      new THREE.Vector3(centreX + halfWidth, 0, -halfDepth),
      new THREE.Vector3(centreX + halfWidth, 0, halfDepth),
      new THREE.Vector3(centreX - halfWidth, 0, halfDepth),
      new THREE.Vector3(centreX - halfWidth, 0, -halfDepth),
    ];

    grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
  }

  const baselineMaterial = new THREE.LineDashedMaterial({
    color: 0x3562ff,
    dashSize: 0.1,
    gapSize: 0.08,
    opacity: 0.5,
    transparent: true,
  });
  const baseline = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-rowWidth / 2 - 0.3, 0, 0),
      new THREE.Vector3(rowWidth / 2 + 0.3, 0, 0),
    ]),
    baselineMaterial
  );
  baseline.computeLineDistances();
  grid.add(baseline);

  return grid;
}

export function buildInteractiveTargets(cellsGroup, sideButtons) {
  const targets = [];

  cellsGroup.traverse(function (object) {
    if (object.isMesh) {
      targets.push(object);
    }
  });

  sideButtons.forEach(function (button) {
    targets.push(button);
  });

  return targets;
}

export function getTiltAngle(mode, angleDeg) {
  if (mode === "integrated") return 0;
  return THREE.MathUtils.degToRad(angleDeg);
}

export function animateMeshY(mesh, speed) {
  if (typeof mesh.userData.targetY !== "number") {
    return;
  }

  mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, mesh.userData.targetY, speed);
  if (Math.abs(mesh.position.y - mesh.userData.targetY) < 0.0005) {
    mesh.position.y = mesh.userData.targetY;
  }
}
